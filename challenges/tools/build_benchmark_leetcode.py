#!/usr/bin/env python3
"""Build the LeetCode benchmark layer.

Selection is deterministic:
1. every usable problem from Blind 75 and NeetCode 150, in roadmap order;
2. then the most-solved remaining problems with a statement, official
   examples and a public Python solution.

Only links to reference code are stored; doocs/leetcode is CC-BY-SA-4.0.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = ROOT / ".cache" / "benchmark" / "leetcode"
BENCH = ROOT / "benchmark"
ITEMS = BENCH / "items"
TARGET_TOTAL = 500

DOOCS_LICENSE = "CC-BY-SA-4.0"


def doocs_paths() -> dict[int, str]:
    tree = json.loads((CACHE / "tree.json").read_text())
    paths = {}
    for entry in tree.get("tree", []):
        if entry.get("type") != "blob":
            continue
        path = entry["path"]
        match = re.match(r"solution/\d+-\d+/(\d+)\.", path)
        if match and path.endswith("/Solution.py"):
            paths.setdefault(int(match.group(1)), path)
    return paths


def main() -> None:
    challenges = {
        row["id"]: row for row in
        (json.loads(line) for line in
         (DATA / "challenges.jsonl").read_text().splitlines() if line.strip())
    }
    tests = {
        row["challenge_id"]: row for row in
        (json.loads(line) for line in
         (DATA / "tests.jsonl").read_text().splitlines() if line.strip())
    }
    merged = {
        str(q["frontend_id"]): q
        for q in json.loads((ROOT / ".cache/leetcode/merged.json").read_text())["questions"]
    }
    lists = {
        row["id"]: row for row in
        (json.loads(line) for line in
         (DATA / "lists.jsonl").read_text().splitlines() if line.strip())
    }
    paths = doocs_paths()

    def usable(cid: str) -> bool:
        rec = challenges.get(cid)
        if not rec or rec["premium"] or rec["category"] != "algorithms":
            return False
        if "design" in rec["topics"]:
            return False
        native = int(rec["native_id"])
        if str(native) not in merged or native not in paths:
            return False
        record = tests.get(cid)
        return bool(record and record["public"])

    curated_order: list[str] = []
    for list_id in ("blind-75", "neetcode-150"):
        for cid in lists[list_id]["challenge_ids"]:
            if cid not in curated_order:
                curated_order.append(cid)
    selected = [(cid, "curated") for cid in curated_order if usable(cid)]

    already = set(cid for cid, _ in selected)
    fill = [
        rec for rec in challenges.values()
        if rec["source"] == "leetcode" and rec["id"] not in already
        and rec["id"] not in curated_order and usable(rec["id"])
    ]
    fill.sort(key=lambda rec: (rec.get("popularity") or {}).get("solved", 0),
              reverse=True)

    target = TARGET_TOTAL - 202  # 202 Project Euler items already exist
    candidates = list(selected) + [(rec["id"], "popular") for rec in fill]

    written = []
    for cid, origin in candidates:
        if len(written) >= target:
            break
        challenge = challenges[cid]
        test = tests[cid]
        meta_question = merged[challenge["native_id"]]
        description = (meta_question.get("description") or "").strip()
        # The mirror appends empty "Example 1: ..." placeholders after the
        # statement; real examples live in the structured tests.
        description = re.split(r"\n\s*Example\s+1\s*:", description)[0].strip()
        description = re.sub(r"\n\s*Constraints:\s*$", "", description).strip()
        if len(description) < 40:
            continue
        native = int(challenge["native_id"])
        github_path = quote(paths[native], safe="/")

        item = ITEMS / cid
        (item / "tests").mkdir(parents=True, exist_ok=True)
        (item / "problem.md").write_text(
            f"# {challenge['title']}\n\n"
            f"**Source:** [LeetCode #{native}]({challenge['url']})  \n"
            f"**Difficulty:** {challenge['difficulty']['normalized']}/10 "
            f"({challenge['difficulty']['raw']})  \n"
            f"**Topics:** {', '.join(challenge['topics']) or '—'}  \n"
            f"**Harness:** function-style inputs (`name = value` pairs)\n\n"
            f"## Problem\n\n{description}\n\n"
            f"## Public examples\n\n" +
            "\n\n".join(
                f"### {case['name']}\n\n```text\nInput: {case['input']}\n"
                f"Output: {case['output']}\n```"
                for case in test["public"]) +
            "\n",
            encoding="utf-8")
        (item / "tests" / "public.json").write_text(
            json.dumps(test["public"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        (item / "tests" / "hidden.json").write_text(
            json.dumps(test["hidden"], ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        meta = {
            "id": cid,
            "source": "leetcode",
            "title": challenge["title"],
            "url": challenge["url"],
            "category": challenge["category"],
            "topics": challenge["topics"],
            "difficulty": challenge["difficulty"],
            "harness": "function",
            "input_format": "text",
            "statement": "problem.md",
            "selection": origin,
            "tests": {
                "public": len(test["public"]),
                "hidden": len(test["hidden"]),
                "public_path": "tests/public.json",
                "hidden_path": "tests/hidden.json",
                "hidden_kind": "held-out-official-examples",
            },
            "reference_solutions": [{
                "language": "python",
                "url": f"https://github.com/doocs/leetcode/blob/main/{github_path}",
                "license": DOOCS_LICENSE,
                "status": "linked-not-executed",
            }],
            "license_note": ("Statement metadata from LeetCode; reference code "
                             "remains doocs/leetcode CC-BY-SA-4.0."),
        }
        (item / "meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8")
        written.append((cid, origin, meta))

    # Merge with existing items (Project Euler) and rewrite the manifests.
    existing_path = BENCH / "items.jsonl"
    existing = [
        json.loads(line) for line in existing_path.read_text().splitlines()
        if line.strip()
    ] if existing_path.exists() else []
    existing = [row for row in existing if row["source"] != "leetcode"]
    for cid, origin, meta in written:
        existing.append({
            "id": cid,
            "source": "leetcode",
            "title": meta["title"],
            "url": meta["url"],
            "harness": "function",
            "selection": origin,
            "tests": meta["tests"],
            "reference": meta["reference_solutions"][0]["url"],
        })
    existing.sort(key=lambda row: (row["source"], row["id"]))
    (BENCH / "items.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in existing),
        encoding="utf-8")
    counts: dict[str, int] = {}
    for row in existing:
        counts[row["source"]] = counts.get(row["source"], 0) + 1
    (BENCH / "index.json").write_text(
        json.dumps({"total": len(existing), "sources": counts}, indent=2) + "\n",
        encoding="utf-8")
    print(f"wrote {len(written)} LeetCode items; total {len(existing)}")


if __name__ == "__main__":
    main()
