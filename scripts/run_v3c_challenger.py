#!/usr/bin/env python3
"""
Run the MLB Hit Lab V3-C contradiction-penalty challenger.

V3-C is a shadow challenger. It does not modify V3 predictions. The database
functions perform the scoring, re-ranking, and actual-result synchronization.

Required environment variables:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

Optional environment variables:
  TARGET_DATE          YYYY-MM-DD shorthand used for both score and sync
  V3C_SCORE_DATE       YYYY-MM-DD date to refresh V3-C predictions
  V3C_ACTUALS_DATE     YYYY-MM-DD date whose V3-C actuals should be synchronized
  V3C_MODE             score, sync, or both
  V3C_PENALTY_VERSION  default: v3c_contradiction_penalty_v1
"""

from __future__ import annotations

import argparse
import os
import time
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from supabase import Client, create_client


V3C_TABLE = "mlb_ml_predictions_v3c"
REFRESH_RPC = "refresh_mlb_v3c_for_date"
SYNC_RPC = "sync_mlb_v3c_actuals"
DEFAULT_VERSION = "v3c_contradiction_penalty_v1"
EASTERN = ZoneInfo("America/New_York")

TRANSIENT_MARKERS = (
    "'code': 522",
    '"code": 522',
    "'code': 502",
    '"code": 502',
    "'code': 503",
    '"code": 503',
    "'code': 504",
    '"code": 504',
    "connection timed out",
    "read operation timed out",
    "readtimeout",
    "connecttimeout",
    "timed out",
    "connection terminated",
    "server disconnected",
    "remote protocol error",
    "cloudflare",
    "<!doctype html>",
    "json could not be generated",
    "bad gateway",
    "service unavailable",
    "gateway timeout",
)


def parse_iso_date(value: str, field_name: str) -> str:
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise ValueError(
            f"{field_name} must use YYYY-MM-DD format; received {value!r}."
        ) from exc


def is_transient_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return any(marker in message for marker in TRANSIENT_MARKERS)


def execute_with_retry(callable_factory, *, attempts: int = 5, first_delay: int = 3):
    delay = first_delay
    for attempt in range(1, attempts + 1):
        try:
            return callable_factory()
        except Exception as exc:
            if not is_transient_error(exc) or attempt == attempts:
                raise
            print(
                f"Transient Supabase error on attempt {attempt}/{attempts}: {exc}"
            )
            print(f"Retrying in {delay} seconds...")
            time.sleep(delay)
            delay *= 2
    raise RuntimeError("Retry loop exited unexpectedly.")


def normalize_rpc_result(value: Any) -> Any:
    if isinstance(value, list):
        if len(value) == 1:
            return value[0]
        return value
    return value


def count_v3c_rows(
    client: Client,
    prediction_date: str,
    penalty_version: str,
    *,
    actual_loaded: bool | None = None,
) -> int:
    def query():
        request = (
            client.table(V3C_TABLE)
            .select("id", count="exact")
            .eq("prediction_run_date", prediction_date)
            .eq("penalty_version", penalty_version)
        )
        if actual_loaded is not None:
            request = request.eq("actual_loaded", actual_loaded)
        return request.limit(1).execute()

    result = execute_with_retry(query)
    return int(result.count or 0)


def refresh_v3c(
    client: Client,
    prediction_date: str,
    penalty_version: str,
) -> None:
    print(
        f"Refreshing V3-C predictions: date={prediction_date}, "
        f"version={penalty_version}"
    )

    result = execute_with_retry(
        lambda: client.rpc(
            REFRESH_RPC,
            {
                "p_date": prediction_date,
                "p_penalty_version": penalty_version,
            },
        ).execute()
    )
    payload = normalize_rpc_result(result.data)
    print(f"{REFRESH_RPC} result: {payload}")

    row_count = count_v3c_rows(client, prediction_date, penalty_version)
    if row_count <= 0:
        raise RuntimeError(
            f"V3-C refresh completed but no rows exist for {prediction_date} "
            f"and version {penalty_version}."
        )

    print(f"V3-C scoring validation passed: {row_count} challenger rows.")


def sync_v3c_actuals(
    client: Client,
    actuals_date: str,
    penalty_version: str,
) -> None:
    existing_rows = count_v3c_rows(client, actuals_date, penalty_version)
    if existing_rows <= 0:
        raise RuntimeError(
            f"No V3-C rows exist for {actuals_date}. Run V3-C scoring before "
            "synchronizing actuals."
        )

    print(
        f"Synchronizing V3-C actuals: date={actuals_date}, "
        f"version={penalty_version}"
    )

    result = execute_with_retry(
        lambda: client.rpc(
            SYNC_RPC,
            {
                "p_date": actuals_date,
                "p_penalty_version": penalty_version,
            },
        ).execute()
    )
    payload = normalize_rpc_result(result.data)
    print(f"{SYNC_RPC} result: {payload}")

    loaded_count = count_v3c_rows(
        client,
        actuals_date,
        penalty_version,
        actual_loaded=True,
    )
    print(
        f"V3-C actuals status for {actuals_date}: "
        f"{loaded_count}/{existing_rows} rows marked actual_loaded."
    )

    # Do not fail when zero rows are loaded. A same-day manual run can occur before
    # games are final, and the later Load V3 Hit Actuals workflow will run sync again.
    if loaded_count <= 0:
        print(
            "WARNING: No V3-C rows are marked actual_loaded yet. This is expected "
            "when games are not final or baseline V3 actuals have not loaded."
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Score and/or synchronize the V3-C shadow challenger."
    )
    parser.add_argument(
        "--mode",
        choices=("score", "sync", "both"),
        default=(os.getenv("V3C_MODE") or "both").strip().lower(),
    )
    parser.add_argument(
        "--target-date",
        default=(os.getenv("TARGET_DATE") or "").strip(),
        help="YYYY-MM-DD shorthand used for both score and sync.",
    )
    parser.add_argument(
        "--score-date",
        default=(os.getenv("V3C_SCORE_DATE") or "").strip(),
        help="YYYY-MM-DD V3 prediction date to score.",
    )
    parser.add_argument(
        "--actuals-date",
        default=(os.getenv("V3C_ACTUALS_DATE") or "").strip(),
        help="YYYY-MM-DD V3-C date whose actuals should be synchronized.",
    )
    parser.add_argument(
        "--penalty-version",
        default=(
            os.getenv("V3C_PENALTY_VERSION") or DEFAULT_VERSION
        ).strip(),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    supabase_url = (os.getenv("SUPABASE_URL") or "").strip()
    supabase_key = (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    if not supabase_url or not supabase_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required."
        )

    today_eastern = datetime.now(EASTERN).date()
    target_date = args.target_date

    score_date = args.score_date or target_date or today_eastern.isoformat()
    actuals_date = (
        args.actuals_date
        or target_date
        or (today_eastern - timedelta(days=1)).isoformat()
    )

    score_date = parse_iso_date(score_date, "score date")
    actuals_date = parse_iso_date(actuals_date, "actuals date")

    print("V3-C challenger runner")
    print(f"mode={args.mode}")
    print(f"score_date={score_date}")
    print(f"actuals_date={actuals_date}")
    print(f"penalty_version={args.penalty_version}")

    client = create_client(supabase_url, supabase_key)

    if args.mode in ("score", "both"):
        refresh_v3c(client, score_date, args.penalty_version)

    if args.mode in ("sync", "both"):
        sync_v3c_actuals(client, actuals_date, args.penalty_version)

    print("V3-C challenger run completed successfully.")


if __name__ == "__main__":
    main()
