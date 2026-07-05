#!/usr/bin/env python3
"""
Load MLB player Hits Over 0.5 market odds into Supabase.

Provider pattern implemented for The Odds API v4 event odds endpoint:
  GET /v4/sports/baseball_mlb/events
  GET /v4/sports/baseball_mlb/events/{event_id}/odds?regions=us&markets=player_hits&oddsFormat=american

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  THE_ODDS_API_KEY

Optional env vars:
  ODDS_REGIONS=us
  ODDS_BOOKMAKERS=draftkings,fanduel,betmgm,caesars,espnbet,fanatics
  ODDS_PROVIDER=the_odds_api
  ODDS_SPORT_KEY=baseball_mlb
  ODDS_MARKET_KEY=player_hits
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
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from supabase import create_client

API_BASE = "https://api.the-odds-api.com/v4"


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_key: str
    api_key: str
    provider: str = "the_odds_api"
    sport_key: str = "baseball_mlb"
    regions: str = "us"
    bookmakers: str | None = None
    market_key: str = "player_hits"
    dry_run: bool = False


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def load_config() -> Config:
    dry_run = os.getenv("DRY_RUN", "false").strip().lower() in {"1", "true", "yes"}
    return Config(
        supabase_url=require_env("SUPABASE_URL"),
        supabase_key=require_env("SUPABASE_SERVICE_ROLE_KEY"),
        api_key=require_env("THE_ODDS_API_KEY"),
        provider=os.getenv("ODDS_PROVIDER", "the_odds_api"),
        sport_key=os.getenv("ODDS_SPORT_KEY", "baseball_mlb"),
        regions=os.getenv("ODDS_REGIONS", "us"),
        bookmakers=os.getenv("ODDS_BOOKMAKERS") or None,
        market_key=os.getenv("ODDS_MARKET_KEY", "player_hits"),
        dry_run=dry_run,
    )


def http_get_json(url: str, timeout: int = 30) -> Any:
    req = Request(url, headers={"User-Agent": "mlb-hit-lab/1.0"})
    try:
        with urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            return json.loads(body)
    except HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {url}: {error_body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {url}: {exc}") from exc


def build_url(path: str, params: dict[str, Any]) -> str:
    clean_params = {k: v for k, v in params.items() if v is not None and v != ""}
    return f"{API_BASE}{path}?{urlencode(clean_params)}"


def normalize_iso(value: str | None) -> str | None:
    if not value:
        return None
    # Supabase/Postgres accepts ISO strings with Z, but normalize for consistency.
    return value.replace("Z", "+00:00")


def date_from_iso(value: str | None) -> str | None:
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.date().isoformat()
    except ValueError:
        return None


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


def extract_player_hit_rows(event: dict[str, Any], odds_payload: dict[str, Any], cfg: Config) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    event_id = str(odds_payload.get("id") or event.get("id") or "")
    commence_time = normalize_iso(odds_payload.get("commence_time") or event.get("commence_time"))
    game_date = date_from_iso(commence_time)
    home_team = odds_payload.get("home_team") or event.get("home_team")
    away_team = odds_payload.get("away_team") or event.get("away_team")

    for bookmaker in odds_payload.get("bookmakers", []) or []:
        book_key = bookmaker.get("key") or bookmaker.get("title") or "unknown"
        odds_last_update = normalize_iso(bookmaker.get("last_update"))

        for market in bookmaker.get("markets", []) or []:
            if market.get("key") != cfg.market_key:
                continue

            provider_market_id = market.get("key")
            market_last_update = normalize_iso(market.get("last_update")) or odds_last_update

            for outcome in market.get("outcomes", []) or []:
                outcome_name = str(outcome.get("name") or "").strip()
                if outcome_name.lower() != "over":
                    continue

                point = outcome.get("point")
                try:
                    line = float(point)
                except (TypeError, ValueError):
                    continue

                if line != 0.5:
                    continue

                price = outcome.get("price")
                try:
                    american_odds = int(price)
                except (TypeError, ValueError):
                    continue

                player_name = outcome.get("description") or outcome.get("participant") or outcome.get("player")
                if not player_name:
                    # The player name is usually in description for player props.
                    continue

                row = {
                    "odds_provider": cfg.provider,
                    "book_name": str(book_key),
                    "provider_event_id": event_id,
                    "provider_market_id": provider_market_id,
                    "game_pk": None,
                    "game_date": game_date,
                    "commence_time_utc": commence_time,
                    "home_team": home_team,
                    "away_team": away_team,
                    "player_id": None,
                    "player_name_raw": str(player_name),
                    "market_key": cfg.market_key,
                    "market_name": "Player Hits",
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
                        "bookmaker": bookmaker,
                        "market": market,
                        "outcome": outcome,
                    },
                }
                row["load_key"] = stable_load_key(row)
                rows.append(row)

    return rows


def fetch_events(cfg: Config) -> list[dict[str, Any]]:
    url = build_url(f"/sports/{cfg.sport_key}/events", {"apiKey": cfg.api_key})
    events = http_get_json(url)
    if not isinstance(events, list):
        raise RuntimeError(f"Unexpected events response: {events}")
    return events


def fetch_event_odds(event_id: str, cfg: Config) -> dict[str, Any]:
    params = {
        "apiKey": cfg.api_key,
        "regions": cfg.regions,
        "markets": cfg.market_key,
        "oddsFormat": "american",
        "bookmakers": cfg.bookmakers,
    }
    url = build_url(f"/sports/{cfg.sport_key}/events/{event_id}/odds", params)
    return http_get_json(url)


def chunked(items: list[dict[str, Any]], size: int = 500) -> list[list[dict[str, Any]]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def main() -> int:
    cfg = load_config()
    client = create_client(cfg.supabase_url, cfg.supabase_key)

    print("Fetching MLB events...")
    events = fetch_events(cfg)
    print(f"Found {len(events)} events")

    all_rows: list[dict[str, Any]] = []
    for idx, event in enumerate(events, start=1):
        event_id = str(event.get("id") or "")
        if not event_id:
            continue

        print(f"[{idx}/{len(events)}] Fetching player hit market odds for event {event_id}")
        try:
            payload = fetch_event_odds(event_id, cfg)
        except RuntimeError as exc:
            print(f"WARNING: {exc}", file=sys.stderr)
            continue

        rows = extract_player_hit_rows(event, payload, cfg)
        print(f"  extracted {len(rows)} Over 0.5 hit rows")
        all_rows.extend(rows)
        time.sleep(0.15)

    print(f"Total extracted rows: {len(all_rows)}")

    if cfg.dry_run:
        print(json.dumps(all_rows[:5], indent=2, default=str))
        return 0

    if not all_rows:
        print("No rows to load. Check provider key, markets, regions/bookmakers, and event timing.")
        return 0

    # Idempotent load via deterministic load_key.
    for batch in chunked(all_rows, 500):
        result = (
            client.table("mlb_player_hit_prop_market_odds")
            .upsert(batch, on_conflict="load_key")
            .execute()
        )
        print(f"Loaded batch rows: {len(result.data or [])}")

    # Print health summary.
    health = client.table("v_mlb_hit_over05_market_edge_health").select("*").limit(1).execute()
    print("Market edge health:")
    print(json.dumps(health.data, indent=2, default=str))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
