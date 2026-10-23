#!/usr/bin/env python3
"""Download Project Euler benchmark inputs.

Selects the problems that have a public Python solution in
nayuki/Project-Euler-solutions, then caches the statement page and the
published numeric answer.  The solution code is linked, not copied (the
repository is all-rights-reserved).
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "benchmark" / "euler"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def fetch(url: str, dest: Path, retries: int = 4, timeout: int = 45,
          delay: float = 0.0) -> Path | None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    for attempt in range(retries):
        try:
            if delay:
                time.sleep(delay)
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                body = resp.read()
            if not body:
                raise ValueError("empty body")
            tmp = dest.with_name(dest.name + ".tmp")
            tmp.write_bytes(body)
            tmp.replace(dest)
            return dest
        except Exception as exc:  # noqa: BLE001 - report and retry
            if attempt == retries - 1:
                print(f"  !! {url}: {exc}", file=sys.stderr)
            else:
                time.sleep(1.5 * (attempt + 1))
    return None


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    tree_path = CACHE / "tree.json"
    fetch("https://api.github.com/repos/nayuki/Project-Euler-solutions/git/trees/master?recursive=1",
          tree_path)
    answers_path = CACHE / "Answers.txt"
    fetch("https://raw.githubusercontent.com/nayuki/Project-Euler-solutions/master/Answers.txt",
          answers_path)

    tree = json.loads(tree_path.read_text())
    numbers = sorted(
        int(match.group(1))
        for entry in tree.get("tree", [])
        if entry.get("type") == "blob"
        and (match := re.fullmatch(r"python/p(\d{3})\.py", entry["path"]))
    )
    print(f"public Python solutions: {len(numbers)}")

    jobs = [(n, f"https://projecteuler.net/problem={n}",
             CACHE / "statements" / f"problem-{n:03d}.html") for n in numbers]
    failures = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(fetch, url, path, delay=0.15): n
                   for n, url, path in jobs}
        for done, fut in enumerate(as_completed(futures), 1):
            if fut.result() is None:
                failures += 1
            if done % 25 == 0 or done == len(futures):
                print(f"  statements {done}/{len(futures)}")
    print(f"cached {CACHE}")
    if failures:
        raise SystemExit(f"{failures} statement page(s) failed")


if __name__ == "__main__":
    main()
