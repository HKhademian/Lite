# Bootstrap and self-hosting plan

Status: **historical bootstrap defaults, with the current minimum TS self-hosting path updated 2026-11-10**.

This page is the operational plan for reaching the first compiler-bootstrap point:
the Lite-written compiler source **S** is compiled by the stage-0 TypeScript
igniter into runnable **TypeScript** and **C** compilers, and those compilers
compile S again to a fixed point.

It is not a language specification and does not select new syntax, modules,
imports, a standard library, a CLI design or a native ABI. It records the
bootstrap defaults agents must follow, the gates that must pass, and the point
where work stops for an owner decision.

For ongoing feature work, the owner-selected
[compiler development guidelines](../.agents/rules/compiler-development.md) (2026-11-02) extend
this initial bootstrap plan: language implementation stays in Lite, changes
require multiple focused and combined-feature cases, and accepted, verified
generated support can precede adoption of a feature in S. Bounded flagged
investigations are permitted under those guidelines. The restrictions below
describe the current L and bootstrap phase scope; they do not permanently freeze
Lite compiler feature development. Native C self-hosting remains pending.

Latest owner direction, 2026-11-02: switch immediately toward generated TS
workflows while keeping the compiler self-hosted. Remove the interpreter run
launcher; compile programs and execute their TS artifacts. Check-only uses generated Lite
and strict artifact checking without program effects. Verification now uses TS artifacts by default, with an explicit T00 reference
lane. Default test consumers and missing ordinary syntax are still migrating. C output and native
self-hosting resume **after TS migration and T00 retirement**. The
[current transition order](../compiler/transition-plan.md#implementation-order)
supersedes earlier phase ordering and native retirement prerequisites below.
Advanced correctness/edge audits do not block ordinary syntax migration.

Owner update, 2026-11-05: `./lite run` is available again as a compile-and-execute
adapter over the generated compiler and Node entry. It restores no interpreter and
keeps the T00-free default route.

Owner direction, 2026-11-10: use the smallest LiteLang subset that can compile
and rebuild the Lite-written compiler. The full language specification or T00
parity is not a self-hosting prerequisite. The selected generated seed compiles
the compiler source through three strictly checked generations to the same
artifact, and that artifact passes its recorded compiler corpus. Add a minimal
top-level source import after this kernel if its cost remains modest, retaining
explicit dependency metadata. Then retire the handwritten T00 implementation
from active command and verification paths after no-T00 checks pass. Keep
remaining selected-compiler rejections as post-kernel feature work; preserve
the generated TS seed and its provenance for reproducible recovery. Native C is
a later target.

Owner clarification, 2026-11-11: the current seed must also implement the
bounded root-symbol contract: reject duplicate root value definitions, allow
nested shadowing, resolve later inferred scalar-literal roots inside deferred
function bodies, and reject eager reads before runtime initialization. Compile-
time symbol availability does not hoist runtime values. This first pre-scan is
deliberately narrow; typed and computed later values remain future work.

Owner clarification, 2026-11-11: the measured fixed point proves the current
compiler source rebuilds; it does not close the minimum symbol-resolution
contract. Before imports, the first compiler must reject duplicate root value
definitions while allowing nested bindings, make later scalar root definitions
available as compile-time symbols inside deferred function bodies, and still
reject eager reads before runtime initialization. The first implementation
keeps this predeclaration narrow to inferred scalar literals; broader type
predeclaration and full language shadowing remain later compiler work. Keep
definition lookup separate from runtime initialization state.

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
5. Follow the owner-selected 2026-11-10 minimum-kernel and source-import
   direction in the active [self-hosting handoff](../.agents/plans/self-hosting-kernel.md).
   Keep the import increment top-level and bounded; do not infer package,
   standard-library, initialization or general module-system rules from it.

## Definitions

| Term | Meaning |
|---|---|
| **Stage 0** | The preserved TypeScript/Node igniter in [`igniter/`](../igniter/README.md). |
| **S** | The Lite-written compiler source, assembled from an ordered manifest. |
| **L** | The language subset S may use. Defined below. |
| **T** | The generated TS compiler artifact used to bootstrap S; current selected seed is T12. |
| **C** | The retained TS-hosted C emitter; not part of the current minimum self-hosting gate. |
| **T2** | Artifact produced when T compiles S again. |
| **C2** | Historical/later artifact produced by the native C compiler when it compiles S. |
| **Bundle** | Ordered source files plus a line map, flattened by the loader before S is executed or compiled. |
| **Fixed point** | For the current TS gate, T2 is byte-identical to T for the same S and toolchain. C fixed points are a separate native milestone. |
| **Self-host point** | TS0 compiles LT0 to LT1; LT1 compiles the same LT0 to byte-identical LT2; the declared compiler-source corpus passes. This does not imply full language parity or T00 retirement by itself. |

The explicit T11-T13, C01/C21-C23 and T21-T23 ladder and its completion
equalities are recorded in
[`compiler/parity.md`](../compiler/parity.md#bootstrap-ladder).

## Current transition, 2026-11-02

The owner approved starting the [T11/C transition](../compiler/transition-plan.md)
after the recorded T11/T12 fixed point and performance comparison. TS and C
compilation and compiler verification now select preserved
[generated seeds](../compiler/bootstrap/README.md) without executing T00. The C
emitter is TS-hosted, built by T11, and is not the future native C11 compiler.
Changed S is rebuilt by T11 and strictly checked before
use; artifact/source identities prevent stale or corrupt compiler selection.
Public compile/check now use generated TS, the interpreter run launcher is removed,
`./lite run` is a compile-and-execute adapter and C output is deferred. Default
regression consumers and TS feature parity still
need migration before T00 retirement. The native C ladder follows retirement. The
[text-cache seed refresh](../compiler/parity.md#text-cache-seed-refresh) records
T11 == T12 == T13 for its exact source snapshot. Generated text scanning reuses
bounded code-point views; that source snapshot has a 668 ms self-build median in the
[before/after benchmark](../benchmark/reports/2026-11-02-text-cache.md), excluding
strict checking. The subsequent [report-order refresh](../compiler/parity.md#report-order-seed-refresh)
preserves output produced by calls inside report arguments and records a new
three-generation fixed point. Current tests include 237 interpreter groups, 32 compiler-host
groups, 4 policy/tooling groups and 9 editor grammar groups; the historical P0 counts below remain fixed.
The full-source lexer/parser/checker sweeps now run generated TS drivers, checked
once per sweep and executed in isolated processes. Focused fixtures retain
exact T00 comparisons. See the [test-consumer migration](../compiler/parity.md#generated-full-source-test-consumers).

The owner-selected [temporary I/O migration](tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02)
renames S's report calls to outputLine, adds output without a newline, and ports
the four prompted input helpers to generated TS. This explicit owner decision
updates the temporary helper contract; it does not add general optional/variadic
function grammar. Current corpus: 69 programs/24 rejections; verification:
38 features, 78 scenarios, 100 target executions. The generated-only spelling
adapter and that snapshot's fixed point are in the [I/O ladder](../compiler/reports/2026-11-02-io-migration-ladder.json).

The subsequent [checked Int64 refresh](../compiler/parity.md#checked-int64-arithmetic)
adds dynamic addition, subtraction, multiplication and negation guards to both
targets, with exact source-positioned runtime overflow faults. Its
[generated-only ladder](../compiler/reports/2026-11-02-int64-ladder.json) records
the current source and three identical compiler generations. Division-family
behavior, wider numeric types and the remaining feature/native gates stay separate.

### Current minimum TS kernel evidence, 2026-11-11

- The selected T11 seed compiled the updated compiler source into T12 candidate
  artifact `02e8e226…` from source `8d2a857a…`; its three strictly checked LT1/LT2
  generations are byte-identical.
- `node compiler/scripts/corpus-parity.ts --artifact
  /tmp/lite-self-host-kernel-20261111/generation-3.ts` passed 94 compiler cases:
  69 programs and 25 rejections, with zero mismatches. The former repeated-root
  program was replaced by nested-shadow coverage, and root duplication now has
  a source-positioned rejection contract.
- Focused host cases also cover a deferred function reading a later inferred
  scalar-literal root, a parameter shadowing that root, and an eager initializer
  rejecting its read before the later runtime initialization.
- The 2026-11-11 [T00/T12 inventory](../compiler/reports/current-t00-t11-inventory.md)
  records 112/173 matching scenarios and 61 T12 rejections. These are parity
  observations; full parity is not a self-hosting gate.

T12 is selected and rebuilds its source to the same artifact. Its generated
compiler corpus, fast suite, and refreshed T00/T12 audit pass. The import and
dependency slice is recorded below; remove handwritten T00 from active commands
and checks only after that imported-source path passes its gate. See the active
[self-hosting handoff](../.agents/plans/self-hosting-kernel.md).

### Minimal source import, 2026-11-11

The post-kernel source-import slice supports whole-line top-level `.lts`
imports. TS and C compiler manifests each point to one Lite root file, which
imports its components in order. The host records opened dependency paths in
compiler build provenance, terminates repeated/cyclic visits when a path opens,
and maps diagnostics through the flattened line map. Expanded source bytes are
identical to the previous manifest bundle, so the selected T12 seed and fixed
point artifact do not change. Module namespaces, exports, package resolution,
and `.lt` semantics remain outside this slice.

Dynamic integer division/remainder now match exact positioned faults in both
generated targets, and MIN%-1 returns zero without undefined C arithmetic.
The [division-family ledger](../compiler/parity.md#positioned-integer-division-family) records
the seed refresh, differential coverage and paired speed measurements.

Single-pass target helper discovery now avoids repeated emitted-code scans.
Paired compiler-phase measurements improve from 100.0 to 60.4 ms for 1,000 output
statements and from 899.0 to 649.8 ms for identical compiler source, with exact
emitted bytes. All 522 previous/current compiler comparisons match; see the
[helper-scan ledger](../compiler/parity.md#single-pass-helper-discovery).

C multi-value output now evaluates every argument before any write, preserving
left-to-right faults and earlier output. Single-value emitted C is unchanged.
All 256 full tests pass with zero skips (48.5 s); the [C output-order ledger](../compiler/parity.md#c-output-argument-evaluation)
records coverage, unchanged TS seeds and steady paired C-emitter timings.

Generated TS text/list bounds faults now carry exact source locations and keep
earlier output, using shared fault metadata. All 257 full tests pass with zero
skips (47.3 s); the measured inventory is 73/162 matching cases with 89 remaining.
The supplementary-character column convention is separately pending; see the
[bounds-fault ledger](../compiler/parity.md#positioned-text-and-list-bounds-faults).

Parenthesized inequality and bare String/Int/Bool function tails now stay
comparisons, using a shared equals-token check. All 258 full tests pass with zero
skips (47.3 s); the measured inventory is 75/163 matching cases, 88 remaining.
Existing corpus artifacts are unchanged; see the [inequality ledger](../compiler/parity.md#inequality-token-discrimination).

Constant integer arithmetic faults now execute only when reached. Dead branches,
false loops, skipped Boolean operands and unused functions compile safely; invalid
literals/types still reject before effects. Six fixtures now model runtime faults,
so the compiler corpus is 61 programs/32 rejections (still 93 sources). All 259
full tests pass with zero skips (53.4 s). See the [deferred-fault ledger](../compiler/parity.md#deferred-constant-arithmetic-faults).


Comparison chains now retain middle operands once and skip later operands on both
generated targets over their admitted scalar types. All 260 full tests pass with
zero skips (49.4 s); inventory is 79/164 matching cases, 85 remaining. The new
canonical chain feature executes on all three targets. See the [chain ledger](../compiler/parity.md#comparison-chain-lowering)
for fixed-point, sanitizer and paired speed evidence. Broader types, Never-valued
exit typing, native C and run/check migration remain pending.


Empty and comment-only scripts now compile silently on generated TS/C, with
malformed comments still rejected before effects. The corpus is 63 programs and
30 rejections; existing 61 artifact pairs are unchanged. The parser skips alias
scanning and remaining state allocation for empty scripts. See the [empty-script
ledger](../compiler/parity.md#empty-script-support) for generated bootstrap and paired timing evidence.


Simple statement separators now follow EOF, closing scopes and directly closed
block initializers on generated targets. Adjacent output calls still require a
separator and reject before effects. The corpus is 64 programs/29 rejections;
all 63 older artifact pairs stay identical. See the [statement-boundary ledger](../compiler/parity.md#statement-boundaries)
for coverage, generated bootstrap and paired timing evidence.


Adjacent admitted String literals now join across whitespace/comments on generated
TS/C and both standalone parser drivers, with malformed later tokens still
rejected before effects. Corpus: 65 programs/28 rejections; all 64 earlier
artifact pairs stay identical. See the [adjacent-literal ledger](../compiler/parity.md#adjacent-string-literals)
for focused coverage, generated bootstrap and paired timing evidence.


Nonempty calls now admit one trailing comma on generated targets while empty
comma-only lists, doubled commas and arity/type errors still reject before effects.
Corpus: 66 programs/27 rejections; all 65 earlier artifact pairs stay identical.
See the [trailing-comma ledger](../compiler/parity.md#trailing-call-commas) for generated bootstrap,
focused combinations and paired timing evidence.


Generated TS/C now support statement scopes and preserve outer values while
shadowed initializers run. The canonical scope feature executes on all three
targets, yielding 100 verifier executions. All 66 earlier program artifact pairs
remain identical. See the [scope ledger](../compiler/parity.md#statement-scopes) for focused combinations,
generated fixed-point evidence, native sanitizer cases and paired timing data.

## Historical P0 baseline, 2026-11-01

The counts and implementation limits below describe P0, not the current compiler.

- Igniter **0.1.0-alpha.38**, tag `igniter-v0.1.0-alpha.38`.
- **234** interpreter test groups and **9** editor grammar groups; the fast lane
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

**Historical phase marker:** the former P0-P9 checklist is retained as design
history. The current minimum TS kernel is complete; use the dated current
evidence above and the active self-hosting handoff for next steps.

**Original critical path (owner direction, 2026-11-01): T00 → T11 → T12.**
T11/T12 are recorded; the 2026-11-02 transition above is the current host work.
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
function syntax with a clear status-2 diagnostic. Checked `inputArgs`,
`inputAll`, `reportError`, `exit`, `textLength`, `textAt` and `textSlice` calls
also emit self-contained TS in expressions and statement positions; C rejects
them clearly. Dynamic Int `/`, `%`, `:/` and `:%` now lower to checked
TS and C helpers; dynamic String concatenation and bare nearest-loop
`break`/`continue` also lower in Boolean, unconditional and list-traversal
loops. Collections beyond `List<T>`, `match`, runtime input outside these
helpers remain open. Checked dynamic Int64 addition, subtraction, multiplication
and negation now lower in both targets, including portable C11 overflow guards.

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

The 2026-11-10 owner direction supersedes full TS/C parity as a prerequisite:
grow the seed and S in paired increments, but compare the declared kernel
subset only. Current S already reaches a TS fixed point. Unsupported language
features stay in the post-kernel queue and must not block imports or T00
retirement unless a concrete compiler-source dependency proves otherwise.

## Fixed bootstrap defaults

These are implementation defaults, not selected language decisions. Changing one
requires the project owner's explicit selection and an update to this page and the
[decision ledger](decisions-and-open-questions.md).

| ID | Default | Effect |
|---|---|---|
| **B1** | **L** is the current compiler-source subset listed below. | Keeps the first self-host small; the igniter already executes S. |
| **B2** | Initial kernel assembly may use an **ordered manifest** plus a loader line map. Source imports are a post-kernel step; this does not select a general module/package system. | Keeps bootstrap construction simple while leaving a clean path to explicit source dependencies. |
| **B3** | Compiler architecture is **streaming/direct emission**, with a flat non-recursive item or instruction stream if needed. No recursive AST. | No recursive product/sum types are required in L. |
| **B4** | Shared libraries use **read-only parameters and returned values** at first. No `mut` parameters, records, generics, closures or `Result`; diagnostic/exit helpers are allowed. | Keeps L and the compiler surface small. |
| **B5** | **TS is the minimum self-hosting gate.** Native C is a later target. | The Lite compiler can reach the initial self-hosting point without waiting for native-backend work. |
| **B6** | The TS fixed point means **byte-identical** `T2 == T`. Native C equality is checked in its separate later ladder. | Makes nondeterminism visible without coupling the TS kernel to native C. |
| **B7** | No official std, module/import, CLI or ABI decision is made by this plan. | Keeps bootstrap scaffolding replaceable. |
| **B8** | Grow the seed and Lite-written compiler in paired increments: first add the capability to the seed, then adopt it in S, and compare the declared kernel subset. | Keeps the seed and S aligned without requiring the full language spec before self-hosting. |
| **B9** | S may use only **L**. Expand L after contract and generated-support acceptance, then adopt the feature in S under the [development guidelines](../.agents/rules/compiler-development.md#accept-support-before-using-it-in-compiler-source). | The selected seed must support the compiler source before adoption. |
| **B10** | Bootstrap artifacts are **single-file** per target (or one source plus one documented runtime file); no target-level package system. | Keeps the build chain auditable. |
| **B11** | Seed/S comparisons are required for the **declared self-hosting subset**, not full T00/T11 parity. | Lets compiler work reach a fixed point while unsupported language features stay explicit backlog. |

## Agent workflow rules

1. **One phase at a time.** Do not start the next gate until the current gate's
   evidence is recorded, even when the next task looks independent.
2. **Keep the fast lane green.** Run `./lite test --fast` after every change.
   Run the full gate before recording completion.
3. **Grow the bootstrap in paired increments.** When the compiler needs a new
   capability, add it to the TS seed first, then implement/adopt it in Lite and
   compare the declared self-hosting subset. Avoid unrelated syntax, builtins,
   standard modules, host APIs and CLI behavior. The bounded top-level import
   step is already owner-approved for after the current kernel.
4. **S stays inside L.** Do not use `match`, records, enums, unions, Float,
   arrays, closures, `mut` parameters, modules, `finally`, loop metadata or
   compound operators in S just because the igniter supports them.
5. **No official std.** Shared code lives under a clearly provisional location
   such as `lib/`; it is not `lite-stdlib`, has no stable API, is not imported by
   examples or samples and is not added to the design specification.
6. **No npm in visible commands.** Local gates use `./lite ...`. The repository
   CI separately runs the strict TypeScript check.
7. **Every change has multiple focused and combined-feature cases.** Follow the
   [development guidelines](../.agents/rules/compiler-development.md) for features, syntax/spec
   changes, bug fixes and edge cases. Vary input/output where relevant and cover
   boundaries, invalid forms and interactions. Compiler behavior uses compiler
   cases; language contracts use feature cases and manifests; libraries get
   direct unit tests. Verify generated targets explicitly.
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
15. **Keep project-owned code in the approved file types.** Use `.lt`, `.lts`,
    `.lite`, `.ts` and JSON. Generated TS/C artifacts remain allowed. Command
    aliases link to TypeScript entries; do not add Python, JS, MJS, CommonJS,
    shell or JSX source files. Keep only the igniter and bootstrap TypeScript
    configurations, and include maintained tooling in the shared strict check.
    Documentation, fixture data, workflow configuration and editor assets retain
    their normal formats. `igniter/source-files.test.ts` enforces this policy.

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
| **P8** | Historical full TS/C gate; current minimum is TS | `T2 == T` for the kernel; C remains later |
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
      [`igniter/bootstrap.ts`](https://github.com/redacted/Lite/blob/d3bd6f7bcf06bbea6669c8d74bebe5e73f383114/igniter/bootstrap.ts) is internal; no public
      command was added.
- [x] **Library/unit harness:** run a Lite file or bundle with fixed args/stdin;
      capture `report`, `reportError` and exit status; compare text and bytes.
      `runText`/`runFile`/`runBundle` in
      [`igniter/bootstrap.ts`](https://github.com/redacted/Lite/blob/d3bd6f7bcf06bbea6669c8d74bebe5e73f383114/igniter/bootstrap.ts).
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
      [`igniter/bundle-cli.ts`](https://github.com/redacted/Lite/blob/d3bd6f7bcf06bbea6669c8d74bebe5e73f383114/igniter/bundle-cli.ts); the old emitter paths
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

**T11/T12 verification policy.** During the T11/T12 critical path, each atomic
slice verifies `npm --prefix igniter run check`, `./lite test --fast`, and focused
TS tests only. Do not run the full gate, native C, or C parity per slice; those
are deferred to the P6 gate where full regression and C validation run together.

- [x] TS runtime support: checked Int64 arithmetic, code-point text, list copy
      semantics, diagnostics and exit. The Node I/O adapter remains with the
      generated entry.
- [ ] Full-L front-end in S emits TS directly for functions, tuples, lists,
      typed locals, statements and value conditionals.
- [ ] Single-file artifact; strict TypeScript; erasable syntax; Node entry.
- [ ] Source-name/args/stdin/stdout/stderr/status contract.
- [ ] Deterministic output; no timestamps, paths, PIDs or hash-order iteration.
- [x] **T11:** stage 0 runs S on S and produces a runnable TS compiler.
- [x] T11 typechecks and runs; its artifact hash is recorded.
- [x] **T12:** T11 runs on S and produces TS.
- [x] T12 runs and its artifact hash is recorded.
- [x] `T12 == T11` byte for byte under SHA-256 `8273ce69…` (2026-11-02).
- [x] Corpus: T11 compiles all 92 cases exactly like stage 0 (53 program
      outputs, 39 rejection streams and statuses; zero mismatches 2026-11-02).

**Gate:** T11 exists, typechecks and runs; T11 produces T12; T12 runs and equals
T11 byte for byte. Recorded 2026-11-02 in
[`parity.md`](../compiler/parity.md#bootstrap-ladder). The corpus comparison row
and the C/P7 ladder remain.

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

## P8 — Historical full TS/C self-host and fixed point

This broader TS/C ladder is retained as the former plan. Its C fixed points,
cross-builds and 53/39-case parity requirements are future native work, not
prerequisites for the verified minimum TS kernel or T00 retirement.

**Goal:** prove the bootstrap chain.

- [ ] T compiles S to T2; C compiles S to C2.
- [ ] Record every node and artifact hash in the
      [bootstrap ladder](../compiler/parity.md#bootstrap-ladder): `T11`, `T12`,
      `T13`, `C01`, `C21`, `C22`, `C23`, `T21`, `T22`, `T23`.
- [x] `T11 == T12 == T13` byte for byte for the 2026-11-02 text-cache source
      snapshot; exact identities are recorded in the parity ledger.
- [ ] `C01 == C21 == C22 == C23` byte for byte.
- [ ] `T11 == T21 == T22 == T23` byte for byte.
- [ ] `T2 == T` and `C2 == C` byte for byte. If not, identify the nondeterminism
      and fix it; record any normalized fallback before accepting it.
- [ ] Cross-build: T compiles the C-emitter source to a TS-hosted C emitter
      (refreshed 2026-11-02, artifact `57b3a3fe…`); the native C compiler must
      still compile the TS-emitter source to a C-hosted TS emitter.
- [ ] T and C pass all 53 program and 39 rejection cases with exact streams and
      status.
- [ ] No T/C runtime dependency on stage 0, the Lite compiler or a hidden host.
- [ ] Clean-checkout rebuild produces the same artifact hashes.
- [ ] Bounded evidence is recorded; no claim of universal correctness.

**Gate:** the self-host point's definition of done below is satisfied.

**Do not:** weaken the gate to “it ran once”. Fixed point and corpus parity are
the point.

## P9 — Packaging, CI and provenance

**Goal:** make the bootstrap repeatable and reviewable.

The owner-requested [release automation](release-automation.md) implements a
bounded packaging lane: annotated component tag pushes run the full
gates, verify regeneration of both TS-hosted compilers, and preserve the complete
source/seed/library snapshot with manifests, line maps and hashes. Generated C
program fixtures are built and executed on Linux/macOS x64/ARM64. Manual runs
build without publishing. The remaining native C compiler ladder and native
fixed point are still required for the full P9 gate below; program executables
do not satisfy those compiler gates. `lite-v*` identifies umbrella releases,
`lang-v*` language changes and `script-v*` scripting-part changes.
Compiler, igniter, CLI, formatter, runtime and library versions also advance
independently and are recorded together in each manifest. No version or tag is
created by this change.

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
- [x] Keep the verified generated T11 seed shipped with exact source/builder hashes.
- [ ] Remove active handwritten T00 after the minimal source-import step and
      no-T00 gates; full T11/T00 feature parity is not a prerequisite.

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
- Statements: action `if`/`else if`/`else`, loops, `break`, `return`, blocks,
  `outputLine`, `reportError`, `exit`.
- Functions: typed parameters/results, calls, recursion, `self`.
- Builtins used by S: `inputArgs`, `inputAll`, `outputLine`, `reportError`, `exit`,
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
| `./lite test` / `./lite test --full` | Full current regressions/generated sweeps; native C deferred |
| `./lite verify --all` | All feature/example/sample scenarios and targets |
| `./lite check file.lts` | Source check |
| `./lite compile [--target ts] file.lts` | Generated TS compiler; C deferred |
| `./lite run file.lts [-- argument ...]` | Compile to a temporary artifact and execute it; forwards arguments, streams and status |
| `node compiler/entry.ts program.ts [argument ...]` | Execute a compiled TS artifact directly |

The repository CI also runs the strict TypeScript check and editor tests. Do not
add npm commands to user-facing documentation.

Each gate records:

- the command run and its exact result;
- the test group names or case manifests that prove it;
- whether outputs are byte-identical or behaviorally equivalent, and why;
- the commit and, at a release gate, the annotated tag;
- any new limitation.

## Historical full TS/C definition of done (superseded as the minimum gate)

The current minimum gate is narrower and already measured: the selected TS seed
builds S, S reaches byte-identical TS artifacts through three generations, the
final compiler passes its recorded 93-case compiler corpus, and the build path
does not load T00. T00 retirement additionally requires the source-import and
no-T00 consumer gates in the active handoff.

The point is reached only when all of these are true:

1. S is assembled from the manifest and compiles under stage 0.
2. Stage 0 produces T and C.
3. T typechecks strictly and runs; C compiles with the selected flags and runs.
4. T and C are compilers: they read Lite source, check it and emit artifacts.
5. T compiles S to T2; C compiles S to C2.
6. `T2 == T` and `C2 == C` byte for byte.
7. T and C pass the 53 program and 39 rejection cases with exact streams/status.
8. T and C compile each other's emitter source as a cross-build.
9. No stage-1+ runtime dependency on stage 0 or the Lite compiler.
10. A clean checkout reproduces the artifacts and hashes.
11. Tags, source/builder map, provenance and limitations are recorded.
12. A readable generated TypeScript seed remains shipped. T00's exact seed/source
    remains reproducible from Git history after the approved retirement gates.

## Decisions and stop points

| ID | Decision | Status |
|---|---|---|
| D1 | L is the subset above; S stays inside it | default; change requires owner |
| D2 | Ordered manifest, no import/export syntax | default |
| D3 | Streaming/direct emission, flat IR allowed, no AST | default |
| D4 | Pure L0/L1 libraries; no `mut` params/records/generics/closures | default |
| D5 | TS minimum kernel first; C/native follows separately | owner direction 2026-11-10 |
| D6 | Byte-identical TS fixed point for the kernel; byte-identical C fixed point remains a later native gate | default |
| D7 | No official std/module/CLI/ABI decision | default |
| D8 | New seed language feature needed by S | Add it in the seed first, then Lite; compare the declared subset (owner direction 2026-11-10) |
| D9 | `mut` parameters become necessary for a library API | **stop and ask** |
| D10 | Records/enums/`match` become necessary for the AST/checker | **stop and ask** |
| D11 | Minimal top-level source import after the kernel | owner-approved for bounded implementation; general module/package rules remain open |
| D12 | Host file/process APIs become necessary for the CLI | **stop and ask** |
| D13 | Compiler release tag stream and artifact check-in policy | Generated TS/C-emitter seed check-in selected by owner-approved transition 2026-11-02; igniter release automation uses independent annotated streams: `lite-v*` umbrella, `lang-v*` language, `script-v*` scripting and `compiler-v*` compiler; unselected versions remain unassigned in `versions.json` |
| D14 | C memory model (arena/refcount/free) | choose at P7 and record |
| D15 | Paired seed/Lite growth over the declared self-hosting subset (B8/B11) | owner direction 2026-11-10; full language parity is not a bootstrap gate |

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

Sequential ordinary value declarations now create fresh bindings on generated
TS/C; initializers retain the previous value and later uses obey the new type
and mutation permissions. Corpus: 67 programs/26 rejections; all 66 older
artifact pairs remain identical. Inventory: 88/164 match, 76 remain, with no
regressions. See the [shadowing evidence](../compiler/parity.md#sequential-value-bindings).

Generated expression items now evaluate silently, empty separators are accepted,
and trailing separators retain checked function results. Unit tails preserve
effects and reject incompatible results before artifact output. Inventory:
89/164 match, 75 remain; all 67 program artifact pairs stay unchanged. See the
[expression-item evidence](../compiler/parity.md#ordinary-expression-items).
