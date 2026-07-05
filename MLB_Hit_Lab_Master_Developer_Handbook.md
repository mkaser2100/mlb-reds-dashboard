# MLB Hit Lab --- Master Developer Handbook

Version 1.0

> Purpose: This is the canonical engineering handbook for MLB Hit Lab.
> Upload this single document into a new ChatGPT conversation to provide
> architectural, operational, database, model, and roadmap context.

# Executive Summary

MLB Hit Lab is a baseball analytics platform that predicts whether
hitters will record at least one hit in today's game. It combines
scheduled ETL pipelines, Supabase, statistical models, historical
snapshotting, backtesting, and web dashboards.

# Product Goals

-   Produce transparent, explainable hit predictions.
-   Continuously improve through measured experimentation.
-   Never promote a model without historical evidence.
-   Preserve reproducibility through prediction snapshots.

# System Architecture

MLB Stats API → GitHub Actions → Python ETL → Supabase PostgreSQL →
Views / RPCs → REST API → HTML / JavaScript dashboards

# Repository Overview

Core assets include:

-   .github/workflows --- scheduled automation
-   scripts/ --- Python ETL jobs
-   index.html --- application shell
-   app.js / app-v4.js --- UI logic
-   styles.css
-   ChatGPT.md (this document)

Every ETL job is designed to be idempotent and safe to rerun.

# Scheduled Workflows

Typical execution order:

1.  Reds batting loader
2.  Reds splits loader
3.  Matchup loader
4.  Batter vs Pitcher loader
5.  Prediction snapshot loader
6.  Actual outcome updater

Principles: - Upserts only - Extensive logging - Independent reruns -
UTC scheduling with ET conversion awareness

# Database Overview

Representative tables:

-   mlb_players
-   mlb_pitchers
-   mlb_player_batting_game_logs
-   mlb_player_batting_splits
-   mlb_pitcher_game_logs
-   mlb_pitcher_splits
-   mlb_pitcher_season_stats
-   mlb_daily_matchups
-   mlb_batter_vs_pitcher
-   mlb_matchup_predictions

Representative views:

-   v_mlb_hit_board\*
-   v_mlb_model_phase1_v1_v2_metrics
-   v_mlb_model_phase1_v1_v2_daily
-   v_mlb_model_phase1_v1_v2_calibration

Snapshots preserve every prediction so models can be evaluated after
games complete.

# Backend Responsibilities

Scripts generally: - Pull MLB API data - Normalize records - Upsert into
Supabase - Log counts and versions - Avoid duplicate records - Preserve
historical snapshots

Known design decisions: - Ignore pitchers with zero current-season
starts. - Prediction snapshots occur before first pitch. - Actuals
attach after games end. - Duplicate records are prevented through
upserts and keys.

# Frontend

Dashboards: - MLB Hit Board - Reds Hit Board

Displays include: - Matchup Score (V1) - V2 Pick Score - Estimated Hit
Probability - Batter Recent Form - Batter Splits - Pitcher
Vulnerability - Pitcher Recent Form - Batter vs Pitcher history

# Model History

## V1

Rules-based weighted scoring using: - Batter recent form - Batter
splits - Pitcher vulnerability - Pitcher recent form

Strengths: - Explainable - Stable - Easy to debug

## V2

Enhancements: - Reliability adjustments - Confidence weighting -
Estimated hit probability - V2 Pick Score

Historical infrastructure: - Snapshot storage - Actual result linkage -
Daily monitoring - Calibration reporting

# Expanded V3 Machine Learning Blueprint

## Objective

Predict P(hit ≥ 1 AB today) using supervised machine learning while
maintaining explainability and outperforming V1/V2 on historical
backtests.

## Training Data

One row per prediction snapshot after actuals load.

Target: - target_hit = 1 if hitter records a hit - else 0

## Feature Engineering

### Batter

-   Hot Score
-   Last 3/5/6/10/15 game metrics
-   AVG, OBP, SLG, OPS
-   Hits per game
-   Strikeout %
-   Walk %
-   Rolling trend
-   Hit streak

### Batter Splits

-   vs LHP
-   vs RHP
-   Home
-   Away
-   Day
-   Night

### Pitcher

-   ERA
-   WHIP
-   BAA
-   Recent starts
-   Split performance
-   Reliability

### Matchup

-   Batter vs Pitcher history
-   Handedness
-   Future:
    -   Park factors
    -   Weather
    -   Vegas implied runs
    -   Bullpen strength
    -   Lineup slot
    -   Statcast metrics

### Reliability

-   Batter sample size
-   Pitcher sample size
-   Split sample size
-   Confidence score

## Data Preparation

-   Remove duplicates
-   Ignore pitchers without season starts
-   Deterministic missing-value handling
-   Standardize linear-model inputs
-   Preserve raw features for tree models
-   Time-based train/test split only

## Candidate Models

1.  Logistic Regression (baseline)
2.  Gradient Boosting
3.  XGBoost
4.  LightGBM
5.  Random Forest

## Evaluation Metrics

-   ROC AUC
-   Brier Score
-   Log Loss
-   Calibration Error
-   Score Correlation
-   Top Pick Hit Rate
-   Top 5 / 10 / 20 Hit Rates
-   Rolling 30-day performance

## Promotion Rules

Only replace production when V3 demonstrates: - Higher ROC AUC - Lower
Brier Score - Lower Log Loss - Better calibration - Equal or better
Top-10 hit rate - Sustained improvement over multiple weeks

## Retraining

Initial cadence: - Weekly

Future: - Automated monthly retraining

Persist: - Model version - Training date - Feature list -
Hyperparameters - Performance summary

## Explainability

Each prediction should expose: - Probability - Confidence - Largest
positive contributors - Largest negative contributors

# Operational Standards

-   Every change requires measurable benefit.
-   Preserve backward compatibility where practical.
-   Use SQL views instead of duplicating logic.
-   Keep ETL modular.
-   Update this handbook when architecture changes.

# Known Technical Debt

-   Expand schema documentation.
-   Add ER diagram.
-   Add workflow dependency diagram.
-   Add API endpoint inventory.
-   Add automated integration tests.

# Roadmap

Phase 2 - Rich evaluation dashboard - Reliability visuals - Calibration
charts

Phase 3 - V3 ML model - Model registry - Feature importance - Automated
retraining

Phase 4 - Statcast - Weather - Park factors - Mobile support - Public
API

# Conversation Memory

Important historical decisions: - V1 remains production baseline until
surpassed. - V2 runs alongside V1. - Snapshot-first architecture is
foundational. - Historical backtesting is mandatory before promotion. -
Reliability is preferred over aggressive optimization.

This handbook is intended to evolve as the definitive technical
reference for MLB Hit Lab.
