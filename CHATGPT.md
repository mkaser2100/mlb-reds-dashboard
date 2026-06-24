# CHATGPT.md (Version 3)

# AI Onboarding & Engineering Guide

**Project:** MLB Hit Board

## 1. Mission

Maintain a reliable MLB analytics application that identifies hitters
with a high probability of recording at least one hit today. Favor
correctness, stability, and repeatable ETL over rapid feature additions.

## 2. Before You Change Anything

Ask: - Which layer am I changing? (Frontend, ETL, Database, Workflow) -
What downstream objects depend on this? - Can this be solved with the
smallest possible change?

## 3. Repository Map

  Task        Files to Inspect
  ----------- -----------------------------------
  UI          index.html, app-v4.js, styles.css
  MLB ETL     scripts/load_all_mlb_phase1.py
  Reds ETL    Reds loader scripts
  Workflows   .github/workflows/\*.yml
  Database    Supabase tables, RPCs, views

## 4. System Architecture

GitHub Actions → Python ETL → MLB Stats API → Supabase → GitHub Pages

## 5. Current Workflow Schedule (EDT)

Load All MLB Phase 1 - 6:30 AM - 2:05 PM - 7-day lookback

Daily Reds - 5:17 AM - 2:00 PM

Refresh Hit Board - 7:00 AM

## 6. Database Principles

Critical tables: - mlb_players - mlb_pitchers -
mlb_player_batting_game_logs - mlb_pitcher_game_logs -
mlb_daily_matchups - mlb_daily_team_matchups - mlb_matchup_predictions -
mlb_hit_board_predictions

Rules: - Use UPSERTs. - Preserve unique constraints. - Never
intentionally duplicate records. - Preserve RPC compatibility.

## 7. Safe Development Rules

Always: - Prefer incremental refreshes. - Preserve existing API
contracts. - Keep ETL idempotent. - Store business logic in SQL/RPC
where practical.

Never: - Commit secrets. - Remove unique constraints. - Rename RPCs
without updating the frontend. - Bypass workflow validation.

## 8. Validation Checklist

After ETL changes: - GitHub Action succeeds. - Today's matchups
loaded. - Today's prediction_run_date exists. - Prediction counts look
reasonable. - No duplicate rows.

After frontend changes: - Dashboard loads. - Filters work. - No console
errors.

## 9. Common Troubleshooting

Stale predictions: 1. Check Actions. 2. Check mlb_daily_team_matchups.
3. Check mlb_hit_board_predictions. 4. Run: - Load All MLB Phase 1 -
Daily Reds - Refresh Hit Board

## 10. Roadmap

Near-term: - Weather - Vegas odds - Confirmed lineups - Park factors -
Bullpen fatigue

Long-term: - Model explainability - Feature importance - A/B testing -
Historical replay - Automated health dashboard

## 11. Working with ChatGPT

For a new chat: 1. Upload CHATGPT.md. 2. Upload only the files relevant
to today's task. 3. State the objective. 4. Ask for a plan before code
changes.

Typical uploads: - UI work: app-v4.js, index.html - ETL: relevant Python
script - Workflows: relevant .yml - Database: usually no files needed if
Supabase access is available.

## 12. Definition of Done

A change is complete only if: - Code works. - Workflow succeeds. - Data
is fresh. - No duplicate records. - Frontend remains compatible. -
CHATGPT.md is updated if architecture changed.
