#!/usr/bin/env python3
"""Validate the self-contained benchmark items."""

from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BENCH = ROOT / "benchmark"
ITEMS = BENCH / "items"


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    index = json.loads((BENCH / "index.json").read_text())
    rows = [json.loads(line) for line in
            (BENCH / "items.jsonl").read_text().splitlines() if line.strip()]
    ids = [row["id"] for row in rows]
    if len(set(ids)) != len(ids):
        fail("duplicate benchmark ids")
    if index["total"] != len(rows):
        fail("benchmark/index.json total mismatch")
    if sum(index["sources"].values()) != len(rows):
        fail("benchmark source counts mismatch")

    dirs = {path.name for path in ITEMS.iterdir() if path.is_dir()}
    if dirs != set(ids):
        fail(f"item directories differ from items.jsonl: {sorted(dirs ^ set(ids))[:5]}")

    formats = Counter()
    public_total = hidden_total = 0
    for row in rows:
        item = ITEMS / row["id"]
        meta_path = item / "meta.json"
        if not meta_path.exists():
            fail(f"{row['id']}: missing meta.json")
        meta = json.loads(meta_path.read_text())
        if meta["id"] != row["id"]:
            fail(f"{row['id']}: meta id mismatch")
        if meta["source"] != row["source"]:
            fail(f"{row['id']}: source mismatch")
        if meta["harness"] not in {"single-answer", "stdio", "function"}:
            fail(f"{row['id']}: unsupported harness {meta['harness']}")
        formats[meta["harness"]] += 1
        statement = item / meta["statement"]
        if not statement.exists() or len(statement.read_text(errors="ignore").strip()) < 50:
            fail(f"{row['id']}: statement missing or too short")
        if not meta.get("reference_solutions"):
            fail(f"{row['id']}: missing reference solution metadata")
        for reference in meta["reference_solutions"]:
            if not reference.get("url", "").startswith("https://"):
                fail(f"{row['id']}: bad reference url")
        if not meta.get("url", "").startswith("https://"):
            fail(f"{row['id']}: bad source url")

        tests = meta["tests"]
        if meta["harness"] == "single-answer":
            answer = item / tests["public_path"]
            if not answer.exists() or not answer.read_text().strip():
                fail(f"{row['id']}: missing public answer")
            public_total += 1
        else:
            public = json.loads((item / tests["public_path"]).read_text())
            hidden_path = item / tests["hidden_path"]
            hidden = json.loads(hidden_path.read_text()) if hidden_path.exists() else []
            if len(public) != tests["public"] or len(hidden) != tests["hidden"]:
                fail(f"{row['id']}: case count mismatch")
            for case in public + hidden:
                for key in ("name", "input", "output"):
                    if not str(case.get(key, "")).strip():
                        fail(f"{row['id']}: empty {key} in test case")
            public_total += len(public)
            hidden_total += len(hidden)

    print(f"OK: {len(rows)} benchmark items")
    print(f"    formats: {dict(formats)}")
    print(f"    public cases: {public_total}  hidden cases: {hidden_total}")
    print(f"    sources: {index['sources']}")


if __name__ == "__main__":
    main()
