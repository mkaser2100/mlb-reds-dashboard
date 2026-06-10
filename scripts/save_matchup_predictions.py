import os
from datetime import datetime, timezone

from supabase import create_client


SCRIPT_VERSION = "v1_save_matchup_predictions"

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_ROLE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

TEAM_ID = int(os.getenv("MLB_TEAM_ID", "113"))
MODEL_WINDOWS = [
    int(x.strip())
    for x in os.getenv("MATCHUP_WINDOWS", "3,5,6,10,15").split(",")
    if x.strip()
]

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


def get_matchup_rows(selected_window):
    response = supabase.rpc(
        "get_today_reds_batter_matchups",
        {
            "p_team_id": TEAM_ID,
            "p_last_n": selected_window,
        },
    ).execute()

    return response.data or []


def build_prediction_row(row, selected_window):
    conf_score = confidence_score(row)
    conf_label = confidence_label(conf_score)

    return {
        "prediction_created_at": now_utc(),
        "selected_window": selected_window,

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
    print(f"Model windows: {MODEL_WINDOWS}")

    total_upserted = 0

    for selected_window in MODEL_WINDOWS:
        print("")
        print(f"--- Processing selected_window={selected_window} ---")

        rows = get_matchup_rows(selected_window)
        print(f"Matchup rows returned: {len(rows)}")

        if not rows:
            print(f"No matchup rows found for window {selected_window}. Continuing.")
            continue

        prediction_rows = []

        for row in rows:
            if not row.get("game_pk") or not row.get("player_id"):
                print(f"Skipping row with missing game_pk/player_id: {row.get('full_name')}")
                continue

            prediction_rows.append(build_prediction_row(row, selected_window))

        if not prediction_rows:
            print(f"No valid prediction rows to upsert for window {selected_window}.")
            continue

        print(f"Upserting {len(prediction_rows)} rows into mlb_matchup_predictions for window {selected_window}")

        response = (
            supabase.table("mlb_matchup_predictions")
            .upsert(
                prediction_rows,
                on_conflict="game_pk,player_id,selected_window",
            )
            .execute()
        )

        returned = len(response.data or [])
        total_upserted += returned
        print(f"Window {selected_window} upsert complete. Returned rows: {returned}")

    print("")
    print(f"Prediction snapshot loader completed. Total returned rows: {total_upserted}")


if __name__ == "__main__":
    main()
