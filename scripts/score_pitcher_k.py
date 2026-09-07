#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import random
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Mapping, Optional, Sequence

import numpy as np
from scipy.stats import nbinom, poisson

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
TARGET = "pitcher_strikeouts"
MAX_BUCKET = 12
LINES = (3.5, 4.5, 5.5, 6.5, 7.5, 8.5)
BATCH_SIZE = 75
RETRYABLE_HTTP_CODES = {408, 425, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524}


class ScoreError(RuntimeError):
    pass


def log(msg: str) -> None:
    print(msg, flush=True)


def require_env() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ScoreError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")


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
                raise ScoreError(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            log(f"WARNING: transient Supabase HTTP {exc.code}; retrying in {wait:.1f}s")
            time.sleep(wait)
        except urllib.error.URLError as exc:
            last_error = exc
            if attempt >= max_attempts:
                raise ScoreError(f"{method} {path} failed after retries: {exc}") from exc
            wait = min(20.0, 2.0 ** (attempt - 1) + random.uniform(0, 0.75))
            log(f"WARNING: transient network error; retrying in {wait:.1f}s")
            time.sleep(wait)
    raise ScoreError(f"{method} {path} failed: {last_error}")


def rest_get(resource: str, params: Mapping[str, str]) -> List[Dict[str, Any]]:
    q = urllib.parse.urlencode(params, safe="(),.*")
    result = api_request("GET", f"/rest/v1/{resource}?{q}")
    if not isinstance(result, list):
        raise ScoreError(f"Expected list from {resource}")
    return result


def rest_upsert(resource: str, rows: Sequence[Mapping[str, Any]], on_conflict: str) -> None:
    for i in range(0, len(rows), BATCH_SIZE):
        batch = list(rows[i:i+BATCH_SIZE])
        q = urllib.parse.urlencode({"on_conflict": on_conflict}, safe=",")
        api_request(
            "POST", f"/rest/v1/{resource}?{q}", body=batch,
            headers={"Prefer": "resolution=merge-duplicates,return=minimal"}
        )


def ny_today() -> str:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def parse_ts(value: Any) -> Optional[dt.datetime]:
    if not value:
        return None
    s = str(value)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        x = dt.datetime.fromisoformat(s)
    except ValueError:
        return None
    if x.tzinfo is None:
        x = x.replace(tzinfo=dt.timezone.utc)
    return x.astimezone(dt.timezone.utc)


def as_float(v: Any) -> Optional[float]:
    if v is None:
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def load_model() -> Dict[str, Any]:
    runs = rest_get(
        "mlb_ml_model_runs",
        {
            "select": "model_run_id,model_name,model_version,status,trained_at",
            "target_name": f"eq.{TARGET}",
            "status": "in.(champion,candidate)",
            "order": "trained_at.desc,model_run_id.desc",
            "limit": "50",
        },
    )
    if not runs:
        raise ScoreError("No pitcher-strikeout candidate/champion model registered")
    champions = [r for r in runs if r.get("status") == "champion"]
    run = champions[0] if champions else runs[0]

    artifacts = rest_get(
        "mlb_ml_pitcher_k_model_artifacts",
        {
            "select": "*",
            "model_run_id": f"eq.{run['model_run_id']}",
            "limit": "1",
        },
    )
    if not artifacts:
        raise ScoreError(f"Artifact missing for model_run_id={run['model_run_id']}")
    return {"run": run, "artifact": artifacts[0]}


def feature_columns(artifact: Mapping[str, Any]) -> List[str]:
    raw = list(artifact["raw_features"])
    synthetic = {"missing_arsenal_30d", "missing_lineup_k_30d", "missing_matchup"}
    metadata = [
        "game_date", "game_pk", "pitcher_id", "pitcher_name", "team_id",
        "opponent_team_id", "opponent_team_name", "home_away", "pitcher_throws",
        "game_time_utc", "lineup_source", "lineup_confirmed", "lineup_batter_count",
        "feature_version", "point_in_time_safe", "prior_starts_season",
        "arsenal_whiff_rate_30d", "lineup_k_rate_30d",
        "lineup_avg_arsenal_batter_whiff", "lineup_avg_arsenal_pitcher_whiff",
    ]
    return list(dict.fromkeys(metadata + [x for x in raw if x not in synthetic]))


def fetch_rows(game_date: str, artifact: Mapping[str, Any]) -> List[Dict[str, Any]]:
    rows = rest_get(
        "mlb_ml_pitcher_k_features_daily",
        {
            "select": ",".join(feature_columns(artifact)),
            "game_date": f"eq.{game_date}",
            "order": "game_pk.asc,pitcher_id.asc",
        },
    )
    if not rows:
        raise ScoreError(f"No pitcher-K feature rows found for {game_date}")
    seen = set()
    for row in rows:
        key = (row.get("game_pk"), row.get("pitcher_id"))
        if key in seen:
            raise ScoreError(f"Duplicate pitcher-game feature row: {key}")
        seen.add(key)
        row["missing_arsenal_30d"] = row.get("arsenal_whiff_rate_30d") is None
        row["missing_lineup_k_30d"] = row.get("lineup_k_rate_30d") is None
        row["missing_matchup"] = (
            row.get("lineup_avg_arsenal_batter_whiff") is None
            or row.get("lineup_avg_arsenal_pitcher_whiff") is None
        )
    return rows


def transform(row: Mapping[str, Any], preprocessing: Mapping[str, Any]) -> np.ndarray:
    out: List[float] = []
    for f in preprocessing["numeric_feature_order"]:
        spec = preprocessing["numeric"][f]
        v = as_float(row.get(f))
        if v is None:
            v = float(spec["median"])
        out.append((v - float(spec["mean"])) / (float(spec["scale"]) or 1.0))

    for f in preprocessing["categorical_feature_order"]:
        spec = preprocessing["categorical"][f]
        value = str(row.get(f)) if row.get(f) is not None else str(spec["imputer_value"])
        cats = [str(x) for x in spec["categories"]]
        for cat in cats[1:]:
            out.append(1.0 if value == cat else 0.0)
    return np.asarray(out, dtype=float)


def pmf_nb(mu: float, alpha: float) -> np.ndarray:
    mu = max(float(mu), 0.01)
    alpha = max(float(alpha), 1e-8)
    if alpha < 1e-5:
        probs = np.array([poisson.pmf(k, mu) for k in range(MAX_BUCKET)], dtype=float)
        tail = float(poisson.sf(MAX_BUCKET - 1, mu))
    else:
        size = 1.0 / alpha
        p = size / (size + mu)
        probs = np.array([nbinom.pmf(k, size, p) for k in range(MAX_BUCKET)], dtype=float)
        tail = float(nbinom.sf(MAX_BUCKET - 1, size, p))
    out = np.append(probs, tail)
    out = np.clip(out, 0.0, 1.0)
    return out / out.sum()


def p_over(pmf: np.ndarray, line: float) -> float:
    threshold = int(math.floor(line)) + 1
    if threshold >= MAX_BUCKET:
        return float(pmf[-1]) if threshold == MAX_BUCKET else 0.0
    return float(pmf[threshold:MAX_BUCKET].sum() + pmf[-1])


def quality(row: Mapping[str, Any]) -> tuple[str, List[str]]:
    reasons: List[str] = []
    if not bool(row.get("point_in_time_safe")):
        reasons.append("point_in_time_not_safe")
    if int(row.get("lineup_batter_count") or 0) < 8:
        reasons.append("lineup_under_8")
    if int(row.get("prior_starts_season") or 0) < 1:
        reasons.append("no_prior_start")
    if bool(row.get("missing_arsenal_30d")):
        reasons.append("missing_arsenal_30d")
    if bool(row.get("missing_lineup_k_30d")):
        reasons.append("missing_lineup_k_30d")
    if bool(row.get("missing_matchup")):
        reasons.append("missing_matchup")
    if int(row.get("prior_starts_season") or 0) < 3:
        reasons.append("limited_prior_start_sample")

    hard = {"point_in_time_not_safe", "lineup_under_8", "no_prior_start"}
    if any(r in hard for r in reasons):
        return "ineligible", reasons
    if reasons:
        return "limited", reasons
    return "ready", reasons


def run(args: argparse.Namespace) -> None:
    require_env()
    game_date = args.date or ny_today()
    model = load_model()
    run = model["run"]
    artifact = model["artifact"]
    rows = fetch_rows(game_date, artifact)

    prep = artifact["preprocessing"]
    model_art = artifact["model_artifact"]
    dist = artifact["distribution_artifact"]
    coefs = np.asarray(model_art["coefficients"], dtype=float)
    intercept = float(model_art["intercept"])
    alpha = float(dist["alpha"])
    now = dt.datetime.now(dt.timezone.utc)
    output: List[Dict[str, Any]] = []

    for row in rows:
        x = transform(row, prep)
        if len(x) != len(coefs):
            raise ScoreError(f"Encoded dimension mismatch for pitcher {row.get('pitcher_id')}: {len(x)} vs {len(coefs)}")
        eta = intercept + float(np.dot(x, coefs))
        mu = float(np.clip(math.exp(float(np.clip(eta, -10, 10))), 0.05, 15.0))
        pmf = pmf_nb(mu, alpha)
        if abs(float(pmf.sum()) - 1.0) > 1e-8:
            raise ScoreError("PMF failed sum-to-one validation")
        status, reasons = quality(row)
        game_time = parse_ts(row.get("game_time_utc"))
        after_start = bool(game_time is not None and game_time <= now)
        if after_start and game_date == ny_today() and not args.allow_after_start:
            raise ScoreError(
                f"Refusing to write today's predictions after start time for game {row.get('game_pk')}. "
                "Use --allow-after-start only for Phase 3 recovery/validation."
            )
        if after_start:
            reasons = list(reasons) + ["scored_after_start_recovery"]
            if status == "ready":
                status = "limited"

        probs = {f"{line:.1f}": p_over(pmf, line) for line in LINES}
        output.append({
            "prediction_run_date": game_date,
            "game_date": game_date,
            "game_pk": int(row["game_pk"]),
            "pitcher_id": int(row["pitcher_id"]),
            "pitcher_name": row.get("pitcher_name"),
            "team_id": row.get("team_id"),
            "opponent_team_id": row.get("opponent_team_id"),
            "opponent_team_name": row.get("opponent_team_name"),
            "home_away": row.get("home_away"),
            "game_time_utc": row.get("game_time_utc"),
            "lineup_source": row.get("lineup_source"),
            "lineup_confirmed": row.get("lineup_confirmed"),
            "lineup_batter_count": row.get("lineup_batter_count"),
            "feature_version": row.get("feature_version"),
            "model_run_id": int(run["model_run_id"]),
            "model_version": run["model_version"],
            "predicted_mean_k": mu,
            "distribution_type": "negative_binomial",
            "distribution_params": {"mu": mu, "alpha": alpha},
            "k_pmf": [float(x) for x in pmf],
            "p_over_3_5": probs["3.5"],
            "p_over_4_5": probs["4.5"],
            "p_over_5_5": probs["5.5"],
            "p_over_6_5": probs["6.5"],
            "p_over_7_5": probs["7.5"],
            "p_over_8_5": probs["8.5"],
            "quality_status": status,
            "quality_reasons": reasons,
            "prediction_source": "github_pitcher_k_phase3_scorer",
            "scored_after_start": after_start,
            "prediction_created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        })

    if args.dry_run:
        log(json.dumps({
            "date": game_date,
            "model_run_id": run["model_run_id"],
            "model_version": run["model_version"],
            "rows": len(output),
            "ready": sum(r["quality_status"] == "ready" for r in output),
            "limited": sum(r["quality_status"] == "limited" for r in output),
            "ineligible": sum(r["quality_status"] == "ineligible" for r in output),
            "dry_run": True,
        }, indent=2))
        return

    rest_upsert(
        "mlb_ml_pitcher_k_predictions",
        output,
        "prediction_run_date,game_pk,pitcher_id,model_run_id",
    )
    log(json.dumps({
        "status": "complete",
        "date": game_date,
        "model_run_id": run["model_run_id"],
        "model_version": run["model_version"],
        "rows": len(output),
        "ready": sum(r["quality_status"] == "ready" for r in output),
        "limited": sum(r["quality_status"] == "limited" for r in output),
        "ineligible": sum(r["quality_status"] == "ineligible" for r in output),
        "scored_after_start": sum(bool(r["scored_after_start"]) for r in output),
        "min_mean_k": min(r["predicted_mean_k"] for r in output),
        "max_mean_k": max(r["predicted_mean_k"] for r in output),
    }, indent=2))


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Score pitcher strikeout distributions")
    p.add_argument("--date", default="")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--allow-after-start", action="store_true")
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
