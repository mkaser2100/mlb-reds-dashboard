#!/usr/bin/env python3
# Apply the MLB Hit Lab prediction-eligibility contract changes.
# Run from the repository root:
#   python apply_prediction_eligibility_fix.py

from __future__ import annotations

import ast
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path.cwd()
LOADER = REPO_ROOT / "scripts" / "load_all_mlb_phase1.py"
PHASE1_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "load-all-mlb-phase-1.yml"
V3_WORKFLOW = REPO_ROOT / ".github" / "workflows" / "run-v3-hit-model.yml"


def require_file(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Required repo file not found: {path}")
    return path.read_text(encoding="utf-8")


def backup(path: Path) -> None:
    backup_path = path.with_suffix(path.suffix + ".bak")
    if not backup_path.exists():
        shutil.copy2(path, backup_path)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly one matching block, found {count}. "
            "The repo file may have changed since this fix was prepared."
        )
    return text.replace(old, new, 1)


def patch_loader(text: str) -> str:
    if '"game_type": game.get("gameType"),' not in text:
        old = """                    "season": season,
                    "game_status": (game.get("status") or {}).get("detailedState"),"""
        new = """                    "season": season,
                    "game_type": game.get("gameType"),
                    "game_status": (game.get("status") or {}).get("detailedState"),"""
        text = replace_once(text, old, new, "Persist MLB game_type")

    if '"is_prediction_eligible": row.get("is_prediction_eligible"),' not in text:
        old = """            "season": row.get("season"),
            "reds_team_id": row.get("batting_team_id"),"""
        new = """            "season": row.get("season"),
            "game_type": row.get("game_type"),
            "is_prediction_eligible": row.get("is_prediction_eligible"),
            "ineligibility_reason": row.get("ineligibility_reason"),
            "reds_team_id": row.get("batting_team_id"),"""
        text = replace_once(text, old, new, "Sync eligibility into Reds matchup table")

    return text


def patch_phase1_workflow(text: str) -> str:
    for line in (
        "          import json\n",
        "          from urllib.error import HTTPError, URLError\n",
        "          from urllib.parse import urlencode\n",
        "          from urllib.request import Request, urlopen\n",
    ):
        text = text.replace(line, "")

    start_marker = '          result = supabase.rpc("snapshot_mlb_hit_board_predictions_v2").execute()\n'
    end_marker = '          else:\n              print("V2 snapshot and V3 wide feature validation passed.")\n'

    if 'snapshot_mlb_hit_board_predictions_v2_status' not in text:
        start = text.find(start_marker)
        end = text.find(end_marker, start)
        if start < 0 or end < 0:
            raise RuntimeError(
                "Could not locate the existing V2 snapshot validation block in "
                "load-all-mlb-phase-1.yml."
            )
        end += len(end_marker)

        replacement = """          status_result = supabase.rpc(
              "snapshot_mlb_hit_board_predictions_v2_status",
              {"p_target_date": target_date},
          ).execute()

          payload = status_result.data or {}
          if isinstance(payload, list):
              payload = payload[0] if payload else {}

          print("snapshot_mlb_hit_board_predictions_v2_status result:")
          print(payload)

          snapshot_status = payload.get("status")
          if snapshot_status == "no_eligible_games":
              print(
                  f"No prediction-eligible MLB games for {target_date}. "
                  "The V2 snapshot and V3 feature-source validation completed "
                  "successfully with no work."
              )
          elif snapshot_status != "complete":
              raise RuntimeError(
                  f"V2 snapshot did not complete for {target_date}. "
                  f"Structured status: {payload}"
              )
          else:
              feature_rows = int(payload.get("source_feature_rows") or 0)
              saved_rows = int(payload.get("saved_prediction_rows") or 0)
              print(
                  f"V2 snapshot complete for {target_date}: "
                  f"source_feature_rows={feature_rows}, "
                  f"saved_prediction_rows={saved_rows}"
              )
"""
        text = text[:start] + replacement + text[end:]

    return text


def patch_v3_workflow(text: str) -> str:
    if 'SKIP_V3_MODEL=true' not in text:
        marker = """          if not today_rows:
              def latest_feature_dates_query():"""
        replacement = """          if not today_rows:
              def pipeline_status_query():
                  return supabase.rpc(
                      "get_mlb_daily_prediction_pipeline_status",
                      {"p_game_date": target_date},
                  )

              try:
                  pipeline_result = execute_with_retry(pipeline_status_query)
                  pipeline_payload = pipeline_result.data or {}
              except Exception as exc:
                  if is_transient_supabase_error(exc):
                      raise RuntimeError(
                          "Supabase repeatedly timed out while checking prediction "
                          f"eligibility for {target_date}."
                      ) from exc
                  raise

              if isinstance(pipeline_payload, list):
                  pipeline_payload = pipeline_payload[0] if pipeline_payload else {}

              print("Daily prediction pipeline status:")
              print(pipeline_payload)

              if pipeline_payload.get("pipeline_status") == "no_eligible_games":
                  with open(os.environ["GITHUB_ENV"], "a", encoding="utf-8") as env_file:
                      env_file.write("SKIP_V3_MODEL=true\\n")
                  print(
                      f"No prediction-eligible MLB games for {target_date}. "
                      "Skipping V3 training, scoring, validation, and activation."
                  )
                  raise SystemExit(0)

              def latest_feature_dates_query():"""
        text = replace_once(text, marker, replacement, "Add V3 eligibility preflight")

    train_marker = "      - name: Train and score V3 hit model\n"
    train_index = text.find(train_marker)
    if train_index < 0:
        raise RuntimeError("Could not locate the V3 training step.")

    prefix = text[:train_index]
    suffix = text[train_index:]
    lines = suffix.splitlines(keepends=True)
    updated = []
    for index, line in enumerate(lines):
        updated.append(line)
        if line.startswith("      - name:"):
            next_line = lines[index + 1] if index + 1 < len(lines) else ""
            if "if: env.SKIP_V3_MODEL" not in next_line:
                updated.append("        if: env.SKIP_V3_MODEL != 'true'\n")

    return prefix + "".join(updated)


def validate_python(path: Path) -> None:
    ast.parse(path.read_text(encoding="utf-8"), filename=str(path))


def validate_yaml(path: Path) -> None:
    try:
        import yaml  # type: ignore
    except ImportError:
        print(
            f"PyYAML is not installed; skipped parser validation for {path}. "
            "GitHub will validate the workflow when committed."
        )
        return
    with path.open("r", encoding="utf-8") as handle:
        yaml.safe_load(handle)


def main() -> int:
    files = {
        LOADER: patch_loader(require_file(LOADER)),
        PHASE1_WORKFLOW: patch_phase1_workflow(require_file(PHASE1_WORKFLOW)),
        V3_WORKFLOW: patch_v3_workflow(require_file(V3_WORKFLOW)),
    }

    for path in files:
        backup(path)

    for path, content in files.items():
        path.write_text(content, encoding="utf-8")
        print(f"Updated {path.relative_to(REPO_ROOT)}")

    validate_python(LOADER)
    validate_yaml(PHASE1_WORKFLOW)
    validate_yaml(V3_WORKFLOW)

    print("\nValidation passed.")
    print(
        "Review with: git diff -- scripts/load_all_mlb_phase1.py "
        ".github/workflows/load-all-mlb-phase-1.yml "
        ".github/workflows/run-v3-hit-model.yml"
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
