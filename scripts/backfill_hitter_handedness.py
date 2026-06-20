#!/usr/bin/env python3
"""
Backfill hitter batting handedness for all MLB players.

Fixes:
  - public.mlb_players.bats
  - public.mlb_players.throws

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
    req = Request(f"{MLB_API}{path}", headers={"User-Agent": "mlb-hitter-lab-bats-backfill/1.0"})
    with urlopen(req, timeout=30) as resp:
        import json
        return json.loads(resp.read().decode("utf-8"))


def get_client():
    url = os.environ["SUPABASE_URL"]
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ["SUPABASE_KEY"]
    return create_client(url, key)


def get_player_hands(player_id: int) -> Dict[str, Optional[str]]:
    data = api_get(f"/people/{player_id}")
    people = data.get("people") or []
    if not people:
        return {"bats": None, "throws": None}

    person = people[0]
    bats = (person.get("batSide") or {}).get("code")
    throws = (person.get("pitchHand") or {}).get("code")

    return {
        "bats": bats if bats in ("L", "R", "S") else None,
        "throws": throws if throws in ("L", "R") else None,
    }


def main() -> None:
    client = get_client()

    response = (
        client.table("mlb_players")
        .select("player_id, full_name, bats, throws")
        .execute()
    )

    players = response.data or []
    print(f"Found {len(players)} players")

    updated = 0
    missing = 0

    for idx, player in enumerate(players, start=1):
        player_id = int(player["player_id"])
        name = player.get("full_name") or str(player_id)

        try:
            hands = get_player_hands(player_id)
        except Exception as exc:
            print(f"{idx}/{len(players)} failed {player_id} {name}: {exc}")
            missing += 1
            continue

        update = {}
        if hands.get("bats"):
            update["bats"] = hands["bats"]
        if hands.get("throws"):
            update["throws"] = hands["throws"]

        if not update:
            print(f"{idx}/{len(players)} no hands found {player_id} {name}")
            missing += 1
            continue

        client.table("mlb_players").update(update).eq("player_id", player_id).execute()
        print(f"{idx}/{len(players)} {name}: bats={update.get('bats')} throws={update.get('throws')}")
        updated += 1
        time.sleep(0.04)

    print(f"Done. Updated={updated}, missing={missing}")


if __name__ == "__main__":
    main()
