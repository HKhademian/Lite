---
name: t00-ts-retirement-workflows
status: completed
created: 2026-11-02
todos:
  - id: w1-contracts
    content: "Separate generated contracts from live T00 reference execution"
    status: completed
  - id: w2-default-tests
    content: "Make lite test execute generated compiler regressions by default"
    status: completed
  - id: w3-tooling
    content: "Preserve self-hosting and migrate routine compiler scripts"
    status: completed
plans:
  requires: []
  blocks: []
  parallel: []
---

# Default tests and compiler tooling on generated TS

## Mission

Finish the consumer cutover before further broad feature work, keeping all generated regressions observable and the TS compiler self-hosted.

## Done

- 2026-11-03, w3-tooling: routine self-build/corpus/benchmark commands now use generated TS; explicit --reference routes retain the original audit programs. Three strictly checked generations reproduce the selected seed; 93 corpus contracts and 69 runtime scenarios pass. Five tool regression groups cover bad artifacts/options, no-T00/Git archives and changed-source fixed points. Fast 124 pass/12 skips; ordinary and no-T00 full each 127 pass/nine native skips; reference 162/162; strict checks and nine editor groups pass. A generated-only three-sample baseline is recorded, without a speedup claim. Compiler source/seed and 21 canonical pending ports are unchanged. See compiler/reports/2026-11-03-generated-tooling.json.

- 2026-11-03, w2-default-tests: default compiler/phase/library/artifact execution is generated-only; T00 tests use explicit --reference (162 pass). Ordinary and no-T00 archive fast: 119 pass/12 skips; full: 122 pass/nine native skips, zero failures. All 93 fixtures/eight libraries remain covered. Strict checks, nine editor groups, 18-module no-T00 static import audit and three identical self-builds pass. Source/seed and 21 canonical migration failures are unchanged. CI runs full default tests without T00 and its historical adapters. Evidence: compiler/reports/2026-11-03-generated-tests.json.

- 2026-11-03, w1-contracts: all 240 original igniter tests retain a mapped destination (81 generated/phase/artifact, 159 reference); shared manifest loading and 776 exact independent process contracts replace live expected-value queries. The explicit reference suite replays the corpus and archive. Five contract/ledger tests and six copied-checkout no-T00 host groups pass. Fast: 278 pass/12 deferred skips; full: 281 pass/nine native skips. Strict host/seed checks pass. Compiler source/seed and the 60/81 TS canonical audit are unchanged. Default actual compiler/phase helpers and launcher routing remain w2 work.

Public compile/check/verify already use T11. Public run is removed; C/native gates are deferred. Do not redo commits 32373f7, f5594f3 or 4007639.

## Plan links

- Orchestrator: [t00-ts-retirement-master.md](./t00-ts-retirement-master.md), Wave 1.
- Execute sequentially; the compiler frontend and seed files are shared.

## Implementation order

All workflow steps are complete. Permanent commands, identities and reproduction routes live in the compiler bootstrap guide and parity ledger. This completed plan is retained until final master-plan cleanup, as the orchestrator requires.

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

Repository: `<local-path>`; pinned Node 26.13.0 and TypeScript 7.0.2. Prior local evidence used Node v24.16.0; record the actual runtime for fresh timings.
Generated TS seed: `compiler/bootstrap/T11.ts`, SHA `77cacbacdc2aa97c6c3b86c61f54501fd322ca081cb8be63bd9e5cf1f91818ee` at plan creation.
Artifacts execute through `node compiler/entry.ts program.ts [argument ...]`; nonzero fault/explicit-exit statuses may be expected successes in tests.

## Read first

- [Compiler rules](../rules/compiler-development.md), [atomic commits](../rules/atomic-commits.md).
- [Transition plan](../../compiler/transition-plan.md), [live gaps](../../compiler/gaps.md).
- [Measured inventory](../../compiler/reports/current-t00-t11-inventory.md), [raw inventory](../../compiler/reports/current-t00-t11-inventory.json).
- [Bootstrap identities](../../compiler/bootstrap/README.md), [verification contract](../../language/verifications/README.md).
