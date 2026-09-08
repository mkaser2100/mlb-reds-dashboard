#!/usr/bin/env python3
"""Load paired MLB batter prop odds for Phase 9B Market Edge.

Provider: The Odds API v4 event-odds endpoint.

Default markets:
  - batter_hits, canonical line 0.5
  - batter_total_bases, canonical line 1.5
  - batter_home_runs, canonical line 0.5

Both Over and Under are stored for every available book so Supabase can compute
book-specific no-vig probabilities. Started games are skipped by default.

Required env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
  THE_ODDS_API_KEY

Optional env vars:
  ODDS_BOOKMAKERS=all or comma-separated bookmaker keys
  ODDS_REGIONS=us
  ODDS_PROVIDER=the_odds_api
  ODDS_SPORT_KEY=baseball_mlb or SPORT_KEY=baseball_mlb
  ODDS_MARKET_KEYS=batter_hits,batter_total_bases,batter_home_runs
  ODDS_MARKET_KEY / MARKET_KEY remain supported as a single-market override
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
DEFAULT_MARKETS = ("batter_hits", "batter_total_bases", "batter_home_runs")
TARGET_LINES = {
    "batter_hits": 0.5,
    "batter_total_bases": 1.5,
    "batter_home_runs": 0.5,
}
MARKET_NAMES = {
    "batter_hits": "Batter Hits",
    "batter_total_bases": "Batter Total Bases",
    "batter_home_runs": "Batter Home Runs",
}


@dataclass(frozen=True)
class Config:
    supabase_url: str
    supabase_key: str
    api_key: str
    provider: str
    sport_key: str
    regions: str | None
    bookmakers: str | None
    market_keys: tuple[str, ...]
    target_date: str | None
    skip_started: bool
    max_events: int
    dry_run: bool


@dataclass
class ApiUsage:
    requests_made: int = 0
    latest_requests_used: str | None = None
    latest_requests_remaining: str | None = None
    latest_credits_used: str | None = None
    latest_credits_remaining: str | None = None

    def record(self, headers: dict[str, str]) -> None:
        self.requests_made += 1
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


def parse_bookmakers(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned or cleaned.lower() in {"all", "*", "any"}:
        return None
    books = [book.strip().lower() for book in cleaned.split(",") if book.strip()]
    return ",".join(dict.fromkeys(books)) or None


def parse_market_keys() -> tuple[str, ...]:
    multi = os.getenv("ODDS_MARKET_KEYS")
    single = os.getenv("ODDS_MARKET_KEY") or os.getenv("MARKET_KEY")
    raw = multi if multi else single
    values = [v.strip() for v in raw.split(",")] if raw else list(DEFAULT_MARKETS)
    keys = tuple(dict.fromkeys(v for v in values if v))
    unsupported = [key for key in keys if key not in TARGET_LINES]
    if unsupported:
        raise RuntimeError(f"Unsupported batter prop market key(s): {', '.join(unsupported)}")
    if not keys:
        raise RuntimeError("At least one batter prop market key is required")
    return keys


def load_config() -> Config:
    return Config(
        supabase_url=require_env("SUPABASE_URL"),
        supabase_key=require_env("SUPABASE_SERVICE_ROLE_KEY"),
        api_key=require_env("THE_ODDS_API_KEY"),
        provider=os.getenv("ODDS_PROVIDER", "the_odds_api"),
        sport_key=os.getenv("ODDS_SPORT_KEY") or os.getenv("SPORT_KEY", "baseball_mlb"),
        regions=os.getenv("ODDS_REGIONS", "us") or None,
        bookmakers=parse_bookmakers(os.getenv("ODDS_BOOKMAKERS") or os.getenv("BOOKMAKERS")),
        market_keys=parse_market_keys(),
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
    return url.replace(api_key, "***") if api_key else url


def build_url(path: str, params: dict[str, Any]) -> str:
    clean = {k: v for k, v in params.items() if v is not None and v != ""}
    return f"{API_BASE}{path}?{urlencode(clean)}"


def normalize_iso(value: str | None) -> str | None:
    return value.replace("Z", "+00:00") if value else None


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def date_from_iso_eastern(value: str | None) -> str | None:
    dt = parse_dt(value)
    return dt.astimezone(EASTERN_TZ).date().isoformat() if dt else None


def today_eastern() -> str:
    return datetime.now(EASTERN_TZ).date().isoformat()


def stable_load_key(row: dict[str, Any]) -> str:
    parts = [
        row.get("odds_provider") or "",
        row.get("book_name") or "",
        row.get("provider_event_id") or "",
        row.get("game_date") or "",
        row.get("player_name_raw") or "",
        row.get("market_key") or "",
        str(row.get("line") or ""),
        (row.get("outcome_name") or "").lower(),
    ]
    return hashlib.md5("|".join(parts).lower().encode("utf-8")).hexdigest()


def event_is_target_date(event: dict[str, Any], target_date: str) -> bool:
    return date_from_iso_eastern(event.get("commence_time")) == target_date


def event_has_started(event: dict[str, Any]) -> bool:
    dt = parse_dt(event.get("commence_time"))
    return bool(dt and dt <= datetime.now(timezone.utc))


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
        "markets": ",".join(cfg.market_keys),
        "oddsFormat": "american",
        "bookmakers": cfg.bookmakers,
    }
    url = build_url(f"/sports/{cfg.sport_key}/events/{event_id}/odds", params)
    payload, headers = http_get_json(url)
    if not isinstance(payload, dict):
        raise RuntimeError(f"Unexpected odds response for event {event_id}: {payload}")
    return payload, headers


def extract_batter_prop_rows(
    event: dict[str, Any], odds_payload: dict[str, Any], cfg: Config
) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    event_id = str(odds_payload.get("id") or event.get("id") or "")
    commence_time = normalize_iso(odds_payload.get("commence_time") or event.get("commence_time"))
    game_date = date_from_iso_eastern(commence_time)
    home_team = odds_payload.get("home_team") or event.get("home_team")
    away_team = odds_payload.get("away_team") or event.get("away_team")
    allowed_books = (
        {book.strip().lower() for book in cfg.bookmakers.split(",") if book.strip()}
        if cfg.bookmakers else None
    )

    for bookmaker in odds_payload.get("bookmakers", []) or []:
        book_key = str(bookmaker.get("key") or bookmaker.get("title") or "unknown")
        if allowed_books and book_key.lower() not in allowed_books:
            continue
        book_update = normalize_iso(bookmaker.get("last_update"))

        for market in bookmaker.get("markets", []) or []:
            market_key = str(market.get("key") or "")
            if market_key not in cfg.market_keys:
                continue
            target_line = TARGET_LINES[market_key]
            market_update = normalize_iso(market.get("last_update")) or book_update

            for outcome in market.get("outcomes", []) or []:
                outcome_name = str(outcome.get("name") or "").strip()
                if outcome_name.lower() not in {"over", "under"}:
                    continue
                try:
                    line = float(outcome.get("point"))
                    american_odds = int(outcome.get("price"))
                except (TypeError, ValueError):
                    continue
                if line != target_line:
                    continue

                player_name = outcome.get("description") or outcome.get("participant") or outcome.get("player")
                if not player_name:
                    continue

                row = {
                    "odds_provider": cfg.provider,
                    "book_name": book_key,
                    "provider_event_id": event_id,
                    "provider_market_id": market_key,
                    "game_pk": None,
                    "game_date": game_date,
                    "commence_time_utc": commence_time,
                    "home_team": home_team,
                    "away_team": away_team,
                    "player_id": None,
                    "player_name_raw": str(player_name),
                    "market_key": market_key,
                    "market_name": MARKET_NAMES[market_key],
                    "line": line,
                    "outcome_name": outcome_name,
                    "american_odds": american_odds,
                    "decimal_odds": None,
                    "odds_last_update": market_update,
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
                            "key": market_key,
                            "last_update": market.get("last_update"),
                        },
                        "outcome": outcome,
                    },
                }
                row["load_key"] = stable_load_key(row)
                rows.append(row)
    return rows


def chunked(items: list[dict[str, Any]], size: int = 500) -> list[list[dict[str, Any]]]:
    return [items[i:i + size] for i in range(0, len(items), size)]


def print_usage(usage: ApiUsage) -> None:
    print("API usage:")
    print(json.dumps({
        "requests_made": usage.requests_made,
        "requests_used": usage.latest_requests_used,
        "requests_remaining": usage.latest_requests_remaining,
        "credits_used": usage.latest_credits_used,
        "credits_remaining": usage.latest_credits_remaining,
    }, indent=2))


def main() -> int:
    cfg = load_config()
    target_date = cfg.target_date or today_eastern()
    client = create_client(cfg.supabase_url, cfg.supabase_key)
    usage = ApiUsage()

    print("Batter prop odds loader config:")
    print(json.dumps({
        "provider": cfg.provider,
        "sport_key": cfg.sport_key,
        "market_keys": cfg.market_keys,
        "canonical_lines": {k: TARGET_LINES[k] for k in cfg.market_keys},
        "bookmakers": cfg.bookmakers or "all",
        "regions": cfg.regions,
        "target_date_eastern": target_date,
        "skip_started": cfg.skip_started,
        "max_events": cfg.max_events,
        "dry_run": cfg.dry_run,
    }, indent=2))

    events, headers = fetch_events(cfg)
    usage.record(headers)
    candidates = [e for e in events if event_is_target_date(e, target_date)]
    skipped_started = 0
    if cfg.skip_started:
        skipped_started = sum(1 for e in candidates if event_has_started(e))
        candidates = [e for e in candidates if not event_has_started(e)]
    candidates = sorted(candidates, key=lambda e: e.get("commence_time") or "")[:cfg.max_events]

    print(
        f"Provider events: {len(events)}; target-date events: {len(candidates) + skipped_started}; "
        f"skipped started: {skipped_started}; fetching: {len(candidates)}"
    )
    print(f"Estimated HTTP requests: {1 + len(candidates)}")

    all_rows: list[dict[str, Any]] = []
    for idx, event in enumerate(candidates, start=1):
        event_id = str(event.get("id") or "")
        if not event_id:
            continue
        label = f"{event.get('away_team')} at {event.get('home_team')}"
        print(f"[{idx}/{len(candidates)}] Fetching {','.join(cfg.market_keys)} for {label}")
        try:
            payload, odds_headers = fetch_event_odds(event_id, cfg)
            usage.record(odds_headers)
        except RuntimeError as exc:
            print(f"WARNING: {exc}", file=sys.stderr)
            continue
        rows = extract_batter_prop_rows(event, payload, cfg)
        all_rows.extend(rows)
        by_market: dict[str, dict[str, int]] = {}
        for row in rows:
            bucket = by_market.setdefault(row["market_key"], {"over": 0, "under": 0})
            bucket[row["outcome_name"].lower()] += 1
        print(f"  extracted {len(rows)} rows: {json.dumps(by_market, sort_keys=True)}")
        time.sleep(0.15)

    counts: dict[str, dict[str, int]] = {}
    for row in all_rows:
        bucket = counts.setdefault(row["market_key"], {"over": 0, "under": 0})
        bucket[row["outcome_name"].lower()] += 1
    print(f"Total rows prepared: {len(all_rows)}")
    print(f"Prepared rows by market/side: {json.dumps(counts, indent=2, sort_keys=True)}")

    if cfg.dry_run:
        print(json.dumps(all_rows[:12], indent=2, default=str))
        print_usage(usage)
        return 0

    # Replace the current snapshot for the exact provider events fetched.
    # We intentionally delete by event_id + provider + date, without a market filter,
    # because legacy rows may use aliases such as player_hits instead of batter_hits.
    # Keeping those alias rows is what caused the canonical identity unique-key collisions.
    event_ids = sorted({
        str(row.get("provider_event_id") or "")
        for row in all_rows
        if row.get("provider_event_id")
    })
    if event_ids:
        deleted = (
            client.table("mlb_player_hit_prop_market_odds")
            .delete()
            .eq("odds_provider", cfg.provider)
            .eq("game_date", target_date)
            .in_("provider_event_id", event_ids)
            .execute()
        )
        print(f"Prior rows replaced for fetched events: {len(deleted.data or [])}")

    # Defensive de-duplication by the same canonical identity enforced by
    # ux_mlb_player_hit_prop_market_odds_identity. This protects against a provider
    # returning duplicate outcomes with different load_key spellings/casing.
    identity_rows: dict[tuple[str, str, str, str, str, str, float, str], dict[str, Any]] = {}
    for row in all_rows:
        identity = (
            str(row.get("odds_provider") or "").lower(),
            str(row.get("book_name") or "").lower(),
            str(row.get("provider_event_id") or ""),
            str(row.get("game_date") or ""),
            str(row.get("player_name_raw") or "").strip().lower(),
            str(row.get("market_key") or "").lower(),
            float(row.get("line") or 0),
            str(row.get("outcome_name") or "").lower(),
        )
        identity_rows[identity] = row
    all_rows = list(identity_rows.values())

    rows_upserted = 0
    for batch in chunked(all_rows):
        result = client.table("mlb_player_hit_prop_market_odds").insert(batch).execute()
        rows_upserted += len(result.data or [])
    print(f"Rows inserted: {rows_upserted}")

    try:
        paired = (
            client.table("v_mlb_batter_prop_market_no_vig_best")
            .select("market_key,game_pk,player_id,book_name,no_vig_over_probability")
            .eq("game_date", target_date)
            .execute()
        )
        pair_counts: dict[str, int] = {}
        for row in paired.data or []:
            key = row.get("market_key") or "unknown"
            pair_counts[key] = pair_counts.get(key, 0) + 1
        print(f"Paired no-vig rows by market: {json.dumps(pair_counts, sort_keys=True)}")
    except Exception as exc:  # noqa: BLE001
        print(f"WARNING: unable to read paired no-vig view: {exc}", file=sys.stderr)

    print_usage(usage)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
