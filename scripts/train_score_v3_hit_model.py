#!/usr/bin/env python3
"""
Train and score MLB Hit Lab V3 hit_1plus model.

Reads:
  - public.v_mlb_ml_training_features_v3_hit_1plus
  - public.v_mlb_ml_today_features_v3

Writes:
  - public.mlb_ml_model_runs
  - public.mlb_ml_predictions_v3

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  # use only in GitHub Actions/backend, never browser

Optional env vars:
  V3_MODEL_VERSION           # default: v3_hit_YYYYMMDD_HHMMSS
  V3_MIN_TRAIN_ROWS          # default: 1000
  V3_VALIDATION_DAYS         # default: 7
  V3_DRY_RUN                 # true/false, default false
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from supabase import create_client

from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


TARGET_NAME = "hit_1plus"
TRAINING_VIEW = "v_mlb_ml_training_features_v3_hit_1plus"
TODAY_VIEW = "v_mlb_ml_today_features_v3"
MODEL_RUNS_TABLE = "mlb_ml_model_runs"
PREDICTIONS_TABLE = "mlb_ml_predictions_v3"
ARTIFACT_DIR = Path("artifacts/mlb_v3")

NUMERIC_FEATURES = [
    "matchup_score",
    "recent_form_score",
    "batter_split_score",
    "pitcher_vulnerability_score",
    "pitcher_recent_form_score",
    "batter_recent_avg",
    "batter_recent_hits",
    "batter_recent_at_bats",
    "batter_recent_hit_rate",
    "batter_split_avg",
    "batter_split_ab",
    "pitcher_baa_split",
    "pitcher_last5_era",
    "pitcher_last5_whip",
]

CATEGORICAL_FEATURES = [
    "batter_bats",
    "pitcher_throws",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


@dataclass
class Config:
    supabase_url: str
    supabase_key: str
    model_version: str
    min_train_rows: int
    validation_days: int
    dry_run: bool


def get_config() -> Config:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return Config(
        supabase_url=url,
        supabase_key=key,
        model_version=os.environ.get("V3_MODEL_VERSION", f"v3_hit_{timestamp}"),
        min_train_rows=int(os.environ.get("V3_MIN_TRAIN_ROWS", "1000")),
        validation_days=int(os.environ.get("V3_VALIDATION_DAYS", "7")),
        dry_run=os.environ.get("V3_DRY_RUN", "false").lower() in {"true", "1", "yes"},
    )


def fetch_all_rows(client: Any, table_or_view: str, page_size: int = 1000) -> pd.DataFrame:
    rows: list[dict[str, Any]] = []
    start = 0
    while True:
        end = start + page_size - 1
        response = client.table(table_or_view).select("*").range(start, end).execute()
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return pd.DataFrame(rows)


def coerce_training_data(df: pd.DataFrame) -> pd.DataFrame:
    required = set(FEATURES + ["prediction_run_date", "target_hit_1plus"])
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Training data missing required columns: {missing}")

    clean = df.copy()
    clean["prediction_run_date"] = pd.to_datetime(clean["prediction_run_date"]).dt.date
    clean["target_hit_1plus"] = clean["target_hit_1plus"].astype(int)

    for col in NUMERIC_FEATURES:
        clean[col] = pd.to_numeric(clean[col], errors="coerce")

    for col in CATEGORICAL_FEATURES:
        clean[col] = clean[col].fillna("Unknown").astype(str)

    return clean.dropna(subset=["prediction_run_date", "target_hit_1plus"])


def split_time_based(df: pd.DataFrame, validation_days: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    max_date = df["prediction_run_date"].max()
    validation_start = pd.to_datetime(max_date) - pd.Timedelta(days=validation_days - 1)
    validation_start_date = validation_start.date()

    train_df = df[df["prediction_run_date"] < validation_start_date].copy()
    valid_df = df[df["prediction_run_date"] >= validation_start_date].copy()

    if train_df.empty or valid_df.empty:
        raise ValueError("Time split produced empty train or validation set. Increase data history or reduce V3_VALIDATION_DAYS.")

    return train_df, valid_df


def make_models() -> dict[str, Pipeline]:
    numeric_linear = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    numeric_tree = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
    ])
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])

    linear_preprocess = ColumnTransformer([
        ("num", numeric_linear, NUMERIC_FEATURES),
        ("cat", categorical, CATEGORICAL_FEATURES),
    ])

    tree_preprocess = ColumnTransformer([
        ("num", numeric_tree, NUMERIC_FEATURES),
        ("cat", categorical, CATEGORICAL_FEATURES),
    ])

    return {
        "logistic_regression": Pipeline([
            ("preprocess", linear_preprocess),
            ("model", LogisticRegression(max_iter=2000, class_weight="balanced")),
        ]),
        "random_forest": Pipeline([
            ("preprocess", tree_preprocess),
            ("model", RandomForestClassifier(
                n_estimators=300,
                min_samples_leaf=25,
                random_state=42,
                n_jobs=-1,
                class_weight="balanced_subsample",
            )),
        ]),
        "hist_gradient_boosting": Pipeline([
            ("preprocess", tree_preprocess),
            ("model", HistGradientBoostingClassifier(
                learning_rate=0.05,
                max_iter=250,
                max_leaf_nodes=31,
                l2_regularization=0.05,
                random_state=42,
            )),
        ]),
    }


def evaluate_predictions(y_true: np.ndarray, prob: np.ndarray, valid_df: pd.DataFrame) -> dict[str, Any]:
    out: dict[str, Any] = {
        "rows": int(len(y_true)),
        "positive_rate": float(np.mean(y_true)),
        "brier_score": float(brier_score_loss(y_true, prob)),
        "log_loss": float(log_loss(y_true, np.clip(prob, 1e-6, 1 - 1e-6))),
    }

    try:
        out["roc_auc"] = float(roc_auc_score(y_true, prob))
    except ValueError:
        out["roc_auc"] = None

    eval_df = valid_df[["prediction_run_date", "player_id", "batter_name", "team_name"]].copy()
    eval_df["actual"] = y_true
    eval_df["prob"] = prob
    eval_df["rank"] = eval_df.groupby("prediction_run_date")["prob"].rank(method="first", ascending=False)

    for k in [1, 5, 10, 20]:
        subset = eval_df[eval_df["rank"] <= k]
        out[f"top_{k}_rows"] = int(len(subset))
        out[f"top_{k}_hit_rate"] = None if subset.empty else float(subset["actual"].mean())

    return out


def select_best_model(models: dict[str, Pipeline], train_df: pd.DataFrame, valid_df: pd.DataFrame) -> tuple[str, Pipeline, dict[str, Any]]:
    X_train = train_df[FEATURES]
    y_train = train_df["target_hit_1plus"].to_numpy()
    X_valid = valid_df[FEATURES]
    y_valid = valid_df["target_hit_1plus"].to_numpy()

    results: dict[str, dict[str, Any]] = {}
    fitted_models: dict[str, Pipeline] = {}

    for name, model in models.items():
        print(f"Training candidate: {name}")
        model.fit(X_train, y_train)
        prob = model.predict_proba(X_valid)[:, 1]
        metrics = evaluate_predictions(y_valid, prob, valid_df)
        results[name] = metrics
        fitted_models[name] = model
        print(json.dumps({name: metrics}, indent=2))

    # Selection priority: lower Brier first, then higher top-10 rate, then higher AUC.
    def sort_key(item: tuple[str, dict[str, Any]]) -> tuple[float, float, float]:
        _, metrics = item
        return (
            metrics["brier_score"],
            -(metrics.get("top_10_hit_rate") or 0),
            -(metrics.get("roc_auc") or 0),
        )

    best_name, best_metrics = sorted(results.items(), key=sort_key)[0]
    best_model = fitted_models[best_name]
    best_metrics = {"selected_model": best_name, "candidate_metrics": results, **best_metrics}
    return best_name, best_model, best_metrics


def build_explanation(row: pd.Series, probability: float) -> tuple[str, dict[str, Any], str]:
    factors: dict[str, Any] = {}

    def add_factor(name: str, value: Any, direction: str, reason: str) -> None:
        factors[name] = {"value": None if pd.isna(value) else value, "direction": direction, "reason": reason}

    if pd.notna(row.get("batter_recent_hit_rate")):
        value = float(row["batter_recent_hit_rate"])
        if value >= 0.70:
            add_factor("recent_form", value, "positive", "Batter has a high recent hit rate.")
        elif value < 0.45:
            add_factor("recent_form", value, "negative", "Recent hit rate is below the model baseline.")

    split_avg = row.get("batter_split_avg")
    if pd.notna(split_avg):
        value = float(split_avg)
        if value >= 0.280:
            add_factor("batter_split", value, "positive", "Batter split is favorable for this matchup.")
        elif value < 0.220:
            add_factor("batter_split", value, "negative", "Batter split is weaker for this matchup.")

    pitcher_baa = row.get("pitcher_baa_split")
    if pd.notna(pitcher_baa):
        value = float(pitcher_baa)
        if value >= 0.270:
            add_factor("pitcher_split", value, "positive", "Opposing pitcher allows a high batting average in this split.")
        elif value < 0.220:
            add_factor("pitcher_split", value, "negative", "Opposing pitcher split is tougher than average.")

    whip = row.get("pitcher_last5_whip")
    if pd.notna(whip):
        value = float(whip)
        if value >= 1.35:
            add_factor("pitcher_recent_whip", value, "positive", "Pitcher has allowed traffic recently.")
        elif value < 1.05:
            add_factor("pitcher_recent_whip", value, "negative", "Pitcher recent WHIP is strong, adding risk.")

    if probability >= 0.65:
        confidence = "high"
    elif probability >= 0.58:
        confidence = "medium"
    else:
        confidence = "low"

    positives = [v["reason"] for v in factors.values() if v["direction"] == "positive"]
    negatives = [v["reason"] for v in factors.values() if v["direction"] == "negative"]
    explanation = " ".join(positives[:2] + negatives[:1])
    if not explanation:
        explanation = "Projection is primarily driven by the full feature mix rather than one standout factor."

    return confidence, factors, explanation


def register_model(client: Any, cfg: Config, model_name: str, metrics: dict[str, Any], train_df: pd.DataFrame, valid_df: pd.DataFrame, artifact_uri: str) -> int | None:
    payload = {
        "model_family": "v3_ml",
        "target_name": TARGET_NAME,
        "model_name": model_name,
        "model_version": cfg.model_version,
        "status": "candidate",
        "training_start_date": str(train_df["prediction_run_date"].min()),
        "training_end_date": str(train_df["prediction_run_date"].max()),
        "validation_start_date": str(valid_df["prediction_run_date"].min()),
        "validation_end_date": str(valid_df["prediction_run_date"].max()),
        "feature_list": FEATURES,
        "hyperparameters": {"validation_days": cfg.validation_days, "selection_rule": "min_brier_then_top10_then_auc"},
        "metrics": metrics,
        "artifact_uri": artifact_uri,
        "notes": "First V3 supervised ML candidate for hit_1plus. V1/V2 remain production until this proves out.",
    }
    if cfg.dry_run:
        print("DRY RUN model registration:")
        print(json.dumps(payload, indent=2, default=str))
        return None

    response = client.table(MODEL_RUNS_TABLE).insert(payload).execute()
    if not response.data:
        raise RuntimeError("Model registration failed; no row returned.")
    return int(response.data[0]["model_run_id"])


def score_today(client: Any, cfg: Config, model: Pipeline, model_run_id: int | None) -> pd.DataFrame:
    today = fetch_all_rows(client, TODAY_VIEW)
    if today.empty:
        raise RuntimeError("No rows returned from today feature view.")

    for col in NUMERIC_FEATURES:
        today[col] = pd.to_numeric(today.get(col), errors="coerce")
    for col in CATEGORICAL_FEATURES:
        today[col] = today.get(col, "Unknown").fillna("Unknown").astype(str)

    today["predicted_probability"] = model.predict_proba(today[FEATURES])[:, 1]
    today["rank_overall"] = today["predicted_probability"].rank(method="first", ascending=False).astype(int)
    today["rank_team"] = today.groupby("team_id")["predicted_probability"].rank(method="first", ascending=False).astype(int)

    prediction_rows = []
    for _, row in today.iterrows():
        prob = float(row["predicted_probability"])
        confidence, factors, explanation = build_explanation(row, prob)
        prediction_rows.append({
            "model_run_id": model_run_id,
            "target_name": TARGET_NAME,
            "prediction_run_date": str(row["prediction_run_date"]),
            "game_date": None if pd.isna(row.get("game_date")) else str(row["game_date"]),
            "game_pk": None if pd.isna(row.get("game_pk")) else int(row["game_pk"]),
            "player_id": int(row["player_id"]),
            "batter_name": row.get("batter_name"),
            "team_id": None if pd.isna(row.get("team_id")) else int(row["team_id"]),
            "team_name": row.get("team_name"),
            "pitcher_id": None if pd.isna(row.get("pitcher_id")) else int(row["pitcher_id"]),
            "pitcher_name": row.get("pitcher_name"),
            "pitcher_team_name": row.get("pitcher_team_name"),
            "predicted_probability": round(prob, 6),
            "predicted_value": round(prob, 6),
            "score": round(prob * 100, 3),
            "confidence_bucket": confidence,
            "rank_overall": int(row["rank_overall"]),
            "rank_team": int(row["rank_team"]),
            "features": {col: (None if pd.isna(row.get(col)) else row.get(col)) for col in FEATURES},
            "explanation_factors": factors,
            "explanation_text": explanation,
        })

    if cfg.dry_run:
        print(f"DRY RUN would insert {len(prediction_rows)} prediction rows.")
        print(json.dumps(prediction_rows[:3], indent=2, default=str))
    else:
        # Insert in chunks to avoid request-size limits.
        for start in range(0, len(prediction_rows), 500):
            chunk = prediction_rows[start:start + 500]
            client.table(PREDICTIONS_TABLE).insert(chunk).execute()

    return today.sort_values("rank_overall")


def main() -> None:
    cfg = get_config()
    client = create_client(cfg.supabase_url, cfg.supabase_key)
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)

    raw = fetch_all_rows(client, TRAINING_VIEW)
    df = coerce_training_data(raw)
    if len(df) < cfg.min_train_rows:
        raise RuntimeError(f"Only {len(df)} training rows found; minimum is {cfg.min_train_rows}.")

    train_df, valid_df = split_time_based(df, cfg.validation_days)
    best_name, best_model, metrics = select_best_model(make_models(), train_df, valid_df)

    artifact_path = ARTIFACT_DIR / f"{cfg.model_version}_{best_name}.joblib"
    joblib.dump({
        "model": best_model,
        "features": FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "metrics": metrics,
        "model_name": best_name,
        "model_version": cfg.model_version,
        "target_name": TARGET_NAME,
    }, artifact_path)

    model_run_id = register_model(
        client=client,
        cfg=cfg,
        model_name=best_name,
        metrics=metrics,
        train_df=train_df,
        valid_df=valid_df,
        artifact_uri=str(artifact_path),
    )

    scored = score_today(client, cfg, best_model, model_run_id)
    top = scored[["rank_overall", "batter_name", "team_name", "pitcher_name", "predicted_probability"]].head(25)
    print("Top 25 V3 hit_1plus predictions:")
    print(top.to_string(index=False))
    print(f"Completed V3 run. model_run_id={model_run_id}, artifact={artifact_path}")


if __name__ == "__main__":
    main()
