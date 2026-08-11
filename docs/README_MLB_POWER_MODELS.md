# MLB Power Models Enhancement
## Home Run + 2+ Total Bases Modeling, Shadow Scoring, Performance Monitoring

This document describes the end-to-end enhancement that added two new MLB batter prediction targets to the existing MLB Hit Lab platform:

- `home_run_1plus`
- `total_bases_2plus`

The enhancement was designed to preserve the existing production Hit/V3 workflow while adding a separate, generalized power-model architecture that can later support additional batter outcomes.

---

# 1. Architecture Overview

The solution uses a hybrid architecture:

```text
                        ┌──────────────────────────────┐
                        │          SUPABASE            │
                        │                              │
                        │ MLB source/game data         │
                        │ Statcast / matchup data      │
                        │ Environment snapshots        │
                        │ Daily power features         │
                        │ Model registry + artifacts   │
                        └──────────────┬───────────────┘
                                       │
                                       │ daily features + model artifacts
                                       ▼
                        ┌──────────────────────────────┐
                        │        GITHUB ACTIONS        │
                        │                              │
                        │ Python daily scorer          │
                        │ HR model                     │
                        │ 2+ Total Bases model         │
                        │ Quality checks before write  │
                        └──────────────┬───────────────┘
                                       │
                                       │ shadow predictions
                                       ▼
                        ┌──────────────────────────────┐
                        │          SUPABASE            │
                        │                              │
                        │ Generalized predictions      │
                        │ Rankings                     │
                        │ DB-side quality validation   │
                        │ Actuals                      │
                        │ Daily scorecards             │
                        │ Rolling performance          │
                        │ Pipeline status              │
                        └──────────────┬───────────────┘
                                       │
                                       ▼
                        ┌──────────────────────────────┐
                        │     DAILY BI MONITORING      │
                        │                              │
                        │ 9:30 AM Eastern dashboard    │
                        │ Top 25 HR                    │
                        │ Top 25 2+ TB                 │
                        │ Prior-day performance        │
                        │ Sr. Data Scientist review    │
                        └──────────────────────────────┘
```

### Design principles

1. **Do not disturb the existing Hit V3 production workflow.**
2. Keep HR and Total Bases in **shadow mode** until enough live performance is collected.
3. Keep Supabase as the system of record for features, models, predictions, actuals, and performance.
4. Use GitHub/Python as the ML scoring compute layer.
5. Require independent database-side validation after GitHub writes predictions.
6. Store predictions in a generalized target-aware structure so future batter models can use the same serving framework.

---

# 2. Phase 1 — Power Feature Layer

Phase 1 created the shared feature foundation for HR and Total Bases models.

## Primary feature table

```text
public.mlb_ml_batter_power_features_daily
```

Primary key:

```text
(game_date, game_pk, player_id)
```

This table contains one row per batter/game.

### Feature groups

The table includes:

- Recent total bases
- Recent home runs
- Extra-base hits
- SLG
- ISO
- HR per AB
- Batting order
- Batter handedness
- Home/away
- Batter exit velocity
- Batter hard-hit rate
- Batter barrel rate
- Sweet-spot rate
- Fly-ball rate
- xBA
- xwOBA on contact
- Pitcher contact quality allowed
- Pitcher barrel rate allowed
- Pitcher hard-hit rate allowed
- Matchup collision features
- Pitch-mix / arsenal features
- Park factors
- Weather/environment data
- Actual results
- Modeling targets

### Targets stored

```text
target_hit_1plus
target_home_run_1plus
target_total_bases_1plus
target_total_bases_2plus
target_total_bases_3plus
target_total_bases_4plus
```

---

# 3. Point-in-Time / Leakage Controls

The feature layer is designed to prevent information leakage.

### Rolling statistics

Recent batter statistics only use games that occurred before the prediction game.

### Environment data

Environment values are only considered point-in-time safe when the environment snapshot was captured before first pitch.

### Feature contract

Feature eligibility is maintained in:

```text
public.mlb_ml_batter_power_feature_contract
```

Feature classifications include:

```text
MODEL_FEATURE
CANDIDATE
INSUFFICIENT_HISTORY
METADATA_ONLY
LEAKAGE
```

This contract determines which fields may be used by a model.

---

# 4. Environment Data

Environment collection is stored in:

```text
public.mlb_game_environment_snapshots
```

The environment layer includes information such as:

- Temperature
- Wind
- Roof status
- Roof type
- Park hit factor
- Park HR factor

Some environment features currently remain classified as insufficient-history features until enough historical observations exist.

---

# 5. Phase 2 — Model Development

Phase 2 trained and evaluated the first production-candidate HR and Total Bases models.

## Experiment

```text
experiment_version = power_phase2_v1_20260810
```

The experiment used a fixed train / validation / test split.

The held-out test period was not used until validation model selection was complete.

---

# 6. Phase 2 Model Candidates

Candidates included:

- Prevalence baseline
- Regularized logistic regression
- Gradient boosted stumps
- Random Forest exploration

Random Forest exceeded Supabase Edge Function compute limits during testing.

That result helped drive the Phase 3 architecture decision to move daily ML scoring to GitHub/Python rather than rely on Edge Functions for production scoring.

---

# 7. Selected HR Model

Target:

```text
home_run_1plus
```

Registered model:

```text
model_run_id = 112
model_version = hr_v1_20260810213855
algorithm = logistic_regression
status = candidate
```

The selected model uses:

1. Median imputation
2. Z-score scaling
3. One-hot encoding
4. Logistic regression
5. Platt calibration

The scorer reads the model artifact dynamically rather than hard-coding coefficients into GitHub.

---

# 8. Selected 2+ Total Bases Model

Target:

```text
total_bases_2plus
```

Registered model:

```text
model_run_id = 113
model_version = tb2_v1_20260810213938
algorithm = logistic_regression
status = candidate
```

It uses the same general preprocessing/calibration framework as the HR model.

---

# 9. Model Registry and Experiment Tables

The enhancement uses the following model-development tables:

```text
public.mlb_ml_model_runs
public.mlb_ml_model_feature_importance
public.mlb_ml_power_experiment_runs
public.mlb_ml_power_candidate_results
public.mlb_ml_power_evaluation_predictions
public.mlb_ml_power_model_artifacts
```

### Purpose

| Object | Purpose |
|---|---|
| `mlb_ml_model_runs` | Registered model versions and metadata |
| `mlb_ml_model_feature_importance` | Model feature importance |
| `mlb_ml_power_experiment_runs` | Experiment-level metadata |
| `mlb_ml_power_candidate_results` | Validation/test metrics by candidate |
| `mlb_ml_power_evaluation_predictions` | Validation/test predictions |
| `mlb_ml_power_model_artifacts` | Preprocessing, coefficients, calibration artifacts |

---

# 10. Phase 3A — Generalized Prediction Layer

Phase 3A created the backend serving contract used by the GitHub scorer.

## Prediction table

```text
public.mlb_ml_batter_predictions
```

This table supports:

```text
hit_1plus
home_run_1plus
total_bases_2plus
```

HR and Total Bases are currently the targets populated by the new GitHub workflow.

### Important fields

```text
prediction_run_date
game_date
game_pk
player_id
target_name
model_run_id
model_version
predicted_probability
rank_overall
rank_team
rank_game
batter_name
team_id
team_name
pitcher_id
pitcher_name
batting_order
game_time_utc
feature_version
prediction_source
quality_status
quality_reasons
actual_loaded
actual_value
actual_binary
evaluation_status
prediction_created_at
```

### Unique prediction constraint

Only one prediction may exist for a player/game/target:

```text
prediction_run_date
+ target_name
+ game_pk
+ player_id
```

---

# 11. Database Quality Validation

GitHub does not determine whether a prediction set is valid by itself.

Supabase independently validates the results after they are written.

Function:

```text
public.validate_mlb_ml_batter_predictions(
    p_run_date date,
    p_target_name text
)
```

Checks include:

- Feature row exists
- Correct game
- Correct player
- Correct model run
- Correct model version
- Correct feature version
- Batting order consistency
- Pitcher consistency where available
- Probability between 0 and 1
- Duplicate prevention
- Pregame timing where game time is available

Rows receive:

```text
quality_status = pass
```

or:

```text
quality_status = fail
```

with detailed reasons.

---

# 12. Prediction Ranking

Ranking is generated by:

```text
public.rank_mlb_ml_batter_predictions(
    p_run_date date,
    p_target_name text
)
```

Ranks include:

- Overall daily rank
- Team rank
- Game rank

The Top 25 BI board uses `rank_overall`.

---

# 13. Actual Result Synchronization

Actual HR and Total Bases results are synchronized with:

```text
public.sync_mlb_ml_batter_prediction_actuals(
    p_game_date date
)
```

### HR actual

```text
actual_value = home_runs
actual_binary = home_runs >= 1
```

### Total Bases actual

Total bases are calculated as:

```text
TB = hits
   + doubles
   + (2 × triples)
   + (3 × home_runs)
```

This is equivalent to:

```text
1B + 2×2B + 3×3B + 4×HR
```

because the source `hits` field already includes doubles, triples, and home runs.

For the 2+ TB target:

```text
actual_binary = total_bases >= 2
```

### Current automation note

The actual-sync function exists and has been validated, but it is **not currently configured as a dedicated Phase 3 cron job**.

Before relying on fully automated prior-day HR/TB scorecards, this function should either:

1. be added to the existing MLB actuals-finalization process, or
2. receive its own scheduled job after games are finalized.

This is the primary remaining operational automation gap in the Phase 3 shadow pipeline.

---

# 14. Performance Views

Daily performance:

```text
public.v_mlb_power_daily_scorecard
```

Rolling performance:

```text
public.v_mlb_power_rolling_scorecard
```

Metrics include:

- Evaluated rows
- Overall baseline
- Top 1 success rate
- Top 5 success rate
- Top 10 success rate
- Top 25 success rate
- Lift versus baseline
- Brier score
- Log loss

Rolling windows include:

```text
Last 7
Last 14
Last 30
Season
```

Rolling periods are based on evaluated game days rather than simply calendar-day windows.

---

# 15. Pipeline Status

Pipeline health is stored in:

```text
public.mlb_ml_batter_pipeline_status
```

Refreshed by:

```text
public.refresh_mlb_ml_batter_pipeline_status(
    p_run_date date
)
```

Possible statuses:

```text
waiting_for_features
waiting_for_predictions
incomplete
complete
failed
```

Checks include:

- Expected player-games
- Prediction count
- Missing predictions
- Duplicate predictions
- Invalid probabilities
- Missing ranks
- Duplicate ranks
- Model-version mismatch
- Quality failures
- Evaluated rows

The GitHub workflow fails when the requested target does not finish with:

```text
status = complete
```

---

# 16. Phase 3B — GitHub Scoring Layer

Daily scoring is handled by:

```text
scripts/score_mlb_power_models.py
```

The script intentionally uses only the Python standard library.

No scikit-learn runtime dependency is required for the current logistic models.

### Daily scoring flow

```text
Load registered model
        ↓
Load stored preprocessing
        ↓
Load model coefficients
        ↓
Load Platt calibration
        ↓
Load today's power features
        ↓
Recreate Phase 2 transformations
        ↓
Generate calibrated probability
        ↓
Write generalized predictions
        ↓
Rank predictions
        ↓
Run DB quality validator
        ↓
Refresh pipeline status
        ↓
Fail GitHub job if not COMPLETE
```

---

# 17. GitHub Actions Workflow

Workflow:

```text
.github/workflows/mlb-power-model-daily.yml
```

Workflow name:

```text
MLB Power Models - Daily Shadow Score
```

### Required repository secrets

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### Supported manual options

```text
run_date
target
dry_run
allow_after_start
```

Targets:

```text
all
home_run_1plus
total_bases_2plus
```

### Dry run

A dry run:

- Loads models
- Loads features
- Calculates probabilities
- Performs scoring checks
- Writes nothing to Supabase

Dry runs may safely execute after games have started.

### Live run safety

A normal write run refuses to create or overwrite same-day predictions after first pitch unless:

```text
allow_after_start = true
```

That option should only be used for intentional recovery.

---

# 18. Scheduled Jobs

## Supabase jobs directly related to this enhancement

### Environment refresh

```text
Job: mlb-game-environment-refresh-daily
Cron: 20 11 * * *
Time: 11:20 UTC daily
```

Purpose:

- Collect current game environment data
- Store pregame weather / roof / park context

During US daylight-saving time this is approximately:

```text
7:20 AM Eastern
```

During standard time:

```text
6:20 AM Eastern
```

---

### Power feature refresh

```text
Job: mlb-batter-power-features-daily
Cron: 45 11 * * *
Time: 11:45 UTC daily
```

Function:

```text
refresh_mlb_ml_batter_power_features(current Eastern date)
```

Purpose:

- Build the daily batter power feature rows
- Runs after environment collection

During daylight-saving time:

```text
7:45 AM Eastern
```

During standard time:

```text
6:45 AM Eastern
```

---

## GitHub Actions scoring job

```text
Workflow: MLB Power Models - Daily Shadow Score
Cron: 15 12 * * *
Time: 12:15 UTC daily
```

Purpose:

- Score HR model
- Score 2+ Total Bases model
- Write shadow predictions
- Rank predictions
- Run DB quality validation
- Refresh pipeline status

The job intentionally runs 30 minutes after the power-feature refresh.

During daylight-saving time:

```text
8:15 AM Eastern
```

During standard time:

```text
7:15 AM Eastern
```

---

## Existing MLB actual-finalization process

An existing MLB job runs:

```text
Job: mlb-daily-actuals-finalizer
Cron: 20 10-15 * * *
```

This runs hourly during the defined UTC range and finalizes prior-day MLB actuals for the broader Hit Lab pipeline.

The new HR/TB actual-sync function should eventually be explicitly integrated into this process or scheduled directly.

---

# 19. Daily BI Monitoring Agent

A daily automated monitoring report is scheduled for:

```text
9:30 AM Eastern
```

Title:

```text
Power Models Daily Board
```

The report queries the latest Supabase power-model prediction and performance data.

## Dashboard layout

### Current HR Top 25

Displays:

- Rank
- Batter
- Team
- Opposing pitcher when available
- Predicted HR probability

### Current 2+ Total Bases Top 25

Displays:

- Rank
- Batter
- Team
- Opposing pitcher when available
- Predicted 2+ TB probability

### Prior evaluated day

For each model:

- Top 1
- Top 5
- Top 10
- Top 25
- Successes / evaluated rows
- Success rate
- Overall baseline
- Lift versus baseline

DNP / void players are excluded from model-performance percentages.

---

# 20. Senior Data Scientist Review

The bottom of the daily BI dashboard includes a short Senior Data Scientist evaluation.

It reviews items such as:

- Ranking quality
- Top-25 lift
- Calibration
- Probability spread
- Sample size
- Day-to-day volatility
- Model degradation
- Concentration of predictions
- Data-quality concerns

Recommendations are only made when the evidence supports a change.

When the live sample is too small, the expected recommendation is:

```text
Continue shadow monitoring.
```

---

# 21. Shadow Mode

HR and Total Bases are intentionally not exposed in the production frontend yet.

Current state:

```text
Hit V3          → production
HR V1           → shadow
2+ TB V1        → shadow
```

Recommended shadow period:

```text
approximately 7–14 evaluated game days
```

The exact promotion decision should be based on performance rather than elapsed time alone.

Key indicators:

- Top 25 lift versus baseline
- Top 10 lift
- Brier score
- Log loss
- Calibration
- Stability across days
- Prediction coverage
- Data-quality pass rate

---

# 22. Planned Phase 4

Once shadow monitoring demonstrates acceptable live performance, the frontend can be extended with a target selector such as:

```text
Hit | Total Bases | Home Run
```

Phase 4 should use the generalized prediction-serving architecture rather than create target-specific frontend pipelines.

---

# 23. Operational Run Order

Normal daily sequence:

```text
11:20 UTC
Environment refresh
        ↓
11:45 UTC
Power feature refresh
        ↓
12:15 UTC
GitHub HR / TB scoring
        ↓
Prediction ranking
        ↓
Database quality validation
        ↓
Pipeline status
        ↓
Games played
        ↓
Actual results finalized
        ↓
HR/TB actual sync
        ↓
Daily + rolling performance
        ↓
9:30 AM Eastern next day
BI dashboard + Sr. Data Scientist review
```

---

# 24. Key Production/Shadow Objects

## Feature layer

```text
mlb_ml_batter_power_features_daily
mlb_ml_batter_power_feature_contract
mlb_game_environment_snapshots
```

## Model layer

```text
mlb_ml_model_runs
mlb_ml_model_feature_importance
mlb_ml_power_experiment_runs
mlb_ml_power_candidate_results
mlb_ml_power_evaluation_predictions
mlb_ml_power_model_artifacts
```

## Prediction / serving layer

```text
mlb_ml_batter_predictions
mlb_ml_batter_pipeline_status
```

## Performance layer

```text
v_mlb_power_daily_scorecard
v_mlb_power_rolling_scorecard
```

## Important functions

```text
refresh_mlb_ml_batter_power_features(date)
rank_mlb_ml_batter_predictions(date, target)
validate_mlb_ml_batter_predictions(date, target)
sync_mlb_ml_batter_prediction_actuals(date)
refresh_mlb_ml_batter_pipeline_status(date)
```

## GitHub

```text
scripts/score_mlb_power_models.py
.github/workflows/mlb-power-model-daily.yml
```

---

# 25. Security

The new Phase 3 prediction/status tables are internal.

Expected access pattern:

```text
anon          → no direct access
authenticated → no direct access
service_role  → permitted
```

Row Level Security is enabled.

The new operational RPC functions are not intended for public anonymous execution.

GitHub uses the Supabase service-role credential stored in GitHub Actions secrets.

Secrets must never be committed to the repository.

---

# 26. Current Status

As of the completion of Phase 3B:

```text
Phase 1 — Power features                COMPLETE
Phase 2 — Model training/evaluation     COMPLETE
Phase 3A — Supabase serving contract    COMPLETE
Phase 3B — GitHub daily scorer          COMPLETE
Shadow monitoring                       READY / BEGINNING
Frontend integration                    NOT YET ENABLED
```

The first GitHub dry run successfully loaded the registered models and daily feature set without writing prediction rows.

The next milestone is collecting live shadow predictions and evaluated results over multiple game days.

---

# 27. Recommended Next Steps

1. Run the Phase 3B live scorer before games each day.
2. Explicitly automate `sync_mlb_ml_batter_prediction_actuals()` as part of the prior-day actual-finalization flow.
3. Monitor HR and TB Top 25 performance daily.
4. Watch calibration and lift over at least 7–14 evaluated slates.
5. Do not retrain based on one or two poor days.
6. Promote models only after performance is stable enough to justify production use.
7. Add the Phase 4 frontend target selector after shadow validation.

---

## Summary

This enhancement introduces a reusable MLB batter-model platform rather than two isolated models.

The architecture separates:

```text
Data + features       → Supabase
Model artifacts       → Supabase
ML compute            → GitHub/Python
Predictions           → Supabase
Validation            → Supabase
Actuals/performance   → Supabase
Monitoring            → Daily BI dashboard
```

That separation keeps the existing Hit V3 system stable while allowing HR, Total Bases, and future batter targets to share the same production-grade framework.
