# MLB Hit Lab — V3-C Challenger

## Overview

V3-C is a shadow challenger to the production MLB Hit Lab V3 model.

It does not replace or retrain V3. Instead, it starts with the V3 probability for each player, applies a small post-model penalty when selected risk conditions are present, and then reranks the slate.

The goal is to test whether a lightweight adjustment layer can improve the quality of the highest-ranked selections, especially the Top 5, Top 10, and Top 25, without changing the production V3 model.

Production model:

- `V3`

Shadow challenger:

- `V3-C`

Current active penalty version:

- `v3c_contradiction_penalty_v3`

---

## How V3-C Works

V3-C begins with the active V3 prediction for each player and evaluates three groups of signals:

1. Contact-quality contradiction
2. Arsenal-matchup contradiction
3. Feature completeness

The current V3-C v3 logic is intentionally conservative.

### 1. Contradiction trigger

A player is flagged for contradiction only when both conditions are true:

```text
contact_quality_edge < -0.02
AND
arsenal_xba_edge < -0.02
```

This means the player has a negative contact-quality signal and a negative arsenal matchup signal at the same time.

The contradiction flag alone does not remove the player. It only makes the player eligible for a small probability penalty.

### 2. Contradiction penalty

For non-Top-1 players, the contradiction penalty is:

```text
min(
  0.02,
  abs(contact_quality_edge) * 0.10
  + abs(arsenal_xba_edge) * 0.10
)
```

Maximum contradiction penalty:

```text
2.0 percentage points
```

Example:

```text
V3 probability:         68.0%
Contradiction penalty:   1.4%
V3-C probability:       66.6%
```

### 3. Top-1 protection

The player ranked No. 1 by V3 is protected from the normal contradiction penalty.

The V3 Top-1 player is penalized only when all of the following are true:

```text
contact_quality_edge < -0.05
AND
arsenal_xba_edge < -0.05
AND
data is complete
```

Even then, the contradiction penalty remains capped at 2.0 percentage points.

This protection was added because earlier challenger versions occasionally demoted the strongest V3 selection too aggressively.

### 4. Completeness penalty

A player is marked incomplete when any of the following is true:

```text
contact feature unavailable
OR
arsenal feature unavailable
OR
arsenal coverage < 80%
```

Incomplete players receive:

```text
1.5 percentage-point penalty
```

The completeness penalty is retained because historical testing showed that incomplete-data players materially underperformed complete-data players.

### 5. Weak-form flag

V3-C still records the weak-form flag for analysis:

```text
recent_form_score_w3 < 45
AND
recent_form_score_w10 < 55
```

However, V3-C v3 does not apply an additional weak-form multiplier or probability penalty.

The flag remains available for diagnostics and future research.

### 6. Final challenger probability

```text
V3-C probability =
max(
  1%,
  V3 probability
  - contradiction penalty
  - completeness penalty
)
```

Players are reranked from highest to lowest V3-C probability.

---

## Why V3-C Exists

Historical review showed that some V3 misses had a recurring pattern:

- strong split metrics,
- strong matchup metrics,
- weak contact-quality edge,
- weak arsenal edge,
- and sometimes incomplete supporting data.

The first challenger version penalized these cases too broadly.

Subsequent versions made the logic more conservative:

### V3-C v1

- broad contradiction trigger,
- stronger penalty,
- weak-form multiplier,
- 1.5% completeness penalty.

### V3-C v2

- tighter contradiction thresholds,
- smaller contradiction penalty,
- reduced weak-form multiplier,
- retained completeness penalty.

### V3-C v3

- maximum contradiction penalty reduced to 2.0%,
- penalty weight reduced,
- weak-form penalty removed,
- Top-1 protection added,
- completeness penalty retained.

V3-C remains a shadow model until enough forward-test evidence exists to justify promotion.

---

## Supabase Objects

### Source table: `public.mlb_ml_predictions_v3`

This is the production V3 prediction table.

V3-C reads the active `hit_1plus` prediction rows for the requested date and uses the latest row per player.

Important source fields include:

- `prediction_id`
- `prediction_run_date`
- `model_run_id`
- `game_pk`
- `player_id`
- `batter_name`
- `team_id`
- `pitcher_id`
- `pitcher_name`
- `predicted_probability`
- `predicted_value`
- `rank_overall`
- `features`
- `actual_binary`
- `actual_value`
- `evaluation_status`
- `actual_loaded`
- `is_active`
- `created_at`
- `updated_at`

Relevant values are extracted from the V3 `features` JSON, including:

- `contact_quality_edge`
- `arsenal_xba_edge`
- `arsenal_coverage_pct`
- `recent_form_score_w3`
- `recent_form_score_w10`
- `contact_feature_available`
- `arsenal_feature_available`

### Challenger table: `public.mlb_ml_predictions_v3c`

This table stores the V3-C challenger output.

It preserves the original V3 probability and rank while storing the adjusted challenger probability and reranked position.

Key columns include:

- `prediction_run_date`
- `model_run_id`
- `baseline_prediction_id`
- `game_pk`
- `player_id`
- `batter_name`
- `team_id`
- `pitcher_id`
- `pitcher_name`
- `baseline_probability`
- `baseline_rank_overall`
- `v3c_probability`
- `v3c_rank_overall`
- `rank_change`
- `contradiction_penalty`
- `completeness_penalty`
- `total_penalty`
- `penalty_version`
- `contradiction_flag`
- `weak_form_flag`
- `incomplete_data_flag`
- `contact_quality_edge`
- `arsenal_xba_edge`
- `arsenal_coverage_pct`
- `recent_form_score_w3`
- `recent_form_score_w10`
- `actual_binary`
- `actual_value`
- `evaluation_status`
- `actual_loaded`
- `created_at`
- `updated_at`

---

## Supabase Functions

### `public.refresh_mlb_v3c_for_date(...)`

Purpose:

- reads the active V3 predictions for one date,
- applies the requested V3-C penalty version,
- reranks the slate,
- inserts or replaces V3-C rows for that date and version,
- returns summary counts.

Current signature:

```sql
refresh_mlb_v3c_for_date(
  p_date date,
  p_penalty_version text default 'v3c_contradiction_penalty_v3'
)
```

Returned diagnostics include:

- scored row count,
- contradiction count,
- weak-form count,
- incomplete-data count,
- average total penalty,
- maximum total penalty.

Example:

```sql
select *
from public.refresh_mlb_v3c_for_date(
  '2026-07-30'::date,
  'v3c_contradiction_penalty_v3'
);
```

### `public.sync_mlb_v3c_actuals(...)`

Purpose:

- copies finalized V3 actual results into the matching V3-C rows,
- keeps V3-C evaluation status aligned with the production model,
- supports daily scorecards and historical comparisons.

Use this after V3 actuals have been loaded for the prior game date.

---

## GitHub Files

### `.github/workflows/run-v3c-challenger.yml`

GitHub Actions workflow that runs the challenger.

Current environment setting:

```yaml
V3C_PENALTY_VERSION: v3c_contradiction_penalty_v3
```

Supported triggers:

- `workflow_dispatch` for manual score, sync, or both
- `workflow_run` after `Run V3 Hit Model`
- `workflow_run` after `Load V3 Hit Actuals`
- scheduled backup run

Trigger behavior:

```text
Run V3 Hit Model      -> score today's V3-C slate
Load V3 Hit Actuals   -> sync yesterday's V3-C actuals
Scheduled backup      -> score today and sync yesterday
```

Because the score function replaces rows for the same date and penalty version, a backup rerun is safe, though it may appear as an additional GitHub Actions run.

### `scripts/run_v3c_challenger.py`

Python runner used by the GitHub workflow.

Responsibilities:

- parse run mode,
- resolve score and actual dates,
- call the Supabase RPC functions,
- pass the active penalty version,
- print execution summaries,
- fail the workflow when Supabase calls fail.

Expected command pattern:

```bash
python scripts/run_v3c_challenger.py \
  --mode "$V3C_MODE" \
  --score-date "$V3C_SCORE_DATE" \
  --actuals-date "$V3C_ACTUALS_DATE" \
  --penalty-version "$V3C_PENALTY_VERSION"
```

---

## Daily Processing Flow

```text
Load V3 Hit Actuals
        ↓
Run V3-C Challenger in sync mode
        ↓
Prior-day V3-C actuals updated
```

Separately:

```text
Refresh V3 Features
        ↓
Run V3 Hit Model
        ↓
Run V3-C Challenger in score mode
        ↓
Current-day V3-C slate created
```

Backup flow:

```text
Scheduled V3-C run
        ↓
Score current date
        +
Sync prior date
```

---

## Manual Backfill

A historical date can be rerun from GitHub Actions using `Run workflow`.

Set:

```text
target_date = YYYY-MM-DD
mode = both
```

For a manual backfill, the supplied date is used for both scoring and actual synchronization.

A date range can also be backfilled directly in SQL.

```sql
select public.refresh_mlb_v3c_for_date(
  d::date,
  'v3c_contradiction_penalty_v3'
)
from generate_series(
  '2026-07-18'::date,
  '2026-07-29'::date,
  interval '1 day'
) d;
```

Then synchronize actuals for the same dates.

---

## Evaluation Rules

All comparisons must exclude unevaluable rows.

Do not include:

- DNPs,
- postponed games,
- cancelled games,
- rows without finalized actuals,
- rows whose evaluation status is not final and evaluable.

Required evaluation cuts:

- Overall
- Top 25
- Top 10
- Top 5
- Top 1

Recommended metrics:

- hit rate,
- raw hits / evaluable selections,
- percentage-point difference,
- Brier score,
- mean absolute error,
- swap quality,
- contradiction-group hit rate,
- no-contradiction hit rate,
- complete-data hit rate,
- incomplete-data hit rate.

---

## Swap Analysis

Swap analysis measures whether V3-C improved the composition of a ranking tier.

```text
moved_out = players in V3 tier but not V3-C tier
moved_in  = players in V3-C tier but not V3 tier
hits_out  = hits among moved-out players
hits_in   = hits among moved-in players
net_hits  = hits_in - hits_out
```

A positive net-hit value indicates that V3-C improved the historical membership of that tier.

Because this is retrospective analysis, swap results should be evaluated over meaningful forward samples rather than used for repeated tuning on the same dates.

---

## Current Model-Governance Position

V3 remains the production model.

V3-C remains a shadow challenger.

Current recommendation:

- keep V3 in production,
- run V3-C daily,
- compare V3 and V3-C after actuals are finalized,
- focus on Top 5 and Top 10 ranking quality,
- monitor Top-1 protection,
- continue collecting forward-test evidence,
- avoid repeated tuning against the same historical window.

A promotion decision should require:

- a larger forward sample,
- sustained Top 5 and Top 10 improvement,
- no meaningful Top-1 regression,
- stable or improved calibration,
- no evidence that gains come from data leakage or overfitting.

---

## Configuration Checklist

Before each release, confirm:

```text
Supabase function default version:
v3c_contradiction_penalty_v3
```

```text
GitHub workflow environment version:
v3c_contradiction_penalty_v3
```

```text
Python runner passes:
--penalty-version "$V3C_PENALTY_VERSION"
```

Also confirm that:

- the V3 model completed successfully,
- V3-C scored the current date,
- prior-day actuals were synchronized,
- DNPs are excluded from evaluation,
- daily reports identify the actual penalty version used.

---

## Important Versioning Note

The penalty version stored on each V3-C row is authoritative.

Do not assume a date used the current logic simply because the Supabase function default has been updated.

Always verify:

```sql
select
  prediction_run_date,
  penalty_version,
  count(*) as row_count
from public.mlb_ml_predictions_v3c
group by prediction_run_date, penalty_version
order by prediction_run_date desc, penalty_version;
```

This prevents older V1 or V2 rows from being mistakenly evaluated as V3-C v3 results.
