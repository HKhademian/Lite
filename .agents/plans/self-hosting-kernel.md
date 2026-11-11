---
name: self-hosting-kernel
status: in_progress
created: 2026-11-10
todos:
  - id: cli-router
    content: "Step 0 — make lite a router over dedicated tool commands"
    status: completed
  - id: define-kernel
    content: "Step 1 — define and verify the compiler-capable self-hosting kernel"
    status: completed
  - id: source-import-bridge
    content: "Step 2 — establish temporary host source assembly for the old seed"
    status: completed
  - id: retire-reference
    content: "Step 3 — retire the active T00 dependency after imports and the kernel gate"
    status: completed
  - id: stage-architecture
    content: "Step 4 — define clean typed compiler stages for separate source units"
    status: in_progress
  - id: module-imports
    content: "Step 5 — implement aliased imports, explicit public visibility, and remove source flattening"
    status: pending
  - id: language-growth
    content: "Step 6 — expand supported language feature by feature"
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

Reach a reliable generated compiler fixed point using only the portion of LiteLang needed to express the compiler. Do not make all of the language specification a self-hosting prerequisite. The minimum kernel and T00 retirement are complete. The earlier host-expanded `import "path";` implementation is only a bootstrap bridge, not the selected language import semantics. Next establish explicit compiler stages for separate source units, then implement aliased module imports with explicit public visibility and remove source flattening.

## Done

- Reviewed the current Lite checkout at `e6406ad` (2026-11-10 planning turn); working tree was clean.
- Completed the CLI-router phase: `lite` now owns routing/help only; dedicated `lite-compiler-ts`, `lite-check`, `lite-run`, `lite-verify`, `lite-test`, `lite-docs`, `lite-doctor`, `lite-bench`, and `lite-release` commands own the operations.
- Recorded the TS0/LT0 minimal bootstrap path and LT1/LT2 reproducible fixed-point definition in [`docs/self-hosting-kernel-strategy-2026-11-10.md`](../../docs/self-hosting-kernel-strategy-2026-11-10.md).
- Refreshed the T00/selected-compiler inventory on 2026-11-11 against T12: 112/173 measured scenarios match, all 61 remaining scenarios are selected-compiler rejections, none are runtime/typecheck mismatches, and all 217 tracked Lite source files are accounted for. This is parity evidence, not a self-hosting percentage or a gate requiring every row to pass.
- Implemented and focused-tested the initial root-symbol contract: root duplicate values reject, nested shadowing remains accepted, deferred function bodies resolve later inferred scalar-literal root values, and eager reads remain source ordered. The updated source rebuilds through three strictly checked generations and the final generation passes the refreshed 94-case corpus (69 programs and 25 rejections, zero mismatches).
- Promoted generated T12 as the selected TS compiler. Its exact self-hosting fixed point and corpus evidence are recorded in [`compiler/reports/2026-11-11-self-hosting-kernel.json`](../../compiler/reports/2026-11-11-self-hosting-kernel.json). The active handwritten T00 implementation, CLI, verifier lane, test lane, benchmark lane and inventory generator are retired; native C output and native self-hosting remain deferred.
- The latest T00/selected-compiler inventory is dated 2026-11-11: 112/173 source scenarios match; 61 are selected-compiler rejections. Treat this as parity evidence, not a completion percentage or a kernel gate.
- Confirmed compiler source is split into `compiler/src/*.lts` and assembled through ordered manifests. This glue is acceptable for the initial self-hosting kernel.
- Captured owner direction: definitions/symbols are distinct from runtime values; repeated names in one flat scope should be rejected while nested shadowing is allowed; deferred function bodies may reference later compile-time-known top-level symbols, while eager top-level initializers execute in source order and may not read later values.
- Owner-selected module surface, 2026-11-11: `math := import "./math.lts";` is the only initial import form. Imports bind immutable module aliases, and top-level definitions are private unless marked `pub`. Imported files remain separate compiler units; each canonical source is visited and processed once.
- Captured owner direction: source imports need not be part of the initial bootstrap kernel. The existing host expansion is a temporary bridge only; the selected language form is an immutable aliased module binding with explicit public visibility.
- Implemented the old-seed source-expansion bridge after the kernel gate: one top-level relative `.lts` import, deterministic ordered DFS expansion, visit-on-open cycle/repeat termination, explicit dependency metadata, and imported-file source locations. Compiler manifests now each name one Lite source root. TS and C source hashes and the T12 fixed point remain unchanged. This bridge does not implement module visibility or separate-unit compilation.
- Completed T00 retirement after the import gate: removed the interpreter and adapters, removed all live reference command lanes and the T00-dependent audit generators, retained immutable historical reports/contracts, and kept generated expectations independent of a live interpreter. The clean-source build and test gates no longer depend on T00.

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
**Files:** [`docs/bootstrap-plan.md`](../../docs/bootstrap-plan.md), [`compiler/transition-plan.md`](../../compiler/transition-plan.md), [`compiler/gaps.md`](../../compiler/gaps.md), and the current inventory report.

**Actions:**

- Follow the dated TS0/LT0 strategy: establish what compiler seed and Lite-written compiler source currently play those roles without confusing these strategy labels with repository seed names.
- Define the kernel from concrete compiler responsibilities: scan, parse, resolve, check, emit, and build the compiler's own source. Do not choose a target percentage of the language specification.
- Reclassify current inventory results against the compiler-source/build needs. A program rejected by T11 is not automatically required by the kernel just because T00 accepts it; keep unrelated documented features in the later parity queue.
- Add each required capability to the seed first, then adopt it in the Lite-written compiler; compare both over the declared self-hosting subset after each increment.
- Build LT1 by compiling the Lite-written compiler with TS0. Build LT2 by compiling that same source with LT1, and require deterministic LT1/LT2 artifact equality to verify the fixed point.
- Record the owner-selected resolution contract with focused cases: same-scope duplicate definitions reject; nested scopes may shadow; deferred function bodies can resolve later top-level declarations; eager top-level initializers run in written order and cannot read a later value.
- Preserve the current manifest assembly and flat compiler representation for this kernel. Keep `lib/core/` provisional and add only utility operations concretely required by compiler source.
- Reconcile “T00 retirement,” “bootstrap removal,” and the preserved TypeScript seed as distinct concepts. The repository currently preserves a TS igniter/seed for reproducibility; do not delete it or rewrite Git history as part of this compiler plan.

**Acceptance: PASSED for the currently defined TS self-hosting subset.**

- [x] The selected Lite-written compiler source rebuilds through three strictly checked TS compiler generations to the byte-identical selected artifact, without loading T00 at runtime.
- [x] The final generated compiler passes the refreshed recorded compiler corpus: 94 cases (69 programs, 25 rejections), zero mismatches.
- [x] The refreshed T00-to-T12 comparison keeps all 61 unsupported rows visible as parity work; the handoff does not require those rows for the already self-hosted compiler source.
- [x] The active plan separates compiler-source sufficiency and fixed-point evidence from full language parity.
- [x] Root-scope repeated value definitions reject, while nested branch bindings remain legal.
- [x] A deferred function body can resolve a later inferred scalar-literal root value; an eager root initializer still cannot read it before initialization.

**Verified:** `node compiler/scripts/build.ts`; `node compiler/scripts/self-host.ts --out /tmp/lite-self-host-kernel-promoted-20261111`; `node compiler/scripts/corpus-parity.ts --artifact /tmp/lite-self-host-kernel-promoted-20261111/generation-3.ts` (94 cases; 69 programs, 25 rejections); focused host regression for duplicate roots, nested shadowing, deferred lookup, parameter shadowing and eager reads. T12 is now the selected seed and reproduces the fixed point.

The fixed-point and corpus checks prove the updated compiler source rebuilds itself and covers the bounded kernel contract. T12 promotion, the 94-case corpus, fast suite, and refreshed inventory are complete. Step 2 established only the temporary source-expansion bridge; the current work is Step 4's stage architecture for separate units.

---

### Step 2 — source-import-bridge

**Depends on:** define-kernel  
**Files:** `igniter/loader.ts`, compiler manifests and bootstrap documentation.

**Actions:**

- Use the old seed's host expander to assemble the compiler source and retain explicit dependency metadata while the generated compiler acquires language-level modules.
- Treat this source assembly as a temporary bootstrap bridge, not as the language import contract.
- Keep the bridge reproducible and source-mapped until the new compiler can rebuild its own source without it.

**Acceptance: PASSED for the bridge only.**

- [x] Focused cases cover top-level-only placement, imported declarations, missing paths, repeated/cyclic imports, source locations, dependency order, and runtime declaration order.
- [x] The compiler source is modular and rebuilds through the documented seed/igniter to the same fixed point.
- [x] Dependency metadata is explicit and inspectable in compiler builds and provenance.
- [x] No package manager, implicit prelude, or unrelated standard-library policy is introduced.

**Verified:** focused import/CLI/host cases; `node compiler/scripts/build.ts`; three-generation `node compiler/scripts/self-host.ts --out /tmp/lite-self-host-imports-20261111` fixed point; 94-case corpus parity; `./lite test --fast` (140 passed, 12 skipped, 0 failed). The import graph is explicit in `provenance.json`; compiler source and T12 artifact hashes are unchanged.

---

### Step 3 — retire-reference (completed 2026-11-11)

**Depends on:** source-import-bridge
**Files:** update [`compiler/transition-plan.md`](../../compiler/transition-plan.md), T00 consumers and the default compiler/test routes that still import T00; retain historical audit fixtures only where documented.

**Actions:**

- Remove T00 as an active interpreter/compiler dependency only after Step 1's kernel gate and the imported-source rebuild gate pass.
- Keep independent expected streams and preserved seed provenance; do not use live T00 behavior as the expected result for future cases.
- Retire T00 as the handwritten language implementation while retaining the TypeScript host adapters and reproducible generated T12 seed.

**Acceptance: PASSED.**

- [x] Default compile/check/run/test/verify/self-build paths pass in a clean checkout without T00.
- [x] No required runtime/tooling path silently falls back to T00; the retired `--reference` options reject as unknown.
- [x] The generated T12 build route and exact seed/source/builder identities remain documented and reproducible.

**Verified:** `./lite test --full` (143 passed, 9 native-only skips, 0 failed);
`./lite verify --coverage`; `./lite doctor`; `tsc -p igniter/tsconfig.json
--noEmit`; migration baseline (60/81 pass with the same 21 known language gaps);
build; three-generation exact T12 fixed point; 94-case corpus (zero mismatches);
and focused source-archive tests with Git metadata absent.

---

### Step 4 — stage-architecture

**Depends on:** retire-reference  
**Files:** create/update a compiler architecture plan and focused compiler docs/tests before changing compiler representation; implementation paths are selected by that review.

**Actions:**

- Define explicit stage boundaries and contracts for source units/tokens, parsed definitions and expressions, name/type checking, lowered representation, and target emission.
- Separate compile-time definitions/symbols from runtime values. Use Lite's typed values for definition and expression data where they fit; do not encode every distinction as free-form strings.
- Specify the stage inputs/outputs, invariants, import graph states (`visited` and `processed`), module interfaces, diagnostic/source-span ownership, and extension point for additional backends.
- Keep stage architecture a post-self-hosting redesign. Do not add recursive ASTs, enums, unions, or stage frameworks to the bootstrap kernel as a prerequisite.
- See [`module-import-stages.md`](../../compiler/module-import-stages.md) for the selected module surface and proposed contracts.

**Acceptance:**

- [ ] A short architecture note demonstrates how one representative binding, function, and expression move through every stage.
- [ ] Each stage can be tested at its boundary, with stable source locations and diagnostics.
- [ ] A first implementation increment preserves current compiler behavior and fixed-point reproducibility.

**Verify:** phase fixtures, compiler corpus parity, full self-host fixed-point ladder, and strict generated-artifact checks.

---

### Step 5 — module-imports

**Depends on:** stage-architecture
**Files:** `compiler/src/`, source-provider/host adapter, module/import documentation, compiler build path and focused contracts.

**Actions:**

- Implement only `module := import "relative/path.lts";` initially. Keep the alias immutable and resolve members through the module's public interface.
- Add explicit top-level `pub` visibility; private declarations stay local to their defining unit.
- Track `visited` on first entry before traversing imports, and `processed` separately for completed unit work. Preserve dependency edges and process each canonical file once.
- Keep text flattening only as the old-seed bootstrap bridge. Once generated support and compiler-source adoption are separately verified, switch active builds to distinct source units and remove flattened bundles/maps.
- Leave bare imports, implicit unpacking, selective imports, packages, runtime initialization order, and re-export policy out of this increment.

**Acceptance:** per-file source spans survive every stage; only `pub` members resolve through aliases; repeated aliases share module/symbol identity; each source is visited and processed once; source text is never spliced in the active compiler path; the generated compiler reaches a reproducible fixed point.

---

### Step 6 — language-growth

**Depends on:** module-imports
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

- [x] A small LiteLang subset compiles and rebuilds the compiler to a reproducible fixed point without requiring the complete language spec.
- [x] Active T00 dependencies are retired after clean-checkout and corpus evidence for the agreed kernel.
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
| Current compiler | Generated T12 TypeScript compiler is the only active language implementation; T00 source remains recoverable in Git history. |
| Last measured migration inventory | 112/173 source scenarios match; 61 T12 rejections, recorded 2026-11-11. These are post-kernel parity work unless tied to a compiler-source requirement. |
| Source assembly | Compiler sources use top-level relative `.lts` imports with ordered DFS expansion, cycle/repeat termination, source maps, and dependency metadata. |
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
