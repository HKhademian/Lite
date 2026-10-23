#!/usr/bin/env python3
"""Build the challenge corpus from cached source snapshots.

Reads   .cache/**            (see tools/fetch_sources.py)
Writes  data/challenges.jsonl
        data/challenges.csv
        data/lists.jsonl
        data/index.json
        schema/taxonomy.json

Every record has the same shape regardless of where it came from, so the
corpus can be grouped, filtered and sorted without source-specific logic.

    python3 tools/build.py
"""

from __future__ import annotations

import csv
import html
import json
import re
import sys
import tomllib
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
DATA = ROOT / "data"
SCHEMA = ROOT / "schema"

# --------------------------------------------------------------------------
# vocabulary
# --------------------------------------------------------------------------

CATEGORIES = {
    "algorithms": "Classic algorithmic problem solving: arrays, sorting, DP, graphs, ...",
    "data-structures": "Implement or reason about a data structure.",
    "mathematics": "Number theory, combinatorics, geometry, probability.",
    "databases": "SQL / relational query problems.",
    "shell": "Unix shell and command-line problems.",
    "concurrency": "Threads, locks, async and parallel coordination.",
    "javascript": "JavaScript-language-specific exercises.",
    "data-analysis": "Tabular data manipulation (pandas-style).",
    "security": "Cryptography and security challenges.",
    "bioinformatics": "String and sequence problems over biological data.",
    "puzzles": "Story-driven or puzzle-first problems (Advent of Code style).",
    "frontend": "UI, CSS and browser challenges.",
    "system-design": "Architecture and design interview questions.",
}

LC_TOPICS = {
    "Array": "arrays",
    "String": "strings",
    "Hash Table": "hash-table",
    "Hash Function": "hashing",
    "Dynamic Programming": "dynamic-programming",
    "Depth-First Search": "dfs",
    "Breadth-First Search": "bfs",
    "Binary Search": "binary-search",
    "Two Pointers": "two-pointers",
    "Sliding Window": "sliding-window",
    "Linked List": "linked-list",
    "Doubly-Linked List": "doubly-linked-list",
    "Stack": "stack",
    "Queue": "queue",
    "Heap (Priority Queue)": "heap",
    "Monotonic Stack": "monotonic-stack",
    "Monotonic Queue": "monotonic-queue",
    "Graph": "graphs",
    "Tree": "trees",
    "Binary Tree": "binary-tree",
    "Binary Search Tree": "binary-search-tree",
    "Trie": "trie",
    "Union Find": "union-find",
    "Segment Tree": "segment-tree",
    "Binary Indexed Tree": "fenwick-tree",
    "Matrix": "matrix",
    "Math": "math",
    "Number Theory": "number-theory",
    "Combinatorics": "combinatorics",
    "Geometry": "geometry",
    "Bit Manipulation": "bit-manipulation",
    "Bitmask": "bitmask",
    "Recursion": "recursion",
    "Memoization": "memoization",
    "Backtracking": "backtracking",
    "Greedy": "greedy",
    "Sort": "sorting",
    "Sorting": "sorting",
    "Counting": "counting",
    "Enumeration": "enumeration",
    "Simulation": "simulation",
    "Divide and Conquer": "divide-and-conquer",
    "Design": "design",
    "Database": "databases",
    "Shell": "shell",
    "Concurrency": "concurrency",
    "JavaScript": "javascript",
    "Pandas": "pandas",
    "Brainteaser": "brainteaser",
    "Interactive": "interactive",
    "Randomized": "randomized",
    "Quickselect": "quickselect",
    "Topological Sort": "topological-sort",
    "Shortest Path": "shortest-path",
    "Minimum Spanning Tree": "minimum-spanning-tree",
    "Strongly Connected Component": "strongly-connected-component",
    "Biconnected Component": "biconnected-component",
    "Eulerian Circuit": "eulerian-circuit",
    "Prefix Sum": "prefix-sum",
    "Suffix Array": "suffix-array",
    "Rolling Hash": "rolling-hash",
    "String Matching": "string-matching",
    "Game Theory": "game-theory",
    "Probability and Statistics": "probability",
    "Data Stream": "data-stream",
    "Iterator": "iterator",
    "Merge Sort": "merge-sort",
    "Radix Sort": "radix-sort",
    "Bucket Sort": "bucket-sort",
    "Counting Sort": "counting-sort",
    "Line Sweep": "sweep-line",
    "Ordered Set": "ordered-set",
    "Reservoir Sampling": "reservoir-sampling",
    "Rejection Sampling": "rejection-sampling",
}

CF_TAGS = {
    "*special": "special",
    "2-sat": "2-sat",
    "binary search": "binary-search",
    "bitmasks": "bitmask",
    "brute force": "brute-force",
    "chinese remainder theorem": "chinese-remainder-theorem",
    "combinatorics": "combinatorics",
    "communication": "communication",
    "constructive algorithms": "constructive-algorithms",
    "data structures": "data-structures",
    "dfs and similar": "dfs",
    "divide and conquer": "divide-and-conquer",
    "dp": "dynamic-programming",
    "dsu": "union-find",
    "expression parsing": "parsing",
    "fft": "fft",
    "flows": "network-flow",
    "games": "game-theory",
    "geometry": "geometry",
    "graph matchings": "graph-matching",
    "graphs": "graphs",
    "greedy": "greedy",
    "hashing": "hashing",
    "implementation": "implementation",
    "interactive": "interactive",
    "math": "math",
    "matrices": "matrix",
    "meet-in-the-middle": "meet-in-the-middle",
    "number theory": "number-theory",
    "probabilities": "probability",
    "schedules": "scheduling",
    "shortest paths": "shortest-path",
    "sortings": "sorting",
    "string suffix structures": "suffix-array",
    "strings": "strings",
    "ternary search": "ternary-search",
    "trees": "trees",
    "two pointers": "two-pointers",
}

CSES_SECTIONS = {
    "Introductory Problems": (["implementation", "simulation", "math"], 2.0),
    "Sorting and Searching": (["sorting", "binary-search", "two-pointers"], 3.0),
    "Dynamic Programming": (["dynamic-programming"], 4.5),
    "Graph Algorithms": (["graphs", "shortest-path", "dfs", "bfs"], 4.5),
    "Range Queries": (["range-queries", "segment-tree", "fenwick-tree"], 4.5),
    "Tree Algorithms": (["trees", "dfs"], 4.5),
    "Mathematics": (["math", "number-theory", "combinatorics"], 5.5),
    "String Algorithms": (["strings", "string-matching"], 4.5),
    "Geometry": (["geometry"], 5.5),
    "Advanced Techniques": (["advanced-techniques"], 7.0),
    "Sliding Window Problems": (["sliding-window"], 5.0),
    "Interactive Problems": (["interactive"], 5.0),
    "Bitwise Operations": (["bit-manipulation"], 5.0),
    "Construction Problems": (["constructive-algorithms"], 5.5),
    "Advanced Graph Problems": (["graphs", "network-flow"], 7.0),
    "Counting Problems": (["combinatorics", "counting"], 6.0),
    "Additional Problems I": (["mixed"], 6.0),
    "Additional Problems II": (["mixed"], 6.5),
}

CRYPTOPALS_SETS = {
    1: ("Basics", ["cryptography", "encoding", "xor"]),
    2: ("Block crypto", ["cryptography", "aes", "block-ciphers"]),
    3: ("Block & stream crypto", ["cryptography", "aes", "stream-ciphers"]),
    4: ("Stream crypto and randomness", ["cryptography", "randomness", "mt19937"]),
    5: ("Diffie-Hellman and friends", ["cryptography", "diffie-hellman"]),
    6: ("RSA and DSA", ["cryptography", "rsa"]),
    7: ("Hashes", ["cryptography", "hashing", "length-extension"]),
    8: ("Abstract algebra", ["cryptography", "abstract-algebra"]),
}

TOPIC_GROUPS = {
    # data structures
    "arrays": "data-structures", "linked-list": "data-structures",
    "doubly-linked-list": "data-structures", "stack": "data-structures",
    "queue": "data-structures", "heap": "data-structures",
    "hash-table": "data-structures", "hashing": "data-structures",
    "trie": "data-structures", "union-find": "data-structures",
    "segment-tree": "data-structures", "fenwick-tree": "data-structures",
    "ordered-set": "data-structures", "matrix": "data-structures",
    "data-stream": "data-structures", "iterator": "data-structures",
    "monotonic-stack": "data-structures", "monotonic-queue": "data-structures",
    "trees": "data-structures", "binary-tree": "data-structures",
    "binary-search-tree": "data-structures", "data-structures": "data-structures",
    "range-queries": "data-structures", "bit-manipulation": "techniques",
    # graphs
    "graphs": "graphs", "dfs": "graphs", "bfs": "graphs",
    "topological-sort": "graphs", "shortest-path": "graphs",
    "minimum-spanning-tree": "graphs", "strongly-connected-component": "graphs",
    "biconnected-component": "graphs", "eulerian-circuit": "graphs",
    "network-flow": "graphs", "graph-matching": "graphs", "2-sat": "graphs",
    # dp
    "dynamic-programming": "dynamic-programming", "memoization": "dynamic-programming",
    "bitmask": "dynamic-programming",
    # math
    "math": "mathematics", "number-theory": "mathematics",
    "combinatorics": "mathematics", "geometry": "mathematics",
    "probability": "mathematics", "game-theory": "mathematics",
    "chinese-remainder-theorem": "mathematics", "fft": "mathematics",
    "modular-arithmetic": "mathematics",
    # strings
    "strings": "strings", "string-matching": "strings", "suffix-array": "strings",
    "rolling-hash": "strings", "parsing": "strings",
    # techniques
    "sorting": "techniques", "binary-search": "techniques",
    "two-pointers": "techniques", "sliding-window": "techniques",
    "prefix-sum": "techniques", "sweep-line": "techniques",
    "greedy": "techniques", "backtracking": "techniques",
    "recursion": "techniques", "divide-and-conquer": "techniques",
    "quickselect": "techniques", "meet-in-the-middle": "techniques",
    "ternary-search": "techniques", "constructive-algorithms": "techniques",
    "brute-force": "techniques", "implementation": "techniques",
    "simulation": "techniques", "enumeration": "techniques",
    "counting": "techniques", "advanced-techniques": "techniques",
    "randomized": "techniques", "communication": "techniques",
    "special": "techniques", "scheduling": "techniques", "mixed": "techniques",
    "merge-sort": "techniques", "radix-sort": "techniques",
    "bucket-sort": "techniques", "counting-sort": "techniques",
    "reservoir-sampling": "techniques", "rejection-sampling": "techniques",
    # systems / domains
    "databases": "systems", "shell": "systems", "concurrency": "systems",
    "javascript": "systems", "pandas": "systems", "design": "systems",
    "interactive": "systems", "brainteaser": "systems",
    "cryptography": "domain", "encoding": "domain", "xor": "domain",
    "aes": "domain", "block-ciphers": "domain", "stream-ciphers": "domain",
    "randomness": "domain", "mt19937": "domain", "diffie-hellman": "domain",
    "rsa": "domain", "length-extension": "domain",
    "abstract-algebra": "domain", "bioinformatics": "domain",
    "security": "domain", "frontend": "domain",
}

TOPIC_LABELS = {
    "dfs": "DFS", "bfs": "BFS", "fft": "FFT", "2-sat": "2-SAT",
    "aes": "AES", "rsa": "RSA", "xor": "XOR", "mt19937": "MT19937",
    "javascript": "JavaScript", "diffie-hellman": "Diffie-Hellman",
    "aho-corasick": "Aho-Corasick", "kmp": "KMP", "lca": "LCA",
    "sql": "SQL", "api": "API", "ui": "UI",
}

DIFFICULTY_BANDS = [
    {"id": "beginner", "min": 1.0, "max": 2.0},
    {"id": "easy", "min": 2.1, "max": 4.0},
    {"id": "intermediate", "min": 4.1, "max": 6.0},
    {"id": "advanced", "min": 6.1, "max": 8.0},
    {"id": "expert", "min": 8.1, "max": 10.0},
]

SOURCE_INFO = [
    ("advent-of-code", "Advent of Code", "https://adventofcode.com",
     "Annual 25-day (12 in 2025) two-part holiday puzzle event, 2015-2025."),
    ("project-euler", "Project Euler", "https://projecteuler.net",
     "Mathematical/computational problems, one numeric answer each."),
    ("leetcode", "LeetCode", "https://leetcode.com",
     "Interview-style function problems; free problems only, with topics."),
    ("codeforces", "Codeforces", "https://codeforces.com",
     "Competitive programming; 800 most-solved rated problems with tags."),
    ("cses", "CSES Problem Set", "https://cses.fi/problemset/",
     "400-task competitive programming set with 18 topic sections."),
    ("atcoder", "AtCoder", "https://atcoder.jp",
     "ABC/ARC/AGC problems with community difficulty estimates."),
    ("rosalind", "Rosalind", "https://rosalind.info",
     "Bioinformatics programming challenges."),
    ("cryptopals", "Cryptopals", "https://cryptopals.com",
     "The Matasano crypto challenges, 8 sets of 8."),
    ("jane-street", "Jane Street Puzzles", "https://www.janestreet.com/puzzles/",
     "Monthly quantitative trading puzzles."),
]

SOURCE_ORDER = [s[0] for s in SOURCE_INFO]


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def slugify(value: str) -> str:
    value = value.strip().lower()
    value = value.replace("&", " and ")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", text))).strip()


def dedupe(items):
    seen = set()
    out = []
    for item in items:
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def clamp(value: float, low: float = 1.0, high: float = 10.0) -> float:
    return round(min(high, max(low, value)), 1)


def make_record(**kw) -> dict:
    """Create a record with a stable key order and sane defaults."""
    topics = dedupe(kw.get("topics") or [])
    return {
        "id": kw["id"],
        "title": kw["title"],
        "source": kw["source"],
        "url": kw["url"],
        "native_id": str(kw["native_id"]),
        "set": kw.get("set"),
        "number": kw.get("number"),
        "category": kw["category"],
        "primary_topic": topics[0] if topics else None,
        "topics": topics,
        "raw_topics": [str(t) for t in (kw.get("raw_topics") or [])],
        "tags": dedupe(kw.get("tags") or []),
        "difficulty": kw["difficulty"],
        "formats": list(kw.get("formats") or []),
        "languages": list(kw.get("languages") or ["any"]),
        "topics_source": kw.get("topics_source", "source"),
        "popularity": kw.get("popularity"),
        "premium": bool(kw.get("premium", False)),
        "status": kw.get("status", "verified"),
    }


def difficulty(scale: str, raw, normalized: float) -> dict:
    return {"scale": scale, "raw": raw, "normalized": clamp(normalized)}


# --------------------------------------------------------------------------
# adapters
# --------------------------------------------------------------------------

def parse_leetcode() -> list[dict]:
    api = json.loads((CACHE / "leetcode/api-all.json").read_text())["stat_status_pairs"]
    meta = {}
    for q in json.loads((CACHE / "leetcode/merged.json").read_text())["questions"]:
        meta[str(q["frontend_id"])] = q
        meta[q["problem_slug"]] = q
    level = {1: "Easy", 2: "Medium", 3: "Hard"}
    easy = {"Easy": 2.0, "Medium": 5.0, "Hard": 8.0}
    out = []
    for pair in api:
        stat = pair["stat"]
        qid = str(stat.get("frontend_question_id") or stat["question_id"])
        info = meta.get(qid) or meta.get(stat["question__title_slug"])
        raw_topics = (info or {}).get("topics") or []
        topics = dedupe(LC_TOPICS.get(t, slugify(t)) for t in raw_topics)
        diff = level[pair["difficulty"]["level"]]
        attempts = stat.get("total_submitted") or 0
        solved = stat.get("total_acs") or 0
        out.append(make_record(
            id=f"leetcode-{qid}",
            title=clean(stat["question__title"]),
            source="leetcode",
            url=f"https://leetcode.com/problems/{stat['question__title_slug']}/",
            native_id=qid,
            set=None,
            number=int(qid) if qid.isdigit() else None,
            category="algorithms",
            topics=topics,
            raw_topics=raw_topics,
            tags=["leetcode", diff.lower()] + (["premium"] if pair["paid_only"] else []),
            difficulty=difficulty("leetcode", diff, easy[diff]),
            formats=["sql"] if "databases" in topics else
                    ["shell"] if "shell" in topics else ["function"],
            languages=["sql"] if "databases" in topics else
                      ["bash"] if "shell" in topics else
                      ["python"] if "pandas" in topics else ["any"],
            topics_source="source" if topics else "none",
            popularity={
                "attempts": attempts,
                "solved": solved,
                "acceptance": round(solved / attempts, 4) if attempts else None,
            },
            premium=pair["paid_only"],
            status="verified" if topics else "partial",
        ))
    # A few problems are language-specific; adjust their category.
    for rec in out:
        for topic, category in (("databases", "databases"), ("shell", "shell"),
                                ("concurrency", "concurrency"),
                                ("javascript", "javascript"), ("pandas", "data-analysis")):
            if topic in rec["topics"]:
                rec["category"] = category
                break
    return out


def parse_codeforces(limit: int = 800) -> list[dict]:
    payload = json.loads((CACHE / "codeforces/problemset.json").read_text())["result"]
    stats = {
        (s["contestId"], s["index"]): s.get("solvedCount", 0)
        for s in payload.get("problemStatistics", [])
    }
    candidates = []
    for p in payload["problems"]:
        rating = p.get("rating")
        if not rating or p.get("type", "PROGRAMMING") != "PROGRAMMING":
            continue
        if not 800 <= rating <= 3000:
            continue
        solved = stats.get((p["contestId"], p["index"]), 0)
        if solved <= 0:
            continue
        candidates.append((solved, p))
    # Stratify by rating band so the sample covers graphs/DP/trees, not just
    # the 800-rated implementation problems that dominate raw solve counts.
    bands = [(800, 1199), (1200, 1599), (1600, 1999), (2000, 3000)]
    per_band = max(1, limit // len(bands))
    chosen: list[tuple[int, dict]] = []
    seen: set[tuple[int, str]] = set()
    for low, high in bands:
        band = sorted(
            (pair for pair in candidates if low <= pair[1]["rating"] <= high),
            key=lambda pair: (-pair[0], pair[1]["contestId"], pair[1]["index"]))
        for solved, p in band[:per_band]:
            key = (p["contestId"], p["index"])
            if key not in seen:
                seen.add(key)
                chosen.append((solved, p))
    if len(chosen) < limit:
        for solved, p in sorted(
                candidates, key=lambda pair: (-pair[0], pair[1]["contestId"],
                                              pair[1]["index"])):
            key = (p["contestId"], p["index"])
            if key not in seen:
                seen.add(key)
                chosen.append((solved, p))
            if len(chosen) >= limit:
                break
    out = []
    for solved, p in chosen[:limit]:
        tags = [CF_TAGS.get(t, slugify(t)) for t in p.get("tags", [])]
        normalized = 1 + (p["rating"] - 800) / 250
        out.append(make_record(
            id=f"codeforces-{p['contestId']}{p['index']}".lower(),
            title=clean(p["name"]),
            source="codeforces",
            url=f"https://codeforces.com/problemset/problem/{p['contestId']}/{p['index']}",
            native_id=f"{p['contestId']}{p['index']}",
            set=f"contest-{p['contestId']}",
            number=None,
            category="algorithms",
            topics=dedupe(tags),
            raw_topics=p.get("tags", []),
            tags=["codeforces", f"rating-{p['rating']}", f"contest-{p['contestId']}",
                  f"index-{p['index'].lower()}"],
            difficulty=difficulty("codeforces-rating", p["rating"], normalized),
            formats=["stdin-stdout"],
            popularity={"solved": solved},
        ))
    return out


def parse_cses() -> list[dict]:
    text = (CACHE / "cses/problemset.html").read_text()
    pattern = re.compile(
        r'<h2>([^<]+)</h2>|href="/problemset/task/(\d+)">([^<]+)</a>')
    section = None
    counters: Counter = Counter()
    out = []
    for match in pattern.finditer(text):
        if match.group(1):
            section = clean(match.group(1))
            continue
        if not section:
            continue
        task_id, title = match.group(2), clean(match.group(3))
        topics, base = CSES_SECTIONS.get(section, (["mixed"], 5.0))
        counters[section] += 1
        out.append(make_record(
            id=f"cses-{task_id}",
            title=title,
            source="cses",
            url=f"https://cses.fi/problemset/task/{task_id}",
            native_id=task_id,
            set=section,
            number=counters[section],
            category="algorithms",
            topics=list(topics),
            tags=["cses", slugify(section)],
            difficulty=difficulty("cses-section", section, base),
            formats=["stdin-stdout"],
            topics_source="section",
        ))
    return out


def parse_aoc() -> list[dict]:
    out = []
    for year in range(2015, 2026):
        for day in range(1, 26):
            path = CACHE / f"aoc/{year}/day{day:02d}.html"
            if not path.exists():
                continue
            match = re.search(r"<h2>--- Day (\d+): (.*?) ---</h2>",
                              path.read_text(errors="ignore"), re.S)
            if not match:
                continue
            title = clean(match.group(2))
            out.append(make_record(
                id=f"aoc-{year}-{day:02d}",
                title=title,
                source="advent-of-code",
                url=f"https://adventofcode.com/{year}/day/{day}",
                native_id=f"{year}/{day}",
                set=str(year),
                number=day,
                category="puzzles",
                topics=[],
                tags=["advent-of-code", str(year), f"day-{day}"],
                difficulty=difficulty("aoc-day", f"Day {day}", 1 + (day - 1) / 24 * 8),
                formats=["stdin-stdout", "two-part"],
                topics_source="none",
            ))
    return out


def parse_project_euler() -> list[dict]:
    seen: dict[int, str] = {}
    for path in sorted((CACHE / "project-euler").glob("page*.html")):
        text = path.read_text(errors="ignore")
        for num, raw_title in re.findall(
                r'href="problem=(\d+)"[^>]*>(.*?)</a>', text, re.S):
            number = int(num)
            if number not in seen:
                seen[number] = clean(raw_title)
    out = []
    for number in sorted(seen):
        if number <= 25:
            base = 1.5
        elif number <= 50:
            base = 2.0
        elif number <= 100:
            base = 3.0
        elif number <= 200:
            base = 4.0
        elif number <= 350:
            base = 5.0
        elif number <= 500:
            base = 6.0
        elif number <= 700:
            base = 7.0
        else:
            base = 8.0
        out.append(make_record(
            id=f"project-euler-{number:03d}",
            title=seen[number],
            source="project-euler",
            url=f"https://projecteuler.net/problem={number}",
            native_id=str(number),
            set="Project Euler",
            number=number,
            category="mathematics",
            topics=["math"],
            tags=["project-euler", f"tier-{int(base)}"],
            difficulty=difficulty("project-euler-number", number, base),
            formats=["stdin-stdout", "single-answer"],
            topics_source="curated",
        ))
    return out


def parse_rosalind() -> list[dict]:
    text = (CACHE / "rosalind/list.html").read_text()
    out = []
    for row in re.findall(r"<tr>(.*?)</tr>", text, re.S):
        match = re.search(
            r'href="/problems/([^/"]+)/"[^>]*>([^<]+)</a>', row)
        if not match:
            continue
        slug, raw_title = match.group(1), clean(match.group(2))
        solved_match = re.search(r'/recent/">(\d+)</a>', row)
        ratio_match = re.search(r'([\d.]+)% of all attempts', row)
        solved = int(solved_match.group(1)) if solved_match else 0
        ratio = float(ratio_match.group(1)) / 100 if ratio_match else None
        normalized = 1 + (1 - ratio) * 8 if ratio is not None else 4.0
        out.append(make_record(
            id=f"rosalind-{slug}",
            title=raw_title,
            source="rosalind",
            url=f"https://rosalind.info/problems/{slug}/",
            native_id=slug,
            set="Bioinformatics Stronghold",
            number=None,
            category="bioinformatics",
            topics=["bioinformatics"],
            tags=["rosalind", slug],
            difficulty=difficulty(
                "acceptance-proxy",
                f"{ratio * 100:.1f}% correct" if ratio is not None else "unknown",
                normalized),
            formats=["stdin-stdout"],
            topics_source="curated",
            popularity={"solved": solved,
                        "acceptance": round(ratio, 4) if ratio is not None else None},
        ))
    return out


def parse_cryptopals() -> list[dict]:
    out = []
    for set_no, (set_name, topics) in CRYPTOPALS_SETS.items():
        path = CACHE / f"cryptopals/set{set_no}.html"
        if not path.exists():
            continue
        text = path.read_text()
        links = re.findall(
            rf'href=[\'"]/sets/{set_no}/challenges/(\d+)(\.txt)?[\'"][^>]*>([^<]+)</a>',
            text)
        for number, extension, raw_title in links:
            out.append(make_record(
                id=f"cryptopals-{int(number):02d}",
                title=clean(raw_title),
                source="cryptopals",
                url=f"https://cryptopals.com/sets/{set_no}/challenges/{number}{extension}",
                set=f"Set {set_no}: {set_name}",
                number=int(number),
                native_id=str(number),
                category="security",
                topics=topics,
                tags=["cryptopals", f"set-{set_no}"],
                difficulty=difficulty("cryptopals-set", f"Set {set_no}", 1 + set_no),
                formats=["programming"],
                topics_source="curated",
            ))
    return out


def parse_jane_street() -> list[dict]:
    rows: dict[str, dict] = {}
    for path in sorted((CACHE / "jane-street").glob("archive*.html")):
        text = path.read_text()
        for block in re.findall(
                r'<div class="row puzzle-row archive-list">(.*?)</div>\s*</div>',
                text, re.S):
            name = re.search(r'<span class="name">([^<]+)</span>', block)
            link = re.search(r'class="puzzle-link" href="([^"]+)"', block)
            when = re.search(r'<span class="date">([^<]+)</span>', block)
            if not (name and link):
                continue
            slug = link.group(1).strip("/").split("/")[-1].removesuffix("-index")
            if slug in rows:
                continue
            url = "https://www.janestreet.com" + link.group(1)
            month = (clean(when.group(1)).rstrip(":") if when else None)
            rows[slug] = make_record(
                id=f"jane-street-{slug}",
                title=clean(name.group(1)),
                source="jane-street",
                url=url,
                native_id=slug,
                set=month,
                number=None,
                category="puzzles",
                topics=[],
                tags=["jane-street"] + ([slugify(month)] if month else []),
                difficulty=difficulty("editorial", "Puzzle", 7.0),
                formats=["puzzle"],
                topics_source="none",
            )
    return list(rows.values())


def parse_atcoder(limit: int = 350) -> list[dict]:
    problems = json.loads((CACHE / "atcoder/problems.json").read_text())
    models = json.loads((CACHE / "atcoder/models.json").read_text())
    candidates = []
    for p in problems:
        prefix = re.match(r"[a-z]+", p["contest_id"])
        if not prefix or prefix.group(0) not in {"abc", "arc", "agc"}:
            continue
        model = models.get(p["id"])
        if not model or model.get("is_experimental"):
            continue
        if model.get("difficulty") is None:
            continue
        candidates.append((model.get("irt_users", 0), model["difficulty"], p))
    candidates.sort(key=lambda row: -row[0])
    out = []
    for users, raw_difficulty, p in candidates[:limit]:
        out.append(make_record(
            id=f"atcoder-{p['id'].replace('_', '-').lower()}",
            title=clean(p["name"]),
            source="atcoder",
            url=f"https://atcoder.jp/contests/{p['contest_id']}/tasks/{p['id']}",
            native_id=p["id"],
            set=p["contest_id"],
            number=None,
            category="algorithms",
            topics=[],
            tags=["atcoder", re.match(r"[a-z]+", p["contest_id"]).group(0),
                  f"contest-{p['contest_id']}"],
            difficulty=difficulty("atcoder-difficulty", raw_difficulty,
                                  1 + (max(raw_difficulty, 400) - 400) / 320),
            formats=["stdin-stdout"],
            topics_source="none",
            popularity={"users": users},
        ))
    return out


# --------------------------------------------------------------------------
# lists
# --------------------------------------------------------------------------

def build_lists(records: list[dict]) -> list[dict]:
    by_id = {r["id"]: r for r in records}
    lists = []

    def add(list_id, title, kind, source, url, description, ids, groups=None):
        clean_ids = [i for i in dedupe(ids) if i in by_id]
        entry = {
            "id": list_id,
            "title": title,
            "kind": kind,
            "source": source,
            "url": url,
            "description": description,
            "count": len(clean_ids),
        }
        if groups:
            entry["groups"] = []
            seen: set[str] = set()
            for name, group_ids in groups:
                unique = [i for i in group_ids if i in by_id and i not in seen]
                seen.update(unique)
                if unique:
                    entry["groups"].append({"name": name, "challenge_ids": unique})
        entry["challenge_ids"] = clean_ids
        lists.append(entry)

    def add_roadmap(list_id, title, filename, url, description):
        path = CACHE / "roadmaps" / filename
        if not path.exists():
            return
        data = tomllib.loads(path.read_text())
        groups, all_ids = [], []
        for group in data.get("groups", []):
            ids = []
            for key in group.get("problems", []):
                prefix = key.split("_", 1)[0]
                if not prefix.isdigit():
                    continue
                cid = f"leetcode-{int(prefix)}"
                if cid in by_id and cid not in ids:
                    ids.append(cid)
            if ids:
                groups.append((group.get("name", "Group"), ids))
                all_ids.extend(i for i in ids if i not in all_ids)
        add(list_id, title, "roadmap", "leetcode", url, description,
            all_ids, groups=groups)

    add_roadmap("blind-75", "Blind 75", "blind_75.toml",
                "https://leetcode.com/discuss/general-discussion/460599/blind-75",
                "The classic 75-question interview list, grouped by pattern.")
    add_roadmap("neetcode-150", "NeetCode 150", "neetcode_150.toml",
                "https://neetcode.io/practice",
                "NeetCode's curated 150-question roadmap, grouped by pattern.")

    for year in range(2015, 2026):
        ids = [r["id"] for r in records
               if r["source"] == "advent-of-code" and r["set"] == str(year)]
        if ids:
            add(f"aoc-{year}", f"Advent of Code {year}", "event", "advent-of-code",
                f"https://adventofcode.com/{year}",
                f"All {len(ids)} puzzles from Advent of Code {year}.", ids)

    sections: dict[str, list[str]] = defaultdict(list)
    for r in records:
        if r["source"] == "cses":
            sections[r["set"]].append(r["id"])
    for section, ids in sections.items():
        add(f"cses-{slugify(section)}", f"CSES · {section}", "section", "cses",
            "https://cses.fi/problemset/",
            f"CSES “{section}” section ({len(ids)} tasks).", ids)

    for set_no, (set_name, _) in CRYPTOPALS_SETS.items():
        ids = [r["id"] for r in records
               if r["source"] == "cryptopals"
               and (r["set"] or "").startswith(f"Set {set_no}:")]
        if ids:
            add(f"cryptopals-set-{set_no}", f"Cryptopals · Set {set_no}: {set_name}",
                "set", "cryptopals",
                f"https://cryptopals.com/sets/{set_no}",
                f"{len(ids)} crypto challenges from set {set_no}.", ids)

    pe_first = [r["id"] for r in records
                if r["source"] == "project-euler" and r["number"] and r["number"] <= 100]
    add("project-euler-first-100", "Project Euler · First 100", "collection",
        "project-euler", "https://projecteuler.net/archives",
        "The classic first hundred Project Euler problems; a common starting target.",
        pe_first)

    for category, title, description in (
        ("databases", "LeetCode · Database",
         "All SQL/database problems in the corpus; good for SQL interview prep."),
        ("concurrency", "LeetCode · Concurrency",
         "Threads, locks and synchronization problems."),
        ("shell", "LeetCode · Shell",
         "Unix shell and command-line problems."),
    ):
        ids = [r["id"] for r in records
               if r["source"] == "leetcode" and r["category"] == category]
        if ids:
            add(f"leetcode-{category}", title, "collection", "leetcode",
                "https://leetcode.com/problemset/", description, ids)

    return lists


# --------------------------------------------------------------------------
# outputs
# --------------------------------------------------------------------------

def write_jsonl(path: Path, rows: list[dict]) -> None:
    with path.open("w", encoding="utf-8") as fh:
        for row in rows:
            fh.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")


def write_csv(path: Path, records: list[dict]) -> None:
    fields = ["id", "title", "source", "category", "primary_topic", "topics",
              "raw_topics", "tags", "difficulty", "difficulty_normalized",
              "topics_source", "formats", "premium", "url"]
    with path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        for r in records:
            writer.writerow({
                "id": r["id"],
                "title": r["title"],
                "source": r["source"],
                "category": r["category"],
                "primary_topic": r["primary_topic"] or "",
                "topics": ";".join(r["topics"]),
                "raw_topics": ";".join(r["raw_topics"]),
                "tags": ";".join(r["tags"]),
                "difficulty": r["difficulty"]["raw"],
                "difficulty_normalized": r["difficulty"]["normalized"],
                "topics_source": r["topics_source"],
                "formats": ";".join(r["formats"]),
                "premium": r["premium"],
                "url": r["url"],
            })


def build_taxonomy(records: list[dict]) -> dict:
    used = sorted({t for r in records for t in r["topics"]})
    topics = [{
        "id": topic,
        "label": TOPIC_LABELS.get(topic, topic.replace("-", " ").title()),
        "group": TOPIC_GROUPS.get(topic, "other"),
    } for topic in used]
    return {
        "version": 1,
        "note": "Generated by tools/build.py from the topics present in the corpus.",
        "categories": [{"id": key, "description": value}
                       for key, value in CATEGORIES.items()],
        "topics": topics,
        "difficulty": {
            "scale": "normalized 1-10",
            "bands": DIFFICULTY_BANDS,
        },
        "sources": [{"id": sid, "name": name, "homepage": home, "description": desc}
                    for sid, name, home, desc in SOURCE_INFO],
    }


def validate(records: list[dict], lists: list[dict]) -> None:
    ids = [r["id"] for r in records]
    duplicates = [i for i, n in Counter(ids).items() if n > 1]
    if duplicates:
        raise SystemExit(f"duplicate ids: {duplicates[:10]}")
    known = set(ids)
    for r in records:
        if not r["title"]:
            raise SystemExit(f"empty title: {r['id']}")
        if not r["url"].startswith("https://"):
            raise SystemExit(f"bad url: {r['id']} {r['url']}")
        if r["category"] not in CATEGORIES:
            raise SystemExit(f"bad category: {r['id']} {r['category']}")
        if not 1.0 <= r["difficulty"]["normalized"] <= 10.0:
            raise SystemExit(f"bad difficulty: {r['id']}")
        for topic in r["topics"]:
            if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", topic):
                raise SystemExit(f"bad topic: {r['id']} {topic}")
    for lst in lists:
        missing = [i for i in lst["challenge_ids"] if i not in known]
        if missing:
            raise SystemExit(f"list {lst['id']} references unknown ids: {missing[:5]}")


def main() -> None:
    if not CACHE.exists():
        raise SystemExit("no cache; run tools/fetch_sources.py first")

    records: list[dict] = []
    records += parse_aoc()
    records += parse_project_euler()
    records += parse_leetcode()
    records += parse_codeforces()
    records += parse_cses()
    records += parse_atcoder()
    records += parse_rosalind()
    records += parse_cryptopals()
    records += parse_jane_street()

    order = {source: i for i, source in enumerate(SOURCE_ORDER)}
    records.sort(key=lambda r: (
        order.get(r["source"], 99),
        r["number"] if isinstance(r["number"], int) else 0,
        r["id"],
    ))

    lists = build_lists(records)
    validate(records, lists)

    DATA.mkdir(exist_ok=True)
    write_jsonl(DATA / "challenges.jsonl", records)
    write_jsonl(DATA / "lists.jsonl", lists)
    write_csv(DATA / "challenges.csv", records)

    by_source = Counter(r["source"] for r in records)
    by_category = Counter(r["category"] for r in records)
    by_status = Counter(r["status"] for r in records)
    by_topics_source = Counter(r["topics_source"] for r in records)
    by_topic = Counter(t for r in records for t in r["topics"])
    difficulty_hist = Counter(str(int(r["difficulty"]["normalized"]))
                              for r in records)

    index = {
        "total": len(records),
        "built": date.today().isoformat(),
        "sources": [{
            "id": sid, "name": name, "homepage": home, "description": desc,
            "count": by_source.get(sid, 0),
        } for sid, name, home, desc in SOURCE_INFO],
        "categories": dict(by_category.most_common()),
        "difficulty": dict(sorted(difficulty_hist.items())),
        "topics": dict(by_topic.most_common()),
        "topics_source": dict(by_topics_source.most_common()),
        "status": dict(by_status.most_common()),
        "lists": [{"id": lst["id"], "title": lst["title"], "count": lst["count"]}
                  for lst in lists],
    }
    (DATA / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    taxonomy = build_taxonomy(records)
    SCHEMA.mkdir(exist_ok=True)
    (SCHEMA / "taxonomy.json").write_text(
        json.dumps(taxonomy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"wrote {len(records)} challenges, {len(lists)} lists")
    for sid, _, _, _ in SOURCE_INFO:
        print(f"  {sid:16} {by_source.get(sid, 0):5}")
    print(f"  {'TOTAL':16} {len(records):5}")
    print(f"  topics: {len(by_topic)}   categories: {len(by_category)}")


if __name__ == "__main__":
    main()
