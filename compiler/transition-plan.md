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
  - id: existing-feature-parity
    content: Inventory and port existing T00 features into the shared Lite frontend and targets
    status: in_progress
  - id: native-self-host
    content: Complete native C self-hosting and the cross-host fixed-point ladder
    status: pending
  - id: retire-t00
    content: Remove T00 from the active tree after all consumers and features migrate
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

## Done

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
- T11/T12 are recorded byte-identical; the current compiler corpus is 53 program
  and 39 rejection cases. T13 and native C fixed points are not recorded.
- The performance report and raw samples are under `benchmark/reports/`, saved
  separately from the TS migration. Preserve their recorded source revision and
  historical raw measurements when updating the benchmark runner.

## Read first

- [Parity ledger](parity.md)
- [Bootstrap plan](../docs/bootstrap-plan.md)
- [Compiler launcher](../litec)
- [Existing bundle CLI](../igniter/bundle-cli.ts)
- [Verifier](../igniter/verify.ts)
- [Artifact runner](../igniter/artifacts.ts)
- [TS ladder](scripts/self-host.mjs)
- [Corpus parity](scripts/corpus-parity.mjs)
- [Measured T00/T11 support inventory](reports/2026-11-02-t00-t11-inventory.md)

## Implementation order

### Step 3 — existing-feature-parity

**Depends on:** c-host-migration.
**Files:** `compiler/src/`, `compiler/runtime/`, `compiler/tests/`, existing
verification cases, seed/build records and relevant docs.
**Actions:** use the completed neutral support inventory and its exact probes,
distinguishing implemented contracts from wider language design. Then
port one existing feature per checked slice into Lite; update TS/C lowering and
runtime support, preserve checked semantics, refresh generated compiler artifacts
and record feature parity. Include the known report argument-order difference.
Before source-changing slices, extend verifier changed-file selection to compiler
host/seed/source and core-library changes: its runtime hash includes those inputs,
but the current affected-case selector only explicitly recognizes igniter files.
**Acceptance:** every existing T00-supported contract has an equivalent Lite
compiler path or an explicitly approved exception; no new language decisions.
**Verify:** focused boundary probes per slice, strict check, fast suite, canonical
feature cases on applicable targets; full regression at the gate.

### Step 4 — native-self-host

**Depends on:** existing-feature-parity.
**Files:** C emitter/runtime, bootstrap scripts/provenance, corpus tests and docs.
**Actions:** complete native compiler runtime/memory support and checked arithmetic;
record the C memory strategy; build C01 and the defined C21/C22/C23 and
T21/T22/T23 nodes, plus T13, with exact artifact equality and corpus evidence.
**Acceptance:** all fixed points and cross-builds pass without a T00 runtime
dependency. The owner-requested C11 is the first native compiler emitted through
T11, `CompileC(T11, S)`; preserve C01/C21 and the older audit labels, and prove
their equality rather than silently renaming a node. The current TS-hosted C
emitter is not C11.
**Verify:** `-std=c11 -Wall -Wextra -Werror`, native boundary cases, full corpus,
clean-checkout rebuild and artifact hashes.

### Step 5 — retire-t00

**Depends on:** native-self-host.
**Files:** `igniter/`, launchers, host tests and all current references.
**Actions:** audit every import, CLI/test/verification dependency and historical
rebuild instruction. Preserve the exact T00 seed revision and builder map in Git
history; do not move tags. Remove the handwritten implementation from the active
tree only after run/check/test/verification replacements and parity pass.
**Acceptance:** clean checkout supports all formerly supported features with no
active T00 implementation; bootstrap recovery remains reproducible from history.
**Verify:** full strict/runtime/editor/native gates, clean rebuild, dependency scan.

## Constraints and key facts

- Record each phase only after its checks pass; switching the launcher does not
  imply that later feature, native or retirement phases are complete.
- Keep host glue small; language implementation belongs in Lite.
- Do not change the language source subset merely to simplify host integration.
- Do not modify published tags or create release tags without a release decision.
- Preserve source names, invalid UTF-8 rejection, output streams and status.
- Source/manifest changes must not silently use a stale generated compiler.
- The current seed is 243216 bytes, SHA-256
  `8273ce69973afb8beb25052dc2c8ef4b0682c00f4af866623ece751531b15e39`.
- Current S is 155219 bytes, SHA-256
  `827f90152433e65d2134f6e6df294d2c544b4bd665b879e9a3bd55d1eac343b8`.
- Compiler revision: `dc0028d7713f93d844d56a180bc6e6e42f92f68f`; actual host Node
  v24.16.0, repository pin 26.13.0, TypeScript 7.0.2.
- TS self-compilation is slow; the benchmark's two 60 s timeouts are censored
  observations, not successful build durations or a new fixed-point validation.

## Overall acceptance

- Both targets and all former T00 capabilities share the Lite frontend.
- TS/native fixed-point and corpus gates pass with recorded provenance.
- T00 is removed only after its active consumers have replacements.
