# Verifications

Feature verifications are the canonical semantic contract. Examples, samples and
showcases are verified **consumers** of those features, not the contract itself.

The same runner executes both:

- **Feature cases** are small, focused and may be ugly. They verify one feature
  or edge condition and carry a short guideline.
- **Artifact cases** verify that a polished example/sample/showcase still runs
  and produces its documented streams. Samples may append observation calls via
  `append` instead of putting `outputLine` calls into teaching material.

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
- `targets` — historical target coverage metadata (`igniter`, `ts`, `c`).
  During TS migration, ordinary verification always uses the generated TS
  compiler, including manifests that previously defaulted to T00. The explicit
  `--reference` lane uses T00 only. C execution is deferred; old metadata is
  preserved without counting a C pass. Unsupported TS forms fail visibly with
  their diagnostics, without fallback or an implicit skip. TS artifacts are
  strictly checked once per manifest, then each input/argument scenario runs in
  a fresh process. Cache identities include the selected lane, generated seed,
  assembled TS compiler, host/artifact adapters and pinned checking tools.
  Compiler/library changes select affected consumers in changed-case mode;
  inventory-only documentation edits do not invalidate runtime cases.
- `source.hash` — SHA-256 of the original source bytes (`file`, UTF-8 `text` or raw `bytes`).
  Changed source fails verification until `--update` is reviewed.
- `cases` — one or more scenarios:
  - `name` — unique within the manifest.
  - `stdin`/`stdout`/`stderr` — `{ "text": ... }`, `{ "bytes": [...] }` or
    `{ "file": "relative-file" }`, optionally with `hash`; omitted means empty.
    `hash` pins the resolved stream bytes, so editing an external input or
    expected-output file fails verification until `--update` is reviewed.
  - `args` — optional program argument values, passed directly to the artifact.
  - `exitCode` — required process status.

The JSON Schema is [schema/verification.schema.json](schema/verification.schema.json).
The runner performs equivalent structural validation in
[igniter/verify.ts](../igniter/verify.ts).

## Runner

General command, compile/emission, rejection and isolated file cases use the
[declarative case runner](../cases/README.md). Run one with
`./lite verify PATH.case.json`; the existing feature/artifact verifier and its
changed-case, cache, shard and explicit-reference modes remain available below.

```sh
./lite verify                    # only cases affected by git changes
./lite verify --all              # all TS artifact cases; cached; remaining ports fail
./lite verify --all --reference  # explicit historical T00 comparison
./lite verify --all --update     # regenerate expected streams and hashes
./lite verify --coverage         # coverage report without executing
./lite verify --all --filter int.arithmetic
./lite verify --all --shard 1/4  # one CI shard
```

`--update` writes expected streams from the generated TS artifact by default.
`--reference --update` explicitly uses T00. It rewrites external stdout/stderr
files and refreshes source/stream hashes; review the diff before committing.
Only manifests whose selected scenarios all succeed are rewritten. Unsupported
source never obtains expectations from an implicit fallback. Use `--all` to
refresh the complete selection.

`--filter` matches IDs, paths and feature IDs, so selecting `int.arithmetic`
also selects consumers tagged with that feature. Use `features/int-arithmetic.json`
for only that canonical manifest. Shards partition scenarios before execution.

The default TS audit currently executes 81 scenarios: 60 pass and 21 fail
(13 feature contracts and eight examples still need TS ports). All 81 pass the
explicit T00 reference lane. The [live gaps](../compiler/gaps.md) and
[current inventory](../compiler/reports/current-t00-t11-inventory.md) track the
remaining work. Coverage reports only manifest registration, not compiler support.

## Performance and scaling

The verifier is designed for a growing corpus, not a fixed case count:

- TS compilation and strict checking happen once per selected manifest, with
  isolated fresh executions for each input. Fully cached manifests need neither
  compilation nor checking. T00 executes only with `--reference`.
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
- Native compiler parity is deferred until after TS migration. Its retained
  historical checks use `.cache/native/`; neither default test mode executes
  native C during this migration. `./lite test --full` includes the generated
  full-source phase sweeps; `--fast` omits them. T00 regression checks require
  `./lite test --reference`.

Target budgets:

| Command | Scope | Target |
|---|---|---|
| `lite verify` | affected scenarios | < 5s |
| `lite verify --all` | all interpreter/artifact cases, warm cache | < 1s |
| `lite test --fast` | generated TS regressions without full-source sweeps | ~15s |
| `lite test` / `lite test --full` | generated TS regressions and full-source phase sweeps | ~15s warm |
| `lite verify --all --shard i/n` | one CI shard of the full matrix | bounded |

At 10k+ cases, the default local lanes must not compile every native case.
Explicit T00 reference feature/artifact verification remains in-process; generated TS uses isolated
child processes with strict artifact checks. Full native coverage is
sharded or curated, and caches make unchanged work nearly free.

## Coverage status

- Features: 38 registered, 38 case manifests.
- Examples: 19 of 19 manifest-covered.
- Samples: 20 of 20 manifest-covered.
- Showcases: reserved, no manifests yet.
- Scenarios: 78 (39 feature + 19 example + 20 sample); 100 target executions.
  Eight original feature cases use all three targets; the new temporary I/O
  feature supplies two scenarios on T00 and generated TS.

Coverage is now a blocking gate: `./lite verify --coverage` exits nonzero if any
feature, example or sample lacks a manifest. Showcases are allowed to remain
empty until that artifact class is introduced. The GitHub Actions workflow
[.github/workflows/test.yml](../.github/workflows/test.yml) runs the strict
TypeScript check, `./lite test`, the coverage gate and the editor grammar tests.
`./lite verify --coverage` and `./lite test` remain the local gates.

## Refreshing artifacts after a language change

Feature work is not complete until the existing examples and samples have been
audited for workarounds the feature replaces. Rewrite them when that makes the
artifact clearer, but preserve an artifact whose purpose is to demonstrate the
replaced construct. Update its manifest hashes/streams with `--update`, then run
the coverage and full verification gates. Feature cases remain the contract;
examples and samples are verified consumers. See the
[artifact-refresh checklist](../docs/tooling-and-learning.md#refreshing-artifacts-after-a-language-change).

## Adding a case

The [compiler development guidelines](../.agents/rules/compiler-development.md) require
multiple focused cases and combined-feature cases for each feature, syntax/spec
change, bug fix and edge-case correction. Use named scenarios for different
inputs and separate sources for distinct forms. Include boundaries and invalid
counterparts, and select supported generated targets explicitly; the default
igniter target alone does not establish compiler support. Proposed or flagged
syntax tests remain experimental until accepted and must not be registered as
selected language support merely because they run.

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
