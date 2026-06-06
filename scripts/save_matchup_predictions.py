import os
from datetime import datetime, timezone

from supabase import create_client


SCRIPT_VERSION = "v1_save_matchup_predictions"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))
SELECTED_WINDOW = int(os.getenv("MATCHUP_WINDOW", "10"))

supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def confidence_score(row):
    batter = float(row.get("batter_split_reliability") or 0)
    pitcher = float(row.get("pitcher_split_reliability") or 0)
    return round((batter * 0.60) + (pitcher * 0.40), 3)


def confidence_label(score):
    if score >= 0.50:
        return "High"
    if score >= 0.25:
        return "Medium"
    return "Low"


def get_matchup_rows():
    response = supabase.rpc(
        "get_today_reds_batter_matchups",
        {
            "p_team_id": TEAM_ID,
            "p_last_n": SELECTED_WINDOW,
        },
    ).execute()

    return response.data or []


def build_prediction_row(row):
    conf_score = confidence_score(row)
    conf_label = confidence_label(conf_score)

    return {
        "prediction_created_at": now_utc(),
        "selected_window": SELECTED_WINDOW,

        "game_pk": row.get("game_pk"),
        "game_date": row.get("game_date"),
        "opponent_team_name": row.get("opponent_team_name"),

        "pitcher_id": row.get("pitcher_id"),
        "pitcher_name": row.get("pitcher_name"),
        "pitcher_throws": row.get("pitcher_throws"),

        "player_id": row.get("player_id"),
        "full_name": row.get("full_name"),

        "matchup_score": row.get("matchup_score"),
        "recent_form_score": row.get("recent_form_score"),
        "batter_split_score": row.get("batter_split_score"),
        "pitcher_vulnerability_score": row.get("pitcher_vulnerability_score"),
        "pitcher_recent_form_score": row.get("pitcher_recent_form_score"),

        "batter_recent_avg": row.get("batter_recent_avg"),
        "batter_recent_hits": row.get("batter_recent_hits"),
        "batter_recent_at_bats": row.get("batter_recent_at_bats"),
        "batter_recent_hit_rate": row.get("batter_recent_hit_rate"),

        "batter_split_label": row.get("batter_split_label"),
        "batter_split_avg": row.get("batter_split_avg"),
        "batter_split_ab": row.get("batter_split_ab"),
        "batter_split_reliability": row.get("batter_split_reliability"),

        "pitcher_split_label": row.get("pitcher_split_label"),
        "pitcher_baa_split": row.get("pitcher_baa_split"),
        "pitcher_split_reliability": row.get("pitcher_split_reliability"),

        "confidence_score": conf_score,
        "confidence_label": conf_label,

        "actual_loaded": False,
    }


def main():
    print("Starting matchup prediction snapshot loader")
    print(f"Script version: {SCRIPT_VERSION}")
    print(f"Team ID: {TEAM_ID}")
    print(f"Selected window: {SELECTED_WINDOW}")

    rows = get_matchup_rows()
    print(f"Matchup rows returned: {len(rows)}")

    if not rows:
        print("No matchup rows found. Exiting successfully.")
        return

    prediction_rows = []

    for row in rows:
        if not row.get("game_pk") or not row.get("player_id"):
            print(f"Skipping row with missing game_pk/player_id: {row.get('full_name')}")
            continue

        prediction_rows.append(build_prediction_row(row))

    if not prediction_rows:
        print("No valid prediction rows to upsert.")
        return

    print(f"Upserting {len(prediction_rows)} rows into mlb_matchup_predictions")

    response = (
        supabase.table("mlb_matchup_predictions")
        .upsert(
            prediction_rows,
            on_conflict="game_pk,player_id,selected_window",
        )
        .execute()
    )

    print(f"Upsert complete. Returned rows: {len(response.data or [])}")
    print("Matchup prediction snapshot loader completed")


if __name__ == "__main__":
    main()
