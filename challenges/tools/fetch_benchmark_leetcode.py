#!/usr/bin/env python3
"""Cache the metadata needed for the LeetCode benchmark layer."""

from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "benchmark" / "leetcode"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36")


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / "tree.json"
    if dest.exists() and dest.stat().st_size > 0:
        print(f"cached {dest}")
        return
    url = ("https://api.github.com/repos/doocs/leetcode/"
           "git/trees/main?recursive=1")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
    except Exception as exc:  # noqa: BLE001
        raise SystemExit(f"failed to fetch doocs tree: {exc}")
    dest.write_bytes(body)
    print(f"cached {dest}")


if __name__ == "__main__":
    main()
