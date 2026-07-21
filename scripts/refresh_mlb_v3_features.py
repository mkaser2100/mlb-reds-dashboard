#!/usr/bin/env python3
"""Refresh MLB V3 enhancement features independently of Statcast ingestion."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime
from zoneinfo import ZoneInfo

import requests

EASTERN = ZoneInfo("America/New_York")
REFRESH_TIMEOUT_SECONDS = 600
MAX_ATTEMPTS = 4


def parse_iso_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{value}'. Expected YYYY-MM-DD."
        ) from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--game-date",
        type=parse_iso_date,
        default=datetime.now(EASTERN).date(),
        help="Prediction date to refresh. Defaults to today in America/New_York.",
    )
    return parser.parse_args()


def request_with_retries(
    session: requests.Session,
    url: str,
    headers: dict[str, str],
    body: dict[str, str],
) -> requests.Response:
    last_error: Exception | None = None

    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = session.post(
                url,
                headers=headers,
                json=body,
                timeout=REFRESH_TIMEOUT_SECONDS,
            )
            if response.status_code < 500 and response.status_code != 429:
                return response
            response.raise_for_status()
        except requests.RequestException as exc:
            last_error = exc

        if attempt < MAX_ATTEMPTS:
            delay = 2 ** (attempt - 1)
            print(
                f"Refresh attempt {attempt} failed; retrying in {delay}s...",
                file=sys.stderr,
            )
            time.sleep(delay)

    raise RuntimeError(
        f"Feature refresh request failed after {MAX_ATTEMPTS} attempts: {last_error}"
    )


def main() -> int:
    args = parse_args()
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    if not supabase_url or not service_role_key:
        print(
            "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
            file=sys.stderr,
        )
        return 1

    endpoint = (
        f"{supabase_url}/rest/v1/rpc/refresh_mlb_v3_enhancement_features"
    )
    headers = {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    try:
        response = request_with_retries(
            requests.Session(),
            endpoint,
            headers,
            {"p_game_date": args.game_date.isoformat()},
        )
        if not response.ok:
            raise RuntimeError(
                f"Feature refresh failed ({response.status_code}): {response.text}"
            )

        try:
            payload = response.json()
        except ValueError:
            payload = response.text

        print(
            json.dumps(
                {
                    "status": "complete",
                    "game_date": args.game_date.isoformat(),
                    "result": payload,
                },
                default=str,
                indent=2,
            )
        )
        return 0
    except Exception as exc:
        print(f"V3 feature refresh failed: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
