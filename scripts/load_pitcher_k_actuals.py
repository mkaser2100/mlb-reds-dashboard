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
from typing import Any, Mapping, Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
RETRYABLE = {408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524}


class ActualsError(RuntimeError):
    pass


def request(method: str, path: str, *, body: Any = None,
            headers: Optional[Mapping[str, str]] = None,
            attempts: int = 6, timeout: int = 120) -> Any:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ActualsError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    h = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if headers:
        h.update(headers)
    data = None if body is None else json.dumps(body, separators=(",", ":"), default=str).encode()
    last = None
    for i in range(attempts):
        req = urllib.request.Request(f"{SUPABASE_URL}{path}", data=data, headers=h, method=method)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                raw = resp.read()
                return None if not raw else json.loads(raw.decode())
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            last = exc
            if exc.code not in RETRYABLE or i == attempts - 1:
                raise ActualsError(f"{method} {path}: HTTP {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            last = exc
            if i == attempts - 1:
                raise ActualsError(f"{method} {path}: {exc}") from exc
        time.sleep(min(20, 2 ** i + random.random()))
    raise ActualsError(str(last))


def yesterday_et() -> str:
    from zoneinfo import ZoneInfo
    return (dt.datetime.now(ZoneInfo("America/New_York")).date() - dt.timedelta(days=1)).isoformat()


def main() -> int:
    p = argparse.ArgumentParser(description="Load pitcher-K actuals and validate coverage")
    p.add_argument("--date", default="")
    p.add_argument("--min-coverage-pct", type=float, default=90.0)
    args = p.parse_args()
    target = args.date or yesterday_et()

    try:
        result = request(
            "POST",
            "/rest/v1/rpc/load_mlb_pitcher_k_actuals",
            body={"p_game_date": target},
        ) or []
        row = result[0] if isinstance(result, list) and result else {}
        print(json.dumps(row, indent=2, default=str))

        prediction_rows = int(row.get("prediction_rows") or 0)
        actual_loaded_rows = int(row.get("actual_loaded_rows") or 0)
        coverage = float(row.get("coverage_pct") or 0)
        status = str(row.get("load_status") or "unknown")

        if prediction_rows == 0:
            print(f"No pitcher-K predictions found for {target}; nothing to evaluate.")
            return 0

        if actual_loaded_rows == 0:
            raise ActualsError(
                f"Pitcher-K actuals are unavailable for {target}. "
                "Run/verify MLB pitcher game-log ingestion first."
            )

        if coverage < args.min_coverage_pct:
            raise ActualsError(
                f"Pitcher-K actuals coverage {coverage:.1f}% is below "
                f"required {args.min_coverage_pct:.1f}% for {target}."
            )

        print(f"Pitcher-K actuals load passed: {actual_loaded_rows}/{prediction_rows} "
              f"({coverage:.1f}%), status={status}.")
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
