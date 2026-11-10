---
name: self-hosting-kernel
status: pending
created: 2026-11-10
todos:
  - id: cli-router
    content: "Step 0 — make lite a router over dedicated tool commands"
    status: completed
  - id: define-kernel
    content: "Step 1 — define and verify the compiler-capable self-hosting kernel"
    status: pending
  - id: source-imports
    content: "Step 2 — add source imports in Lite after the kernel gate"
    status: pending
  - id: retire-reference
    content: "Step 3 — retire the active T00 dependency after imports and the kernel gate"
    status: pending
  - id: stage-architecture
    content: "Step 4 — define clean typed compiler stages after self-hosting"
    status: pending
  - id: language-growth
    content: "Step 5 — expand supported language feature by feature"
    status: pending
plans:
  requires: []
  blocks: []
  parallel: []
---

# Agent Handoff: Self-hosting kernel and compiler growth

> **For the next agent.** Recenter Lite's compiler transition around the smallest language subset that can implement and rebuild the compiler, then grow Lite through verified increments.

The historical TS0/LT0 sequence, terminology, comparison scope, and LT1/LT2
fixed-point definition are recorded in the dated
[self-hosting strategy](../../docs/self-hosting-kernel-strategy-2026-11-10.md).
Use that document for the model; use this handoff and current project plans for
implementation status and gates.

## Mission

Reach a reliable generated compiler fixed point using only the portion of LiteLang needed to express the compiler. Do not make all of the language specification a self-hosting prerequisite. After that gate, evaluate a minimal top-level import feature in Lite, retire the active T00 dependency once the imported-source path is proven, establish an explicit and extendable compiler-stage architecture, and implement the already documented language surface before taking on remaining proposals.

## Done

- Reviewed the current Lite checkout at `e6406ad` (2026-11-10 planning turn); working tree was clean.
- Completed the CLI-router phase: `lite` now owns routing/help only; dedicated `lite-compiler-ts`, `lite-check`, `lite-run`, `lite-verify`, `lite-test`, `lite-docs`, `lite-doctor`, `lite-bench`, and `lite-release` commands own the operations.
- Recorded the TS0/LT0 minimal bootstrap path and LT1/LT2 reproducible fixed-point definition in [`docs/self-hosting-kernel-strategy-2026-11-10.md`](../../docs/self-hosting-kernel-strategy-2026-11-10.md).
- Confirmed T11 generated TS is the public/default compiler path and rebuilds its supported Lite source subset. T00 remains a historical reference. Native C output and native self-hosting remain deferred.
- The latest recorded T00/T11 inventory is dated 2026-11-02: 112/172 executed source cases match; 60 cases fail. Treat this as a stale planning baseline, not a completion percentage.
- Confirmed compiler source is split into `compiler/src/*.lts` and assembled through ordered manifests. This glue is acceptable for the initial self-hosting kernel.
- Captured owner direction: definitions/symbols are distinct from runtime values; repeated names in one flat scope should be rejected while nested shadowing is allowed; deferred function bodies may reference later compile-time-known top-level symbols, while eager top-level initializers execute in source order and may not read later values.
- Captured owner direction: source imports need not be part of the initial bootstrap kernel. After that gate, prefer a minimal top-level import in Lite if it is inexpensive; dependencies still need explicit metadata even when a glue step assembles files.

## Plan links

| Relation | Plan / file |
|----------|-------------|
| Current transition status | [`compiler/transition-plan.md`](../../compiler/transition-plan.md) |
| Bootstrap constraints and recorded gates | [`docs/bootstrap-plan.md`](../../docs/bootstrap-plan.md) |
| Historical minimum-path model | [`docs/self-hosting-kernel-strategy-2026-11-10.md`](../../docs/self-hosting-kernel-strategy-2026-11-10.md) |
| Previous T00 migration work and failure ownership | [`t00-ts-retirement-master.md`](./t00-ts-retirement-master.md) — reference inventory only; its full-parity-before-retirement order is superseded by this plan |
| Compiler feature workflow | [`../rules/compiler-development.md`](../rules/compiler-development.md) |
| Atomic commits | [`../rules/atomic-commits.md`](../rules/atomic-commits.md) |

## Read first

- [`README.md`](../../README.md) — current product/compiler status.
- [`compiler/bootstrap/README.md`](../../compiler/bootstrap/README.md) — generated seed identity and reproducible build commands.
- [`compiler/reports/current-t00-t11-inventory.md`](../../compiler/reports/current-t00-t11-inventory.md) and [`compiler/gaps.md`](../../compiler/gaps.md) — last measured feature gaps and owners.
- [`docs/declarations-and-assignment.md`](../../docs/declarations-and-assignment.md) and [`docs/functions.md`](../../docs/functions.md) — current selected declaration and deferred-body contracts; update these where the owner direction supersedes current rules.

---

## Implementation order

Execute sequentially. Each feature/support increment is a separate atomic commit with focused cases, documentation, generated seeds, and applicable component version evidence.

### Step 0 — cli-router

**Depends on:** none  
**Files:** `tools/cli.ts`, dedicated tester/verifier command entries under `tools/`, `bin/lite-*` links, `tools/ci.ts`, a focused CLI routing test, and the tooling policy/naming documentation.

**Actions:**

- Keep `lite` as a small alias router: map subcommands to dedicated commands, forward arguments/streams/status, and own only CLI help and its own version.
- Route `lite compile` to `lite-compiler-ts`; route verify, test, doctor, check, run, docs, bench, and release to their corresponding standalone tool commands.
- Move test-suite selection and case-manifest dispatch out of the router and into the tester/verifier commands.
- Keep each operation implementation in its owning tool module. Direct `bin/lite-*` entries should reach that operation without importing the command router.
- Preserve current command aliases and component-version behavior; document the distinction between the `lite` router and operation commands.

**Acceptance:**

- [x] `tools/cli.ts` contains only alias lookup, help/router-version handling, and child forwarding; it imports no operation implementations or test suites.
- [x] `lite compile` and `lite-compiler-ts` reach the same compiler operation; the other canonical aliases likewise match their direct tools.
- [x] Test and verifier options, case-manifest behavior, output streams, exit status and component versions remain available through both direct and routed entry points.
- [x] Tooling docs identify the router, each command owner, and the alias relationship.

**Verified:** `node --test tools/cli.test.ts` (5 passed); `./lite doctor`; `./lite test --fast` (136 passed, 12 skipped, 0 failed). Compiler entry behavior was not changed.

---

### Step 1 — define-kernel

**Depends on:** cli-router
**Files:** modify [`docs/bootstrap-plan.md`](../../docs/bootstrap-plan.md), [`compiler/transition-plan.md`](../../compiler/transition-plan.md), [`compiler/gaps.md`](../../compiler/gaps.md), and the relevant declaration/function contract pages; refresh the inventory report only through its documented audit script.

**Actions:**

- Follow the dated TS0/LT0 strategy: establish what compiler seed and Lite-written compiler source currently play those roles without confusing these strategy labels with repository seed names.
- Define the kernel from concrete compiler responsibilities: scan, parse, resolve, check, emit, and build the compiler's own source. Do not choose a target percentage of the language specification.
- Reclassify each current inventory failure as (a) required by the compiler source, (b) an already documented language feature for a later increment, or (c) deferred/unneeded. Existing feature coverage is not a gate merely because T00 once accepted it.
- Add each required capability to the seed first, then adopt it in the Lite-written compiler; compare both over the declared self-hosting subset after each increment.
- Build LT1 by compiling the Lite-written compiler with TS0. Build LT2 by compiling that same source with LT1, and require deterministic LT1/LT2 artifact equality to verify the fixed point.
- Record the owner-selected resolution contract with focused cases: same-scope duplicate definitions reject; nested scopes may shadow; deferred function bodies can resolve later top-level declarations; eager top-level initializers run in written order and cannot read a later value.
- Preserve the current manifest assembly and flat compiler representation for this kernel. Keep `lib/core/` provisional and add only utility operations concretely required by compiler source.
- Reconcile “T00 retirement,” “bootstrap removal,” and the preserved TypeScript seed as distinct concepts. The repository currently preserves a TS igniter/seed for reproducibility; do not delete it or rewrite Git history as part of this compiler plan.

**Acceptance:**

- [ ] A clean checkout can produce LT1 from LT0 with TS0 and then reproduce LT1 as byte-identical LT2 using LT1, without loading T00 at runtime.
- [ ] TS0/LT0 comparison cases and compiler-artifact fixed-point evidence cover the explicitly recorded self-hosting subset; neither is presented as full language parity.
- [ ] Kernel acceptance cases demonstrate compiler-source sufficiency, symbol resolution, source-ordered initialization, and diagnostics.
- [ ] The active plan no longer treats all 172 inventory cases as a precondition for the kernel gate; remaining cases have explicit owners and phases.
- [ ] Docs distinguish the minimal compiler-source subset from the larger accepted language specification.

**Verify:** `node compiler/scripts/build.ts`; `node compiler/scripts/self-host.ts --out /tmp/lite-self-host-kernel`; `./lite test --fast`; relevant corpus and compiler-source checks. Before closing the gate, run the repository's full compiler, verification, strict TypeScript, and editor checks required by the compiler-development rules.

---

### Step 2 — source-imports

**Depends on:** define-kernel  
**Files:** implement the narrow import slice in `compiler/src/`, its verifier/parser cases, [`docs/modules-and-packages.md`](../../docs/modules-and-packages.md), and compiler source manifests as needed.

**Actions:**

- First estimate the narrow feature's implementation cost against the existing Lite compiler and bootstrap path. Import is post-kernel, not a prerequisite for the initial self-hosting subset.
- If the slice is modest, support one top-level import form in Lite. Keep imports out of nested blocks; start with local source files and defer package registries, version solving, installation, and broad initialization policy.
- Mark a canonical source as visited when opening it, before traversing its imports, so repeated imports and cycles terminate without repeated expansion. Keep ordered dependency metadata visible to the compiler; a host reader may load bytes but must not hide the compiler's dependency graph.
- Use the existing manifest/seed route to implement and verify the feature. Adopt imports in compiler source only after the generated compiler can rebuild that imported source reproducibly.
- If the minimal source import requires substantial bootstrap or package-system work, keep manifest assembly as a temporary bridge and record the smallest blocker. Do not make dependency metadata implicit or lose the route to move resolution into Lite later.

**Acceptance:**

- [ ] Focused cases cover top-level-only placement, imported declarations, missing paths, repeated/cyclic imports, source locations, dependency order, and runtime declaration order.
- [ ] The compiler source is modular and rebuilds through the documented seed/igniter to the same fixed point.
- [ ] Dependency metadata is explicit and inspectable, whether the first implementation uses Lite imports or a temporary manifest bridge.
- [ ] No package manager, implicit prelude, or unrelated standard-library policy is introduced.

**Verify:** relevant parser/checker/compiler cases, `./lite test --fast`, complete self-host fixed point and corpus checks for the new compiler source.

---

### Step 3 — retire-reference

**Depends on:** source-imports  
**Files:** update [`compiler/transition-plan.md`](../../compiler/transition-plan.md), T00 consumers and the default compiler/test routes that still import T00; retain historical audit fixtures only where documented.

**Actions:**

- Remove T00 as an active interpreter/compiler dependency only after Step 1's kernel gate and the imported-source rebuild gate pass.
- Keep independent expected streams and preserved seed provenance; do not use live T00 behavior as the expected result for future cases.
- Resolve whether “remove bootstrap” means removing active T00 use only or also changing the maintained TypeScript igniter/seed policy. The current project docs select a maintained/reproducible TypeScript igniter; changing that policy is a separate owner decision.

**Acceptance:**

- [ ] Default compile/check/run/test/verify/self-build paths pass in a clean checkout without T00.
- [ ] No required runtime/tooling path silently falls back to T00.
- [ ] A preserved, reproducible build route and its exact seed/source/builder identities are documented.

**Verify:** `./lite test --full`; `./lite verify --coverage`; `./lite verify --all`; `node compiler/scripts/self-host.ts --out /tmp/lite-self-host-retired`; no-T00 archive/corpus checks and strict host/seed checks.

---

### Step 4 — stage-architecture

**Depends on:** retire-reference  
**Files:** create/update a compiler architecture plan and focused compiler docs/tests before changing compiler representation; implementation paths are selected by that review.

**Actions:**

- Define explicit stage boundaries and contracts for source/tokens, parsed definitions and expressions, name/type checking, lowered representation, and target emission.
- Separate compile-time definitions/symbols from runtime values. Use Lite's typed values for definition and expression data where they fit; do not encode every distinction as free-form strings.
- Specify the stage inputs/outputs, invariants, diagnostic/source-span ownership, and extension point for additional backends.
- Keep stage architecture a post-self-hosting redesign. Do not add recursive ASTs, enums, unions, or stage frameworks to the bootstrap kernel as a prerequisite.

**Acceptance:**

- [ ] A short architecture note demonstrates how one representative binding, function, and expression move through every stage.
- [ ] Each stage can be tested at its boundary, with stable source locations and diagnostics.
- [ ] A first implementation increment preserves current compiler behavior and fixed-point reproducibility.

**Verify:** phase fixtures, compiler corpus parity, full self-host fixed-point ladder, and strict generated-artifact checks.

---

### Step 5 — language-growth

**Depends on:** stage-architecture  
**Files:** owning language docs, `compiler/src/`, `verifications/`, relevant examples/samples and editor grammar/version metadata.

**Actions:**

- Implement already documented language features in small, dependency-aware increments, starting with the explicit post-kernel priority list from Step 1.
- Keep each feature's support and later compiler-source adoption separately reviewable; one compiler feature per atomic commit and required component version/tag workflow.
- After the selected documented backlog is implemented or expressly deferred, accept remaining proposals through Lite's normal consent/case workflow.
- Use gallery samples and a browser playground as real feedback surfaces once the supported slice is suitable; keep them tied to the actual compiler and turn discovered flaws into focused cases before proposing syntax changes.

**Acceptance:**

- [ ] Every increment has focused accepted/rejected/boundary/interaction cases and matching docs.
- [ ] Feature status is measured by exact contracts and cases, not an aggregate percentage.
- [ ] Samples/gallery/playground reproduce compiler behavior and make unsupported areas visible.

**Verify:** applicable focused cases, `./lite test --fast` during work, full gates and generated fixed-point/corpus checks before each increment is complete.

---

## Do not change

| File / area | Reason |
|-------------|--------|
| Generated seeds and flattened compiler bundles by hand | Regenerate from Lite source and preserve exact source/builder identity. |
| `docs/bootstrap-plan.md` kernel requirements by implication | Update the owner-facing plan explicitly when the kernel is redefined; do not smuggle broader language features into L. |
| Git history or license placement in this compiler plan | Apache-2.0 first-commit/history repair is a separate repository-history task; the published-history rule must be reconciled there. |

## Overall acceptance criteria

- [ ] A small LiteLang subset compiles and rebuilds the compiler to a reproducible fixed point without requiring the complete language spec.
- [ ] Active T00 dependencies are retired only after clean-checkout and corpus evidence for the agreed kernel.
- [ ] Source imports and a typed, staged compiler architecture are introduced after the initial kernel, without expanding its bootstrap requirements.
- [ ] Additional documented features are implemented one at a time with cases, samples/docs and atomic commits; remaining proposals follow later.

## Out of scope

- Native C self-hosting, which remains a separate later target after the TS kernel and source organization are stable.
- Completing every current T00 behavior before the minimum self-hosting gate.
- A public standard library, package manager, registry, linker, or runtime ABI.
- License/history rewrite, public launch, and full repository privacy audit; track these separately from compiler milestones.

## Key project facts

| Item | Value |
|------|-------|
| Current compiler | Generated T11 TypeScript compiler is the default; T00 remains a historical reference. |
| Last measured migration inventory | 112/172 executed source cases match; 60 case failures, recorded 2026-11-02. Refresh before prioritizing. |
| Source assembly | `compiler/src/*.lts` is split into files and ordered-manifest assembled; no source import grammar is implemented. |
| Bootstrap subset | See `docs/bootstrap-plan.md`; records no imports, flat streaming, and exclusion of recursive AST/records/enums/unions. |
| Shared support | Provisional helpers are under `lib/core/`; no public standard library is established. |
| Tooling | Thin command entries live under `bin/`; shared implementations under `tools/`; generated compiler seeds under `compiler/bootstrap/`. |
| CLI boundary | `lite` routes; `lite-compiler-ts`, `lite-verify`, `lite-doctor`, and sibling commands own their operation behavior. |
| Runtime | Current CLI requires Node 26.13.0; native C output/self-hosting are deferred. |

## References

- [`compiler/transition-plan.md`](../../compiler/transition-plan.md)
- [`docs/bootstrap-plan.md`](../../docs/bootstrap-plan.md)
- [`compiler/bootstrap/README.md`](../../compiler/bootstrap/README.md)
- [`compiler/reports/current-t00-t11-inventory.md`](../../compiler/reports/current-t00-t11-inventory.md)
- [`docs/modules-and-packages.md`](../../docs/modules-and-packages.md)
