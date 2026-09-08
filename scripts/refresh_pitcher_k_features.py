#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, Mapping, Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("SUPABASE_SERVICE_KEY")
    or ""
)

FEATURE_TABLE = "mlb_ml_pitcher_k_features_daily"
DAILY_RPC = "refresh_mlb_ml_pitcher_k_features"
BACKFILL_RPC = "backfill_mlb_ml_pitcher_k_features"
SYNC_OFFICIAL_STARTERS_RPC = "sync_mlb_official_starters_to_context"
APPLY_CONFIRMED_LINEUPS_RPC = "apply_mlb_pitcher_k_confirmed_lineups"

# Starter context can arrive shortly after this branch begins. Retry rather than
# failing the entire Pitcher K scorer on the first empty feature refresh.
DAILY_MAX_ATTEMPTS = max(
    1, int(os.environ.get("PITCHER_K_FEATURE_MAX_ATTEMPTS", "8"))
)
DAILY_RETRY_SECONDS = max(
    1, int(os.environ.get("PITCHER_K_FEATURE_RETRY_SECONDS", "30"))
)


class PitcherKFeatureError(RuntimeError):
    pass


def log(message: str) -> None:
    print(message, flush=True)


def require_environment() -> None:
    missing = []
    if not SUPABASE_URL:
        missing.append("SUPABASE_URL")
    if not SUPABASE_KEY:
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if missing:
        raise PitcherKFeatureError(
            "Missing required environment variable(s): " + ", ".join(missing)
        )


def api_request(
    method: str,
    path: str,
    *,
    body: Any = None,
    extra_headers: Optional[Mapping[str, str]] = None,
    timeout: int = 120,
) -> Any:
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)

    data = None
    if body is not None:
        data = json.dumps(body, separators=(",", ":")).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            if not raw:
                return None
            return json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise PitcherKFeatureError(
            f"{method} {path} failed: HTTP {exc.code}: {detail}"
        ) from exc
    except urllib.error.URLError as exc:
        raise PitcherKFeatureError(f"{method} {path} failed: {exc}") from exc


def rpc(name: str, body: Mapping[str, Any]) -> Any:
    return api_request("POST", f"/rest/v1/rpc/{name}", body=body)


def rest_get(table_or_view: str, params: Mapping[str, str]) -> Any:
    query = urllib.parse.urlencode(params, safe="(),.*")
    return api_request("GET", f"/rest/v1/{table_or_view}?{query}")


def ny_today() -> str:
    from zoneinfo import ZoneInfo

    return dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def validate_iso_date(value: str) -> str:
    try:
        return dt.date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'. Expected YYYY-MM-DD."
        ) from exc


def get_daily_rows(game_date: str) -> list[dict[str, Any]]:
    rows = rest_get(
        FEATURE_TABLE,
        {
            "select": (
                "game_date,game_pk,pitcher_id,pitcher_name,lineup_source,"
                "lineup_confirmed,feature_version,actual_strikeouts,"
                "actual_batters_faced"
            ),
            "game_date": f"eq.{game_date}",
            "order": "game_pk.asc,pitcher_id.asc",
        },
    )
    if not isinstance(rows, list):
        raise PitcherKFeatureError(
            f"Expected a row list from {FEATURE_TABLE}, got {type(rows).__name__}"
        )
    return rows


def get_starter_context_count(game_date: str) -> int:
    rows = rest_get(
        "mlb_game_starting_pitcher_context_cache",
        {
            "select": "game_pk,pitcher_id",
            "game_date": f"eq.{game_date}",
            "pitcher_id": "not.is.null",
        },
    )
    return len(rows) if isinstance(rows, list) else 0


def run_daily(game_date: str) -> Dict[str, Any]:
    log(f"Refreshing pitcher-K features for {game_date} ...")

    rows: list[dict[str, Any]] = []

    for attempt in range(1, DAILY_MAX_ATTEMPTS + 1):
        log(f"Pitcher-K feature attempt {attempt}/{DAILY_MAX_ATTEMPTS}")

        starter_sync = rpc(
            SYNC_OFFICIAL_STARTERS_RPC, {"p_game_date": game_date}
        )
        log(f"Official starter sync: {json.dumps(starter_sync, default=str)}")

        context_count = get_starter_context_count(game_date)
        log(f"Resolved starter context rows available: {context_count}")

        result = rpc(DAILY_RPC, {"p_game_date": game_date})
        log(f"Base feature RPC result: {json.dumps(result, default=str)}")

        lineup_result = rpc(
            APPLY_CONFIRMED_LINEUPS_RPC, {"p_game_date": game_date}
        )
        log(
            "Confirmed-lineup overlay: "
            f"{json.dumps(lineup_result, default=str)}"
        )

        rows = get_daily_rows(game_date)
        if rows:
            if attempt > 1:
                log(
                    f"Pitcher-K feature refresh recovered on attempt {attempt} "
                    f"with {len(rows)} rows."
                )
            break

        if attempt < DAILY_MAX_ATTEMPTS:
            log(
                "No pitcher-K feature rows yet. Starter context may still be "
                f"arriving; waiting {DAILY_RETRY_SECONDS}s before retry."
            )
            time.sleep(DAILY_RETRY_SECONDS)

    if not rows:
        final_context_count = get_starter_context_count(game_date)
        raise PitcherKFeatureError(
            f"No pitcher-K feature rows found for {game_date} after "
            f"{DAILY_MAX_ATTEMPTS} attempts. Final resolved starter context "
            f"rows: {final_context_count}."
        )

    duplicate_count = len(rows) - len(
        set((r.get("game_pk"), r.get("pitcher_id")) for r in rows)
    )
    if duplicate_count:
        raise PitcherKFeatureError(
            f"Duplicate pitcher-game rows detected after refresh: {duplicate_count}"
        )

    confirmed = sum(1 for r in rows if bool(r.get("lineup_confirmed")))
    with_actual_k = sum(
        1 for r in rows if r.get("actual_strikeouts") is not None
    )
    with_bf = sum(
        1 for r in rows if r.get("actual_batters_faced") is not None
    )

    summary = {
        "game_date": game_date,
        "rows": len(rows),
        "confirmed_lineups": confirmed,
        "rows_with_actual_k": with_actual_k,
        "rows_with_batters_faced": with_bf,
        "feature_versions": sorted(
            {
                str(r.get("feature_version"))
                for r in rows
                if r.get("feature_version")
            }
        ),
    }

    log("Validation summary:")
    log(json.dumps(summary, indent=2))
    return summary


def run_backfill(start_date: str, end_date: str) -> Dict[str, Any]:
    if start_date > end_date:
        raise PitcherKFeatureError("--start-date must be <= --end-date")

    log(
        f"Backfilling pitcher-K features from {start_date} "
        f"through {end_date} ..."
    )

    result = rpc(
        BACKFILL_RPC,
        {
            "p_start_date": start_date,
            "p_end_date": end_date,
        },
    )
    log(f"RPC result: {json.dumps(result, default=str)}")

    count_rows = rest_get(
        FEATURE_TABLE,
        {
            "select": "game_date,pitcher_id",
            "game_date": f"gte.{start_date}",
            "and": f"(game_date.lte.{end_date})",
        },
    )

    if not isinstance(count_rows, list):
        raise PitcherKFeatureError(
            f"Expected a row list from {FEATURE_TABLE}, "
            f"got {type(count_rows).__name__}"
        )

    summary = {
        "start_date": start_date,
        "end_date": end_date,
        "rows_found": len(count_rows),
    }
    log("Backfill validation summary:")
    log(json.dumps(summary, indent=2))
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh or backfill compact pitcher strikeout model features."
    )

    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--date",
        type=validate_iso_date,
        help=(
            "Game date to refresh (YYYY-MM-DD). Defaults to today in "
            "America/New_York."
        ),
    )
    mode.add_argument(
        "--backfill",
        action="store_true",
        help=(
            "Run historical backfill mode. Requires --start-date and --end-date."
        ),
    )

    parser.add_argument("--start-date", type=validate_iso_date)
    parser.add_argument("--end-date", type=validate_iso_date)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    require_environment()

    if args.backfill:
        if not args.start_date or not args.end_date:
            raise PitcherKFeatureError(
                "--backfill requires both --start-date and --end-date"
            )
        run_backfill(args.start_date, args.end_date)
    else:
        run_daily(args.date or ny_today())

    log("Pitcher-K feature orchestration completed successfully.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except PitcherKFeatureError as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1)
