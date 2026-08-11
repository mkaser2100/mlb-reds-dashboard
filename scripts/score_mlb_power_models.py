#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Mapping, Optional, Sequence

TARGETS = ("home_run_1plus", "total_bases_2plus")
EPS = 1e-7
BATCH_SIZE = 400
SOURCE_NAME = "github_power_scorer"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""


class ScoringError(RuntimeError):
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
        raise ScoringError("Missing required environment variable(s): " + ", ".join(missing))


def api_request(method: str, path: str, *, body: Any = None,
                extra_headers: Optional[Mapping[str, str]] = None,
                timeout: int = 60) -> Any:
    url = f"{SUPABASE_URL}{path}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = None if body is None else json.dumps(body, separators=(",", ":")).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            return None if not raw else json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise ScoringError(f"{method} {path} failed: HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ScoringError(f"{method} {path} failed: {exc}") from exc


def rest_get(table_or_view: str, params: Mapping[str, str]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    offset = 0
    query = urllib.parse.urlencode(params, safe="(),.*")
    path = f"/rest/v1/{table_or_view}?{query}"
    while True:
        batch = api_request("GET", path, extra_headers={"Range": f"{offset}-{offset+999}"})
        if not isinstance(batch, list):
            raise ScoringError(f"Expected list from {table_or_view}")
        rows.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    return rows


def rest_upsert(table: str, rows: Sequence[Mapping[str, Any]], on_conflict: str) -> None:
    for start in range(0, len(rows), BATCH_SIZE):
        batch = list(rows[start:start+BATCH_SIZE])
        query = urllib.parse.urlencode({"on_conflict": on_conflict}, safe=",")
        api_request(
            "POST",
            f"/rest/v1/{table}?{query}",
            body=batch,
            extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"},
        )


def rpc(name: str, body: Mapping[str, Any]) -> Any:
    return api_request("POST", f"/rest/v1/rpc/{name}", body=body)


def ny_today() -> str:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def parse_timestamp(value: Optional[str]) -> Optional[dt.datetime]:
    if not value:
        return None
    text = str(value).strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = dt.datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc)


def as_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def sigmoid(z: float) -> float:
    if z > 35:
        return 1.0 - EPS
    if z < -35:
        return EPS
    return 1.0 / (1.0 + math.exp(-z))


def clamp_probability(value: float) -> float:
    return min(1.0 - EPS, max(EPS, value))


def logit(probability: float) -> float:
    p = clamp_probability(probability)
    return math.log(p / (1.0 - p))


def load_registered_model(target: str) -> Dict[str, Any]:
    runs = rest_get(
        "mlb_ml_model_runs",
        {
            "select": "model_run_id,target_name,model_name,model_version,status,trained_at,hyperparameters,artifact_uri",
            "target_name": f"eq.{target}",
            "status": "in.(champion,candidate)",
            "order": "trained_at.desc,model_run_id.desc",
            "limit": "50",
        },
    )
    if not runs:
        raise ScoringError(f"No champion/candidate model registered for {target}")

    champions = [r for r in runs if r.get("status") == "champion"]
    model_run = champions[0] if champions else runs[0]

    hyper = model_run.get("hyperparameters") or {}
    experiment_id = hyper.get("phase2_experiment_id")
    if experiment_id is None:
        uri = str(model_run.get("artifact_uri") or "")
        parts = uri.split("/")
        try:
            experiment_id = int(parts[-3])
        except (ValueError, IndexError):
            raise ScoringError(f"Cannot resolve experiment from artifact_uri: {uri}")

    algorithm = str(model_run.get("model_name") or "")
    artifacts = rest_get(
        "mlb_ml_power_model_artifacts",
        {
            "select": "experiment_id,target_name,algorithm,feature_names,preprocessing,model_artifact,calibration_artifact",
            "experiment_id": f"eq.{experiment_id}",
            "target_name": f"eq.{target}",
            "algorithm": f"eq.{algorithm}",
            "limit": "1",
        },
    )
    if not artifacts:
        raise ScoringError(f"Model artifact not found for {target}")
    artifact = artifacts[0]

    if artifact.get("algorithm") != "logistic_regression":
        raise ScoringError(
            f"Phase 3B currently supports logistic_regression; {target} registered {artifact.get('algorithm')}"
        )

    preprocessing = artifact.get("preprocessing") or {}
    raw_features = preprocessing.get("raw_features") or []
    encoded_names = artifact.get("feature_names") or []
    model_artifact = artifact.get("model_artifact") or {}
    calibration = artifact.get("calibration_artifact") or {}

    if not raw_features:
        raise ScoringError(f"{target} artifact missing raw feature list")
    if model_artifact.get("kind") != "logistic":
        raise ScoringError(f"{target} artifact is not logistic")
    if calibration.get("kind") != "platt":
        raise ScoringError(f"{target} artifact missing Platt calibration")
    if len(model_artifact.get("w") or []) != len(encoded_names):
        raise ScoringError(f"{target} artifact dimension mismatch")

    return {"target": target, "model_run": model_run, "artifact": artifact, "raw_features": list(raw_features)}


def fetch_feature_rows(run_date: str, raw_features: Sequence[str]) -> List[Dict[str, Any]]:
    metadata = [
        "game_date", "game_pk", "player_id", "pitcher_id", "batter_name",
        "team_id", "team_name", "pitcher_name", "batting_order", "feature_version",
    ]
    columns = list(dict.fromkeys(metadata + list(raw_features)))
    rows = rest_get(
        "mlb_ml_batter_power_features_daily",
        {"select": ",".join(columns), "game_date": f"eq.{run_date}", "order": "game_pk.asc,player_id.asc"},
    )
    if not rows:
        raise ScoringError(f"No Phase 1 power feature rows found for {run_date}")

    seen = set()
    for row in rows:
        key = (row.get("game_pk"), row.get("player_id"))
        if key in seen:
            raise ScoringError(f"Duplicate Phase 1 player-game found: {key}")
        seen.add(key)
    return rows


def fetch_game_times(run_date: str) -> Dict[int, Optional[str]]:
    try:
        rows = rest_get(
            "v_mlb_prediction_eligible_games",
            {"select": "game_pk,game_time_utc", "game_date": f"eq.{run_date}"},
        )
    except ScoringError as exc:
        log(f"WARNING: could not load eligible-game times: {exc}")
        return {}
    return {
        int(r["game_pk"]): r.get("game_time_utc")
        for r in rows
        if r.get("game_pk") is not None
    }


def transform_row(row: Mapping[str, Any], preprocessing: Mapping[str, Any]) -> List[float]:
    raw_features = preprocessing.get("raw_features") or []
    categorical = preprocessing.get("categorical") or {}
    numeric = preprocessing.get("numeric") or {}
    encoded: List[float] = []

    for feature in raw_features:
        if feature in categorical:
            value = "UNK" if row.get(feature) is None else str(row.get(feature))
            for category in categorical[feature]:
                encoded.append(1.0 if value == str(category) else 0.0)
        else:
            spec = numeric.get(feature)
            if not spec:
                raise ScoringError(f"Missing preprocessing spec for {feature}")
            value = as_float(row.get(feature))
            if value is None:
                value = float(spec["median"])
            sd = float(spec["sd"]) or 1.0
            encoded.append((value - float(spec["mean"])) / sd)
    return encoded


def score_row(row: Mapping[str, Any], model: Mapping[str, Any]) -> float:
    artifact = model["artifact"]
    x = transform_row(row, artifact["preprocessing"])
    model_artifact = artifact["model_artifact"]
    weights = [float(v) for v in model_artifact["w"]]
    if len(x) != len(weights):
        raise ScoringError(f"Encoded dimension mismatch for {model['target']}")

    z = float(model_artifact["b"])
    for weight, value in zip(weights, x):
        z += weight * value
    raw_p = clamp_probability(sigmoid(z))

    calibration = artifact["calibration_artifact"]
    calibrated = sigmoid(float(calibration["a"]) * logit(raw_p) + float(calibration["b"]))
    return clamp_probability(calibrated)


def assert_pregame_safety(run_date: str, feature_rows: Sequence[Mapping[str, Any]],
                          game_times: Mapping[int, Optional[str]],
                          allow_after_start: bool) -> None:
    if allow_after_start or run_date != ny_today():
        return
    now = utc_now()
    started = set()
    for row in feature_rows:
        game_pk = int(row["game_pk"])
        game_time = parse_timestamp(game_times.get(game_pk))
        if game_time is not None and game_time <= now:
            started.add(game_pk)
    if started:
        raise ScoringError(
            f"Refusing to score after first pitch for {len(started)} game(s). "
            "Use --allow-after-start only for intentional recovery."
        )


def build_prediction_rows(run_date: str, target: str,
                          feature_rows: Sequence[Mapping[str, Any]],
                          game_times: Mapping[int, Optional[str]],
                          model: Mapping[str, Any]) -> List[Dict[str, Any]]:
    model_run = model["model_run"]
    created_at = utc_now().isoformat()
    output = []
    for row in feature_rows:
        game_pk = int(row["game_pk"])
        output.append({
            "prediction_run_date": run_date,
            "game_date": row["game_date"],
            "game_pk": game_pk,
            "player_id": int(row["player_id"]),
            "target_name": target,
            "model_run_id": int(model_run["model_run_id"]),
            "model_version": model_run["model_version"],
            "predicted_probability": score_row(row, model),
            "predicted_value": None,
            "batter_name": row.get("batter_name"),
            "team_id": row.get("team_id"),
            "team_name": row.get("team_name"),
            "pitcher_id": row.get("pitcher_id"),
            "pitcher_name": row.get("pitcher_name"),
            "batting_order": row.get("batting_order"),
            "game_time_utc": game_times.get(game_pk),
            "feature_version": row.get("feature_version"),
            "prediction_source": SOURCE_NAME,
            "quality_status": "pending",
            "quality_reasons": [],
            "prediction_created_at": created_at,
        })
    return output


def verify_probability_distribution(target: str, rows: Sequence[Mapping[str, Any]]) -> None:
    probs = [float(r["predicted_probability"]) for r in rows]
    if not probs:
        raise ScoringError(f"{target}: zero predictions")
    if any(not (0.0 < p < 1.0) for p in probs):
        raise ScoringError(f"{target}: invalid probability")
    unique = len({round(p, 8) for p in probs})
    if len(probs) >= 20 and unique < 10:
        raise ScoringError(f"{target}: suspiciously flat probability distribution")


def score_target(run_date: str, target: str, dry_run: bool,
                 allow_after_start: bool) -> Dict[str, Any]:
    log(f"\n=== {target} | {run_date} ===")
    model = load_registered_model(target)
    mr = model["model_run"]
    log(f"Model run={mr['model_run_id']} version={mr['model_version']} status={mr['status']}")

    feature_rows = fetch_feature_rows(run_date, model["raw_features"])
    game_times = fetch_game_times(run_date)
    assert_pregame_safety(run_date, feature_rows, game_times, allow_after_start)

    rows = build_prediction_rows(run_date, target, feature_rows, game_times, model)
    verify_probability_distribution(target, rows)
    probs = sorted(float(r["predicted_probability"]) for r in rows)
    summary = {
        "target": target,
        "rows": len(rows),
        "min_probability": probs[0],
        "median_probability": probs[len(probs)//2],
        "max_probability": probs[-1],
    }
    log(json.dumps(summary, indent=2))

    if dry_run:
        return {**summary, "dry_run": True}

    rest_upsert(
        "mlb_ml_batter_predictions",
        rows,
        "prediction_run_date,target_name,game_pk,player_id",
    )
    rank_result = rpc(
        "rank_mlb_ml_batter_predictions",
        {"p_run_date": run_date, "p_target_name": target},
    )
    quality_result = rpc(
        "validate_mlb_ml_batter_predictions",
        {"p_run_date": run_date, "p_target_name": target},
    )
    log("Rank: " + json.dumps(rank_result, separators=(",", ":")))
    log("Quality: " + json.dumps(quality_result, separators=(",", ":")))

    return {
        **summary,
        "dry_run": False,
        "model_run_id": int(mr["model_run_id"]),
        "model_version": mr["model_version"],
        "rank_result": rank_result,
        "quality_result": quality_result,
    }


def load_status(run_date: str) -> List[Dict[str, Any]]:
    return rest_get(
        "mlb_ml_batter_pipeline_status",
        {
            "select": "*",
            "run_date": f"eq.{run_date}",
            "target_name": "in.(home_run_1plus,total_bases_2plus)",
            "order": "target_name.asc",
        },
    )


def refresh_and_assert_pipeline(run_date: str, targets: Sequence[str]) -> List[Dict[str, Any]]:
    rpc("refresh_mlb_ml_batter_pipeline_status", {"p_run_date": run_date})
    statuses = load_status(run_date)
    by_target = {r["target_name"]: r for r in statuses}
    failures = []
    for target in targets:
        row = by_target.get(target)
        if not row:
            failures.append(f"{target}: missing status row")
        elif row.get("status") != "complete":
            failures.append(
                f"{target}: status={row.get('status')} "
                f"predictions={row.get('prediction_rows')} "
                f"expected={row.get('expected_player_games')} "
                f"missing={row.get('missing_prediction_rows')}"
            )
    if failures:
        raise ScoringError("Database pipeline status is not COMPLETE:\n- " + "\n- ".join(failures))
    return statuses


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=ny_today(), help="YYYY-MM-DD; default = today in New York")
    parser.add_argument("--target", choices=("all",) + TARGETS, default="all")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--allow-after-start", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    require_environment()
    try:
        run_date = dt.date.fromisoformat(args.date).isoformat()
    except ValueError as exc:
        raise ScoringError("Invalid --date; expected YYYY-MM-DD") from exc

    targets = list(TARGETS if args.target == "all" else (args.target,))
    log(f"Phase 3B scorer | date={run_date} | targets={targets} | dry_run={args.dry_run}")

    results = [
        score_target(run_date, target, args.dry_run, args.allow_after_start)
        for target in targets
    ]
    statuses = [] if args.dry_run else refresh_and_assert_pipeline(run_date, targets)

    log("\nFINAL RESULT")
    log(json.dumps({"run_date": run_date, "results": results, "pipeline_status": statuses}, indent=2, default=str))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ScoringError as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        raise SystemExit(1)
