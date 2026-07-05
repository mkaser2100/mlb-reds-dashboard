# ChatGPT Developer Handbook (Expanded)

> This document is intended to be uploaded into future ChatGPT
> conversations so the assistant has sufficient context to continue
> development of MLB Hit Lab.

# Existing Architecture

(Keep all existing sections from the previous handbook.)

------------------------------------------------------------------------

# Expanded V3 Machine Learning Blueprint

## Goal

Build a supervised machine learning model that predicts the probability
that a hitter records **at least one hit** in today's game. V3 should
outperform V1 and V2 using objective historical testing while remaining
explainable.

## Training Dataset

Each prediction snapshot becomes one labeled observation after actuals
are loaded.

### Label

-   target_hit = 1 if hitter records at least one hit
-   target_hit = 0 otherwise

### Core Features

#### Batter Form

-   Hot Score
-   Last 3 / 5 / 6 / 10 / 15 game averages
-   Hits, AVG, OBP, SLG, OPS
-   Strikeout rate
-   Walk rate
-   Rolling trend (improving / declining)

#### Batter Splits

-   vs RHP
-   vs LHP
-   Home / Away
-   Day / Night

#### Pitcher

-   ERA
-   WHIP
-   BAA
-   Hits allowed / game
-   Recent 5 start form
-   Split performance vs LHB / RHB
-   Reliability score

#### Matchup

-   Handedness matchup
-   Batter vs Pitcher history
-   Team implied strength (future)
-   Park factor (future)
-   Weather (future)

#### Reliability

-   Plate appearance sample size
-   Pitcher innings sample size
-   Split sample sizes
-   Confidence weighting

## Data Preparation

-   Remove duplicate snapshots.
-   Ignore pitchers with zero current-season starts.
-   Winsorize extreme outliers where appropriate.
-   Standardize numeric features for linear models.
-   Preserve raw values for tree-based models.
-   Impute missing values with deterministic rules.

## Candidate Algorithms

Baseline: 1. Logistic Regression

Compare against: 2. Gradient Boosting 3. XGBoost 4. LightGBM 5. Random
Forest

Only promote a more complex model if it materially improves production
metrics.

## Validation Strategy

Use chronological (time-based) validation.

Training: - Earlier games

Validation: - Later games

Never randomly shuffle future games into training.

## Metrics

Primary: - ROC AUC - Brier Score - Log Loss

Operational: - Top Pick Hit Rate - Top 5 Hit Rate - Top 10 Hit Rate -
Top 20 Hit Rate - Calibration Error - Daily Win Rate

## Promotion Rules

V3 should only replace V2 if: - Better ROC AUC - Lower Brier Score -
Lower Log Loss - Better calibration - Equal or better Top 10 hit rate -
Stable performance over multiple weeks

## Retraining

Initial cadence: - Weekly

Future: - Automatic monthly retraining after sufficient new
observations.

Store: - Model version - Training date - Feature list -
Hyperparameters - Performance metrics

## Explainability

For every prediction expose: - Probability - Top contributing positive
features - Top contributing negative features - Confidence level

## V3 Dashboard

Create a dedicated dashboard including: - V1 vs V2 vs V3 comparison -
Rolling 30-day metrics - Calibration chart - Feature importance -
Confusion matrix - Lift chart - Daily leaderboard

## Future V4 Ideas

-   Statcast integration
-   Exit velocity
-   Barrel rate
-   Hard-hit %
-   Expected batting average (xBA)
-   Weather
-   Park factors
-   Bullpen quality
-   Lineup position
-   Betting market comparison

## Development Philosophy

Every enhancement must: 1. Be measurable. 2. Be backtested. 3. Be
compared against prior versions. 4. Preserve historical reproducibility.
5. Never replace a production model based on intuition alone.
