#!/usr/bin/env python3
"""Download problem pages that contain official sample tests.

Only sources whose sample sections are publicly readable are fetched:
CSES, AtCoder and Rosalind.  Codeforces returns HTTP 403 to automated
requests, so its samples are marked unavailable rather than guessed.

    python3 tools/fetch_tests.py
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = ROOT / ".cache" / "tests"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")
SOURCES = {"cses", "atcoder", "rosalind"}


def fetch(url: str, dest: Path, retries: int = 5, timeout: int = 45,
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
        except urllib.error.HTTPError as exc:
            if exc.code == 429:
                wait = 5
                try:
                    wait = int(exc.headers.get("Retry-After", "5"))
                except (TypeError, ValueError):
                    pass
                print(f"  .. rate limited, sleeping {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            if attempt == retries - 1:
                print(f"  !! {url}: {exc}", file=sys.stderr)
            else:
                time.sleep(1.5 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
            if attempt == retries - 1:
                print(f"  !! {url}: {exc}", file=sys.stderr)
            else:
                time.sleep(1.5 * (attempt + 1))
    return None


def main() -> None:
    records = [json.loads(line) for line in
               (DATA / "challenges.jsonl").read_text().splitlines() if line.strip()]
    jobs = []
    for r in records:
        if r["source"] not in SOURCES:
            continue
        url = r["url"]
        if r["source"] == "atcoder" and "?" not in url:
            url += "?lang=en"
        jobs.append((url, CACHE / r["source"] / f"{r['id']}.html"))

    grouped: dict[str, list] = {}
    for url, path in jobs:
        grouped.setdefault(path.parent.name, []).append((url, path))

    print(f"fetching {len(jobs)} sample pages")
    failed = 0
    for source, batch in grouped.items():
        # AtCoder rate-limits aggressively; CSES/Rosalind are fine in parallel.
        workers = 1 if source == "atcoder" else 5
        delay = 1.2 if source == "atcoder" else 0.0
        print(f"  {source}: {len(batch)} page(s), {workers} worker(s)")
        done = 0
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {
                pool.submit(fetch, url, path, delay=delay): (url, path)
                for url, path in batch
            }
            for fut in as_completed(futures):
                done += 1
                if fut.result() is None:
                    failed += 1
                if done % 50 == 0 or done == len(futures):
                    print(f"    {done}/{len(futures)}")
    print(f"cached {CACHE}")
    if failed:
        print(f"warning: {failed} page(s) failed; those challenges will have no tests",
              file=sys.stderr)


if __name__ == "__main__":
    main()
