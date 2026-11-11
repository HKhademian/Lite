---
name: igniter-transition
status: in_progress
created: 2026-11-02
todos:
  - id: t11-default
    content: Make T11 the default TS compiler and migrate TS verification/build callers
    status: completed
  - id: c-host-migration
    content: Build the C emitter with T11 and remove T00 from the C compilation host
    status: completed
  - id: core-syntax-baseline
    content: Port important existing syntax and ordinary program behavior needed by generated default workflows
    status: pending
  - id: generated-default-workflows
    content: Keep the interpreter run launcher removed; provide compile-and-execute `lite run`; use generated TS artifacts for check, compile, verification and tests; retain explicit T00 references
    status: completed
  - id: existing-feature-parity
    content: Grow Lite compiler support feature by feature after T00 retirement; keep T00 parity cases as explicit backlog
    status: pending
  - id: source-imports
    content: Keep the top-level source-expansion bridge needed by the old seed, with explicit dependency metadata
    status: completed
  - id: module-imports
    content: Implement aliased imports and explicit public visibility in Lite, then remove source flattening
    status: pending
  - id: retire-t00
    content: Remove active handwritten T00 after source imports and no-T00 gates; full feature parity is not required
    status: completed
  - id: native-self-host
    content: Post migration restore C output and complete native self-hosting and cross-host ladder
    status: pending
plans:
  requires: []
  blocks: []
  parallel: []
---

# T11 and C transition

## Mission

Carry out the owner-approved transition from the handwritten T00 implementation
to one Lite compiler source of truth, with TS and C backends. The owner approved
the transition on 2026-11-02, after benchmarking; start with the TS default path.
Retain T00 functionality until it has a tested replacement. Existing language
features may be ported; new syntax, builtins and semantics still require approval.

Latest owner direction, 2026-11-02: switch to the Lite-written compiler as fast
as possible while retaining TS self-hosting. Remove the interpreter run launcher.
Compile every supported language feature to a TS artifact and execute that
artifact. Public C output and native self-hosting resume **after TS migration and
T00 retirement**; neither blocks the default switch or retirement. Advanced
correctness and edge coverage follow ordinary syntax migration. Retain T00 only
as an explicit reference until the TS replacements are complete. This supersedes
earlier native-first ordering in historical progress entries.

Owner direction, 2026-11-11: complete the self-hosting path through retirement
of the handwritten implementation. The minimum TS kernel, top-level source
imports, and T00 retirement are now implemented. Retain recorded contracts and
historical reports, remove live interpreter/reference routes and audit tools,
and proceed to the typed compiler-stage architecture. The Lite CLI remains a
router over dedicated tools.

Owner update, 2026-11-05: `./bin/lite run` returns as a compile-and-execute adapter
over the generated compiler and Node entry; the retired interpreter launcher
stays removed and no T00 fallback is added.

Owner direction, 2026-11-10: the current Lite-written TS compiler already
rebuilds to an identical three-generation fixed point and passes its 93-case
compiler corpus. The self-hosting gate is the compiler-source subset, not all
existing T00 behavior. Add the bounded top-level source import and explicit
dependency information, then remove active T00 consumers without waiting for
the 60 remaining T11 rejections. Continue those feature ports after retirement
in paired seed/source increments. Native C remains later work.

Owner clarification, 2026-11-11: the fixed point is evidence for the current
compiler source, not completion of the kernel contract. Before source imports,
reject duplicate root value definitions while preserving nested bindings, allow
deferred function bodies to resolve later compile-time-known root values, and
keep eager root initialization in written order. Root-symbol definitions are
compile-time facts; runtime values still become available only at initialization.

Owner direction, 2026-11-11: the existing host-expanded `import "path";` is a
temporary bootstrap bridge, not the selected language import. The language form
is `module := import "relative/path.lts";`; module members require explicit
`pub`, source files remain separate compilation units, and the finished active
path removes text flattening.

## Done

- 2026-11-05: `./bin/lite run` returns as a compile-and-execute adapter over the generated compiler instead of the retired interpreter launcher. It compiles one `.lts` script into a temporary directory, executes the TS artifact through `compiler/entry.ts`, forwards program arguments after an optional `--`, inherited streams and exit status, and removes the temporary directory; rejected source keeps its exact diagnostics and status without executing effects. Seven declarative tool scenarios cover prompted input, forwarded arguments, propagated status, rejection, missing source, non-script source and the `--check` hint; a host test proves temporary-directory removal. The isolated public-command fixture copies `tools/run.ts`, and the launcher and public-command tests now assert the adapter contract instead of usage rejection. CLI help, start-here, examples, naming, specification, bootstrap and migration docs record the adapter while the interpreter launcher stays removed. Compiler source and seed are unchanged. Fast: 136 pass/12 skips (150.1 s); full: 139 pass/nine native skips, zero failures (149.6 s). Coverage: 41/41 features, 19/19 examples, 20/20 samples. The canonical TS audit is unchanged at 60/81 with the same 21 visible failures, and docs links/fragments/fences, strict checks and nine editor groups pass.

- 2026-11-03: w3 completes generated-only routine tooling. Self-build strictly checks three named generations and records real source/builder identities; corpus validation checks 93 compiler contracts and 69 TS runtime scenarios against recorded expectations. Benchmarking records generated process/load/compile/check/runtime phases with three samples and one excluded warmup. Old T00 audit programs are preserved byte-for-byte apart from routing comments and require --reference. Five CLI regression groups include absent T00/Git, malformed inputs, wrong compilers and a legitimate changed-source fixed point. Fast: 124 pass/12 skips; ordinary and no-T00 full: 127 pass/nine native skips, zero failures. Reference 162/162, nine editor groups, strict checks and both corpus routes pass. Source/seed remain unchanged; the canonical audit is still 60/81 with 21 visible pending ports. See [evidence](reports/2026-11-03-generated-tooling.json), [tool guide](bootstrap/README.md) and [baseline](../benchmark/reports/2026-11-03-generated-compiler-performance.md).

- 2026-11-03: default tests now compile with generated Lite, strictly check TS and execute isolated artifacts; checked library/phase drivers are reused across inputs. All 93 compiler fixtures, eight library entries and 81 original generated tests remain covered. T00 checks require `./bin/lite test --reference` (162 pass). Ordinary and T00-free source-archive fast suites each pass 119 with 12 deferred skips; full suites each pass 122 with nine native skips and zero failures. Strict checks, nine editor groups and three identical self-builds pass; source/seed are unchanged. The default static graph has 18 modules and no T00 imports. CI now runs the full no-T00 suite. The canonical TS audit still reports 60/81 passing with 21 visible pending ports. See [the evidence](reports/2026-11-03-generated-tests.json). Routine tooling remains w3 work.

- 2026-11-03: w1 test contracts are separated: all 240 original igniter tests retain destinations (81 generated/phase/artifact, 159 reference), and 776 exact process contracts replace live T00 expected-value lookups. Shared manifest loading retains all 93 compiler fixtures. Five contract/ownership checks, six copied-checkout no-T00 host groups, strict host/seed checks, three identical generated self-builds and nine editor groups pass. Fast: 278 pass/12 skips; full: 281 pass/9 native skips, zero failures. Compiler source/seed and the 60/81 canonical TS audit are unchanged. Default actual compiler/phase helpers and reference selection remain w2 work. See [the evidence](reports/2026-11-03-test-contracts.json) and [contract guide](tests/contracts/README.md).

- 2026-11-02: verification and expectation updates now use TS artifacts by
  default, independent of historical manifest target metadata. T00 loads only
  with --reference; C execution is deferred. Compile/check once per manifest,
  then execute each scenario in a fresh process; fully cached manifests do no
  compilation. A checkout without T00 verifies and updates supported cases,
  rejects unsupported updates without rewriting expectations, and reports
  coverage. TS canonical audit: 60/81 pass, 21 visible migration failures
  (13 features/eight examples); explicit T00 reference: 81/81 pass. Strict host
  and seed checks pass; full current regression suite: 274 pass, nine native-only
  skips, zero failures (132.2 s). Three generated-only self-build generations
  all equal the selected 77cacbac seed. Default regression routing remains next.

- 2026-11-02: public run is removed. Compile defaults to generated TS; check
  compiles with T11 and strictly checks without loading/executing the artifact.
  Both preserve flat-import loading and fail without T00 fallback. Real CLI
  cases cover absent T00, unsupported source, input/arguments, effects, status,
  caller directories and path spaces. C requests reject explicitly; C/native
  gates move after TS retirement. Strict host/seed checks pass, six focused CLI
  groups pass, and the current full suite passes 273/282 with nine native-only
  skips and zero failures (130.0 s). No Lite source or seed changed. Verifier and
  default test routing remain the next separate consumer migration unit.

- 2026-11-02: shared Lite numeric-name normalization admits Int64/Float64/Double
  across existing scalar, user-alias, tuple, List and function contracts. Parser
  and checker phases share the same mapping. All 278 full tests, both corpora,
  strict checks, 126 verifier runs, coverage, nine editor groups and six native
  sanitizer cases pass. Three generated generations match; all 69 earlier TS/C
  fixture pairs are unchanged. Inventory: 108/169 match, 61 remain, 52 original
  failures closed, none regress. A passing alias feature and newly retained
  failing Float integer-literal probe expand the denominator. See the
  [ladder](reports/2026-11-02-numeric-aliases-ladder.json). The literal-context
  port is the next core migration dependency; advanced width/rounding matrices
  remain deferred until after the default cutover.

- 2026-11-02: the selected right-associative, Float-default positive-exponent
  power checkpoint now lowers on TS/C. The frontend/parser enforce negative-base
  grouping, including concealed minus that T00 still admits; the standalone
  checker infers Float power results. Native runners link the math library.
  All 276 full tests, both 93-case corpora, strict checks, 123 verifier runs,
  coverage, nine editor groups and six native sanitizer cases pass. Three
  generated generations match; all 69 prior TS/C fixture pairs are unchanged.
  Inventory: 105/167 match, 62 remaining, 50 original failures closed, none
  regress. See the [ladder](reports/2026-11-02-power-ladder.json). Next: common
  numeric annotations and ordinary data/call/control syntax before the early
  Lite default cutover. Final signed-exponent semantics and exhaustive math
  rounding remain outside this checkpoint.

- 2026-11-02: existing mixed Float arithmetic/comparisons now run on generated
  TS/C, with finite-result and zero-divisor faults, pairwise comparison
  conversions and lazy operand sequencing. All 20 implemented samples pass
  generated TS; nine affected lessons now select TS/C verification explicitly.
  Inventory: 103/167 match, 64 remaining; 48 original failures closed, none
  regress. All 274 full tests, both corpora, strict checks, 121 verifier runs,
  coverage, nine editor groups and six native sanitizer cases pass. The
  [ladder](reports/2026-11-02-float-arithmetic-ladder.json) records the generated
  fixed point; paired timings are mixed. Next: power and ordinary numeric
  annotations, followed by remaining core syntax and the early default cutover.

- 2026-11-02: constant arithmetic attempts return checked results; an invalid
  result lowers to the existing runtime helper instead of failing compilation.
  Dead branches, false loops, short-circuit operands and unused function bodies
  therefore do not execute their faults. Valid folding stays intact; literal
  range/type/name errors still reject before effects. Constant MIN%-1/MIN:%-1
  emit zero, avoiding native C undefined remainder. Eight obsolete eager-fail
  wrappers are removed. Six unchanged source fixtures move from compile
  rejection to runtime-fault programs: corpus 61 programs/32 rejections, still
  93 sources. TS/translated-JS fault runs are isolated without removing
  return-text coverage for pure successful cores. The
  [ladder](reports/2026-11-02-deferred-faults-ladder.json) records three matching
  generated generations, native sanitizer coverage and gates. Inventory is
  77/163 matching, 86 remaining, 26 original failures closed, no regressions.
  Next: comparison-chain lowering; Unicode column units remain separately pending.

- 2026-11-02: a shared single-equals token check distinguishes assignment/tuple
  fields from both == and =!=. Parenthesized inequality and bare String/Int/Bool
  function tails now work; ordinary assignment and named tuple fields retain
  their behavior. Focused checks cover 12 TS programs, seven native C programs
  and ten rejection comparisons. The new bare-function-tail probe preserves
  the discovered failure in the inventory. Three generated generations match;
  [the ladder](reports/2026-11-02-inequality-ladder.json) records identities and
  gates. Current inventory: 75/163 matching, 88 remaining, 24 original failures
  closed without a regression. Deferred arithmetic faults precede comparison
  chains so skipped later operands do not fault during compilation.

- 2026-11-02: generated TS textAt/textSlice, list reads and pop_back now
  report exact positioned BoundPanic diagnostics and preserve prior output.
  Numeric source offsets reuse one fault-location table, including arithmetic,
  instead of rescanning source per access. Focused cases cover named/anonymous
  diagnostics, CRLF, BMP text, nested effects, negative/huge indices, empty
  reads/pops, valid bounds and loops. Three generated generations match; the
  [ladder](reports/2026-11-02-bounds-ladder.json) records gates and identities.
  Inventory: 73/162 matching, 89 remaining, 23 original failures closed and
  no original passing case regressing. The same-line supplementary-character
  column convention is separately pending an owner choice; earlier finite
  probes did not cover it. Next: comparison parsing and the other live topics.

- 2026-11-02: C multi-value output evaluates every argument once before any
  write, preserving earlier calls and left-to-right fault order. Single-value
  calls retain exact emitted C and avoid unused temporary names. Fourteen
  focused programs cover later/competing faults, output/outputLine, empty/Unit/
  mixed values, loops and name hygiene; six also pass native sanitizers. The
  [C-only ladder](reports/2026-11-02-c-output-ladder.json) records an emitter
  rebuilt by unchanged T11, with TS source/seed/artifacts unchanged. All 256 full
  tests pass (zero skips, 48.5 s); fast 244 pass/12 expected skips, strict checks,
  both 93-case corpora, 95 verifier runs and nine editor groups pass. Paired C
  timings are steady: 78.8 → 79.6 ms for 1,000 single-value calls, 185.7 → 181.7 ms
  for 200 multi-value calls. Next: positioned bounds faults, then comparisons.

- 2026-11-02: target helper requirements are collected once per program, skipping
  escaped quoted text and consuming whole identifiers. TS/C helper queries now
  read a distinct-name set instead of rescanning item code and copying the full
  item list. The [paired benchmark](reports/2026-11-02-helper-scan-performance.json)
  records compiler-phase medians of 100.0 → 60.4 ms for 1,000 output statements
  and 899.0 → 649.8 ms for the same compiler source (five pairs; exact emitted
  bytes). The [generated-only ladder](reports/2026-11-02-helper-scan-ladder.json)
  records three matching generations. This optimization changes no accepted
  language behavior or measured gap count; next is the discovered C output
  argument-fault ordering flaw.

- 2026-11-02: the [division-family refresh](parity.md#positioned-integer-division-family)
  matches exact runtime fault positions, names, streams and status for dynamic
  `/`, `%`, `:/` and `:%`. MIN%-1 returns zero, including the shared core's
  constant folding; C guards undefined division/remainder before evaluating it.
  C helper calls sequence operands once from left to right. Three generated
  generations match; the [ladder](reports/2026-11-02-division-ladder.json) records
  provenance and gate results, with 14 exact native sanitizer cases. Current
  inventory improves to 71/162 matching cases, 91 remaining, and 21 formerly
  failing original cases closed without a regression. The [paired speed check](reports/2026-11-02-division-performance.json)
  records steady self-compilation and a 1,000-output scan cost; optimize helper
  discovery next, then continue bounds/comparison and the other live topics.

- 2026-11-02: checked dynamic Int64 addition, subtraction, multiplication and
  negation now lower through Lite-defined TS and portable C11 helpers. Runtime
  overflow matches T00's exact source-positioned ArithmeticPanic, status and
  prior output. C guards run before signed arithmetic, with source-offset
  temporaries preserving left-to-right nested faults. Boundary/sign matrices,
  eleven fault expressions, short-circuit/untaken branches and TS call effects
  have differential coverage. The generated-only [seed ladder](reports/2026-11-02-int64-ladder.json)
  records three identical generations and refreshed C emission. This closes
  these four dynamic Int64 operations; wider numeric/type/operator parity,
  run/check migration and the native compiler ladder remain pending.
  Strict host/seed checks, all 253 full tests (zero skips, 54.6 s), fast 243 pass
  with ten expected skips (30.4 s), nine editor groups, both 93-case corpus
  comparisons and all 95 verifier executions pass. Six native boundary/fault
  programs also pass undefined-behavior sanitizer checks with exact streams/status.

- 2026-11-02: owner-selected [temporary I/O migration](../docs/tooling-and-learning.md#temporary-input-and-output-helpers-selected-2026-11-02)
  replaces report with outputLine (no alias), adds output without a newline,
  allows zero output arguments, and adds array/list display on T00. Generated TS
  displays admitted scalar/Unit, named-tuple and List values and implements all
  four optional-prompt input helpers, with shared lookahead, checked numeric
  input and strict incremental UTF-8. Process adapters stream output, retaining
  earlier output on faults; Unit function tails retain effects. All maintained
  Lite calls, active snippets and source/position/AST/hash fixtures are migrated.
  Generated verification now uses strict child artifacts with stdin/arguments.
  Three generated compiler generations match, rebuilt from the previous seed
  through a reproducible call-spelling adapter, without T00 execution. The
  [ladder](reports/2026-11-02-io-migration-ladder.json) records identities and
  validation: strict checks, 251 full tests with zero skips (51.7 s), fast
  242 pass/nine expected skips (30.1 s), nine editor groups, both 93-case corpus
  comparisons (55 programs/38 rejections), and 95 canonical target executions.
  Historical checkpoints stay preserved. Wider TS type/operator parity and C
  input/aggregate support remain pending; next work is checked Int64 arithmetic.

- 2026-11-02: migrate full-source lexer/parser/checker test consumers from T00
  interpretation to T11-generated, strictly checked TS drivers. Retain every
  sweep assertion and compare focused fixtures exactly with T00; reuse each
  checked artifact across fresh input processes. An equivalent checker local
  Boolean avoids the known parenthesized-comparison gap, with no S/seed changes.
  A prepared-runner regression checks isolation and typecheck failure phases.
  [Recorded full-gate timing](reports/2026-11-02-generated-sweeps.json) falls from
  580.6 s to 47.6 s (12.19×); all 248 tests pass with zero skips. Fast: 239 pass,
  nine existing skips, 26.7 s. Strict checking passes. Native C11, feature parity
  and run/check migration remain pending.

- 2026-11-02: the first existing-feature-parity slice fixes generated TS report
  evaluation order in the Lite emitter. Arguments evaluate once, left to right,
  before appending the outer line, retaining nested report effects. Six focused
  scenarios cover multiple arguments, recursion, mixed scalars, loops and exit.
  The [refreshed seeds](parity.md#report-order-seed-refresh) reproduce themselves
  across three generations (`49ac81d6…`), both from a generated-only refresh and
  an independent T00 audit. The C source and emitted C programs are unchanged;
  its TS-hosted seed is refreshed with the new TS compiler. Current exact hashes
  cover all 53 program fixtures; P0 hashes and the support inventory stay
  historical. Strict checks, eight host tests, both 92-case target comparisons,
  91 verifier executions, 238 fast tests (nine expected skips), all 247 full
  tests (zero skips, 581 s), and nine editor groups pass. Next: checked dynamic
  Int64 arithmetic. Full feature parity, native C11 and T00 retirement remain
  pending.

- 2026-11-02: owner-required [code-file policy](../docs/tooling-source-policy.md)
  converts compiler/benchmark/challenge tooling and editor tests to strictly
  checked TS. Command aliases link to TS entries, the JSX report is removed,
  and only igniter/bootstrap tsconfigs remain. Compiler seeds and challenge data
  are unchanged. A regression check enforces the permitted source types. Full
  suite 246/246 (zero skips), fast 237/9 expected skips, 9 editor groups, both
  92-case compiler comparisons and 1,811 rebuilt dataset files pass. This does
  not advance the remaining language/native feature milestones.
- 2026-11-02: generated text helpers share a bounded cache of eight immutable
  code-point views, eliminating repeated whole-source copies during scanning.
  The [benchmark](../benchmark/reports/2026-11-02-text-cache.md) records 23.91×
  faster process time for 1,000 statements (3489 → 146 ms), exact emitted bytes
  and a 668 ms median self-build. New S (`17e53ce5…`) produces three byte-identical
  strictly checked TS generations (`56d99755…`); the TS-hosted C emitter is
  refreshed (`57b3a3fe…`) from unchanged C source. Unicode/cache-eviction probes,
  strict checks, fast suite (233 pass/9 expected skips), both 92-case corpus
  comparisons, all 91 verifier executions, all 242 full-suite tests (zero skips,
  564 s) and all 9 editor grammar groups pass. Native C and full feature
  parity remain pending. Historical timing/hash records are preserved.
- 2026-11-02: default verification now selects consumers after compiler host,
  seed, source, manifest, runtime and core-library changes. A real CLI test
  supplies changed-file listings without modifying Git state and verifies all
  three targets, while inventory-only edits select none. Strict checking,
  all 7 host/selection tests and the fast suite (232 passed, 9 expected skips)
  pass. No language or compiler-output contract changed in this slice.
- 2026-11-02: C emission and compiler verification now use the Lite C emitter
  compiled by T11 into a TS-hosted compiler (`bootstrap/c-emitter.ts`, 233360
  bytes, SHA-256 `b5459cc7…`). Its source hash is `413044da…` and builder is the
  preserved T11 `8273ce69…`. Both targets work without T00, retain exact
  artifacts/diagnostics, rebuild changed sources with T11 and validate target-
  specific caches. This is not the native C11 compiler. Strict host/both seed
  checks, all 6 host tests, full suite 240/240 with zero skips, both 92-case
  target comparisons (53 programs/39 rejections) and 91 verifier executions pass.
- 2026-11-02: owner-requested neutral [T00/T11 support inventory](reports/2026-11-02-t00-t11-inventory.md)
  precedes further migration work. It audits all 36 feature manifests, 19 examples,
  20 implemented lessons, 78 additional boundary probes, all 8 library tests and
  accounts for all 207 tracked Lite source files. T00 matches every canonical
  manifest. T11 rejects 16 canonical feature cases, 17 examples and 9 samples;
  probes find 7 runtime behavior differences and 2 diagnostic differences as
  well as 61 rejected forms. Passing cases are not claims of full feature parity.
  C-host edits were set aside before auditing; no porting priorities are selected.
- 2026-11-02: default TS compilation, TS verification and current-S builds now use
  the verified generated T11 seed without executing T00. Changed S rebuilds into
  a strictly checked source/builder-keyed cache; seed/cache integrity, original
  source diagnostics and failure-without-fallback are covered. A copied checkout
  with no T00 implementation compiles TS successfully. The historical ladder
  still selects T00 explicitly, and C/run/check retain their existing host.
- Validation: strict host and seed checks passed; `lite test --full` passed all
  238 tests with zero skips (about 514 s); the fast lane passed 229 with its 9
  expected skips. All 91 verifier target executions, 92 corpus comparisons
  (53 programs/39 rejections) and 9 editor grammar groups passed. Four focused
  host tests also passed after the final rebuild-diagnostic mapping adjustment;
  a native follow-up passed 235 with only the 3 full-S sweeps skipped.
- The original T11/T12 snapshot was recorded byte-identical; the compiler corpus
  is 53 program and 39 rejection cases. The subsequent text-cache refresh above
  records T13 as well. Native C fixed points are not recorded.
- The performance report and raw samples are under `benchmark/reports/`, saved
  separately from the TS migration. Preserve their recorded source revision and
  historical raw measurements when updating the benchmark runner.

## Read first

- [Live gap/progress tracker](gaps.md) and [current measured inventory](reports/current-t00-t11-inventory.md)
- [Parity ledger](parity.md)
- [Bootstrap plan](../docs/bootstrap-plan.md)
- [Compiler launcher](../bin/lite-compile)
- [Existing bundle CLI](https://github.com/redacted/Lite/blob/d3bd6f7bcf06bbea6669c8d74bebe5e73f383114/igniter/bundle-cli.ts)
- [Verifier](../igniter/verify.ts)
- [Artifact runner](../igniter/artifacts.ts)
- [TS ladder](scripts/self-host.ts)
- [Corpus parity](scripts/corpus-parity.ts)
- [Measured T00/T11 support inventory](reports/2026-11-02-t00-t11-inventory.md)

## Implementation order

### Step 3a — generated-default-workflows (completed 2026-11-03)

Public check/compile/verify and default tests execute generated TS. Routine build,
three-generation self-hosting, corpus and benchmark commands work without T00.
Historical audits require explicit --reference selection. Unsupported canonical
contracts still fail visibly, and T00 is not retired. Source/seed identities and
all completed workflow evidence are recorded above. Continue with core syntax.

### Step 3b — source-import-bridge (completed 2026-11-11)

**Depends on:** generated-default-workflows and the verified TS kernel.
**Actions:** estimate the cost of a top-level-only import clause for local source
files. Reuse existing path validation, source locations and flattening where
appropriate; record every dependency explicitly. A file is marked visited when
opened so repeated imports and cycles terminate. Keep packages, search paths,
version solving, nested imports, initialization scheduling and general module
semantics out of this increment.
**Acceptance:** Lite source now declares dependencies with one top-level
relative `.lts` import. Ordered DFS expansion marks sources visited on open,
terminates repeated/cyclic edges, reports imported source locations, and keeps
the dependency closure in build results and cache provenance. TS/C manifest
roots use imports and reproduce the same generated bytes and T12 fixed point.
No package or initialization policy was added.
**Verify:** import/host/CLI focused cases, `node compiler/scripts/build.ts`,
three-generation self-host fixed point, 94-case corpus parity, and
`./bin/lite test --fast` (140 passed, 12 skipped, 0 failed).

This milestone describes only the transitional host loader. Its bare
`import "path";` text expansion is not the selected Lite language contract and
must not be treated as completion of module imports.

### Step 3c — retire-t00 (completed 2026-11-11)

**Depends on:** generated-default-workflows, the verified TS kernel and
completed source-imports.
**Actions:** audit active CLI, tests, verifier, tooling and recovery dependencies.
Preserve generated corpus expectations and the exact T00 source/seed provenance
in existing Git history. Remove T00 from the active tree and remove explicit
reference routes. Do not wait for unrelated T11 feature rejections to reach zero.
**Acceptance:** the active tree has no handwritten T00 implementation,
interpreter adapter, reference CLI/test/verifier/benchmark route or T00-dependent
inventory generator. Default build, tests, verification, imports,
three-generation self-host and recorded compiler corpus use the generated
compiler. Historical reports remain labeled; future cases use reviewed
recorded contracts.
**Verified:** `./bin/lite test --full` (143 passed, 9 native-only skips, 0 failed);
`./bin/lite verify --coverage`; `./bin/lite doctor`; strict TypeScript check; migration
baseline unchanged (60/81 scenarios pass, 21 known gaps); generated build;
three-generation exact T12 fixed point; 94-case corpus (zero mismatches); and
source-archive route tests without Git metadata.

### Step 3d — module-imports (pending)

**Depends on:** generated-default-workflows, the verified TS kernel and the
post-self-hosting stage architecture.
**Actions:** implement only aliased module bindings
(`module := import "relative/path.lts";`), explicit top-level `pub` visibility,
per-file compiler stages and separate `visited`/`processed` state. Preserve the
host expander only while an old seed is needed to create generated support; then
move active builds to separate source units and remove source splicing and
flattened-line mapping.
**Acceptance:** imported private names are unknown to importers; public members
resolve through immutable aliases; repeated aliases share one module and
definition identity; each canonical file is entered and compiled once; original
source spans survive every stage; generated compiler source reaches a fixed
point without text flattening.

### Step 4 — language-growth

**Depends on:** retire-t00.
**Actions:** port the remaining documented language features in small increments.
For each needed feature, update the seed/compiler loop, then S, and compare the
declared bootstrap subset. Keep unsupported or advanced edge cases visible in
the parity backlog; do not turn full historical parity into a self-host gate.
**Verify:** focused contracts, generated compiler rebuild, subset comparison,
fixed point and affected corpus checks per increment. C ports are separate.

### Step 5 — native-self-host (post migration)

**Depends on:** TS self-hosting and T00 retirement.
**Actions:** restore public C output after porting the remaining frontend/runtime
support; build native C11 and the defined C01/C21-C23 and T21-T23 ladder. Preserve
all historical node identities and prove their equality rather than renaming.
The retained TS-hosted C emitter is not a native compiler fixed point.
**Acceptance:** all TS/native cross-builds and fixed points pass with recorded
source/builder identities and a documented C memory strategy.
**Verify:** strict native C builds, runtime boundary tests, corpus, clean rebuild,
artifact hashes and the full native/cross-host ladder. These are later gates.

## Constraints and key facts

- Record each phase only after its checks pass; switching the launcher does not
  imply that later feature, native or retirement phases are complete.
- Keep host glue small; language implementation belongs in Lite.
- Do not change the language source subset merely to simplify host integration.
- Do not modify published tags or create release tags without a release decision.
- Preserve source names, invalid UTF-8 rejection, output streams and status.
- Source/manifest changes must not silently use a stale generated compiler.
- Current source/artifact hashes and byte counts belong in
  [TS seed metadata](bootstrap/seed.ts) and [C emitter metadata](bootstrap/c-seed.ts),
  rather than duplicated checkpoint values here. Source/builder identities are
  recorded there;
  actual host Node v24.16.0, repository pin 26.13.0, TypeScript 7.0.2.
- Original TS self-compilation was slow; the original benchmark's two 60 s
  timeouts remain censored observations. The text-cache snapshot has a recorded
  668 ms successful self-build median. The current checked-arithmetic source has its
  own three-generation equality; its timings are not a new benchmark.

## Overall acceptance

- TS migration: existing supported features compile and execute from TS artifacts;
  default consumers use Lite; the TS self-build/fixed point remains reproducible.
- T00 retirement: active consumers have TS replacements and pass in a clean
  checkout without T00. C/native work does not block this gate.
- Post migration: restore C output and complete native/cross-host fixed points
  and corpus gates with recorded provenance.
