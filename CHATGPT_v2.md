# CHATGPT.md (Version 2)

# MLB Hit Board Engineering Handbook

## Mission

Build and maintain a reliable MLB analytics application that identifies
hitters with a high probability of recording at least one hit each day.
Prioritize correctness, repeatability, and operational stability over
rapid feature additions.

------------------------------------------------------------------------

# Architecture

    GitHub Actions
        │
        ▼
    Python ETL Scripts
        │
        ▼
    MLB Stats API
        │
        ▼
    Supabase
      - Tables
      - Views
      - RPC Functions
        │
        ▼
    GitHub Pages Frontend
    (index.html, app-v4.js, styles.css)

## Technology

-   Frontend: Static GitHub Pages
-   Backend: Supabase PostgreSQL
-   Automation: GitHub Actions
-   ETL: Python
-   Source: MLB Stats API

------------------------------------------------------------------------

# Core Database Objects

## Primary Tables

-   mlb_players
-   mlb_pitchers
-   mlb_player_batting_game_logs
-   mlb_player_batting_splits
-   mlb_pitcher_game_logs
-   mlb_pitcher_splits
-   mlb_daily_matchups
-   mlb_daily_team_matchups
-   mlb_batter_vs_pitcher_history
-   mlb_matchup_predictions
-   mlb_hit_board_predictions

## Important RPCs

-   get_today_mlb_batter_matchups
-   get_today_reds_batter_matchups
-   get_team_hot_hitters
-   get_team_batting_splits
-   snapshot_mlb_hit_board_predictions
-   update_mlb_hit_board_prediction_actuals
-   refresh_incremental_mlb_hit_board_performance

------------------------------------------------------------------------

# Workflow Schedule (EDT)

## Load All MLB Phase 1 Data

Runs: - 6:30 AM - 2:05 PM Lookback: 7 days

Purpose: - Players - Pitchers - Game logs - Splits - Daily matchups

## Daily Reds Data Load

Runs: - 5:17 AM - 2:00 PM

Purpose: - Reds batting - Reds splits - Reds matchup - Batter vs
Pitcher - Reds prediction refresh

## Refresh MLB Hit Board Performance

Runs: - 7:00 AM

Purpose: - Snapshot predictions - Update actuals - Refresh model
performance

------------------------------------------------------------------------

# Data Pipeline

Morning: 1. Reds refresh 2. MLB phase 1 3. Hit Board refresh

Afternoon: 1. Reds refresh 2. MLB phase 1

------------------------------------------------------------------------

# Engineering Standards

-   Use UPSERT for all recurring loads.
-   Never intentionally create duplicate baseball records.
-   Respect unique constraints.
-   Keep workflows idempotent.
-   Preserve RPC compatibility with the frontend.
-   Keep business logic in SQL/RPC where practical.
-   Never commit secrets.

------------------------------------------------------------------------

# Operational Health Checklist

Daily: - GitHub Actions succeeded. - Today's rows exist in
mlb_daily_team_matchups. - Today's prediction_run_date exists in
mlb_hit_board_predictions. - Prediction counts are reasonable. - Actuals
populate after games.

Weekly: - Review failed Actions. - Verify data freshness. - Check
Supabase advisor recommendations. - Review prediction accuracy trends.

------------------------------------------------------------------------

# Troubleshooting

If predictions are stale:

1.  Check GitHub Actions.
2.  Verify matchups loaded.
3.  Verify prediction snapshot exists.
4.  Manually execute:
    -   Load All MLB Phase 1
    -   Daily Reds Data Load
    -   Refresh MLB Hit Board Performance

If duplicate concerns arise: - Verify UPSERT usage. - Verify unique
constraints. - Do not remove constraints.

------------------------------------------------------------------------

# Future Roadmap

Priority: - Weather - Park factors - Vegas odds - Confirmed lineups -
Bullpen fatigue - Injury feed

Longer term: - Model versioning - Feature importance - A/B testing -
Historical replay - Explainability dashboard

------------------------------------------------------------------------

# AI Agent Instructions

Before making changes: - Understand downstream impact. - Prefer minimal,
targeted changes. - Preserve existing schema and APIs.

After making changes: - Verify workflows. - Verify prediction
generation. - Verify no duplicate rows. - Verify frontend compatibility.
