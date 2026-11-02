# Lite compiler prototype

This directory contains the Lite-written compiler and its bootstrap host. TS
compilation defaults to the verified generated **T11** compiler in
[`bootstrap/`](bootstrap/README.md). C compilation uses the Lite C emitter compiled
by T11 into a TS-hosted compiler, also preserved there with its source/builder
hashes. Both compile targets and compiler verification avoid T00. Interpreter
run/check still use T00 during the [owner-approved transition](transition-plan.md).
The accepted language remains
the restricted bootstrap subset, not the entire language design.

The [temporary I/O contract](../docs/tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02)
now supplies optional String prompts on inputAll/inputLine/inputInt/inputFloat
and replaces the report builtin with output and outputLine. The former adds no
newline; the latter always adds one, including with zero arguments. Generated TS
supports scalar/Unit, flat named-tuple and List display; inputFloat results can
be stored, passed and displayed, while wider Float expressions and fixed-array
contracts remain separate parity work. Process adapters stream output through an
optional main callback, preserving earlier output across faults. Calling main()
without that callback retains the return-text contract. The [I/O seed refresh](parity.md#temporary-io-migration)
records that snapshot's compiler artifacts. The subsequent
[helper-scan refresh](parity.md#single-pass-helper-discovery) collects target
runtime requirements once per program and records about 30% less compiler time
on paired output/self-source workloads, with exact emitted bytes preserved.

The [T00/T11 support inventory](reports/current-t00-t11-inventory.md) lists
measured missing forms, behavior/diagnostic differences, every maintained example
and sample, and source-file coverage. It includes exact-source boundary probes
and a reproducible audit script; it is an inventory, not a priority list or a new
language decision.

[`host.ts`](host.ts) checks the seed's SHA-256 and the current assembled Lite
source. Unchanged S uses the seed directly. Changed S is compiled by T11 and
strictly typechecked before publication under a source/builder-keyed
`.cache/compiler/` directory. Corrupt seeds/caches and rejected rebuilds fail
explicitly; there is no silent T00 fallback. `node compiler/scripts/build.ts`
selects or rebuilds both target compilers and prints their provenance. The
[text-cache optimization](../benchmark/reports/2026-11-02-text-cache.md) records
a 668 ms median self-compilation for its source snapshot on the recorded machine,
excluding strict checking. The [report-order refresh](parity.md#report-order-seed-refresh)
preserves nested report effects and records the current generated seeds.
Language implementation belongs in `src/` and `lib/core/`, not in the generated
seed or host glue.

The staged path from this prototype to runnable TS/C bootstrap compilers is the
[bootstrap and self-hosting plan](../docs/bootstrap-plan.md). It is an
implementation plan; it does not change the restricted compiler's current
contract or select new language syntax.

## Bootstrap source subset

Follow the [compiler development guidelines](../docs/compiler-development.md)
for all feature support, syntax changes, bug fixes and edge cases: implement in
Lite, add multiple focused and combined-feature cases, and verify generated
targets. New features may be used in compiler source after their contracts and
generated-igniter support have been accepted and checked. Flagged investigations
remain opt-in experiments, separate from accepted support.

These Lite sources are also the bootstrap source **S**. S must remain inside the
bootstrap subset **L** defined in the
[bootstrap plan](../docs/bootstrap-plan.md#compiler-source-subset-l). Do not add
`match`, records, enums, unions, `Float`, arrays, closures, `mut` parameters,
modules, `finally`, loop metadata or compound operators to S just because the
historical igniter supports them. Expand L through the guidelines' support and
seed acceptance gates before adopting a construct in S: the selected generated
compiler must parse, check and lower it too.

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
- [`generated/current-artifacts.json`](generated/current-artifacts.json) —
  current emitted-artifact hashes for all 64 program cases; the P0 hashes remain
  in `generated/baseline-artifacts.json`.

The bundle path is green: [`../igniter/loader.ts`](../igniter/loader.ts) loads
the ordered manifests, and [`../igniter/bootstrap.ts`](../igniter/bootstrap.ts)
compiles and runs them with flattened-position diagnostics mapped back to the
original files. `litec` uses [`cli.ts`](cli.ts): both targets use the generated
compiler host. [`../igniter/bundle-cli.ts`](../igniter/bundle-cli.ts) remains an
explicit historical/reference path. P2 adds the provisional
L0 helpers under [`../lib/core/`](../lib/README.md): checked Int, text, source
positions, diagnostics, formatting and list search. P3 adds the Lite lexer and
P4 the parser under `src/`; `runtime/ts/` contains the P6 runtime support.

Historical self-hosting runs outlasted the ten-second cap in
[`../igniter/artifacts.ts`](../igniter/artifacts.ts). The ladder uses
[`scripts/run-ts-artifact.ts`](scripts/run-ts-artifact.ts). It applies the same
strict artifact typecheck and `main()` adapter, then runs the artifact with fixed
stdin and no timeout:

```sh
node compiler/scripts/run-ts-artifact.ts \
  --artifact /tmp/T11.ts --source /tmp/S.lts --out /tmp/T12.ts
```

Stage 0 is feature-frozen during bootstrap (B8/B11). Do not add igniter-only
features to make compiler work easier; new capability belongs in L/S and the
compiler slice first. The remaining stage-0 versus generated gap is tracked in
[`parity.md`](parity.md).

Comparison chains now retain middle operands once and skip later operands on both
generated targets over their admitted scalar types. All 260 full tests pass with
zero skips (49.4 s); inventory is 79/164 matching cases, 85 remaining. The new
canonical chain feature executes on all three targets. See the [chain ledger](parity.md#comparison-chain-lowering)
for fixed-point, sanitizer and paired speed evidence. Broader types, Never-valued
exit typing, native C and run/check migration remain pending.


Empty and comment-only scripts now compile silently on generated TS/C, with
malformed comments still rejected before effects. The corpus is 63 programs and
30 rejections; existing 61 artifact pairs are unchanged. The parser skips alias
scanning and remaining state allocation for empty scripts. See the [empty-script
ledger](parity.md#empty-script-support) for generated bootstrap and paired timing evidence.


Simple statement separators now follow EOF, closing scopes and directly closed
block initializers on generated targets. Adjacent output calls still require a
separator and reject before effects. The corpus is 64 programs/29 rejections;
all 63 older artifact pairs stay identical. See the [statement-boundary ledger](parity.md#statement-boundaries)
for coverage, generated bootstrap and paired timing evidence.


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
| [`generated/report-42.ts`](generated/report-42.ts) | Checked-in TS reference for `outputLine(42);` |
| [`generated/report-42.c`](generated/report-42.c) | Checked-in C reference for `outputLine(42);` |
| [`generated/run-report.ts`](generated/run-report.ts) | Visible Node adapter for the TS reference |
| [`generated/baseline-artifacts.json`](generated/baseline-artifacts.json) | P0 emitted-artifact hashes for the 50 program cases |
| [`scripts/run-ts-artifact.ts`](scripts/run-ts-artifact.ts) | Strict-typechecks and runs one emitted TS artifact with fixed stdin and no harness timeout |
| [`scripts/self-host.ts`](scripts/self-host.ts) | Runs the S → T11 → T12 ladder and reports hashes and fixed-point status |
| [`scripts/corpus-parity.ts`](scripts/corpus-parity.ts) | Compares an emitted TS compiler with stage 0 across every compiler corpus case |

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

`litec` compiles through [`cli.ts`](cli.ts), selecting the current T11-derived
target compiler. The old `ts-emitter.lts` and `c-emitter.lts`
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
assignment), `outputLine(...)`, action `if`/`else if`/`else`, Boolean or unconditional `loop`,
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
destructuring, spread, list equality and arrays remain rejected. Valid constant expressions retain compile-time folding. Arithmetic panics,
including constant ones, execute only when reached; invalid literals/types
still reject before effects. Other runtime
expressions lower to target control flow and a runtime report accumulator for TS
or direct `printf` calls for C. Dynamic `/ % :/ :%` and dynamic String
concatenation lower to checked helpers; TS emits ordinary left-to-right `+`
concatenation, while C calls a byte-copying helper whose per-concatenation
allocations are intentionally leaked by this bootstrap slice. Bare `break` and
`continue` inside Boolean and unconditional loops lower directly to target loop
exits with nearest-loop semantics; list-traversal loops emit the same TS exits
while the C path still rejects traversal. Payloads, labels and use outside a
loop are rejected. Dynamic Int64 addition, subtraction, multiplication and
negation now check overflow in both targets and preserve exact positioned
ArithmeticPanic diagnostics, prior output and status. Portable C11 guards reject
overflow before evaluating signed arithmetic; operand temporaries preserve
left-to-right nested faults. Constant folding and division-family behavior are
unchanged by that [refresh](parity.md#checked-int64-arithmetic). The subsequent
[division-family slice](parity.md#positioned-integer-division-family) matches
positioned runtime faults and makes MIN%-1 a valid zero result. C checks both
division overflow and zero before evaluating the operation; all integer helper
operands evaluate once from left to right. C multi-value output also evaluates
every argument before writing, so a later argument fault leaves no partial call.
Single-value calls retain their exact emitted C. Function syntax,
tuple values, list values and total value `if` expressions are
emitted as runnable TS; the C path rejects them with a clear status-2
diagnostic. List values lower to TS arrays and a checked `lite$listAt` helper;
list traversal lowers to a TS `for...of` loop and the C path rejects it clearly.
List copies are emitted on declaration, assignment, argument passing and return,
so list mutation cannot share state.
`match` and native C input remain outside this admitted surface. Current TS
self-rebuild and temporary input helpers are described above. Reserved
features outside the subset are rejected by name with status 2.

A shared equals-token check keeps parenthesized inequality and bare function
tails distinct from assignment and named tuple fields. The
[inequality ledger](parity.md#inequality-token-discrimination) records coverage
and unchanged existing artifacts; comparison chains remain separate work.

Diagnostics are source-positioned as `name:line:column: message` (or
`line:column: message` when no logical source name is supplied). Columns are
1-based source characters, computed from immutable offsets. Generated TS text/list
bounds faults now use shared location metadata and preserve prior output. The
T00 UTF-16 versus Lite code-point column difference for same-line supplementary
characters is separately tracked in [the gap list](gaps.md). Unsupported
reserved features name the feature, point to its documentation, and repeat the
accepted subset, for example:

```text
verifications/features/loop-metadata.lts:1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
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
