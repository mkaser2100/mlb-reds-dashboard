#!/usr/bin/env python3
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
import traceback
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Mapping, Optional

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_KEY") or ""
MLB_FEED = "https://statsapi.mlb.com/api/v1.1/game/{game_pk}/feed/live"
RETRYABLE = {408, 425, 429, 500, 502, 503, 504}


class LineupError(RuntimeError):
    pass


def log(msg: str) -> None:
    print(msg, flush=True)


def ny_today() -> str:
    from zoneinfo import ZoneInfo
    return dt.datetime.now(ZoneInfo("America/New_York")).date().isoformat()


def parse_ts(value: Any) -> Optional[dt.datetime]:
    if not value:
        return None
    s = str(value)
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    try:
        x = dt.datetime.fromisoformat(s)
    except ValueError:
        return None
    if x.tzinfo is None:
        x = x.replace(tzinfo=dt.timezone.utc)
    return x.astimezone(dt.timezone.utc)


def require_env() -> None:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise LineupError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")


def sb_request(method: str, resource: str, *, params: Mapping[str, str] | None = None,
               body: Any = None, prefer: str | None = None) -> Any:
    q = ""
    if params:
        q = "?" + urllib.parse.urlencode(params, safe="(),.*")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
    }
    if prefer:
        headers["Prefer"] = prefer
    data = None if body is None else json.dumps(body, separators=(",", ":"), default=str).encode("utf-8")
    req = urllib.request.Request(f"{SUPABASE_URL}/rest/v1/{resource}{q}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
            return None if not raw else json.loads(raw.decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise LineupError(f"Supabase {method} {resource} failed: HTTP {exc.code}: {detail}") from exc


def mlb_json(game_pk: int, max_attempts: int = 4) -> dict[str, Any]:
    url = MLB_FEED.format(game_pk=game_pk)
    headers = {"User-Agent": "mlb-hit-lab/1.0"}
    last: Optional[BaseException] = None
    for attempt in range(1, max_attempts + 1):
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            last = exc
            if exc.code not in RETRYABLE or attempt == max_attempts:
                raise LineupError(f"MLB feed HTTP {exc.code} for game {game_pk}") from exc
        except (urllib.error.URLError, ConnectionResetError, TimeoutError, OSError) as exc:
            last = exc
            if attempt == max_attempts:
                raise LineupError(f"MLB feed failed for game {game_pk}: {exc}") from exc
        wait = 2 ** (attempt - 1)
        log(f"Transient MLB feed error for game {game_pk}; retrying in {wait}s")
        time.sleep(wait)
    raise LineupError(f"MLB feed failed for game {game_pk}: {last}")


def player_name(players: Mapping[str, Any], player_id: int) -> str | None:
    p = players.get(f"ID{player_id}") or {}
    person = p.get("person") or {}
    return person.get("fullName")


def player_throws(feed: Mapping[str, Any], player_id: int) -> str | None:
    players = ((feed.get("gameData") or {}).get("players") or {})
    p = players.get(f"ID{player_id}") or {}
    hand = p.get("pitchHand") or {}
    return hand.get("code")


def load_date(game_date: str) -> dict[str, int]:
    contexts = sb_request(
        "GET",
        "mlb_game_starting_pitcher_context_cache",
        params={
            "select": "game_pk,game_date,game_time_utc",
            "game_date": f"eq.{game_date}",
            "order": "game_pk.asc",
        },
    ) or []
    game_map: dict[int, Optional[dt.datetime]] = {}
    for row in contexts:
        if row.get("game_pk") is not None:
            game_map[int(row["game_pk"])] = parse_ts(row.get("game_time_utc"))
    if not game_map:
        raise LineupError(f"No game context rows found for {game_date}")

    now = dt.datetime.now(dt.timezone.utc)
    games_checked = 0
    teams_confirmed = 0
    lineup_rows = 0
    starter_rows = 0
    skipped_started = 0

    for game_pk, context_start in sorted(game_map.items()):
        if context_start and context_start <= now:
            skipped_started += 1
            continue

        feed = mlb_json(game_pk)
        game_data = feed.get("gameData") or {}
        live_data = feed.get("liveData") or {}
        box_teams = ((live_data.get("boxscore") or {}).get("teams") or {})
        teams = game_data.get("teams") or {}
        official_game_time = parse_ts(((game_data.get("datetime") or {}).get("dateTime")))
        venue_name = ((game_data.get("venue") or {}).get("name"))
        games_checked += 1

        for side in ("away", "home"):
            team_box = box_teams.get(side) or {}
            batting = [int(x) for x in (team_box.get("battingOrder") or []) if x is not None][:9]
            if len(batting) != 9 or len(set(batting)) != 9:
                continue

            team = teams.get(side) or {}
            opp_side = "home" if side == "away" else "away"
            opponent = teams.get(opp_side) or {}
            team_id = team.get("id")
            opponent_id = opponent.get("id")
            if team_id is None:
                continue

            players = team_box.get("players") or {}
            fetched_at = now.isoformat()

            sb_request(
                "DELETE",
                "mlb_game_official_lineups",
                params={"game_pk": f"eq.{game_pk}", "team_id": f"eq.{int(team_id)}"},
                prefer="return=minimal",
            )

            rows = []
            for order, pid in enumerate(batting, start=1):
                rows.append({
                    "game_date": game_date,
                    "game_pk": game_pk,
                    "team_id": int(team_id),
                    "opponent_team_id": int(opponent_id) if opponent_id is not None else None,
                    "team_name": team.get("name"),
                    "opponent_team_name": opponent.get("name"),
                    "game_time_utc": (official_game_time or context_start).isoformat() if (official_game_time or context_start) else None,
                    "batting_order": order,
                    "player_id": pid,
                    "player_name": player_name(players, pid),
                    "source_status": "confirmed",
                    "source_updated_at": fetched_at,
                    "fetched_at": fetched_at,
                })
            sb_request(
                "POST",
                "mlb_game_official_lineups",
                params={"on_conflict": "game_pk,team_id,batting_order"},
                body=rows,
                prefer="resolution=merge-duplicates,return=minimal",
            )
            teams_confirmed += 1
            lineup_rows += len(rows)

            pitchers = [int(x) for x in (team_box.get("pitchers") or []) if x is not None]
            if pitchers:
                starter_id = pitchers[0]
                starter = {
                    "game_date": game_date,
                    "game_pk": game_pk,
                    "team_id": int(team_id),
                    "opponent_team_id": int(opponent_id) if opponent_id is not None else None,
                    "team_name": team.get("name"),
                    "opponent_team_name": opponent.get("name"),
                    "game_time_utc": (official_game_time or context_start).isoformat() if (official_game_time or context_start) else None,
                    "venue_name": venue_name,
                    "pitcher_side": side,
                    "pitcher_id": starter_id,
                    "pitcher_name": player_name(players, starter_id),
                    "pitcher_throws": player_throws(feed, starter_id),
                    "source_status": "confirmed_lineup_feed",
                    "source_updated_at": fetched_at,
                    "fetched_at": fetched_at,
                }
                sb_request(
                    "POST",
                    "mlb_game_official_starters",
                    params={"on_conflict": "game_pk,team_id"},
                    body=[starter],
                    prefer="resolution=merge-duplicates,return=minimal",
                )
                starter_rows += 1

    return {
        "games_checked": games_checked,
        "teams_confirmed": teams_confirmed,
        "lineup_rows": lineup_rows,
        "starter_rows": starter_rows,
        "skipped_started": skipped_started,
    }


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Load authoritative pregame MLB starting lineups for Pitcher K Phase 6")
    p.add_argument("--date", default="", help="YYYY-MM-DD; blank=today ET")
    return p.parse_args()


def main() -> int:
    try:
        require_env()
        args = parse_args()
        game_date = args.date or ny_today()
        dt.date.fromisoformat(game_date)
        summary = load_date(game_date)
        log(json.dumps({"game_date": game_date, **summary}, indent=2))
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
