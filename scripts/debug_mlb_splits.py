import json
import requests

PLAYER_ID = 668715  # Spencer Steer
SEASON = 2026

BASE_URL = "https://statsapi.mlb.com/api/v1"

tests = [
    {
        "name": "homeAndAway",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "homeAndAway",
        },
    },
    {
        "name": "dayNight",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "dayNight",
        },
    },
    {
        "name": "pitcherHand",
        "params": {
            "stats": "statSplits",
            "group": "hitting",
            "season": SEASON,
            "sitCodes": "pitcherHand",
        },
    },
]

for test in tests:
    print("=" * 90)
    print(f"TEST: {test['name']}")

    url = f"{BASE_URL}/people/{PLAYER_ID}/stats"

    response = requests.get(url, params=test["params"], timeout=30)

    print(f"URL: {response.url}")
    print(f"STATUS: {response.status_code}")

    if not response.ok:
        print("ERROR BODY:")
        print(response.text[:2000])
        continue

    data = response.json()

    print("TOP LEVEL KEYS:")
    print(list(data.keys()))

    stats = data.get("stats", [])
    print(f"STATS BLOCK COUNT: {len(stats)}")

    if not stats:
        print("NO STATS RETURNED")
        continue

    for i, stat_block in enumerate(stats):
        print("-" * 60)
        print(f"STAT BLOCK {i}")
        print("STAT BLOCK KEYS:")
        print(list(stat_block.keys()))

        splits = stat_block.get("splits", [])
        print(f"SPLIT COUNT: {len(splits)}")

        if not splits:
            print("NO SPLITS IN THIS BLOCK")
            continue

        print("FIRST SPLIT RAW:")
        print(json.dumps(splits[0], indent=2)[:3000])

        print("ALL SPLIT LABELS:")
        for split in splits:
            split_obj = split.get("split", {})
            print({
                "split": split_obj,
                "splitDescription": split.get("splitDescription"),
                "stat_keys": list((split.get("stat") or {}).keys())[:20],
                "avg": (split.get("stat") or {}).get("avg"),
                "atBats": (split.get("stat") or {}).get("atBats"),
                "hits": (split.get("stat") or {}).get("hits"),
            })
