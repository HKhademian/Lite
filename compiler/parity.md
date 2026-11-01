# Bootstrap parity ledger

Status: **active, 2026-11-01**. This ledger drives the owner direction that the
TS igniter and the generated compilers converge into the same compiler for the
bootstrap surface. It is a burndown list, not a claim that parity already holds.

Immediate scope: the bootstrap subset L, S, and the 53 program / 39 rejection
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

T11/T12 acceptance, recorded 2026-11-02:

- [x] S includes the full-L front-end and emits TS directly.
- [x] Stage 0 + S produces T11.
- [x] T11 typechecks strictly and runs.
- [x] T11 + S produces T12.
- [x] T12 runs and records its hash.
- [x] `T12 == T11` byte for byte.
- [x] T11 compiles all 92 corpus cases exactly like stage 0: 53 program outputs
  and 39 rejection streams/status byte for byte.

TS ladder record, 2026-11-02:

| Node | Bytes | SHA-256 |
|---|---:|---|
| S (`compiler/manifests/ts.json`) | 155 219 | `827f90152433e65d2134f6e6df294d2c544b4bd665b879e9a3bd55d1eac343b8` |
| T11 | 243 216 | `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39` |
| T12 | 243 216 | `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39` |

T11 was produced by `./litec ts` from S. T12 was produced by T11 running on the
same S after a strict artifact typecheck. Both artifacts ran the probe source and
their emitted TS matched stage 0 byte for byte. T13 is the next TS node; it is
expected to equal T11/T12 but is not recorded yet.

Regenerate and re-check the ladder with one command:

```sh
node compiler/scripts/self-host.mjs --out /tmp/selfhost-run
```

Corpus parity for an emitted compiler:

```sh
node compiler/scripts/corpus-parity.mjs --artifact /tmp/T11.ts
```

The 2026-11-02 run compared T11 with stage 0 over all 92 cases in 7.7 s with
zero mismatches, covering emitted TS bytes, rejection stderr text and exit
status.

TS ladder commands:

```sh
# S is the ordered TS manifest bundle.
node --input-type=module -e 'import {loadBundle} from "./igniter/loader.ts"; process.stdout.write(loadBundle("compiler/manifests/ts.json").text);' > /tmp/S.lts
# T11 = stage 0 compiling S.
./litec ts /tmp/S.lts > /tmp/T11.ts
# T12 = T11 compiling S; the runner typechecks T11 strictly first.
node compiler/scripts/run-ts-artifact.mjs --artifact /tmp/T11.ts --source /tmp/S.lts --out /tmp/T12.ts
shasum -a 256 /tmp/S.lts /tmp/T11.ts /tmp/T12.ts
```

Slow-stage-0 compiles take minutes, so `compiler/scripts/run-ts-artifact.mjs`
keeps the artifact contract while dropping the harness's ten-second cap.

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
  checks, the 39 rejection cases retain exact diagnostics, and invalid programs
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
  branches. Action `if` chains admit any number of `else if` arms with Bool
  conditions and an optional final `else`, lowering to TS/C `else if` emission. A
  function-tail `if` whose branches hold statements now returns each branch's
  tail expression, which S relies on.
  Dynamic Int `/`, `%`, `:/` and `:%` lower to checked TS and C
  helpers that preserve zero-divisor and signed-minimum faults. Dynamic String
  concatenation lowers to ordinary left-to-right TS `+` and a checked C
  byte-copy helper whose allocations are intentionally leaked in this
  bootstrap slice. Bare nearest-loop `break`/`continue` lower in Boolean,
  unconditional and list-traversal loops; C admits the first two and still
  rejects list traversal. The C path
  rejects function syntax, tuple or list values, list
  traversal, value `if` and the new input/diagnostic/text builtins with clear
  status-2 diagnostics. TS/C output is emitted directly; no separate IR
  deliverable is planned. The full emitter, Node I/O adapter and T-from-S gate
  remain.
- Stage 0 is feature-frozen. P3-P8 add Lite compiler features, not igniter
  features; any new capability is a Lite-first owner decision.
- T00 exists. T11 and T12 are recorded and byte-identical; the TS fixed point is
  reached for the bootstrap surface. T13 and the C ladder are the next nodes.
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
| 2026-11-02 | TS | `report(f())` where `f` itself reports | Stage 0 prints `f`'s line before the outer line; the emitted `lite_out += f()` reads the accumulator before its arguments, so `f`'s line is dropped | emitter argument-order bug | open; no S site depends on it, fix with the P6 artifact-hash refresh |
| — | — | — | No generated compiler yet | — | — |
