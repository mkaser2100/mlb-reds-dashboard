#!/usr/bin/env python3
"""
Backfill current probable starter throwing handedness.

Fixes:
  - public.mlb_pitchers.throws
  - public.mlb_daily_team_matchups.probable_pitcher_throws
  - public.mlb_daily_matchups.probable_pitcher_throws for Reds legacy table

Required env:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
"""

from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional
from urllib.request import Request, urlopen

from supabase import create_client

MLB_API = "https://statsapi.mlb.com/api/v1"


def api_get(path: str) -> Dict[str, Any]:
    req = Request(f"{MLB_API}{path}", headers={"User-Agent": "mlb-hit-lab-pitcher-hand-backfill/1.0"})
    with urlopen(req, timeout=30) as resp:
        import json
        return json.loads(resp.read().decode("utf-8"))


def get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def get_pitcher_hand(pitcher_id: int) -> Optional[str]:
    data = api_get(f"/people/{pitcher_id}")
    people = data.get("people") or []
    if not people:
        return None

    hand = (people[0].get("pitchHand") or {}).get("code")
    return hand if hand in ("L", "R") else None


def main() -> None:
    client = get_client()

    response = (
        client.table("mlb_daily_team_matchups")
        .select("probable_pitcher_id, probable_pitcher_name, probable_pitcher_throws")
        .not_.is_("probable_pitcher_id", "null")
        .execute()
    )

    pitcher_rows = response.data or []
    pitchers: dict[int, str] = {}
    for row in pitcher_rows:
        pid = row.get("probable_pitcher_id")
        if pid:
            pitchers[int(pid)] = row.get("probable_pitcher_name") or str(pid)

    print(f"Checking {len(pitchers)} probable starters")

    updated = 0
    missing = 0

    for idx, (pitcher_id, name) in enumerate(sorted(pitchers.items()), start=1):
        try:
            hand = get_pitcher_hand(pitcher_id)
        except Exception as exc:
            print(f"{idx}/{len(pitchers)} failed {pitcher_id} {name}: {exc}")
            missing += 1
            continue

        if hand not in ("L", "R"):
            print(f"{idx}/{len(pitchers)} missing hand {pitcher_id} {name}")
            missing += 1
            continue

        print(f"{idx}/{len(pitchers)} {name} ({pitcher_id}) throws {hand}")

        client.table("mlb_pitchers").update({"throws": hand}).eq("pitcher_id", pitcher_id).execute()
        client.table("mlb_daily_team_matchups").update({"probable_pitcher_throws": hand}).eq("probable_pitcher_id", pitcher_id).execute()
        client.table("mlb_daily_matchups").update({"probable_pitcher_throws": hand}).eq("probable_pitcher_id", pitcher_id).execute()

        updated += 1
        time.sleep(0.04)

    print(f"Done. Updated={updated}, missing={missing}")


if __name__ == "__main__":
    main()
