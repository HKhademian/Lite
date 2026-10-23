#!/usr/bin/env python3
"""Validate the generated corpus without third-party dependencies.

Checks field presence/types, id uniqueness, URL shape, topic vocabulary and
list referential integrity.  Run after hand-editing any data/*.jsonl file.

    python3 tools/validate.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

SOURCES = {"advent-of-code", "project-euler", "leetcode", "codeforces", "cses",
           "atcoder", "rosalind", "cryptopals", "jane-street"}
CATEGORIES = {"algorithms", "data-structures", "mathematics", "databases",
              "shell", "concurrency", "javascript", "data-analysis", "security",
              "bioinformatics", "puzzles", "frontend", "system-design"}
TOPICS_SOURCE = {"source", "section", "curated", "none"}
STATUS = {"verified", "partial"}
ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
TOPIC_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    records = [json.loads(line) for line in
               (DATA / "challenges.jsonl").read_text().splitlines() if line.strip()]
    lists = [json.loads(line) for line in
             (DATA / "lists.jsonl").read_text().splitlines() if line.strip()]
    index = json.loads((DATA / "index.json").read_text())
    taxonomy = json.loads((ROOT / "schema/taxonomy.json").read_text())

    known_topics = {t["id"] for t in taxonomy["topics"]}
    ids = [r["id"] for r in records]
    duplicates = [i for i, n in Counter(ids).items() if n > 1]
    if duplicates:
        fail(f"duplicate ids: {duplicates[:10]}")
    known_ids = set(ids)

    for r in records:
        where = r.get("id", "<missing id>")
        for key in ("id", "title", "source", "url", "native_id", "category",
                    "topics", "raw_topics", "tags", "difficulty", "formats", "languages",
                    "topics_source", "premium", "status"):
            if key not in r:
                fail(f"{where}: missing field {key}")
        if not ID_RE.match(r["id"]):
            fail(f"{where}: bad id")
        if not r["title"].strip():
            fail(f"{where}: empty title")
        if r["source"] not in SOURCES:
            fail(f"{where}: unknown source {r['source']}")
        if not r["url"].startswith("https://"):
            fail(f"{where}: bad url {r['url']}")
        if r["category"] not in CATEGORIES:
            fail(f"{where}: unknown category {r['category']}")
        if r["topics_source"] not in TOPICS_SOURCE:
            fail(f"{where}: bad topics_source")
        if r["status"] not in STATUS:
            fail(f"{where}: bad status")
        if not isinstance(r["premium"], bool):
            fail(f"{where}: premium is not boolean")
        if not isinstance(r["number"], (int, type(None))) or isinstance(r["number"], bool):
            fail(f"{where}: number must be int or null")
        if not isinstance(r.get("set"), (str, type(None))):
            fail(f"{where}: set must be string or null")
        if not isinstance(r["raw_topics"], list) or not all(isinstance(t, str) for t in r["raw_topics"]):
            fail(f"{where}: raw_topics must be a string array")
        if not isinstance(r["tags"], list) or not all(isinstance(t, str) for t in r["tags"]):
            fail(f"{where}: tags must be a string array")
        if not isinstance(r["topics"], list):
            fail(f"{where}: topics must be an array")
        for topic in r["topics"]:
            if not isinstance(topic, str) or not TOPIC_RE.match(topic):
                fail(f"{where}: bad topic {topic!r}")
            if topic not in known_topics:
                fail(f"{where}: topic {topic!r} not in schema/taxonomy.json")
        difficulty = r["difficulty"]
        if not isinstance(difficulty, dict):
            fail(f"{where}: difficulty must be an object")
        if difficulty.get("scale") is None or "raw" not in difficulty:
            fail(f"{where}: difficulty needs scale and raw")
        value = difficulty.get("normalized")
        if not isinstance(value, (int, float)) or isinstance(value, bool) \
                or not 1 <= value <= 10:
            fail(f"{where}: normalized difficulty out of range")
        if r["topics"] and r["primary_topic"] != r["topics"][0]:
            fail(f"{where}: primary_topic must be topics[0]")
        if not r["topics"] and r["primary_topic"] is not None:
            fail(f"{where}: primary_topic must be null when topics is empty")

    for lst in lists:
        where = lst.get("id", "<missing>")
        if lst["count"] != len(lst["challenge_ids"]):
            fail(f"list {where}: count does not match challenge_ids")
        for cid in lst["challenge_ids"]:
            if cid not in known_ids:
                fail(f"list {where}: unknown challenge {cid}")
        for group in lst.get("groups", []):
            for cid in group["challenge_ids"]:
                if cid not in known_ids:
                    fail(f"list {where}: group references unknown challenge {cid}")

    if index["total"] != len(records):
        fail("index.total does not match challenges.jsonl")
    if sum(index["sources"][i]["count"] for i in range(len(index["sources"]))) != len(records):
        fail("index source counts do not sum to total")

    topic_counts = Counter(t for r in records for t in r["topics"])
    missing_topic = [t for t in topic_counts if t not in known_topics]
    if missing_topic:
        fail(f"topics missing from taxonomy: {missing_topic[:5]}")

    print(f"OK: {len(records)} challenges, {len(lists)} lists, "
          f"{len(known_topics)} topics, {len(topic_counts)} used")


if __name__ == "__main__":
    main()
