# INV-073 — Feature and artifact verification registry

Status: recorded (first slice implemented; full artifact coverage, compiler targets and CI remain open)
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
`guideline`/`description`/`append`, and `cases`. `source` holds exactly one of
`file` or `text` plus an optional `hash`. A case records
`stdin`/`stdout`/`stderr` streams (`text`, `bytes` or `file`), optional `args`,
and `exitCode`. The stream model matches the compiler verification fixtures.

`source.hash` covers the original source bytes (file bytes or UTF-8 text). Editing an artifact without
reviewing its expectations fails verification until `--update` is run and its
diff is accepted. `append` lets the verifier observe sample values without
adding `report` calls to the lesson body.

## Runner

[`igniter/verify.ts`](../igniter/verify.ts) is exposed as `./lite verify`:

- default: run every case through the reference igniter, compare exact streams
  and exit codes, and fail on source-hash drift;
- `--update`: regenerate expected streams/hashes for review;
- `--coverage`: report feature/artifact coverage without executing;
- `--filter <id-or-path>`: select manifests.

The runner validates the feature registry, manifest structure, source file/text
fields, feature references, stream forms and duplicate IDs. It is the local gate; CI
wiring is a later step.

## First slice

- **17 feature cases**: Int arithmetic, Bool/conditionals, conditional and
  sequence loops, recursion, tuples, fixed arrays, mutable lists, text helpers,
  transparent aliases, block locals, var assignment, inputInt, inputArgs,
  inputAll, exit and multi-value report.
- **5 examples** (001, 006, 016, 020, 021).
- **3 samples** (001, 002, 020). The migration plan named samples 021 and 023,
  but only 001–020 exist; 002 and 020 are used instead.
- **25 scenarios** total.

The samples are teaching bodies that print nothing. Their manifests verify
computed values through `append` observation calls, leaving the sample files
unchanged. Feature cases remain separate from the sample text.

## Evidence

- All 25 scenarios pass `./lite verify`.
- `./lite verify --coverage` reports 17/17 features, 5/19 examples, 3/20
  samples and 0 showcases.
- All **161 interpreter test groups** pass under Node 26.12.1/TypeScript 7.0.2;
  all 9 editor grammar groups pass; strict `tsc --noEmit` passes.
- New tests cover the verifier pass, coverage report and filtered run.

## Limits

- Only the reference igniter target is executed. Compiler-target feature cases
  (`targets: ["igniter", "ts", "c"]`) and migration of the compiler corpus are
  later steps.
- Coverage is informational, not yet blocking. Most examples and samples still
  have no manifest, and there are no showcase manifests or transcripts.
- No CI workflow or pre-commit integration exists yet; `./lite verify` must be
  run explicitly.
- `--update` rewrites expectations from the current reference implementation;
  review is required and is not automated.
- `append` concatenates source text for observation; it cannot add declarations
  that shadow sample bindings or inspect intermediate scopes.
