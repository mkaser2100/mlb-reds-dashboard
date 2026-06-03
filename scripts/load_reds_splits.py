import os
import sys
import time
import requests
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))
SEASON = int(os.getenv("MLB_SEASON", "2026"))

MLB_BASE_URL = "https://statsapi.mlb.com/api/v1"
SCRIPT_VERSION = "v1_reds_mlb_splits_loader"


if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)


supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def mlb_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{MLB_BASE_URL}{path}"
    response = requests.get(url, params=params, timeout=30)

    if not response.ok:
        print("MLB API request failed")
        print(f"URL: {response.url}")
        print(f"Status code: {response.status_code}")
        print(f"Response body: {response.text[:1000]}")

    response.raise_for_status()
    return response.json()


def safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(value)
    except Exception:
        return default


def safe_float(value: Any):
    try:
        if value is None or value == "":
            return None

        # MLB often returns ".275" as a string. float handles that.
        return float(value)
    except Exception:
        return None


def chunked(items: List[Dict[str, Any]], size: int = 500):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def upsert(table: str, rows: List[Dict[str, Any]], conflict: str):
    if not rows:
        print(f"No rows to upsert into {table}")
        return

    for index, chunk in enumerate(chunked(rows), start=1):
        print(f"Upserting chunk {index} into {table}: {len(chunk)} rows")

        try:
            supabase.table(table).upsert(chunk, on_conflict=conflict).execute()
        except Exception as exc:
            print(f"Upsert failed for table: {table}")
            print(f"Conflict target: {conflict}")
            print(f"First row in failed chunk: {chunk[0] if chunk else 'NO ROWS'}")
            raise exc

    print(f"Upserted {len(rows)} rows into {table}")


def get_reds_players() -> List[Dict[str, Any]]:
    """
    Pulls players from Supabase who have Reds game logs.
    This is better than only using the active roster because it includes
    players who appeared earlier in the season.
    """
    result = (
        supabase
        .table("mlb_player_batting_game_logs")
        .select("player_id, mlb_players(player_id, full_name)")
        .eq("team_id", TEAM_ID)
        .execute()
    )

    seen = {}
    for row in result.data:
        player = row.get("mlb_players") or {}
        player_id = player.get("player_id") or row.get("player_id")
        full_name = player.get("full_name") or f"Unknown Player {player_id}"

        if player_id:
            seen[player_id] = {
                "player_id": player_id,
                "full_name": full_name
            }

    players = list(seen.values())
    players.sort(key=lambda x: x["full_name"])

    return players


def normalize_split(split_type: str, split_obj: Dict[str, Any]):
    """
    MLB's split response can represent split names differently depending
    on the split. This function maps MLB's response to our canonical values.
    """
    split = split_obj.get("split") or {}
    label_candidates = [
        split.get("description"),
        split.get("name"),
        split.get("code"),
        split.get("value"),
        split_obj.get("splitDescription"),
    ]

    labels = [
        str(x).strip()
        for x in label_candidates
        if x is not None and str(x).strip() != ""
    ]

    label_joined = " | ".join(labels).lower()

    if split_type == "venue":
        if "home" in label_joined:
            return "venue", "home"
        if "away" in label_joined or "road" in label_joined:
            return "venue", "away"

    if split_type == "time_of_day":
        if "day" in label_joined:
            return "time_of_day", "day"
        if "night" in label_joined:
            return "time_of_day", "night"

    if split_type == "pitcher_hand":
        # MLB can return left/right as L/R, vs LHP/vs RHP, or descriptions.
        if "lhp" in label_joined or "left" in label_joined or label_joined in ["l", "vs l"]:
            return "pitcher_hand", "LHP"
        if "rhp" in label_joined or "right" in label_joined or label_joined in ["r", "vs r"]:
            return "pitcher_hand", "RHP"

    return None, None


def stat_to_row(
    player_id: int,
    split_type: str,
    split_value: str,
    stat: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "season": SEASON,
        "player_id": player_id,
        "team_id": TEAM_ID,
        "split_type": split_type,
        "split_value": split_value,
        "games": safe_int(stat.get("gamesPlayed")),
        "at_bats": safe_int(stat.get("atBats")),
        "runs": safe_int(stat.get("runs")),
        "hits": safe_int(stat.get("hits")),
        "doubles": safe_int(stat.get("doubles")),
        "triples": safe_int(stat.get("triples")),
        "home_runs": safe_int(stat.get("homeRuns")),
        "rbi": safe_int(stat.get("rbi")),
        "walks": safe_int(stat.get("baseOnBalls")),
        "strikeouts": safe_int(stat.get("strikeOuts")),
        "stolen_bases": safe_int(stat.get("stolenBases")),
        "caught_stealing": safe_int(stat.get("caughtStealing")),
        "plate_appearances": safe_int(stat.get("plateAppearances")),
        "batting_average": safe_float(stat.get("avg")),
        "on_base_percentage": safe_float(stat.get("obp")),
        "slugging_percentage": safe_float(stat.get("slg")),
        "ops": safe_float(stat.get("ops")),
    }


def parse_split_response(
    player_id: int,
    requested_split_type: str,
    data: Dict[str, Any],
) -> List[Dict[str, Any]]:
    rows = []

    for stat_block in data.get("stats", []):
        for split_obj in stat_block.get("splits", []):
            split_type, split_value = normalize_split(requested_split_type, split_obj)

            if not split_type or not split_value:
                continue

            stat = split_obj.get("stat") or {}

            row = stat_to_row(
                player_id=player_id,
                split_type=split_type,
                split_value=split_value,
                stat=stat,
            )

            # Avoid storing empty rows where MLB returns a shell split.
            if row["plate_appearances"] == 0 and row["at_bats"] == 0:
                continue

            rows.append(row)

    return rows


def fetch_split_for_player(player_id: int, split_type: str) -> List[Dict[str, Any]]:
    """
    Uses MLB Stats API statSplits endpoint.

    sitCodes appears to be the key parameter for these common splits:
      - homeAndAway
      - dayNight
      - pitcherHand

    If MLB changes payload details, the script logs what happened and moves on.
    """
    sit_code_map = {
        "venue": "homeAndAway",
        "time_of_day": "dayNight",
        "pitcher_hand": "pitcherHand",
    }

    sit_code = sit_code_map[split_type]

    data = mlb_get(
        f"/people/{player_id}/stats",
        {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": sit_code,
        },
    )

    rows = parse_split_response(
        player_id=player_id,
        requested_split_type=split_type,
        data=data,
    )

    print(f"Player {player_id} · {split_type} · rows: {len(rows)}")

    return rows


def main():
    print(f"Starting Reds splits load for season {SEASON}")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")

    players = get_reds_players()
    print(f"Players found from game logs: {len(players)}")

    all_rows = []

    split_types = [
        "venue",
        "time_of_day",
        "pitcher_hand",
    ]

    for player in players:
        player_id = player["player_id"]
        full_name = player["full_name"]

        print(f"Loading splits for {full_name} ({player_id})")

        for split_type in split_types:
            try:
                rows = fetch_split_for_player(player_id, split_type)
                all_rows.extend(rows)
                time.sleep(0.15)
            except Exception as exc:
                print(f"Failed {full_name} ({player_id}) split={split_type}: {exc}")

    print(f"Total split rows collected: {len(all_rows)}")

    upsert(
        "mlb_player_batting_splits",
        all_rows,
        "season,player_id,split_type,split_value",
    )

    print("Reds splits load completed")


if __name__ == "__main__":
    main()
