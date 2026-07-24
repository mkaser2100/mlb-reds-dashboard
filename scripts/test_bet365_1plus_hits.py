#!/usr/bin/env python3
"""
Diagnostic-only test for Bet365 MLB 1+ hit markets through The Odds API.

This script does NOT write to Supabase.

Required environment variable:
  THE_ODDS_API_KEY

Optional environment variables:
  TEST_TARGET_DATE=YYYY-MM-DD   # Defaults to today's date in America/New_York
  TEST_MAX_EVENTS=3             # Defaults to 3 upcoming games
  TEST_REGIONS=us,uk            # Defaults to us,uk

What it tests:
  - bookmaker: bet365 only
  - markets: batter_hits and batter_hits_alternate
  - identifies standard Over 0.5 outcomes
  - identifies likely "1+ hit" alternate outcomes
  - writes the complete API responses to bet365_hit_prop_test_output.json
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

API_BASE = "https://api.the-odds-api.com/v4"
SPORT_KEY = "baseball_mlb"
BOOKMAKER = "bet365"
MARKETS = "batter_hits,batter_hits_alternate"
EASTERN = ZoneInfo("America/New_York")
OUTPUT_FILE = Path("bet365_hit_prop_test_output.json")


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def build_url(path: str, params: dict[str, Any]) -> str:
    clean = {key: value for key, value in params.items() if value not in (None, "")}
    return f"{API_BASE}{path}?{urlencode(clean)}"


def redact(url: str, api_key: str) -> str:
    return url.replace(api_key, "***")


def get_json(url: str, api_key: str) -> tuple[Any, dict[str, str]]:
    request = Request(url, headers={"User-Agent": "mlb-hit-lab-bet365-test/1.0"})
    try:
        with urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
            headers = {key.lower(): value for key, value in response.headers.items()}
            return json.loads(body), headers
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} for {redact(url, api_key)}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Network error for {redact(url, api_key)}: {exc}") from exc


def parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def eastern_date(value: str | None) -> str | None:
    parsed = parse_dt(value)
    return parsed.astimezone(EASTERN).date().isoformat() if parsed else None


def is_started(value: str | None) -> bool:
    parsed = parse_dt(value)
    return bool(parsed and parsed <= datetime.now(timezone.utc))


def usage_headers(headers: dict[str, str]) -> dict[str, str]:
    return {
        key: value
        for key, value in headers.items()
        if any(token in key for token in ("request", "credit", "remaining", "used"))
    }


def likely_one_plus(outcome: dict[str, Any]) -> bool:
    name = str(outcome.get("name") or "").strip().lower()
    description = str(outcome.get("description") or "").strip().lower()
    point = outcome.get("point")

    try:
        numeric_point = float(point)
    except (TypeError, ValueError):
        numeric_point = None

    if name == "over" and numeric_point == 0.5:
        return True

    combined = f"{name} {description}"
    phrases = ("1+", "1 +", "1 or more", "at least 1", "one or more")
    return any(phrase in combined for phrase in phrases)


def main() -> int:
    api_key = require_env("THE_ODDS_API_KEY")
    target_date = os.getenv("TEST_TARGET_DATE") or datetime.now(EASTERN).date().isoformat()
    max_events = int(os.getenv("TEST_MAX_EVENTS", "3"))
    regions = os.getenv("TEST_REGIONS", "us,uk")

    print("Bet365 1+ Hits diagnostic")
    print(json.dumps({
        "sport": SPORT_KEY,
        "bookmaker": BOOKMAKER,
        "markets": MARKETS,
        "target_date_eastern": target_date,
        "max_events": max_events,
        "regions": regions,
    }, indent=2))

    events_url = build_url(
        f"/sports/{SPORT_KEY}/events",
        {"apiKey": api_key},
    )
    events, event_headers = get_json(events_url, api_key)
    if not isinstance(events, list):
        raise RuntimeError(f"Unexpected events response: {events}")

    candidates = [
        event for event in events
        if eastern_date(event.get("commence_time")) == target_date
        and not is_started(event.get("commence_time"))
    ]
    candidates.sort(key=lambda event: event.get("commence_time") or "")
    candidates = candidates[:max_events]

    print(f"\nUpcoming events selected: {len(candidates)}")
    print(f"Events call usage: {json.dumps(usage_headers(event_headers))}")

    report: dict[str, Any] = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "configuration": {
            "sport": SPORT_KEY,
            "bookmaker": BOOKMAKER,
            "markets": MARKETS.split(","),
            "target_date_eastern": target_date,
            "regions": regions,
        },
        "events": [],
    }

    total_books = 0
    total_markets = 0
    total_outcomes = 0
    total_one_plus = 0

    for index, event in enumerate(candidates, start=1):
        event_id = str(event.get("id") or "")
        label = f"{event.get('away_team')} at {event.get('home_team')}"
        print(f"\n[{index}/{len(candidates)}] {label}")

        odds_url = build_url(
            f"/sports/{SPORT_KEY}/events/{event_id}/odds",
            {
                "apiKey": api_key,
                "regions": regions,
                "markets": MARKETS,
                "oddsFormat": "american",
                "bookmakers": BOOKMAKER,
            },
        )

        payload, headers = get_json(odds_url, api_key)
        bookmakers = payload.get("bookmakers", []) if isinstance(payload, dict) else []
        returned_book_keys = [book.get("key") for book in bookmakers]
        print(f"  Bookmakers returned: {returned_book_keys or 'NONE'}")

        event_result: dict[str, Any] = {
            "event_id": event_id,
            "game": label,
            "commence_time": event.get("commence_time"),
            "usage_headers": usage_headers(headers),
            "returned_bookmakers": returned_book_keys,
            "markets": [],
            "raw_response": payload,
        }

        for bookmaker in bookmakers:
            total_books += 1
            print(f"  Book: {bookmaker.get('key')} ({bookmaker.get('title')})")

            for market in bookmaker.get("markets", []) or []:
                total_markets += 1
                market_key = market.get("key")
                outcomes = market.get("outcomes", []) or []
                total_outcomes += len(outcomes)
                one_plus = [outcome for outcome in outcomes if likely_one_plus(outcome)]
                total_one_plus += len(one_plus)

                print(f"    Market: {market_key} | outcomes={len(outcomes)} | likely 1+={len(one_plus)}")
                for outcome in one_plus[:10]:
                    print(
                        "      MATCH:",
                        json.dumps({
                            "name": outcome.get("name"),
                            "description": outcome.get("description"),
                            "point": outcome.get("point"),
                            "price": outcome.get("price"),
                        }, ensure_ascii=False),
                    )

                event_result["markets"].append({
                    "bookmaker_key": bookmaker.get("key"),
                    "market_key": market_key,
                    "outcome_count": len(outcomes),
                    "likely_one_plus_count": len(one_plus),
                    "likely_one_plus_outcomes": one_plus,
                })

        report["events"].append(event_result)

    OUTPUT_FILE.write_text(json.dumps(report, indent=2, default=str), encoding="utf-8")

    print("\n========== TEST SUMMARY ==========")
    print(f"Events tested: {len(candidates)}")
    print(f"Bet365 bookmaker objects returned: {total_books}")
    print(f"Markets returned: {total_markets}")
    print(f"Outcomes returned: {total_outcomes}")
    print(f"Likely 1+ hit outcomes found: {total_one_plus}")
    print(f"Full responses saved to: {OUTPUT_FILE}")

    if not candidates:
        print("RESULT: No upcoming games matched the target date. Set TEST_TARGET_DATE to a future MLB date.")
    elif total_books == 0:
        print("RESULT: The API returned no Bet365 bookmaker data for the tested events.")
    elif total_one_plus == 0:
        print("RESULT: Bet365 was returned, but no recognizable 1+ hit outcomes were found.")
    else:
        print("RESULT: SUCCESS — Bet365 1+ hit outcomes were found.")

    print("==================================")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # noqa: BLE001
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
