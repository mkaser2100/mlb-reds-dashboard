#!/usr/bin/env python3
"""
Incrementally refresh MLB Hit Board model performance.

This should run after the daily MLB loader has loaded completed game logs.
It recalculates only the most recent completed day by default and updates:
  - public.mlb_hit_board_predictions
  - public.v_mlb_model_window_comparison through the backing table

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
"""

from __future__ import annotations

import argparse
import os
from supabase import create_client


def get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--days-back", type=int, default=1, help="Number of historical days to refresh. Default: 1")
    args = parser.parse_args()

    client = get_client()
    result = client.rpc(
        "refresh_incremental_mlb_hit_board_performance",
        {"p_days_back": args.days_back},
    ).execute()

    print("Incremental MLB Hit Board performance refresh complete")
    for row in result.data or []:
        print(f"window={row.get('selected_window')} rows_inserted={row.get('rows_inserted')}")


if __name__ == "__main__":
    main()
