#!/usr/bin/env python3
"""Build benchmark items for Project Euler.

Each item is self-contained: statement, expected answer, metadata and a link to
a public Python solution.  Only problems with both a public answer and a public
Python solution are emitted.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "benchmark" / "euler"
BENCH = ROOT / "benchmark"
ITEMS = BENCH / "items"

NAYUKI = "https://github.com/nayuki/Project-Euler-solutions/blob/master/python"


def extract_statement(page: str) -> str:
    body = re.search(
        r'<div class="problem_content" role="problem">(.*?)</div>\s*<br>',
        page, re.S)
    if not body:
        return ""
    text = body.group(1)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def main() -> None:
    challenges = {
        r["number"]: r for r in
        (json.loads(line) for line in
         (ROOT / "data/challenges.jsonl").read_text().splitlines() if line.strip())
        if r["source"] == "project-euler"
    }
    answers = {}
    for line in (CACHE / "Answers.txt").read_text().splitlines():
        match = re.match(r"Problem (\d+):\s*(\S+)", line.strip())
        if match:
            answers[int(match.group(1))] = match.group(2)

    tree = json.loads((CACHE / "tree.json").read_text())
    numbers = sorted(
        int(match.group(1))
        for entry in tree.get("tree", [])
        if entry.get("type") == "blob"
        and (match := re.fullmatch(r"python/p(\d{3})\.py", entry["path"]))
    )

    ITEMS.mkdir(parents=True, exist_ok=True)
    index = []
    for number in numbers:
        challenge = challenges.get(number)
        answer = answers.get(number)
        statement_path = CACHE / "statements" / f"problem-{number:03d}.html"
        if not challenge or not answer or not statement_path.exists():
            continue
        title = re.search(r"<h2>(.*?)</h2>", statement_path.read_text(errors="ignore"), re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else ""
        statement = extract_statement(statement_path.read_text(errors="ignore"))
        if not statement:
            continue

        item = BENCH / "items" / challenge["id"]
        (item / "tests" / "public").mkdir(parents=True, exist_ok=True)
        (item / "problem.md").write_text(
            f"# {title or challenge['title']}\n\n"
            f"**Source:** [Project Euler #{number}]({challenge['url']})  \n"
            f"**Answer type:** one number  \n"
            f"**Difficulty:** {challenge['difficulty']['normalized']}/10 "
            f"({challenge['difficulty']['raw']})\n\n"
            f"## Problem\n\n{statement}\n\n"
            f"## Output\n\nPrint the single numeric answer.\n",
            encoding="utf-8")
        (item / "tests" / "public" / "answer.txt").write_text(answer + "\n",
                                                               encoding="utf-8")
        digest = hashlib.sha256(answer.encode()).hexdigest()
        meta = {
            "id": challenge["id"],
            "source": "project-euler",
            "title": title or challenge["title"],
            "url": challenge["url"],
            "category": challenge["category"],
            "topics": challenge["topics"],
            "difficulty": challenge["difficulty"],
            "harness": "single-answer",
            "statement": "problem.md",
            "tests": {"public": 1, "hidden": 0,
                      "public_path": "tests/public/answer.txt"},
            "reference_solutions": [{
                "language": "python",
                "url": f"{NAYUKI}/p{number:03d}.py",
                "license": "All rights reserved; link only",
                "verified_answer": True,
            }],
            "answer_sha256": digest,
            "license_note": ("Statement remains Project Euler copyright; "
                             "reference code remains Project Nayuki copyright."),
        }
        (item / "meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        index.append({
            "id": challenge["id"],
            "source": "project-euler",
            "title": meta["title"],
            "url": challenge["url"],
            "harness": "single-answer",
            "tests": {"public": 1, "hidden": 0},
            "reference": meta["reference_solutions"][0]["url"],
        })

    index.sort(key=lambda row: row["id"])
    BENCH.mkdir(exist_ok=True)
    (BENCH / "items.jsonl").write_text(
        "".join(json.dumps(row, ensure_ascii=False) + "\n" for row in index),
        encoding="utf-8")
    (BENCH / "index.json").write_text(
        json.dumps({"total": len(index), "sources": {"project-euler": len(index)}},
                   indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(index)} Project Euler benchmark items")


if __name__ == "__main__":
    main()
