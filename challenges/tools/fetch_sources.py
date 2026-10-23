#!/usr/bin/env python3
"""Download raw snapshots for every challenge source into .cache/.

The cache is disposable: delete it and re-run to refresh.  Nothing here
interprets the data -- normalisation lives in build.py.

Usage:
    python3 tools/fetch_sources.py                 # everything (cached)
    python3 tools/fetch_sources.py --force         # re-download everything
    python3 tools/fetch_sources.py --only aoc,pe   # selected sources
"""

from __future__ import annotations

import argparse
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
AOC_YEARS = range(2015, 2026)


def fetch(url: str, dest: Path, force: bool = False, retries: int = 4,
          timeout: int = 90, allow_missing: bool = False) -> Path | None:
    """GET *url* into *dest*, skipping when a non-empty copy exists.

    With *allow_missing*, 404/405 responses return None instead of failing --
    used for puzzle calendars that have locked or not-yet-existing days.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0 and not force:
        return dest
    last: Exception | None = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
            if not data:
                raise ValueError("empty response")
            tmp = dest.with_name(dest.name + ".tmp")
            tmp.write_bytes(data)
            tmp.replace(dest)
            return dest
        except urllib.error.HTTPError as exc:
            if allow_missing and exc.code in (404, 405):
                return None
            last = exc
            time.sleep(1.2 * (attempt + 1))
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
            last = exc
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last}")


def _pool(jobs: list[tuple[str, Path]], workers: int,
          allow_missing: bool = False) -> None:
    """Fetch (url, path) pairs concurrently, reporting failures."""
    failures = 0
    skipped = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {
            pool.submit(fetch, url, path, allow_missing=allow_missing): (url, path)
            for url, path in jobs
        }
        for done, fut in enumerate(as_completed(futures), 1):
            url, path = futures[fut]
            try:
                if fut.result() is None:
                    skipped += 1
            except Exception as exc:  # keep going; report at the end
                failures += 1
                print(f"  !! {url}: {exc}", file=sys.stderr)
            if done % 25 == 0 or done == len(futures):
                print(f"  {done}/{len(futures)}", flush=True)
    if skipped:
        print(f"  skipped {skipped} unavailable page(s)")
    if failures:
        raise SystemExit(f"{failures} downloads failed")


# --------------------------------------------------------------------------
# sources
# --------------------------------------------------------------------------

def leetcode(force: bool = False) -> None:
    print("leetcode")
    fetch("https://leetcode.com/api/problems/all/",
          CACHE / "leetcode/api-all.json", force)
    # Public mirror of problem metadata (titles, topics, difficulty).
    fetch("https://raw.githubusercontent.com/neenza/leetcode-problems/master/merged_problems.json",
          CACHE / "leetcode/merged.json", force)


def codeforces(force: bool = False) -> None:
    print("codeforces")
    fetch("https://codeforces.com/api/problemset.problems",
          CACHE / "codeforces/problemset.json", force)


def cses(force: bool = False) -> None:
    print("cses")
    fetch("https://cses.fi/problemset/", CACHE / "cses/problemset.html", force)


def aoc(force: bool = False) -> None:
    print("advent of code")
    jobs: list[tuple[str, Path]] = []
    for year in AOC_YEARS:
        jobs.append((f"https://adventofcode.com/{year}",
                     CACHE / f"aoc/{year}/index.html"))
        for day in range(1, 26):
            jobs.append((f"https://adventofcode.com/{year}/day/{day}",
                         CACHE / f"aoc/{year}/day{day:02d}.html"))
    _pool(jobs, workers=4, allow_missing=True)


def project_euler(force: bool = False) -> None:
    print("project euler")
    # Project Euler paginates with a semicolon: /archives;page=2
    for page in range(1, 25):
        dest = CACHE / f"project-euler/page{page:02d}.html"
        fetch(f"https://projecteuler.net/archives;page={page}", dest, force)
        if "problem=" not in dest.read_text(errors="ignore"):
            break


def rosalind(force: bool = False) -> None:
    print("rosalind")
    fetch("https://rosalind.info/problems/list-view/",
          CACHE / "rosalind/list.html", force)


def cryptopals(force: bool = False) -> None:
    print("cryptopals")
    for set_no in range(1, 9):
        fetch(f"https://cryptopals.com/sets/{set_no}",
              CACHE / f"cryptopals/set{set_no}.html", force)


def jane_street(force: bool = False) -> None:
    print("jane street")
    # The archive lists the most recent puzzles; pagination is best-effort.
    for page in range(1, 6):
        dest = CACHE / f"jane-street/archive{page}.html"
        fetch(f"https://www.janestreet.com/puzzles/archive/?page={page}", dest, force)
        if dest.stat().st_size < 5000:
            break


def atcoder(force: bool = False) -> None:
    print("atcoder")
    fetch("https://kenkoooo.com/atcoder/resources/problems.json",
          CACHE / "atcoder/problems.json", force)
    fetch("https://kenkoooo.com/atcoder/resources/problem-models.json",
          CACHE / "atcoder/models.json", force)


def roadmaps(force: bool = False) -> None:
    print("interview roadmaps")
    # Curated public roadmaps: Blind 75 and NeetCode 150.
    for name in ("blind_75", "neetcode_150"):
        fetch(f"https://raw.githubusercontent.com/lufftw/neetcode/main/roadmaps/{name}.toml",
              CACHE / f"roadmaps/{name}.toml", force)


SOURCES = {
    "leetcode": leetcode,
    "codeforces": codeforces,
    "cses": cses,
    "aoc": aoc,
    "pe": project_euler,
    "rosalind": rosalind,
    "cryptopals": cryptopals,
    "jane-street": jane_street,
    "atcoder": atcoder,
    "roadmaps": roadmaps,
}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--force", action="store_true", help="ignore the cache")
    ap.add_argument("--only", default="", help="comma separated source names")
    args = ap.parse_args()
    names = [n.strip() for n in args.only.split(",") if n.strip()] or list(SOURCES)
    unknown = set(names) - set(SOURCES)
    if unknown:
        raise SystemExit(f"unknown sources: {', '.join(sorted(unknown))}")
    for name in names:
        SOURCES[name](force=args.force)
    print(f"\ncache: {CACHE}")


if __name__ == "__main__":
    main()
