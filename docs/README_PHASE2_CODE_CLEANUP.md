# Phase 2 Code Cleanup Plan

## Purpose

This document captures the planned **Phase 2 dead-code cleanup** for the MLB Hit Lab frontend after the V3-only UI change has been validated in production.

The goal is to remove legacy V1/V2 board-mode code that is no longer reachable from the user interface, while preserving:

- V3 as the only active prediction experience on the MLB Hit Board and Reds Hit Board
- V2 supporting data used inside the V3 experience, such as consensus ranks and matchup context
- V1 and V2 data on the Model Performance page for historical comparison and benchmarking
- All backend tables, views, pipelines, and performance history unless separately approved for retirement

This cleanup should be treated as a **frontend maintainability change**, not a model retirement or database cleanup.

---

## Background

Phase 1 removed the standalone legacy model-selection controls from the main user experience:

- `Classic Score` was removed from the Reds Hit Board
- `Recommended` was removed from the MLB Hit Board
- Both boards now render V3 as the only selectable prediction model
- V1 and V2 remain visible on the Model Performance page
- V2 may still appear as supporting context within V3, including consensus ranks or supplemental matchup fields

Because Phase 1 prioritized a safe rollout, some legacy JavaScript variables, loading functions, rendering functions, drawer handlers, and CSS may still exist even though the UI can no longer call them.

Phase 2 removes that unreachable code after the V3-only experience has been proven stable.

---

# Scope

## In scope

The cleanup should target legacy frontend code related to standalone Classic or Recommended board modes.

Primary cleanup targets:

- `redsClassicRows`
- `mlbClassicRows`
- Classic loading functions
- Classic rendering functions
- Classic drawer handlers
- legacy mode variables
- legacy mode click handlers
- conditional branches that switch between V3 and Classic/Recommended views
- CSS selectors used only by removed Classic/Recommended UI controls
- stale comments, labels, console messages, or helper code that only supported the removed model modes

## Out of scope

Do **not** remove the following without a separate review:

- V1, V2, or V3 data from Supabase
- Model Performance page support for V1 and V2
- V2 enhancement data used by V3
- V2 consensus ranks or supporting badges
- shared matchup-score fields that remain inputs or fallbacks
- database tables, views, functions, workflows, or historical results
- generic shared CSS used by active V3 controls, cards, tables, or segmented buttons elsewhere in the application

The cleanup must distinguish between:

1. **V1/V2 as standalone selectable UI modes**  
   These should be removed.

2. **V1/V2 data used as supporting context, benchmark data, or performance comparison**  
   These should remain.

---

# Target Files

The primary files expected to change are:

```text
app-v4.js
styles.css
index.html
```

Most cleanup should occur in `app-v4.js`.

`styles.css` should only be changed after confirming selectors are genuinely unused.

`index.html` may only need comment cleanup or cache-version updates unless static legacy markup is still present.

---

# Detailed Cleanup Tasks

## 1. Remove legacy row-state variables

Search for and remove:

```javascript
let redsClassicRows = [];
let mlbClassicRows = [];
```

Before deleting them, identify every reference.

Recommended search:

```bash
grep -n "redsClassicRows\|mlbClassicRows" app-v4.js
```

Expected result after cleanup:

```text
No matches
```

Do not replace them with new aliases unless active V3 functionality requires it.

---

## 2. Remove unused mode variables

Legacy mode variables may include:

```javascript
let redsBoardMode = "ml";
let mlbBoardMode = "ml";
```

Also review any constants or local variables that exist solely to support mode switching.

Before removal:

- confirm the active page always renders V3
- confirm no remaining function reads these values
- confirm no refresh handler depends on them
- confirm no page-title or subtitle logic branches on them

Recommended search:

```bash
grep -n "redsBoardMode\|mlbBoardMode\|data-reds-mode\|data-mlb-mode" app-v4.js index.html
```

Expected result after cleanup:

```text
No legacy board-mode controls or runtime mode branches remain
```

A constant such as:

```javascript
const MLB_BOARD_MODE = "ml";
```

should also be removed if it no longer serves a meaningful purpose.

---

## 3. Remove Classic loading functions

Delete functions that load data only for the removed standalone Classic or Recommended board views.

Possible targets may include names similar to:

```javascript
loadRedsClassicData()
loadMlbClassicData()
loadClassicBoardData()
loadRecommendedBoardData()
```

Function names may differ, so search semantically as well as by exact name.

Recommended searches:

```bash
grep -n "Classic" app-v4.js
grep -n "Recommended" app-v4.js
grep -n "load.*classic\|load.*recommended" app-v4.js
```

For each candidate function, confirm:

- it is not called by Model Performance
- it is not used to enrich V3 rows
- it does not provide shared player-detail data
- it is not part of initial page load or refresh logic

Delete both:

- the function definition
- every call site
- related error messages
- loading-state text that references the removed view

---

## 4. Remove Classic rendering functions

Delete rendering functions that produce legacy standalone boards.

Possible targets may include names similar to:

```javascript
renderRedsClassicRows()
renderMlbClassicRows()
renderClassicBoard()
renderRecommendedBoard()
```

Also remove helper functions used only by those renderers.

For each function:

1. Search all references.
2. Confirm it is unreachable from active V3 views.
3. Confirm it is not reused by Model Performance.
4. Delete the function and associated helper code.

Recommended command:

```bash
grep -n "render.*Classic\|render.*Recommended" app-v4.js
```

After deletion, confirm the active board render paths are direct and easy to follow:

```text
load V3 data
    ↓
store V3 rows
    ↓
render V3 board
```

There should be no remaining branch like:

```javascript
if (boardMode === "classic") {
  renderClassic...
} else {
  renderV3...
}
```

---

## 5. Remove legacy drawer handlers

Delete drawer functions used only by Classic or Recommended board rows.

Possible targets may include:

```javascript
openRedsClassicDrawer()
openMlbClassicDrawer()
openClassicDrawer()
```

Also remove:

- click-handler branches that call them
- dataset attributes used only to identify Classic rows
- drawer reset logic used only for removed modes
- static drawer labels that are no longer reachable

Be careful not to remove:

- V3 player drawer logic
- shared drawer close/backdrop behavior
- shared formatting helpers
- V2 supporting fields still shown inside the V3 drawer

Recommended searches:

```bash
grep -n "ClassicDrawer\|classic-drawer\|drawer.*classic" app-v4.js index.html styles.css
```

Expected result after cleanup:

```text
Only V3 or shared drawer paths remain
```

---

## 6. Remove legacy mode event handlers

Search for event listeners involving:

```text
data-reds-mode
data-mlb-mode
Classic Score
Recommended
```

Delete:

- delegated click handlers
- mode-state updates
- active-button class changes
- local-storage or state persistence for removed modes
- rerender calls triggered only by model switching

Recommended searches:

```bash
grep -n "data-reds-mode\|data-mlb-mode" app-v4.js index.html
grep -n "Classic Score\|Recommended" app-v4.js index.html
```

Expected result after cleanup:

- no mode-switch buttons
- no mode-switch click handlers
- no active-mode styling logic
- no hidden legacy route remaining in the DOM

---

## 7. Simplify refresh and navigation logic

Review page navigation and refresh handlers.

Before cleanup, logic may contain branches such as:

```javascript
if (mlbBoardMode === "classic") {
  loadMlbClassicData();
} else {
  loadMlbHitBoardData();
}
```

Replace with direct V3 behavior:

```javascript
loadMlbHitBoardData();
```

Do the same for Reds.

Review these flows:

- initial app load
- sidebar navigation
- page refresh button
- team filter changes
- search updates
- drawer open behavior
- returning to a previously visited view

Acceptance condition:

```text
Every active board route resolves directly to V3 without mode evaluation.
```

---

## 8. Review V1/V2 helper functions carefully

Some helper functions may still reference V1 or V2 but remain valid.

Examples include:

- V2 score merging
- V2 consensus ranking
- matchup-score fallbacks
- V1/V2 performance comparisons
- model labels in the Model Performance page

Do not delete a helper simply because its name contains `V1`, `V2`, `Classic`, or `Recommended`.

For each helper, classify it:

| Classification | Action |
|---|---|
| Standalone removed board mode | Delete |
| V3 supporting context | Keep |
| Model Performance comparison | Keep |
| Shared formatting or ranking | Keep |
| Unclear | Trace all call sites before deciding |

A useful rule:

> If deleting the function would remove information currently visible on the V3 board or Model Performance page, it is not dead code.

---

# CSS Cleanup

## Objective

Remove CSS only when it is proven to support deleted markup and has no active consumers.

## Safe CSS cleanup candidates

Possible candidates include selectors exclusively tied to:

- legacy Classic/Recommended model toggle buttons
- inactive-state styling for removed model buttons
- Classic board-specific columns
- Classic drawer sections
- hidden legacy layouts that are no longer rendered

## Do not remove shared selectors without proof

Shared classes such as these may still be active:

```css
.segmented
.segment
.segment.active
.control-deck
.board-card
.table-wrap
.drawer-section
```

Even if they were previously used by the model switcher, they may also support:

- team filters
- time-window selectors
- performance filters
- other active controls

## CSS validation method

For each candidate selector:

1. Search `index.html`.
2. Search `app-v4.js` template strings.
3. Search `styles.css` for dependent selectors.
4. Confirm no active DOM uses the class.
5. Remove only after all references are gone.

Recommended commands:

```bash
grep -Rni "selector-name" index.html app-v4.js styles.css
```

Consider doing CSS cleanup in a separate commit after JavaScript cleanup. That makes regressions easier to isolate.

---

# Suggested Work Sequence

## Step 1: Create a cleanup branch

Example:

```bash
git checkout -b cleanup/v3-only-dead-code
```

## Step 2: Record the current baseline

Before changes:

```bash
node --check app-v4.js
grep -n "redsClassicRows\|mlbClassicRows" app-v4.js
grep -n "data-reds-mode\|data-mlb-mode" app-v4.js index.html
grep -n "Classic Score\|Recommended" app-v4.js index.html
```

Capture screenshots of:

- MLB Hit Board
- Reds Hit Board
- Market Edge
- Model Performance
- V3 player drawer

## Step 3: Remove state and event-handler code

Start with:

- legacy row arrays
- mode variables
- mode click handlers
- navigation branches
- refresh branches

Run syntax validation.

## Step 4: Remove loaders and renderers

Delete unreachable Classic/Recommended:

- loading functions
- rendering functions
- row templates
- drawer functions
- supporting helpers used only by those functions

Run syntax validation again.

## Step 5: Remove unused CSS

Only after active functionality is stable.

## Step 6: Update cache-busting version

Update both references in `index.html`:

```html
<link rel="stylesheet" href="styles.css?v=NEW_VERSION" />
<script src="./app-v4.js?v=NEW_VERSION"></script>
```

Also update the JavaScript startup log:

```javascript
console.info("MLB Hit Lab app-v4 loaded: NEW_VERSION");
```

Use the same version string in all three places.

Suggested version:

```text
v3-only-dead-code-cleanup-v6
```

---

# Validation Checklist

## Static validation

Run:

```bash
node --check app-v4.js
```

Expected result:

```text
No output and exit code 0
```

Search for removed state:

```bash
grep -n "redsClassicRows\|mlbClassicRows" app-v4.js
```

Expected:

```text
No matches
```

Search for removed modes:

```bash
grep -n "redsBoardMode\|mlbBoardMode\|data-reds-mode\|data-mlb-mode" app-v4.js index.html
```

Expected:

```text
No matches
```

Search for removed UI labels:

```bash
grep -n "Classic Score\|Recommended" app-v4.js index.html
```

Expected:

- no standalone board-button matches
- allowed matches only when clearly part of Model Performance naming, such as `V2 Recommended`

Search for Classic drawer paths:

```bash
grep -n "ClassicDrawer\|open.*Classic\|render.*Classic\|load.*Classic" app-v4.js
```

Expected:

```text
No standalone Classic board or drawer functions
```

## Cache-version validation

Run:

```bash
grep -n "v3-only-dead-code-cleanup-v6" index.html app-v4.js
```

Expected:

- stylesheet query string
- script query string
- JavaScript console version

---

# Functional Testing

## MLB Hit Board

Confirm:

- page loads without errors
- no Recommended toggle appears
- V3 rankings load
- sort behavior works
- search works
- consensus cards still show valid supporting V2/V3 badges where intended
- player drawer opens
- player drawer uses V3 explanations
- refresh works
- no failed Classic/Recommended network request appears

## Reds Hit Board

Confirm:

- page loads without errors
- no Classic Score toggle appears
- V3 rankings load
- All/Reds/Opponent filter works
- search works
- player drawer opens
- refresh works
- no Classic board request appears

## Market Edge

Confirm:

- page loads
- odds render
- sportsbook names render
- V3 model edge data remains unchanged

## Model Performance

Confirm:

- V1 is still visible
- V2 is still visible
- V3 is still visible
- filters still work
- Last 7, Last 14, Last 30, and Season values render
- model scorecard loads
- model stability cards load
- feature and bucket comparisons still load

This is the most important regression test because V1/V2 must remain available here.

## Navigation

Confirm repeated switching among:

```text
MLB Hit Board
Reds Hit Board
Market Edge
Model Performance
```

Verify no stale content, duplicate handlers, or console exceptions occur.

## Browser console

Expected:

- no `ReferenceError`
- no undefined Classic variables
- no missing function errors
- no failed DOM lookups caused by deleted controls
- no duplicate event listener behavior

## Network panel

Expected:

- V3 board requests remain
- V3 drawer requests remain
- performance-page requests remain
- no Classic-only board requests are made
- no unnecessary duplicate request appears after navigation

---

# Regression Risks

## Risk 1: Removing V2 support accidentally

V2 may still support:

- consensus ranking
- supplementary badges
- matchup context
- Model Performance comparisons

Mitigation:

- trace every V2 helper before removal
- test consensus cards after cleanup
- test Model Performance separately

## Risk 2: Removing shared Classic-named helpers

Some older helpers may have misleading names but still supply shared matchup fields.

Mitigation:

- search every call site
- inspect the output consumed by V3
- rename a shared helper instead of deleting it when appropriate

## Risk 3: Breaking delegated click handling

A deleted branch inside a shared click listener can leave malformed control flow.

Mitigation:

- run `node --check`
- click all active filters and rows
- test navigation repeatedly

## Risk 4: Removing shared CSS

Selectors such as `.segment` may still be used by team or performance filters.

Mitigation:

- only delete selectors with zero active references
- keep CSS cleanup in a separate commit when possible

## Risk 5: Stale browser assets

A correct code change may appear broken if GitHub Pages or the browser uses old assets.

Mitigation:

- update the shared cache-version string
- hard refresh after deployment
- verify the startup version in the browser console

---

# Acceptance Criteria

Phase 2 is complete only when all of the following are true:

- [ ] MLB Hit Board is V3-only
- [ ] Reds Hit Board is V3-only
- [ ] Market Edge remains V3-only
- [ ] V1 and V2 remain visible on Model Performance
- [ ] `redsClassicRows` is removed
- [ ] `mlbClassicRows` is removed
- [ ] unused board-mode variables are removed
- [ ] Classic loading functions are removed
- [ ] Classic rendering functions are removed
- [ ] Classic drawer handlers are removed
- [ ] legacy mode click handlers are removed
- [ ] no Classic-only board requests are made
- [ ] no unused Classic-only CSS remains
- [ ] JavaScript syntax validation passes
- [ ] all four pages load without console errors
- [ ] V3 player drawer works
- [ ] V2/V3 consensus context still works
- [ ] Model Performance still compares V1, V2, and V3
- [ ] cache-busting version is updated consistently
- [ ] production screenshots match the expected V3-only experience

---

# Rollback Plan

Keep the cleanup in a dedicated commit.

Example:

```bash
git add index.html app-v4.js styles.css README_PHASE2_CODE_CLEANUP.md
git commit -m "Remove dead Classic and Recommended board code"
```

If a regression is discovered:

```bash
git revert <commit_sha>
```

Because Phase 2 should not modify Supabase objects or database pipelines, rollback should require only restoring the previous frontend files.

---

# Recommended Commit Structure

A clean approach would use separate commits:

```text
1. Remove legacy board state and mode handlers
2. Remove Classic loaders, renderers, and drawer paths
3. Remove unused Classic-only CSS
4. Update cache version and cleanup documentation
```

This makes review and rollback easier than one large mixed commit.

---

# Final Design Principle

The application should have one clear prediction experience:

```text
V3 powers the active product.
V2 may support V3 context.
V1 and V2 remain available for performance comparison.
```

The final frontend should not contain alternate standalone recommendation experiences that users can no longer access.
