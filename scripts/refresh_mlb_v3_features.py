#!/usr/bin/env python3
"""Refresh MLB V3 enhancement features with prerequisite recovery and lock-timeout handling."""
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

REFRESH_REQUEST_TIMEOUT_SECONDS = 620
STATUS_REQUEST_TIMEOUT_SECONDS = 30
POLL_INTERVAL_SECONDS = 15
POLL_TIMEOUT_SECONDS = 15 * 60
LOCK_RETRY_DELAY_SECONDS = 60
MAX_LOCK_TIMEOUT_RETRIES = 1

V2_PREREQ_ATTEMPTS = 3
V2_PREREQ_RETRY_DELAY_SECONDS = 60

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


def rpc_post(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    rpc_name: str,
    payload: dict[str, Any],
    *,
    timeout: int = STATUS_REQUEST_TIMEOUT_SECONDS,
) -> Any:
    response = session.post(
        f"{supabase_url}/rest/v1/rpc/{rpc_name}",
        headers={**headers, "Prefer": "return=representation"},
        json=payload,
        timeout=timeout,
    )
    response.raise_for_status()
    if not response.text:
        return None
    try:
        return response.json()
    except ValueError:
        return response.text


def normalize_rpc_object(payload: Any) -> dict[str, Any]:
    if isinstance(payload, list):
        payload = payload[0] if payload else {}
    return payload if isinstance(payload, dict) else {}


def get_pipeline_status(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    game_date: date,
) -> dict[str, Any]:
    payload = rpc_post(
        session,
        supabase_url,
        headers,
        "get_mlb_daily_prediction_pipeline_status",
        {"p_game_date": game_date.isoformat()},
    )
    return normalize_rpc_object(payload)


def ensure_v2_feature_source(
    session: requests.Session,
    supabase_url: str,
    headers: dict[str, str],
    game_date: date,
) -> dict[str, Any]:
    """Guarantee the V2 snapshot / wide V3 source exists before feature success."""
    status = get_pipeline_status(session, supabase_url, headers, game_date)
    print("V3 prerequisite pipeline status:")
    print(json.dumps(status, default=str))

    eligible_games = int(status.get("eligible_game_count") or 0)
    if eligible_games <= 0:
        print(
            f"No prediction-eligible games for {game_date.isoformat()}; "
            "no V2 prerequisite snapshot is required."
        )
        return status

    feature_rows = int(status.get("feature_row_count") or 0)
    v2_rows = int(status.get("v2_prediction_row_count") or 0)
    today_eastern = datetime.now(EASTERN).date()

    if game_date < today_eastern and v2_rows > 0:
        print(
            "Historical V2 prerequisite already ready: "
            f"game_date={game_date.isoformat()}, "
            f"v2_prediction_rows={v2_rows}, "
            f"feature_rows={feature_rows}. "
            "Proceeding to V3 enhancement refresh without attempting "
            "the today-only V2 snapshot RPC."
        )
        return status

    if feature_rows > 0 and v2_rows > 0:
        print(
            f"V2 prerequisite already ready: feature_rows={feature_rows}, "
            f"v2_prediction_rows={v2_rows}."
        )
        return status

    print(
        "V2 prerequisite is missing. The feature-refresh workflow will "
        "self-heal by creating today's V2 snapshot before continuing."
    )

    last_payload: dict[str, Any] = {}
    for attempt in range(1, V2_PREREQ_ATTEMPTS + 1):
        snapshot_payload = rpc_post(
            session,
            supabase_url,
            headers,
            "snapshot_mlb_hit_board_predictions_v2_status",
            {"p_target_date": game_date.isoformat()},
            timeout=120,
        )
        last_payload = normalize_rpc_object(snapshot_payload)

        print(f"V2 prerequisite snapshot attempt {attempt}/{V2_PREREQ_ATTEMPTS}:")
        print(json.dumps(last_payload, default=str))

        status = get_pipeline_status(session, supabase_url, headers, game_date)
        feature_rows = int(status.get("feature_row_count") or 0)
        v2_rows = int(status.get("v2_prediction_row_count") or 0)

        if feature_rows > 0 and v2_rows > 0:
            print(
                "V2 prerequisite recovery complete: "
                f"feature_rows={feature_rows}, v2_prediction_rows={v2_rows}."
            )
            return status

        if attempt < V2_PREREQ_ATTEMPTS:
            print(
                f"V2 feature source is still unavailable. Waiting "
                f"{V2_PREREQ_RETRY_DELAY_SECONDS}s before retrying..."
            )
            time.sleep(V2_PREREQ_RETRY_DELAY_SECONDS)

    raise RuntimeError(
        "V3 prerequisite recovery failed. Eligible games exist, but today's "
        "V2 snapshot / wide feature source is still missing after "
        f"{V2_PREREQ_ATTEMPTS} attempts. "
        f"Last snapshot response: {json.dumps(last_payload, default=str)}; "
        f"latest pipeline status: {json.dumps(status, default=str)}"
    )


def fetch_refresh_runs(session, supabase_url, headers, game_date):
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
        raise RuntimeError("Unexpected refresh-run status response; expected a JSON array.")
    return payload


def baseline_refresh_run_id(rows):
    ids = [int(row["refresh_run_id"]) for row in rows if row.get("refresh_run_id") is not None]
    return max(ids, default=0)


def latest_runs_by_family(rows, *, newer_than_run_id=None):
    latest = {}
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


def summarize_runs(runs):
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


def all_expected_families_complete(rows):
    latest = latest_runs_by_family(rows)
    complete = {
        family
        for family, row in latest.items()
        if str(row.get("status") or "").lower() == "complete"
    }
    return complete == set(EXPECTED_FAMILIES), latest


def is_lock_timeout_response(response):
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
    session,
    supabase_url,
    headers,
    game_date,
    baseline_run_id,
    *,
    timeout_seconds=POLL_TIMEOUT_SECONDS,
    interval_seconds=POLL_INTERVAL_SECONDS,
):
    deadline = time.monotonic() + timeout_seconds
    last_summary = {}

    while time.monotonic() < deadline:
        rows = fetch_refresh_runs(session, supabase_url, headers, game_date)
        runs = latest_runs_by_family(rows, newer_than_run_id=baseline_run_id)
        last_summary = summarize_runs(runs)

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
        if complete == set(EXPECTED_FAMILIES):
            return runs

        time.sleep(interval_seconds)

    raise TimeoutError(
        f"Timed out after {timeout_seconds}s waiting for the V3 feature refresh "
        f"for {game_date.isoformat()} to commit. Last observed status: "
        f"{json.dumps(last_summary, default=str)}"
    )


def submit_refresh_once(session, endpoint, headers, game_date):
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
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 1

    endpoint = f"{supabase_url}/rest/v1/rpc/refresh_mlb_v3_enhancement_features"
    headers = build_headers(service_role_key)
    session = requests.Session()

    try:
        ensure_v2_feature_source(
            session,
            supabase_url,
            headers,
            args.game_date,
        )

        baseline_rows = fetch_refresh_runs(
            session,
            supabase_url,
            headers,
            args.game_date,
        )

        pipeline_status = get_pipeline_status(
            session,
            supabase_url,
            headers,
            args.game_date,
        )
        feature_rows = int(pipeline_status.get("feature_row_count") or 0)
        v2_rows = int(pipeline_status.get("v2_prediction_row_count") or 0)

        already_complete, existing_runs = all_expected_families_complete(
            baseline_rows
        )

        if already_complete and feature_rows > 0 and v2_rows > 0:
            print(
                json.dumps(
                    {
                        "status": "complete",
                        "completion_source": "preexisting_refresh_runs",
                        "game_date": args.game_date.isoformat(),
                        "feature_rows": feature_rows,
                        "v2_prediction_rows": v2_rows,
                        "message": (
                            "The V2 prerequisite, wide V3 feature source, and "
                            "all required enhancement families are complete; "
                            "no enhancement refresh RPC was submitted."
                        ),
                        "refresh_runs": summarize_runs(existing_runs),
                    },
                    default=str,
                    indent=2,
                )
            )
            return 0

        if already_complete and feature_rows <= 0:
            print(
                "Enhancement-family history is marked complete, but the wide "
                "V3 feature source is empty. Forcing a new refresh RPC for "
                f"{args.game_date.isoformat()}."
            )

        baseline_run_id = baseline_refresh_run_id(baseline_rows)
        print(
            f"Submitting V3 feature refresh for {args.game_date.isoformat()}. "
            f"Baseline refresh_run_id={baseline_run_id}."
        )

        ambiguous_error = None

        for attempt in range(MAX_LOCK_TIMEOUT_RETRIES + 1):
            try:
                response = submit_refresh_once(
                    session,
                    endpoint,
                    headers,
                    args.game_date,
                )
            except requests.RequestException as exc:
                ambiguous_error = exc
                print(
                    "Refresh RPC ended with an ambiguous network error; "
                    f"the database may still be running it. Error: {exc}",
                    file=sys.stderr,
                )
                break

            if response.ok:
                try:
                    payload = response.json()
                except ValueError:
                    payload = response.text

                post_status = get_pipeline_status(
                    session,
                    supabase_url,
                    headers,
                    args.game_date,
                )
                post_feature_rows = int(post_status.get("feature_row_count") or 0)

                if (
                    int(post_status.get("eligible_game_count") or 0) > 0
                    and post_feature_rows <= 0
                ):
                    raise RuntimeError(
                        "V3 enhancement refresh returned success, but the wide "
                        f"feature source is still empty for {args.game_date.isoformat()}. "
                        f"Pipeline status: {json.dumps(post_status, default=str)}"
                    )

                print(
                    json.dumps(
                        {
                            "status": "complete",
                            "completion_source": "refresh_rpc",
                            "game_date": args.game_date.isoformat(),
                            "response": payload,
                            "pipeline_status": post_status,
                        },
                        default=str,
                        indent=2,
                    )
                )
                return 0

            if is_lock_timeout_response(response):
                if attempt < MAX_LOCK_TIMEOUT_RETRIES:
                    print(
                        "V3 feature refresh hit PostgreSQL lock timeout. "
                        f"Waiting {LOCK_RETRY_DELAY_SECONDS}s before retrying once...",
                        file=sys.stderr,
                    )
                    time.sleep(LOCK_RETRY_DELAY_SECONDS)
                    continue
                response.raise_for_status()

            if response.status_code >= 500:
                ambiguous_error = requests.HTTPError(
                    f"HTTP {response.status_code}: {response.text[:1000]}"
                )
                break

            response.raise_for_status()

        if ambiguous_error is not None:
            runs = poll_for_completion(
                session,
                supabase_url,
                headers,
                args.game_date,
                baseline_run_id,
            )
            post_status = get_pipeline_status(
                session,
                supabase_url,
                headers,
                args.game_date,
            )

            if (
                int(post_status.get("eligible_game_count") or 0) > 0
                and int(post_status.get("feature_row_count") or 0) <= 0
            ):
                raise RuntimeError(
                    "Refresh families completed after an ambiguous response, "
                    "but the wide V3 feature source is still empty. "
                    f"Pipeline status: {json.dumps(post_status, default=str)}"
                )

            print(
                json.dumps(
                    {
                        "status": "complete",
                        "completion_source": "post_error_poll",
                        "game_date": args.game_date.isoformat(),
                        "ambiguous_error": str(ambiguous_error),
                        "refresh_runs": summarize_runs(runs),
                        "pipeline_status": post_status,
                    },
                    default=str,
                    indent=2,
                )
            )
            return 0

        raise RuntimeError(
            "V3 feature refresh ended without a successful response or an "
            "ambiguous error to reconcile."
        )

    except Exception as exc:
        print(f"V3 feature refresh failed: {exc}", file=sys.stderr)
        return 1
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
