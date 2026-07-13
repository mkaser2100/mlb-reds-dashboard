import os
import sys
import time
import requests
from typing import Any, Dict, List, Optional, Tuple

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))
SEASON = int(os.getenv("MLB_SEASON", "2026"))

MLB_BASE_URL = "https://statsapi.mlb.com/api/v1"
SCRIPT_VERSION = "v3_reds_mlb_splits_deduplicate_conflict_keys"


if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)


supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


SPLIT_CODE_MAP = {
    "h": ("venue", "home"),
    "a": ("venue", "away"),
    "d": ("time_of_day", "day"),
    "n": ("time_of_day", "night"),
    "vl": ("pitcher_hand", "LHP"),
    "vr": ("pitcher_hand", "RHP"),
}


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
        return float(value)
    except Exception:
        return None


def chunked(items: List[Dict[str, Any]], size: int = 500):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def split_conflict_key(row: Dict[str, Any]) -> Tuple[Any, Any, Any, Any]:
    """
    Match the unique/conflict key used by the Supabase upsert.
    """
    return (
        row.get("season"),
        row.get("player_id"),
        row.get("split_type"),
        row.get("split_value"),
    )


def split_row_rank(row: Dict[str, Any]) -> Tuple[int, int, int, int]:
    """
    Prefer the most complete cumulative split when MLB returns multiple
    records for the same player and situation code.

    Plate appearances are the strongest completeness signal, followed by
    at-bats, games, and hits. The ordering is deterministic.
    """
    return (
        safe_int(row.get("plate_appearances")),
        safe_int(row.get("at_bats")),
        safe_int(row.get("games")),
        safe_int(row.get("hits")),
    )


def deduplicate_split_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ensure each upsert conflict key appears only once in the request.

    PostgreSQL raises error 21000 when a single INSERT ... ON CONFLICT request
    contains duplicate constrained values. MLB Stats API may return multiple
    split records for a traded player, a player with multiple team stints, or
    another segmented result. Keep the most complete row for each key.
    """
    deduplicated: Dict[Tuple[Any, Any, Any, Any], Dict[str, Any]] = {}
    duplicate_count = 0

    for row in rows:
        key = split_conflict_key(row)
        existing = deduplicated.get(key)

        if existing is None:
            deduplicated[key] = row
            continue

        duplicate_count += 1
        existing_rank = split_row_rank(existing)
        candidate_rank = split_row_rank(row)

        if candidate_rank > existing_rank:
            kept = row
            discarded = existing
            deduplicated[key] = row
        else:
            kept = existing
            discarded = row

        print(
            "Duplicate split key detected: "
            f"{key}; kept PA={kept.get('plate_appearances')}, "
            f"AB={kept.get('at_bats')}, G={kept.get('games')}; "
            f"discarded PA={discarded.get('plate_appearances')}, "
            f"AB={discarded.get('at_bats')}, G={discarded.get('games')}"
        )

    if duplicate_count:
        print(
            f"Removed {duplicate_count} duplicate split row(s); "
            f"{len(deduplicated)} unique row(s) remain"
        )
    else:
        print("No duplicate split conflict keys detected")

    return list(deduplicated.values())


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
    This includes active players and players who appeared earlier in the season.
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
                "full_name": full_name,
            }

    players = list(seen.values())
    players.sort(key=lambda x: x["full_name"])

    return players


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


def fetch_split_for_player(player_id: int, sit_code: str) -> List[Dict[str, Any]]:
    split_type, split_value = SPLIT_CODE_MAP[sit_code]

    data = mlb_get(
        f"/people/{player_id}/stats",
        {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": sit_code,
        },
    )

    rows = []

    for stat_block in data.get("stats", []):
        for split_obj in stat_block.get("splits", []):
            stat = split_obj.get("stat") or {}

            row = stat_to_row(
                player_id=player_id,
                split_type=split_type,
                split_value=split_value,
                stat=stat,
            )

            if row["plate_appearances"] == 0 and row["at_bats"] == 0:
                continue

            rows.append(row)

    print(
        f"Player {player_id} · code={sit_code} · "
        f"{split_type}/{split_value} · rows={len(rows)}"
    )

    return rows


def main():
    print(f"Starting Reds splits load for season {SEASON}")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")

    players = get_reds_players()
    print(f"Players found from game logs: {len(players)}")

    all_rows = []

    for player in players:
        player_id = player["player_id"]
        full_name = player["full_name"]

        print(f"Loading splits for {full_name} ({player_id})")

        for sit_code in SPLIT_CODE_MAP.keys():
            try:
                rows = fetch_split_for_player(player_id, sit_code)
                all_rows.extend(rows)
                time.sleep(0.12)
            except Exception as exc:
                print(f"Failed {full_name} ({player_id}) sit_code={sit_code}: {exc}")

    print(f"Total split rows collected before deduplication: {len(all_rows)}")
    all_rows = deduplicate_split_rows(all_rows)
    print(f"Total split rows after deduplication: {len(all_rows)}")

    upsert(
        "mlb_player_batting_splits",
        all_rows,
        "season,player_id,split_type,split_value",
    )

    print("Reds splits load completed")


if __name__ == "__main__":
    main()
