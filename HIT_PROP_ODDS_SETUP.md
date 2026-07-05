# Hit Prop Odds Loader

This loader pulls MLB `batter_hits` odds from The Odds API for DraftKings and Bet365 only.

## GitHub secrets required

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `THE_ODDS_API_KEY`

## Schedule

The workflow runs twice daily during EDT:

- 8:00 AM EDT
- 12:00 PM EDT

It also supports manual runs from GitHub Actions.

## Credit protection

The script:

- Fetches only today's MLB games by Eastern date.
- Skips games that have already started.
- Pulls only `batter_hits`.
- Pulls only `draftkings,bet365`.
- Logs estimated API calls per run.

## Validate after running

```sql
select *
from public.v_mlb_hit_over05_market_edges_qualified
order by edge_rank;
```

Unmatched names:

```sql
select *
from public.v_mlb_player_hit_prop_market_odds_unmatched;
```

Health:

```sql
select *
from public.v_mlb_hit_over05_market_edge_health;
```
