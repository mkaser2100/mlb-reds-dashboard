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
  - public.mlb_ml_model_feature_importance
  - public.mlb_ml_player_feature_contributions

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
import math
import os
import re
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
from sklearn.inspection import permutation_importance
from sklearn.metrics import brier_score_loss, log_loss, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


TARGET_NAME = "hit_1plus"
TRAINING_VIEW = "mlb_ml_training_features_v3_snapshot"
TODAY_VIEW = "v_mlb_ml_today_features_v3_wide"
MATCHUP_FEATURES_TABLE = "mlb_batter_pitcher_matchup_features_daily"
MODEL_RUNS_TABLE = "mlb_ml_model_runs"
PREDICTIONS_TABLE = "mlb_ml_predictions_v3"
FEATURE_IMPORTANCE_TABLE = "mlb_ml_model_feature_importance"
PLAYER_CONTRIBUTIONS_TABLE = "mlb_ml_player_feature_contributions"
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



def feature_group(feature_name: str) -> str:
    """Assign an original model feature to a reporting-friendly feature group."""
    if feature_name in CATEGORICAL_FEATURES:
        return "categorical"
    if feature_name in MATCHUP_AVAILABILITY_FEATURES:
        return "availability"
    if feature_name.startswith("arsenal_") or feature_name in {
        "batter_pitch_sample",
        "pitcher_pitch_sample",
    }:
        return "pitch_arsenal"
    if feature_name in MATCHUP_NUMERIC_FEATURES:
        return "statcast_contact"
    if "split" in feature_name:
        return "splits"
    if "pitcher" in feature_name:
        return "pitcher_form"
    if "recent" in feature_name or "hot_score" in feature_name:
        return "recent_form"
    return "traditional"


def original_feature_name(transformed_name: str) -> str:
    """Map a transformed pipeline column back to its original model feature."""
    name = transformed_name.split("__", 1)[-1]
    for categorical in CATEGORICAL_FEATURES:
        if name == categorical or name.startswith(f"{categorical}_"):
            return categorical
    return name


def feature_display_name(feature_name: str) -> str:
    """Return a concise baseball-readable label for a model feature."""
    exact_names = {
        "batter_bats": "Batter Handedness",
        "pitcher_throws": "Pitcher Handedness",
        "effective_batter_side": "Effective Batter Side",
        "batter_contact_bbe": "Batter Contact Sample",
        "pitcher_contact_bbe": "Pitcher Contact Sample",
        "batter_hard_hit_rate": "Batter Hard-Hit Rate",
        "batter_barrel_rate": "Batter Barrel Rate",
        "batter_xba": "Batter Expected Average",
        "batter_xwoba_contact": "Batter Contact xwOBA",
        "pitcher_hard_hit_rate_allowed": "Pitcher Hard-Hit Rate Allowed",
        "pitcher_barrel_rate_allowed": "Pitcher Barrel Rate Allowed",
        "pitcher_xba_allowed": "Pitcher Expected Average Allowed",
        "pitcher_xwoba_contact_allowed": "Pitcher Contact xwOBA Allowed",
        "hard_hit_collision": "Hard-Hit Matchup",
        "barrel_collision": "Barrel Matchup",
        "xba_matchup": "Expected Average Matchup",
        "contact_quality_edge": "Contact Quality Edge",
        "arsenal_weighted_batter_xba": "Pitch-Mix Expected Average",
        "arsenal_weighted_batter_xwoba": "Pitch-Mix Expected xwOBA",
        "arsenal_weighted_batter_whiff_rate": "Pitch-Mix Batter Whiff Rate",
        "arsenal_weighted_pitcher_xba_allowed": "Pitch-Mix xBA Allowed",
        "arsenal_weighted_pitcher_whiff_rate": "Pitch-Mix Pitcher Whiff Rate",
        "arsenal_xba_edge": "Pitch-Mix xBA Edge",
        "arsenal_whiff_risk": "Pitch-Mix Whiff Risk",
        "arsenal_coverage_pct": "Pitch-Mix Coverage",
        "arsenal_matched_pitch_types": "Matched Pitch Types",
        "batter_pitch_sample": "Batter Pitch Sample",
        "pitcher_pitch_sample": "Pitcher Pitch Sample",
        "contact_feature_available": "Contact Data Available",
        "arsenal_feature_available": "Pitch-Arsenal Data Available",
    }
    if feature_name in exact_names:
        return exact_names[feature_name]

    match = re.match(r"^(.*)_w(\d+)$", feature_name)
    if match:
        base, window = match.groups()
        base_names = {
            "matchup_score": "Matchup Score",
            "recent_form_score": "Recent Form Score",
            "hot_score": "Hot Score",
            "batter_recent_avg": "Recent Batting Average",
            "batter_recent_hits": "Recent Hits",
            "batter_recent_at_bats": "Recent At-Bats",
            "batter_recent_hit_rate": "Recent Hit Rate",
            "batter_split_score": "Batter Split Score",
            "batter_split_avg": "Batter Split Average",
            "batter_split_ab": "Batter Split At-Bats",
            "batter_split_reliability": "Batter Split Reliability",
            "pitcher_vulnerability_score": "Pitcher Vulnerability",
            "pitcher_recent_form_score": "Pitcher Recent Form",
            "pitcher_baa_split": "Pitcher Split BAA",
            "pitcher_last5_era": "Pitcher Recent ERA",
            "pitcher_last5_whip": "Pitcher Recent WHIP",
        }
        label = base_names.get(base, base.replace("_", " ").title())
        return f"{label} ({window}-Game Window)"

    return feature_name.replace("_", " ").title()


def contribution_explanation(
    feature_name: str,
    display_name: str,
    raw_value: float | None,
    direction: str,
) -> str:
    """Build deterministic copy tied to the actual signed model contribution."""
    direction_text = "raises" if direction == "positive" else "lowers"
    value_text = ""
    if raw_value is not None and math.isfinite(raw_value):
        if any(token in feature_name for token in ("avg", "xba", "xwoba", "rate", "pct", "reliability")):
            value_text = f" Current value: {raw_value:.3f}."
        else:
            value_text = f" Current value: {raw_value:.2f}."
    return f"{display_name} {direction_text} this player's modeled hit probability.{value_text}"


def prediction_identity_key(row: dict[str, Any] | pd.Series) -> tuple[str, int, int | None]:
    """Stable key used to connect inserted predictions to their feature rows."""
    prediction_date = str(row.get("prediction_run_date"))
    player_id = int(row.get("player_id"))
    game_value = row.get("game_pk")
    game_pk = None if game_value is None or pd.isna(game_value) else int(game_value)
    return prediction_date, player_id, game_pk


def calculate_logistic_player_contributions(
    model: Pipeline,
    today: pd.DataFrame,
) -> list[list[dict[str, Any]]]:
    """Calculate signed player-level log-odds contributions for logistic regression."""
    preprocess = model.named_steps["preprocess"]
    estimator = model.named_steps["model"]

    transformed = preprocess.transform(today[FEATURES])
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()
    transformed = np.asarray(transformed, dtype=float)

    coefficients = np.asarray(estimator.coef_[0], dtype=float)
    transformed_names = [str(name) for name in preprocess.get_feature_names_out()]
    if transformed.shape[1] != len(coefficients) or len(coefficients) != len(transformed_names):
        raise RuntimeError(
            "Transformed feature names and logistic-regression coefficients are misaligned "
            "while calculating player-level contributions."
        )

    source_features = [original_feature_name(name) for name in transformed_names]
    results: list[list[dict[str, Any]]] = []

    for row_position, (_, source_row) in enumerate(today.iterrows()):
        grouped_contribution: dict[str, float] = {}
        grouped_transformed: dict[str, float] = {}

        for column_position, feature_name in enumerate(source_features):
            transformed_value = float(transformed[row_position, column_position])
            contribution = transformed_value * float(coefficients[column_position])
            grouped_contribution[feature_name] = (
                grouped_contribution.get(feature_name, 0.0) + contribution
            )
            grouped_transformed[feature_name] = (
                grouped_transformed.get(feature_name, 0.0) + transformed_value
            )

        total_absolute = sum(abs(value) for value in grouped_contribution.values())
        ordered = sorted(
            grouped_contribution.items(),
            key=lambda item: abs(item[1]),
            reverse=True,
        )

        player_rows: list[dict[str, Any]] = []
        for feature_rank, (feature_name, contribution_value) in enumerate(ordered, start=1):
            raw_value: float | None = None
            if feature_name in source_row.index:
                candidate = pd.to_numeric(
                    pd.Series([source_row.get(feature_name)]),
                    errors="coerce",
                ).iloc[0]
                if not pd.isna(candidate):
                    raw_value = float(candidate)

            direction = (
                "positive"
                if contribution_value > 1e-12
                else "negative"
                if contribution_value < -1e-12
                else "neutral"
            )
            display_name = feature_display_name(feature_name)
            player_rows.append(
                {
                    "feature_name": feature_name,
                    "feature_group": feature_group(feature_name),
                    "feature_rank": feature_rank,
                    "raw_feature_value": raw_value,
                    "transformed_feature_value": float(grouped_transformed[feature_name]),
                    "contribution_value": float(contribution_value),
                    "contribution_abs": abs(float(contribution_value)),
                    "contribution_pct": (
                        abs(float(contribution_value)) / total_absolute * 100.0
                        if total_absolute > 0
                        else 0.0
                    ),
                    "contribution_direction": direction,
                    "display_name": display_name,
                    "explanation_text": contribution_explanation(
                        feature_name,
                        display_name,
                        raw_value,
                        direction,
                    ),
                    "calculation_method": "logistic_log_odds_contribution",
                }
            )
        results.append(player_rows)

    return results


def persist_player_feature_contributions(
    client: Any,
    cfg: Config,
    model_name: str,
    model: Pipeline,
    model_run_id: int | None,
    today: pd.DataFrame,
    inserted_predictions: list[dict[str, Any]],
) -> None:
    """Persist real player-level contributions for the predictions just inserted."""
    if cfg.dry_run:
        if model_name == "logistic_regression":
            preview = calculate_logistic_player_contributions(model, today)
            print(
                f"DRY RUN would persist "
                f"{sum(len(rows) for rows in preview)} player-feature contribution rows."
            )
            print(json.dumps(preview[0][:5] if preview else [], indent=2, default=str))
        else:
            print(
                f"DRY RUN skipping local contributions: selected model {model_name!r} "
                "does not have exact coefficient-based contributions."
            )
        return

    if model_run_id is None:
        raise RuntimeError("Cannot persist player contributions without model_run_id.")

    if model_name != "logistic_regression":
        print(
            f"Skipping player-level contribution persistence for {model_name}. "
            "Exact local contributions are currently implemented for logistic regression only."
        )
        return

    prediction_id_by_key: dict[tuple[str, int, int | None], int] = {}
    for inserted in inserted_predictions:
        if inserted.get("prediction_id") is None:
            continue
        prediction_id_by_key[prediction_identity_key(inserted)] = int(
            inserted["prediction_id"]
        )

    if len(prediction_id_by_key) != len(today):
        missing_keys = [
            prediction_identity_key(row)
            for _, row in today.iterrows()
            if prediction_identity_key(row) not in prediction_id_by_key
        ]
        raise RuntimeError(
            "Could not match every scored player to an inserted prediction_id. "
            f"matched={len(prediction_id_by_key)}, scored={len(today)}, "
            f"missing_sample={missing_keys[:5]}"
        )

    contribution_sets = calculate_logistic_player_contributions(model, today)
    payload: list[dict[str, Any]] = []

    for row_position, (_, source_row) in enumerate(today.iterrows()):
        identity = prediction_identity_key(source_row)
        prediction_id = prediction_id_by_key[identity]
        prediction_date, player_id, game_pk = identity

        for item in contribution_sets[row_position]:
            payload.append(
                {
                    "prediction_id": prediction_id,
                    "model_run_id": model_run_id,
                    "target_name": TARGET_NAME,
                    "prediction_run_date": prediction_date,
                    "game_pk": game_pk,
                    "player_id": player_id,
                    "feature_name": item["feature_name"],
                    "feature_group": item["feature_group"],
                    "feature_rank": item["feature_rank"],
                    "raw_feature_value": (
                        None
                        if item["raw_feature_value"] is None
                        else round(float(item["raw_feature_value"]), 10)
                    ),
                    "transformed_feature_value": round(
                        float(item["transformed_feature_value"]), 10
                    ),
                    "contribution_value": round(
                        float(item["contribution_value"]), 10
                    ),
                    "contribution_pct": round(float(item["contribution_pct"]), 6),
                    "display_name": item["display_name"],
                    "explanation_text": item["explanation_text"],
                    "calculation_method": item["calculation_method"],
                }
            )

    for start in range(0, len(payload), 500):
        client.table(PLAYER_CONTRIBUTIONS_TABLE).insert(
            payload[start : start + 500]
        ).execute()

    print(
        f"Persisted {len(payload)} player-feature contribution rows "
        f"for {len(today)} predictions and model_run_id={model_run_id}."
    )


def calculate_logistic_feature_importance(
    model: Pipeline,
    valid_df: pd.DataFrame,
) -> list[dict[str, Any]]:
    """Calculate average absolute validation-set log-odds contribution.

    Numeric variables are already standardized by the fitted pipeline. One-hot
    categorical levels are aggregated back to their original source feature.
    """
    preprocess = model.named_steps["preprocess"]
    estimator = model.named_steps["model"]

    transformed = preprocess.transform(valid_df[FEATURES])
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()
    transformed = np.asarray(transformed, dtype=float)

    coefficients = np.asarray(estimator.coef_[0], dtype=float)
    transformed_names = preprocess.get_feature_names_out()

    if transformed.shape[1] != len(coefficients) or len(coefficients) != len(transformed_names):
        raise RuntimeError(
            "Transformed feature names and logistic-regression coefficients are misaligned."
        )

    absolute_contribution = np.mean(np.abs(transformed * coefficients), axis=0)
    signed_contribution = np.mean(transformed * coefficients, axis=0)

    grouped_absolute: dict[str, float] = {}
    grouped_signed: dict[str, float] = {}

    for transformed_name, absolute_value, signed_value in zip(
        transformed_names,
        absolute_contribution,
        signed_contribution,
    ):
        feature_name = original_feature_name(str(transformed_name))
        grouped_absolute[feature_name] = (
            grouped_absolute.get(feature_name, 0.0) + float(absolute_value)
        )
        grouped_signed[feature_name] = (
            grouped_signed.get(feature_name, 0.0) + float(signed_value)
        )

    return [
        {
            "feature_name": feature_name,
            "importance_value": importance_value,
            "signed_effect": grouped_signed[feature_name],
            "signal_method": "mean_absolute_log_odds_contribution",
        }
        for feature_name, importance_value in grouped_absolute.items()
    ]


def calculate_permutation_feature_importance(
    model: Pipeline,
    valid_df: pd.DataFrame,
) -> list[dict[str, Any]]:
    """Calculate validation-set permutation importance for a non-linear model."""
    result = permutation_importance(
        model,
        valid_df[FEATURES],
        valid_df["target_hit_1plus"].to_numpy(),
        scoring="neg_brier_score",
        n_repeats=5,
        random_state=42,
        n_jobs=-1,
    )

    return [
        {
            "feature_name": feature_name,
            # Negative estimates can occur from validation noise. They are retained
            # in signed_effect but contribute zero to the relative importance share.
            "importance_value": max(float(importance_value), 0.0),
            "signed_effect": float(importance_value),
            "signal_method": "permutation_importance_neg_brier",
        }
        for feature_name, importance_value in zip(FEATURES, result.importances_mean)
    ]


def persist_feature_importance(
    client: Any,
    cfg: Config,
    model_run_id: int | None,
    model_name: str,
    model: Pipeline,
    valid_df: pd.DataFrame,
) -> None:
    """Persist feature importance from the exact fitted production candidate."""
    if model_run_id is None:
        print("DRY RUN skipping feature-importance database write.")
        return

    if valid_df.empty:
        raise RuntimeError("Cannot calculate V3 feature importance from an empty validation set.")

    if model_name == "logistic_regression":
        importance_rows = calculate_logistic_feature_importance(model, valid_df)
    else:
        importance_rows = calculate_permutation_feature_importance(model, valid_df)

    importance_rows.sort(
        key=lambda row: float(row["importance_value"]),
        reverse=True,
    )
    total_importance = sum(float(row["importance_value"]) for row in importance_rows)
    if total_importance <= 0:
        raise RuntimeError("Calculated V3 feature importance was zero for every feature.")

    payload: list[dict[str, Any]] = []
    for feature_order, row in enumerate(importance_rows, start=1):
        importance_value = float(row["importance_value"])
        payload.append(
            {
                "model_run_id": model_run_id,
                "feature_name": row["feature_name"],
                "feature_group": feature_group(row["feature_name"]),
                "feature_order": feature_order,
                "importance_value": round(importance_value, 10),
                "importance_pct": round(
                    importance_value / total_importance * 100.0,
                    6,
                ),
                "signed_effect": round(float(row["signed_effect"]), 10),
                "signal_method": row["signal_method"],
                "sample_rows": int(len(valid_df)),
            }
        )

    if cfg.dry_run:
        print("DRY RUN feature importance:")
        print(json.dumps(payload[:15], indent=2, default=str))
        return

    client.table(FEATURE_IMPORTANCE_TABLE).delete().eq(
        "model_run_id",
        model_run_id,
    ).execute()

    for start in range(0, len(payload), 500):
        client.table(FEATURE_IMPORTANCE_TABLE).insert(
            payload[start : start + 500]
        ).execute()

    print(
        f"Persisted {len(payload)} V3 feature-importance rows "
        f"for model_run_id={model_run_id}."
    )
    for row in payload[:15]:
        print(
            f"{row['feature_order']:>2}. {row['feature_name']:<45} "
            f"{row['importance_pct']:>8.4f}%  {row['signal_method']}"
        )

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
    model_name: str,
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

    inserted_predictions: list[dict[str, Any]] = []
    if cfg.dry_run:
        print(f"DRY RUN would insert {len(prediction_rows)} prediction rows.")
        print(json.dumps(prediction_rows[:3], indent=2, default=str))
    else:
        # Insert in chunks to avoid request-size limits and retain the generated
        # prediction IDs required by the player-contribution table.
        for start in range(0, len(prediction_rows), 500):
            chunk = prediction_rows[start:start + 500]
            response = client.table(PREDICTIONS_TABLE).insert(chunk).execute()
            if not response.data or len(response.data) != len(chunk):
                raise RuntimeError(
                    "Prediction insert did not return every inserted row. "
                    f"expected={len(chunk)}, returned={len(response.data or [])}"
                )
            inserted_predictions.extend(response.data)

    persist_player_feature_contributions(
        client=client,
        cfg=cfg,
        model_name=model_name,
        model=model,
        model_run_id=model_run_id,
        today=today,
        inserted_predictions=inserted_predictions,
    )

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

    persist_feature_importance(
        client=client,
        cfg=cfg,
        model_run_id=model_run_id,
        model_name=best_name,
        model=best_model,
        valid_df=valid_df,
    )

    scored = score_today(
        client, cfg, best_name, best_model, model_run_id, matchup_df, today
    )
    top = scored[["rank_overall", "batter_name", "team_name", "pitcher_name", "predicted_probability"]].head(25)
    print("Top 25 V3 hit_1plus predictions:")
    print(top.to_string(index=False))
    print(f"Completed V3 run. model_run_id={model_run_id}, artifact={artifact_path}")


if __name__ == "__main__":
    main()
