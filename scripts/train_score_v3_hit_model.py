#!/usr/bin/env python3
"""Lineup-aware entrypoint for the MLB Hit Lab V3 hit model.

Deployment:
1. Rename the current scripts/train_score_v3_hit_model.py to
   scripts/train_score_v3_hit_model_core.py.
2. Upload this file as scripts/train_score_v3_hit_model.py.

The existing GitHub workflow does not need to change.

This entrypoint preserves the existing V3 trainer and makes batter lineup spot
an explicit, leakage-safe numeric model feature. Historical MLB batting-order
values (100/200/.../900, including variants such as 801/901) are normalized to
the true lineup slot 1-9. Current scoring rows already use 1-9.

Actual historical plate_appearances are intentionally NOT used as a feature:
they are known only after the game and would create target leakage.
"""
from __future__ import annotations

import math

import numpy as np
import pandas as pd

import train_score_v3_hit_model_core as core


LINEUP_FEATURE = "batting_order"
MIN_TRAINING_LINEUP_COVERAGE_PCT = 99.0

# Make lineup slot a first-class numeric input to every V3 candidate model.
# All downstream model registration, permutation importance, and SHAP logic use
# these global lists, so batting_order will be persisted and auditable.
if LINEUP_FEATURE not in core.NUMERIC_FEATURES:
    core.NUMERIC_FEATURES = [*core.NUMERIC_FEATURES, LINEUP_FEATURE]
if LINEUP_FEATURE not in core.FEATURES:
    core.FEATURES = [*core.FEATURES, LINEUP_FEATURE]


def normalize_lineup_slot(values: pd.Series) -> pd.Series:
    """Normalize raw MLB batting-order values to lineup positions 1-9."""
    raw = pd.to_numeric(values, errors="coerce")
    normalized = raw.astype(float).copy()

    encoded = normalized >= 100
    normalized.loc[encoded] = np.floor(normalized.loc[encoded] / 100.0)

    # Invalid/non-lineup values remain missing so the model cannot silently use
    # malformed order data.
    return normalized.where(normalized.between(1, 9))


def normalize_and_validate_lineup(
    frame: pd.DataFrame,
    context: str,
    *,
    require_full_coverage: bool,
) -> pd.DataFrame:
    if LINEUP_FEATURE not in frame.columns:
        raise ValueError(f"{context} data is missing required {LINEUP_FEATURE}.")

    clean = frame.copy()
    clean[LINEUP_FEATURE] = normalize_lineup_slot(clean[LINEUP_FEATURE])

    total = int(len(clean))
    valid = int(clean[LINEUP_FEATURE].notna().sum())
    missing = total - valid
    coverage_pct = 0.0 if total == 0 else 100.0 * valid / total

    print(
        f"{context} lineup coverage: valid={valid}/{total} "
        f"({coverage_pct:.2f}%), missing={missing}"
    )

    if require_full_coverage and missing:
        sample_cols = [
            col
            for col in [
                "prediction_run_date",
                "game_pk",
                "player_id",
                "batter_name",
            ]
            if col in clean.columns
        ]
        sample = (
            clean.loc[clean[LINEUP_FEATURE].isna(), sample_cols]
            .head(20)
            .to_dict("records")
        )
        raise ValueError(
            f"{context} lineup data is incomplete. missing_rows={missing}; "
            f"sample={sample}"
        )

    if (
        not require_full_coverage
        and coverage_pct < MIN_TRAINING_LINEUP_COVERAGE_PCT
    ):
        raise ValueError(
            f"{context} batting-order coverage is only {coverage_pct:.2f}%; "
            f"expected at least {MIN_TRAINING_LINEUP_COVERAGE_PCT:.1f}% "
            "for reliable V3 training."
        )

    return clean


# Normalize lineup after the existing matchup merge. This hits both historical
# training rows and today's scoring rows without altering any existing feature
# construction logic.
_original_attach_matchup_features = core.attach_matchup_features


def attach_matchup_features_with_lineup(
    base_df: pd.DataFrame,
    matchup_df: pd.DataFrame,
    context: str,
    require_full_coverage: bool,
) -> pd.DataFrame:
    merged = _original_attach_matchup_features(
        base_df,
        matchup_df,
        context,
        require_full_coverage,
    )
    return normalize_and_validate_lineup(
        merged,
        context,
        require_full_coverage=(context.lower() == "today"),
    )


core.attach_matchup_features = attach_matchup_features_with_lineup


# Give lineup its own reporting group so feature-importance and contribution
# reporting are immediately recognizable.
_original_feature_group = core.feature_group


def feature_group_with_lineup(feature_name: str) -> str:
    if feature_name == LINEUP_FEATURE:
        return "lineup_opportunity"
    return _original_feature_group(feature_name)


core.feature_group = feature_group_with_lineup


_original_feature_display_name = core.feature_display_name


def feature_display_name_with_lineup(feature_name: str) -> str:
    if feature_name == LINEUP_FEATURE:
        return "Lineup Spot"
    return _original_feature_display_name(feature_name)


core.feature_display_name = feature_display_name_with_lineup


# Make the player-level SHAP explanation explicit and readable.
_original_contribution_explanation = core.contribution_explanation


def contribution_explanation_with_lineup(
    feature_name: str,
    display_name: str,
    raw_value: float | None,
    direction: str,
) -> str:
    if (
        feature_name == LINEUP_FEATURE
        and raw_value is not None
        and math.isfinite(raw_value)
    ):
        spot = int(round(raw_value))
        if direction == "positive":
            effect = "raises"
        elif direction == "negative":
            effect = "lowers"
        else:
            effect = "has a neutral effect on"

        return (
            f"Batting {spot} in the order {effect} this player's modeled "
            "one-hit probability based on the learned relationship between "
            "lineup position and hit opportunity."
        )

    return _original_contribution_explanation(
        feature_name,
        display_name,
        raw_value,
        direction,
    )


core.contribution_explanation = contribution_explanation_with_lineup


if __name__ == "__main__":
    core.main()
