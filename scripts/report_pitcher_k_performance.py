#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import urllib.request

BASE = os.environ.get("SUPABASE_URL", "").rstrip("/")
KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def get(path: str):
    if not BASE or not KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"apikey": KEY, "Authorization": f"Bearer {KEY}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode() or "[]")


def fmt(v, digits=3):
    if v is None:
        return "n/a"
    try:
        return f"{float(v):.{digits}f}"
    except Exception:
        return str(v)


def main() -> int:
    gates = get(
        "/rest/v1/v_mlb_ml_pitcher_k_promotion_gate_status"
        "?select=*&order=model_run_id.desc&limit=1"
    )
    quality = get(
        "/rest/v1/v_mlb_ml_pitcher_k_quality_performance"
        "?select=*&order=model_run_id.desc,quality_status.asc"
    )
    calibration = get(
        "/rest/v1/v_mlb_ml_pitcher_k_probability_band_calibration"
        "?select=*&order=model_run_id.desc,line.asc,probability_decile.asc"
    )

    print("# Pitcher K Phase 4C Performance")
    if not gates:
        print("No prospective shadow actuals are available yet.")
        print("Promotion status: insufficient_sample")
        return 0

    g = gates[0]
    print(
        f"Model {g.get('model_run_id')} ({g.get('model_version')}): "
        f"status={g.get('promotion_gate_status')}, rows={g.get('evaluated_rows')}, "
        f"days={g.get('evaluated_days')}, ready={g.get('ready_rows')}"
    )
    print(
        f"MAE={fmt(g.get('mae'))}, RMSE={fmt(g.get('rmse'))}, "
        f"log_loss={fmt(g.get('distribution_log_loss'))}, "
        f"bias={fmt(g.get('mean_bias'))}, worst_brier={fmt(g.get('worst_brier'))}"
    )
    print(
        "Gates: "
        f"rows={g.get('pass_rows')} days={g.get('pass_days')} "
        f"ready={g.get('pass_ready_rows')} mae={g.get('pass_mae')} "
        f"rmse={g.get('pass_rmse')} log_loss={g.get('pass_log_loss')} "
        f"bias={g.get('pass_bias')} brier={g.get('pass_brier')}"
    )

    print("\nQuality slices:")
    found_quality = False
    for r in quality:
        if str(r.get("model_run_id")) != str(g.get("model_run_id")):
            continue
        found_quality = True
        print(
            f"- {r.get('quality_status')}: n={r.get('evaluated_rows')}, "
            f"days={r.get('evaluated_days')}, MAE={fmt(r.get('mae'))}, "
            f"RMSE={fmt(r.get('rmse'))}, "
            f"log_loss={fmt(r.get('distribution_log_loss'))}"
        )
    if not found_quality:
        print("- none yet")

    useful = [
        r for r in calibration
        if str(r.get("model_run_id")) == str(g.get("model_run_id"))
        and int(r.get("rows") or 0) >= 10
    ]
    print("\nCalibration bands with n>=10:")
    if not useful:
        print("- none yet")
    else:
        for r in useful:
            pred = 100 * float(r.get("avg_predicted_probability") or 0)
            actual = 100 * float(r.get("observed_over_rate") or 0)
            gap = 100 * float(r.get("calibration_gap") or 0)
            print(
                f"- line {r.get('line')} / {r.get('quality_status')} / "
                f"{r.get('probability_band_low_pct')}-"
                f"{r.get('probability_band_high_pct')}%: "
                f"n={r.get('rows')}, pred={pred:.1f}%, "
                f"actual={actual:.1f}%, gap={gap:.1f}pp"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
