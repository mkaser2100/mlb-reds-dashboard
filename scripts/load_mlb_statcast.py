#!/usr/bin/env python3
"""Fetch Baseball Savant Statcast pitches and ingest them into Supabase."""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Iterator
from zoneinfo import ZoneInfo

import pandas as pd
import requests
from pybaseball import cache, statcast, statcast_single_game

EASTERN = ZoneInfo("America/New_York")
DEFAULT_BATCH_SIZE = 2000
MAX_EDGE_BATCH_SIZE = 5000
REQUEST_TIMEOUT_SECONDS = 120

SWING_DESCRIPTIONS = {
    "swinging_strike", "swinging_strike_blocked", "foul", "foul_bunt",
    "foul_tip", "hit_into_play", "hit_into_play_no_out",
    "hit_into_play_score", "missed_bunt",
}
WHIFF_DESCRIPTIONS = {"swinging_strike", "swinging_strike_blocked", "missed_bunt"}


@dataclass(frozen=True)
class Config:
    supabase_url: str
    service_role_key: str
    start_date: date
    end_date: date
    refresh_game_date: date | None
    refresh_mode: str
    batch_size: int
    chunk_days: int
    dry_run: bool
    continue_on_empty: bool


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Invalid date '{value}'. Expected YYYY-MM-DD.") from exc


def eastern_today() -> date:
    return datetime.now(EASTERN).date()


def parse_args() -> argparse.Namespace:
    today = eastern_today()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start-date", type=parse_iso_date, default=today - timedelta(days=1))
    parser.add_argument("--end-date", type=parse_iso_date, default=today - timedelta(days=1))
    parser.add_argument("--refresh-game-date", type=parse_iso_date, default=today)
    parser.add_argument("--refresh-mode", choices=("none", "latest", "all"), default="latest")
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--chunk-days", type=int, default=1)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--continue-on-empty", action="store_true")
    return parser.parse_args()


def load_config(args: argparse.Namespace) -> Config:
    if args.start_date > args.end_date:
        raise ValueError("--start-date cannot be after --end-date.")
    if not 1 <= args.batch_size <= MAX_EDGE_BATCH_SIZE:
        raise ValueError(f"--batch-size must be between 1 and {MAX_EDGE_BATCH_SIZE}.")
    if args.chunk_days < 1:
        raise ValueError("--chunk-days must be at least 1.")

    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not args.dry_run and (not url or not key):
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.")

    return Config(url, key, args.start_date, args.end_date, args.refresh_game_date,
                  args.refresh_mode, args.batch_size, args.chunk_days,
                  args.dry_run, args.continue_on_empty)


def iter_date_chunks(start: date, end: date, chunk_days: int) -> Iterator[tuple[date, date]]:
    current = start
    while current <= end:
        chunk_end = min(current + timedelta(days=chunk_days - 1), end)
        yield current, chunk_end
        current = chunk_end + timedelta(days=1)


def batched(items: list[dict[str, Any]], size: int) -> Iterator[list[dict[str, Any]]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def clean_scalar(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, (pd.Timestamp, datetime, date)):
        return value.isoformat()
    if isinstance(value, float):
        return float(value) if math.isfinite(value) else None
    if isinstance(value, int):
        return int(value)
    return value


def required_int(row: pd.Series, column: str) -> int:
    value = clean_scalar(row.get(column))
    if value is None:
        raise ValueError(f"Missing required field {column}.")
    return int(value)


def optional_float(row: pd.Series, column: str) -> float | None:
    value = clean_scalar(row.get(column))
    return None if value is None else float(value)


def optional_int(row: pd.Series, column: str) -> int | None:
    value = clean_scalar(row.get(column))
    return None if value is None else int(value)


def optional_text(row: pd.Series, column: str) -> str | None:
    value = clean_scalar(row.get(column))
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def normalize_hand(value: str | None, allow_switch: bool) -> str | None:
    if value is None:
        return None
    normalized = value.upper()
    allowed = {"L", "R", "S"} if allow_switch else {"L", "R"}
    return normalized if normalized in allowed else None


def event_to_payload(row: pd.Series) -> dict[str, Any]:
    description = optional_text(row, "description")
    zone = optional_int(row, "zone")
    launch_speed = optional_float(row, "launch_speed")
    launch_angle = optional_float(row, "launch_angle")
    launch_speed_angle = optional_int(row, "launch_speed_angle")
    is_swing = description in SWING_DESCRIPTIONS
    is_in_zone = zone is not None and 1 <= zone <= 9

    game_date_value = clean_scalar(row.get("game_date"))
    if game_date_value is None:
        raise ValueError("Missing game_date.")
    game_date_text = str(game_date_value)[:10]

    return {
        "game_pk": required_int(row, "game_pk"),
        "game_date": game_date_text,
        "at_bat_number": required_int(row, "at_bat_number"),
        "pitch_number": required_int(row, "pitch_number"),
        "batter_id": required_int(row, "batter"),
        "pitcher_id": required_int(row, "pitcher"),
        "batter_side": normalize_hand(optional_text(row, "stand"), True),
        "pitcher_throws": normalize_hand(optional_text(row, "p_throws"), False),
        "pitch_type": optional_text(row, "pitch_type"),
        "release_speed": optional_float(row, "release_speed"),
        "release_spin_rate": optional_float(row, "release_spin_rate"),
        "plate_x": optional_float(row, "plate_x"),
        "plate_z": optional_float(row, "plate_z"),
        "zone": zone,
        "description": description,
        "events": optional_text(row, "events"),
        "launch_speed": launch_speed,
        "launch_angle": launch_angle,
        "estimated_ba_using_speedangle": optional_float(row, "estimated_ba_using_speedangle"),
        "estimated_woba_using_speedangle": optional_float(row, "estimated_woba_using_speedangle"),
        "is_batted_ball": launch_speed is not None,
        "is_swing": is_swing,
        "is_whiff": description in WHIFF_DESCRIPTIONS,
        "is_in_zone": is_in_zone,
        "is_chase": is_swing and not is_in_zone,
        "is_hard_hit": launch_speed is not None and launch_speed >= 95.0,
        "is_barrel": launch_speed_angle == 6,
        "is_sweet_spot": launch_angle is not None and 8.0 <= launch_angle <= 32.0,
        "source_updated_at": None,
    }


def transform_frame(frame: pd.DataFrame) -> tuple[list[dict[str, Any]], int]:
    if frame.empty:
        return [], 0
    required = {"game_pk", "game_date", "at_bat_number", "pitch_number", "batter", "pitcher"}
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"Statcast response is missing required columns: {missing}")

    rows: list[dict[str, Any]] = []
    skipped = 0
    for _, row in frame.iterrows():
        try:
            rows.append(event_to_payload(row))
        except (TypeError, ValueError) as exc:
            skipped += 1
            print(f"Skipping invalid pitch row: {exc}", file=sys.stderr)

    deduped: dict[tuple[int, int, int], dict[str, Any]] = {}
    for event in rows:
        key = (event["game_pk"], event["at_bat_number"], event["pitch_number"])
        deduped[key] = event
    return list(deduped.values()), skipped + len(rows) - len(deduped)


def request_with_retries(session: requests.Session, url: str, headers: dict[str, str],
                         body: dict[str, Any], attempts: int = 4) -> requests.Response:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            response = session.post(url, headers=headers, json=body,
                                    timeout=REQUEST_TIMEOUT_SECONDS)
            if response.status_code < 500 and response.status_code != 429:
                return response
            response.raise_for_status()
        except requests.RequestException as exc:
            last_error = exc
        if attempt < attempts:
            delay = 2 ** (attempt - 1)
            print(f"Request attempt {attempt} failed; retrying in {delay}s...", file=sys.stderr)
            time.sleep(delay)
    raise RuntimeError(f"Request failed after {attempts} attempts: {last_error}")


def auth_headers(config: Config) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {config.service_role_key}",
        "apikey": config.service_role_key,
        "Content-Type": "application/json",
    }


def ingest_events(session: requests.Session, config: Config,
                  events: list[dict[str, Any]]) -> int:
    if config.dry_run:
        print(f"Dry run: would ingest {len(events)} rows.")
        return len(events)
    endpoint = f"{config.supabase_url}/functions/v1/ingest-mlb-statcast"
    batches = list(batched(events, config.batch_size))
    total = 0
    for number, batch in enumerate(batches, start=1):
        response = request_with_retries(session, endpoint, auth_headers(config), {"events": batch})
        if not response.ok:
            raise RuntimeError(f"Edge Function failed ({response.status_code}): {response.text}")
        payload = response.json()
        count = int(payload.get("upserted_rows", len(batch)))
        total += count
        print(f"Ingested batch {number}/{len(batches)}: {count} rows")
    return total


def refresh_features(session: requests.Session, config: Config, game_date: date) -> None:
    if config.dry_run:
        print(f"Dry run: would refresh enhancement features for {game_date}.")
        return
    endpoint = f"{config.supabase_url}/rest/v1/rpc/refresh_mlb_v3_enhancement_features"
    response = request_with_retries(session, endpoint,
        {**auth_headers(config), "Prefer": "return=representation"},
        {"p_game_date": game_date.isoformat()})
    if not response.ok:
        raise RuntimeError(f"Feature refresh failed ({response.status_code}): {response.text}")
    print(f"Feature refresh {game_date}: {json.dumps(response.json(), default=str)}")



def discover_game_pks(session: requests.Session, target_date: date) -> list[int]:
    """Return MLB game IDs scheduled for a date, including special-event games."""
    response = session.get(
        "https://statsapi.mlb.com/api/v1/schedule",
        params={
            "sportId": 1,
            "date": target_date.isoformat(),
            "hydrate": "status",
        },
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()

    game_pks: list[int] = []
    for date_block in payload.get("dates", []):
        for game in date_block.get("games", []):
            game_pk = game.get("gamePk")
            if game_pk is not None:
                game_pks.append(int(game_pk))

    return sorted(set(game_pks))


def fetch_statcast_with_game_fallback(
    session: requests.Session,
    chunk_start: date,
    chunk_end: date,
) -> pd.DataFrame:
    """
    Fetch Statcast for a date range, falling back to direct game_pk queries.

    Baseball Savant's bulk query can return no rows on single-game and
    special-event dates even when a game was played.
    """
    print(f"Fetching Statcast {chunk_start} through {chunk_end}...")
    frame = statcast(
        start_dt=chunk_start.isoformat(),
        end_dt=chunk_end.isoformat(),
        verbose=False,
        parallel=False,
    )
    if frame is not None and not frame.empty:
        print(f"Fetched {len(frame):,} raw pitch rows from date-range query.")
        return frame

    print("Date-range query returned 0 rows; trying game-by-game fallback.")
    frames: list[pd.DataFrame] = []
    current = chunk_start

    while current <= chunk_end:
        game_pks = discover_game_pks(session, current)
        print(f"MLB schedule returned {len(game_pks)} game(s) for {current}: {game_pks}")

        for game_pk in game_pks:
            try:
                game_frame = statcast_single_game(game_pk)
            except Exception as exc:
                print(
                    f"Single-game Statcast fetch failed for game_pk={game_pk}: {exc}",
                    file=sys.stderr,
                )
                continue

            if game_frame is None or game_frame.empty:
                print(f"No Statcast rows returned for game_pk={game_pk}.")
                continue

            print(f"Fetched {len(game_frame):,} rows for game_pk={game_pk}.")
            frames.append(game_frame)

        current += timedelta(days=1)

    if not frames:
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)
    print(f"Fetched {len(combined):,} raw pitch rows via game-by-game fallback.")
    return combined


def run(config: Config) -> None:
    cache.enable()
    session = requests.Session()
    totals = {"raw_rows": 0, "valid_unique_rows": 0, "skipped_or_duplicate_rows": 0,
              "upserted_rows": 0}
    loaded_dates: set[date] = set()

    for chunk_start, chunk_end in iter_date_chunks(config.start_date, config.end_date,
                                                    config.chunk_days):
        frame = fetch_statcast_with_game_fallback(
            session,
            chunk_start,
            chunk_end,
        )
        print(f"Fetched {len(frame):,} raw pitch rows.")
        totals["raw_rows"] += len(frame)
        events, skipped = transform_frame(frame)
        totals["valid_unique_rows"] += len(events)
        totals["skipped_or_duplicate_rows"] += skipped
        if not events:
            print("No valid rows in this chunk.")
            continue
        loaded_dates.update(date.fromisoformat(event["game_date"]) for event in events)
        totals["upserted_rows"] += ingest_events(session, config, events)

    if totals["valid_unique_rows"] == 0 and not config.continue_on_empty:
        raise RuntimeError("No Statcast rows returned. Use --continue-on-empty for known off days.")

    refresh_dates: set[date] = set()
    if config.refresh_mode == "all":
        refresh_dates.update(loaded_dates)
        if config.refresh_game_date:
            refresh_dates.add(config.refresh_game_date)
    elif config.refresh_mode == "latest" and config.refresh_game_date:
        refresh_dates.add(config.refresh_game_date)

    for refresh_date in sorted(refresh_dates):
        refresh_features(session, config, refresh_date)

    print(json.dumps({"status": "complete", **totals,
        "source_start_date": config.start_date.isoformat(),
        "source_end_date": config.end_date.isoformat(),
        "loaded_game_dates": sorted(d.isoformat() for d in loaded_dates),
        "refreshed_game_dates": sorted(d.isoformat() for d in refresh_dates),
        "dry_run": config.dry_run}, indent=2))


def main() -> int:
    try:
        run(load_config(parse_args()))
        return 0
    except Exception as exc:
        print(f"Statcast loader failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
