# Verifications

Feature verifications are the canonical semantic contract. Examples, samples and
showcases are verified **consumers** of those features, not the contract itself.

The same runner executes both:

- **Feature cases** are small, focused and may be ugly. They verify one feature
  or edge condition and carry a short guideline.
- **Artifact cases** verify that a polished example/sample/showcase still runs
  and produces its documented streams. Samples may append observation calls via
  `append` instead of putting `report` calls into teaching material.

## Layout

```text
verifications/
  README.md
  schema/verification.schema.json
  features.json                 # feature registry: IDs, summaries, case paths, docs
  features/
    int-arithmetic.lts
    int-arithmetic.json
    ...
  artifacts/
    examples/001-double-sum.json
    samples/001-add-two-numbers.json
    showcases/                  # reserved; transcript manifests later
```

Each manifest has a `source` object with exactly one of `file`, `text` or `bytes`.
Feature cases normally use a sibling `.lts`; artifacts use a relative file path.
Inline `text` is available for tiny cases that need no imports. Manifest JSON uses the stream model from the
compiler fixtures.

## Manifest shape

```json
{
  "id": "int.arithmetic",
  "kind": "feature",
  "source": {
    "file": "int-arithmetic.lts",
    "hash": "sha256:<64 lowercase hex>"
  },
  "features": ["int.arithmetic"],
  "targets": ["igniter", "ts", "c"],
  "guideline": "Checks precedence, left associativity and truncating division.",
  "cases": [
    {
      "name": "precedence-and-division",
      "stdout": { "text": "-1\n6\n-3\n", "hash": "sha256:<64 lowercase hex>" },
      "exitCode": 0
    }
  ]
}
```

- `id` — unique manifest ID. Feature IDs use dotted names (`int.arithmetic`);
  artifact IDs use a kind prefix (`example.001-double-sum`).
- `kind` — `feature`, `example`, `sample` or `showcase`; must match the directory.
- `source` — exactly one of `file` (relative path), `text` (inline source) or `bytes` (inline raw source), plus an optional `hash`. Inline source cannot resolve `importFlatAll`; use a file for imports.
- `features` — feature IDs from `features.json`. A feature case includes its own ID.
- `guideline` — required for `feature`; the one-line verification rationale.
- `description` — optional artifact summary.
- `append` — optional text appended to the source for observation. Used by
  samples whose teaching bodies print nothing.
- `targets` — optional execution targets: `igniter` (default), `ts`, `c`.
  Compiler targets are admitted only for sources inside the restricted compiler
  subset and cannot use stdin or script arguments.
- `source.hash` — SHA-256 of the original source bytes (`file`, UTF-8 `text` or raw `bytes`).
  Changed source fails verification until `--update` is reviewed.
- `cases` — one or more scenarios:
  - `name` — unique within the manifest.
  - `stdin`/`stdout`/`stderr` — `{ "text": ... }`, `{ "bytes": [...] }` or
    `{ "file": "relative-file" }`, optionally with `hash`; omitted means empty.
    `hash` pins the resolved stream bytes, so editing an external input or
    expected-output file fails verification until `--update` is reviewed.
  - `args` — optional script arguments after `--`.
  - `exitCode` — required process status.

The JSON Schema is [schema/verification.schema.json](schema/verification.schema.json).
The runner performs equivalent structural validation in
[igniter/verify.ts](../igniter/verify.ts).

## Runner

```sh
./lite verify                    # only cases affected by git changes
./lite verify --all              # all cases; cached
./lite verify --all --update     # regenerate expected streams and hashes
./lite verify --coverage         # coverage report without executing
./lite verify --all --filter int.arithmetic
./lite verify --all --shard 1/4  # one CI shard
```

`--update` writes expected streams from the reference igniter, rewrites external
stdout/stderr files in place, and refreshes source and stream hashes. Review the
diff before committing; it is the only supported way to change expectations.
It updates the selected set, so use `--all --update` for a complete refresh.

`--filter` matches manifest IDs, paths or feature IDs.

The default target is the reference igniter. A manifest with
`targets: ["igniter", "ts", "c"]` also emits and runs the restricted TS and C
artifacts and compares the same expected streams. `--update` seeds expectations
from the igniter only; run `./lite verify --all` afterward to check every target.
Compiler-target coverage is currently limited to the four compatible feature
cases; broader compiler verification remains in
[igniter/tests/compiler](../igniter/tests/compiler/).

## Performance and scaling

The verifier is designed for a growing corpus, not a fixed case count:

- Interpreter cases execute in one Node process; compiler targets emit and run
  only for manifests that opt in.
- Passing results are cached in `.cache/verifications.json` (gitignored). The
  cache key includes the target, runner source hash, case source hash, expected
  streams, arguments and exit code. A runner or case change cannot reuse a stale pass.
- The default runs only manifests affected by the current `git status`:
  changed source/manifest files, plus artifacts tagged with a changed feature.
  Changes to the igniter or verification machinery select everything. A clean
  tree selects nothing; use `--all` for a complete gate. `--changed` remains an
  explicit alias for the default.
- `--shard i/n` deterministically partitions scenarios for CI workers.
- `--no-cache` forces execution; `--quiet` suppresses per-case PASS lines.
- Native compiler parity is a separate lane. Its builds are cached under
  `.cache/native/` by C source, compiler version and flags. `./lite test --fast`
  skips that lane; `./lite test` / `./lite test --full` include it.

Target budgets:

| Command | Scope | Target |
|---|---|---|
| `lite verify` | affected scenarios | < 5s |
| `lite verify --all` | all interpreter/artifact cases, warm cache | < 1s |
| `lite test --fast` | unit/interpreter/verification without native C | ~15s |
| `lite test` / `lite test --full` | full local gate, native builds cached | ~15s warm |
| `lite verify --all --shard i/n` | one CI shard of the full matrix | bounded |

At 10k+ cases, the default local lanes must not compile every native case.
Feature/artifact verification remains in-process, full native coverage is
sharded or curated, and caches make unchanged work nearly free.

## Coverage status

- Features: 26 registered, 26 cases.
- Examples: 19 of 19 manifest-covered.
- Samples: 20 of 20 manifest-covered.
- Showcases: reserved, no manifests yet.
- Scenarios: 65 (26 feature + 19 example + 20 sample); 79 target executions
  because seven feature cases run through all three targets.

Coverage is now a blocking gate: `./lite verify --coverage` exits nonzero if any
feature, example or sample lacks a manifest. Showcases are allowed to remain
empty until that artifact class is introduced. CI wiring is still a later step;
today `./lite verify --coverage` and `./lite test` are the local gates.

## Adding a case

1. Add the `.lts` source.
2. Add the manifest with id, kind, `source.file`/`source.text`/`source.bytes`, features,
   guideline/description and cases.
3. Register a new feature in `features.json` if needed.
4. Run `./lite verify --all --update`, review the generated streams/hash, then
   run `./lite verify --all`.
5. Run `./lite test` from the repository root; the suite includes verification
   and coverage checks. Use `./lite test --fast` for the no-native lane.

Feature cases are deliberately independent of examples. Do not use an example
as the only verification for a language feature, and do not make a feature case
carry pedagogical explanation beyond its guideline.
