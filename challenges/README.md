# Programming Challenge Corpus

A normalized, source-linked index of **7,085 programming problems, interview
questions and coding challenges** drawn from nine sources.  The point is not to
mirror problem statements — it is to give you one clean, tagged, sortable table
that later grouping, filtering and categorization can be built on.

Everything is plain JSON/JSONL/CSV.  No database, no server, no dependencies.

```
7,085 challenges · 9 sources · 101 topics · 43 lists · 3,637 with tests · 500 benchmark items
```

## What is in the corpus

| Source | Records | What is included | Topics come from |
|---|---:|---|---|
| [Advent of Code](https://adventofcode.com) | 262 | 2015–2025, every day (2025 ran 12 days) | none yet — year/day tags only |
| [Project Euler](https://projecteuler.net) | 1,005 | problems #1–#1005 | `math` + number tier |
| [LeetCode](https://leetcode.com) | 4,087 | 3,300 free + 787 premium (flagged) | source topic tags |
| [Codeforces](https://codeforces.com) | 800 | most-solved problems, stratified across rating bands (800–3000) | source tags |
| [CSES](https://cses.fi/problemset/) | 400 | all 18 topic sections | section-level tags |
| [AtCoder](https://atcoder.jp) | 350 | ABC/ARC/AGC, top by participant count | none yet |
| [Rosalind](https://rosalind.info) | 105 | Bioinformatics Stronghold list | `bioinformatics` |
| [Cryptopals](https://cryptopals.com) | 66 | all 8 sets of the Matasano challenges | curated set themes |
| [Jane Street](https://www.janestreet.com/puzzles/) | 10 | latest puzzles in the archive | none yet |
| **Total** | **7,085** | | |

Known gaps, stated up front:

- `topics` are empty for 1,861 records (`topics_source: "none"`) — Advent of
  Code, AtCoder, Jane Street, and LeetCode problems missing from the public
  metadata mirror.  These are deliberately marked rather than guessed.
- 1,239 LeetCode records are `status: "partial"`: title and URL are verified but
  topics are unavailable (787 of those are premium).
- Project Euler and Advent of Code difficulty is inferred from problem number /
  day, not measured.
- Rosalind coverage is the Stronghold list (105), not every Rosalind track.
- **Private judge tests are not public.**  The `hidden` case list contains
  held-out official examples/samples, not the platforms' secret judge data.
  Codeforces samples are unavailable because the site returns HTTP 403;
  Project Euler, Advent of Code, Cryptopals and Jane Street have no uniform
  stdin/stdout test contract.

## Files

```
challenges/
├── data/
│   ├── challenges.jsonl     # canonical records, one JSON object per line
│   ├── challenges.csv       # flat export for spreadsheets
│   ├── lists.jsonl          # curated lists, referencing challenge ids
│   ├── tests.jsonl          # official samples, public/held-out split
│   ├── tests.csv            # test coverage summary per challenge
│   └── index.json           # counts by source/category/topic/difficulty/tests
├── schema/
│   ├── challenge.schema.json  # JSON Schema for one record
│   ├── list.schema.json       # JSON Schema for a curated list
│   ├── tests.schema.json      # JSON Schema for a test record
│   └── taxonomy.json          # categories, 101 canonical topics, difficulty bands
├── benchmark/              # 500 self-contained evaluation items
│   ├── items/<id>/          # problem.md, meta.json, tests/
│   ├── items.jsonl          # manifest of all benchmark items
│   └── README.md            # harness formats and coverage
├── tools/
│   ├── fetch_sources.py     # cached, resumable download of raw source data
│   ├── fetch_tests.py       # cached download of CSES/AtCoder/Rosalind pages
│   ├── build.py             # normalizes sources -> data/*, validates, writes index
│   ├── build_tests.py       # parses official samples into public/held-out cases
│   ├── query.py             # filter / sort / group / search CLI
│   └── validate.py          # dependency-free integrity checks for edited data
├── Makefile                 # make fetch / build / check
└── README.md
```

The `.cache/` directory holds raw downloads and is git-ignored.  Delete it any
time; `fetch_sources.py` rebuilds it.

## Record shape

```json
{
  "id": "leetcode-1",
  "title": "Two Sum",
  "source": "leetcode",
  "url": "https://leetcode.com/problems/two-sum/",
  "native_id": "1",
  "set": null,
  "number": 1,
  "category": "algorithms",
  "primary_topic": "arrays",
  "topics": ["arrays", "hash-table"],
  "raw_topics": ["Array", "Hash Table"],
  "tags": ["leetcode", "easy"],
  "difficulty": { "scale": "leetcode", "raw": "Easy", "normalized": 2.0 },
  "formats": ["function"],
  "languages": ["any"],
  "topics_source": "source",
  "popularity": { "attempts": 41180820, "solved": 23904078, "acceptance": 0.5805 },
  "premium": false,
  "status": "verified"
}
```

| Field | Meaning |
|---|---|
| `id` | Stable, globally unique, source-prefixed.  Safe to reference from lists. |
| `native_id` | The source's own identifier (question number, task id, contest id, slug). |
| `set` | Year, contest, section or collection the item belongs to. |
| `number` | Numeric position inside the source/set when one exists. |
| `category` | One of 13 broad domains (`algorithms`, `databases`, `puzzles`, ...). |
| `topics` | Canonical kebab-case topics, controlled by `schema/taxonomy.json`. |
| `raw_topics` | The source's own labels, preserved for re-tagging (e.g. `"Hash Table"`). |
| `tags` | Free-form facets: source, year, contest, rating, index, ... |
| `difficulty` | `scale` + original `raw` value + `normalized` 1–10. |
| `formats` | `function`, `stdin-stdout`, `sql`, `shell`, `programming`, `puzzle`, ... |
| `topics_source` | `source`, `section`, `curated`, or `none` (needs tagging). |
| `popularity` | Optional attempts/solved/acceptance/users, source-dependent. |
| `premium` | LeetCode subscription-only problem (included but flagged). |
| `status` | `verified`, or `partial` when topics are missing. |

Ids are stable strings: `leetcode-1`, `aoc-2020-11`, `project-euler-042`,
`codeforces-1003a`, `cses-1068`, `atcoder-abc160-a`, `rosalind-dna`,
`cryptopals-42`, `jane-street-andys-afternoon-amble`.

## Difficulty normalization

`difficulty.normalized` is clamped to 1–10 so heterogeneous sources can share a
sort key.  **It is a per-source heuristic, not a calibrated cross-source scale** —
compare difficulty within a source, not across sources.

| Source | Scale | Mapping |
|---|---|---|
| LeetCode | `leetcode` | Easy 2, Medium 5, Hard 8 |
| Codeforces | `codeforces-rating` | `1 + (rating − 800) / 250` |
| CSES | `cses-section` | fixed base per section (2 → 7) |
| Advent of Code | `aoc-day` | `1 + (day − 1) / 24 × 8` |
| Project Euler | `project-euler-number` | tier by problem number (1.5 → 8) |
| AtCoder | `atcoder-difficulty` | `1 + (difficulty − 400) / 320` |
| Rosalind | `acceptance-proxy` | derived from published correct-ratio |
| Cryptopals | `cryptopals-set` | `1 + set number` |
| Jane Street | `editorial` | flat 7 |

## Categories and topics

`schema/taxonomy.json` is the controlled vocabulary:

- **13 categories** — broad domains for top-level grouping.
- **101 topics** — kebab-case algorithm/data-structure/domain tags, each with a
  `group` (`data-structures`, `graphs`, `dynamic-programming`, `mathematics`,
  `strings`, `techniques`, `systems`, `domain`).
- **5 difficulty bands** — beginner 1–2, easy 2.1–4, intermediate 4.1–6,
  advanced 6.1–8, expert 8.1–10.

Topics are normalized across sources: LeetCode's `Depth-First Search` and
Codeforces' `dfs and similar` both become `dfs`; `Union Find` and `dsu` become
`union-find`.  When a record has no trustworthy topics, `topics_source` is
`none` and `status`/`topics` make that explicit — fill them in later rather than
inheriting a wrong label.

## Curated lists

`data/lists.jsonl` contains 43 ordered collections.  Roadmaps keep their
original groups:

- `blind-75` — 75 problems, 10 groups
- `neetcode-150` — 149 problems, 18 groups
- `aoc-2015` … `aoc-2025` — one per event year
- `cses-introductory-problems` … 18 CSES sections
- `cryptopals-set-1` … `cryptopals-set-8`
- `project-euler-first-100`
- `leetcode-database` (94), `leetcode-concurrency` (6), `leetcode-shell` (4)

Each list carries `challenge_ids` in display order, plus `groups` where the
source defines them.

## Validation cases

`data/tests.jsonl` has exactly one record per challenge id.  The first official
example/sample becomes `public`; the remaining official examples become
`hidden` and are labelled `held-out-official-samples`.

```json
{
  "challenge_id": "leetcode-1",
  "format": "function",
  "status": "public+hidden",
  "public": [{"name": "example-1", "kind": "example",
              "input": "nums = [2,7,11,15], target = 9",
              "output": "[0,1]", "explanation": "..."}],
  "hidden": [{"name": "held-out-1", "kind": "held-out-example",
              "input": "nums = [3,2,4], target = 6", "output": "[1,2]"}],
  "hidden_policy": "held-out-official-samples"
}
```

| Source | With public cases | With held-out cases |
|---|---:|---:|
| LeetCode | 2,793 | 2,698 |
| CSES | 389 | 0 |
| AtCoder | 350 | 312 |
| Rosalind | 105 | 0 |
| Codeforces | 0 | 0 |
| Project Euler | 0 | 0 |
| Advent of Code | 0 | 0 |
| Cryptopals | 0 | 0 |
| Jane Street | 0 | 0 |

`status` is `public+hidden`, `public-only`, `none`, or `not-applicable`.
For LeetCode the `input` string is function-style (`nums = ..., target = ...`),
not serialized JSON; a harness must parse it per problem.  CSES/AtCoder/Rosalind
cases are plain stdin/stdout blocks.

## Benchmark layer

`benchmark/` contains **500 self-contained items** for evaluating a solver:
202 Project Euler (single numeric answer) and 298 LeetCode (function-style
inputs).  Each item has `problem.md`, `meta.json` and a `tests/` directory with
public cases plus held-out official examples where available.

Reference code is linked, not copied: Project Euler points at
`nayuki/Project-Euler-solutions` (all rights reserved), LeetCode at
`doocs/leetcode` (CC-BY-SA-4.0).  The `meta.json` records language, URL, license
and verification status.  See [`benchmark/README.md`](benchmark/README.md).

## Querying

```bash
# corpus summary
python3 tools/query.py --stats

# the Blind 75, in roadmap order
python3 tools/query.py --list blind-75 --all

# hardest database problems, premium excluded
python3 tools/query.py --category databases --premium exclude --sort difficulty --desc

# graph problems at difficulty 5–7, most solved first
python3 tools/query.py --source codeforces --topic graphs --difficulty 5-7 \
    --sort popularity --desc --limit 20

# search titles and emit JSONL
python3 tools/query.py --search "binary tree" --json --all > trees.jsonl

# count things (the raw material for grouping)
python3 tools/query.py --group-by category
python3 tools/query.py --group-by topic
python3 tools/query.py --group-by difficulty
```

Filters combine with AND; repeated `--topic` values must all match.  `--json`
emits full records, `--csv` emits a flat table.

## Rebuilding and extending

```bash
python3 tools/fetch_sources.py          # download/caches every source
python3 tools/fetch_tests.py            # download sample pages
python3 tools/build.py                 # normalize, validate, write data/*
python3 tools/build_tests.py           # parse samples into tests.jsonl

python3 tools/fetch_benchmark_euler.py
python3 tools/build_benchmark_euler.py
python3 tools/fetch_benchmark_leetcode.py
python3 tools/build_benchmark_leetcode.py
python3 tools/validate_benchmark.py
```

`build.py` fails loudly on duplicate ids, malformed URLs, unknown categories,
out-of-range difficulty, or lists pointing at missing ids.  It also regenerates
`data/index.json` and `schema/taxonomy.json`.

To add a source:

1. Add a `fetch_*` function and register it in `SOURCES` (`tools/fetch_sources.py`).
2. Add a `parse_*` adapter returning `make_record(...)` dicts (`tools/build.py`).
3. Add the source to `SOURCE_INFO` and the `source` enum in
   `schema/challenge.schema.json`.
4. Run the two commands above; add curated lists in `build_lists` if the source
   has natural collections.

## Provenance and licensing

This repository stores **metadata only** — titles, URLs, source identifiers,
tags, difficulty and series membership.  Problem statements, inputs, solutions
and editorials remain the property of their respective sites and are not copied
here; follow the links for the actual problems.

Automated URL checks can return `403` from LeetCode and Codeforces (bot
protection) while the URLs themselves are canonical.  Verify a handful of links
per source after changing URL patterns.
