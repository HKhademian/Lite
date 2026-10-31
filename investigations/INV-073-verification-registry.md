# INV-073 — Feature and artifact verification registry

Status: recorded (first slice implemented; broader compiler targets and showcases remain open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-073](TOPICS.md#inv-073)

## Problem

Examples, samples, showcases and tests all carried expectations, but there was no
single source of truth. `igniter/test.ts` held inline language expectations,
compiler cases lived in `igniter/tests/compiler/`, and sample outcomes were
appended inside test code. Artifacts could drift without a dedicated failure.

## Selected model

Separate two roles while sharing one runner:

- **Feature verification** — a small, canonical case per language feature or
  edge. It is the semantic contract, may be minimal or ugly, and carries a short
  guideline.
- **Artifact verification** — a manifest for an example, sample or showcase.
  It proves the polished artifact still runs and produces its documented streams.
  It is a consumer of verified features, not the feature contract.

Both use the same JSON schema and executor. An example is never the only
verification for a feature, and a feature case is never required to be good
teaching material.

## Layout and schema

[`verifications/`](../verifications/README.md) contains:

- `schema/verification.schema.json` — manifest schema.
- `features.json` — feature registry: ID, summary, case path, status, docs.
- `features/<id>.lts` + `.json` — canonical cases.
- `artifacts/examples|samples|showcases/<id>.json` — artifact manifests.

A manifest records `id`, `kind`, `source`, `features`, optional
`guideline`/`description`/`append`/`targets`, and `cases`. `source` holds exactly one of
`file` or `text` plus an optional `hash`. A case records
`stdin`/`stdout`/`stderr` streams (`text`, `bytes` or `file`), optional `args`,
and `exitCode`. The stream model matches the compiler verification fixtures.

`source.hash` covers the original source bytes (file bytes or UTF-8 text);
each `stdin`/`stdout`/`stderr` stream can also carry a `hash` pinning its resolved
bytes. Editing an artifact without
reviewing its expectations fails verification until `--update` is run and its
diff is accepted. `append` lets the verifier observe sample values without
adding `report` calls to the lesson body.

## Runner

[`igniter/verify.ts`](../igniter/verify.ts) is exposed as `./lite verify`:

- default: run cases affected by the current git status through the reference
  igniter, verify source/stream hashes, compare exact streams and exit codes, and
  fail on drift; passing results are cached;
- `--all`: run every case instead of the affected set;
- `--update`: regenerate expected streams/hashes for review;
- `--coverage`: report feature/artifact coverage without executing;
- `--filter <id-or-path>`: select manifests;
- `--changed`: explicit alias for the default affected set;
- `--shard i/n`: deterministic CI sharding;
- `targets`: optional `igniter`/`ts`/`c`; compiler targets emit and run the
  restricted artifacts against the same expected streams;
- `--no-cache`/`--quiet`: execution and output controls.

Test access is also CLI-only:

- `./lite test --fast` — unit/interpreter/verification, no native C;
- `./lite test` / `./lite test --full` — full local gate with cached native builds.

The runner validates the feature registry, manifest structure, source file/text
fields, feature references, stream forms and duplicate IDs. It is the local gate; CI
wiring is a later step.

## First slice

- **28 feature cases**: Int arithmetic/remainder/limits/floor, Bool/conditionals,
  conditional and sequence loops, recursion, tuples, fixed arrays, mutable
  lists, text helpers/concatenation/escapes, transparent aliases, immutable
  locals, block locals, var assignment, inferred mutability, compound updates,
  power, subjectless match, inputInt, inputArgs, inputAll, exit, and multi-value reports.
- **All 19 examples** and **all 20 samples** have manifests.
- **67 scenarios / 83 target executions**; Int arithmetic, remainder, limits,
  floor division/modulo, String concatenation/escapes, multi-value reports and immutable locals run
  through the reference igniter, emitted TS and native C. Passing results are
  cached; the verifier supports `--all`, affected-only default, `--shard` and
  `--no-cache`.
- Coverage is blocking: `./lite verify --coverage` fails if any feature, example
  or sample lacks a manifest.

The samples are teaching bodies that print nothing. Their manifests verify
computed values through `append` observation calls, leaving the sample files
unchanged. Feature cases remain separate from the sample text.

## Evidence

- All 83 target executions pass `./lite verify --all`.
- `./lite verify --coverage` reports 28/28 features, 19/19 examples, 20/20
  samples and 0 showcases.
- All **166 interpreter test groups** pass under Node 26.12.1/TypeScript 7.0.2;
  all 9 editor grammar groups pass; strict `tsc --noEmit` passes.
- New tests cover the verifier pass, coverage report, filtered run, cache hit and
  shard selection.

## Limits

- Compiler-target feature coverage is limited to seven compatible cases
  (Int arithmetic, remainder, limits, String concatenation, escapes, multi-value
  reports, immutable locals); broader compiler verification remains in the
  compiler fixture corpus.
- Coverage is blocking for features, examples and samples. Showcase manifests
  and transcripts are still absent.
- GitHub Actions runs `./lite test`, the coverage gate and the editor grammar
  tests. Pre-commit integration still does not exist. Local budgets are
  documented in the verification README (affected inner loop, full lane with
  warm cache, sharded CI).
- `--update` rewrites expectations from the current reference implementation;
  review is required and is not automated.
- `append` concatenates source text for observation; it cannot add declarations
  that shadow sample bindings or inspect intermediate scopes.
