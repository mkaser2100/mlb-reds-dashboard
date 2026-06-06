import json
import requests

BATTER_ID = 668715   # Spencer Steer
PITCHER_ID = 669461  # Matthew Liberatore
SEASON = 2026

BASE = "https://statsapi.mlb.com/api/v1"


def test_url(label, url, params):
    print("=" * 100)
    print(f"TEST: {label}")
    response = requests.get(url, params=params, timeout=45)
    print(f"URL: {response.url}")
    print(f"STATUS: {response.status_code}")

    try:
        data = response.json()
    except Exception:
        print(response.text[:1500])
        return

    print("TOP LEVEL KEYS:")
    print(list(data.keys()))

    stats = data.get("stats", [])
    print(f"STATS BLOCK COUNT: {len(stats)}")

    for i, block in enumerate(stats):
        print("-" * 60)
        print(f"STAT BLOCK {i}")
        print("TYPE:", block.get("type"))
        print("GROUP:", block.get("group"))

        splits = block.get("splits", [])
        print(f"SPLIT COUNT: {len(splits)}")

        if splits:
            print("FIRST SPLIT RAW:")
            print(json.dumps(splits[0], indent=2)[:2500])

            for split in splits[:5]:
                stat = split.get("stat", {})
                print({
                    "season": split.get("season"),
                    "split": split.get("split"),
                    "avg": stat.get("avg"),
                    "atBats": stat.get("atBats"),
                    "hits": stat.get("hits"),
                    "homeRuns": stat.get("homeRuns"),
                    "ops": stat.get("ops"),
                    "strikeOuts": stat.get("strikeOuts"),
                    "baseOnBalls": stat.get("baseOnBalls"),
                })


def main():
    tests = [
        (
            "season hitting with opposingPlayerId",
            f"{BASE}/people/{BATTER_ID}/stats",
            {
                "stats": "season",
                "group": "hitting",
                "season": SEASON,
                "opposingPlayerId": PITCHER_ID,
            },
        ),
        (
            "statSplits hitting with opposingPlayerId",
            f"{BASE}/people/{BATTER_ID}/stats",
            {
                "stats": "statSplits",
                "group": "hitting",
                "season": SEASON,
                "opposingPlayerId": PITCHER_ID,
            },
        ),
        (
            "vsPlayer hitting with opposingPlayerId",
            f"{BASE}/people/{BATTER_ID}/stats",
            {
                "stats": "vsPlayer",
                "group": "hitting",
                "season": SEASON,
                "opposingPlayerId": PITCHER_ID,
            },
        ),
        (
            "vsPlayer career hitting with opposingPlayerId",
            f"{BASE}/people/{BATTER_ID}/stats",
            {
                "stats": "vsPlayer",
                "group": "hitting",
                "opposingPlayerId": PITCHER_ID,
            },
        ),
        (
            "statSplits with sitCode vp",
            f"{BASE}/people/{BATTER_ID}/stats",
            {
                "stats": "statSplits",
                "group": "hitting",
                "season": SEASON,
                "sitCodes": "vp",
                "opposingPlayerId": PITCHER_ID,
            },
        ),
    ]

    for label, url, params in tests:
        test_url(label, url, params)


if __name__ == "__main__":
    main()
