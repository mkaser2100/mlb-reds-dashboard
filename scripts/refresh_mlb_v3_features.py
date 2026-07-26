#!/usr/bin/env python3
"""Refresh MLB V3 enhancement features and verify completion after RPC timeouts."""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import date, datetime
from typing import Any
from zoneinfo import ZoneInfo

import requests

EASTERN = ZoneInfo("America/New_York")

# PostgREST/Cloudflare may return a 504 while PostgreSQL continues the function.
# The RPC is therefore submitted once. Ambiguous server/network failures are
# resolved by polling the refresh audit table instead of resubmitting the work.
REFRESH_REQUEST_TIMEOUT_SECONDS = 620
STATUS_REQUEST_TIMEOUT_SECONDS = 30
POLL_INTERVAL_SECONDS = 15
POLL_TIMEOUT_SECONDS = 15 * 60

EXPECTED_FAMILIES = (
    "contact_quality",
    "arsenal",
    "matchup_contact_arsenal",
)


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


def build_headers(service_role_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {service_role_key}",
        "apikey": service_role_key,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def fetch_refresh_runs(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    game_date: date,
) -> list[dict[str, Any]]:
    endpoint = f"{supabase_url}/rest/v1/mlb_ml_feature_refresh_runs"
    params = {
        "select": (
            "refresh_run_id,feature_family,as_of_date,status,source_rows,"
            "output_rows,coverage_pct,started_at,completed_at,error_message,details"
        ),
        "as_of_date": f"eq.{game_date.isoformat()}",
        "feature_family": f"in.({','.join(EXPECTED_FAMILIES)})",
        "order": "refresh_run_id.desc",
        "limit": "50",
    }

    response = session.get(
        endpoint,
        headers=headers,
        params=params,
        timeout=STATUS_REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    payload = response.json()

    if not isinstance(payload, list):
        raise RuntimeError(
            "Unexpected refresh-run status response; expected a JSON array."
        )

    return payload


def baseline_refresh_run_id(rows: list[dict[str, Any]]) -> int:
    ids = [
        int(row["refresh_run_id"])
        for row in rows
        if row.get("refresh_run_id") is not None
    ]
    return max(ids, default=0)


def latest_new_runs_by_family(
    rows: list[dict[str, Any]],
    baseline_run_id: int,
) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}

    for row in rows:
        family = str(row.get("feature_family") or "")
        run_id = int(row.get("refresh_run_id") or 0)

        if family not in EXPECTED_FAMILIES or run_id <= baseline_run_id:
            continue

        if family not in latest:
            latest[family] = row

    return latest


def summarize_runs(runs: dict[str, dict[str, Any]]) -> dict[str, Any]:
    return {
        family: {
            "refresh_run_id": row.get("refresh_run_id"),
            "status": row.get("status"),
            "source_rows": row.get("source_rows"),
            "output_rows": row.get("output_rows"),
            "coverage_pct": row.get("coverage_pct"),
            "started_at": row.get("started_at"),
            "completed_at": row.get("completed_at"),
            "error_message": row.get("error_message"),
            "details": row.get("details"),
        }
        for family, row in runs.items()
    }


def poll_for_completion(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    game_date: date,
    baseline_run_id: int,
    *,
    timeout_seconds: int = POLL_TIMEOUT_SECONDS,
    interval_seconds: int = POLL_INTERVAL_SECONDS,
) -> dict[str, dict[str, Any]]:
    deadline = time.monotonic() + timeout_seconds
    last_summary: dict[str, Any] = {}
    transient_status_errors = 0

    print(
        "The RPC response was inconclusive. Polling "
        "mlb_ml_feature_refresh_runs for committed completion records..."
    )
    print(
        f"Required families: {', '.join(EXPECTED_FAMILIES)}; "
        f"baseline refresh_run_id={baseline_run_id}"
    )

    while time.monotonic() < deadline:
        try:
            rows = fetch_refresh_runs(
                session,
                supabase_url,
                headers,
                game_date,
            )
            runs = latest_new_runs_by_family(rows, baseline_run_id)
            last_summary = summarize_runs(runs)
            transient_status_errors = 0
        except (requests.RequestException, ValueError, RuntimeError) as exc:
            transient_status_errors += 1
            print(
                "Status poll failed "
                f"({transient_status_errors} consecutive failure(s)): {exc}",
                file=sys.stderr,
            )
            time.sleep(interval_seconds)
            continue

        failed = {
            family: row
            for family, row in runs.items()
            if str(row.get("status") or "").lower() == "failed"
        }
        if failed:
            raise RuntimeError(
                "V3 enhancement refresh reported a database failure: "
                + json.dumps(summarize_runs(failed), default=str)
            )

        complete = {
            family
            for family, row in runs.items()
            if str(row.get("status") or "").lower() == "complete"
        }

        missing = [family for family in EXPECTED_FAMILIES if family not in runs]
        incomplete = [
            family
            for family, row in runs.items()
            if str(row.get("status") or "").lower() != "complete"
        ]

        print(
            "Refresh status: "
            f"complete={sorted(complete)}, "
            f"missing={missing}, "
            f"incomplete={incomplete}"
        )

        if complete == set(EXPECTED_FAMILIES):
            return runs

        time.sleep(interval_seconds)

    raise TimeoutError(
        f"Timed out after {timeout_seconds}s waiting for the V3 feature refresh "
        f"for {game_date.isoformat()} to commit. Last observed status: "
        f"{json.dumps(last_summary, default=str)}"
    )


def submit_refresh_once(
    session: requests.Session,
    endpoint: str,
    headers: dict[str, str],
    game_date: date,
) -> requests.Response:
    return session.post(
        endpoint,
        headers={**headers, "Prefer": "return=representation"},
        json={"p_game_date": game_date.isoformat()},
        timeout=REFRESH_REQUEST_TIMEOUT_SECONDS,
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
    headers = build_headers(service_role_key)
    session = requests.Session()

    try:
        baseline_rows = fetch_refresh_runs(
            session,
            supabase_url,
            headers,
            args.game_date,
        )
        baseline_run_id = baseline_refresh_run_id(baseline_rows)
        print(
            f"Submitting one V3 feature refresh for {args.game_date.isoformat()}. "
            f"Baseline refresh_run_id={baseline_run_id}."
        )

        response: requests.Response | None = None
        ambiguous_error: Exception | None = None

        try:
            response = submit_refresh_once(
                session,
                endpoint,
                headers,
                args.game_date,
            )
        except requests.RequestException as exc:
            # A client timeout or connection termination does not prove that
            # PostgreSQL stopped. Do not submit the RPC again.
            ambiguous_error = exc
            print(
                "Refresh RPC ended with an ambiguous network error; "
                "the database may still be running it. "
                f"Error: {exc}",
                file=sys.stderr,
            )
        else:
            if response.ok:
                try:
                    payload: Any = response.json()
                except ValueError:
                    payload = response.text

                print(
                    json.dumps(
                        {
                            "status": "complete",
                            "completion_source": "rpc_response",
                            "game_date": args.game_date.isoformat(),
                            "result": payload,
                        },
                        default=str,
                        indent=2,
                    )
                )
                return 0

            if 400 <= response.status_code < 500 and response.status_code != 429:
                raise RuntimeError(
                    "Feature refresh was rejected and was not submitted again "
                    f"({response.status_code}): {response.text}"
                )

            ambiguous_error = RuntimeError(
                f"RPC returned HTTP {response.status_code}: {response.text}"
            )
            print(
                "Refresh RPC returned a server/gateway response that does not "
                "prove database failure. The RPC will not be retried. "
                f"Response: {ambiguous_error}",
                file=sys.stderr,
            )

        completed_runs = poll_for_completion(
            session,
            supabase_url,
            headers,
            args.game_date,
            baseline_run_id,
        )

        print(
            json.dumps(
                {
                    "status": "complete",
                    "completion_source": "refresh_run_poll",
                    "game_date": args.game_date.isoformat(),
                    "rpc_error": str(ambiguous_error) if ambiguous_error else None,
                    "refresh_runs": summarize_runs(completed_runs),
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
