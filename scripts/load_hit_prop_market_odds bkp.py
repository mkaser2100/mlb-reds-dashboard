#!/usr/bin/env python3
"""
Load MLB batter Hits Over 0.5 market odds into Supabase.

Provider: The Odds API v4
  1) GET /v4/sports/baseball_mlb/events
  2) GET /v4/sports/baseball_mlb/events/{event_id}/odds?markets=batter_hits&bookmakers=draftkings,bet365

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  THE_ODDS_API_KEY

Default behavior:
  - Pull only today's MLB events using America/New_York date.
  - Skip games that have already started.
  - Pull only DraftKings and Bet365.
  - Pull only batter_hits.
  - Store only Over 0.5 rows.

Optional env vars:
  ODDS_BOOKMAKERS=draftkings,bet365 or BOOKMAKERS=draftkings,bet365
  ODDS_REGIONS=us,uk
  ODDS_PROVIDER=the_odds_api
  ODDS_SPORT_KEY=baseball_mlb or SPORT_KEY=baseball_mlb
  ODDS_MARKET_KEY=batter_hits or MARKET_KEY=batter_hits
  ODDS_TARGET_DATE=YYYY-MM-DD
  ODDS_SKIP_STARTED=true or SKIP_STARTED_GAMES=true
  ODDS_MAX_EVENTS=20 or MAX_EVENTS_PER_RUN=20
  DRY_RUN=false
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from supabase import create_client

API_BASE = "https://api.the-odds-api.com/v4"
EASTERN_TZ = ZoneInfo("America/New_York")


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_key: str
    api_key: str
    provider: str = "the_odds_api"
    sport_key: str = "baseball_mlb"
    regions: str | None = "us,uk"
    bookmakers: str = "draftkings,bet365"
    market_key: str = "batter_hits"
    target_date: str | None = None
    skip_started: bool = True
    max_events: int = 20
    dry_run: bool = False


@dataclass
class ApiUsage:
    requests_made: int = 0
    latest_requests_used: str | None = None
    latest_requests_remaining: str | None = None
    latest_credits_used: str | None = None
    latest_credits_remaining: str | None = None

    def record(self, headers: dict[str, str]) -> None:
        self.requests_made += 1

        # The Odds API has used different header names across docs/examples.
        # Capture the common variants so the GitHub log still works if one is absent.
        self.latest_requests_used = (
            headers.get("x-requests-used")
            or headers.get("x-requests-used-today")
            or headers.get("x-usage-requests-used")
            or self.latest_requests_used
        )
        self.latest_requests_remaining = (
            headers.get("x-requests-remaining")
            or headers.get("x-requests-remaining-today")
            or headers.get("x-usage-requests-remaining")
            or self.latest_requests_remaining
        )
        self.latest_credits_used = (
            headers.get("x-credits-used")
            or headers.get("x-requests-used")
            or headers.get("x-usage-credits-used")
            or self.latest_credits_used
        )
        self.latest_credits_remaining = (
            headers.get("x-credits-remaining")
            or headers.get("x-requests-remaining")
            or headers.get("x-usage-credits-remaining")
            or self.latest_credits_remaining
        )


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "y"}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise RuntimeError(f"{name} must be an integer, got {value!r}") from exc


def load_config() -> Config:
    return Config(
        supabase_url=require_env("SUPABASE_URL"),
        supabase_key=require_env("SUPABASE_SERVICE_ROLE_KEY"),
        api_key=require_env("THE_ODDS_API_KEY"),
        provider=os.getenv("ODDS_PROVIDER", "the_odds_api"),
        sport_key=os.getenv("ODDS_SPORT_KEY") or os.getenv("SPORT_KEY", "baseball_mlb"),
        regions=os.getenv("ODDS_REGIONS", "us,uk") or None,
        bookmakers=os.getenv("ODDS_BOOKMAKERS") or os.getenv("BOOKMAKERS", "draftkings,bet365"),
        market_key=os.getenv("ODDS_MARKET_KEY") or os.getenv("MARKET_KEY", "batter_hits"),
        target_date=os.getenv("ODDS_TARGET_DATE") or None,
        skip_started=env_bool("ODDS_SKIP_STARTED", env_bool("SKIP_STARTED_GAMES", True)),
        max_events=env_int("ODDS_MAX_EVENTS", env_int("MAX_EVENTS_PER_RUN", 20)),
        dry_run=env_bool("DRY_RUN", False),
    )


def http_get_json(url: str, timeout: int = 30) -> tuple[Any, dict[str, str]]:
    req = Request(url, headers={"User-Agent": "mlb-hit-lab/1.0"})
    try:
        with urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            headers = {k.lower(): v for k, v in response.headers.items()}
            return json.loads(body), headers
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {redact_api_key(url)}: {error_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {redact_api_key(url)}: {exc}") from exc


def redact_api_key(url: str) -> str:
    api_key = os.getenv("THE_ODDS_API_KEY")
    if api_key:
        return url.replace(api_key, "***")
    return url


def build_url(path: str, params: dict[str, Any]) -> str:
    clean_params = {k: v for k, v in params.items() if v is not None and v != ""}
    return f"{API_BASE}{path}?{urlencode(clean_params)}"


def normalize_iso(value: str | None) -> str | None:
    if not value:
        return None
    return value.replace("Z", "+00:00")


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def date_from_iso_eastern(value: str | None) -> str | None:
    dt = parse_dt(value)
    if not dt:
        return None
    return dt.astimezone(EASTERN_TZ).date().isoformat()


def today_eastern() -> str:
    return datetime.now(EASTERN_TZ).date().isoformat()


def stable_load_key(row: dict[str, Any]) -> str:
    parts = [
        row.get("odds_provider") or "",
        row.get("book_name") or "",
        row.get("provider_event_id") or "",
        str(row.get("game_pk") or ""),
        row.get("game_date") or "",
        row.get("player_name_raw") or "",
        row.get("market_key") or "",
        str(row.get("line") or ""),
        (row.get("outcome_name") or "").lower(),
    ]
    return hashlib.md5("|".join(parts).lower().encode("utf-8")).hexdigest()


def event_is_today(event: dict[str, Any], target_date: str) -> bool:
    return date_from_iso_eastern(event.get("commence_time")) == target_date


def event_has_started(event: dict[str, Any]) -> bool:
    dt = parse_dt(event.get("commence_time"))
    if not dt:
        return False
    return dt <= datetime.now(timezone.utc)


def fetch_events(cfg: Config) -> tuple[list[dict[str, Any]], dict[str, str]]:
    url = build_url(f"/sports/{cfg.sport_key}/events", {"apiKey": cfg.api_key})
    events, headers = http_get_json(url)
    if not isinstance(events, list):
        raise RuntimeError(f"Unexpected events response: {events}")
    return events, headers


def fetch_event_odds(event_id: str, cfg: Config) -> tuple[dict[str, Any], dict[str, str]]:
    params = {
        "apiKey": cfg.api_key,
        "regions": cfg.regions,
        "markets": cfg.market_key,
        "oddsFormat": "american",
        "bookmakers": cfg.bookmakers,
    }
    url = build_url(f"/sports/{cfg.sport_key}/events/{event_id}/odds", params)
    payload, headers = http_get_json(url)
    if not isinstance(payload, dict):
        raise RuntimeError(f"Unexpected odds response for event {event_id}: {payload}")
    return payload, headers


def extract_player_hit_rows(event: dict[str, Any], odds_payload: dict[str, Any], cfg: Config) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    event_id = str(odds_payload.get("id") or event.get("id") or "")
    commence_time = normalize_iso(odds_payload.get("commence_time") or event.get("commence_time"))
    game_date = date_from_iso_eastern(commence_time)
    home_team = odds_payload.get("home_team") or event.get("home_team")
    away_team = odds_payload.get("away_team") or event.get("away_team")

    for bookmaker in odds_payload.get("bookmakers", []) or []:
        book_key = bookmaker.get("key") or bookmaker.get("title") or "unknown"
        if book_key not in set(cfg.bookmakers.split(",")):
            continue

        odds_last_update = normalize_iso(bookmaker.get("last_update"))

        for market in bookmaker.get("markets", []) or []:
            if market.get("key") != cfg.market_key:
                continue

            market_last_update = normalize_iso(market.get("last_update")) or odds_last_update

            for outcome in market.get("outcomes", []) or []:
                outcome_name = str(outcome.get("name") or "").strip()
                if outcome_name.lower() != "over":
                    continue

                try:
                    line = float(outcome.get("point"))
                except (TypeError, ValueError):
                    continue

                if line != 0.5:
                    continue

                try:
                    american_odds = int(outcome.get("price"))
                except (TypeError, ValueError):
                    continue

                player_name = outcome.get("description") or outcome.get("participant") or outcome.get("player")
                if not player_name:
                    continue

                row = {
                    "odds_provider": cfg.provider,
                    "book_name": str(book_key),
                    "provider_event_id": event_id,
                    "provider_market_id": cfg.market_key,
                    "game_pk": None,
                    "game_date": game_date,
                    "commence_time_utc": commence_time,
                    "home_team": home_team,
                    "away_team": away_team,
                    "player_id": None,
                    "player_name_raw": str(player_name),
                    "market_key": cfg.market_key,
                    "market_name": "Batter Hits",
                    "line": line,
                    "outcome_name": outcome_name,
                    "american_odds": american_odds,
                    "decimal_odds": None,
                    "odds_last_update": market_last_update,
                    "fetched_at": datetime.now(timezone.utc).isoformat(),
                    "raw_payload": {
                        "event": {
                            "id": event_id,
                            "commence_time": commence_time,
                            "home_team": home_team,
                            "away_team": away_team,
                        },
                        "bookmaker": {
                            "key": bookmaker.get("key"),
                            "title": bookmaker.get("title"),
                            "last_update": bookmaker.get("last_update"),
                        },
                        "market": {
                            "key": market.get("key"),
                            "last_update": market.get("last_update"),
                        },
                        "outcome": outcome,
                    },
                }
                row["load_key"] = stable_load_key(row)
                rows.append(row)

    return rows


def chunked(items: list[dict[str, Any]], size: int = 500) -> list[list[dict[str, Any]]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def print_credit_headers(headers: dict[str, str], label: str) -> None:
    interesting = {
        k: v
        for k, v in headers.items()
        if "request" in k or "credit" in k or "remaining" in k or "used" in k
    }
    if interesting:
        print(f"{label} response headers: {json.dumps(interesting, indent=2)}")



def print_run_summary(
    *,
    cfg: Config,
    usage: ApiUsage,
    events_returned: int,
    events_for_date: int,
    events_skipped_started: int,
    events_processed: int,
    rows_prepared: int,
    rows_upserted: int,
    unmatched_players: int | None,
) -> None:
    print("\n========== Odds API Summary ==========")
    print(f"Events returned by provider: {events_returned}")
    print(f"Events matching target date: {events_for_date}")
    print(f"Events skipped because already started: {events_skipped_started}")
    print(f"Events processed: {events_processed}")
    print(f"Books queried: {cfg.bookmakers}")
    print(f"Market queried: {cfg.market_key}")
    print(f"API requests made: {usage.requests_made}")
    print(f"Rows prepared: {rows_prepared}")
    print(f"Rows upserted: {rows_upserted}")
    print(f"Unmatched players: {unmatched_players if unmatched_players is not None else 'Unknown'}")
    print(f"API requests used: {usage.latest_requests_used or 'Unknown'}")
    print(f"API requests remaining: {usage.latest_requests_remaining or 'Unknown'}")
    print(f"API credits used: {usage.latest_credits_used or 'Unknown'}")
    print(f"API credits remaining: {usage.latest_credits_remaining or 'Unknown'}")
    print("======================================\n")

def main() -> int:
    cfg = load_config()
    target_date = cfg.target_date or today_eastern()
    client = create_client(cfg.supabase_url, cfg.supabase_key)
    usage = ApiUsage()
    events_returned = 0
    events_for_date = 0
    events_skipped_started = 0
    events_processed = 0
    rows_upserted = 0
    unmatched_players: int | None = None

    print("Hit prop odds loader config:")
    print(json.dumps({
        "provider": cfg.provider,
        "sport_key": cfg.sport_key,
        "market_key": cfg.market_key,
        "bookmakers": cfg.bookmakers,
        "regions": cfg.regions,
        "target_date_eastern": target_date,
        "skip_started": cfg.skip_started,
        "max_events": cfg.max_events,
        "dry_run": cfg.dry_run,
    }, indent=2))

    print("Fetching MLB events...")
    events, headers = fetch_events(cfg)
    usage.record(headers)
    print_credit_headers(headers, "events")
    events_returned = len(events)
    print(f"Provider returned {events_returned} MLB events")

    candidate_events = [event for event in events if event_is_today(event, target_date)]
    events_for_date = len(candidate_events)
    if cfg.skip_started:
        skipped_started = [event for event in candidate_events if event_has_started(event)]
        events_skipped_started = len(skipped_started)
        candidate_events = [event for event in candidate_events if not event_has_started(event)]
        print(f"Skipped already-started events: {events_skipped_started}")

    candidate_events = sorted(candidate_events, key=lambda e: e.get("commence_time") or "")[: cfg.max_events]
    print(f"Events to fetch for {target_date}: {len(candidate_events)}")
    print(f"Estimated API calls this run: {1 + len(candidate_events)} (1 events call + {len(candidate_events)} event odds calls)")

    all_rows: list[dict[str, Any]] = []
    for idx, event in enumerate(candidate_events, start=1):
        event_id = str(event.get("id") or "")
        if not event_id:
            continue

        game_label = f"{event.get('away_team')} at {event.get('home_team')} · {event.get('commence_time')}"
        print(f"[{idx}/{len(candidate_events)}] Fetching {cfg.market_key} for {game_label}")
        try:
            payload, odds_headers = fetch_event_odds(event_id, cfg)
            usage.record(odds_headers)
            events_processed += 1
            print_credit_headers(odds_headers, f"event {event_id}")
        except RuntimeError as exc:
            print(f"WARNING: {exc}", file=sys.stderr)
            continue

        rows = extract_player_hit_rows(event, payload, cfg)
        print(f"  extracted {len(rows)} Over 0.5 hit rows from {cfg.bookmakers}")
        all_rows.extend(rows)
        time.sleep(0.15)

    print(f"Total extracted rows: {len(all_rows)}")

    if cfg.dry_run:
        print(json.dumps(all_rows[:10], indent=2, default=str))
        print_run_summary(
            cfg=cfg,
            usage=usage,
            events_returned=events_returned,
            events_for_date=events_for_date,
            events_skipped_started=events_skipped_started,
            events_processed=events_processed,
            rows_prepared=len(all_rows),
            rows_upserted=0,
            unmatched_players=None,
        )
        return 0

    if not all_rows:
        print("No rows to load. Check API key, available markets, bookmaker keys, event timing, and whether props are posted yet.")
        print_run_summary(
            cfg=cfg,
            usage=usage,
            events_returned=events_returned,
            events_for_date=events_for_date,
            events_skipped_started=events_skipped_started,
            events_processed=events_processed,
            rows_prepared=0,
            rows_upserted=0,
            unmatched_players=None,
        )
        return 0

    for batch in chunked(all_rows, 500):
        result = client.table("mlb_player_hit_prop_market_odds").upsert(batch, on_conflict="load_key").execute()
        batch_rows = len(result.data or [])
        rows_upserted += batch_rows
        print(f"Loaded/upserted batch rows: {batch_rows}")

    try:
        health = client.table("v_mlb_hit_over05_market_edge_health").select("*").limit(1).execute()
        print("Market edge health:")
        print(json.dumps(health.data, indent=2, default=str))
        if health.data:
            unmatched_players = health.data[0].get("unmatched_odds_rows")
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: Unable to read market edge health view: {exc}", file=sys.stderr)

    print_run_summary(
        cfg=cfg,
        usage=usage,
        events_returned=events_returned,
        events_for_date=events_for_date,
        events_skipped_started=events_skipped_started,
        events_processed=events_processed,
        rows_prepared=len(all_rows),
        rows_upserted=rows_upserted,
        unmatched_players=unmatched_players,
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
