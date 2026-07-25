#!/usr/bin/env python3
"""
Diagnostic-only test for MLB batter hit prop availability across all bookmakers
returned by The Odds API.

This script:
- Does NOT write to Supabase.
- Omits the `bookmakers` request parameter entirely.
- Requests both `batter_hits` and `batter_hits_alternate`.
- Prints every bookmaker and market returned.
- Saves complete raw API responses to:
    all_books_hit_prop_test_output.json
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


API_BASE = "https://api.the-odds-api.com/v4"
OUTPUT_FILE = Path("all_books_hit_prop_test_output.json")
EASTERN = ZoneInfo("America/New_York")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def api_get(url: str, params: dict[str, str]) -> tuple[Any, dict[str, str]]:
    query = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{url}?{query}",
        headers={"User-Agent": "mlb-hit-prop-diagnostic/1.0"},
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            body = response.read().decode("utf-8")
            headers = {key.lower(): value for key, value in response.headers.items()}
            return json.loads(body), headers
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Odds API HTTP {exc.code} for {url}\nResponse: {body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Odds API request failed for {url}: {exc}") from exc


def usage_headers(headers: dict[str, str]) -> dict[str, str]:
    wanted = (
        "x-amzn-requestid",
        "x-requests-remaining",
        "x-requests-last",
        "x-requests-used",
    )
    return {key: headers[key] for key in wanted if key in headers}


def event_date_eastern(event: dict[str, Any]) -> str:
    commence_time = str(event.get("commence_time", ""))
    parsed = datetime.fromisoformat(commence_time.replace("Z", "+00:00"))
    return parsed.astimezone(EASTERN).date().isoformat()


def event_label(event: dict[str, Any]) -> str:
    return f"{event.get('away_team', 'Unknown')} at {event.get('home_team', 'Unknown')}"


def extract_bookmaker_summary(payload: dict[str, Any]) -> dict[str, Any]:
    summary: dict[str, Any] = {
        "event_id": payload.get("id"),
        "away_team": payload.get("away_team"),
        "home_team": payload.get("home_team"),
        "commence_time": payload.get("commence_time"),
        "bookmakers": [],
    }

    for bookmaker in payload.get("bookmakers", []) or []:
        markets = []
        for market in bookmaker.get("markets", []) or []:
            outcomes = market.get("outcomes", []) or []
            markets.append(
                {
                    "key": market.get("key"),
                    "last_update": market.get("last_update"),
                    "outcome_count": len(outcomes),
                    "outcomes": outcomes,
                }
            )

        summary["bookmakers"].append(
            {
                "key": bookmaker.get("key"),
                "title": bookmaker.get("title"),
                "last_update": bookmaker.get("last_update"),
                "markets": markets,
            }
        )

    return summary


def main() -> int:
    api_key = env("THE_ODDS_API_KEY")
    if not api_key:
        print("ERROR: THE_ODDS_API_KEY is not set.", file=sys.stderr)
        return 1

    sport = env("TEST_SPORT_KEY", "baseball_mlb")
    markets = env(
        "TEST_MARKETS",
        "batter_hits,batter_hits_alternate",
    )
    target_date = env(
        "TEST_TARGET_DATE",
        datetime.now(EASTERN).date().isoformat(),
    )
    regions = env("TEST_REGIONS", "us,uk")
    max_events_raw = env("TEST_MAX_EVENTS", "3")

    try:
        max_events = max(1, int(max_events_raw))
    except ValueError:
        print(f"ERROR: TEST_MAX_EVENTS must be an integer, got {max_events_raw!r}.")
        return 1

    print("All-book MLB hit-prop diagnostic")
    print(
        json.dumps(
            {
                "sport": sport,
                "bookmakers_filter": "OMITTED — all returned bookmakers",
                "markets": markets,
                "target_date_eastern": target_date,
                "max_events": max_events,
                "regions": regions,
            },
            indent=2,
        )
    )
    print()

    events_url = f"{API_BASE}/sports/{sport}/events"
    events, event_headers = api_get(
        events_url,
        {
            "apiKey": api_key,
            "dateFormat": "iso",
        },
    )

    if not isinstance(events, list):
        raise RuntimeError(f"Unexpected events response type: {type(events).__name__}")

    selected = [
        event
        for event in events
        if event_date_eastern(event) == target_date
    ][:max_events]

    print(f"Upcoming events selected: {len(selected)}")
    print(f"Events call usage: {json.dumps(usage_headers(event_headers))}")
    print()

    raw_results: dict[str, Any] = {
        "configuration": {
            "sport": sport,
            "bookmakers_filter": None,
            "markets": markets,
            "target_date_eastern": target_date,
            "max_events": max_events,
            "regions": regions,
        },
        "events_call_usage": usage_headers(event_headers),
        "selected_events": [],
    }

    bookmaker_market_matrix: dict[str, set[str]] = defaultdict(set)
    bookmaker_titles: dict[str, str] = {}
    total_bookmaker_objects = 0
    total_market_objects = 0
    total_outcomes = 0

    for index, event in enumerate(selected, start=1):
        label = event_label(event)
        event_id = str(event["id"])
        print(f"[{index}/{len(selected)}] {label}")

        odds_url = f"{API_BASE}/sports/{sport}/events/{event_id}/odds"
        payload, odds_headers = api_get(
            odds_url,
            {
                "apiKey": api_key,
                "regions": regions,
                "markets": markets,
                "oddsFormat": "american",
                "dateFormat": "iso",
                # Intentionally no bookmakers parameter.
            },
        )

        bookmakers = payload.get("bookmakers", []) or []
        print(f"  Bookmakers returned: {len(bookmakers)}")

        if not bookmakers:
            print("    NONE")
        else:
            for bookmaker in bookmakers:
                key = str(bookmaker.get("key", "unknown"))
                title = str(bookmaker.get("title", key))
                bookmaker_titles[key] = title
                total_bookmaker_objects += 1

                market_keys = []
                for market in bookmaker.get("markets", []) or []:
                    market_key = str(market.get("key", "unknown"))
                    outcomes = market.get("outcomes", []) or []
                    bookmaker_market_matrix[key].add(market_key)
                    market_keys.append(f"{market_key} ({len(outcomes)} outcomes)")
                    total_market_objects += 1
                    total_outcomes += len(outcomes)

                market_text = ", ".join(market_keys) if market_keys else "NO MARKETS"
                print(f"    {title} [{key}]: {market_text}")

        raw_results["selected_events"].append(
            {
                "event": {
                    "id": event.get("id"),
                    "sport_key": event.get("sport_key"),
                    "commence_time": event.get("commence_time"),
                    "home_team": event.get("home_team"),
                    "away_team": event.get("away_team"),
                },
                "usage": usage_headers(odds_headers),
                "raw_response": payload,
                "summary": extract_bookmaker_summary(payload),
            }
        )
        print()

    OUTPUT_FILE.write_text(
        json.dumps(raw_results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print("========== BOOKMAKER × MARKET MATRIX ==========")
    if not bookmaker_market_matrix:
        print("No bookmaker/market combinations were returned.")
    else:
        for key in sorted(
            bookmaker_market_matrix,
            key=lambda item: bookmaker_titles.get(item, item).lower(),
        ):
            title = bookmaker_titles.get(key, key)
            print(f"{title} [{key}]")
            for market_key in sorted(bookmaker_market_matrix[key]):
                print(f"  - {market_key}")

    print()
    print("=============== TEST SUMMARY ===============")
    print(f"Events tested: {len(selected)}")
    print(f"Bookmaker objects returned: {total_bookmaker_objects}")
    print(f"Market objects returned: {total_market_objects}")
    print(f"Outcomes returned: {total_outcomes}")
    print(f"Unique bookmakers returned: {len(bookmaker_market_matrix)}")
    print(f"Full responses saved to: {OUTPUT_FILE}")

    bet365_keys = [
        key
        for key, title in bookmaker_titles.items()
        if "bet365" in key.lower() or "bet365" in title.lower()
    ]

    if bet365_keys:
        print(f"RESULT: Bet365 was returned under key(s): {', '.join(bet365_keys)}")
        for key in bet365_keys:
            markets_found = sorted(bookmaker_market_matrix.get(key, set()))
            print(
                f"  {key} markets: "
                + (", ".join(markets_found) if markets_found else "NONE")
            )
    else:
        print("RESULT: Bet365 was not returned for the tested hit-prop requests.")

    print("============================================")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FATAL: {exc}", file=sys.stderr)
        raise
