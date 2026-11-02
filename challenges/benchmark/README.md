# Benchmark: 500 self-contained items

This directory is the evaluation subset of the catalog: **500 challenges** that
each have a statement, a validation case, and a reference to a public Python
solution.

| Source | Items | Harness | Public cases | Held-out cases |
|---|---:|---|---:|---:|
| [Project Euler](https://projecteuler.net) | 202 | `single-answer` | 202 | 0 |
| [LeetCode](https://leetcode.com) | 298 | `function` | 298 | 444 |
| **Total** | **500** | | **500** | **444** |

LeetCode selection is deterministic: every usable problem from Blind 75 and
NeetCode 150 (133 items), then the most-solved remaining problems up to 298.
Project Euler selection is every problem with both a public answer and a public
Python solution in `nayuki/Project-Euler-solutions` (202 items).

## Layout

```
benchmark/
├── index.json                 # counts by source
├── items.jsonl                # flat manifest, one row per item
└── items/
    └── <challenge-id>/
        ├── problem.md         # statement, source link, difficulty, harness
        ├── meta.json          # metadata + reference solution metadata
        └── tests/
            ├── public.json    # function harness (LeetCode)
            ├── hidden.json    # held-out official examples (LeetCode)
            └── public/
                └── answer.txt # numeric answer (Project Euler)
```

Every id is the same stable id used in `data/challenges.jsonl`, so the catalog
and benchmark can be joined without translation.

## Harnesses

**`single-answer`** (Project Euler) — run the candidate program; compare its
trimmed stdout with `tests/public/answer.txt`.  There is one answer and no
input, so there is no hidden case.

**`function`** (LeetCode) — the case `input` is function-style text, for example
`nums = [2,7,11,15], target = 9`; `output` is the expected serialized return
value.  A harness must parse the named arguments and call the candidate's
solution entry point.  This is deliberately text, not JSON, because that is how
the official examples are published.

## Reference solutions

Reference code is **linked, not copied**:

- Project Euler → `nayuki/Project-Euler-solutions` (all rights reserved).
- LeetCode → `doocs/leetcode` (CC-BY-SA-4.0).

`meta.json` records the URL, language, license and verification status.  These
links are pointers for humans and for a future verifier; they are not executed
by this repository.  The Project Euler answers come from the public answer file
in the same repository.

## What is and is not available

- **Public cases** are official examples/samples, extracted by the catalog's
  test layer.
- **Held-out cases** are the remaining official LeetCode examples, not the
  platform's private judge tests.  They are hidden from the solver, not secret
  from the evaluator.
- **Private judge tests are not public** and are not included.
- Project Euler has no input/output tests; its single numeric answer is the
  validation.

## Rebuilding

```bash
node tools/fetch_benchmark_euler.ts
node tools/build_benchmark_euler.ts

node tools/fetch_benchmark_leetcode.ts
node tools/build_benchmark_leetcode.ts

node tools/validate_benchmark.ts
```

The build scripts are idempotent and regenerate `items.jsonl` and `index.json`.
`tools/validate_benchmark.ts` checks every item directory, statement, test count
and reference URL shape.
