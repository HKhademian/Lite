---
name: t00-ts-retirement-workflows
status: in_progress
created: 2026-11-02
todos:
  - id: w1-contracts
    content: "Separate generated contracts from live T00 reference execution"
    status: completed
  - id: w2-default-tests
    content: "Make lite test execute generated compiler regressions by default"
    status: pending
  - id: w3-tooling
    content: "Preserve self-hosting and migrate routine compiler scripts"
    status: pending
plans:
  requires: []
  blocks: []
  parallel: []
---

# Default tests and compiler tooling on generated TS

## Mission

Finish the consumer cutover before further broad feature work, keeping all generated regressions observable and the TS compiler self-hosted.

## Done

- 2026-11-03, w1-contracts: all 240 original igniter tests retain a mapped destination (81 generated/phase/artifact, 159 reference); shared manifest loading and 776 exact independent process contracts replace live expected-value queries. The explicit reference suite replays the corpus and archive. Five contract/ledger tests and six copied-checkout no-T00 host groups pass. Fast: 278 pass/12 deferred skips; full: 281 pass/nine native skips. Strict host/seed checks pass. Compiler source/seed and the 60/81 TS canonical audit are unchanged. Default actual compiler/phase helpers and launcher routing remain w2 work.

Public compile/check/verify already use T11. Public run is removed; C/native gates are deferred. Do not redo commits 32373f7, f5594f3 or 4007639.

## Plan links

- Orchestrator: [t00-ts-retirement-master.md](./t00-ts-retirement-master.md), Wave 1.
- Execute sequentially; the compiler frontend and seed files are shared.

## Implementation order

### w2-default-tests — Make lite test execute generated compiler regressions by default

**Depends on:** w1-contracts.
**Files:** `igniter/launcher.ts`, `igniter/test.ts`, `compiler/tests/host.test.ts`, `igniter/artifacts.ts`, `igniter/tsconfig.json`, `.github/workflows/test.yml`.
**Actions / atomic commit order:**
1. Port ordinary Lite execution helpers to compileTs plus strictly checked isolated artifacts. Use fixtures/expected fault diagnostics for rejected/faulting source rather than interpreter exceptions. Reuse compiled drivers across inputs.
2. Switch default test routing to generated suites, phase fixtures/sweeps, artifact corpus and library tests. Preserve fast/full distinctions; native C stays deferred. Add an explicit reference test option only for retained T00-specific checks and document it.
3. Add a copied-checkout test with igniter/lite.ts removed: default test startup, generated baseline, CLI compile/check and verification of supported sources must work. Known unsupported semantic contracts remain visible in verification/inventory, not green skipped tests.

**Acceptance:** Default tests have no T00 execution/import requirement; all 93 current compiler source fixtures, eight libraries and existing generated phase assertions retain their expected behavior.
**Verify:** Default fast/full suites in ordinary and no-T00 checkouts; explicit reference suite separately. Do not conflate registration coverage with support.

### w3-tooling — Preserve self-hosting and migrate routine compiler scripts

**Depends on:** w2-default-tests.
**Files:** `compiler/scripts/self-host.ts`, `compiler/scripts/corpus-parity.ts`, `benchmark/compiler-performance.ts`, `igniter/bootstrap.ts`, `compiler/bootstrap/README.md`, `compiler/parity.md`.
**Actions / atomic commit order:**
1. Provide a documented generated-only self-build/three-generation fixed-point command using loadBundle, selected T11 and strict artifact checks. Retain the old T00 reconstruction only as an explicitly named historical audit route; never relabel a historical node.
2. Change routine corpus/performance callers from loadCompiler/runBundle T00 execution to the generated compiler host. Compare generated output with recorded contract artifacts/diagnostics or successive generated generations; retain live T00 comparison explicitly while available.
3. Record baseline compiler/process/check timings and exact seed/source identities. Keep T00 inventory tooling explicitly reference-only for now; its final archival replacement belongs to the retirement wave.

**Acceptance:** Everyday build, test, corpus and benchmark commands run without T00; three generated generations are byte identical, strictly checked and source/builder identities are retained.
**Verify:** 93-source TS corpus, self-build/fixed point, strict checks and a command/import dependency scan; no C ladder.

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
