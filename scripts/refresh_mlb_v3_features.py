#!/usr/bin/env python3
"""Refresh MLB V3 enhancement features with idempotency and lock-timeout recovery."""
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

# A 504/client timeout can be ambiguous: PostgreSQL may still be working.
# A PostgreSQL 55P03 lock timeout is different: that attempt failed and may
# safely be retried after checking whether another worker completed the refresh.
REFRESH_REQUEST_TIMEOUT_SECONDS = 620
STATUS_REQUEST_TIMEOUT_SECONDS = 30
POLL_INTERVAL_SECONDS = 15
POLL_TIMEOUT_SECONDS = 15 * 60
LOCK_RETRY_DELAY_SECONDS = 60
MAX_LOCK_TIMEOUT_RETRIES = 1

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


def latest_runs_by_family(
    rows: list[dict[str, Any]],
    *,
    newer_than_run_id: int | None = None,
) -> dict[str, dict[str, Any]]:
    latest: dict[str, dict[str, Any]] = {}

    for row in rows:
        family = str(row.get("feature_family") or "")
        run_id = int(row.get("refresh_run_id") or 0)

        if family not in EXPECTED_FAMILIES:
            continue
        if newer_than_run_id is not None and run_id <= newer_than_run_id:
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


def all_expected_families_complete(
    rows: list[dict[str, Any]],
) -> tuple[bool, dict[str, dict[str, Any]]]:
    latest = latest_runs_by_family(rows)
    complete = {
        family
        for family, row in latest.items()
        if str(row.get("status") or "").lower() == "complete"
    }
    return complete == set(EXPECTED_FAMILIES), latest


def refresh_already_complete(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    game_date: date,
) -> tuple[bool, dict[str, dict[str, Any]]]:
    rows = fetch_refresh_runs(session, supabase_url, headers, game_date)
    return all_expected_families_complete(rows)


def is_lock_timeout_response(response: requests.Response) -> bool:
    text = response.text.lower()
    return (
        response.status_code >= 500
        and (
            '"code":"55p03"' in text
            or '"code": "55p03"' in text
            or "55p03" in text
            or "lock timeout" in text
        )
    )


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
        "The RPC response was ambiguous. Polling "
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
            runs = latest_runs_by_family(rows, newer_than_run_id=baseline_run_id)
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

        already_complete, existing_runs = all_expected_families_complete(
            baseline_rows
        )
        if already_complete:
            print(
                json.dumps(
                    {
                        "status": "complete",
                        "completion_source": "preexisting_refresh_runs",
                        "game_date": args.game_date.isoformat(),
                        "message": (
                            "All required V3 feature families are already complete; "
                            "no refresh RPC was submitted."
                        ),
                        "refresh_runs": summarize_runs(existing_runs),
                    },
                    default=str,
                    indent=2,
                )
            )
            return 0

        baseline_run_id = baseline_refresh_run_id(baseline_rows)
        print(
            f"Submitting V3 feature refresh for {args.game_date.isoformat()}. "
            f"Baseline refresh_run_id={baseline_run_id}."
        )

        ambiguous_error: Exception | None = None

        for attempt in range(MAX_LOCK_TIMEOUT_RETRIES + 1):
            response: requests.Response | None = None

            try:
                response = submit_refresh_once(
                    session,
                    endpoint,
                    headers,
                    args.game_date,
                )
            except requests.RequestException as exc:
                # Client/network timeouts are ambiguous: the DB may still be running.
                ambiguous_error = exc
                print(
                    "Refresh RPC ended with an ambiguous network error; "
                    "the database may still be running it. "
                    f"Error: {exc}",
                    file=sys.stderr,
                )
                break

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
                            "attempt": attempt + 1,
                            "result": payload,
                        },
                        default=str,
                        indent=2,
                    )
                )
                return 0

            if is_lock_timeout_response(response):
                print(
                    "Refresh RPC hit PostgreSQL lock timeout (55P03). "
                    "This attempt failed; it is safe to re-check and retry.",
                    file=sys.stderr,
                )

                if attempt >= MAX_LOCK_TIMEOUT_RETRIES:
                    raise RuntimeError(
                        "V3 feature refresh hit PostgreSQL lock timeout (55P03) "
                        "again after one retry. Another process is still contending "
                        "for the feature refresh lock."
                    )

                print(
                    f"Waiting {LOCK_RETRY_DELAY_SECONDS}s before checking whether "
                    "another worker completed the refresh..."
                )
                time.sleep(LOCK_RETRY_DELAY_SECONDS)

                complete, completed_runs = refresh_already_complete(
                    session,
                    supabase_url,
                    headers,
                    args.game_date,
                )
                if complete:
                    print(
                        json.dumps(
                            {
                                "status": "complete",
                                "completion_source": "other_worker_after_lock_timeout",
                                "game_date": args.game_date.isoformat(),
                                "refresh_runs": summarize_runs(completed_runs),
                            },
                            default=str,
                            indent=2,
                        )
                    )
                    return 0

                print("No complete refresh found. Retrying the RPC once.")
                continue

            if 400 <= response.status_code < 500 and response.status_code != 429:
                raise RuntimeError(
                    "Feature refresh was rejected and was not submitted again "
                    f"({response.status_code}): {response.text}"
                )

            # 5xx/429 responses can be ambiguous; do not blindly resubmit.
            ambiguous_error = RuntimeError(
                f"RPC returned HTTP {response.status_code}: {response.text}"
            )
            print(
                "Refresh RPC returned an ambiguous server/gateway response. "
                "The RPC will not be retried; polling committed refresh records. "
                f"Response: {ambiguous_error}",
                file=sys.stderr,
            )
            break

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
