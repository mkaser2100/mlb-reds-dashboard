#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import random
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Mapping, Optional

import numpy as np
import pandas as pd
import statsmodels.api as sm
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
SOURCE_VIEW = "v_mlb_ml_pitcher_k_training_v1"
TARGET = "pitcher_strikeouts"
MODEL_NAME = "negative_binomial_glm"
ARTIFACT_VERSION = "pitcher_k_nb_artifact_v1"
RETRYABLE_HTTP_CODES = {408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524}

CORE_FEATURES = [
    "prior_starts_season", "days_since_last_start",
    "k_per_start_l5", "k_per_start_season",
    "outs_per_start_l5", "outs_per_start_season",
    "pitches_per_start_l5", "pitches_per_start_season",
    "k_per_9_l5", "k_per_9_season",
    "strike_rate_l5", "strike_rate_season",
    "arsenal_avg_velocity_30d", "arsenal_zone_rate_30d",
    "arsenal_whiff_rate_30d", "arsenal_chase_rate_30d", "arsenal_csw_rate_30d",
    "arsenal_whiff_rate_season", "arsenal_chase_rate_season", "arsenal_csw_rate_season",
    "lineup_k_rate_30d", "lineup_k_rate_season",
    "lineup_avg_arsenal_batter_whiff", "lineup_avg_arsenal_pitcher_whiff",
    "lineup_avg_arsenal_coverage_pct",
    "missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup",
]
CATEGORICAL_FEATURES = ["home_away", "pitcher_throws"]
RAW_FEATURES = CORE_FEATURES + CATEGORICAL_FEATURES


class Phase3Error(RuntimeError):
    pass


def log(msg: str) -> None:
    print(msg, flush=True)


def require_env() -> None:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise Phase3Error("Missing required environment variable(s): " + ", ".join(missing))


def api_request(method: str, path: str, *, body: Any = None,
                headers: Optional[Mapping[str, str]] = None,
                timeout: int = 120, max_attempts: int = 6) -> Any:
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)
    data = None if body is None else json.dumps(body, separators=(",", ":"), default=str).encode("utf-8")
    last_error: Optional[BaseException] = None
    for attempt in range(1, max_attempts + 1):
        req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                return None if not raw else json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            last_error = exc
            if exc.code not in RETRYABLE_HTTP_CODES or attempt >= max_attempts:
                raise Phase3Error(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            log(f"WARNING: transient Supabase HTTP {exc.code}; retrying in {wait:.1f}s")
            time.sleep(wait)
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt >= max_attempts:
                raise Phase3Error(f"{method} {path} failed after retries: {exc}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            log(f"WARNING: transient network error; retrying in {wait:.1f}s")
            time.sleep(wait)
    raise Phase3Error(f"{method} {path} failed: {last_error}")


def rest_get(resource: str, params: Mapping[str, str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    while True:
        q = dict(params)
        q["offset"] = str(offset)
        q["limit"] = "1000"
        query = urllib.parse.urlencode(q, safe="(),.*")
        batch = api_request("GET", f"/rest/v1/{resource}?{query}")
        if not isinstance(batch, list):
            raise Phase3Error(f"Expected list from {resource}")
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def rest_insert(resource: str, body: Any, *, return_representation: bool = False) -> Any:
    prefer = "return=representation" if return_representation else "return=minimal"
    return api_request("POST", f"/rest/v1/{resource}", body=body, headers={"Prefer": prefer})


def rest_patch(resource: str, filters: Mapping[str, str], body: Mapping[str, Any]) -> None:
    query = urllib.parse.urlencode(filters, safe="(),.*")
    api_request("PATCH", f"/rest/v1/{resource}?{query}", body=body, headers={"Prefer": "return=minimal"})


def load_training_rows() -> pd.DataFrame:
    cols = ["game_date", "feature_version", "actual_strikeouts", *RAW_FEATURES]
    rows = rest_get(
        SOURCE_VIEW,
        {
            "select": ",".join(dict.fromkeys(cols)),
            "core_training_eligible": "eq.true",
            "order": "game_date.asc,game_pk.asc,pitcher_id.asc",
        },
    )
    if not rows:
        raise Phase3Error("No eligible Phase 1B training rows found")
    df = pd.DataFrame(rows)
    df["game_date"] = pd.to_datetime(df["game_date"]).dt.date
    for c in CORE_FEATURES:
        if c in ("missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup"):
            df[c] = df[c].fillna(True).astype(bool).astype(int)
        else:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    df["actual_strikeouts"] = pd.to_numeric(df["actual_strikeouts"], errors="raise")
    return df


def build_preprocessor() -> ColumnTransformer:
    return ColumnTransformer([
        ("num", Pipeline([
            ("imputer", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]), CORE_FEATURES),
        ("cat", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", drop="first", sparse_output=False)),
        ]), CATEGORICAL_FEATURES),
    ], remainder="drop")


def estimate_alpha(y: np.ndarray, mu: np.ndarray) -> float:
    mu = np.clip(np.asarray(mu, dtype=float), 0.05, None)
    y = np.asarray(y, dtype=float)
    num = float(np.sum((y - mu) ** 2 - mu))
    den = float(np.sum(mu ** 2))
    alpha = num / den if den > 0 else 0.0
    return float(np.clip(alpha, 1e-4, 2.0))


def latest_phase2_result() -> tuple[Dict[str, Any], Dict[str, Any]]:
    experiments = rest_get(
        "mlb_ml_pitcher_k_experiment_runs",
        {
            "select": "experiment_id,experiment_name,status,winner_candidate,validation_start_date,validation_end_date",
            "status": "eq.complete",
            "winner_candidate": "eq.negative_binomial_glm",
            "order": "experiment_id.desc",
            "limit": "1",
        },
    )
    if not experiments:
        raise Phase3Error("No completed Phase 2 experiment with negative_binomial_glm winner found")
    exp = experiments[0]
    results = rest_get(
        "mlb_ml_pitcher_k_candidate_results",
        {
            "select": "*",
            "experiment_id": f"eq.{exp['experiment_id']}",
            "candidate_name": "eq.negative_binomial_glm",
            "eval_scope": "eq.oof",
            "limit": "1",
        },
    )
    if not results:
        raise Phase3Error("Winning Phase 2 result row not found")
    return exp, results[0]


def preprocessing_artifact(pre: ColumnTransformer) -> Dict[str, Any]:
    num_pipe = pre.named_transformers_["num"]
    imputer = num_pipe.named_steps["imputer"]
    scaler = num_pipe.named_steps["scale"]
    numeric = {}
    for i, feature in enumerate(CORE_FEATURES):
        numeric[feature] = {
            "median": float(imputer.statistics_[i]),
            "mean": float(scaler.mean_[i]),
            "scale": float(scaler.scale_[i]) if float(scaler.scale_[i]) != 0 else 1.0,
        }

    cat_pipe = pre.named_transformers_["cat"]
    cat_imputer = cat_pipe.named_steps["imputer"]
    onehot = cat_pipe.named_steps["onehot"]
    categorical: Dict[str, Any] = {}
    for i, feature in enumerate(CATEGORICAL_FEATURES):
        categorical[feature] = {
            "imputer_value": str(cat_imputer.statistics_[i]),
            "categories": [str(x) for x in onehot.categories_[i]],
            "drop_first": True,
        }
    return {
        "raw_features": RAW_FEATURES,
        "numeric_feature_order": CORE_FEATURES,
        "categorical_feature_order": CATEGORICAL_FEATURES,
        "numeric": numeric,
        "categorical": categorical,
        "encoded_feature_names": [str(x) for x in pre.get_feature_names_out()],
    }


def run(args: argparse.Namespace) -> None:
    require_env()
    df = load_training_rows()
    exp, oof = latest_phase2_result()

    pre = build_preprocessor()
    X = np.asarray(pre.fit_transform(df[RAW_FEATURES]), dtype=float)
    Xc = sm.add_constant(X, has_constant="add")
    y = df["actual_strikeouts"].to_numpy(float)

    poisson_fit = sm.GLM(y, Xc, family=sm.families.Poisson()).fit(maxiter=200, disp=0)
    alpha = estimate_alpha(y, np.clip(poisson_fit.predict(Xc), 0.05, None))
    nb_fit = sm.GLM(y, Xc, family=sm.families.NegativeBinomial(alpha=alpha)).fit(maxiter=300, disp=0)
    train_mu = np.clip(nb_fit.predict(Xc), 0.05, 15.0)

    model_version = args.model_version or f"pitcher_k_nb_v1_{dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d%H%M%S')}"
    feature_versions = sorted(str(x) for x in df["feature_version"].dropna().unique())
    feature_version = feature_versions[0] if len(feature_versions) == 1 else "mixed:" + ",".join(feature_versions)

    oof_metrics = {
        "phase2_experiment_id": int(exp["experiment_id"]),
        "evaluated_rows": oof.get("evaluated_rows"),
        "evaluated_folds": oof.get("evaluated_folds"),
        "mae": oof.get("mae"),
        "rmse": oof.get("rmse"),
        "mean_log_loss": oof.get("mean_log_loss"),
        "mean_k": oof.get("mean_k"),
        "mean_predicted_k": oof.get("mean_predicted_k"),
        "brier_by_line": oof.get("brier_by_line"),
        "accuracy_by_line": oof.get("accuracy_by_line"),
        "calibration_by_line": oof.get("calibration_by_line"),
    }

    model_row = {
        "model_family": "pitcher_k_count_distribution",
        "target_name": TARGET,
        "model_name": MODEL_NAME,
        "model_version": model_version,
        "status": "candidate",
        "trained_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "training_start_date": str(df["game_date"].min()),
        "training_end_date": str(df["game_date"].max()),
        "validation_start_date": exp.get("validation_start_date"),
        "validation_end_date": exp.get("validation_end_date"),
        "feature_list": RAW_FEATURES,
        "hyperparameters": {
            "distribution": "negative_binomial_nb2",
            "dispersion_alpha": alpha,
            "phase2_experiment_id": int(exp["experiment_id"]),
            "feature_view": SOURCE_VIEW,
            "feature_version": feature_version,
            "one_hot_drop": "first",
            "numeric_imputation": "median",
            "numeric_scaling": "standard",
        },
        "metrics": {"oof": oof_metrics},
        "artifact_uri": None,
        "notes": "Phase 3 full-data fit of Phase 2 winning Negative Binomial GLM. Candidate until shadow validation/promotion.",
    }
    inserted = rest_insert("mlb_ml_model_runs", model_row, return_representation=True)
    if not isinstance(inserted, list) or not inserted:
        raise Phase3Error("Model registry insert returned no row")
    model_run_id = int(inserted[0]["model_run_id"])

    prep = preprocessing_artifact(pre)
    params = np.asarray(nb_fit.params, dtype=float)
    encoded_names = prep["encoded_feature_names"]
    if len(params) != len(encoded_names) + 1:
        raise Phase3Error("Persisted coefficient dimension mismatch")

    artifact = {
        "model_run_id": model_run_id,
        "experiment_id": int(exp["experiment_id"]),
        "artifact_version": ARTIFACT_VERSION,
        "model_type": "negative_binomial_glm",
        "raw_features": RAW_FEATURES,
        "preprocessing": prep,
        "model_artifact": {
            "kind": "log_link_glm",
            "intercept": float(params[0]),
            "coefficients": [float(x) for x in params[1:]],
            "encoded_feature_names": encoded_names,
        },
        "distribution_artifact": {
            "kind": "negative_binomial_nb2",
            "alpha": alpha,
            "max_k_bucket": 12,
        },
        "calibration_diagnostics": {
            "source": "phase2_expanding_window_oof",
            "experiment_id": int(exp["experiment_id"]),
            "brier_by_line": oof.get("brier_by_line"),
            "accuracy_by_line": oof.get("accuracy_by_line"),
            "calibration_by_line": oof.get("calibration_by_line"),
            "mean_log_loss": oof.get("mean_log_loss"),
        },
        "training_diagnostics": {
            "training_rows": int(len(df)),
            "feature_version": feature_version,
            "actual_mean_k": float(np.mean(y)),
            "fitted_mean_k": float(np.mean(train_mu)),
            "dispersion_alpha": alpha,
            "aic": float(nb_fit.aic) if math.isfinite(float(nb_fit.aic)) else None,
            "deviance": float(nb_fit.deviance) if math.isfinite(float(nb_fit.deviance)) else None,
            "encoded_feature_count": int(len(encoded_names)),
        },
    }
    rest_insert("mlb_ml_pitcher_k_model_artifacts", artifact)
    artifact_uri = f"supabase://mlb_ml_pitcher_k_model_artifacts/{model_run_id}"
    rest_patch("mlb_ml_model_runs", {"model_run_id": f"eq.{model_run_id}"}, {"artifact_uri": artifact_uri})

    log(json.dumps({
        "status": "complete",
        "model_run_id": model_run_id,
        "model_version": model_version,
        "training_rows": len(df),
        "training_start_date": str(df["game_date"].min()),
        "training_end_date": str(df["game_date"].max()),
        "dispersion_alpha": alpha,
        "phase2_experiment_id": int(exp["experiment_id"]),
        "oof_log_loss": oof.get("mean_log_loss"),
        "oof_mae": oof.get("mae"),
        "registry_status": "candidate",
    }, indent=2))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Train/register Phase 3 pitcher strikeout model")
    p.add_argument("--model-version", default="")
    return p.parse_args()


def main() -> int:
    try:
        run(parse_args())
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
