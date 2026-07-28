#!/usr/bin/env python3
"""Apply the approved green-item cleanup to app-v4.js and index.html.

Run from the repository root:
    python apply_green_cleanup.py
"""

from pathlib import Path
import shutil
import sys

APP = Path("app-v4.js")
INDEX = Path("index.html")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(
            f"{label}: expected exactly 1 match, found {count}. No files were changed."
        )
    return text.replace(old, new, 1)


def main() -> int:
    if not APP.exists() or not INDEX.exists():
        raise FileNotFoundError(
            "Run this script from the mlb-reds-dashboard repository root."
        )

    app_original = APP.read_text(encoding="utf-8")
    index_original = INDEX.read_text(encoding="utf-8")

    app = app_original
    index = index_original

    app = replace_once(
        app,
        'const MLB_BOARD_MODE = "ml";\n',
        "",
        "Remove MLB_BOARD_MODE",
    )

    app = replace_once(
        app,
        'function wirePerformanceScopeButtons() {\n'
        '  // Model Performance is MLB-only. Reds are included in the MLB sample.\n'
        '}\n\n\n',
        "",
        "Remove empty wirePerformanceScopeButtons",
    )

    app = replace_once(
        app,
        '  const performanceView = $("performanceView");\n'
        '  const modelCompareView = $("modelCompareView");\n'
        '  const mlbView = $("mlbView");\n',
        '  const performanceView = $("performanceView");\n'
        '  const mlbView = $("mlbView");\n',
        "Remove modelCompareView lookup",
    )

    app = replace_once(
        app,
        '  if (hotView) hotView.classList.toggle("active-view", viewName === "hot");\n'
        '  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");\n'
        '  if (modelCompareView) modelCompareView.classList.toggle("active-view", viewName === "compare");\n'
        '  if (mlbView) mlbView.classList.toggle("active-view", viewName === "mlb");\n',
        '  if (hotView) hotView.classList.toggle("active-view", viewName === "hot");\n'
        '  if (performanceView) performanceView.classList.toggle("active-view", viewName === "performance");\n'
        '  if (mlbView) mlbView.classList.toggle("active-view", viewName === "mlb");\n',
        "Remove compare active-view toggle",
    )

    app = replace_once(
        app,
        '  if (viewName === "compare") {\n'
        '    setText("pageEyebrow", "Production Model · Reduced Pitcher Weight");\n'
        '    setText("pageTitle", "Removed Board");\n'
        '    setText("pageSubtitle", `Reduced-pitcher-weight matchup board for the ${compareWindow}-game window.`);\n'
        '\n'
        '    if (!compareBoardHotRows.length || !compareBoardMatchupRows.length) {\n'
        '      loadModelCompareData();\n'
        '    } else {\n'
        '      renderModelComparePage();\n'
        '    }\n'
        '  }\n'
        '\n',
        "",
        "Remove compare showView branch",
    )

    app = replace_once(
        app,
        '      if (button.dataset.view === "compare") {\n'
        '        await loadModelCompareData();\n'
        '      }\n'
        '\n',
        "",
        "Remove compare navigation loader",
    )

    app = replace_once(
        app,
        '    } else if (activeView === "modelCompareView") {\n'
        '      loadModelCompareData();\n',
        "",
        "Remove compare refresh branch",
    )

    index = replace_once(
        index,
        '      <section id="modelCompareView" class="view">\n'
        '      </section>\n'
        '\n',
        "",
        "Remove empty modelCompareView markup",
    )

    protected = [
        "loadV2Enhancements",
        "mergeV2Enhancements",
        "withV2Enhancement",
        "loadV3DrawerExplanations",
        '"v_mlb_v3_hit_board_cache"',
        '"v_mlb_v3_reds_game_hit_board_cache"',
        '"v_mlb_hit_over05_market_edge_health"',
        'const PERFORMANCE_MODEL_FILTERS = ["All", "V1", "V2", "V3"];',
    ]
    missing = [token for token in protected if token not in app]
    if missing:
        raise RuntimeError(
            "Protected production contracts disappeared: " + ", ".join(missing)
        )

    forbidden = [
        'const MLB_BOARD_MODE = "ml";',
        'const modelCompareView = $("modelCompareView");',
        'viewName === "compare"',
        'activeView === "modelCompareView"',
    ]
    remaining = [token for token in forbidden if token in app]
    if remaining:
        raise RuntimeError(
            "Green cleanup was incomplete; remaining tokens: " + ", ".join(remaining)
        )

    shutil.copy2(APP, APP.with_suffix(APP.suffix + ".bak"))
    shutil.copy2(INDEX, INDEX.with_suffix(INDEX.suffix + ".bak"))

    APP.write_text(app, encoding="utf-8")
    INDEX.write_text(index, encoding="utf-8")

    removed_app_lines = len(app_original.splitlines()) - len(app.splitlines())
    removed_index_lines = len(index_original.splitlines()) - len(index.splitlines())

    print("Green cleanup applied successfully.")
    print(f"app-v4.js: removed {removed_app_lines} lines")
    print(f"index.html: removed {removed_index_lines} lines")
    print("Backups: app-v4.js.bak and index.html.bak")
    print("Next check: node --check app-v4.js")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)
