import os
import time
from datetime import datetime, timezone

import requests
from supabase import create_client


MLB_BASE_URL = "https://statsapi.mlb.com/api/v1"
SCRIPT_VERSION = "v1_batter_vs_pitcher_loader"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))
SEASON = int(os.getenv("MLB_SEASON", "2026"))

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def to_int(value, default=0):
    if value is None or value == "":
        return default
    try:
        return int(value)
    except Exception:
        return default


def to_decimal(value):
    if value is None or value == "":
        return None
    try:
        return float(str(value).replace(".", "0.", 1)) if str(value).startswith(".") else float(value)
    except Exception:
        return None


def get_latest_matchup():
    response = (
        supabase.table("mlb_daily_matchups")
        .select("*")
        .eq("reds_team_id", TEAM_ID)
        .not_.is_("probable_pitcher_id", "null")
        .order("game_date", desc=True)
        .order("updated_at", desc=True)
        .limit(1)
        .execute()
    )

    rows = response.data or []
    if not rows:
        return None

    return rows[0]


def get_active_hitters():
    response = supabase.rpc(
        "get_team_hot_hitters",
        {
            "p_team_id": TEAM_ID,
            "p_last_n": 10,
        },
    ).execute()

    rows = response.data or []

    print("=" * 80)
    print("DEBUG: Hitter rows returned from get_team_hot_hitters")
    print(f"TEAM_ID: {TEAM_ID}")
    print(f"Rows returned: {len(rows)}")

    hitters = []

    for row in rows:
        name = row.get("full_name") or ""
        player_id = row.get("player_id")

        if not player_id:
            continue

        if name.startswith("Historical Reds Player"):
            continue

        if name.startswith("Unknown Player"):
            continue

        hitters.append(
            {
                "player_id": player_id,
                "full_name": name,
                "active": True,
                "primary_position": row.get("primary_position"),
            }
        )

        print(
            f"HITTER DEBUG | "
            f"id={player_id} | "
            f"name={name}"
        )

    print(f"Hitters used for BvP lookup: {len(hitters)}")
    print("=" * 80)

    return hitters


def fetch_batter_vs_pitcher(batter_id, pitcher_id):
    url = f"{MLB_BASE_URL}/people/{batter_id}/stats"
    params = {
        "stats": "vsPlayer",
        "group": "hitting",
        "opposingPlayerId": pitcher_id,
    }

    response = requests.get(url, params=params, timeout=45)
    response.raise_for_status()
    data = response.json()

    for block in data.get("stats", []):
        block_type = (block.get("type") or {}).get("displayName")

        if block_type != "vsPlayerTotal":
            continue

        splits = block.get("splits") or []
        if not splits:
            return None

        return splits[0]

    return None


def build_row(split, batter_fallback, pitcher_fallback):
    stat = split.get("stat") or {}
    batter = split.get("batter") or {}
    pitcher = split.get("pitcher") or {}

    batter_id = batter.get("id") or batter_fallback["player_id"]
    pitcher_id = pitcher.get("id") or pitcher_fallback["pitcher_id"]

    at_bats = to_int(stat.get("atBats"))
    hits = to_int(stat.get("hits"))

    return {
        "season": 0,  # 0 = lifetime/career batter-vs-pitcher total
        "batter_id": batter_id,
        "pitcher_id": pitcher_id,
        "batter_name": batter.get("fullName") or batter_fallback.get("full_name"),
        "pitcher_name": pitcher.get("fullName") or pitcher_fallback.get("pitcher_name"),
        "at_bats": at_bats,
        "hits": hits,
        "doubles": to_int(stat.get("doubles")),
        "triples": to_int(stat.get("triples")),
        "home_runs": to_int(stat.get("homeRuns")),
        "strikeouts": to_int(stat.get("strikeOuts")),
        "walks": to_int(stat.get("baseOnBalls")),
        "hit_by_pitch": to_int(stat.get("hitByPitch")),
        "rbi": to_int(stat.get("rbi")),
        "batting_average": to_decimal(stat.get("avg")),
        "on_base_percentage": to_decimal(stat.get("obp")),
        "slugging_percentage": to_decimal(stat.get("slg")),
        "ops": to_decimal(stat.get("ops")),
        "source": "mlb_statsapi_vsPlayerTotal",
        "updated_at": now_utc(),
    }


def upsert_rows(rows):
    if not rows:
        print("No batter-vs-pitcher rows to upsert.")
        return

    print(f"Upserting {len(rows)} rows into mlb_batter_vs_pitcher_history")

    response = (
        supabase.table("mlb_batter_vs_pitcher_history")
        .upsert(rows, on_conflict="season,batter_id,pitcher_id")
        .execute()
    )

    print(f"Upsert complete: {len(response.data or [])} returned rows")


def main():
    print("Starting batter-vs-pitcher loader")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")
    print(f"Season: {SEASON}")

    matchup = get_latest_matchup()

    if not matchup:
        print("No matchup with probable pitcher found. Exiting successfully.")
        return

    pitcher_id = matchup.get("probable_pitcher_id")
    pitcher_name = matchup.get("probable_pitcher_name")

    if not pitcher_id:
        print("Latest matchup has no probable pitcher. Exiting successfully.")
        return

    print(f"Using pitcher: {pitcher_name} ({pitcher_id})")

    hitters = get_active_hitters()
    print(f"Active hitters found: {len(hitters)}")

    rows = []

    pitcher_fallback = {
        "pitcher_id": pitcher_id,
        "pitcher_name": pitcher_name,
    }

    for hitter in hitters:
        batter_id = hitter["player_id"]
        batter_name = hitter.get("full_name")

        print(f"Fetching BvP: {batter_name} ({batter_id}) vs {pitcher_name}")

        try:
            split = fetch_batter_vs_pitcher(batter_id, pitcher_id)
        except Exception as exc:
            print(f"ERROR fetching {batter_name}: {exc}")
            continue

        if not split:
            print(f"No prior history found for {batter_name} vs {pitcher_name}")
            continue

        row = build_row(split, hitter, pitcher_fallback)

        if row["at_bats"] == 0 and row["hits"] == 0 and row["walks"] == 0:
            print(f"Skipping empty BvP row for {batter_name}")
            continue

        rows.append(row)

        time.sleep(0.15)

    deduped_rows = {}

for row in rows:
    key = (
        row.get("season"),
        row.get("batter_id"),
        row.get("pitcher_id"),
    )
    deduped_rows[key] = row

rows = list(deduped_rows.values())

print(f"Rows after dedupe: {len(rows)}")

upsert_rows(rows)

    print("Batter-vs-pitcher loader completed")


if __name__ == "__main__":
    main()
