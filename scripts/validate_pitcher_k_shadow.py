#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Mapping, Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
RETRYABLE_HTTP_CODES = {408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524}


class HealthError(RuntimeError):
    pass


def log(msg: str) -> None:
    print(msg, flush=True)


def api_request(method: str, path: str, *, body: Any = None,
                headers: Optional[Mapping[str, str]] = None,
                timeout: int = 120, max_attempts: int = 6) -> Any:
    req_headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)
    data = None if body is None else json.dumps(body, separators=(",", ":"), default=str).encode("utf-8")
    last_error: Optional[BaseException] = None
    for attempt in range(1, max_attempts + 1):
        req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=req_headers, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                return None if not raw else json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            last_error = exc
            if exc.code not in RETRYABLE_HTTP_CODES or attempt >= max_attempts:
                raise HealthError(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            time.sleep(wait)
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt >= max_attempts:
                raise HealthError(f"{method} {path} failed after retries: {exc}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            time.sleep(wait)
    raise HealthError(f"{method} {path} failed: {last_error}")


def rest_get(resource: str, params: Mapping[str, str]) -> List[Dict[str, Any]]:
    q = urllib.parse.urlencode(params, safe="(),.*")
    result = api_request("GET", f"/rest/v1/{resource}?{q}")
    if not isinstance(result, list):
        raise HealthError(f"Expected list from {resource}")
    return result


def rest_upsert(resource: str, row: Mapping[str, Any], on_conflict: str) -> None:
    q = urllib.parse.urlencode({"on_conflict": on_conflict}, safe=",")
    api_request(
        "POST", f"/rest/v1/{resource}?{q}", body=[row],
        headers={"Prefer": "resolution=merge-duplicates,return=minimal"}
    )


def ny_today() -> str:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def run(args: argparse.Namespace) -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HealthError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")

    game_date = args.date or ny_today()

    features = rest_get(
        "mlb_ml_pitcher_k_features_daily",
        {
            "select": "game_pk,pitcher_id",
            "game_date": f"eq.{game_date}",
        },
    )
    predictions = rest_get(
        "mlb_ml_pitcher_k_predictions",
        {
            "select": "game_pk,pitcher_id,quality_status,scored_after_start,prediction_mode,model_run_id,model_version",
            "game_date": f"eq.{game_date}",
            "order": "model_run_id.desc",
        },
    )

    feature_keys = {(r.get("game_pk"), r.get("pitcher_id")) for r in features}
    if not feature_keys:
        status = "failed"
        detail = {"reason": "no_feature_rows"}
        latest_predictions = []
    else:
        # Use only the latest model run for health accounting.
        model_ids = [int(r["model_run_id"]) for r in predictions if r.get("model_run_id") is not None]
        latest_model_id = max(model_ids) if model_ids else None
        latest_predictions = [r for r in predictions if latest_model_id is not None and int(r["model_run_id"]) == latest_model_id]
        pred_keys = {(r.get("game_pk"), r.get("pitcher_id")) for r in latest_predictions}
        missing = sorted(feature_keys - pred_keys)
        extra = sorted(pred_keys - feature_keys)
        coverage = (100.0 * len(pred_keys & feature_keys) / len(feature_keys)) if feature_keys else 0.0
        after_start = sum(bool(r.get("scored_after_start")) for r in latest_predictions)

        if not latest_predictions:
            status = "failed"
        elif after_start > 0 and not args.allow_after_start:
            status = "failed"
        elif coverage < args.min_coverage_pct:
            status = "failed"
        elif missing or extra:
            status = "warning"
        else:
            status = "healthy"

        detail = {
            "missing_feature_keys": missing[:25],
            "extra_prediction_keys": extra[:25],
            "min_coverage_pct": args.min_coverage_pct,
            "allow_after_start": args.allow_after_start,
        }

    latest_model_id = max([int(r["model_run_id"]) for r in latest_predictions], default=None)
    latest_model_version = next((r.get("model_version") for r in latest_predictions if r.get("model_version")), None)
    prediction_rows = len(latest_predictions)
    ready_rows = sum(r.get("quality_status") == "ready" for r in latest_predictions)
    limited_rows = sum(r.get("quality_status") == "limited" for r in latest_predictions)
    ineligible_rows = sum(r.get("quality_status") == "ineligible" for r in latest_predictions)
    after_start_rows = sum(bool(r.get("scored_after_start")) for r in latest_predictions)
    shadow_rows = sum(r.get("prediction_mode") == "shadow" for r in latest_predictions)
    starter_games = len({r.get("game_pk") for r in features})
    coverage_pct = (100.0 * prediction_rows / len(features)) if features else 0.0
    ready_pct = (100.0 * ready_rows / prediction_rows) if prediction_rows else 0.0

    row = {
        "game_date": game_date,
        "feature_rows": len(features),
        "starter_games": starter_games,
        "prediction_rows": prediction_rows,
        "ready_rows": ready_rows,
        "limited_rows": limited_rows,
        "ineligible_rows": ineligible_rows,
        "after_start_rows": after_start_rows,
        "shadow_rows": shadow_rows,
        "latest_model_run_id": latest_model_id,
        "latest_model_version": latest_model_version,
        "coverage_pct": coverage_pct,
        "ready_pct": ready_pct,
        "pipeline_status": status,
        "status_detail": detail,
        "checked_at": dt.datetime.now(dt.timezone.utc).isoformat(),
    }
    rest_upsert("mlb_ml_pitcher_k_pipeline_status", row, "game_date")

    log(json.dumps(row, indent=2, default=str))
    if status == "failed":
        raise HealthError(f"Pitcher K shadow pipeline failed health check for {game_date}")
    if status == "warning" and args.fail_on_warning:
        raise HealthError(f"Pitcher K shadow pipeline warning for {game_date}")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Validate daily pitcher-K shadow scoring coverage")
    p.add_argument("--date", default="")
    p.add_argument("--min-coverage-pct", type=float, default=95.0)
    p.add_argument("--allow-after-start", action="store_true")
    p.add_argument("--fail-on-warning", action="store_true")
    return p.parse_args()


def main() -> int:
    try:
        run(parse_args())
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
