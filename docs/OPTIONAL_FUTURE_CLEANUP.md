# MLB Hit Lab — Optional Future Cleanup Plan

## Purpose

This document captures the remaining cleanup and maintainability work that is **not required for the current application to function**, but would be valuable to complete in the near future.

The major dead-code cleanup is already complete:

- unreachable compare board removed
- legacy V1/V2 standalone board paths removed
- shadowed legacy Model Performance implementation removed
- duplicate Model Performance loading path removed
- active V2 enrichment, V3 prediction flows, Market Edge, and V1/V2/V3 Model Performance preserved

The current `app-v4.js` is much smaller and easier to reason about, but it is still a large single-file frontend. The items below should be handled carefully and in separate, reviewable phases.

---

## Current Working Assumptions

Before starting any optional cleanup, verify the current production behavior:

- MLB Hit Board loads successfully
- Reds Hit Board loads successfully
- Market Edge loads successfully
- Model Performance loads successfully
- V1, V2, and V3 performance selectors work
- player drawers open correctly
- refresh works on all views
- browser console has no unexpected errors
- no duplicate Model Performance requests occur

Do not proceed with a new cleanup phase until the current version has been stable in production.

---

# Phase 1 — Repository Housekeeping

## Goal

Remove temporary cleanup tooling and documentation that is no longer needed for normal operation.

## Candidate files

Review the repository for temporary files such as:

- `apply_green_cleanup.py`
- `green_cleanup.patch`
- temporary GitHub Actions cleanup workflows
- temporary cleanup README files
- backup files ending in `.bak`
- one-time validation scripts
- duplicate downloaded copies of `app-v4.js` or `index.html`

## Steps

1. Search the repository root and `.github/workflows/`.
2. Identify files created only for the cleanup process.
3. Confirm they are not referenced by:
   - GitHub Actions
   - documentation
   - package scripts
   - deployment steps
4. Delete only confirmed one-time files.
5. Commit this as a standalone housekeeping change.

## Validation

- GitHub Actions still load correctly
- no deployment workflow references a deleted file
- production UI is unchanged
- no runtime files are removed

## Suggested commit message

```text
Remove temporary cleanup tooling and artifacts
```

---

# Phase 2 — Frontend Cache Version Bump

## Goal

Force browsers and GitHub Pages to retrieve the latest JavaScript and CSS instead of using cached assets.

## Current areas to inspect

Look for version strings in:

- `app-v4.js`
- `index.html`
- stylesheet query parameters
- script query parameters
- console version messages

Example current pattern:

```text
v3-only-ui-focus-v5-1
```

Recommended next pattern:

```text
v3-only-dead-code-cleanup-v6
```

## Steps

1. Update the version string in the `console.info()` message.
2. Update the CSS query string in `index.html`.
3. Update the JavaScript query string in `index.html`.
4. Confirm all references use the exact same version.
5. Commit separately from functional changes.

## Validation

- hard refresh loads the new version
- browser network tab shows the updated query string
- no stale JavaScript remains cached
- UI behavior is unchanged

## Suggested commit message

```text
Bump frontend cache version after cleanup
```

---

# Phase 3 — Final Dead-Reference Audit

## Goal

Confirm that no stale references remain from removed systems.

## Search terms

Search the repository for terms related to deleted functionality:

```text
modelCompare
modelCompareView
modelCompareContent
compareBoard
compareWindow
experimentalScore
experimentalBoardRows
renderModelComparePage
loadModelCompareData
performanceSummary
topPickPerformance
componentAnalysis
yesterdayTopPick
rankAnalysisRows
renderPerformanceWindowSelector
renderMlbHitBoardPerformanceSection
renderPerformanceScopeSelector
```

## Steps

1. Search `app-v4.js`.
2. Search `index.html`.
3. Search `styles.css`.
4. Search GitHub Actions and documentation.
5. Classify each remaining match as:
   - active and required
   - stale documentation
   - unused code
   - shared CSS
6. Delete only references proven to be unused.

## Important caution

Do not remove shared helpers or CSS classes simply because they were used by deleted features. Many classes and functions are reused by active views.

## Validation

- all removed-feature terms have zero active-code matches
- active V2 and V3 code remains
- Model Performance selectors remain
- syntax validation passes

---

# Phase 4 — CSS Usage Audit

## Goal

Reduce unused CSS without breaking shared layout or visual components.

## Why this is higher risk

The removed compare and legacy performance pages reused many shared classes. A class that appears associated with old functionality may still be used by:

- MLB Hit Board
- Reds Hit Board
- Market Edge
- Model Performance
- player drawers
- mobile layouts

## Recommended approach

Do not bulk-delete CSS.

Audit selectors in small groups:

1. compare-specific selectors
2. legacy performance selectors
3. old navigation selectors
4. unused utility classes
5. duplicate declarations

## Steps

1. Search each selector in:
   - `index.html`
   - `app-v4.js`
   - dynamically generated template strings
2. Check whether the selector appears only in deleted markup.
3. Remove a small group of selectors.
4. Test desktop and mobile layouts.
5. Commit each safe group separately.

## Validation checklist

- sidebar layout
- responsive navigation
- table scrolling
- row highlighting
- drawers and backdrops
- Model Performance cards
- Market Edge badges
- MLB and Reds board tables
- mobile viewport behavior

## Suggested commit message

```text
Remove confirmed unused frontend styles
```

---

# Phase 5 — Split `app-v4.js` Into Modules

## Goal

Improve maintainability by separating the large frontend file into focused modules.

## Important constraint

Do not start this until the cleaned single-file version has been stable.

This is a structural refactor, not a dead-code deletion. It should preserve behavior exactly.

## Recommended module boundaries

### `core.js`

Shared utilities and application initialization:

- Supabase client
- DOM helpers
- formatting helpers
- global constants
- navigation
- common event wiring

### `reds-board.js`

Reds-specific functionality:

- Reds data loaders
- matchup data
- hot hitter data
- Reds filters
- Reds board rendering
- Reds drawer logic

### `mlb-board.js`

MLB V3 board functionality:

- MLB V3 loader
- V2 enrichment merge
- board ranking and rendering
- MLB drawer logic
- consensus rendering

### `market-edge.js`

Market Edge functionality:

- market data loading
- health data
- edge calculations
- edge rendering
- Market Edge drawer

### `model-performance.js`

Model Performance functionality:

- cache loading
- V1/V2/V3 selectors
- scorecard
- stability
- bucket optimizer
- feature importance
- self-test

### `drawers.js`

Shared drawer behavior:

- open and close behavior
- backdrops
- shared drawer formatting
- reusable drawer helpers

## Migration strategy

Use a phased extraction:

1. Extract pure utility functions first.
2. Extract one self-contained view.
3. Confirm no global ordering issues.
4. Continue one module at a time.
5. Keep commits small and reversible.

## Browser-loading options

Choose one approach:

### Option A — Native ES modules

Use:

```html
<script type="module" src="./js/main.js"></script>
```

Advantages:

- clean imports and exports
- explicit dependencies
- modern browser support

Risks:

- requires careful migration of globals
- module scope changes behavior
- script loading order must be handled correctly

### Option B — Multiple classic scripts

Use several normal script tags in dependency order.

Advantages:

- lower migration risk
- fewer code changes initially

Risks:

- globals remain shared
- dependencies are less explicit

## Recommendation

Start with multiple classic scripts if the main goal is low-risk organization. Move to ES modules later after the boundaries are stable.

## Validation

After each extraction:

- run JavaScript syntax checks
- verify the affected page
- verify shared navigation
- verify refresh behavior
- verify drawers
- confirm no console errors
- confirm Supabase requests are unchanged

## Suggested commit sequence

```text
Extract shared frontend utilities
Extract Reds board module
Extract MLB board module
Extract Market Edge module
Extract Model Performance module
Extract shared drawer module
```

---

# Phase 6 — Automated Frontend Smoke Tests

## Goal

Create a lightweight safety net for future cleanup and feature work.

## Minimum recommended coverage

Automate checks for:

- app loads
- MLB Hit Board becomes visible
- Reds Hit Board navigation works
- Market Edge navigation works
- Model Performance navigation works
- V1/V2/V3 selector buttons render
- player row click opens drawer
- refresh button works
- no uncaught JavaScript errors

## Tool options

### Playwright

Recommended for browser-based testing.

Good for:

- page navigation
- DOM assertions
- network monitoring
- browser console checks
- screenshots on failure

### Cypress

Also viable, but Playwright may be simpler for lightweight GitHub Actions coverage.

## Suggested first test suite

```text
tests/
  app-load.spec.js
  navigation.spec.js
  drawers.spec.js
  model-performance.spec.js
```

## GitHub Actions integration

Add a workflow that:

1. checks out the repository
2. starts a local static web server
3. installs Playwright
4. runs smoke tests
5. uploads failure screenshots and traces

## Important caution

If tests depend on live Supabase data, they may be flaky.

Prefer one of these approaches:

- mock Supabase responses
- use a stable test view
- assert structure and navigation rather than exact player names
- allow empty-state responses where appropriate

## Suggested commit message

```text
Add frontend smoke tests for core views
```

---

# Phase 7 — Supabase Dependency Inventory

## Goal

Document which frontend features depend on which Supabase views, tables, and RPCs.

This is documentation first. It is not a deletion exercise.

## Build a dependency table

Recommended columns:

| Frontend feature | Function | Supabase object | Type | Still active | Notes |
|---|---|---|---|---|---|
| Reds Hit Board | `loadHotData` | `get_team_hot_hitters` | RPC | Yes | Shared with Reds board |
| Reds Matchups | `loadMatchupData` | `get_today_reds_batter_matchups` | RPC | Yes | Active |
| V2 enrichment | `loadV2Enhancements` | `v_today_mlb_batter_matchups_v2` | View | Yes | Supports V3 |
| Model Performance | `loadModelPerformanceData` | `mlb_model_performance_page_cache` | Table/View | Yes | Active cache |
| V3 features | `loadModelPerformanceData` | `v_mlb_v3_model_feature_importance` | View | Yes | Live V3 source |

## Steps

1. Search every `.from()` call.
2. Search every `.rpc()` call.
3. Map each call to a frontend feature.
4. Mark whether it is active.
5. Check GitHub workflows for additional usage.
6. Check other applications before considering database deletion.

## Important caution

Do not delete Supabase objects solely because the frontend no longer calls them.

They may still support:

- data pipelines
- scheduled workflows
- historical reporting
- validation
- external dashboards
- future rollback needs

---

# Phase 8 — Database Object Retirement Review

## Goal

Only after completing the dependency inventory, identify database objects that may be safe to archive or retire.

## Required checks before deletion

For each candidate object:

1. Search the entire GitHub repository.
2. Search GitHub Actions.
3. Search Supabase functions and views.
4. Check dependency chains in PostgreSQL.
5. Check scheduled jobs.
6. Confirm no external consumer exists.
7. Export the object definition.
8. document rollback steps.
9. retire one object at a time.

## Safer alternatives to immediate deletion

- rename with a `_deprecated` suffix
- revoke public access
- archive the SQL definition
- add a deprecation comment
- monitor usage before removal

## Rule

No database object should be deleted during a frontend cleanup unless its full dependency chain is understood.

---

# Recommended Execution Order

Complete these in this order:

1. repository housekeeping
2. cache version bump
3. final dead-reference audit
4. CSS usage audit
5. automated smoke tests
6. frontend modularization
7. Supabase dependency inventory
8. database retirement review

The smoke tests should ideally be added before large modularization work.

---

# Definition of Done

The optional cleanup program is complete when:

- temporary cleanup artifacts are removed
- frontend cache version is current
- no stale compare or legacy-performance references remain
- confirmed unused CSS is removed
- `app-v4.js` is split into understandable modules
- core UI flows have automated smoke tests
- Supabase dependencies are documented
- no database object is retired without a documented dependency review
- production UI behavior remains unchanged

---

# Guardrails for Future Work

Always preserve:

- V3 as the active prediction model
- V2 enrichment used inside V3
- V1 and V2 visibility in Model Performance
- Market Edge
- V3 drawer explanations
- Reds supporting context
- historical performance data
- Supabase auditability and rollback options

Avoid combining:

- dead-code deletion
- UI redesign
- database changes
- workflow changes
- module refactoring

Each should be handled in a separate, reviewable change.

---

# Suggested Future Starting Prompt

When resuming this work, use:

```text
Read OPTIONAL_FUTURE_CLEANUP.md and audit the latest GitHub main branch before making changes. Start with the next incomplete phase, identify exact files and symbols involved, classify each item as safe, shared, or uncertain, and do not modify anything until the audit is complete.
```
