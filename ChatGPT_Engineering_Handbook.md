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
