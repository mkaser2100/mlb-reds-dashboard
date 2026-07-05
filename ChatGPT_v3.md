# ChatGPT.md

## MLB Hit Lab

This document provides project context for future ChatGPT sessions.

### Current Status

-   V1 production scoring model.
-   V2 production candidate with estimated hit probability and V2 Pick
    Score.
-   Historical prediction snapshots stored.
-   Actual game outcomes linked back to predictions.
-   Daily model evaluation dashboards implemented.
-   GitHub Actions perform scheduled refreshes.
-   Supabase stores model history and evaluation views.

## Phase 1 Completed

-   Historical prediction storage
-   Actual outcome tracking
-   V1 vs V2 evaluation views
-   Calibration dashboard
-   Daily performance metrics
-   Live V2 monitoring

Key views: - `v_mlb_model_phase1_v1_v2_metrics` -
`v_mlb_model_phase1_v1_v2_daily` -
`v_mlb_model_phase1_v1_v2_calibration`

------------------------------------------------------------------------

# Future Enhancements

## V3 Machine Learning Model

### Vision

Transition from manually weighted scoring (V1/V2) to a supervised
machine learning model that predicts the probability of a hitter
recording at least one hit.

### Candidate Features

-   Batter recent form (3/5/6/10/15 game windows)
-   Batter handedness splits
-   Home/Away and Day/Night splits
-   Pitcher season metrics
-   Pitcher handedness splits
-   Reliability/sample-size metrics
-   Future: Statcast, weather, park factor, lineup position, bullpen
    strength

### Initial Algorithm

Begin with Logistic Regression for interpretability and calibration.
Evaluate later against: - XGBoost - LightGBM - Random Forest

### Training Data

Each completed prediction snapshot becomes one labeled training example
containing: - V1 score - V2 score - Estimated hit probability - Batter
features - Pitcher features - Actual hit outcome

### Evaluation

Compare V1, V2 and V3 using: - ROC AUC - Brier Score - Log Loss -
Calibration - Top Pick hit rate - Top 5/10/20 hit rates - Daily win rate

### Continuous Learning

1.  Generate predictions.
2.  Store snapshot.
3.  Load actual game results.
4.  Add to historical dataset.
5.  Retrain weekly or monthly.
6.  Compare V3 vs V1/V2 before promotion.

### Long-Term Vision

Create a continuously learning MLB prediction platform where every
enhancement is validated through historical backtesting before
deployment.
