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


# Version 1.1 — V3 Machine Learning Platform (July 2026)

## V3 Philosophy

V3 is now the primary production prediction engine. V1 (Classic Score) and V2 remain for comparison, backtesting and experimentation only. The UI defaults to V3 while allowing temporary comparison to Classic Score.

Design principles:

- Predict probabilities, not arbitrary scores.
- Every prediction must be explainable.
- Every model is backtested before promotion.
- All prediction runs are immutable snapshots.
- Architecture must support future targets (Home Runs, Total Bases, RBI, etc.).

## V3 Model

Current prediction target:

- Hit 1+ (at least one hit)

Current output:

- Predicted probability
- Confidence bucket
- Explanation factors
- Feature payload
- Model version
- Prediction run id

Feature payload currently includes:

- Recent hit rate
- Recent batting average
- Batter handedness split
- Pitcher BAA vs batter side
- Pitcher WHIP
- Pitcher ERA
- Expected plate appearances
- Lineup position
- Game time
- Venue

## Production UI

The MLB Hit Board now defaults to ML Prediction.

Classic Score remains as a comparison toggle only.

Top summary cards from the original V3 prototype were intentionally removed to reduce visual noise.

The Player Drawer was redesigned to include:

- Probability
- Confidence
- Matchup
- Expected plate appearances
- Key Signals
- Model explanation
- Game information

## Market Edge

A new analytics page called "Market Edge" was introduced.

Purpose:

Compare V3 model probability against sportsbook implied probability for Over 0.5 Hits.

Primary metric:

Edge = Model Probability − Market Implied Probability

Navigation:

- MLB Hit Board
- Reds Hit Board
- Market Edge
- Model Performance

Market Edge drawer includes:

- Model probability
- Market implied probability
- Edge %
- Best available odds
- Sportsbook
- Odds freshness
- Matchup
- Key signals
- Expected plate appearances

## Sportsbook Integration

Current sportsbook provider:

- The Odds API

Current market:

- batter_hits (Over 0.5 Hits)

Books currently ingested:

- DraftKings
- Bet365 (when available)

Loader behavior:

- Skip games already started
- Pull today's MLB games only
- Upsert safely using load_key
- Preserve historical snapshots
- Log API usage and remaining credits

GitHub schedule:

- 8:00 AM EDT
- 12:00 PM EDT

## New Database Objects

Tables:

- mlb_player_hit_prop_market_odds
- mlb_player_name_aliases

Views:

- v_mlb_player_hit_prop_market_odds_resolved
- v_mlb_player_hit_prop_market_odds_unmatched
- v_mlb_best_available_hit_over05_market
- v_mlb_hit_over05_market_edges
- v_mlb_hit_over05_market_edges_qualified
- v_mlb_hit_over05_market_edge_health

Important implementation note:

The Market Edge view now carries the full V3 features JSON so the drawer can render key signals, lineup position and expected plate appearances.

## Current Automation

Daily automation configured:

9:00 AM Eastern

Produces:

- V1 vs V2 vs V3 comparison
- Top 1 / Top 5 / Top 10 / Top 20 hit rates
- Yesterday's V3 Top 10 with actual hit results
- Data freshness validation

## Next Roadmap

Priority items:

1. Line movement tracking.
2. Market movers widget.
3. Best Available Odds visualization.
4. Home Run prediction model.
5. Total Bases prediction model.
6. Unified model registry.
7. Automatic retraining pipeline.
