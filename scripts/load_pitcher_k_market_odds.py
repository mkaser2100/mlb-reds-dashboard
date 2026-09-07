#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from supabase import create_client

API_BASE = "https://api.the-odds-api.com/v4"
ET = ZoneInfo("America/New_York")


def require(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def normalize_name(value: str) -> str:
    return " ".join(
        value.lower().replace(".", "").replace("'", "").replace("-", " ").split()
    )


def parse_dt(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def eastern_date(value: str | None) -> str | None:
    dt = parse_dt(value)
    return dt.astimezone(ET).date().isoformat() if dt else None


def american_to_decimal(price: int) -> float:
    return 1 + (100 / abs(price) if price < 0 else price / 100)


def american_to_implied(price: int) -> float:
    return abs(price) / (abs(price) + 100) if price < 0 else 100 / (price + 100)


def get_json(path: str, params: dict, max_attempts: int = 4):
    url = f"{API_BASE}{path}?{urlencode(params)}"
    req = Request(url, headers={"User-Agent": "mlb-hit-lab/1.0"})

    for attempt in range(1, max_attempts + 1):
        try:
            with urlopen(req, timeout=45) as response:
                return (
                    json.loads(response.read().decode()),
                    {k.lower(): v for k, v in response.headers.items()},
                )
        except HTTPError as exc:
            # Retry transient provider/server/rate-limit failures only.
            if exc.code not in {408, 425, 429, 500, 502, 503, 504} or attempt == max_attempts:
                body = exc.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Odds API HTTP {exc.code}: {body}") from exc
            wait_seconds = 2 ** (attempt - 1)
            print(
                f"Transient Odds API HTTP {exc.code}; retrying "
                f"{attempt}/{max_attempts} after {wait_seconds}s..."
            )
            time.sleep(wait_seconds)
        except (URLError, ConnectionResetError, TimeoutError, OSError) as exc:
            if attempt == max_attempts:
                raise RuntimeError(
                    f"Odds API network request failed after {max_attempts} attempts: {exc}"
                ) from exc
            wait_seconds = 2 ** (attempt - 1)
            print(
                f"Transient Odds API network error ({exc}); retrying "
                f"{attempt}/{max_attempts} after {wait_seconds}s..."
            )
            time.sleep(wait_seconds)

    raise RuntimeError("Odds API request failed unexpectedly")


def stable_load_key(row: dict) -> str:
    parts = [
        row.get("odds_provider", ""),
        row.get("book_name", ""),
        row.get("provider_event_id", ""),
        row.get("pitcher_name_raw", ""),
        str(row.get("line", "")),
        row.get("outcome_name", ""),
        row.get("odds_last_update", ""),
    ]
    return hashlib.md5("|".join(parts).lower().encode()).hexdigest()


def main() -> int:
    sb = create_client(require("SUPABASE_URL"), require("SUPABASE_SERVICE_ROLE_KEY"))
    api_key = require("THE_ODDS_API_KEY")
    target_date = os.getenv("ODDS_TARGET_DATE") or datetime.now(ET).date().isoformat()
    regions = os.getenv("ODDS_REGIONS", "us")
    books_raw = (os.getenv("BOOKMAKERS") or "all").strip().lower()
    books = (
        None
        if books_raw in {"all", "*", "any", ""}
        else {x.strip() for x in books_raw.split(",") if x.strip()}
    )

    predictions = (
        sb.table("mlb_ml_pitcher_k_predictions")
        .select("game_pk,game_date,pitcher_id,pitcher_name")
        .eq("game_date", target_date)
        .execute()
        .data
        or []
    )

    by_name: dict[str, list[dict]] = {}
    for prediction in predictions:
        key = normalize_name(prediction.get("pitcher_name") or "")
        if key:
            by_name.setdefault(key, []).append(prediction)

    events, headers = get_json(
        "/sports/baseball_mlb/events",
        {"apiKey": api_key},
    )

    now_utc = datetime.now(timezone.utc)
    rows: list[dict] = []
    processed = 0

    for event in events:
        commence = event.get("commence_time")
        if eastern_date(commence) != target_date:
            continue

        start_dt = parse_dt(commence)
        if start_dt and start_dt <= now_utc:
            continue

        event_id = str(event.get("id") or "")
        payload, headers = get_json(
            f"/sports/baseball_mlb/events/{event_id}/odds",
            {
                "apiKey": api_key,
                "regions": regions,
                "markets": "pitcher_strikeouts",
                "oddsFormat": "american",
            },
        )
        processed += 1

        for bookmaker in payload.get("bookmakers", []) or []:
            book_key = str(
                bookmaker.get("key") or bookmaker.get("title") or "unknown"
            ).lower()
            if books and book_key not in books:
                continue

            for market in bookmaker.get("markets", []) or []:
                if market.get("key") != "pitcher_strikeouts":
                    continue

                updated = market.get("last_update") or bookmaker.get("last_update")

                for outcome in market.get("outcomes", []) or []:
                    side = str(outcome.get("name") or "").strip().lower()
                    if side not in {"over", "under"}:
                        continue

                    try:
                        line = float(outcome.get("point"))
                        price = int(outcome.get("price"))
                    except (TypeError, ValueError):
                        continue

                    pitcher_name = (
                        outcome.get("description")
                        or outcome.get("participant")
                        or outcome.get("player")
                    )
                    if not pitcher_name:
                        continue

                    norm = normalize_name(str(pitcher_name))
                    matches = by_name.get(norm, [])
                    resolved = matches[0] if len(matches) == 1 else {}

                    row = {
                        "odds_provider": "the_odds_api",
                        "book_name": book_key,
                        "provider_event_id": event_id,
                        "provider_market_id": "pitcher_strikeouts",
                        "game_pk": resolved.get("game_pk"),
                        "game_date": target_date,
                        "commence_time_utc": commence,
                        "home_team": payload.get("home_team") or event.get("home_team"),
                        "away_team": payload.get("away_team") or event.get("away_team"),
                        "pitcher_id": resolved.get("pitcher_id"),
                        "pitcher_name_raw": str(pitcher_name),
                        "normalized_pitcher_name": norm,
                        "market_key": "pitcher_strikeouts",
                        "market_name": "Pitcher Strikeouts",
                        "line": line,
                        "outcome_name": side,
                        "american_odds": price,
                        "decimal_odds": american_to_decimal(price),
                        "implied_probability": american_to_implied(price),
                        "odds_last_update": updated,
                        "fetched_at": now_utc.isoformat(),
                        "raw_payload": {"outcome": outcome},
                    }
                    row["load_key"] = stable_load_key(row)
                    rows.append(row)

    if rows:
        for i in range(0, len(rows), 500):
            (
                sb.table("mlb_pitcher_k_market_odds")
                .upsert(rows[i : i + 500], on_conflict="load_key")
                .execute()
            )

    resolved_rows = sum(1 for row in rows if row.get("pitcher_id"))
    no_vig = (
        sb.table("v_mlb_pitcher_k_market_no_vig")
        .select("line", count="exact")
        .eq("game_date", target_date)
        .execute()
    )
    edges = (
        sb.table("v_mlb_pitcher_k_market_edges")
        .select("line", count="exact")
        .eq("game_date", target_date)
        .execute()
    )

    print(f"Pitcher K odds target date: {target_date}")
    print(f"Events processed: {processed}")
    print(f"Odds rows prepared/upserted: {len(rows)}")
    print(f"Rows resolved to pitcher_id: {resolved_rows}/{len(rows) if rows else 0}")
    print(f"No-vig paired markets: {no_vig.count or 0}")
    print(f"Model-vs-market edge rows: {edges.count or 0}")
    print(f"Odds API remaining: {headers.get('x-requests-remaining', 'unknown')}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
