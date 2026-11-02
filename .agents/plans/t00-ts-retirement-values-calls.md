---
name: t00-ts-retirement-values-calls
status: pending
created: 2026-11-02
todos:
  - id: d1-tuples
    content: "Tuple construction, positions and destructuring"
    status: pending
  - id: d2-tuple-contracts
    content: "Tuple receiving contracts, results and display"
    status: pending
  - id: d3-arrays
    content: "Fixed arrays across aliases, inference and functions"
    status: pending
  - id: d4-storage
    content: "Compound updates, zero and reserved storage"
    status: pending
  - id: d5-lists
    content: "Inferred mutability, List<Unit> and front operations"
    status: pending
  - id: d6-call-routing
    content: "Named, positional and shorthand arguments"
    status: pending
  - id: d7-function-values
    content: "Function values, helpers and lexical environments"
    status: pending
plans:
  requires: ["t00-ts-retirement-workflows.md"]
  blocks: []
  parallel: []
---

# Port existing values, storage and function calls

## Mission

Close data and callable gaps using existing Lite syntax; all language support stays in Lite and each topic lands atomically.

## Done

Scalar arithmetic/Float contexts, basic named tuples/Lists, alias lookup subset and ordinary recursion already exist. Extend these paths rather than replacing the compiler.

## Plan links

- Orchestrator: [t00-ts-retirement-master.md](./t00-ts-retirement-master.md), Wave 2.
- Execute sequentially; the compiler frontend and seed files are shared.

## Implementation order

### d1-tuples — Tuple construction, positions and destructuring

**Depends on:** w3-tooling.
**Files:** `compiler/src/frontend.lts`, `compiler/src/parser.lts`, `compiler/src/check.lts`, `compiler/src/emit-ts.lts`, tuple fixtures.
**Actions / atomic commit order:**
1. Port unnamed, mixed, named shorthand, Unit and singleton construction with the selected grouping/separator rules. Make labels independent of host object behavior, including __proto__.
2. Port positional reads on named/unnamed tuples and single-evaluation destructuring. Preserve source order, singleton commas and nested effects; reject incompatible shapes before output.

**Acceptance:** tuple.shape plus tuple.unnamed/mixed/shorthand/destructuring/unit-singleton/named-positional-read pass; example 006 runs once its result contracts are covered in d2.
**Verify:** Tuple accepted/rejected/effect cases and existing tuple canonical/probe manifests.

### d2-tuple-contracts — Tuple receiving contracts, results and display

**Depends on:** d1-tuples.
**Files:** same Lite frontend/checker/emitter; `verifications/features/report-tuple.*`, examples 006/008/010/011.
**Actions / atomic commit order:**
1. Port positional receiving-label conversion and tuple function inputs/results with independent value-copy behavior. Labels replace destination slot labels/types according to the existing selected contract.
2. Complete output/outputLine tuple formatting and function/alias/List combinations. Integrate examples 006, 008, 010 and 011 without rewriting their language demonstrations around missing support.

**Acceptance:** report.tuple and tuple.receiving-labels pass; examples 006/008/010/011 compile, strictly check and run all recorded scenarios.
**Verify:** Four example manifests, tuple feature/probe cases and negative shape/type/label cases.

### d3-arrays — Fixed arrays across aliases, inference and functions

**Depends on:** d2-tuple-contracts.
**Files:** Lite frontend/checker/emitter, array fixtures and `examples/009-fixed-arrays.lts`.
**Actions / atomic commit order:**
1. Port inferred/explicit fixed extents, arrays of tuple values, transparent array aliases and ordinary indexed/traversal operations with existing bounds checks.
2. Port fixed-array function inputs/results and receiving copies. Keep array/List identity through function tails; review the known T11 contextual-List acceptance discrepancy against the selected rule.

**Acceptance:** array.fixed/inferred/function and alias.array probes pass; example 009 runs; the already passing array.fixed canonical contract remains green.
**Verify:** Array aliases, empty/single/multiple extents admitted by existing rules, function/tuple interactions, bad extents/types and bounds faults.

### d4-storage — Compound updates, zero and reserved storage

**Depends on:** d2-tuple-contracts; d3-arrays for aggregate storage cases.
**Files:** Lite frontend/checker/emitter, `scope-compound.*`, `init-zero.*`, `init-reserved.*`.
**Actions / atomic commit order:**
1. Port compound arithmetic updates using existing checked numeric helpers and single-evaluation target lookup.
2. Port omitted typed initialization recursively across supported scalar/aggregate shapes.
3. Port reserved storage and first whole-value writes, preserving mutability/initialization checks and failure-before-effects behavior.

**Acceptance:** scope.compound, init.zero, init.reserved and scope.compound/reserved probes pass; aggregate defaults preserve value semantics.
**Verify:** Independent update/zero/reserved commits, each with scalar and aggregate combinations and invalid writes.

### d5-lists — Inferred mutability, List<Unit> and front operations

**Depends on:** d3-arrays; d4-storage.
**Files:** Lite frontend/checker/emitter, list/mut verification cases and `examples/013-growable-lists.lts`.
**Actions / atomic commit order:**
1. Port existing inferred mut/var mut declarations and List<Unit> element/result contracts.
2. Port push_front/pop_front alongside existing back operations, preserving explicit grants, returned copies, all-argument ordering and empty-pop faults.

**Acceptance:** list.mutation, mut.inferred and list.front-operations/inferred-mut/unit-elements pass; example 013 runs; existing back/copy cases stay green.
**Verify:** Empty/single/multiple lists, saved copies, nested tuple elements, Unit values, denied grants and end-operation faults.

### d6-call-routing — Named, positional and shorthand arguments

**Depends on:** d2-tuple-contracts.
**Files:** Lite frontend/parser/checker and `examples/012-named-arguments.lts`.
**Actions / atomic commit order:**
1. Port the existing input-pack routing order, named/positional interleaving, shorthand and replacement of earlier contributions. Preserve own-name recursion and single left-to-right evaluation.
2. Retain arity, unknown label, duplicate/replacement and type checks from the selected callable contract; add argument effects so reordering cannot hide.

**Acceptance:** function.named-arguments and function.argument-replacement pass; example 012 runs unchanged.
**Verify:** Named/positional/self-call, shorthand, replacement, effects and rejection matrices.

### d7-function-values — Function values, helpers and lexical environments

**Depends on:** d6-call-routing.
**Files:** Lite frontend/checker/emitter, function probe fixtures and selected function contracts.
**Actions / atomic commit order:**
1. Port immutable function copies and compatible mutable replacement with function types carried through receiving positions.
2. Port supported nested/live helper references with explicit environment handling; ordinary scalar capture remains rejected where the selected existing contract forbids it.
3. Port distinct escaped helper environments. Fix ordinary value shadowing of a prior function lookup and preserve alias/value/callable namespace rules.

**Acceptance:** function.values/live-helper/nested-helper/immutable-copy/escaped-environments pass; supported captures retain separate environments and rejected captures fail before effects.
**Verify:** Helper recursion/copy/replacement, repeated factory calls, shadowing, incompatible signatures and forbidden data capture.

## Constraints and verification

- Implement language behavior in `compiler/src/` and shared `lib/core/`; hosts stay adapters.
- Compile source with generated Lite, strictly check TS, then execute artifacts. No implicit T00 fallback.
- Keep public run removed. C output, native self-hosting and cross-host C gates are post migration.
- Port existing selected contracts; do not invent syntax or copy a worse T00 rule. Preserve selected Lite unreachable-code behavior.
- Keep historical evidence/seeds recoverable; never hand-edit generated seeds. Source adoption is a separate commit after support acceptance.
- Each atomic topic includes focused valid/rejected/effect/interaction cases, exact input/output/status, relevant docs and generated evidence.
- For each compiler slice: focused checks; `./lite test --fast`; full TS regressions; strict host/seed checks; generated-only self-build/fixed point; affected editor checks; inventory and verification reports. `verify --all` remains nonzero while known ports are pending; enumerate those failures, never claim a green full conformance gate.
- Refresh `compiler/gaps.md`, `compiler/transition-plan.md` and current inventory as ports land. Report new closures and newly found blockers separately. Existing successes must stay successful.
- Record comparable speed measurements per meaningful slice: same S/input/artifact identities, warmup and paired samples, startup/compiler/check/runtime separately. Reuse checked artifacts across scenarios. Mixed/noisy results are not speedups; optimization is not a migration gate.
- Commit each coherent topic before independent work. Stage owned paths only; no push, tag or history rewrite.

Strict checks:
```sh
node igniter/node_modules/typescript/bin/tsc --noEmit -p igniter/tsconfig.json
node igniter/node_modules/typescript/bin/tsc --noEmit -p compiler/bootstrap/tsconfig.json
```

## Key facts

Repository: `<local-path>/Projects/LiteScript`; pinned Node 26.13.0 and TypeScript 7.0.2. Prior local evidence used Node v24.16.0; record the actual runtime for fresh timings.
Generated TS seed: `compiler/bootstrap/T11.ts`, SHA `77cacbacdc2aa97c6c3b86c61f54501fd322ca081cb8be63bd9e5cf1f91818ee` at plan creation.
Artifacts execute through `node compiler/entry.ts program.ts [argument ...]`; nonzero fault/explicit-exit statuses may be expected successes in tests.

## Read first

- [Compiler rules](../rules/compiler-development.md), [atomic commits](../rules/atomic-commits.md).
- [Transition plan](../../compiler/transition-plan.md), [live gaps](../../compiler/gaps.md).
- [Measured inventory](../../compiler/reports/current-t00-t11-inventory.md), [raw inventory](../../compiler/reports/current-t00-t11-inventory.json).
- [Bootstrap identities](../../compiler/bootstrap/README.md), [verification contract](../../verifications/README.md).
