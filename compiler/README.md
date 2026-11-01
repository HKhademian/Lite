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

P4 moves the compiler source under `src/` and makes manifest order
authoritative. Compiler source and `lib/core` no longer use `importFlatAll`; the
old emitter paths are generated compatibility bundles. The manifest schema,
line-map contract and current hashes are recorded in:

- [`manifests/README.md`](manifests/README.md) — manifest and line-map
  contract; the P1 loader and driver are implemented.
- [`baseline.md`](baseline.md) — P0 counts, source hashes, reference artifacts
  and test evidence.
- [`parity.md`](parity.md) — stage-0 versus generated-compiler burndown; the
  current TS/C parity target and difference log.
- [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) —
  emitted-artifact hashes for all 50 program cases.

The bundle path is green: [`../igniter/loader.ts`](../igniter/loader.ts) loads
the ordered manifests, and [`../igniter/bootstrap.ts`](../igniter/bootstrap.ts)
compiles and runs them with flattened-position diagnostics mapped back to the
original files. `litec` uses
[`../igniter/bundle-cli.ts`](../igniter/bundle-cli.ts). P2 adds the provisional
L0 helpers under [`../lib/core/`](../lib/README.md): checked Int, text, source
positions, diagnostics, formatting and list search. P3 adds the Lite lexer and
P4 the parser under `src/`; `runtime/` remains a P6/P7 placeholder.

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
| [`src/frontend.lts`](src/frontend.lts) | Shared parser, checked Int evaluation, String/Int locals, report statement stream |
| [`src/ts-literals.lts`](src/ts-literals.lts) | TypeScript literal encoding |
| [`src/emit-ts.lts`](src/emit-ts.lts) | TypeScript report formatting and program emission |
| [`src/driver-ts.lts`](src/driver-ts.lts) | TypeScript driver entry |
| [`src/c-literals.lts`](src/c-literals.lts) | C literal encoding |
| [`src/emit-c.lts`](src/emit-c.lts) | C `printf` report formatting and program emission |
| [`src/driver-c.lts`](src/driver-c.lts) | C driver entry |
| [`src/lexer.lts`](src/lexer.lts) | P3 Lite-written lexer |
| [`src/parser.lts`](src/parser.lts) | P4 parser: types, declarations, expressions, statements and functions |
| [`src/check.lts`](src/check.lts) | P5 checker: symbols, scopes, types, arity, conditions and mutation grants |
| [`tests/lexer/`](tests/lexer/) | Focused lexer fixtures, dump driver and expected tokens |
| [`tests/parser/`](tests/parser/) | Focused parser fixtures, dump drivers and expected nodes |
| [`tests/checker/`](tests/checker/) | Checker fixtures, dump driver and expected symbols |
| [`ts-emitter.lts`](ts-emitter.lts) | Generated compatibility bundle for the TS manifest |
| [`c-emitter.lts`](c-emitter.lts) | Generated compatibility bundle for the C manifest |
| [`runtime/ts/runtime.ts`](runtime/ts/runtime.ts) | P6 TS runtime: checked Int64, code-point text, list copies, faults and exit |
| [`generated/report-42.ts`](generated/report-42.ts) | Checked-in TS reference for `report(42);` |
| [`generated/report-42.c`](generated/report-42.c) | Checked-in C reference for `report(42);` |
| [`generated/run-report.ts`](generated/run-report.ts) | Visible Node adapter for the TS reference |
| [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) | P0 emitted-artifact hashes for the 50 program cases |

The backend source is split by role and assembled by manifest order. The
compatibility `ts-emitter.lts` and `c-emitter.lts` files are generated flattened
bundles, not hand-edited sources.

## Documentation style

Every type alias and function in this directory carries a `/** ... */` doc
comment describing its contract, checked-value meaning, and failure behavior
(especially diagnostics/status 2). Comments explain intent and invariants; the
executable contract remains the verification cases under
[`../igniter/tests/compiler/`](../igniter/tests/compiler/).

## Manifest assembly

Compiler source is multi-file but has no `import`/`export` syntax. The ordered
manifests in [`manifests/`](manifests/README.md) list the files for each target;
the loader splices them into one flattened bundle with a line map. Dependency
order is semantic because Lite has no forward function lookup: literal encoders
come before the shared front-end, and the front-end comes before the emitter and
driver.

`litec` compiles through
[`../igniter/bundle-cli.ts`](../igniter/bundle-cli.ts), which loads the manifest
bundle and runs the target driver. The old `ts-emitter.lts` and `c-emitter.lts`
paths are generated compatibility bundles that match the manifest output; edit
`src/` and regenerate them, do not edit the bundles.

The temporary `importFlatAll` loader directive remains only in test helpers
under `compiler/tests/` and `lib/tests/`; compiler source and `lib/core` do not
use it. It is not part of the permanent module/import design.

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
assignment), `report(...)`, `if`/`else`, Boolean or unconditional `loop`,
transparent top-level type aliases (`Name := type Type;`), top-level
functions with Int/String/Bool/Unit, flat named-tuple or `List<T>` parameters and
results, positional calls, recursion/`self` and `return`. Aliases resolve to
Int/String/Bool/Unit, a flat named tuple, `List<T>`, or another alias and may
appear in local, parameter and result annotations. Flat named tuples use
`(label: Type, ...)` types, `(label = value, ...)` construction and `.label`
reads with Int/String/Bool components. `List<T>` accepts scalar or flat
named-tuple elements, `[value, ...]` construction, contextual `[]`, and checked
`values[index]` reads with an Int index. `loop sequence as item { ... }`
traverses a List value once, binding a read-only item local of the element kind
that is scoped to the loop body and may shadow an outer name; tuple elements
support `.label` reads. Total value
`if condition { expression } else if condition { expression } else { expression }`
expressions are accepted in initializers, assignments, arguments, returns and
function-tail positions; every branch must produce one expression of the same
kind and a final `else` is required. Unnamed tuples, nested tuples, nested lists,
destructuring, spread, list reporting/equality and arrays remain rejected. Constant-only expressions
keep their compile-time folding and range/division diagnostics; runtime
expressions lower to target control flow and a runtime report accumulator for TS
or direct `printf` calls for C. Dynamic `/ % :/ :%` and dynamic String
concatenation lower to checked helpers; TS emits ordinary left-to-right `+`
concatenation, while C calls a byte-copying helper whose per-concatenation
allocations are intentionally leaked by this bootstrap slice. `break`/`continue`
are rejected with explicit diagnostics, and dynamic C integer overflow is not
checked. Function syntax, tuple values, list values and total value `if` expressions are
emitted as runnable TS; the C path rejects them with a clear status-2
diagnostic. List values lower to TS arrays and a checked `lite$listAt` helper;
list traversal lowers to a TS `for...of` loop and the C path rejects it clearly.
List copies are emitted on declaration, assignment, argument passing and return,
so list mutation cannot share state.
`match`, runtime input and self-rebuild remain outside this slice. Reserved
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
