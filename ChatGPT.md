# ChatGPT Documentation v3.0

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

# Version 1.1 --- V3 Machine Learning Platform (July 2026)

## V3 Philosophy

V3 is now the primary production prediction engine. V1 (Classic Score)
and V2 remain for comparison, backtesting and experimentation only. The
UI defaults to V3 while allowing temporary comparison to Classic Score.

Design principles:

-   Predict probabilities, not arbitrary scores.
-   Every prediction must be explainable.
-   Every model is backtested before promotion.
-   All prediction runs are immutable snapshots.
-   Architecture must support future targets (Home Runs, Total Bases,
    RBI, etc.).

## V3 Model

Current prediction target:

-   Hit 1+ (at least one hit)

Current output:

-   Predicted probability
-   Confidence bucket
-   Explanation factors
-   Feature payload
-   Model version
-   Prediction run id

Feature payload currently includes:

-   Recent hit rate
-   Recent batting average
-   Batter handedness split
-   Pitcher BAA vs batter side
-   Pitcher WHIP
-   Pitcher ERA
-   Expected plate appearances
-   Lineup position
-   Game time
-   Venue

## Production UI

The MLB Hit Board now defaults to ML Prediction.

Classic Score remains as a comparison toggle only.

Top summary cards from the original V3 prototype were intentionally
removed to reduce visual noise.

The Player Drawer was redesigned to include:

-   Probability
-   Confidence
-   Matchup
-   Expected plate appearances
-   Key Signals
-   Model explanation
-   Game information

## Market Edge

A new analytics page called "Market Edge" was introduced.

Purpose:

Compare V3 model probability against sportsbook implied probability for
Over 0.5 Hits.

Primary metric:

Edge = Model Probability − Market Implied Probability

Navigation:

-   MLB Hit Board
-   Reds Hit Board
-   Market Edge
-   Model Performance

Market Edge drawer includes:

-   Model probability
-   Market implied probability
-   Edge %
-   Best available odds
-   Sportsbook
-   Odds freshness
-   Matchup
-   Key signals
-   Expected plate appearances

## Sportsbook Integration

Current sportsbook provider:

-   The Odds API

Current market:

-   batter_hits (Over 0.5 Hits)

Books currently ingested:

-   DraftKings
-   Bet365 (when available)

Loader behavior:

-   Skip games already started
-   Pull today's MLB games only
-   Upsert safely using load_key
-   Preserve historical snapshots
-   Log API usage and remaining credits

GitHub schedule:

-   8:00 AM EDT
-   12:00 PM EDT

## New Database Objects

Tables:

-   mlb_player_hit_prop_market_odds
-   mlb_player_name_aliases

Views:

-   v_mlb_player_hit_prop_market_odds_resolved
-   v_mlb_player_hit_prop_market_odds_unmatched
-   v_mlb_best_available_hit_over05_market
-   v_mlb_hit_over05_market_edges
-   v_mlb_hit_over05_market_edges_qualified
-   v_mlb_hit_over05_market_edge_health

Important implementation note:

The Market Edge view now carries the full V3 features JSON so the drawer
can render key signals, lineup position and expected plate appearances.

## Current Automation

Daily automation configured:

9:00 AM Eastern

Produces:

-   V1 vs V2 vs V3 comparison
-   Top 1 / Top 5 / Top 10 / Top 20 hit rates
-   Yesterday's V3 Top 10 with actual hit results
-   Data freshness validation

## Next Roadmap

Priority items:

1.  Line movement tracking.
2.  Market movers widget.
3.  Best Available Odds visualization.
4.  Home Run prediction model.
5.  Total Bases prediction model.
6.  Unified model registry.
7.  Automatic retraining pipeline.

# MLB Hit Lab Engineering Handbook

Version 2.0

## 1. Project Overview

MLB Hit Lab is an analytics platform that predicts MLB hitter outcomes
using multiple generations of models. Primary production model: **V3
Machine Learning**.

## 2. Architecture

-   GitHub Actions orchestrate daily pipelines.
-   Python loaders ingest MLB data, features, predictions, actuals, and
    betting markets.
-   Supabase stores raw, modeled, and presentation data.
-   GitHub Pages hosts the frontend.

Pipeline: 1. MLB data ingestion 2. Feature engineering 3. V3 prediction
generation 4. Prediction storage 5. Actuals loader 6. Model evaluation
7. Market odds ingestion 8. Market Edge calculation

## 3. Models

### V1 Classic

Rule-based weighted matchup score.

### V2

Probability calibration layered on V1.

### V3 Machine Learning

Target: - Probability player records at least one hit.

Current feature families: - Recent form - Batter handedness splits -
Pitcher vulnerability - Pitcher recent form - Expected plate
appearances - Lineup position - Game context

Future targets: - Home Runs - Total Bases - RBI - Runs - Strikeouts

## 4. Database

Core objects include: - v_mlb_ml_hit_probability_v3_daily -
v_mlb_hit_over05_market_edges -
v_mlb_hit_over05_market_edges_qualified -
v_mlb_best_available_hit_over05_market -
mlb_player_hit_prop_market_odds - mlb_player_name_aliases

## 5. Odds Integration

Provider: - The Odds API

Markets: - batter_hits

Books: - DraftKings - Bet365

Workflow: - 8:00 AM EDT - 12:00 PM EDT

Loader behavior: - Skip started games - Idempotent upserts using
load_key - Log API request usage

## 6. UI

Pages: - MLB Hit Board - Reds Hit Board - Market Edge - Model
Performance

Player Drawer: - Hit probability - Market probability - Edge - Best
odds - Confidence - Expected plate appearances - Key signals -
Explanation

## 7. UX Principles

-   One primary metric per page.
-   Uniform row heights.
-   Drawer contains detailed analysis.
-   Transparent model explanations.
-   Fast scan, deep drill-down.

## 8. Automations

Daily 9:00 AM ET: - Compare V1/V2/V3 - Top 1/5/10/20 performance -
Yesterday's V3 Top 10 results

## 9. Roadmap

Near term: - Market Movers - Best Bets enhancements - Line movement
history - Retraining pipeline

Future: - HR model - Total Bases model - Multi-sport architecture - AI
Insights page

## 10. Engineering Standards

-   All database changes via migrations.
-   Views back UI.
-   Preserve backward compatibility.
-   Document schema changes.
-   Validate production after every deployment.

## 11. Release Notes

### Version 2.0

-   V3 production ML model.
-   Market Edge feature.
-   Odds ingestion.
-   DraftKings + Bet365 support.
-   Expected PA enrichment.
-   Daily comparison automation.

# Version 3.0 Addendum --- V3 Workflow Reliability (2026-07-06)

> This section documents the production workflow fixes implemented after
> discovering stale V3 feature inputs. It supplements the existing
> documentation and only supersedes older guidance where explicitly
> noted.

## Critical Pipeline Order (Do Not Change)

1.  Load All MLB Phase 1 Data
2.  Execute `snapshot_mlb_hit_board_predictions_v2()`
3.  Validate `v_mlb_ml_today_features_v3` contains today's
    `prediction_run_date`
4.  Run V3 Hit Model
5.  Load Hit Prop Market Odds
6.  Load V3 Hit Actuals (following morning after game logs refresh)

### Data Lineage

MLB data refresh → `mlb_daily_team_matchups` →
`get_today_mlb_batter_matchups()` → `v_today_mlb_batter_matchups_v2` →
`snapshot_mlb_hit_board_predictions_v2()` →
`mlb_hit_board_predictions_v2` → `v_mlb_ml_today_features_v3` →
`Run V3 Hit Model` → `mlb_ml_predictions_v3` →
`v_mlb_ml_hit_probability_v3_daily`

## Root Cause Fixed

The V3 workflow was scoring stale features because
`v_mlb_ml_today_features_v3` depends on the persisted V2 snapshot
(`mlb_hit_board_predictions_v2`), not the live matchup view. The Phase 1
workflow refreshed live matchup data but did not execute
`snapshot_mlb_hit_board_predictions_v2()`. This caused V3 to generate
duplicate predictions for the previous day.

## Workflow Changes

### Load All MLB Phase 1 Data

-   Added automatic execution of
    `snapshot_mlb_hit_board_predictions_v2()`.
-   Added validation that `v_mlb_ml_today_features_v3` contains the
    expected prediction date.
-   Fail immediately if today's feature rows are missing.

### Run V3 Hit Model

-   Validate feature date before training/scoring.
-   Refuse to score stale features.
-   Validate prediction rows were written for the requested date.

### Load V3 Hit Actuals

-   Added preflight validation.
-   Confirm V3 predictions exist.
-   Confirm batting logs are available.
-   Validate evaluation coverage before completing.

## Operational Runbook

If the ML Prediction page shows yesterday's games:

1.  Verify Phase 1 completed.
2.  Verify `snapshot_mlb_hit_board_predictions_v2()` executed.
3.  Verify `v_mlb_ml_today_features_v3` contains today's date.
4.  Run V3 Hit Model.
5.  Verify `v_mlb_ml_hit_probability_v3_daily` now contains today's
    predictions.

Never rerun V3 until Step 3 succeeds.

## Production Standards

Every production workflow should:

-   Validate inputs exist.
-   Validate expected business date.
-   Validate output row count.
-   Fail fast on stale data.
-   Preserve audit history.
-   Avoid duplicate prediction writes.

## Database Cleanup Standard

If a stale model run occurs:

-   Mark the model run as `failed`.
-   Preserve audit notes.
-   Remove only duplicate prediction rows.
-   Keep valid model runs unchanged.

## Daily Automation

Daily report now includes:

-   Weighted Daily Champion
-   Model standings (Last 7, Last 30, Season)
-   Top 1 / 5 / 10 / 20 / 25 comparison
-   Market Edge top play result
-   V3 Top 25 evaluation
-   Calibration summary
-   AI observations
