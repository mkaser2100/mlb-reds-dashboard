# MLB V3 Daily Production Workflow

This document describes the production workflow order for the MLB V3 Hit Model pipeline and the operating rules for running, troubleshooting, and maintaining it.

## Production Workflow Order

The production pipeline is orchestrated by:

`.github/workflows/daily-mlb-v3-production.yml`

It is the **only automatic scheduler/orchestrator for the V3 production chain**.

```text
Load All MLB Phase 1
        |
        +--------------------+
        |                    |
        v                    v
Load MLB Statcast      Load V3 Hit Actuals
        |
        v
Refresh MLB V3 Features
        |                    |
        +---------+----------+
                  |
                  v
          Run V3 Hit Model
                  |
                  v
 Refresh MLB Hit Board Performance
```

In dependency form:

```text
Phase 1
  ├──> Statcast ──> V3 Features ──┐
  │                               ├──> V3 Model ──> Performance
  └──> V3 Actuals ────────────────┘
```

## Why the Pipeline Was Changed

Previously, several workflows used independent `schedule` and `workflow_run` triggers.

The V3 workflow could therefore wake when **either** V3 Actuals or V3 Features completed. A JavaScript readiness gate then checked whether both prerequisites were ready.

That design created misleading runs:

- A prerequisite could finish before the other.
- `Run V3 Hit Model` would wake too early.
- The readiness gate would correctly skip the actual model job.
- The parent workflow could still appear successful/green.
- Downstream Performance could interpret that green parent workflow as a successful model run.

The new architecture removes that event-driven race condition.

GitHub Actions now enforces the production order directly through `needs:` dependencies.

## Critical V3 Dependency

The V3 model must not run until **both** prerequisite branches have completed successfully:

```yaml
v3_model:
  needs: [actuals, features]
```

This means:

- V3 Actuals must finish.
- V3 Features must finish.
- If either fails, V3 does not run.
- Performance cannot run unless V3 itself succeeds.

## Workflow Responsibilities

### 1. Load All MLB Phase 1

Primary upstream MLB data load.

This workflow feeds both branches of the V3 pipeline.

Production behavior:

- Runs first in the master pipeline.
- Must complete successfully before Statcast or Actuals starts.
- Remains manually runnable through `workflow_dispatch`.
- Is reusable through `workflow_call`.
- Does not independently schedule the V3 production chain.

### 2. Load MLB Statcast

Loads the Statcast data needed by the V3 feature pipeline.

Dependency:

```text
Phase 1 -> Statcast
```

Production behavior:

- Starts only after Phase 1 succeeds.
- Allows a legitimate MLB-wide off day to complete without incorrectly failing the production pipeline.
- Remains manually runnable for troubleshooting/backfills.

### 3. Load V3 Hit Actuals

Closes/evaluates the prior prediction day.

Dependency:

```text
Phase 1 -> V3 Actuals
```

Important behavior:

- Normally targets the prior Eastern-date prediction run.
- If a prior date had eligible games but no legitimate V3 prediction run, it classifies that date as a missing V3 prediction day and does not fabricate historical predictions.
- A missing prior V3 run must not deadlock today's production model.
- Explicit historical/manual actuals requests remain strict.

### 4. Refresh MLB V3 Features

Builds/refreshes the current-date feature source required for V3 scoring.

Dependency:

```text
Phase 1 -> Statcast -> V3 Features
```

Important behavior:

- Must successfully finish before V3 scoring begins.
- Existing feature-refresh locking/retry/polling logic remains in place.
- The workflow no longer independently wakes V3.

### 5. Run V3 Hit Model

Trains/scores the V3 `hit_1plus` model and publishes the official current-date predictions.

Dependencies:

```text
V3 Actuals ----\
                > Run V3 Hit Model
V3 Features ---/
```

The model workflow retains its internal defensive validations, including:

- Previous V3 actuals validation
- Current V3 feature-source validation
- Training/scoring
- Prediction validation
- Official run activation
- Model-agnostic feature-contribution validation
- Player drawer explanation refresh/validation
- V3 hit-board serving-cache publication

These checks are **data-integrity safeguards**, not workflow orchestration.

The old `once-daily-gate`, prerequisite workflow-history lookup, independent schedule, and `workflow_run` triggers are no longer needed in this workflow.

### 6. Refresh MLB Hit Board Performance

Runs only after the actual V3 model workflow succeeds.

Dependency:

```text
V3 Model -> Performance
```

This prevents Performance from running merely because a V3 parent workflow appeared green while the model job itself was skipped.

## Automatic vs. Manual Runs

### Automatic production

Use:

`Daily MLB V3 Production Pipeline`

This is the authoritative production path.

Do not add separate automatic schedules or `workflow_run` triggers back to the child workflows.

### Manual troubleshooting

Individual child workflows retain `workflow_dispatch`.

They may be run manually when:

- troubleshooting a specific stage
- testing a fix
- intentionally refreshing data
- performing a supported backfill

A manual child run does **not** replace the dependency guarantees of the master production pipeline.

## Reusable Workflows

The child workflows expose `workflow_call` so the master pipeline can call them directly.

The master workflow should call the local workflow files using:

```yaml
uses: ./.github/workflows/<workflow-file>.yml
secrets: inherit
```

The master workflow owns the production dependency graph.

## Concurrency

Keep concurrency protection on workflows that can perform expensive or conflicting writes.

The goal is:

- no overlapping production pipelines
- no duplicate feature refresh ownership
- no competing V3 scoring runs
- no duplicate serving-cache refreshes

The master pipeline should use a production-level concurrency group such as:

```yaml
concurrency:
  group: daily-mlb-v3-production
  cancel-in-progress: false
```

## Interpreting Pipeline Status

With the new architecture, the master workflow is the primary health signal.

### Green master pipeline

A green production run should mean the required chain completed successfully:

```text
Phase 1
Statcast
V3 Actuals
V3 Features
V3 Model
Performance
```

### Red master pipeline

A failed stage should block its dependent stages.

Examples:

```text
Statcast fails
   ↓
Features blocked
   ↓
V3 blocked
   ↓
Performance blocked
```

or:

```text
Actuals fails
   ↓
V3 blocked
   ↓
Performance blocked
```

A blocked downstream job is expected behavior when its prerequisite failed.

## MLB Off Days

A legitimate no-game day should not be treated the same as a broken data pipeline.

Existing scripts and database status checks should distinguish:

- `no_eligible_games`
- missing/stale required data
- missing historical V3 prediction run
- infrastructure/query failure

Do not create fake predictions simply to make an off-day or missed historical run appear complete.

## Data Integrity Rules

The production chain should continue to fail loudly when current-date required data is unexpectedly missing.

Examples:

- eligible games exist but current V3 features are absent
- model finishes but writes zero predictions
- activation produces zero active rows
- feature-contribution coverage is below the required threshold
- drawer explanations are incomplete
- serving cache is not ready for the target date

The master DAG fixes **ordering**. It should not weaken these validations.

## Expected Daily Validation

After a successful V3 production run, verify that:

- the daily pipeline status is complete
- current-date V3 feature rows exist
- current-date V3 prediction rows exist
- exactly one official V3 model run is active
- active predictions cover the expected games
- the Top 25 contains exactly 25 rows when at least 25 eligible predictions exist
- duplicate matchup keys are zero
- serving cache is ready for the current prediction date
- Performance refresh completed after V3

## Important Maintenance Rule

**Do not reintroduce orchestration into the child workflows.**

Avoid adding:

```yaml
workflow_run:
```

or independent production:

```yaml
schedule:
```

triggers to:

- Load V3 Hit Actuals
- Refresh MLB V3 Features
- Run V3 Hit Model
- Refresh MLB Hit Board Performance

The master workflow owns their order.

If timing changes are needed, change the master workflow rather than creating competing schedules.

## Troubleshooting Order

When the production pipeline fails, inspect the **first failed job**, not the downstream skipped jobs.

Recommended order:

```text
1. Phase 1
2. Statcast / Actuals
3. Features
4. V3 Model
5. Performance
```

For V3 specifically, verify:

```text
eligible games
    ↓
current V3 features
    ↓
model run
    ↓
active predictions
    ↓
feature contributions
    ↓
drawer explanations
    ↓
serving cache
```

## Design Principle

The production architecture follows one rule:

> **One scheduled production workflow, one dependency graph, one authoritative green/red result.**

GitHub Actions controls workflow ordering with `needs:`.

Supabase/script preflights protect data integrity.

Those responsibilities should remain separate.
