# Bootstrap and self-hosting plan

Status: **implementation plan, 2026-11-01; bootstrap defaults recorded for agent work; language, module, std and CLI decisions remain open**.

This page is the operational plan for reaching the first compiler-bootstrap point:
the Lite-written compiler source **S** is compiled by the stage-0 TypeScript
igniter into runnable **TypeScript** and **C** compilers, and those compilers
compile S again to a fixed point.

It is not a language specification and does not select new syntax, modules,
imports, a standard library, a CLI design or a native ABI. It records the
bootstrap defaults agents must follow, the gates that must pass, and the point
where work stops for an owner decision.

Related direction:

- [TypeScript igniter and early self-hosting](tooling-and-learning.md#typescript-igniter-and-early-self-hosting)
- [Bootstrap source continuity](versioning-and-naming.md#bootstrap-source-continuity)
- [INV-061.06 target and safety direction](../investigations/INV-061-first-compiler-output.md)
- [Compiler prototype](../compiler/README.md)
- [Bootstrap parity ledger](../compiler/parity.md)
- [Igniter](../igniter/README.md)
- [Verification guide](../verifications/README.md)
- [Modules and packages](modules-and-packages.md) (open design)

## How to use this page

1. Read the definitions, defaults and current baseline.
2. Work through phases in order; do not start a later gate early.
3. Keep every commit green and within the phase's scope.
4. At a gate, record the evidence and update the checkboxes in this page.
5. If a default must change, or a new language feature is required, **stop** and
   ask the project owner. Do not invent syntax, a std API, a module system or a
   host interface.

## Definitions

| Term | Meaning |
|---|---|
| **Stage 0** | The preserved TypeScript/Node igniter in [`igniter/`](../igniter/README.md). |
| **S** | The Lite-written compiler source, assembled from an ordered manifest. |
| **L** | The language subset S may use. Defined below. |
| **T** | The TypeScript compiler artifact produced by stage 0 from S. |
| **C** | The C compiler artifact produced by stage 0 from S. |
| **T2 / C2** | Artifacts produced by T/C when they compile S again. |
| **Bundle** | Ordered source files plus a line map, flattened by the loader before S is executed or compiled. |
| **Fixed point** | T2 is byte-identical to T and C2 is byte-identical to C, with the same source and toolchain. |
| **Self-host point** | S compiles to T/C; T/C compile S; the fixed point and corpus gates pass; no stage-0 dependency remains at runtime. |

The explicit T11-T13, C01/C21-C23 and T21-T23 ladder and its completion
equalities are recorded in
[`compiler/parity.md`](../compiler/parity.md#bootstrap-ladder).

## Current baseline

- Igniter **0.1.0-alpha.38**, tag `igniter-v0.1.0-alpha.38`.
- **204** interpreter test groups and **9** editor grammar groups; the fast lane
  currently runs in about 12 seconds and skips the full-S lexer/parser/checker sweeps.
- Verification corpus: **36** features, **19** examples, **20** samples,
  **75** scenarios, **91** target executions.
- Restricted compiler corpus: **50** program cases and **42** rejection cases
  under [`igniter/tests/compiler/`](../igniter/tests/compiler/).
- Compiler sources: **1882** lines under `compiler/src/` plus **464** lines of
  L0 helpers under `lib/core/`. Exact P0 hashes are recorded in
  [`compiler/baseline.md`](../compiler/baseline.md); P2 artifact hashes are
  unchanged.
- S is valid Lite today: `./lite check compiler/ts-emitter.lts` passes. The
  compiler itself does not parse S yet; its accepted surface is Int/String/Bool
  expressions, immutable and mutable locals, `report(...)`, `if`/`else`, and
  Boolean/unconditional `loop`. Dynamic division and dynamic String
  concatenation remain explicit rejections.
- Stage 0 is the only execution path. There is no T, C, T2, C2 or verified
  compiler-to-compiler rebuild chain.

Update these counts only when they actually change. Do not copy stale counts into
new documents.

**Current gate: P6 — TS emitter and runtime, in progress.** P5 was completed on
2026-11-01; update this line when a gate is completed and use the phase
checklists as the source of truth.

**Critical path priority (owner direction, 2026-11-01): T00 → T11 → T12.**
Do not start the C emitter (P7) or packaging (P9) until both T11 and T12 are
recorded. The deliverables are TS artifacts: S emitted through stage 0 is T11;
T11 compiling S again is T12. No separate IR artifact is required.

**Accepted-surface parity track (owner direction, 2026-11-01):** ahead of the
P0-P9 order, the compiler's accepted surface grew one control-flow slice:
Bool values/comparisons/logic, mutable locals and assignment, `if`/`else`, and
Boolean/unconditional loops with runtime TS/C lowering. This is separate from
L/S and does not complete a bootstrap phase. Top-level scalar
functions (Int/String/Bool/Unit parameters/results, positional calls,
recursion/`self`, and `return`) now emit runnable TS; the C path rejects
function syntax with a clear status-2 diagnostic. Dynamic division, dynamic
String concatenation, `break`/`continue`, collections, `match`, runtime input
and checked dynamic C overflow remain open.

## Bootstrap parity loop

Owner direction, 2026-11-01: the TS igniter and the generated compilers must
become the same compiler for the bootstrap surface, not merely similar programs.
The route is a burndown, not a single final check:

1. Run stage 0 and the generated target compiler over the same Lite source.
   Start with the compiler corpus, then S itself.
2. Compare status, stdout and stderr byte for byte. For emitted TS/C, hash and
   diff the artifacts.
3. Classify the first difference: a missing T/C feature, a stage-0 feature S
   depends on but T/C lack, or nondeterminism.
4. Add the smallest compiler slice that removes that difference and rerun.
5. Record the remaining differences in
   [`compiler/parity.md`](../compiler/parity.md).
6. Stop when `T2 == T`, `C2 == C` and the corpus matches. At that point T/C are
   the igniter for the bootstrap surface.

This loop does not widen S or L by itself. If matching requires a new name,
value form, statement, module rule or host API, stop at the owner decision.
Full replacement of the TS igniter for features outside L is a larger scope and
is recorded as a separate decision, not assumed here.

**Stage 0 is feature-frozen during bootstrap.** Do not add igniter-only syntax,
builtins, host helpers or CLI behavior while S/T/C lag. New capability is
Lite-first: design it in L/S, add its compiler slice and tests, and give stage 0
only the minimal execution support needed to run S. Otherwise each igniter
feature makes the generated alternative a harder, moving target. The parity
ledger records both output differences and the remaining feature gap.

## Fixed bootstrap defaults

These are implementation defaults, not selected language decisions. Changing one
requires the project owner's explicit selection and an update to this page and the
[decision ledger](decisions-and-open-questions.md).

| ID | Default | Effect |
|---|---|---|
| **B1** | **L** is the current compiler-source subset listed below. | Keeps the first self-host small; the igniter already executes S. |
| **B2** | Assembly is an **ordered manifest** plus a loader line map. No `import`/`export` language syntax. | Avoids preempting the open module grammar; solves the backend-literal ordering problem. |
| **B3** | Compiler architecture is **streaming/direct emission**, with a flat non-recursive item or instruction stream if needed. No recursive AST. | No recursive product/sum types are required in L. |
| **B4** | Shared libraries use **read-only parameters and returned values** at first. No `mut` parameters, records, generics, closures or `Result`; diagnostic/exit helpers are allowed. | Keeps L and the compiler surface small. |
| **B5** | **TS first, C second**; both are required at the fixed-point gate. | TS iterates faster; C is the longer runtime/memory pole. |
| **B6** | Fixed point means **byte-identical** `T2 == T` and `C2 == C`. Behavioral parity with a normalized diff is a fallback only after the cause is understood and recorded. | Makes nondeterminism visible. |
| **B7** | No official std, module/import, CLI or ABI decision is made by this plan. | Keeps bootstrap scaffolding replaceable. |
| **B8** | **Stage 0 feature freeze for bootstrap:** do not add a new igniter language feature, builtin, host API or CLI behavior. If one is genuinely required, stop; the owner decision must add the same slice to L/S and its compiler plan. | Prevents the generated compiler from chasing a moving TS target. |
| **B9** | S may use only **L**. Adding a construct to S expands the compiler's required parser/checker/emitter surface. | The compiler must compile its own source at the gate. |
| **B10** | Bootstrap artifacts are **single-file** per target (or one source plus one documented runtime file); no target-level package system. | Keeps the build chain auditable. |
| **B11** | Stage 0, L/S and T/C are kept in **lockstep feature parity**. Igniter-only capability is debt, not progress; closing the gap is part of the bootstrap. | Keeps a Lite implementation reachable instead of chasing an ever-growing TS igniter. |

## Agent workflow rules

1. **One phase at a time.** Do not start the next gate until the current gate's
   evidence is recorded, even when the next task looks independent.
2. **Keep the fast lane green.** Run `./lite test --fast` after every change.
   Run the full gate before recording completion.
3. **No new language surface in this plan; stage 0 is feature-frozen.** Do not
   add syntax, builtins, standard modules, host APIs or CLI commands. New
   capability is Lite-first: design it in L/S, add its compiler slice, and give
   stage 0 only the minimal execution support needed to run S. If a task cannot
   be done without new surface, stop at the decision point.
4. **S stays inside L.** Do not use `match`, records, enums, unions, Float,
   arrays, closures, `mut` parameters, modules, `finally`, loop metadata or
   compound operators in S just because the igniter supports them.
5. **No official std.** Shared code lives under a clearly provisional location
   such as `lib/`; it is not `lite-stdlib`, has no stable API, is not imported by
   examples or samples and is not added to the design specification.
6. **No npm in visible commands.** Local gates use `./lite ...`. The repository
   CI separately runs the strict TypeScript check.
7. **Every behavior change has a test.** Compiler behavior uses compiler cases;
   a language feature uses the standard feature case plus manifest; libraries get
   direct unit tests.
8. **Keep counts and links current.** Update `docs/releases.md`,
   `docs/spec/README.md`, `compiler/README.md`, `igniter/README.md` and this page
   when their facts change.
9. **Refresh artifacts after a language change.** Follow
   [the artifact-refresh checklist](tooling-and-learning.md#refreshing-artifacts-after-a-language-change);
   remove workarounds unless an artifact explicitly demonstrates the replaced
   construct.
10. **Tag only at release gates.** Use annotated tags, do not move or delete a
    published tag, and do not push. Corrections get a new tag.
11. **Leave unrelated dirty files untouched.**
12. **Record evidence, not claims.** Link the test group, case manifest, command
    and exact result that proves the gate.
13. **Respect file ownership.** One active agent per phase or file set. Parallel
    work must not edit the same manifest or compiler file; merge/rebase before
    running a gate.
14. **Commit atomically.** One phase or one behavior change per commit,
    including its tests and the docs it makes stale. Keep every commit green;
    do not mix unrelated work, version bumps or release tags. Release tagging
    stays a separate gate action under rule 10 and the
    [versioning policy](versioning-and-naming.md#9-release-and-tagging).

## Phase map

| Phase | Goal | Gate |
|---|---|---|
| **P0** | Baseline, manifest schema, target layout | Baseline recorded; current path green; schema agreed |
| **P1** | Igniter tooling: loader, driver, harness, artifact runner | Bundle path produces byte-identical compiler output |
| **P2** | L0 shared libraries | Libraries compile and are used without behavior change |
| **P3** | Lexer | Lexes S and the compiler corpus |
| **P4** | Parser | Parses S; negative fixtures reject |
| **P5** | Checker | Accepts S; rejection diagnostics match |
| **P6** | TS emitter and runtime | T(S) produces a runnable T2 |
| **P7** | C emitter and runtime | C(S) produces a runnable C2 |
| **P8** | Self-host and fixed point | `T2 == T`, `C2 == C`, corpus parity |
| **P9** | Packaging, CI and provenance | Clean-checkout rebuild is reproducible and documented |

## P0 — Baseline and scaffolding

**Goal:** record the baseline, lock the manifest/line-map schemas and create the
target layout without changing behavior.

- [x] Record the baseline counts and the exact current compiler outputs. See
      [`compiler/baseline.md`](../compiler/baseline.md) and
      [`compiler/generated/baseline-artifacts.json`](../compiler/generated/baseline-artifacts.json).
- [x] Lock the default manifest schema (paths relative to the manifest, order is
      dependency order, each file included once, cycles rejected):

      ```json
      { "target": "ts", "files": ["../../lib/core/int.lts", "../src/lexer.lts", "../src/driver-ts.lts"] }
      ```

      The machine-readable form is
      [`compiler/manifests/manifest.schema.json`](../compiler/manifests/manifest.schema.json).
- [x] Add a line-map contract: flattened line → `(source path, original line)`.
      See [`compiler/manifests/README.md`](../compiler/manifests/README.md#line-map-contract).
- [x] Create the target layout directories: `compiler/manifests/`,
      `compiler/src/`, `compiler/runtime/` and `lib/core/`.
- [x] Keep the current `frontend.lts`, `ts-emitter.lts` and `c-emitter.lts`
      working in place. Move or split them only when the bundle path is green.
- [x] Add a compiler-source README note that S must remain inside L. See
      [`compiler/README.md`](../compiler/README.md#bootstrap-source-subset).

**Gate passed 2026-11-01:** the baseline counts and current emitted outputs are
recorded in [`compiler/baseline.md`](../compiler/baseline.md); the manifest
schema and line-map contract are recorded in
[`compiler/manifests/README.md`](../compiler/manifests/README.md); `./lite test
--fast` passes 174 tests with one native-C skip and `./lite test` passes all 175
tests, and the current 50/42 compiler path remains green. The bundle path itself
is P1's gate.

**Do not:** add a parser, lexer, language feature, module syntax or std code in
this phase.

## P1 — Igniter tooling

**Goal:** make stage 0 usable as a repeatable bootstrap driver.

- [x] **Bundle loader:** ordered manifests, include-once, cycle rejection,
      relative paths, declaration-only targets, line map. Implemented by
      `loadManifest`/`loadBundle` in
      [`igniter/loader.ts`](../igniter/loader.ts); contract in
      [`compiler/manifests/README.md`](../compiler/manifests/README.md).
- [x] **Driver:** compile a bundle for a target; pass the logical source name
      through `inputArgs`; feed the bundle through `inputAll`; capture
      stdout/stderr/status. `loadCompiler` in
      [`igniter/bootstrap.ts`](../igniter/bootstrap.ts) is internal; no public
      command was added.
- [x] **Library/unit harness:** run a Lite file or bundle with fixed args/stdin;
      capture `report`, `reportError` and exit status; compare text and bytes.
      `runText`/`runFile`/`runBundle` in
      [`igniter/bootstrap.ts`](../igniter/bootstrap.ts).
- [x] **Artifact runner:** write emitted TS/C to temporary files; strict
      typecheck/run TS; compile/run C with `-std=c11 -Wall -Wextra -Werror`;
      capture raw streams and status.
      [`igniter/artifacts.ts`](../igniter/artifacts.ts).
- [x] **Diagnostics mapping:** use the line map for compiler/source diagnostics;
      do not report flattened line numbers where original positions are known.
- [x] **Determinism and performance guards:** hash outputs, detect timestamps or
      absolute paths, and benchmark text/list use on the compiler source.
- [x] Tests for nested bundles, duplicates, cycles, missing files, line mapping,
      source names and output parity.

**Gate passed 2026-11-01:** the bundle path loads and stage-0 compiles both
current S emitters; all 92 compiler cases match the direct flat-import path with
byte-identical artifacts and exact diagnostics; TS/C bundle text equals the
direct loader output; `./lite test --fast` passes 180 tests with two native-C
skips in 11.7 s, and `./lite test` passes all 182 tests in 12.9 s.

**Do not:** add file/process/stdlib builtins, change `litec`'s public contract,
or add a public `bootstrap` command without an owner decision.

## P2 — L0 shared libraries

**Goal:** give compiler code a small, reusable support layer without making an
official std decision.

- [x] Create declaration-only Lite files under `lib/core/` (provisional names)
      and list the compiler-used files before the compiler sources in each
      manifest. `lib/core/test.lts` is test-only and is not bundled into a
      compiler.
- [x] Add `lib/README.md` stating that the tree is provisional bootstrap support,
      not `lite-stdlib`, with no stable public API.

| File | Capabilities | Consumers |
|---|---|---|
| `lib/core/int.lts` | checked add/sub/mul/div/rem/floor-div/floor-mod/negate; Int64 bounds; decimal formatting | parser folding, emitters |
| `lib/core/diag.lts` | `fail(prefix, message)`, `expect(prefix, condition, message)`, status/category strings | lexer, parser, checker |
| `lib/core/text.lts` | ASCII digit/letter/name predicates, digit value, skip whitespace/name, starts-with, index-of, join, text→int | lexer, parser, emitters |
| `lib/core/source.lts` | offset position, line/column, line-map helpers | diagnostics |
| `lib/core/format.lts` | Int→text, padding/join helpers | emitters |
| `lib/core/list.lts` | specialized index-of/contains for supported list element types | parser/checker |
| `lib/core/test.lts` | simple assertions for Lite test entries | library tests |

Rules:

- Read-only parameters and returned values; no `mut` parameters, records,
  generics, closures or `Result`. Diagnostic/exit helpers are allowed.
- No compiler-specific types (`Parsed`, `Local`, `Item`) in shared libraries.
- Every declaration carries a `/** ... */` doc comment.
- Names and APIs are provisional and may change with the compiler.
- Do not add examples or samples that import these files.

- [x] Each library has direct tests under `lib/tests/`.
- [x] The compiler uses L0 without behavior change; the 50/42 corpus remains
      byte-identical.

**Gate passed 2026-11-01:** each L0 file has a direct Lite test entry; the
compiler imports the L0 helpers through both manifests and the direct
flat-import path; all 50 program and 42 rejection cases retain their exact
artifacts and diagnostics.

**Parallel track:** L1 reusable pure libraries may start after L0, but do not gate
P3–P8. L2 host libraries and L3 tooling libraries wait for separate decisions.

## P3 — Lexer

**Goal:** tokenize S and the compiler corpus.

- [x] Token kinds: name, keyword, Int, String, Bool, symbol, EOF.
- [x] Whitespace, comments (block, doc, nested/raw), semicolons.
- [x] String escapes, Int64 range, multi-character operators (`:=`, `=!=`,
      `:/`, `:%`, comparisons, `**` only if L later admits it).
- [x] Positions: offset plus line/column; do not lose the source location.
- [x] Token-dump test helper and fixtures; include every construct in S.
- [x] Reject malformed/unsupported tokens before emission.

**Gate passed 2026-11-01:** [`compiler/src/lexer.lts`](../compiler/src/lexer.lts)
tokenizes the expanded TS S, every compiler case, the C emitter, and the lexer
sources. Five rejection fixtures fail lexically for the expected reasons:
injected unterminated string, below-minimum and too-large Int literals, a bad
string escape, and an unterminated string. Focused fixtures cover symbols,
comments, strings, Int bounds and exact token dumps. No parser or emitter
behavior changed. `./lite test` passes all 186 tests in 65.3 s; the fast lane
passes 183 with three skips in 13.2 s.

**Do not:** add Float, arrays, `match`, records, enums or modules to L just to
make the lexer complete.

## P4 — Parser

**Goal:** parse S completely.

- [x] Types: scalar names, `Unit`, flat named tuples, `List<T>` of supported
      elements; aliases. Implemented by `parseType`/`parseTypeAlias` in
      [`compiler/src/parser.lts`](../compiler/src/parser.lts) with fixtures under
      [`compiler/tests/parser/`](../compiler/tests/parser/).
- [x] Declarations: `:=`, `var`, typed `: Type`, `: mut List<T>`, type aliases.
      Function annotations remain with the Functions bullet.
- [x] Expressions: precedence, unary, calls, tuple construction/fields, index,
      list literals.
- [x] `if` with final `else` as a value. Value branches are currently parsed as
      single expressions.
- [x] Statements: action `if`, loops (`loop cond`, `loop true`, `loop seq as`),
      `break`, `return`, blocks, `report`/`reportError`/`exit` calls.
- [x] Functions: parameter/result signatures, calls, recursion and `self`.
- [x] Keep the backend literal encoders ordered before the frontend in the
      manifest; the no-forward-reference rule makes order semantic.
- [x] Make manifest order authoritative in S and remove `importFlatAll` from the
      compiler source. `litec` compiles the manifest bundle through
      [`igniter/bundle-cli.ts`](../igniter/bundle-cli.ts); the old emitter paths
      are generated compatibility bundles.
- [x] Negative fixtures: unsupported constructs are rejected by name before any
      emission.

**Gate passed 2026-11-01:** expanded S, L0, the lexer and every supported
program case parse; unsupported declarations are rejected by name; compiler
source and `lib/core` contain no `importFlatAll`; manifest order is authoritative
and the current artifacts and diagnostics are unchanged. `./lite test` passes
all 193 tests in 150.6 s; the fast lane passes 189 with four heavy/native skips
in 10.9 s.

**Do not:** require a recursive AST. A flat item/instruction stream is acceptable
under B3. Do not add records/enums/`match` to make the parser easier.

## P5 — Checker

**Goal:** check S with the same acceptance and diagnostics the compiler must
reproduce.

- [x] Top-level symbol collection: type aliases, function signatures and value
      declarations with duplicate-name rejection.
- [x] Block scopes and local bindings: parameters, declarations, shadowing,
      duplicate locals, assignment mutability, unknown-local rejection, simple
      local type inference and assignment/initializer type checks.
- [x] Zero/default initialization for typed declarations. Reserved `= ?`
      storage is not used by S and is not part of this checkpoint.
- [x] Function signature collection, direct-call arity, simple argument/result
      type checks and return placement.
- [x] Tuple label/field types, list element types, list-literal types and index
      element types for normalized expressions and aliases.
- [x] Bool conditions for action `if` and `loop`; list mutation grants for
      `push`/`pop` end operations.
- [x] `break`/`continue` outside-loop rejection and `return` outside-function or
      mismatched return checks.
- [x] Diagnostics: source name, position, message, exit 2.
- [x] Accept every construct in S and reject the focused unsupported/ill-typed
      cases; the restricted 42-case compiler corpus retains exact diagnostics.

**Gate passed 2026-11-01:** [`compiler/src/check.lts`](../compiler/src/check.lts)
accepts expanded S and rejects focused ill-typed fixtures for scopes, types,
arity, arguments, returns, conditions, tuple/list/index forms and mutation
grants. All 50 program and 42 rejection cases retain their exact artifacts and
diagnostics; no invalid program emits an artifact. `./lite test` passes all 195
tests in 228.6 s; the fast lane passes 190 with five heavy/native skips in 11.7 s.

**Do not:** add union inference, records, enums, pattern matching, recovery or
`Result` to make checking easier.

## P6 — TS emitter and runtime

**Goal:** produce a runnable TypeScript compiler T from S.

**Direct emission, no separate IR deliverable.** TS and C are the deliverables.
Emit target text while parsing/checking, following the existing restricted
compiler's streaming/direct model. The flat item stream is an internal interface,
not a checked-in IR or a prerequisite. Introduce a richer instruction stream only
if direct emission becomes unmaintainable.

- [x] TS runtime support: checked Int64 arithmetic, code-point text, list copy
      semantics, diagnostics and exit. The Node I/O adapter remains with the
      generated entry.
- [ ] Full-L front-end in S emits TS directly for functions, tuples, lists,
      typed locals, statements and value conditionals.
- [ ] Single-file artifact; strict TypeScript; erasable syntax; Node entry.
- [ ] Source-name/args/stdin/stdout/stderr/status contract.
- [ ] Deterministic output; no timestamps, paths, PIDs or hash-order iteration.
- [ ] **T11:** stage 0 runs S on S and produces a runnable TS compiler.
- [ ] T11 typechecks and runs; its artifact hash is recorded.
- [ ] **T12:** T11 runs on S and produces TS.
- [ ] T12 runs and its artifact hash is recorded.
- [ ] Prefer `T12 == T11`; record the first difference in
      [`parity.md`](../compiler/parity.md) if not yet fixed.
- [ ] Corpus: T11 compiles the program cases; run the emitted TS and compare
      bytes and status with the igniter; rejection diagnostics match.

**Gate:** T11 exists, typechecks and runs; T11 produces T12; T12 runs. T12 should
equal T11 byte for byte. C/P7 waits until this is recorded.

**Do not:** start the C emitter before the TS gate unless a second agent is
explicitly assigned the independent C runtime work.

## P7 — C emitter and runtime

**Goal:** produce a runnable native C compiler C from S.

- [ ] C runtime support: `int64_t` checked arithmetic, UTF-8 strings (length +
      bytes), list structs with copy semantics, tuple/call value copies, I/O,
      diagnostics and exit.
- [ ] Tuple structs, function prototypes, recursion, loops and value
      conditionals with temporaries.
- [ ] Memory strategy fixed and documented (arena, reference counting or
      explicit free); no use-after-free; allocation failures reported.
- [ ] Single-file artifact or one source plus a documented runtime file.
- [ ] Compile with `-std=c11 -Wall -Wextra -Werror`; no warnings; no undefined
      behavior on the corpus.
- [ ] Corpus: compile the program cases, run, compare bytes and status with the
      igniter; rejection diagnostics match.
- [ ] Parity burndown: run stage 0 and C over the same source, record the first
      difference in [`parity.md`](../compiler/parity.md), close it, and rerun
      before moving to the next source.
- [ ] C compiles S; C2 runs.

**Gate:** C compiles cleanly, runs, compiles every program case with exact
behavior and produces a runnable C2 from S.

## P8 — Self-host and fixed point

**Goal:** prove the bootstrap chain.

- [ ] T compiles S to T2; C compiles S to C2.
- [ ] Record every node and artifact hash in the
      [bootstrap ladder](../compiler/parity.md#bootstrap-ladder): `T11`, `T12`,
      `T13`, `C01`, `C21`, `C22`, `C23`, `T21`, `T22`, `T23`.
- [ ] `T11 == T12 == T13` byte for byte.
- [ ] `C01 == C21 == C22 == C23` byte for byte.
- [ ] `T11 == T21 == T22 == T23` byte for byte.
- [ ] `T2 == T` and `C2 == C` byte for byte. If not, identify the nondeterminism
      and fix it; record any normalized fallback before accepting it.
- [ ] Cross-build: T compiles the C-emitter source to a TS-hosted C emitter; C
      compiles the TS-emitter source to a C-hosted TS emitter.
- [ ] T and C pass all 50 program and 42 rejection cases with exact streams and
      status.
- [ ] No T/C runtime dependency on stage 0, the Lite compiler or a hidden host.
- [ ] Clean-checkout rebuild produces the same artifact hashes.
- [ ] Bounded evidence is recorded; no claim of universal correctness.

**Gate:** the self-host point's definition of done below is satisfied.

**Do not:** weaken the gate to “it ran once”. Fixed point and corpus parity are
the point.

## P9 — Packaging, CI and provenance

**Goal:** make the bootstrap repeatable and reviewable.

- [ ] A visible build script records exact commands, Node/TypeScript/C versions,
      source/manifest revisions and artifact hashes.
- [ ] CI runs the bootstrap chain (or a bounded lane) with pinned tools.
- [ ] Generated T/C are preserved or reproducible with hashes; the source
      manifest and line map are preserved.
- [ ] When release tags are approved under D13, annotated tags identify the
      stage-0 seed, S and the bootstrap artifacts; the source/builder map is
      recorded and immutable once published.
- [ ] Update `docs/releases.md`, the component READMEs, the specification stage
      lines and this plan.
- [ ] Document unsupported constructs, host prerequisites and rebuild limits.
- [ ] Keep the readable TypeScript bootstrap shipped.

**Gate:** a clean checkout rebuilds the chain and reproduces the recorded hashes;
a reviewer can follow the commands without guessing.

## Compiler source subset L

Allowed in S now:

- UTF-8 source; whitespace; semicolons; block/doc comments; nested/raw comments
  if the corpus uses them.
- Int, String, Bool, Unit; Int64 bounds; String escapes `\n \r \t \" \\`.
- Flat named tuples; `List<T>` whose element is a scalar or flat tuple; function
  signatures; transparent type aliases.
- Declarations: `:=`, `var`, typed `: Type`, `: mut List<T> = []`, contextual
  empty list literals.
- Expressions: names, positional calls, tuple construction, field access, index
  reads, parentheses, unary minus, `+ - * / % :/ :%`, comparisons,
  `and`/`or`/`not`, value `if`/`else if`/`else`.
- Statements: action `if`, loops, `break`, `return`, blocks, `report`,
  `reportError`, `exit`.
- Functions: typed parameters/results, calls, recursion, `self`.
- Builtins used by S: `inputArgs`, `inputAll`, `report`, `reportError`, `exit`,
  `textLength`, `textAt`, `textSlice`, `push_back`.
- List value semantics: copies on declaration/argument/return; iteration
  snapshots.

Not allowed in S without an owner decision and a plan update:

- Float, fixed arrays, `match`, records, enums, unions, `Option`/`Result`,
  recovery, `finally`, loop metadata, closures, first-class callbacks,
  `mut` parameters, modules/imports, generics, maps, compound assignments, `**`,
  zero/reserved locals.

Adding one of these to S means the compiler must parse/check/lower it too. That
is a deliberate expansion, not an implementation detail.

## Architecture and layout

Target layout (names may be adjusted at P0 without changing the defaults):

```text
compiler/
  manifests/
    ts.json
    c.json
  src/
    lexer.lts
    parser.lts
    check.lts
    emit-ts.lts
    emit-c.lts
    driver-ts.lts
    driver-c.lts
  runtime/
    ts/…
    c/…
  generated/          # preserved reference artifacts when checked in
lib/
  core/int.lts
  core/diag.lts
  core/text.lts
  core/source.lts
  core/format.lts
  core/list.lts
  core/test.lts
```

Manifest rules:

- Order is dependency order. No forward function lookup.
- Backend literal encoders appear before the shared frontend that calls them.
- Each file is included once; cycles are rejected; paths are relative.
- Files are declaration-only except the driver entry.
- The bundle loader returns text plus a line map.

Artifact rules:

- Single-file TS/C per target, or one source plus one documented runtime file.
- Imports/includes in the bootstrap source are erased by the loader; generated
  artifacts do not carry a Lite module system.
- Generated source is readable and deterministic.

Streaming/direct emission is the default because L has no recursive products or
sums. If the parser/checker becomes unmaintainable, the fallback is a flat
indexed item/instruction stream, not an unselected AST language feature. Records,
enums and subject `match` require a separate owner decision.

## Shared library layers

### L0 — bootstrap core (gate P2)

The table in P2. These are on the critical path and must compile under L.

### L1 — reusable pure libraries (parallel after L0; not gating)

Provisional candidates:

- text trim/split/lines/replace helpers;
- CLI argument parsing over `List<String>`;
- source span/line-map helpers;
- diagnostic rendering;
- specialized list search.

These are future CLI/compiler candidates, not official std. They may be tested
through the igniter before the compiler understands them.

### L2 — host libraries (future CLI; blocked)

Files, directories, paths, process spawn, env, cwd, raw streams and exit status.
These require a selected host interface and new igniter builtins. They are not
part of the bootstrap.

### L3 — tooling libraries (future verifier/tester)

JSON, hashing, diffs, verification/test runners. They depend on L1/L2 and are not
part of the bootstrap.

### Runtime libraries (target-level, not Lite std)

The TS and C runtimes provide checked arithmetic, text, list value semantics, I/O,
diagnostics and exit for emitted programs. They are codegen support, not
user-importable std. Keep them visible, versioned and conformance-tested against
the igniter; do not hide them behind a claimed dependency-free artifact.

## Verification gates

Use the existing visible commands:

| Command | Use |
|---|---|
| `./lite test --fast` | Fast local gate; target under 30 s; skips native C and the full-S lexer sweep |
| `./lite test` / `./lite test --full` | Full local gate, including native C |
| `./lite verify --all` | All feature/example/sample scenarios and targets |
| `./lite check file.lts` | Source check |
| `./lite compile --target ts\|c file.lts` | Existing compiler path |
| `./lite run file.lts [-- args]` | Existing interpreter path |

The repository CI also runs the strict TypeScript check and editor tests. Do not
add npm commands to user-facing documentation.

Each gate records:

- the command run and its exact result;
- the test group names or case manifests that prove it;
- whether outputs are byte-identical or behaviorally equivalent, and why;
- the commit and, at a release gate, the annotated tag;
- any new limitation.

## Self-host point: definition of done

The point is reached only when all of these are true:

1. S is assembled from the manifest and compiles under stage 0.
2. Stage 0 produces T and C.
3. T typechecks strictly and runs; C compiles with the selected flags and runs.
4. T and C are compilers: they read Lite source, check it and emit artifacts.
5. T compiles S to T2; C compiles S to C2.
6. `T2 == T` and `C2 == C` byte for byte.
7. T and C pass the 50 program and 42 rejection cases with exact streams/status.
8. T and C compile each other's emitter source as a cross-build.
9. No stage-1+ runtime dependency on stage 0 or the Lite compiler.
10. A clean checkout reproduces the artifacts and hashes.
11. Tags, source/builder map, provenance and limitations are recorded.
12. The readable TypeScript bootstrap remains preserved.

## Decisions and stop points

| ID | Decision | Status |
|---|---|---|
| D1 | L is the subset above; S stays inside it | default; change requires owner |
| D2 | Ordered manifest, no import/export syntax | default |
| D3 | Streaming/direct emission, flat IR allowed, no AST | default |
| D4 | Pure L0/L1 libraries; no `mut` params/records/generics/closures | default |
| D5 | TS first, C second, both at the gate | default |
| D6 | Byte-identical fixed point | default |
| D7 | No official std/module/CLI/ABI decision | default |
| D8 | New igniter language feature needed by S | **stop and ask** |
| D9 | `mut` parameters become necessary for a library API | **stop and ask** |
| D10 | Records/enums/`match` become necessary for the AST/checker | **stop and ask** |
| D11 | Modules/imports become necessary for compiler self-assembly | **stop and ask** |
| D12 | Host file/process APIs become necessary for the CLI | **stop and ask** |
| D13 | Compiler release tag stream and artifact check-in policy | **stop and ask** |
| D14 | C memory model (arena/refcount/free) | choose at P7 and record |
| D15 | Stage 0 feature freeze and Lite-first lockstep parity (B8/B11) | owner direction 2026-11-01; changing it requires owner |

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Streaming parser/checker becomes unmaintainable | Use a flat item/instruction stream; keep L small; defer AST until an owner decision |
| C runtime and memory is the long pole | TS first; fix the memory strategy at P7; conformance tests against the igniter |
| Source positions shift through bundles | Line map in P0/P1; diagnostic mapping tests |
| Generated code drifts from igniter semantics | Shared conformance corpus; raw stream/status parity; reject unsupported features |
| Performance degrades on S | Measure text/list use; keep the fast lane under 30 s; optimize only after the gate |
| Scope creep into std/CLI/language | Freeze B1–B11; stop at decision points; no unselected syntax |
| Igniter feature growth outpaces S/T | Stage 0 feature freeze (B8/B11); Lite-first changes; feature-gap table in `compiler/parity.md` |
| Nondeterministic artifacts | No timestamps/paths/PIDs; stable ordering; hashes; fixed-point gate |
| Toolchain drift | Pin Node/TypeScript/C flags; record versions and hashes in P9 |
| Stale docs/counters | Update at every gate; use the artifact-refresh checklist for language changes |

## Maintenance

- Update this page's checkboxes and the baseline counts at each gate.
- Update [release history](releases.md), [current design specification](spec/README.md),
  [compiler README](../compiler/README.md) and [igniter README](../igniter/README.md)
  when their facts change.
- Add compiler cases under `igniter/tests/compiler/` for compiler behavior.
- Add a feature verification case only when a language feature is actually
  selected and implemented; bootstrap tooling alone does not add a feature.
- When a release gate is approved (D13), tag it with annotated tags; do not
  push; preserve history.
- If a default changes, update this page and the decision ledger in the same
  change.
