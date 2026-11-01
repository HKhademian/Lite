# Lite compiler prototype

This directory is the first Lite-written compiler stage. It is **not** an
example collection and not the igniter: the sources here are Lite programs that
parse a restricted Lite subset and emit TypeScript or C. The igniter in
[`../igniter/`](../igniter/) executes them today.

The staged path from this prototype to runnable TS/C bootstrap compilers is the
[bootstrap and self-hosting plan](../docs/bootstrap-plan.md). It is an
implementation plan; it does not change the restricted compiler's current
contract or select new language syntax.

## Bootstrap source subset

These Lite sources are also the bootstrap source **S**. S must remain inside the
bootstrap subset **L** defined in the
[bootstrap plan](../docs/bootstrap-plan.md#compiler-source-subset-l). Do not add
`match`, records, enums, unions, `Float`, arrays, closures, `mut` parameters,
modules, `finally`, loop metadata or compound operators to S just because the
igniter supports them. Adding a construct to L is an owner decision, not an
implementation convenience: the compiler must parse, check and lower it too.

The current files stay in place through P1; P4 makes manifest order
authoritative and removes `importFlatAll`. The target layout, manifest schema,
line-map contract and current hashes are recorded in:

- [`manifests/README.md`](manifests/README.md) — manifest and line-map
  contract; the P1 loader and driver are implemented.
- [`baseline.md`](baseline.md) — P0 counts, source hashes, reference artifacts
  and test evidence.
- [`parity.md`](parity.md) — stage-0 versus generated-compiler burndown; the
  current TS/C parity target and difference log.
- [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) —
  emitted-artifact hashes for all 50 program cases.

The P1 bundle path is green: [`../igniter/loader.ts`](../igniter/loader.ts)
loads the current single-file manifests, and
[`../igniter/bootstrap.ts`](../igniter/bootstrap.ts) compiles and runs them with
flattened-position diagnostics mapped back to the original files. P2 adds the
provisional L0 helpers under [`../lib/core/`](../lib/README.md): checked Int,
text, source positions, diagnostics, formatting and list search. Both manifests
list those files before the emitter, and the compiler uses them without changing
the 50/42 artifact and diagnostic baseline. `lib/core/test.lts` and `lib/tests/`
are test-only. The `src/` and `runtime/` directories remain P4 placeholders; no
source has moved into them yet.

Stage 0 is feature-frozen during bootstrap (B8/B11). Do not add igniter-only
features to make compiler work easier; new capability belongs in L/S and the
compiler slice first. The remaining stage-0 versus generated gap is tracked in
[`parity.md`](parity.md).

## Layout

| Path | Role |
|---|---|
| [`baseline.md`](baseline.md) | P0 baseline counts, source hashes, reference artifacts and test evidence |
| [`parity.md`](parity.md) | Stage-0 versus generated-compiler burndown and difference log |
| [`manifests/`](manifests/README.md) | Manifest schema, line-map contract and current TS/C manifests; P1 loader and driver implemented |
| `src/` | Target directory for split bootstrap sources (P4; empty) |
| `runtime/` | Target directory for target runtimes (P6/P7; empty) |
| [`frontend.lts`](frontend.lts) | Shared parser, checked Int evaluation, String/Int locals, report statement stream |
| [`ts-emitter.lts`](ts-emitter.lts) | TypeScript literal encoding, report formatting and program emission |
| [`c-emitter.lts`](c-emitter.lts) | C literal encoding, `printf` report formatting and program emission |
| [`generated/report-42.ts`](generated/report-42.ts) | Checked-in TS reference for `report(42);` |
| [`generated/report-42.c`](generated/report-42.c) | Checked-in C reference for `report(42);` |
| [`generated/run-report.ts`](generated/run-report.ts) | Visible Node adapter for the TS reference |
| [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) | P0 emitted-artifact hashes for the 50 program cases |

The backends contain no duplicated parser. They define only the target-specific
literal encoders and `emitProgram`, then include the shared front-end.

## Documentation style

Every type alias and function in this directory carries a `/** ... */` doc
comment describing its contract, checked-value meaning, and failure behavior
(especially diagnostics/status 2). Comments explain intent and invariants; the
executable contract remains the verification cases under
[`../igniter/tests/compiler/`](../igniter/tests/compiler/).

## Temporary `importFlatAll`

The front-end is included with:

```text
importFlatAll "frontend.lts";
```

This is a **temporary source-loader workaround**, not a language feature:

- A top-level line `importFlatAll "path";` is replaced by the UTF-8 source of
  that file, resolved relative to the importing file.
- Imported declarations share one flat namespace.
- Each file is included at most once per load; cycles are rejected.
- Imported files are expected to be declaration-only. Do not put executable
  top-level statements in a flat-imported file.
- The loader is implemented in [`../igniter/loader.ts`](../igniter/loader.ts)
  and used by `./lite run`, `./lite run --check`, `litec`, and the test helpers.
  It is not part of the permanent module/import design.

## Run the compiler

```sh
./litec --target ts program.lts > program.ts
./litec --target c program.lts > program.c
```

Equivalent forms:

```sh
./lite compile --target ts program.lts
./ltc ts program.lts
```

The component/package is `lite-compiler`; its entry points are `ltc` (short
command), `litec` (full binary) and `lite compile` (CLI form). Both binaries also
accept the target as a bare positional word: `./ltc ts program.lts`.

The compiler source is still restricted, but the accepted surface now includes
Int/String/Bool expressions, immutable and mutable locals (`:=`, `var`,
assignment), `report(...)`, `if`/`else`, and Boolean or unconditional `loop`.
Constant-only expressions keep their compile-time folding and range/division
diagnostics; runtime expressions lower to target control flow and a runtime
report accumulator for TS or direct `printf` calls for C. Dynamic
`/ % :/ :%` and dynamic String concatenation are rejected with explicit
diagnostics, `break`/`continue` are not implemented yet, and dynamic C integer
overflow is not checked. Functions, tuples/lists/arrays, `match`, runtime
input, typed declarations and self-rebuild remain outside this slice. Reserved
features outside the subset are rejected by name with status 2.

Diagnostics are source-positioned as `name:line:column: message` (or
`line:column: message` when no logical source name is supplied). Columns are
1-based source characters, computed from immutable offsets. Unsupported
reserved features name the feature, point to its documentation, and repeat the
accepted subset, for example:

```text
verifications/features/loop-metadata.lts:1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, report, if/else and loop only
```

The frontend still scans offsets directly; a separate reusable token stream is
future lexer work, not part of this checkpoint.

The current accepted surface is separate from the small language used to write
the compiler itself; see the [bootstrap plan](../docs/bootstrap-plan.md). Range faults, division by zero and mixed-type operations are
compile-time rejections. Generated TS uses BigInt; generated C uses
`int64_t`/`INT64_C` and `printf` with `PRId64`.

Verification cases and expected streams live in
[`../igniter/tests/compiler/`](../igniter/tests/compiler/); the schema is in
[`../igniter/tests/README.md`](../igniter/tests/README.md). Run the suite with
`npm test` from `../igniter/`.

See [INV-061](../investigations/INV-061-string-and-multi-value-reports.md) for
the current evidence and limits.
