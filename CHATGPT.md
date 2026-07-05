# CHATGPT.md

# AI Onboarding & Engineering Guide

**Project:** MLB Hit Board

## Mission

Maintain a reliable MLB analytics application that identifies hitters
with a high probability of recording at least one hit today. Prioritize
correctness, stability, repeatable ETL, and explainable model behavior.

## Repository Map

  Area        Primary Files
  ----------- -----------------------------------
  Frontend    index.html, app-v4.js, styles.css
  ETL         scripts/\*.py
  Workflows   .github/workflows/\*.yml
  Database    Supabase tables, views, RPCs

## Architecture

GitHub Actions → Python ETL → MLB Stats API → Supabase → GitHub Pages

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

## Core Database Objects

Key tables: - mlb_players - mlb_pitchers -
mlb_player_batting_game_logs - mlb_pitcher_game_logs -
mlb_player_batting_splits - mlb_pitcher_splits -
mlb_daily_team_matchups - mlb_matchup_predictions -
mlb_hit_board_predictions

## Engineering Rules

-   Use UPSERT for recurring loads.
-   Preserve unique constraints.
-   Keep ETL idempotent.
-   Do not rename RPCs without updating the frontend.
-   Never commit secrets.

## Model Rules (Architecture Decisions)

### Pitcher Eligibility Rule

A probable starting pitcher must have **at least one completed prior
start in the current MLB season** to be eligible for the MLB Hit Board
model.

Reason: - Prevents rookies and spot starters with insufficient MLB
history from appearing as the featured Target SP. - Avoids displaying
blank pitcher metrics caused by missing split history. - Improves
recommendation quality by requiring a minimum amount of historical data.

### Recent Form Rule

Current-day games are **never** included when calculating: - Last 5
ERA - Last 5 WHIP - Recent pitcher form

Only completed starts prior to the current date are eligible. This
prevents live/in-progress games from affecting pregame predictions.

## Validation Checklist

After ETL or model changes: - GitHub Actions succeed. - Today's matchups
exist. - Today's prediction_run_date exists. - No duplicate records. -
Target SP metrics are populated. - No current-day statistics leak into
pregame metrics.

## Troubleshooting

If predictions appear stale: 1. Check GitHub Actions. 2. Verify
mlb_daily_team_matchups has today's games. 3. Verify
mlb_hit_board_predictions contains today's prediction_run_date. 4.
Run: 1. Load All MLB Phase 1 Data 2. Daily Reds Data Load 3. Refresh MLB
Hit Board Performance

## Working with ChatGPT

For a new conversation: 1. Upload CHATGPT.md. 2. Upload only the files
related to today's task. 3. Describe the objective. 4. Ask for an
implementation plan before coding.

## Definition of Done

A change is complete only if: - Functionality works. - Scheduled
workflows succeed. - Data is fresh. - No duplicate records exist. -
Frontend remains compatible. - CHATGPT.md is updated if architecture or
model rules changed.


# V2 Predictive Model (June 2026)

## Status
V2 backend is implemented and running in parallel with V1. V1 remains the primary ranking while V2 is being validated.

## New Database Objects

Tables
- mlb_hit_board_predictions_v2

Views
- v_mlb_hit_board_v2_backtest_proxy
- v_mlb_model_dashboard_v1_vs_v2_proxy_summary
- v_mlb_model_dashboard_v1_vs_v2_proxy_daily
- v_mlb_model_dashboard_v1_vs_v2_proxy_rank_buckets
- v_mlb_model_dashboard_v2_live_summary
- v_mlb_model_dashboard_v2_live_daily
- v_mlb_model_dashboard_v2_calibration_live
- v_mlb_model_dashboard_v2_top_picks_live

RPCs
- snapshot_mlb_hit_board_predictions_v2()
- update_mlb_hit_board_prediction_actuals_v2(days_back)

## V2 Score Components

The V2 score incorporates:

- Recent hitter form
- Regression-adjusted batter splits
- Regression-adjusted pitcher splits
- Pitcher recent form
- Expected lineup position
- Expected plate appearances
- Calibrated hit probability
- Confidence score

The model intentionally shrinks noisy split data toward league averages to reduce overfitting.

## UI

Both the MLB Hit Board and Reds Hit Board display:
- Matchup Score (V1)
- V2 Pick Score
- Estimated Hit Probability

Future enhancements:
- Confidence indicator
- Model explanation panel
- V1/V2 comparison toggle
- Full Model Evaluation dashboard
- Historical V2 trend charts

## Model Evaluation

The primary evaluation view is:

v_mlb_model_dashboard_v1_vs_v2_proxy_summary

Use this to compare:
- Top Pick accuracy
- Top 5 / Top 10 / Top 20 hit rate
- Correlation
- Daily performance
- Calibration

Do not replace V1 until live V2 performance consistently outperforms V1.

