#!/usr/bin/env python3
"""Build data/tests.jsonl from official public examples/samples.

Important: none of the platforms publish their private judge tests.  For
problems with more than one official example/sample, the first case is public
and the rest are held out as `hidden` (labelled `held-out-official-samples`).
No test case is invented here.

    python3 tools/build_tests.py
"""

from __future__ import annotations

import csv
import html
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = ROOT / ".cache"

INPUT_OUTPUT = re.compile(
    r"Input:\s*(.*?)\n\s*Output:\s*(.*?)(?:\n\s*Explanation:\s*(.*))?$", re.S)


def clean_block(fragment: str) -> str:
    fragment = re.sub(r"<br\s*/?>", "\n", fragment, flags=re.I)
    fragment = re.sub(r"<[^>]+>", "", fragment)
    return html.unescape(fragment).strip("\n")


def parse_leetcode_example(text: str):
    text = (text or "").replace("\r\n", "\n").strip()
    if not text:
        return None
    match = INPUT_OUTPUT.search(text)
    if not match:
        return None
    source, output = match.group(1).strip(), match.group(2).strip()
    if not source or not output:
        return None
    explanation = match.group(3).strip() if match.group(3) else None
    return source, output, explanation


def parse_cses(page: str):
    marker = page.find('id="example"')
    if marker == -1:
        return []
    section = page[marker:]
    pairs = re.findall(
        r"<p>Input:</p>\s*<pre>(.*?)</pre>\s*<p>Output:</p>\s*<pre>(.*?)</pre>",
        section, re.S)
    if not pairs:
        blocks = re.findall(r"<pre>(.*?)</pre>", section, re.S)
        if len(blocks) >= 2:
            pairs = [(blocks[0], blocks[1])]
    return [(clean_block(a), clean_block(b), None) for a, b in pairs]


def parse_atcoder(page: str):
    inputs = {
        int(number): clean_block(body)
        for number, body in re.findall(
            r"<h3>Sample Input (\d+)</h3>\s*<pre>(.*?)</pre>", page, re.S)
    }
    outputs = {
        int(number): clean_block(body)
        for number, body in re.findall(
            r"<h3>Sample Output (\d+)</h3>\s*<pre>(.*?)</pre>", page, re.S)
    }
    return [(inputs[n], outputs[n], None) for n in sorted(inputs) if n in outputs]


def parse_rosalind(page: str):
    source = re.search(
        r'<h2 id="sample-dataset">.*?</h2>.*?<pre>(.*?)</pre>', page, re.S)
    output = re.search(
        r'<h2 id="sample-output">.*?</h2>.*?<pre>(.*?)</pre>', page, re.S)
    if not source or not output:
        return []
    return [(clean_block(source.group(1)), clean_block(output.group(1)), None)]


def case(name: str, kind: str, source: str, output: str, explanation=None) -> dict:
    return {
        "name": name,
        "kind": kind,
        "input": source,
        "output": output,
        "explanation": explanation,
    }


def make_tests(challenge: dict, fmt: str, raw_cases: list,
               note: str | None = None, status: str | None = None) -> dict:
    raw_cases = [item for item in raw_cases
                 if item[0].strip() and item[1].strip()]
    public = []
    hidden = []
    for index, (source, output, explanation) in enumerate(raw_cases, 1):
        if index == 1:
            public.append(case("example-1" if fmt == "function" else "sample-1",
                               "example" if fmt == "function" else "sample",
                               source, output, explanation))
        else:
            hidden.append(case(f"held-out-{index - 1}",
                               "held-out-example" if fmt == "function"
                               else "held-out-sample",
                               source, output))
    if status is None:
        if not public:
            status = "none"
        elif hidden:
            status = "public+hidden"
        else:
            status = "public-only"
    return {
        "challenge_id": challenge["id"],
        "url": challenge["url"],
        "source": challenge["source"],
        "format": fmt,
        "status": status,
        "public": public,
        "hidden": hidden,
        "hidden_policy": "held-out-official-samples" if hidden else "none",
        "note": note,
    }


def format_for(challenge: dict) -> str:
    if challenge["source"] in {"cses", "atcoder", "advent-of-code", "rosalind"}:
        return "stdio"
    if challenge["source"] == "codeforces":
        return "stdio"
    if challenge["source"] == "project-euler":
        return "single-answer"
    if challenge["source"] == "cryptopals":
        return "programming"
    if challenge["source"] == "jane-street":
        return "puzzle"
    if "sql" in challenge["formats"]:
        return "sql"
    if "shell" in challenge["formats"]:
        return "shell"
    return "function"


def main() -> None:
    challenges = [json.loads(line) for line in
                  (DATA / "challenges.jsonl").read_text().splitlines() if line.strip()]
    leetcode_meta = {}
    merged = json.loads((CACHE / "leetcode/merged.json").read_text())
    for question in merged["questions"]:
        leetcode_meta[str(question["frontend_id"])] = question
        leetcode_meta[question["problem_slug"]] = question

    records = []
    for challenge in challenges:
        source = challenge["source"]
        fmt = format_for(challenge)
        raw_cases = []
        note = None

        if source == "leetcode":
            meta = leetcode_meta.get(challenge["native_id"])
            if meta:
                for example in meta.get("examples", []):
                    parsed = parse_leetcode_example(example.get("example_text"))
                    if parsed:
                        raw_cases.append(parsed)
            if not raw_cases:
                note = ("Premium problem; examples may require a subscription."
                        if challenge["premium"]
                        else "No parseable examples in the public metadata mirror.")
        elif source in {"cses", "atcoder", "rosalind"}:
            path = CACHE / "tests" / source / f"{challenge['id']}.html"
            if path.exists():
                text = path.read_text(errors="ignore")
                if source == "cses":
                    raw_cases = parse_cses(text)
                elif source == "atcoder":
                    raw_cases = parse_atcoder(text)
                else:
                    raw_cases = parse_rosalind(text)
                if not raw_cases:
                    note = "No sample section found on the problem page."
            else:
                note = "Sample page was not downloaded; run tools/fetch_tests.py."
        elif source == "codeforces":
            note = ("Official samples are not retrievable: codeforces.com returns "
                    "HTTP 403 to automated requests.")
        elif source == "project-euler":
            note = ("Project Euler asks for one numeric answer; there is no "
                    "input/output test contract.")
        elif source == "advent-of-code":
            note = ("Puzzle inputs are per-user and examples are prose, so there "
                    "are no canonical public test cases.")
        elif source == "cryptopals":
            note = ("Fixed cryptographic exercises without a uniform stdin/stdout "
                    "contract.")
        elif source == "jane-street":
            note = "One-off puzzle with no automated input/output contract."

        not_applicable = source in {"project-euler", "advent-of-code",
                                    "cryptopals", "jane-street"}
        record = make_tests(
            challenge, fmt, raw_cases, note=note,
            status=None if raw_cases else ("not-applicable" if not_applicable else "none"))
        records.append(record)

    ids = {r["challenge_id"] for r in records}
    assert len(ids) == len(records) == len(challenges), "test/challenge id mismatch"

    DATA.mkdir(exist_ok=True)
    with (DATA / "tests.jsonl").open("w", encoding="utf-8") as fh:
        for record in records:
            fh.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")

    with (DATA / "tests.csv").open("w", encoding="utf-8", newline="") as fh:
        writer = csv.writer(fh)
        writer.writerow(["challenge_id", "source", "status", "format",
                         "public_count", "hidden_count", "hidden_policy"])
        for record in records:
            writer.writerow([record["challenge_id"], record["source"],
                             record["status"], record["format"],
                             len(record["public"]), len(record["hidden"]),
                             record["hidden_policy"]])

    by_source = defaultdict(lambda: {"challenges": 0, "with_public": 0,
                                     "with_hidden": 0, "public_cases": 0,
                                     "hidden_cases": 0})
    for record in records:
        bucket = by_source[record["source"]]
        bucket["challenges"] += 1
        bucket["with_public"] += bool(record["public"])
        bucket["with_hidden"] += bool(record["hidden"])
        bucket["public_cases"] += len(record["public"])
        bucket["hidden_cases"] += len(record["hidden"])

    summary = {
        "total": len(records),
        "with_public": sum(1 for r in records if r["public"]),
        "with_hidden": sum(1 for r in records if r["hidden"]),
        "public_cases": sum(len(r["public"]) for r in records),
        "hidden_cases": sum(len(r["hidden"]) for r in records),
        "by_status": dict(Counter(r["status"] for r in records).most_common()),
        "by_source": {key: value for key, value in sorted(by_source.items())},
    }

    index_path = DATA / "index.json"
    if index_path.exists():
        index = json.loads(index_path.read_text())
        index["tests"] = summary
        index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n",
                              encoding="utf-8")

    print(f"wrote {len(records)} test records")
    print(f"  with public cases: {summary['with_public']}")
    print(f"  with hidden cases: {summary['with_hidden']}")
    print(f"  public cases: {summary['public_cases']}  "
          f"hidden cases: {summary['hidden_cases']}")
    for source, value in sorted(by_source.items()):
        print(f"  {source:16} public {value['with_public']:5}  "
              f"hidden {value['with_hidden']:5}")


if __name__ == "__main__":
    main()
