# MLB daily workflow order

Daily order during daylight saving time (Eastern):

1. **Load All MLB Phase 1 Data** — 3:15 AM ET
   - Loads MLB source data used by the daily prediction pipeline.
   - Updates legacy matchup prediction actuals.
   - Loads Reds batter-vs-pitcher history.
   - Saves legacy Reds matchup prediction snapshots.
   - Snapshots V1 and V2 league-wide predictions.

2. **Load MLB Statcast** — 6:45 AM ET
   - Loads the prior day's Statcast events.
   - Continues cleanly on MLB-wide off days.

3. **Load V3 Hit Actuals** — after Phase 1 succeeds; 8:15 AM ET backup
   - Closes the prior day's V3 predictions once batting game-log coverage is available.
   - Uses a once-per-Eastern-day automatic-run guard so the backup does not duplicate a successful dependency-driven run.

4. **Refresh MLB V3 Features** — after Statcast succeeds; 8:15 AM ET backup
   - Refreshes today's V3 enhancement features after the Statcast load.
   - Uses the same once-per-Eastern-day automatic-run guard.

5. **Run V3 Hit Model** — after V3 prerequisites are ready; 8:45 AM ET backup
   - Requires yesterday's V3 actuals/evaluation statuses to be available before training when prior-day predictions exist.
   - Requires today's `v_mlb_ml_today_features_v3_wide` rows before scoring.
   - The backup cron is a safety net if dependency-driven execution is delayed or missed.

6. **Refresh MLB Hit Board Performance** — after V3 model succeeds; 8:50 AM ET backup
   - Refreshes performance data after the current V3 model run completes.

7. **Load Hit Prop Market Odds** — 10:00 AM ET
   - Loads hit-prop market odds after the model pipeline.
   - Odds are not required for V3 training.

## Pipeline rules

- GitHub cron expressions are stored in UTC; the ET times above reflect daylight saving time.
- Automatic workflows use a once-per-Eastern-day guard to avoid duplicate dependency and backup runs.
- Manual `workflow_dispatch` runs remain available for reruns and backfills.
- Backup schedules are intentionally retained as recovery paths; the primary path is dependency-driven.
- The V3 model must not train against stale enhancement features or before prior-day V3 outcomes are sufficiently closed.
- `Refresh MLB Hit Board Performance` remains downstream of `Run V3 Hit Model`.

## Current dependency map

```text
Load All MLB Phase 1 Data
        |
        v
Load V3 Hit Actuals ---------\
                              \
                               > Run V3 Hit Model
                              /          |
Load MLB Statcast            /           v
        |                    /   Refresh MLB Hit Board Performance
        v                   /
Refresh MLB V3 Features ----/

Load Hit Prop Market Odds (10:00 AM ET, independent of V3 training)
```

## Retired workflow

`Daily Reds Data Load` is retired and no longer scheduled. Its still-required BvP, legacy snapshot, and legacy actual-update steps were consolidated into `Load All MLB Phase 1 Data`.
