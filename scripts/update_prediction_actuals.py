import os
from datetime import datetime, timezone

from supabase import create_client


SCRIPT_VERSION = "v1_update_prediction_actuals"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def get_unscored_games():
    response = (
        supabase.table("mlb_matchup_predictions")
        .select("game_pk, game_date")
        .eq("actual_loaded", False)
        .order("game_date")
        .execute()
    )

    rows = response.data or []

    games = {}
    for row in rows:
        games[row["game_pk"]] = row.get("game_date")

    return games


def get_game_batting_logs(game_pk):
    response = (
    supabase.table("mlb_player_batting_game_logs")
    .select(
        "game_pk, game_date, player_id, at_bats, hits, "
        "home_runs, rbi, walks, strikeouts"
    )
    .eq("game_pk", game_pk)
    .execute()
)

    rows = response.data or []

    return {
        row["player_id"]: row
        for row in rows
    }


def update_prediction(player_id, game_pk, log_row):
    payload = {
        "actual_loaded": True,
        "actual_game_date": log_row.get("game_date"),
        "actual_at_bats": log_row.get("at_bats") or 0,
        "actual_hits": log_row.get("hits") or 0,
        "actual_got_hit": (log_row.get("hits") or 0) > 0,
        "actual_home_runs": log_row.get("home_runs") or 0,
        "actual_rbi": log_row.get("rbi") or 0,
        "actual_walks": log_row.get("walks") or 0,
        "actual_strikeouts": log_row.get("strikeouts") or 0,
        "actual_updated_at": now_utc(),
    }

    response = (
        supabase.table("mlb_matchup_predictions")
        .update(payload)
        .eq("game_pk", game_pk)
        .eq("player_id", player_id)
        .eq("actual_loaded", False)
        .execute()
    )

    return len(response.data or [])


def mark_no_game_log(player_id, game_pk):
    payload = {
        "actual_loaded": True,
        "actual_at_bats": 0,
        "actual_hits": 0,
        "actual_got_hit": False,
        "actual_home_runs": 0,
        "actual_rbi": 0,
        "actual_walks": 0,
        "actual_strikeouts": 0,
        "actual_updated_at": now_utc(),
    }

    response = (
        supabase.table("mlb_matchup_predictions")
        .update(payload)
        .eq("game_pk", game_pk)
        .eq("player_id", player_id)
        .eq("actual_loaded", False)
        .execute()
    )

    return len(response.data or [])


def get_predictions_for_game(game_pk):
    response = (
        supabase.table("mlb_matchup_predictions")
        .select("player_id, full_name")
        .eq("game_pk", game_pk)
        .eq("actual_loaded", False)
        .execute()
    )

    return response.data or []


def main():
    print("Starting prediction actuals updater")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")

    games = get_unscored_games()
    print(f"Unscored games found: {len(games)}")

    if not games:
        print("No unscored predictions found. Exiting successfully.")
        return

    total_updated = 0
    total_missing = 0

    for game_pk, game_date in games.items():
        print("=" * 80)
        print(f"Processing game_pk={game_pk}, game_date={game_date}")

        game_logs = get_game_batting_logs(game_pk)
        print(f"Game batting log rows found: {len(game_logs)}")

        if not game_logs:
            print("No batting logs found for this game yet. Skipping for now.")
            continue

        predictions = get_predictions_for_game(game_pk)
        print(f"Unscored predictions for game: {len(predictions)}")

        for prediction in predictions:
            player_id = prediction["player_id"]
            full_name = prediction.get("full_name")

            log_row = game_logs.get(player_id)

            if log_row:
                count = update_prediction(player_id, game_pk, log_row)
                total_updated += count
                print(
                    f"Updated {full_name}: "
                    f"{log_row.get('hits', 0)} H / "
                    f"{log_row.get('at_bats', 0)} AB"
                )
            else:
                count = mark_no_game_log(player_id, game_pk)
                total_missing += count
                print(f"No game log for {full_name}; marked as 0 AB / 0 H")

    print("=" * 80)
    print(f"Actuals update complete.")
    print(f"Updated with game logs: {total_updated}")
    print(f"Marked missing/no AB: {total_missing}")


if __name__ == "__main__":
    main()
