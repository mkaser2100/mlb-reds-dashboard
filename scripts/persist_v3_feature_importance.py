#!/usr/bin/env python3
"""Persist feature importance for the currently active MLB Hit Lab V3 model run.

The script reconstructs the active run from its registry metadata and the point-in-time
training snapshot. Logistic regression uses average absolute validation-set log-odds
contribution, aggregated back to the original feature. Other supported estimators use
validation-set permutation importance with negative Brier score.
"""

from __future__ import annotations

import os
from collections import defaultdict
from typing import Any

import numpy as np
import pandas as pd
from sklearn.inspection import permutation_importance
from supabase import create_client

import train_score_v3_hit_model as v3

IMPORTANCE_TABLE = "mlb_ml_model_feature_importance"
TARGET_NAME = "hit_1plus"


def active_model_run(client: Any) -> dict[str, Any]:
    prediction = (
        client.table(v3.PREDICTIONS_TABLE)
        .select("model_run_id,prediction_run_date")
        .eq("target_name", TARGET_NAME)
        .eq("is_active", True)
        .not_.is_("model_run_id", "null")
        .order("prediction_run_date", desc=True)
        .order("model_run_id", desc=True)
        .limit(1)
        .execute()
    )
    if not prediction.data:
        raise RuntimeError("No active V3 prediction run was found.")

    model_run_id = int(prediction.data[0]["model_run_id"])
    run = (
        client.table(v3.MODEL_RUNS_TABLE)
        .select(
            "model_run_id,model_name,model_version,training_start_date,training_end_date,"
            "validation_start_date,validation_end_date,feature_list,hyperparameters"
        )
        .eq("model_run_id", model_run_id)
        .single()
        .execute()
    )
    if not run.data:
        raise RuntimeError(f"Model registry row not found for model_run_id={model_run_id}.")
    return run.data


def feature_group(feature_name: str) -> str:
    if feature_name in v3.CATEGORICAL_FEATURES:
        return "categorical"
    if feature_name in v3.MATCHUP_AVAILABILITY_FEATURES:
        return "availability"
    if feature_name.startswith("arsenal_") or feature_name in {
        "batter_pitch_sample",
        "pitcher_pitch_sample",
    }:
        return "pitch_arsenal"
    if feature_name in v3.MATCHUP_NUMERIC_FEATURES:
        return "statcast_contact"
    if "split" in feature_name:
        return "splits"
    if "pitcher" in feature_name:
        return "pitcher_form"
    if "recent" in feature_name or "hot_score" in feature_name:
        return "recent_form"
    return "traditional"


def original_feature_name(transformed_name: str) -> str:
    name = transformed_name.split("__", 1)[-1]
    for categorical in v3.CATEGORICAL_FEATURES:
        if name == categorical or name.startswith(f"{categorical}_"):
            return categorical
    return name


def logistic_contributions(model: Any, valid_df: pd.DataFrame) -> list[dict[str, Any]]:
    preprocess = model.named_steps["preprocess"]
    estimator = model.named_steps["model"]
    transformed = preprocess.transform(valid_df[v3.FEATURES])
    if hasattr(transformed, "toarray"):
        transformed = transformed.toarray()
    transformed = np.asarray(transformed, dtype=float)

    coefficients = np.asarray(estimator.coef_[0], dtype=float)
    transformed_names = preprocess.get_feature_names_out()
    if transformed.shape[1] != len(coefficients) or len(coefficients) != len(transformed_names):
        raise RuntimeError("Transformed feature names and logistic coefficients are misaligned.")

    absolute = np.mean(np.abs(transformed * coefficients), axis=0)
    signed = np.mean(transformed * coefficients, axis=0)
    grouped_abs: dict[str, float] = defaultdict(float)
    grouped_signed: dict[str, float] = defaultdict(float)

    for name, abs_value, signed_value in zip(transformed_names, absolute, signed):
        original = original_feature_name(str(name))
        grouped_abs[original] += float(abs_value)
        grouped_signed[original] += float(signed_value)

    return [
        {
            "feature_name": feature,
            "importance_value": value,
            "signed_effect": grouped_signed[feature],
            "signal_method": "mean_absolute_log_odds_contribution",
        }
        for feature, value in grouped_abs.items()
    ]


def permutation_contributions(model: Any, valid_df: pd.DataFrame) -> list[dict[str, Any]]:
    result = permutation_importance(
        model,
        valid_df[v3.FEATURES],
        valid_df["target_hit_1plus"].to_numpy(),
        scoring="neg_brier_score",
        n_repeats=5,
        random_state=42,
        n_jobs=-1,
    )
    return [
        {
            "feature_name": feature,
            "importance_value": max(float(value), 0.0),
            "signed_effect": float(value),
            "signal_method": "permutation_importance_neg_brier",
        }
        for feature, value in zip(v3.FEATURES, result.importances_mean)
    ]


def build_training_data(client: Any, run: dict[str, Any]) -> tuple[pd.DataFrame, pd.DataFrame]:
    matchup = v3.fetch_matchup_features(client)
    raw = v3.fetch_all_rows(client, v3.TRAINING_VIEW)
    raw = v3.attach_matchup_features(raw, matchup, "Feature importance", require_full_coverage=False)
    data = v3.coerce_training_data(raw)

    train_start = pd.to_datetime(run["training_start_date"]).date()
    train_end = pd.to_datetime(run["training_end_date"]).date()
    valid_start = pd.to_datetime(run["validation_start_date"]).date()
    valid_end = pd.to_datetime(run["validation_end_date"]).date()

    train_df = data[
        (data["prediction_run_date"] >= train_start)
        & (data["prediction_run_date"] <= train_end)
    ].copy()
    valid_df = data[
        (data["prediction_run_date"] >= valid_start)
        & (data["prediction_run_date"] <= valid_end)
    ].copy()
    if train_df.empty or valid_df.empty:
        raise RuntimeError(
            f"Could not reconstruct train/validation data for model_run_id={run['model_run_id']}."
        )
    return train_df, valid_df


def main() -> None:
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")

    client = create_client(url, key)
    run = active_model_run(client)
    model_run_id = int(run["model_run_id"])
    model_name = str(run["model_name"])
    print(
        f"Reconstructing feature importance for model_run_id={model_run_id}, "
        f"model={model_name}, version={run['model_version']}."
    )

    expected_features = list(run.get("feature_list") or [])
    if expected_features and expected_features != v3.FEATURES:
        raise RuntimeError(
            "Active model feature list differs from the current training script. "
            "Importance was not overwritten."
        )

    train_df, valid_df = build_training_data(client, run)
    models = v3.make_models()
    if model_name not in models:
        raise RuntimeError(f"Unsupported active V3 model type: {model_name}.")

    model = models[model_name]
    model.fit(train_df[v3.FEATURES], train_df["target_hit_1plus"].to_numpy())

    if model_name == "logistic_regression":
        rows = logistic_contributions(model, valid_df)
    else:
        rows = permutation_contributions(model, valid_df)

    rows.sort(key=lambda row: row["importance_value"], reverse=True)
    total = sum(float(row["importance_value"]) for row in rows)
    if total <= 0:
        raise RuntimeError("Calculated feature importance was zero for every V3 feature.")

    payload = []
    for order, row in enumerate(rows, start=1):
        payload.append(
            {
                "model_run_id": model_run_id,
                "feature_name": row["feature_name"],
                "feature_group": feature_group(row["feature_name"]),
                "feature_order": order,
                "importance_value": round(float(row["importance_value"]), 10),
                "importance_pct": round(float(row["importance_value"]) / total * 100.0, 6),
                "signed_effect": round(float(row["signed_effect"]), 10),
                "signal_method": row["signal_method"],
                "sample_rows": int(len(valid_df)),
            }
        )

    client.table(IMPORTANCE_TABLE).delete().eq("model_run_id", model_run_id).execute()
    for start in range(0, len(payload), 500):
        client.table(IMPORTANCE_TABLE).insert(payload[start : start + 500]).execute()

    print(f"Persisted {len(payload)} V3 feature importance rows for model_run_id={model_run_id}.")
    for row in payload[:15]:
        print(
            f"{row['feature_order']:>2}. {row['feature_name']:<45} "
            f"{row['importance_pct']:>8.4f}%  {row['signal_method']}"
        )


if __name__ == "__main__":
    main()
