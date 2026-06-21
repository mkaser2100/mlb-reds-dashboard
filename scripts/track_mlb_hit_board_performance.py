#!/usr/bin/env python3
"""
Snapshot and update MLB Hit Board prediction performance.

Usage:
  python scripts/track_mlb_hit_board_performance.py --mode snapshot
  python scripts/track_mlb_hit_board_performance.py --mode actuals
  python scripts/track_mlb_hit_board_performance.py --mode both

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
"""

from __future__ import annotations

import argparse
import os
from supabase import create_client


WINDOWS = [3, 5, 6, 10, 15]


def get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["snapshot", "actuals", "both"], default="both")
    parser.add_argument("--windows", default=",".join(map(str, WINDOWS)))
    args = parser.parse_args()

    client = get_client()
    windows = [int(x.strip()) for x in args.windows.split(",") if x.strip()]

    if args.mode in ("snapshot", "both"):
        for window in windows:
            result = client.rpc("snapshot_mlb_hit_board_predictions", {"p_selected_window": window}).execute()
            print(f"snapshot window={window}: {result.data}")

    if args.mode in ("actuals", "both"):
        result = client.rpc("update_mlb_hit_board_prediction_actuals").execute()
        print(f"actuals updated: {result.data}")


if __name__ == "__main__":
    main()
