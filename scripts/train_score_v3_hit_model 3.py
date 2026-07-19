#!/usr/bin/env python3
"""
Train and score MLB Hit Lab V3 hit_1plus model.

Reads:
  - public.mlb_ml_training_features_v3_snapshot
  - public.v_mlb_ml_today_features_v3_wide
  - public.mlb_batter_pitcher_matchup_features_daily

Writes:
  - public.mlb_ml_model_runs
  - public.mlb_ml_predictions_v3

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  # use only in GitHub Actions/backend, never browser

Optional env vars:
  V3_MODEL_VERSION                    # default: v3_hit_YYYYMMDD_HHMMSS
  V3_MIN_TRAIN_ROWS                   # default: 1000
  V3_VALIDATION_DAYS                  # default: 7
  V3_DRY_RUN                          # true/false, default false
  V3_MATCHUP_READINESS_ATTEMPTS       # default: 6
  V3_MATCHUP_READINESS_SLEEP_SECONDS  # default: 30
"""

from __future__ import annotations

import json
import os
import time
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
TRAINING_VIEW = "mlb_ml_training_features_v3_snapshot"
TODAY_VIEW = "v_mlb_ml_today_features_v3_wide"
MATCHUP_FEATURES_TABLE = "mlb_batter_pitcher_matchup_features_daily"
MODEL_RUNS_TABLE = "mlb_ml_model_runs"
PREDICTIONS_TABLE = "mlb_ml_predictions_v3"
ARTIFACT_DIR = Path("artifacts/mlb_v3")

WINDOWS = [3, 5, 6, 10, 15]

WINDOW_NUMERIC_BASES = [
    "matchup_score",
    "hot_score",
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
    "batter_split_reliability",
    "pitcher_baa_split",
    "pitcher_last5_era",
    "pitcher_last5_whip",
]

# One row per player-game. The model gets every rolling window as columns and can learn
# which window matters instead of seeing duplicate labels for the same player-game.
WINDOW_NUMERIC_FEATURES = [
    f"{base}_w{window}"
    for base in WINDOW_NUMERIC_BASES
    for window in WINDOWS
]

# Point-in-time contact-quality and pitch-arsenal matchup features. These are produced
# with source events strictly earlier than game_date and merged into both training and
# scoring rows by (game_date, game_pk, player_id).
MATCHUP_NUMERIC_FEATURES = [
    "batter_contact_bbe",
    "pitcher_contact_bbe",
    "batter_hard_hit_rate",
    "batter_barrel_rate",
    "batter_xba",
    "batter_xwoba_contact",
    "pitcher_hard_hit_rate_allowed",
    "pitcher_barrel_rate_allowed",
    "pitcher_xba_allowed",
    "pitcher_xwoba_contact_allowed",
    "hard_hit_collision",
    "barrel_collision",
    "xba_matchup",
    "contact_quality_edge",
    "arsenal_weighted_batter_xba",
    "arsenal_weighted_batter_xwoba",
    "arsenal_weighted_batter_whiff_rate",
    "arsenal_weighted_pitcher_xba_allowed",
    "arsenal_weighted_pitcher_whiff_rate",
    "arsenal_xba_edge",
    "arsenal_whiff_risk",
    "arsenal_coverage_pct",
    "arsenal_matched_pitch_types",
    "batter_pitch_sample",
    "pitcher_pitch_sample",
    "contact_feature_available",
    "arsenal_feature_available",
]

NUMERIC_FEATURES = WINDOW_NUMERIC_FEATURES + MATCHUP_NUMERIC_FEATURES

CATEGORICAL_FEATURES = [
    "batter_bats",
    "pitcher_throws",
    "effective_batter_side",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

MATCHUP_JOIN_KEYS = ["game_date", "game_pk", "player_id"]
MATCHUP_COUNT_FEATURES = [
    "batter_contact_bbe",
    "pitcher_contact_bbe",
    "arsenal_matched_pitch_types",
    "batter_pitch_sample",
    "pitcher_pitch_sample",
]
MATCHUP_AVAILABILITY_FEATURES = [
    "contact_feature_available",
    "arsenal_feature_available",
]


@dataclass
class Config:
    supabase_url: str
    supabase_key: str
    model_version: str
    min_train_rows: int
    validation_days: int
    dry_run: bool
    matchup_readiness_attempts: int
    matchup_readiness_sleep_seconds: int


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
        matchup_readiness_attempts=max(
            1, int(os.environ.get("V3_MATCHUP_READINESS_ATTEMPTS", "6"))
        ),
        matchup_readiness_sleep_seconds=max(
            1, int(os.environ.get("V3_MATCHUP_READINESS_SLEEP_SECONDS", "30"))
        ),
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


def derive_scoring_date(today: pd.DataFrame) -> str:
    """Return the single game date represented by today's scoring slate."""
    if today.empty:
        raise RuntimeError("No rows returned from today feature view.")

    date_column = "game_date" if "game_date" in today.columns else "prediction_run_date"
    if date_column not in today.columns:
        raise ValueError(
            f"{TODAY_VIEW} is missing both game_date and prediction_run_date."
        )

    parsed = pd.to_datetime(today[date_column], errors="coerce").dt.date
    if parsed.isna().any():
        bad_rows = today.loc[parsed.isna(), [date_column]].head(20).to_dict("records")
        raise ValueError(
            f"{TODAY_VIEW} contains invalid {date_column} values; sample={bad_rows}"
        )

    unique_dates = sorted({value.isoformat() for value in parsed})
    if len(unique_dates) != 1:
        raise ValueError(
            f"{TODAY_VIEW} must contain exactly one scoring date; found={unique_dates}"
        )
    return unique_dates[0]


def ensure_matchup_features_ready(
    client: Any,
    game_date: str,
    attempts: int,
    sleep_seconds: int,
) -> dict[str, Any]:
    """Enforce the database readiness contract before loading matchup features."""
    retryable_statuses = {"waiting", "busy", "refreshing", "not_ready"}

    for attempt in range(1, attempts + 1):
        try:
            response = client.rpc(
                "ensure_mlb_v3_matchup_features_ready",
                {"p_game_date": game_date},
            ).execute()
        except Exception as exc:
            if attempt >= attempts:
                raise RuntimeError(
                    "Supabase matchup readiness RPC failed after "
                    f"{attempts} attempts for game_date={game_date}."
                ) from exc
            print(
                "Matchup readiness RPC error "
                f"(attempt {attempt}/{attempts}): {exc}. "
                f"Retrying in {sleep_seconds}s..."
            )
            time.sleep(sleep_seconds)
            continue

        payload = response.data or {}
        if isinstance(payload, list):
            payload = payload[0] if payload else {}
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                payload = {"status": payload}
        if not isinstance(payload, dict):
            raise RuntimeError(
                "Unexpected matchup readiness response type: "
                f"{type(payload).__name__}; response={payload!r}"
            )

        status = str(payload.get("status", "")).lower()
        expected_rows = payload.get("expected_rows")
        existing_rows = payload.get("existing_rows")
        missing_rows = payload.get("missing_rows")

        if status == "ready":
            if missing_rows not in (None, 0):
                raise RuntimeError(
                    "Matchup readiness contract returned ready with missing rows: "
                    f"response={payload}"
                )
            print(
                "Matchup features ready: "
                f"game_date={game_date}, existing={existing_rows}, "
                f"expected={expected_rows}, missing={missing_rows or 0}"
            )
            return payload

        if status in retryable_statuses and attempt < attempts:
            print(
                "Matchup features not ready "
                f"(status={status}, attempt {attempt}/{attempts}, "
                f"response={payload}). Retrying in {sleep_seconds}s..."
            )
            time.sleep(sleep_seconds)
            continue

        raise RuntimeError(
            "V3 matchup features are not ready for scoring. "
            f"game_date={game_date}, attempt={attempt}/{attempts}, "
            f"response={payload}"
        )

    raise RuntimeError(
        f"V3 matchup readiness exhausted unexpectedly for game_date={game_date}."
    )


def fetch_matchup_features(client: Any) -> pd.DataFrame:
    columns = MATCHUP_JOIN_KEYS + MATCHUP_NUMERIC_FEATURES + ["effective_batter_side", "feature_version"]
    matchup = fetch_all_rows(client, MATCHUP_FEATURES_TABLE)

    if matchup.empty:
        raise RuntimeError(f"No rows returned from {MATCHUP_FEATURES_TABLE}.")

    missing = sorted(set(columns) - set(matchup.columns))
    if missing:
        raise ValueError(
            f"{MATCHUP_FEATURES_TABLE} is missing required columns: {missing}"
        )

    matchup = matchup[columns].copy()
    duplicate_mask = matchup.duplicated(subset=MATCHUP_JOIN_KEYS, keep=False)
    if duplicate_mask.any():
        sample = matchup.loc[duplicate_mask, MATCHUP_JOIN_KEYS].head(20).to_dict("records")
        raise ValueError(
            f"{MATCHUP_FEATURES_TABLE} contains duplicate player-game keys. "
            f"duplicate_rows={int(duplicate_mask.sum())}; sample={sample}"
        )

    return matchup


def attach_matchup_features(
    base_df: pd.DataFrame,
    matchup_df: pd.DataFrame,
    context: str,
    require_full_coverage: bool,
) -> pd.DataFrame:
    missing_keys = sorted(set(MATCHUP_JOIN_KEYS) - set(base_df.columns))
    if missing_keys:
        raise ValueError(f"{context} data missing matchup join keys: {missing_keys}")

    base = base_df.copy()
    for key in MATCHUP_JOIN_KEYS:
        if key == "game_date":
            base[key] = pd.to_datetime(base[key], errors="coerce").dt.date
            matchup_df = matchup_df.copy()
            matchup_df[key] = pd.to_datetime(matchup_df[key], errors="coerce").dt.date
        else:
            base[key] = pd.to_numeric(base[key], errors="coerce").astype("Int64")
            matchup_df = matchup_df.copy()
            matchup_df[key] = pd.to_numeric(matchup_df[key], errors="coerce").astype("Int64")

    merged = base.merge(
        matchup_df,
        how="left",
        on=MATCHUP_JOIN_KEYS,
        validate="many_to_one",
        indicator="_matchup_merge",
    )

    matched_rows = int((merged["_matchup_merge"] == "both").sum())
    total_rows = int(len(merged))
    unmatched_rows = total_rows - matched_rows
    coverage_pct = 0.0 if total_rows == 0 else 100.0 * matched_rows / total_rows
    print(
        f"{context} matchup feature join: matched={matched_rows}/{total_rows} "
        f"({coverage_pct:.2f}%), unmatched={unmatched_rows}"
    )

    if unmatched_rows:
        sample = (
            merged.loc[merged["_matchup_merge"] != "both", MATCHUP_JOIN_KEYS]
            .head(20)
            .to_dict("records")
        )
        message = (
            f"{context} rows are missing point-in-time matchup features. "
            f"unmatched_rows={unmatched_rows}; sample={sample}"
        )
        if require_full_coverage:
            raise ValueError(message)
        print(f"WARNING: {message} These historical rows remain in training with "
              "availability flags set to 0 and matchup values imputed by the model pipeline.")

    merged = merged.drop(columns=["_matchup_merge"])

    # Missing samples genuinely mean no qualifying history, not a median-sized sample.
    for col in MATCHUP_COUNT_FEATURES + MATCHUP_AVAILABILITY_FEATURES:
        merged[col] = pd.to_numeric(merged[col], errors="coerce").fillna(0)

    for col in MATCHUP_NUMERIC_FEATURES:
        merged[col] = pd.to_numeric(merged[col], errors="coerce")

    merged["effective_batter_side"] = (
        merged["effective_batter_side"].fillna("Unknown").astype(str)
    )
    return merged


def validate_no_duplicate_player_games(df: pd.DataFrame, context: str) -> None:
    key_cols = ["prediction_run_date", "game_pk", "player_id"]
    missing = sorted(set(key_cols) - set(df.columns))
    if missing:
        raise ValueError(f"{context} data missing duplicate-check columns: {missing}")

    duplicate_mask = df.duplicated(subset=key_cols, keep=False)
    if duplicate_mask.any():
        sample = (
            df.loc[duplicate_mask, key_cols + [c for c in ["batter_name", "team_name"] if c in df.columns]]
            .head(20)
            .to_dict("records")
        )
        raise ValueError(
            f"{context} data contains duplicate player-game keys. "
            f"duplicate_rows={int(duplicate_mask.sum())}; sample={sample}"
        )


def validate_feature_columns(df: pd.DataFrame, context: str, include_target: bool = False) -> None:
    required = set(FEATURES + ["prediction_run_date", "game_pk", "player_id"])
    if include_target:
        required.add("target_hit_1plus")

    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"{context} data missing required columns: {missing}")


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass

    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return value


def row_value(row: pd.Series, column: str, default: Any = None) -> Any:
    if column not in row.index:
        return default
    value = row.get(column)
    try:
        if pd.isna(value):
            return default
    except (TypeError, ValueError):
        pass
    return value


def first_available_window_value(row: pd.Series, base: str, preferred_window: int = 10) -> tuple[Any, int | None]:
    preferred_col = f"{base}_w{preferred_window}"
    preferred_value = row_value(row, preferred_col)
    if preferred_value is not None:
        return preferred_value, preferred_window

    for window in WINDOWS:
        value = row_value(row, f"{base}_w{window}")
        if value is not None:
            return value, window

    return None, None


def max_available_window_value(row: pd.Series, base: str) -> tuple[Any, int | None]:
    best_value: Any = None
    best_window: int | None = None

    for window in WINDOWS:
        value = row_value(row, f"{base}_w{window}")
        if value is None:
            continue
        numeric = float(value)
        if best_value is None or numeric > float(best_value):
            best_value = numeric
            best_window = window

    return best_value, best_window


def coerce_training_data(df: pd.DataFrame) -> pd.DataFrame:
    validate_feature_columns(df, "Training", include_target=True)
    validate_no_duplicate_player_games(df, "Training")

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

    validation_dates = int(eval_df["prediction_run_date"].nunique())
    out["validation_dates"] = validation_dates

    for k in [1, 5, 10, 20, 25]:
        subset = eval_df[eval_df["rank"] <= k].copy()

        # Row-weighted Top N hit rate:
        # Example: Top 10 across 7 days = 70 rows, each row weighted equally.
        out[f"top_{k}_rows"] = int(len(subset))
        out[f"top_{k}_hit_rate"] = None if subset.empty else float(subset["actual"].mean())

        # Daily-average Top N hit rate:
        # Example: calculate Top 10 hit rate for each date, then average the 7 daily rates.
        # This keeps each date equally weighted even if slate sizes differ.
        daily_rates = subset.groupby("prediction_run_date")["actual"].mean() if not subset.empty else pd.Series(dtype=float)
        out[f"daily_top_{k}_days"] = int(daily_rates.count())
        out[f"daily_top_{k}_hit_rate"] = None if daily_rates.empty else float(daily_rates.mean())
        out[f"daily_top_{k}_min_hit_rate"] = None if daily_rates.empty else float(daily_rates.min())
        out[f"daily_top_{k}_max_hit_rate"] = None if daily_rates.empty else float(daily_rates.max())

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

    # Selection priority: lower Brier first, then higher row-weighted top-10 rate, then higher AUC.
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

    def add_factor(name: str, value: Any, direction: str, reason: str, window: int | None = None) -> None:
        factors[name] = {
            "value": json_safe(value),
            "direction": direction,
            "reason": reason,
            "window": window,
        }

    recent_rate, recent_window = max_available_window_value(row, "batter_recent_hit_rate")
    if recent_rate is not None:
        value = float(recent_rate)
        if value >= 0.70:
            add_factor(
                "recent_form",
                value,
                "positive",
                f"Batter has a high recent hit rate over the last {recent_window} games.",
                recent_window,
            )
        elif value < 0.45:
            add_factor(
                "recent_form",
                value,
                "negative",
                f"Recent hit rate is below the model baseline over the last {recent_window} games.",
                recent_window,
            )

    split_avg, split_window = first_available_window_value(row, "batter_split_avg")
    if split_avg is not None:
        value = float(split_avg)
        if value >= 0.280:
            add_factor("batter_split", value, "positive", "Batter split is favorable for this matchup.", split_window)
        elif value < 0.220:
            add_factor("batter_split", value, "negative", "Batter split is weaker for this matchup.", split_window)

    pitcher_baa, pitcher_baa_window = first_available_window_value(row, "pitcher_baa_split")
    if pitcher_baa is not None:
        value = float(pitcher_baa)
        if value >= 0.270:
            add_factor(
                "pitcher_split",
                value,
                "positive",
                "Opposing pitcher allows a high batting average in this split.",
                pitcher_baa_window,
            )
        elif value < 0.220:
            add_factor(
                "pitcher_split",
                value,
                "negative",
                "Opposing pitcher split is tougher than average.",
                pitcher_baa_window,
            )

    whip, whip_window = first_available_window_value(row, "pitcher_last5_whip")
    if whip is not None:
        value = float(whip)
        if value >= 1.35:
            add_factor("pitcher_recent_whip", value, "positive", "Pitcher has allowed traffic recently.", whip_window)
        elif value < 1.05:
            add_factor("pitcher_recent_whip", value, "negative", "Pitcher recent WHIP is strong, adding risk.", whip_window)

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
        explanation = "Projection is driven by the wide V3 feature mix across recent-game windows."

    return confidence, factors, explanation


def build_prediction_features(row: pd.Series) -> dict[str, Any]:
    features = {col: json_safe(row.get(col)) for col in FEATURES}

    # Backward-compatible aliases used by existing Supabase serving views and the UI drawer.
    alias_map = {
        "matchup_score": "matchup_score",
        "recent_form_score": "recent_form_score",
        "batter_split_score": "batter_split_score",
        "pitcher_vulnerability_score": "pitcher_vulnerability_score",
        "pitcher_recent_form_score": "pitcher_recent_form_score",
        "batter_recent_avg": "batter_recent_avg",
        "batter_recent_hits": "batter_recent_hits",
        "batter_recent_at_bats": "batter_recent_at_bats",
        "batter_recent_hit_rate": "batter_recent_hit_rate",
        "batter_split_avg": "batter_split_avg",
        "batter_split_ab": "batter_split_ab",
        "batter_split_reliability": "batter_split_reliability",
        "pitcher_baa_split": "pitcher_baa_split",
        "pitcher_last5_era": "pitcher_last5_era",
        "pitcher_last5_whip": "pitcher_last5_whip",
    }

    for alias, base in alias_map.items():
        value, window = first_available_window_value(row, base, preferred_window=10)
        features[alias] = json_safe(value)
        features[f"{alias}_source_window"] = window

    for col in [
        "expected_plate_appearances",
        "recent_lineup_spot",
        "batting_order",
        "expected_pa_score",
        "model_v2_score",
        "v2_calibrated_hit_probability",
        "base_hit_rate",
        "probability_lift_vs_base",
        "batter_bats",
        "pitcher_throws",
    ]:
        if col in row.index:
            features[col] = json_safe(row.get(col))

    features["wide_feature_view"] = TODAY_VIEW
    features["matchup_feature_source"] = MATCHUP_FEATURES_TABLE
    features["matchup_feature_version"] = json_safe(row.get("feature_version"))
    features["windows"] = WINDOWS
    features["primary_reference_window"] = 10
    return features


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
        "hyperparameters": {
            "validation_days": cfg.validation_days,
            "selection_rule": "min_brier_then_top10_then_auc",
            "feature_shape": "wide_windows_one_row_per_player_game",
            "windows": WINDOWS,
        },
        "metrics": metrics,
        "artifact_uri": artifact_uri,
        "notes": "V3 supervised ML candidate for hit_1plus using wide rolling-window features plus point-in-time contact-quality and pitch-arsenal matchup features. One row per player-game. Metrics include row-weighted Top N and daily-average Top N hit rates.",
    }
    if cfg.dry_run:
        print("DRY RUN model registration:")
        print(json.dumps(payload, indent=2, default=str))
        return None

    response = client.table(MODEL_RUNS_TABLE).insert(payload).execute()
    if not response.data:
        raise RuntimeError("Model registration failed; no row returned.")
    return int(response.data[0]["model_run_id"])


def score_today(
    client: Any,
    cfg: Config,
    model: Pipeline,
    model_run_id: int | None,
    matchup_df: pd.DataFrame,
    today: pd.DataFrame,
) -> pd.DataFrame:
    today = attach_matchup_features(
        today, matchup_df, "Today", require_full_coverage=True
    )
    validate_feature_columns(today, "Today", include_target=False)
    validate_no_duplicate_player_games(today, "Today")

    for col in NUMERIC_FEATURES:
        today[col] = pd.to_numeric(today[col], errors="coerce")
    for col in CATEGORICAL_FEATURES:
        today[col] = today[col].fillna("Unknown").astype(str)

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
            "features": build_prediction_features(row),
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

    # Load the scoring slate first, derive its exact date, and enforce the
    # database readiness contract before taking a snapshot of matchup features.
    # Reusing this DataFrame later also prevents the scoring population from
    # changing between readiness validation and model scoring.
    today = fetch_all_rows(client, TODAY_VIEW)
    scoring_date = derive_scoring_date(today)
    print(
        f"Loaded {len(today)} rows from {TODAY_VIEW} "
        f"for scoring_date={scoring_date}."
    )
    ensure_matchup_features_ready(
        client=client,
        game_date=scoring_date,
        attempts=cfg.matchup_readiness_attempts,
        sleep_seconds=cfg.matchup_readiness_sleep_seconds,
    )

    matchup_df = fetch_matchup_features(client)
    print(f"Loaded {len(matchup_df)} rows from {MATCHUP_FEATURES_TABLE}.")

    raw = fetch_all_rows(client, TRAINING_VIEW)
    print(f"Loaded {len(raw)} rows from {TRAINING_VIEW}.")
    raw = attach_matchup_features(
        raw, matchup_df, "Training", require_full_coverage=False
    )
    df = coerce_training_data(raw)
    print(
        f"Training coverage: rows={len(df)}, dates={df['prediction_run_date'].nunique()}, "
        f"start={df['prediction_run_date'].min()}, end={df['prediction_run_date'].max()}"
    )
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

    scored = score_today(
        client, cfg, best_model, model_run_id, matchup_df, today
    )
    top = scored[["rank_overall", "batter_name", "team_name", "pitcher_name", "predicted_probability"]].head(25)
    print("Top 25 V3 hit_1plus predictions:")
    print(top.to_string(index=False))
    print(f"Completed V3 run. model_run_id={model_run_id}, artifact={artifact_path}")


if __name__ == "__main__":
    main()
