import json
import requests

PLAYER_ID = 668715  # Spencer Steer
SEASON = 2026
BASE_URL = "https://statsapi.mlb.com/api/v1"

tests = [
    {
        "name": "season_basic",
        "params": {
            "stats": "season",
            "group": "hitting",
            "season": SEASON,
        },
    },
    {
        "name": "career_basic",
        "params": {
            "stats": "career",
            "group": "hitting",
        },
    },
    {
        "name": "season_advanced",
        "params": {
            "stats": "seasonAdvanced",
            "group": "hitting",
            "season": SEASON,
        },
    },
    {
        "name": "statSplits_homeAndAway",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "h,a",
        },
    },
    {
        "name": "statSplits_home",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "h",
        },
    },
    {
        "name": "statSplits_away",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "a",
        },
    },
    {
        "name": "statSplits_day",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "d",
        },
    },
    {
        "name": "statSplits_night",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "n",
        },
    },
    {
        "name": "statSplits_vs_lhp",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "vl",
        },
    },
    {
        "name": "statSplits_vs_rhp",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "vr",
        },
    },
    {
        "name": "statSplits_opposingHand_L",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "opposingPlayerHand": "L",
        },
    },
    {
        "name": "statSplits_opposingHand_R",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "opposingPlayerHand": "R",
        },
    },
    {
        "name": "splits_by_situation",
        "params": {
            "stats": "season",
            "group": "hitting",
            "season": SEASON,
            "hydrate": "stats(group=[hitting],type=[statSplits])",
        },
    },
]

for test in tests:
    print("=" * 100)
    print(f"TEST: {test['name']}")

    url = f"{BASE_URL}/people/{PLAYER_ID}/stats"
    response = requests.get(url, params=test["params"], timeout=30)

    print(f"URL: {response.url}")
    print(f"STATUS: {response.status_code}")

    if not response.ok:
        print("ERROR BODY:")
        print(response.text[:1500])
        continue

    data = response.json()
    stats = data.get("stats", [])

    print(f"STATS BLOCK COUNT: {len(stats)}")

    total_splits = 0

    for i, stat_block in enumerate(stats):
        splits = stat_block.get("splits", [])
        total_splits += len(splits)

        print("-" * 60)
        print(f"STAT BLOCK {i}")
        print("TYPE:", stat_block.get("type"))
        print("GROUP:", stat_block.get("group"))
        print(f"SPLIT COUNT: {len(splits)}")

        if splits:
            print("FIRST SPLIT RAW:")
            print(json.dumps(splits[0], indent=2)[:2500])

            print("LABEL SUMMARY:")
            for split in splits[:10]:
                stat = split.get("stat") or {}
                print({
                    "season": split.get("season"),
                    "team": split.get("team"),
                    "split": split.get("split"),
                    "splitDescription": split.get("splitDescription"),
                    "avg": stat.get("avg"),
                    "atBats": stat.get("atBats"),
                    "hits": stat.get("hits"),
                    "homeRuns": stat.get("homeRuns"),
                    "ops": stat.get("ops"),
                })

    print(f"TOTAL SPLITS FOUND: {total_splits}")
