# MLB Statcast Loader

## Files

- `scripts/load_mlb_statcast.py`
- `.github/workflows/load-mlb-statcast.yml`
- `requirements-statcast.txt`

## Required GitHub secrets

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Daily behavior

The scheduled workflow:

1. Fetches yesterday's pitch-level Statcast data in Eastern Time.
2. Transforms Baseball Savant columns to the Supabase ingestion contract.
3. Upserts batches through `ingest-mlb-statcast`.
4. Calls `refresh_mlb_v3_enhancement_features` for today's prediction date.

The operation is idempotent on:

```text
game_pk + at_bat_number + pitch_number
```

## Recommended first runs

### Smoke test

Run manually with yesterday's date and `dry_run: true`. Then rerun with `dry_run: false`.

### Historical backfill

Run month-sized ranges with `refresh_mode: none`, for example:

```text
start_date: 2025-03-27
end_date: 2025-04-30
refresh_mode: none
dry_run: false
```

After the full backfill, run one daily load with `refresh_mode: latest`.

## Local usage

```bash
pip install -r requirements-statcast.txt
export SUPABASE_URL="https://PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."
python scripts/load_mlb_statcast.py --dry-run
```

Backfill:

```bash
python scripts/load_mlb_statcast.py \
  --start-date 2025-03-27 \
  --end-date 2025-04-30 \
  --refresh-mode none
```

## Operational notes

- Edge Function maximum batch size: 5,000; loader default: 2,000.
- Baseball Savant requests default to one day per request.
- Scheduled runs tolerate empty dates.
- Historical feature joins only use events before the prediction game date.
- V3.1 and V3.2 remain shadow feature sets until promotion gates pass.
