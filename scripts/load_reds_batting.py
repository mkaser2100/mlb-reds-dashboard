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
SCRIPT_VERSION = "v4_schedule_fix_missing_player_fix"


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


def chunked(items: List[Dict[str, Any]], size: int = 500):
    for i in range(0, len(items), size):
        yield items[i:i + size]


def upsert(table: str, rows: List[Dict[str, Any]], conflict: str):
    if not rows:
        print(f"No rows to upsert into {table}")
        return

    total = len(rows)

    for index, chunk in enumerate(chunked(rows), start=1):
        print(f"Upserting chunk {index} into {table}: {len(chunk)} rows")

        try:
            supabase.table(table).upsert(chunk, on_conflict=conflict).execute()
        except Exception as exc:
            print(f"Upsert failed for table: {table}")
            print(f"Conflict target: {conflict}")
            print(f"Chunk size: {len(chunk)}")
            print(f"First row in failed chunk: {chunk[0] if chunk else 'NO ROWS'}")
            raise exc

    print(f"Upserted {total} rows into {table}")


def get_roster_players() -> List[Dict[str, Any]]:
    """
    Pulls the current active Reds roster.
    Historical players are handled separately by ensure_players_exist().
    """
    data = mlb_get(
        f"/teams/{TEAM_ID}/roster",
        {
            "season": SEASON,
            "rosterType": "active",
        },
    )

    player_rows = []

    for item in data.get("roster", []):
        person = item.get("person", {})
        position = item.get("position", {})

        player_id = person.get("id")
        full_name = person.get("fullName")

        if not player_id or not full_name:
            continue

        player_rows.append(
            {
                "player_id": player_id,
                "full_name": full_name,
                "team_id": TEAM_ID,
                "team_name": "Cincinnati Reds",
                "active": True,
                "primary_position": position.get("abbreviation"),
                "mlb_link": person.get("link"),
            }
        )

    return player_rows


def ensure_players_exist(all_logs: List[Dict[str, Any]]):
    """
    Some players may appear in Reds game logs even if they are no longer
    on the current active roster. This inserts those missing players into
    mlb_players before inserting game logs, preventing foreign key errors.
    """
    print("Running missing historical player check")

    if not all_logs:
        print("No game logs found, skipping missing player check")
        return

    player_ids = sorted(list(set(row["player_id"] for row in all_logs)))
    print(f"Unique player IDs in game logs: {len(player_ids)}")

    existing_response = (
        supabase.table("mlb_players")
        .select("player_id")
        .in_("player_id", player_ids)
        .execute()
    )

    existing_ids = {row["player_id"] for row in existing_response.data}

    missing_ids = [
        player_id for player_id in player_ids if player_id not in existing_ids
    ]

    print(f"Missing historical players found: {len(missing_ids)}")

    if missing_ids:
        print(f"Missing player IDs: {missing_ids}")

    missing_player_rows = []

    for player_id in missing_ids:
        try:
            data = mlb_get(f"/people/{player_id}")
            people = data.get("people", [])

            if not people:
                print(f"No MLB person data found for player {player_id}")

                missing_player_rows.append(
                    {
                        "player_id": player_id,
                        "full_name": f"Unknown Player {player_id}",
                        "team_id": TEAM_ID,
                        "team_name": "Cincinnati Reds",
                        "active": False,
                        "primary_position": None,
                        "bats": None,
                        "throws": None,
                        "mlb_link": None,
                    }
                )

                continue

            person = people[0]

            missing_player_rows.append(
                {
                    "player_id": player_id,
                    "full_name": person.get("fullName", f"Unknown Player {player_id}"),
                    "team_id": TEAM_ID,
                    "team_name": "Cincinnati Reds",
                    "active": False,
                    "primary_position": person.get("primaryPosition", {}).get(
                        "abbreviation"
                    ),
                    "bats": person.get("batSide", {}).get("code"),
                    "throws": person.get("pitchHand", {}).get("code"),
                    "mlb_link": person.get("link"),
                }
            )

            time.sleep(0.1)

        except Exception as exc:
            print(f"Failed to fetch missing player {player_id}: {exc}")

            missing_player_rows.append(
                {
                    "player_id": player_id,
                    "full_name": f"Unknown Player {player_id}",
                    "team_id": TEAM_ID,
                    "team_name": "Cincinnati Reds",
                    "active": False,
                    "primary_position": None,
                    "bats": None,
                    "throws": None,
                    "mlb_link": None,
                }
            )

    upsert("mlb_players", missing_player_rows, "player_id")


def get_team_schedule() -> List[Dict[str, Any]]:
    """
    Pulls completed Reds regular-season games for the configured season.
    Do not pass endDate alone; MLB schedule API can return 400.
    """
    data = mlb_get(
        "/schedule",
        {
            "sportId": 1,
            "teamId": TEAM_ID,
            "season": SEASON,
            "gameTypes": "R",
            "hydrate": "team",
        },
    )

    games = []

    for day in data.get("dates", []):
        game_date = day.get("date")

        for game in day.get("games", []):
            status = game.get("status", {})
            detailed_state = status.get("detailedState")

            if detailed_state not in ["Final", "Game Over", "Completed Early"]:
                continue

            teams = game.get("teams", {})
            home = teams.get("home", {}).get("team", {})
            away = teams.get("away", {}).get("team", {})

            home_team_id = home.get("id")
            away_team_id = away.get("id")

            if home_team_id == TEAM_ID:
                home_away = "home"
                opponent_team_id = away_team_id
                opponent_team_name = away.get("name")
            else:
                home_away = "away"
                opponent_team_id = home_team_id
                opponent_team_name = home.get("name")

            games.append(
                {
                    "game_pk": game.get("gamePk"),
                    "game_date": game_date,
                    "home_away": home_away,
                    "opponent_team_id": opponent_team_id,
                    "opponent_team_name": opponent_team_name,
                }
            )

    return games


def get_game_boxscore(game_pk: int) -> Dict[str, Any]:
    return mlb_get(f"/game/{game_pk}/boxscore")


def extract_batting_logs_from_boxscore(game: Dict[str, Any]) -> List[Dict[str, Any]]:
    game_pk = game["game_pk"]
    box = get_game_boxscore(game_pk)

    teams = box.get("teams", {})
    side_key = "home" if game["home_away"] == "home" else "away"
    team_box = teams.get(side_key, {})

    batting_order = team_box.get("battingOrder", [])
    batting_order_lookup = {
        int(player_id): idx + 1
        for idx, player_id in enumerate(batting_order)
        if str(player_id).isdigit()
    }

    players = team_box.get("players", {})
    rows = []

    for player_key, player_data in players.items():
        person = player_data.get("person", {})
        stats = player_data.get("stats", {})
        batting = stats.get("batting", {})

        player_id = person.get("id")

        if not player_id:
            continue

        plate_appearances = safe_int(batting.get("plateAppearances"))
        at_bats = safe_int(batting.get("atBats"))

        if plate_appearances == 0 and at_bats == 0:
            continue

        rows.append(
            {
                "player_id": player_id,
                "game_pk": game_pk,
                "game_date": game["game_date"],
                "team_id": TEAM_ID,
                "opponent_team_id": game["opponent_team_id"],
                "opponent_team_name": game["opponent_team_name"],
                "home_away": game["home_away"],
                "batting_order": batting_order_lookup.get(player_id),
                "at_bats": at_bats,
                "runs": safe_int(batting.get("runs")),
                "hits": safe_int(batting.get("hits")),
                "doubles": safe_int(batting.get("doubles")),
                "triples": safe_int(batting.get("triples")),
                "home_runs": safe_int(batting.get("homeRuns")),
                "rbi": safe_int(batting.get("rbi")),
                "walks": safe_int(batting.get("baseOnBalls")),
                "strikeouts": safe_int(batting.get("strikeOuts")),
                "stolen_bases": safe_int(batting.get("stolenBases")),
                "caught_stealing": safe_int(batting.get("caughtStealing")),
                "plate_appearances": plate_appearances,
            }
        )

    return rows


def main():
    print(f"Starting Reds batting load for season {SEASON}")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")

    players = get_roster_players()
    print(f"Roster players found: {len(players)}")
    upsert("mlb_players", players, "player_id")

    schedule = get_team_schedule()
    print(f"Completed Reds games found: {len(schedule)}")

    all_logs = []

    for game in schedule:
        try:
            logs = extract_batting_logs_from_boxscore(game)
            all_logs.extend(logs)
            print(f"Game {game['game_pk']} loaded with {len(logs)} batting rows")
            time.sleep(0.1)
        except Exception as exc:
            print(f"Failed loading game {game.get('game_pk')}: {exc}")

    print(f"Total batting game log rows: {len(all_logs)}")

    ensure_players_exist(all_logs)

    print("About to upsert batting game logs")
    upsert("mlb_player_batting_game_logs", all_logs, "player_id,game_pk")

    print("Reds batting load completed")


if __name__ == "__main__":
    main()
