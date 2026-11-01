# Bootstrap parity ledger

Status: **active, 2026-11-01**. This ledger drives the owner direction that the
TS igniter and the generated compilers converge into the same compiler for the
bootstrap surface. It is a burndown list, not a claim that parity already holds.

Immediate scope: the bootstrap subset L, S, and the 52 program / 40 rejection
cases. Replacing the TS igniter for features outside L is a larger owner
decision and is not assumed here.

## Terms

- **TS igniter / stage 0** — the preserved TypeScript implementation in
  [`../igniter/`](../igniter/README.md). It executes S.
- **S** — the Lite-written compiler source assembled from a manifest.
- **T00** — the stage-0 TS igniter.
- **T / C** — the TS and C compilers produced by stage 0 from S.
- **T2 / C2** — the artifacts T/C produce when they compile S again.

The parity loop compares stage 0 running S with T/C compiling the same Lite
source. At the fixed point, T/C replace stage 0 for the bootstrap surface.

## Bootstrap ladder

Owner notation, 2026-11-01. `CompileTS(X, lite)` means "run compiler X on the
Lite compiler source S and emit TS"; `CompileC(X, lite)` means the same with C
emission. Every comparison below is byte-for-byte artifact equality.

```text
TS chain:
T00 = stage-0 TS igniter
T11 = CompileTS(T00, lite)
T12 = CompileTS(T11, lite)
T13 = CompileTS(T12, lite)
TS fixed point: T11 == T12 == T13

C and cross-host chain:
C01 = CompileC(T00, lite)
C21 = CompileC(C01, lite)
T21 = CompileTS(C01, lite)
C22 = CompileC(C21, lite)
T22 = CompileTS(C21, lite)
C23 = CompileC(C22, lite)
T23 = CompileTS(C22, lite)
```

The owner's `T1 == T2 == T3` shorthand maps to the defined
`T11 == T12 == T13` nodes.

**Immediate priority: T00 → T11 → T12.** Stop after T12 is recorded; do not
start C01/P7 first. T11 is stage 0 running S on S and emitting TS. T12 is T11
running on S and emitting TS. A TS artifact and its execution are the deliverable;
no separate IR artifact is produced.

T11/T12 acceptance:

- [ ] S includes the full-L front-end and emits TS directly.
- [ ] Stage 0 + S produces T11.
- [ ] T11 typechecks strictly and runs.
- [ ] T11 + S produces T12.
- [ ] T12 runs and records its hash.
- [ ] `T12 == T11` byte for byte, or the first difference is recorded here.

Completion requires all of:

- C fixed point: `C01 == C21 == C22 == C23`
- TS-from-C fixed point: `T11 == T21 == T22 == T23`
- Every ladder node typechecks/runs and the 92-case corpus has exact streams
  and status.

The seed equalities `C01 == C21` and `T11 == T21` are the stage-0 versus
generated-compiler row. Treat them as required unless the owner records a
different completion rule before claiming the ladder is finished.

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
- P3 adds the Lite lexer under `compiler/src/`; it tokenizes expanded S, the C
  emitter, the lexer sources and every compiler case. No parser or emitter
  behavior changed.
- P4 is complete: the parser parses expanded S, L0, the lexer and all program
  cases; manifest order is authoritative, compiler source and `lib/core` have no
  `importFlatAll`, and unsupported declarations reject by name.
- P5 is complete: the checker covers top-level symbols, block scopes, local
  types, initializers/assignments, Bool conditions, arity/arguments/returns,
  tuple/list/field/index types, mutation grants and break/return placement. S
  checks, the 40 rejection cases retain exact diagnostics, and invalid programs
  do not emit artifacts.
- P6 is in progress: the TS runtime covers checked Int64 arithmetic, code-point
  text, list copies, faults and exit; the compiler now accepts typed scalar
  locals, nested/doc/raw comments, transparent scalar and flat named-tuple type
  aliases, flat named-tuple construction and field reads, top-level functions
  with positional calls, recursion/`self` and `return`, and growable `List<T>`
  types, literals, checked indexing, `loop sequence as item` traversal and
  `push_back`/`pop_back` mutation with copies in the TS path. Total value `if`
  expressions with same-kind branches lower to TS conditional expressions in
  value positions. Checked `inputArgs`/`inputAll`/`reportError`/`exit` and
  code-point `textLength`/`textAt`/`textSlice` calls lower to self-contained TS
  helpers in expressions, Unit statements, functions, loops and value `if`
  branches. Dynamic Int `/`, `%`, `:/` and `:%` lower to checked TS and C
  helpers that preserve zero-divisor and signed-minimum faults. The C path
  rejects function syntax, tuple or list values, list
  traversal, value `if` and the new input/diagnostic/text builtins with clear
  status-2 diagnostics. TS/C output is emitted directly; no separate IR
  deliverable is planned. The full emitter, Node I/O adapter and T-from-S gate
  remain.
- Stage 0 is feature-frozen. P3-P8 add Lite compiler features, not igniter
  features; any new capability is a Lite-first owner decision.
- T00 exists. T11/T12 are the immediate target and are blocked on the full-L TS
  emitter. T13 and the C ladder wait until T12 is recorded.
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
