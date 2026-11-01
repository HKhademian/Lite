# Bootstrap parity ledger

Status: **active, 2026-11-01**. This ledger drives the owner direction that the
TS igniter and the generated compilers converge into the same compiler for the
bootstrap surface. It is a burndown list, not a claim that parity already holds.

Immediate scope: the bootstrap subset L, S, and the 50 program / 42 rejection
cases. Replacing the TS igniter for features outside L is a larger owner
decision and is not assumed here.

## Terms

- **TS igniter / stage 0** — the preserved TypeScript implementation in
  [`../igniter/`](../igniter/README.md). It executes S.
- **S** — the Lite-written compiler source assembled from a manifest.
- **T / C** — the TS and C compilers produced by stage 0 from S.
- **T2 / C2** — the artifacts T/C produce when they compile S again.

The parity loop compares stage 0 running S with T/C compiling the same Lite
source. At the fixed point, T/C replace stage 0 for the bootstrap surface.

## Rule

For one Lite source at a time, starting with the compiler corpus and then S:

1. Run stage 0 and the generated target compiler over the same source.
2. Compare status, stdout and stderr byte for byte. For emitted TS/C, compare
   hashes and diff the exact artifact.
3. Record only the first difference in the log below.
4. Classify it as a missing T/C feature, a stage-0 feature S depends on but T/C
   lack, or nondeterminism.
5. Add the smallest compiler slice that removes it and rerun.
6. Keep going until `T2 == T`, `C2 == C` and the corpus matches.

Do not normalize a diff before its cause is understood (bootstrap default B6).
Do not widen S or L just to simplify parity.

## Feature gap

Stage 0 already supports more than L. That extra surface is frozen debt, not a
target to expand. New capability is Lite-first: add it to L/S and the compiler
slice, then give stage 0 only the minimal execution support needed to run S.

| Area | Stage 0 | L/S | T/C | Status |
|---|---|---|---|---|
| Bootstrap surface: Int/String/Bool, flat tuples, lists, typed functions, `if`/`loop`, `report`/input helpers | yes | yes | P3-P7 | close |
| Igniter-only surface: Float, fixed arrays, `match`, loop metadata, `finally`, compound updates, closures and other non-L forms | yes | no | no | frozen; do not add more; port only by owner decision |
| New capability | no | no | no | Lite-first owner decision; never stage-0-first |

The bootstrap parity gate needs only the first row. Full replacement of the TS
igniter for every existing feature is a separate, larger decision; the freeze
keeps that target from growing while it is approached.

## Current state

- P1 bundle tooling is green: direct flat-import and bundle paths produce
  byte-identical artifacts and exact diagnostics for all 92 compiler cases.
- P2 L0 helpers exist under `lib/core/` with direct Lite tests. The compiler
  imports them without changing the 50/42 artifact and diagnostic baseline.
- Stage 0 is feature-frozen. P2-P8 add Lite compiler features, not igniter
  features; any new capability is a Lite-first owner decision.
- T and C do not exist yet, so there is no stage-0-versus-generated row.
- The P0 artifact hashes in
  [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) are
  the reference for the 50 program cases.

Useful internal tools:

- [`../igniter/bootstrap.ts`](../igniter/bootstrap.ts): `RunResult`,
  `loadCompiler`, `runText`/`runFile`/`runBundle`, `hashBytes`,
  `nondeterminismReasons`.
- [`../igniter/artifacts.ts`](../igniter/artifacts.ts): strict TS typecheck/run
  and C build/run with `-std=c11 -Wall -Wextra -Werror`.

## Difference log

| Date | Target | Source | First difference | Class | Resolution |
|---|---|---|---|---|---|
| — | — | — | No generated compiler yet | — | — |
