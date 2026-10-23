#!/usr/bin/env python3
"""Query the challenge corpus.

Examples
--------
    # hardest database problems
    python3 tools/query.py --category databases --sort difficulty --desc

    # the Blind 75, in roadmap order
    python3 tools/query.py --list blind-75

    # dynamic programming at difficulty 5-7, newest first
    python3 tools/query.py --topic dynamic-programming --difficulty 5-7

    # count by category
    python3 tools/query.py --group-by category

    # free-text search + json output
    python3 tools/query.py --search "binary tree" --json --limit 5
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"


def load_jsonl(name: str) -> list[dict]:
    path = DATA / name
    with path.open(encoding="utf-8") as fh:
        return [json.loads(line) for line in fh if line.strip()]


def parse_range(value: str) -> tuple[float, float]:
    if "-" in value:
        low, high = value.split("-", 1)
        return float(low), float(high)
    return float(value), float(value)


def band(normalized: float) -> str:
    if normalized <= 2:
        return "beginner"
    if normalized <= 4:
        return "easy"
    if normalized <= 6:
        return "intermediate"
    if normalized <= 8:
        return "advanced"
    return "expert"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default="", help="comma separated source ids")
    ap.add_argument("--category", default="", help="comma separated categories")
    ap.add_argument("--topic", action="append", default=[],
                    help="topic (repeatable; all must match)")
    ap.add_argument("--difficulty", default="", help="1-10 or a range, e.g. 4-7")
    ap.add_argument("--topics-source", default="",
                    help="source|section|curated|none")
    ap.add_argument("--status", default="", help="verified|partial")
    ap.add_argument("--premium", choices=["include", "exclude", "only"],
                    default="include")
    ap.add_argument("--list", default="", help="comma separated list ids")
    ap.add_argument("--search", default="", help="case-insensitive title search")
    ap.add_argument("--sort", choices=["source", "id", "title", "difficulty",
                                       "popularity"], default="source")
    ap.add_argument("--desc", action="store_true", help="descending sort")
    ap.add_argument("--limit", type=int, default=25)
    ap.add_argument("--all", action="store_true", help="no limit")
    ap.add_argument("--json", action="store_true", help="JSON Lines output")
    ap.add_argument("--csv", action="store_true", help="CSV output")
    ap.add_argument("--group-by", default="",
                    choices=["", "source", "category", "topic", "difficulty",
                             "topics_source", "status"])
    ap.add_argument("--stats", action="store_true", help="print corpus summary")
    args = ap.parse_args()

    records = load_jsonl("challenges.jsonl")
    lists = {item["id"]: item for item in load_jsonl("lists.jsonl")}

    if args.stats:
        print(f"total: {len(records)}")
        for key in ("source", "category", "difficulty", "topics_source", "status"):
            counts = Counter(
                band(r["difficulty"]["normalized"]) if key == "difficulty" else r[key]
                for r in records)
            print(f"\n{key}:")
            for name, count in counts.most_common():
                print(f"  {name:22} {count:5}")
        return

    selected: list[dict] | None = None
    if args.list:
        wanted = {x.strip() for x in args.list.split(",") if x.strip()}
        unknown = wanted - set(lists)
        if unknown:
            raise SystemExit(f"unknown list(s): {', '.join(sorted(unknown))}")
        selected = []
        for list_id in wanted:
            selected.extend(lists[list_id]["challenge_ids"])

    if args.source:
        sources = {x.strip() for x in args.source.split(",")}
        records = [r for r in records if r["source"] in sources]
    if args.category:
        categories = {x.strip() for x in args.category.split(",")}
        records = [r for r in records if r["category"] in categories]
    if args.topic:
        wanted = [t.strip() for value in args.topic for t in value.split(",") if t.strip()]
        records = [r for r in records if all(t in r["topics"] for t in wanted)]
    if args.difficulty:
        low, high = parse_range(args.difficulty)
        records = [r for r in records
                   if low <= r["difficulty"]["normalized"] <= high]
    if args.topics_source:
        records = [r for r in records if r["topics_source"] == args.topics_source]
    if args.status:
        records = [r for r in records if r["status"] == args.status]
    if args.premium == "exclude":
        records = [r for r in records if not r["premium"]]
    elif args.premium == "only":
        records = [r for r in records if r["premium"]]
    if args.search:
        needle = args.search.lower()
        records = [r for r in records if needle in r["title"].lower()]
    if selected is not None:
        order = {cid: i for i, cid in enumerate(selected)}
        records = [r for r in records if r["id"] in order]
        records.sort(key=lambda r: order[r["id"]])

    if args.group_by:
        if args.group_by == "topic":
            counts = Counter(t for r in records for t in r["topics"])
        elif args.group_by == "difficulty":
            counts = Counter(band(r["difficulty"]["normalized"]) for r in records)
        else:
            counts = Counter(r[args.group_by] for r in records)
        for name, count in counts.most_common():
            print(f"{name:24} {count:5}")
        print(f"{'TOTAL':24} {len(records):5}")
        return

    if args.sort == "difficulty":
        key = lambda r: r["difficulty"]["normalized"]
    elif args.sort == "title":
        key = lambda r: r["title"].lower()
    elif args.sort == "popularity":
        key = lambda r: (r.get("popularity") or {}).get("solved", 0)
    elif args.sort == "id":
        key = lambda r: r["id"]
    else:
        key = lambda r: (r["source"], r["number"] or 0, r["id"])
    if selected is None:
        records.sort(key=key, reverse=args.desc)

    total = len(records)
    if not args.all:
        records = records[:args.limit]

    if args.json:
        for r in records:
            print(json.dumps(r, ensure_ascii=False))
        return
    if args.csv:
        writer = csv.writer(sys.stdout)
        writer.writerow(["id", "title", "source", "category", "difficulty",
                         "topics", "url"])
        for r in records:
            writer.writerow([r["id"], r["title"], r["source"], r["category"],
                             r["difficulty"]["normalized"],
                             ";".join(r["topics"]), r["url"]])
        return

    print(f"{'ID':28} {'DIFF':>4}  {'SOURCE':14} TITLE")
    print("-" * 110)
    for r in records:
        title = r["title"] if len(r["title"]) <= 52 else r["title"][:49] + "..."
        print(f"{r['id']:28} {r['difficulty']['normalized']:>4.1f}  "
              f"{r['source']:14} {title}")
    print(f"\n{len(records)} shown of {total} matching challenge(s)")


if __name__ == "__main__":
    main()
