import os
import sys
import time
import requests
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from supabase import create_client, Client


load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))  # Cincinnati Reds
SEASON = int(os.getenv("MLB_SEASON", "2026"))

MLB_BASE_URL = "https://statsapi.mlb.com/api/v1"
SCRIPT_VERSION = "v1_reds_matchup_loader"

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


PITCHER_SPLIT_CODES = {
    "h": ("venue", "home"),
    "a": ("venue", "away"),
    "d": ("time_of_day", "day"),
    "n": ("time_of_day", "night"),
    "vl": ("batter_hand", "LHB"),  # Pitcher vs left-handed batters
    "vr": ("batter_hand", "RHB"),  # Pitcher vs right-handed batters
}


def mlb_get(path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    url = f"{MLB_BASE_URL}{path}"
    response = requests.get(url, params=params, timeout=45)

    if not response.ok:
        print("MLB API request failed")
        print(f"URL: {response.url}")
        print(f"Status: {response.status_code}")
        print(response.text[:1000])

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


def parse_ip(value: Any):
    """
    MLB returns innings pitched as strings like '5.2'.
    Baseball .2 means 2 outs, not 0.2 innings.
    Convert to decimal innings: 5.2 -> 5.6667.
    """
    if value is None or value == "":
        return None

    text = str(value)

    if "." not in text:
        return safe_float(text)

    whole, outs = text.split(".", 1)

    try:
      whole_num = int(whole)
      outs_num = int(outs)
      return round(whole_num + (outs_num / 3), 4)
    except Exception:
      return safe_float(value)


def chunked(items: List[Dict[str, Any]], size: int = 500):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def upsert(table: str, rows: List[Dict[str, Any]], conflict: str):
    if not rows:
        print(f"No rows to upsert into {table}")
        return

    for index, chunk in enumerate(chunked(rows), start=1):
        print(f"Upserting chunk {index} into {table}: {len(chunk)} rows")
        supabase.table(table).upsert(chunk, on_conflict=conflict).execute()

    print(f"Upserted {len(rows)} rows into {table}")


def today_utc_date() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def get_today_reds_game() -> Optional[Dict[str, Any]]:
    today = today_utc_date()

    print(f"Looking for Reds game on {today}")

    data = mlb_get(
        "/schedule",
        {
            "sportId": 1,
            "teamId": TEAM_ID,
            "date": today,
            "hydrate": "probablePitcher,team,venue",
        },
    )

    dates = data.get("dates", [])

    if not dates:
        print("No Reds game found today.")
        return None

    games = dates[0].get("games", [])

    if not games:
        print("No Reds games in schedule response.")
        return None

    # If doubleheader, take first game for now. Later we can support both.
    game = games[0]
    print(f"Found game_pk={game.get('gamePk')} status={game.get('status', {}).get('detailedState')}")
    return game


def get_team_side(game: Dict[str, Any]) -> Dict[str, Any]:
    teams = game.get("teams", {})
    home = teams.get("home", {})
    away = teams.get("away", {})

    home_team_id = home.get("team", {}).get("id")
    away_team_id = away.get("team", {}).get("id")

    if home_team_id == TEAM_ID:
        return {
            "reds_side": "home",
            "opponent_side": "away",
            "home_away": "home",
            "opponent_team": away.get("team", {}),
            "reds_team": home.get("team", {}),
            "opponent_probable_pitcher": away.get("probablePitcher"),
        }

    if away_team_id == TEAM_ID:
        return {
            "reds_side": "away",
            "opponent_side": "home",
            "home_away": "away",
            "opponent_team": home.get("team", {}),
            "reds_team": away.get("team", {}),
            "opponent_probable_pitcher": home.get("probablePitcher"),
        }

    raise ValueError("Reds team not found in schedule game payload.")


def get_person(player_id: int) -> Optional[Dict[str, Any]]:
    data = mlb_get(f"/people/{player_id}")
    people = data.get("people", [])

    if not people:
        return None

    return people[0]


def pitcher_row_from_person(person: Dict[str, Any], team_id: Optional[int], team_name: Optional[str]) -> Dict[str, Any]:
    return {
        "pitcher_id": person["id"],
        "full_name": person.get("fullName"),
        "team_id": team_id,
        "team_name": team_name,
        "active": person.get("active"),
        "primary_position": (person.get("primaryPosition") or {}).get("abbreviation"),
        "throws": (person.get("pitchHand") or {}).get("code"),
        "mlb_link": person.get("link"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def stat_to_pitcher_season_row(pitcher_id: int, team_id: Optional[int], stat: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "season": SEASON,
        "pitcher_id": pitcher_id,
        "team_id": team_id,
        "games": safe_int(stat.get("gamesPlayed")),
        "games_started": safe_int(stat.get("gamesStarted")),
        "innings_pitched": parse_ip(stat.get("inningsPitched")),
        "era": safe_float(stat.get("era")),
        "whip": safe_float(stat.get("whip")),
        "hits_allowed": safe_int(stat.get("hits")),
        "runs_allowed": safe_int(stat.get("runs")),
        "earned_runs": safe_int(stat.get("earnedRuns")),
        "walks": safe_int(stat.get("baseOnBalls")),
        "strikeouts": safe_int(stat.get("strikeOuts")),
        "home_runs_allowed": safe_int(stat.get("homeRuns")),
        "batting_average_against": safe_float(stat.get("avg")),
        "obp_against": safe_float(stat.get("obp")),
        "slg_against": safe_float(stat.get("slg")),
        "ops_against": safe_float(stat.get("ops")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_pitcher_season_stats(pitcher_id: int, team_id: Optional[int]) -> Optional[Dict[str, Any]]:
    data = mlb_get(
        f"/people/{pitcher_id}/stats",
        {
            "stats": "season",
            "group": "pitching",
            "season": SEASON,
        },
    )

    for block in data.get("stats", []):
        splits = block.get("splits", [])

        if not splits:
            continue

        stat = splits[0].get("stat") or {}
        return stat_to_pitcher_season_row(pitcher_id, team_id, stat)

    return None


def stat_to_pitcher_split_row(
    pitcher_id: int,
    team_id: Optional[int],
    split_type: str,
    split_value: str,
    stat: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "season": SEASON,
        "pitcher_id": pitcher_id,
        "team_id": team_id,
        "split_type": split_type,
        "split_value": split_value,
        "games": safe_int(stat.get("gamesPlayed")),
        "games_started": safe_int(stat.get("gamesStarted")),
        "innings_pitched": parse_ip(stat.get("inningsPitched")),
        "hits_allowed": safe_int(stat.get("hits")),
        "runs_allowed": safe_int(stat.get("runs")),
        "earned_runs": safe_int(stat.get("earnedRuns")),
        "walks": safe_int(stat.get("baseOnBalls")),
        "strikeouts": safe_int(stat.get("strikeOuts")),
        "home_runs_allowed": safe_int(stat.get("homeRuns")),
        "batting_average_against": safe_float(stat.get("avg")),
        "obp_against": safe_float(stat.get("obp")),
        "slg_against": safe_float(stat.get("slg")),
        "ops_against": safe_float(stat.get("ops")),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_pitcher_splits(pitcher_id: int, team_id: Optional[int]) -> List[Dict[str, Any]]:
    rows = []

    for sit_code, (split_type, split_value) in PITCHER_SPLIT_CODES.items():
        data = mlb_get(
            f"/people/{pitcher_id}/stats",
            {
                "stats": "statSplits",
                "group": "pitching",
                "season": SEASON,
                "sitCodes": sit_code,
            },
        )

        count = 0

        for block in data.get("stats", []):
            for split in block.get("splits", []):
                stat = split.get("stat") or {}

                row = stat_to_pitcher_split_row(
                    pitcher_id=pitcher_id,
                    team_id=team_id,
                    split_type=split_type,
                    split_value=split_value,
                    stat=stat,
                )

                if row["innings_pitched"] is None and row["hits_allowed"] == 0:
                    continue

                rows.append(row)
                count += 1

        print(f"Pitcher {pitcher_id} split {sit_code} -> {count} rows")
        time.sleep(0.12)

    return rows


def pitcher_game_log_row_from_split(
    pitcher_id: int,
    split: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    stat = split.get("stat") or {}

    game = split.get("game") or {}
    team = split.get("team") or {}
    opponent = split.get("opponent") or {}

    game_pk = game.get("gamePk") or split.get("gamePk")
    game_date = split.get("date") or game.get("gameDate")

    if not game_pk or not game_date:
        return None

    # Normalize timestamp/date to date only.
    game_date_str = str(game_date)[:10]

    # Starter detection is imperfect from player stat logs; MLB usually gives gamesStarted.
    is_start = safe_int(stat.get("gamesStarted")) > 0

    return {
        "pitcher_id": pitcher_id,
        "game_pk": game_pk,
        "game_date": game_date_str,
        "season": SEASON,
        "team_id": team.get("id"),
        "opponent_team_id": opponent.get("id"),
        "opponent_team_name": opponent.get("name"),
        "home_away": None,
        "is_start": is_start,
        "innings_pitched": parse_ip(stat.get("inningsPitched")),
        "hits_allowed": safe_int(stat.get("hits")),
        "runs_allowed": safe_int(stat.get("runs")),
        "earned_runs": safe_int(stat.get("earnedRuns")),
        "walks": safe_int(stat.get("baseOnBalls")),
        "strikeouts": safe_int(stat.get("strikeOuts")),
        "home_runs_allowed": safe_int(stat.get("homeRuns")),
        "pitches": safe_int(stat.get("pitchesThrown"), None),
        "strikes": safe_int(stat.get("strikes"), None),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_pitcher_game_logs(pitcher_id: int) -> List[Dict[str, Any]]:
    data = mlb_get(
        f"/people/{pitcher_id}/stats",
        {
            "stats": "gameLog",
            "group": "pitching",
            "season": SEASON,
        },
    )

    rows = []

    for block in data.get("stats", []):
        for split in block.get("splits", []):
            row = pitcher_game_log_row_from_split(pitcher_id, split)

            if row:
                rows.append(row)

    rows.sort(key=lambda x: x["game_date"], reverse=True)

    print(f"Pitcher {pitcher_id} game logs found: {len(rows)}")
    return rows


def daily_matchup_row(game: Dict[str, Any], side: Dict[str, Any], pitcher: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    opponent_team = side["opponent_team"]

    game_datetime = game.get("gameDate")
    game_time_utc = None

    if game_datetime:
        game_time_utc = game_datetime

    probable_pitcher_id = pitcher.get("id") if pitcher else None
    probable_pitcher_name = pitcher.get("fullName") if pitcher else None

    return {
        "game_pk": game["gamePk"],
        "game_date": str(game.get("gameDate"))[:10],
        "season": SEASON,
        "reds_team_id": TEAM_ID,
        "opponent_team_id": opponent_team.get("id"),
        "opponent_team_name": opponent_team.get("name"),
        "home_away": side["home_away"],
        "probable_pitcher_id": probable_pitcher_id,
        "probable_pitcher_name": probable_pitcher_name,
        "probable_pitcher_throws": None,
        "game_status": (game.get("status") or {}).get("detailedState"),
        "venue_name": (game.get("venue") or {}).get("name"),
        "game_time_utc": game_time_utc,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def main():
    print(f"Starting Reds matchup loader")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")
    print(f"Season: {SEASON}")

    game = get_today_reds_game()

    if not game:
        print("No game today. Exiting successfully.")
        return

    side = get_team_side(game)
    probable_pitcher_stub = side.get("opponent_probable_pitcher")
    opponent_team = side.get("opponent_team") or {}

    matchup = daily_matchup_row(game, side, probable_pitcher_stub)

    if not probable_pitcher_stub:
        print("No opposing probable pitcher listed yet.")
        upsert("mlb_daily_matchups", [matchup], "game_pk")
        return

    pitcher_id = probable_pitcher_stub["id"]

    print(f"Opposing probable starter: {probable_pitcher_stub.get('fullName')} ({pitcher_id})")

    person = get_person(pitcher_id)

    if not person:
        print(f"Could not hydrate pitcher {pitcher_id}")
        upsert("mlb_daily_matchups", [matchup], "game_pk")
        return

    pitcher_row = pitcher_row_from_person(
        person,
        opponent_team.get("id"),
        opponent_team.get("name"),
    )

    matchup["probable_pitcher_name"] = pitcher_row["full_name"]
    matchup["probable_pitcher_throws"] = pitcher_row["throws"]

    upsert("mlb_pitchers", [pitcher_row], "pitcher_id")
    upsert("mlb_daily_matchups", [matchup], "game_pk")

    season_row = fetch_pitcher_season_stats(pitcher_id, opponent_team.get("id"))

    if season_row:
        upsert("mlb_pitcher_season_stats", [season_row], "season,pitcher_id")
    else:
        print("No season pitcher stats returned.")

    split_rows = fetch_pitcher_splits(pitcher_id, opponent_team.get("id"))
    upsert("mlb_pitcher_splits", split_rows, "season,pitcher_id,split_type,split_value")

    game_log_rows = fetch_pitcher_game_logs(pitcher_id)
    upsert("mlb_pitcher_game_logs", game_log_rows, "pitcher_id,game_pk")

    print("Reds matchup loader completed")


if __name__ == "__main__":
    main()
