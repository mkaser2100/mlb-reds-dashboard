#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
from scipy.stats import nbinom, poisson
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
import statsmodels.api as sm

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
SOURCE_VIEW = "v_mlb_ml_pitcher_k_training_v1"
CANDIDATES = ("historical_shrinkage", "negative_binomial_glm", "two_stage_bf_k_rate")
LINES = (3.5, 4.5, 5.5, 6.5, 7.5, 8.5)
MAX_BUCKET = 12
EPS = 1e-12

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
WORKLOAD_FEATURES = [
    "prior_starts_season", "days_since_last_start",
    "outs_per_start_l5", "outs_per_start_season",
    "pitches_per_start_l5", "pitches_per_start_season",
    "home_away", "pitcher_throws",
]
KRATE_FEATURES = [
    "prior_starts_season", "k_per_9_l5", "k_per_9_season",
    "strike_rate_l5", "strike_rate_season",
    "arsenal_zone_rate_30d", "arsenal_whiff_rate_30d", "arsenal_chase_rate_30d", "arsenal_csw_rate_30d",
    "arsenal_whiff_rate_season", "arsenal_chase_rate_season", "arsenal_csw_rate_season",
    "lineup_k_rate_30d", "lineup_k_rate_season",
    "lineup_avg_arsenal_batter_whiff", "lineup_avg_arsenal_pitcher_whiff",
    "lineup_avg_arsenal_coverage_pct",
    "missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup",
    "home_away", "pitcher_throws",
]

class Phase2Error(RuntimeError):
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
        raise Phase2Error("Missing required environment variable(s): " + ", ".join(missing))


def api_request(method: str, path: str, *, body: Any = None, headers: Optional[Mapping[str, str]] = None, timeout: int = 120) -> Any:
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)
    data = None if body is None else json.dumps(body, separators=(",", ":"), default=str).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return None if not raw else json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise Phase2Error(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise Phase2Error(f"{method} {path} failed: {exc}") from exc


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
            raise Phase2Error(f"Expected list from {resource}")
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def rest_insert(resource: str, rows: Any, *, return_representation: bool = False) -> Any:
    prefer = "return=representation" if return_representation else "return=minimal"
    return api_request("POST", f"/rest/v1/{resource}", body=rows, headers={"Prefer": prefer})


def rest_upsert(resource: str, rows: Sequence[Mapping[str, Any]], on_conflict: str) -> None:
    for i in range(0, len(rows), 400):
        batch = list(rows[i:i+400])
        query = urllib.parse.urlencode({"on_conflict": on_conflict}, safe=",")
        api_request(
            "POST", f"/rest/v1/{resource}?{query}", body=batch,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"}
        )


def rest_patch(resource: str, filters: Mapping[str, str], values: Mapping[str, Any]) -> None:
    query = urllib.parse.urlencode(filters, safe="(),.*")
    api_request("PATCH", f"/rest/v1/{resource}?{query}", body=values, headers={"Prefer": "return=minimal"})


def load_training_rows() -> pd.DataFrame:
    cols = [
        "game_date", "game_pk", "pitcher_id", "feature_version", "core_training_eligible",
        "actual_strikeouts", "actual_batters_faced",
        *CATEGORICAL_FEATURES, *CORE_FEATURES,
    ]
    cols = list(dict.fromkeys(cols))
    rows = rest_get(
        SOURCE_VIEW,
        {
            "select": ",".join(cols),
            "core_training_eligible": "eq.true",
            "order": "game_date.asc,game_pk.asc,pitcher_id.asc",
        },
    )
    if not rows:
        raise Phase2Error("No core training rows found")
    df = pd.DataFrame(rows)
    df["game_date"] = pd.to_datetime(df["game_date"]).dt.date
    for c in set(CORE_FEATURES + ["actual_strikeouts", "actual_batters_faced"]):
        if c in df.columns and c not in ("missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in ("missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup"):
        df[c] = df[c].fillna(True).astype(bool).astype(int)
    return df


@dataclass
class Fold:
    fold_no: int
    train_end: dt.date
    valid_start: dt.date
    valid_end: dt.date


def build_folds(df: pd.DataFrame) -> List[Fold]:
    dates = sorted(df["game_date"].unique())
    if len(dates) < 40:
        raise Phase2Error(f"Need at least 40 unique dates; found {len(dates)}")
    cut_points = [0.55, 0.70, 0.85, 1.00]
    idx = [min(len(dates)-1, max(1, int(round((len(dates)-1)*p)))) for p in cut_points]
    # Ensure strictly increasing boundaries.
    for i in range(1, len(idx)):
        idx[i] = max(idx[i], idx[i-1] + 1)
        idx[i] = min(idx[i], len(dates)-1)
    folds: List[Fold] = []
    starts = [idx[0]+1, idx[1]+1, idx[2]+1]
    ends = [idx[1], idx[2], idx[3]]
    train_ends = [idx[0], idx[1], idx[2]]
    for n, (te, vs, ve) in enumerate(zip(train_ends, starts, ends), start=1):
        if vs > ve or vs >= len(dates):
            continue
        folds.append(Fold(n, dates[te], dates[vs], dates[ve]))
    if len(folds) < 2:
        raise Phase2Error("Could not build at least two expanding-window folds")
    return folds


def build_preprocessor(features: Sequence[str], scale_numeric: bool) -> Tuple[ColumnTransformer, List[str], List[str]]:
    cats = [c for c in features if c in CATEGORICAL_FEATURES]
    nums = [c for c in features if c not in cats]
    num_steps = [("imputer", SimpleImputer(strategy="median"))]
    if scale_numeric:
        num_steps.append(("scale", StandardScaler()))
    num_pipe = Pipeline(num_steps)
    cat_pipe = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    pre = ColumnTransformer([
        ("num", num_pipe, nums),
        ("cat", cat_pipe, cats),
    ], remainder="drop")
    return pre, nums, cats


def estimate_alpha(y: np.ndarray, mu: np.ndarray) -> float:
    mu = np.clip(np.asarray(mu, dtype=float), 0.05, None)
    y = np.asarray(y, dtype=float)
    num = float(np.sum((y - mu) ** 2 - mu))
    den = float(np.sum(mu ** 2))
    alpha = num / den if den > 0 else 0.0
    return float(np.clip(alpha, 1e-4, 2.0))


def nb_pmf(mu: float, alpha: float) -> np.ndarray:
    mu = max(float(mu), 0.01)
    alpha = max(float(alpha), 1e-8)
    if alpha < 1e-5:
        probs = np.array([poisson.pmf(k, mu) for k in range(MAX_BUCKET)], dtype=float)
        tail = float(poisson.sf(MAX_BUCKET - 1, mu))
    else:
        size = 1.0 / alpha
        p = size / (size + mu)
        probs = np.array([nbinom.pmf(k, size, p) for k in range(MAX_BUCKET)], dtype=float)
        tail = float(nbinom.sf(MAX_BUCKET - 1, size, p))
    out = np.append(probs, tail)
    out = np.clip(out, 0.0, 1.0)
    s = float(out.sum())
    return out / s if s > 0 else np.eye(1, MAX_BUCKET + 1, 0).ravel()


def fit_historical(train: pd.DataFrame, valid: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    global_mean = float(train["actual_strikeouts"].mean())
    l5 = valid["k_per_start_l5"].astype(float)
    season = valid["k_per_start_season"].astype(float)
    nstarts = valid["prior_starts_season"].fillna(0).astype(float)
    w_recent = np.clip(nstarts / (nstarts + 5.0), 0.20, 0.75)
    pred = w_recent * l5.fillna(season).fillna(global_mean) + (1.0 - w_recent) * season.fillna(l5).fillna(global_mean)
    train_l5 = train["k_per_start_l5"].astype(float)
    train_season = train["k_per_start_season"].astype(float)
    tn = train["prior_starts_season"].fillna(0).astype(float)
    tw = np.clip(tn / (tn + 5.0), 0.20, 0.75)
    train_mu = tw * train_l5.fillna(train_season).fillna(global_mean) + (1.0 - tw) * train_season.fillna(train_l5).fillna(global_mean)
    alpha = estimate_alpha(train["actual_strikeouts"].to_numpy(), train_mu.to_numpy())
    return pred.to_numpy(float), np.full(len(valid), alpha), {"global_mean": global_mean, "dispersion_alpha": alpha}


def fit_nb_glm(train: pd.DataFrame, valid: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    features = CORE_FEATURES + CATEGORICAL_FEATURES
    pre, _, _ = build_preprocessor(features, scale_numeric=True)
    Xtr = pre.fit_transform(train[features])
    Xva = pre.transform(valid[features])
    Xtr = sm.add_constant(np.asarray(Xtr, dtype=float), has_constant="add")
    Xva = sm.add_constant(np.asarray(Xva, dtype=float), has_constant="add")
    y = train["actual_strikeouts"].to_numpy(float)
    # Estimate overdispersion from a Poisson warm-start, then fit NB GLM with fixed alpha.
    pois = sm.GLM(y, Xtr, family=sm.families.Poisson()).fit(maxiter=200, disp=0)
    warm_mu = np.clip(pois.predict(Xtr), 0.05, None)
    alpha = estimate_alpha(y, warm_mu)
    nb = sm.GLM(y, Xtr, family=sm.families.NegativeBinomial(alpha=alpha)).fit(maxiter=300, disp=0)
    pred = np.clip(nb.predict(Xva), 0.05, 15.0)
    return pred, np.full(len(valid), alpha), {
        "dispersion_alpha": alpha,
        "feature_count_encoded": int(Xtr.shape[1] - 1),
        "aic": float(nb.aic) if np.isfinite(nb.aic) else None,
    }


def gbr_pipeline(features: Sequence[str], *, loss: str = "squared_error") -> Pipeline:
    pre, _, _ = build_preprocessor(features, scale_numeric=False)
    model = GradientBoostingRegressor(
        loss=loss,
        n_estimators=180,
        learning_rate=0.035,
        max_depth=2,
        min_samples_leaf=18,
        subsample=0.85,
        random_state=42,
    )
    return Pipeline([("pre", pre), ("model", model)])


def fit_two_stage(train: pd.DataFrame, valid: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, Dict[str, Any]]:
    bf_train = train[train["actual_batters_faced"].notna() & (train["actual_batters_faced"] > 0)].copy()
    if len(bf_train) < 500:
        raise Phase2Error(f"Two-stage BF training sample too small: {len(bf_train)}")
    workload = gbr_pipeline(WORKLOAD_FEATURES, loss="huber")
    workload.fit(bf_train[WORKLOAD_FEATURES], bf_train["actual_batters_faced"].astype(float))
    pred_bf = np.clip(workload.predict(valid[WORKLOAD_FEATURES]), 8.0, 36.0)

    bf_train["actual_k_rate"] = np.clip(
        bf_train["actual_strikeouts"].astype(float) / bf_train["actual_batters_faced"].astype(float), 0.0, 0.65
    )
    krate = gbr_pipeline(KRATE_FEATURES, loss="huber")
    krate.fit(bf_train[KRATE_FEATURES], bf_train["actual_k_rate"])
    pred_rate = np.clip(krate.predict(valid[KRATE_FEATURES]), 0.02, 0.50)
    pred_mu = np.clip(pred_bf * pred_rate, 0.05, 15.0)

    train_pred_bf = np.clip(workload.predict(bf_train[WORKLOAD_FEATURES]), 8.0, 36.0)
    train_pred_rate = np.clip(krate.predict(bf_train[KRATE_FEATURES]), 0.02, 0.50)
    train_mu = np.clip(train_pred_bf * train_pred_rate, 0.05, 15.0)
    alpha = estimate_alpha(bf_train["actual_strikeouts"].to_numpy(float), train_mu)
    return pred_mu, np.full(len(valid), alpha), pred_bf, pred_rate, {
        "dispersion_alpha": alpha,
        "bf_training_rows": int(len(bf_train)),
        "workload_model": "GradientBoostingRegressor(huber)",
        "k_rate_model": "GradientBoostingRegressor(huber)",
    }


def p_over_from_pmf(pmf: np.ndarray, line: float) -> float:
    threshold = int(math.floor(line)) + 1
    if threshold <= 0:
        return 1.0
    if threshold >= MAX_BUCKET:
        # Last bucket is K >= MAX_BUCKET.
        return float(pmf[-1]) if threshold == MAX_BUCKET else 0.0
    return float(pmf[threshold:MAX_BUCKET].sum() + pmf[-1])


def aggregate_metrics(pred_rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    actual = np.array([r["actual_strikeouts"] for r in pred_rows], dtype=float)
    pred = np.array([r["predicted_mean_k"] for r in pred_rows], dtype=float)
    log_losses = []
    brier: Dict[str, float] = {}
    accuracy: Dict[str, float] = {}
    calibration: Dict[str, Any] = {}
    for r in pred_rows:
        k = int(r["actual_strikeouts"])
        pmf = np.array(r["k_pmf"], dtype=float)
        idx = min(k, MAX_BUCKET)
        log_losses.append(-math.log(max(float(pmf[idx]), EPS)))
    for line in LINES:
        key = f"{line:.1f}"
        probs = np.array([p_over_from_pmf(np.array(r["k_pmf"], dtype=float), line) for r in pred_rows])
        y = (actual > line).astype(float)
        brier[key] = float(np.mean((probs - y) ** 2))
        accuracy[key] = float(np.mean((probs >= 0.5) == (y == 1.0)))
        calibration[key] = {
            "mean_predicted_over": float(np.mean(probs)),
            "actual_over_rate": float(np.mean(y)),
            "absolute_gap": float(abs(np.mean(probs) - np.mean(y))),
        }
    bf_pairs = [(r.get("actual_batters_faced"), r.get("predicted_batters_faced")) for r in pred_rows]
    bf_pairs = [(float(a), float(p)) for a, p in bf_pairs if a is not None and p is not None]
    workload_mae = float(np.mean([abs(a-p) for a,p in bf_pairs])) if bf_pairs else None
    return {
        "evaluated_rows": len(pred_rows),
        "mae": float(np.mean(np.abs(actual - pred))),
        "rmse": float(np.sqrt(np.mean((actual - pred) ** 2))),
        "mean_log_loss": float(np.mean(log_losses)),
        "mean_k": float(np.mean(actual)),
        "mean_predicted_k": float(np.mean(pred)),
        "brier_by_line": brier,
        "accuracy_by_line": accuracy,
        "calibration_by_line": calibration,
        "workload_mae": workload_mae,
    }


def candidate_family(name: str) -> str:
    return {
        "historical_shrinkage": "historical_baseline",
        "negative_binomial_glm": "count_glm",
        "two_stage_bf_k_rate": "two_stage_simulation",
    }[name]


def pick_winner(metrics: Mapping[str, Mapping[str, Any]]) -> Tuple[str, str]:
    # Distribution quality is primary because the product needs probabilities at arbitrary K lines.
    # MAE is the first tie-break; max single-line calibration gap is the second.
    ranked = []
    for name, m in metrics.items():
        max_gap = max(v["absolute_gap"] for v in m["calibration_by_line"].values())
        ranked.append((float(m["mean_log_loss"]), float(m["mae"]), float(max_gap), name))
    ranked.sort()
    best = ranked[0]
    reason = f"Lowest OOF distribution log loss ({best[0]:.4f}); MAE={best[1]:.4f}; max line calibration gap={best[2]:.4f}."
    return best[3], reason


def create_experiment(df: pd.DataFrame, folds: Sequence[Fold], args: argparse.Namespace) -> int:
    feature_versions = sorted(str(x) for x in df["feature_version"].dropna().unique())
    payload = {
        "experiment_name": args.experiment_name,
        "status": "running",
        "feature_view": SOURCE_VIEW,
        "feature_version": feature_versions[-1] if len(feature_versions) == 1 else "mixed:" + ",".join(feature_versions),
        "train_start_date": str(df["game_date"].min()),
        "validation_start_date": str(min(f.valid_start for f in folds)),
        "validation_end_date": str(max(f.valid_end for f in folds)),
        "candidate_names": list(CANDIDATES),
        "fold_config": {"type": "expanding_window", "folds": [f.__dict__ for f in folds]},
        "run_config": {
            "lines": list(LINES), "max_k_bucket": MAX_BUCKET,
            "selection_order": ["mean_log_loss", "mae", "max_line_calibration_gap"],
            "core_rows": int(len(df)),
        },
    }
    inserted = rest_insert("mlb_ml_pitcher_k_experiment_runs", payload, return_representation=True)
    if not isinstance(inserted, list) or not inserted:
        raise Phase2Error("Experiment insert did not return a row")
    return int(inserted[0]["experiment_id"])


def run(args: argparse.Namespace) -> None:
    require_env()
    df = load_training_rows()
    folds = build_folds(df)
    log(f"Loaded {len(df)} core training rows from {df.game_date.min()} to {df.game_date.max()}")
    for f in folds:
        log(f"Fold {f.fold_no}: train <= {f.train_end}; validate {f.valid_start}..{f.valid_end}")

    experiment_id = create_experiment(df, folds, args)
    log(f"Experiment ID: {experiment_id}")
    all_preds: Dict[str, List[Dict[str, Any]]] = {name: [] for name in CANDIDATES}
    model_configs: Dict[str, List[Dict[str, Any]]] = {name: [] for name in CANDIDATES}

    try:
        for f in folds:
            train = df[df["game_date"] <= f.train_end].copy()
            valid = df[(df["game_date"] >= f.valid_start) & (df["game_date"] <= f.valid_end)].copy()
            if len(train) < 700 or len(valid) < 100:
                raise Phase2Error(f"Fold {f.fold_no} insufficient rows: train={len(train)}, valid={len(valid)}")
            log(f"\nFold {f.fold_no}: train={len(train)} valid={len(valid)}")

            for candidate in CANDIDATES:
                log(f"  Training {candidate}...")
                if candidate == "historical_shrinkage":
                    mu, alphas, cfg = fit_historical(train, valid)
                    pred_bf = np.full(len(valid), np.nan)
                    pred_rate = np.full(len(valid), np.nan)
                elif candidate == "negative_binomial_glm":
                    mu, alphas, cfg = fit_nb_glm(train, valid)
                    pred_bf = np.full(len(valid), np.nan)
                    pred_rate = np.full(len(valid), np.nan)
                else:
                    mu, alphas, pred_bf, pred_rate, cfg = fit_two_stage(train, valid)
                model_configs[candidate].append({"fold_no": f.fold_no, **cfg})

                batch: List[Dict[str, Any]] = []
                for i, (_, row) in enumerate(valid.iterrows()):
                    pmf = nb_pmf(float(mu[i]), float(alphas[i]))
                    rec = {
                        "experiment_id": experiment_id,
                        "candidate_name": candidate,
                        "fold_no": f.fold_no,
                        "game_date": str(row["game_date"]),
                        "game_pk": int(row["game_pk"]),
                        "pitcher_id": int(row["pitcher_id"]),
                        "actual_strikeouts": int(row["actual_strikeouts"]),
                        "actual_batters_faced": None if pd.isna(row["actual_batters_faced"]) else int(row["actual_batters_faced"]),
                        "predicted_mean_k": float(mu[i]),
                        "predicted_batters_faced": None if np.isnan(pred_bf[i]) else float(pred_bf[i]),
                        "predicted_k_rate": None if np.isnan(pred_rate[i]) else float(pred_rate[i]),
                        "distribution_type": "negative_binomial",
                        "distribution_params": {"mu": float(mu[i]), "alpha": float(alphas[i])},
                        "k_pmf": [float(x) for x in pmf],
                    }
                    batch.append(rec)
                    all_preds[candidate].append(rec)
                rest_upsert(
                    "mlb_ml_pitcher_k_evaluation_predictions", batch,
                    "experiment_id,candidate_name,fold_no,game_pk,pitcher_id"
                )

        summaries: Dict[str, Dict[str, Any]] = {}
        result_rows: List[Dict[str, Any]] = []
        for candidate in CANDIDATES:
            m = aggregate_metrics(all_preds[candidate])
            summaries[candidate] = m
            result_rows.append({
                "experiment_id": experiment_id,
                "candidate_name": candidate,
                "candidate_family": candidate_family(candidate),
                "eval_scope": "oof",
                "evaluated_rows": m["evaluated_rows"],
                "evaluated_folds": len(folds),
                "mae": m["mae"], "rmse": m["rmse"], "mean_log_loss": m["mean_log_loss"],
                "mean_k": m["mean_k"], "mean_predicted_k": m["mean_predicted_k"],
                "brier_by_line": m["brier_by_line"],
                "accuracy_by_line": m["accuracy_by_line"],
                "calibration_by_line": m["calibration_by_line"],
                "workload_mae": m["workload_mae"],
                "k_rate_mae": None,
                "model_config": {"fold_models": model_configs[candidate]},
                "diagnostics": {"selection_eligible": True},
            })
        rest_upsert("mlb_ml_pitcher_k_candidate_results", result_rows, "experiment_id,candidate_name,eval_scope")
        winner, reason = pick_winner(summaries)
        rest_patch(
            "mlb_ml_pitcher_k_experiment_runs", {"experiment_id": f"eq.{experiment_id}"},
            {"status": "complete", "winner_candidate": winner, "winner_reason": reason, "completed_at": dt.datetime.now(dt.timezone.utc).isoformat()}
        )
        log("\n=== PHASE 2 RESULTS ===")
        for name in CANDIDATES:
            m = summaries[name]
            log(f"{name}: logloss={m['mean_log_loss']:.4f} MAE={m['mae']:.4f} RMSE={m['rmse']:.4f} workload_MAE={m['workload_mae']}")
        log(f"WINNER: {winner} — {reason}")
    except Exception as exc:
        try:
            rest_patch(
                "mlb_ml_pitcher_k_experiment_runs", {"experiment_id": f"eq.{experiment_id}"},
                {"status": "failed", "error_message": str(exc)[:4000], "completed_at": dt.datetime.now(dt.timezone.utc).isoformat()}
            )
        finally:
            raise


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Phase 2 pitcher strikeout model research")
    p.add_argument("--experiment-name", default=f"pitcher_k_phase2_{dt.datetime.now().strftime('%Y%m%d_%H%M%S')}")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    try:
        run(args)
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
