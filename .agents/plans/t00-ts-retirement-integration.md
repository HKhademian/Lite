---
name: t00-ts-retirement-integration
status: pending
created: 2026-11-02
todos:
  - id: r1-coverage
    content: "Close remaining supported contracts and reconcile all recorded gaps"
    status: pending
  - id: r2-recovery
    content: "Remove remaining active T00 dependencies and prove clean bootstrap recovery"
    status: pending
  - id: r3-retire
    content: "Delete the handwritten implementation and rerun final TS gates"
    status: pending
plans:
  requires: ["t00-ts-retirement-workflows.md", "t00-ts-retirement-values-calls.md", "t00-ts-retirement-control-types.md"]
  blocks: []
  parallel: []
---

# Audit and retire active T00

## Mission

Use explicit evidence to retire T00 only after TS replacement covers its supported contracts and consumers. This final gate is separate from advanced language work.

## Done

Public compile/check/verify and a no-T00 archive smoke test already work. No new language features or native output work are authorized by this plan.

## Plan links

- Orchestrator: [t00-ts-retirement-master.md](./t00-ts-retirement-master.md), Wave 4.
- Execute sequentially; the compiler frontend and seed files are shared.

## Implementation order

### r1-coverage — Close remaining supported contracts and reconcile all recorded gaps

**Depends on:** all workflow/value/control steps.
**Files:** current inventory/probes, all verifications and TS regressions, `compiler/gaps.md`, `compiler/transition-plan.md`.
**Actions / atomic commit order:**
1. Refresh the inventory against the exact accepted source/seed. Assign every nonmatching case to its actual root cause; broad passes must not erase still-failing combined forms. Execute every current feature/example/lesson/library scenario from TS artifacts.
2. Reconcile default and explicit reference test inventories and every remaining test API/behavior dependency. Retain contract tests for the source paths each old assertion covered. Audit supported syntax not reached by the finite manifests.
3. Review known accepted-but-wrong cases outside the 60 rejects: __proto__ tuple labels, array/List function-tail distinction, function/value shadowing, forbidden data capture and Never typing. Resolve ordinary selected contracts; keep Unicode column units and unselected/advanced semantics explicitly deferred outside retirement, without claiming exact parity for those exceptions.

**Acceptance:** All 41 canonical features, 19 examples, 20 implemented lessons and eight library entries execute their expected TS scenarios; 39 formerly failing probes pass. New cases are accounted for, baseline successes do not regress and approved/deferred scope is explicit.
**Verify:** `./lite verify --all --no-cache`, `./lite verify --coverage`, current inventory and TS fast/full regression/editor/strict gates.

### r2-recovery — Remove remaining active T00 dependencies and prove clean bootstrap recovery

**Depends on:** r1-coverage.
**Files:** `igniter/`, `compiler/scripts/`, `benchmark/`, `.github/workflows/`, source/seed docs and reference-only tools.
**Actions / atomic commit order:**
1. Scan imports, dynamic imports, child commands, npm/CI/release/build/performance scripts and docs. Migrate any routine T00 consumer; move historical audits to documented exact Git revisions or an explicitly historical source snapshot that is not an active runtime dependency.
2. Preserve readable reference contracts/expectations, exact original T00/source/seed identities and a checked recovery recipe in Git history. Replace the live T00 comparison inventory with a historical-snapshot/contract support audit for ongoing use.
3. In a disposable clean checkout with T00 removed, run build/check/compile/default tests/verification, the complete TS corpus and three generated self-build generations. Rebuild changed S from the selected generated seed; test corrupt/stale identities fail explicitly.

**Acceptance:** No everyday or required CI path imports or executes T00. Supported source and S rebuild/run from a clean checkout; reference recovery is documented and tested separately.
**Verify:** Dependency scan plus no-T00 clean-checkout gates, exact source/builder hashes and fixed-point equality.

### r3-retire — Delete the handwritten implementation and rerun final TS gates

**Depends on:** r2-recovery.
**Files:** remove `igniter/lite.ts` and only obsolete T00-specific adapters/tests; update current guides and CI.
**Actions / atomic commit order:**
1. Remove active handwritten T00 and obsolete interpreter-only implementation tests only after their contract replacements/recovery records are accounted for. Keep legitimate host/loader/runtime adapters; do not delete igniter/ wholesale.
2. Run strict checks, generated default fast/full tests, all verification scenarios without cache, editor checks, TS artifact corpus and generated-only fixed point in another clean checkout.
3. Refresh the migration report, gap tracker and ownership docs; record retirement commit and outstanding post-migration C/advanced work. Remove these temporary plan files only after acceptance evidence is retained in permanent docs.

**Acceptance:** Active T00 is absent, all mandatory TS workflows and existing supported features pass from clean checkout, source/seed continuity is reproducible, and retirement is an atomic reviewed commit.
**Verify:** Same complete TS gate set after deletion, dependency scan, clean status and reproducible recovery instructions; no C prerequisite.

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
