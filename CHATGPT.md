# CHATGPT.md

# MLB Hit Board Dashboard

## Purpose

This repository contains an MLB analytics application that identifies
hitters with a high probability of recording a hit on a given day.

## Technology Stack

-   GitHub Pages frontend
-   Supabase backend
-   GitHub Actions automation
-   Python ETL
-   MLB Stats API

## Architecture

``` text
GitHub Actions
    ↓
Python ETL
    ↓
MLB Stats API
    ↓
Supabase
    ↓
GitHub Pages
```

## Core Tables

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

## Workflow Schedule (EDT)

### Load All MLB Phase 1 Data

-   6:30 AM
-   2:05 PM
-   Default lookback: 7 days

### Daily Reds Data Load

-   5:17 AM
-   2:00 PM

### Refresh MLB Hit Board Performance

-   7:00 AM

## Engineering Principles

-   Use UPSERT for repeatable loads.
-   Respect unique constraints.
-   Keep workflows idempotent.
-   Keep business logic in SQL views/RPCs when practical.
-   Never expose service role keys.

## Troubleshooting

1.  Check GitHub Actions.
2.  Verify today's data exists in mlb_daily_team_matchups.
3.  Verify today's prediction_run_date exists in
    mlb_hit_board_predictions.
4.  Manual run order:
    1.  Load All MLB Phase 1 Data
    2.  Daily Reds Data Load
    3.  Refresh MLB Hit Board Performance

## Future Enhancements

-   Weather
-   Park factors
-   Vegas odds
-   Confirmed lineups
-   Bullpen fatigue
-   Injury integration
-   Model versioning
