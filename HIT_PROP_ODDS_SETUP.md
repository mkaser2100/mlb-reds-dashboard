# Hit Prop Market Odds Loader

## Files to copy into your repo

- `scripts/load_hit_prop_market_odds.py`
- `requirements-hit-prop-odds.txt`
- `.github/workflows/load-hit-prop-market-odds.yml`

## GitHub secret to add

Add this repository secret:

- `THE_ODDS_API_KEY`

You should already have:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Recommended daily order

1. Refresh MLB game/matchup data.
2. Generate V2/V3 predictions.
3. Run `Load Hit Prop Market Odds`.
4. UI reads from `v_mlb_hit_over05_market_edges_qualified`.

## Validation SQL

```sql
select *
from public.v_mlb_hit_over05_market_edge_health;

select *
from public.v_mlb_hit_over05_market_edges_qualified
order by edge_rank
limit 25;

select *
from public.v_mlb_player_hit_prop_market_odds_unmatched
limit 50;
```

## Notes

The script expects The Odds API style player prop payloads where player prop outcomes use:

- `market.key = player_hits`
- `outcome.name = Over`
- `outcome.point = 0.5`
- `outcome.description = player name`
- `outcome.price = American odds`

If your odds provider uses different names, adjust `extract_player_hit_rows()` only.
