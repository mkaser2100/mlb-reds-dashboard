# Reds Cleanup Plan

This document tracks the remaining cleanup required after the Team Hit Board was generalized from the former Reds-only implementation.

The cleanup should be completed in controlled releases. Do not remove database objects, compatibility wrappers, or GitHub workflows until their consumers have been identified and replacement behavior has been validated.

---

## Current State

Completed:

- The Team Hit Board supports any MLB game.
- The UI reads from:
  - `v_mlb_v3_game_selector`
  - `v_mlb_v3_game_hit_board_cache`
- Generic frontend names are authoritative.
- Legacy Reds-specific frontend wrappers and database views remain available for compatibility and rollback.
- The generic and legacy Reds board results were previously validated for parity.

Still remaining:

1. Remove legacy Reds-specific UI compatibility code.
2. Refactor or retire Reds-specific Supabase views.
3. Review GitHub workflows and scripts with Reds-specific names or behavior.
4. Update documentation and repository naming.
5. Remove obsolete objects only after an observation and rollback period.

---

# 1. UI Cleanup

## Phase 4B — Remove frontend compatibility code

The Phase 4A release intentionally retained compatibility paths. After the generic version has run successfully for several game days, remove the following.

### Legacy state accessors

Remove the compatibility properties exposed on `window`:

```javascript
window.redsTeamFilter
window.redsMlRows
window.redsGameHotRows
```

Generic replacements:

```javascript
selectedTeamSide
teamGameRows
teamGameHotRows
```

### Legacy function wrappers

Remove wrappers only after confirming they have no callers:

```javascript
loadRedsGameBoardData()
renderRedsBoardControls()
renderRedsMlRows()
openRedsV3Drawer()
```

Generic replacements:

```javascript
loadTeamGameBoardData()
renderTeamBoardControls()
renderTeamMlRows()
openTeamV3Drawer()
```

### Legacy DOM fallback support

Remove fallback mappings for old IDs:

```text
redsBoardControls
redsBoardEyebrow
redsBoardTitle
redsBoardTableWrap
```

Generic IDs:

```text
teamBoardControls
teamBoardEyebrow
teamBoardTitle
teamBoardTableWrap
```

### Legacy data attributes

Remove support for:

```html
data-reds-v3-player-id
data-reds-team-filter
```

Retain only generic attributes such as:

```html
data-team-v3-player-id
```

### UI search checklist

Search the frontend for:

```text
redsBoard
redsMlRows
redsGameHotRows
redsTeamFilter
loadRedsGameBoardData
renderRedsBoardControls
renderRedsMlRows
openRedsV3Drawer
data-reds-
Reds Hit Board
Reds-only
```

Classify every result before deleting it:

- obsolete Team Hit Board compatibility code
- legitimate Reds team content
- documentation
- unrelated Reds-specific feature

Do not globally replace every use of `reds`. The application may still contain legitimate Cincinnati Reds branding, team filters, matchup logic, or team-specific data loaders.

---

# 2. Supabase Cleanup

## Legacy views currently retained

The following legacy views remain:

```text
public.v_mlb_v3_reds_game_hit_board
public.v_mlb_v3_reds_game_hit_board_complete
public.v_mlb_v3_reds_game_hit_board_cache
```

Known dependency:

```text
public.v_mlb_reds_matchup_pitcher_ui
    -> public.v_mlb_v3_reds_game_hit_board
```

Also:

```text
public.v_mlb_v3_reds_game_hit_board_complete
    -> public.v_mlb_v3_reds_game_hit_board
```

Do not drop `v_mlb_v3_reds_game_hit_board` until these dependencies have been refactored or retired.

## Step DB-1 — Inventory all dependencies

Run a dependency query before making changes:

```sql
select
    dependent_ns.nspname as dependent_schema,
    dependent_view.relname as dependent_object,
    source_ns.nspname as source_schema,
    source_view.relname as source_object
from pg_depend d
join pg_rewrite r
  on r.oid = d.objid
join pg_class dependent_view
  on dependent_view.oid = r.ev_class
join pg_class source_view
  on source_view.oid = d.refobjid
join pg_namespace dependent_ns
  on dependent_ns.oid = dependent_view.relnamespace
join pg_namespace source_ns
  on source_ns.oid = source_view.relnamespace
where source_view.relname in (
    'v_mlb_v3_reds_game_hit_board',
    'v_mlb_v3_reds_game_hit_board_complete',
    'v_mlb_v3_reds_game_hit_board_cache'
)
order by source_view.relname, dependent_view.relname;
```

Also search function definitions:

```sql
select
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where pg_get_functiondef(p.oid) ilike '%v_mlb_v3_reds_game_hit_board%';
```

## Step DB-2 — Refactor the pitcher UI view

Review:

```text
public.v_mlb_reds_matchup_pitcher_ui
```

Determine whether it is:

- still used by the current matchup card
- used elsewhere in the application
- fully replaced by the generic game-board and pitcher-split queries

Preferred outcome:

- create a generic equivalent, such as `v_mlb_matchup_pitcher_ui`, or
- move its required fields into the generic serving layer

Validate the generic replacement against the Reds view for:

- `game_pk`
- home starter
- away starter
- pitcher IDs
- pitcher names
- throwing hand
- ERA
- WHIP
- BAA versus LHB
- BAA versus RHB

## Step DB-3 — Run parity checks

Before retiring any legacy view, compare old and new output for the same Reds game.

Required comparisons:

```text
row count
player_id
game_pk
team_id
pitcher_id
hit_probability_pct
rank_overall
rank_team
drawer explanation fields
```

Example difference pattern:

```sql
(
    select
        game_pk,
        player_id,
        pitcher_id,
        hit_probability_pct,
        rank_overall
    from public.v_mlb_v3_reds_game_hit_board_cache
)
except
(
    select
        game_pk,
        player_id,
        pitcher_id,
        hit_probability_pct,
        rank_overall
    from public.v_mlb_v3_game_hit_board_cache
    where game_pk = :reds_game_pk
);
```

Run the reverse `EXCEPT` as well.

Expected result:

```text
0 rows in both directions
```

## Step DB-4 — Deprecate before dropping

Recommended sequence:

1. Stop all UI and workflow reads from the legacy views.
2. Add database comments marking them deprecated.
3. Observe for several game days.
4. Re-run dependency checks.
5. Drop only after no active consumers remain.

Example comments:

```sql
comment on view public.v_mlb_v3_reds_game_hit_board
is 'Deprecated. Use v_mlb_v3_game_hit_board_cache filtered by game_pk.';

comment on view public.v_mlb_v3_reds_game_hit_board_complete
is 'Deprecated. Generic Team Hit Board serving layer is authoritative.';

comment on view public.v_mlb_v3_reds_game_hit_board_cache
is 'Deprecated. Use v_mlb_v3_game_hit_board_cache.';
```

## Step DB-5 — Drop in dependency order

The final order will depend on the dependency inventory, but likely:

```text
1. v_mlb_reds_matchup_pitcher_ui
2. v_mlb_v3_reds_game_hit_board_complete
3. v_mlb_v3_reds_game_hit_board_cache
4. v_mlb_v3_reds_game_hit_board
```

Use a migration. Do not use `DROP ... CASCADE`.

Example:

```sql
drop view if exists public.v_mlb_reds_matchup_pitcher_ui;
drop view if exists public.v_mlb_v3_reds_game_hit_board_complete;
drop view if exists public.v_mlb_v3_reds_game_hit_board_cache;
drop view if exists public.v_mlb_v3_reds_game_hit_board;
```

---

# 3. GitHub Workflow and Script Cleanup

## Important distinction

Some Reds-named files may still load valid league-wide source data or support other Reds dashboard pages. Rename or remove them only after reviewing their actual behavior.

A Reds-specific filename does not automatically mean the file is obsolete.

## Known or previously referenced files

Review these files first:

```text
scripts/load_reds_splits.py
.github/workflows/daily-reds-batting.yml
```

Also search for workflow and script names containing:

```text
reds
cincinnati
team_id = 113
teamId=113
TEAM_ID: 113
```

Potential additional patterns:

```text
load_reds
reds_batting
reds_splits
reds_matchup
reds_hit_board
daily_reds
```

## File classification

For each script or workflow, classify it into one of four groups.

### A. Truly Reds-only and still needed

Examples could include:

- a Cincinnati-specific dashboard page
- Reds batting summaries
- Reds news or roster widgets
- Reds-only historical analytics

Keep these files, but document that they are intentionally team-specific.

### B. Reds-named but now league-wide

Rename these files and internal identifiers.

Example:

```text
scripts/load_reds_splits.py
    -> scripts/load_mlb_player_splits.py
```

Possible workflow rename:

```text
.github/workflows/daily-reds-batting.yml
    -> .github/workflows/daily-mlb-batting.yml
```

Also update:

- workflow `name:`
- job IDs
- step names
- log messages
- artifact names
- called script paths
- documentation
- any `workflow_run.workflows` dependencies

### C. Reds-only logic that should become generic

Remove hard-coded filters such as:

```python
TEAM_ID = 113
```

or:

```sql
where team_id = 113
```

Replace with:

- all active MLB teams
- selected `game_pk`
- configurable team IDs
- workflow input parameters

Validate row counts before and after removing filters.

### D. Obsolete and no longer called

Delete only after confirming:

- no workflow calls the script
- no script imports it
- no documentation references it
- no scheduled workflow depends on its workflow name
- no artifact or downstream job expects its outputs

## GitHub search commands

Run repository searches for:

```text
reds
Reds
Cincinnati
113
load_reds
daily-reds
v_mlb_v3_reds
redsBoard
redsMlRows
redsTeamFilter
```

Pay special attention to:

```yaml
workflow_run:
  workflows:
```

Workflow dependencies use the workflow's display `name`, not only the filename. Renaming a workflow `name:` can silently stop downstream workflows from triggering.

## Workflow validation after renaming

For each changed workflow:

1. Validate YAML syntax.
2. Confirm workflow triggers are unchanged.
3. Confirm required secrets are unchanged.
4. Confirm script paths exist.
5. Confirm downstream `workflow_run` names were updated.
6. Run manually with `workflow_dispatch`.
7. Verify expected Supabase row counts.
8. Confirm serving-cache refresh still completes.
9. Confirm the Team Hit Board shows all scheduled games.
10. Confirm Reds-specific pages still work if they remain in scope.

---

# 4. Documentation Cleanup

Update:

```text
README.md
architecture documentation
database object inventory
workflow documentation
deployment instructions
troubleshooting notes
```

Replace obsolete references to:

```text
Reds Hit Board
Reds-only V3 board
current Reds game
Reds board cache
```

Preferred terminology:

```text
Team Hit Board
selected MLB game
generic game board
V3 Hit Board serving cache
```

Retain the term `Reds` where the feature is intentionally Cincinnati-specific.

---

# 5. Release Plan

## Release 4B — UI compatibility removal

Scope:

- remove legacy wrappers
- remove legacy state accessors
- remove DOM fallbacks
- remove `data-reds-*` support
- run browser and syntax validation

No database deletion.

## Release 4C — Generic database dependencies

Scope:

- replace or retire `v_mlb_reds_matchup_pitcher_ui`
- stop all reads from legacy Reds board views
- add deprecation comments
- run parity comparisons

No dropping during the initial 4C release.

## Release 4D — GitHub generic naming

Scope:

- rename generic scripts and workflows
- remove hard-coded team filters where appropriate
- update workflow dependencies and documentation
- manually run affected workflows

## Release 4E — Final database removal

Scope:

- confirm zero dependencies
- create rollback SQL
- drop legacy views in dependency order
- run database advisors and application validation

---

# 6. Required Validation Checklist

Complete these checks after every cleanup release.

## Team Hit Board

- game selector loads all expected games
- Reds game remains the default when available
- switching games updates all rows
- All/Away/Home filters work
- both starting pitchers load
- pitcher hand splits load
- player drawer opens for every row
- odds remain tied to the selected game and player
- no data leaks from the previously selected game

## MLB Hit Board

- league-wide rows load
- ranking order remains correct
- drawer opens
- search works
- scope text and control card render correctly

## Other pages

- Model Performance loads
- Market Edge loads
- existing Reds-specific pages still load
- no navigation item disappears unintentionally

## Browser and code

- `node --check app-v4.js`
- no console errors
- no unresolved function references
- no duplicate event handlers
- desktop layout works
- tablet layout works
- mobile layout works
- cache-busting values are updated

## Supabase

- generic selector returns expected game count
- generic board returns expected row count
- no duplicate player/game rows
- no missing home/away metadata
- no missing pitcher IDs for confirmed starters
- cache refresh succeeds
- legacy/generic parity returns zero differences

## GitHub Actions

- scheduled workflows run
- manual dispatch runs
- dependent `workflow_run` triggers still fire
- workflow artifacts and logs are produced
- no missing script path errors
- no unexpected reduction in loaded data

---

# 7. Rollback Requirements

Before removing any object or file:

- preserve its current definition
- record its Git commit SHA or SQL definition
- prepare a restoration migration or commit
- avoid combining UI, workflow, and database deletion in one release
- keep each cleanup release independently reversible

Never use:

```sql
drop view ... cascade;
```

A failed cleanup should be recoverable by reverting one Git commit or applying one restoration migration.

---

# Completion Criteria

The Reds cleanup is complete when:

- the Team Hit Board contains no Reds-specific compatibility code
- no generic workflow or script has a Reds-specific name
- generic loaders do not hard-code team ID `113`
- no production consumer reads the legacy Reds board views
- legacy views have been dropped safely
- intentional Reds-only features are clearly documented
- all validation checks pass for multiple game days
