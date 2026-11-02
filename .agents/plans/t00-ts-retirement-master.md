---
name: t00-ts-retirement-master
status: pending
created: 2026-11-02
todos:
  - id: wave-1-workflows
    content: "Default tests and routine compiler tools use generated TS"
    status: pending
  - id: wave-2-values-calls
    content: "Port existing data, storage and callable contracts"
    status: pending
  - id: wave-3-control-types
    content: "Port existing control flow, helpers and widths"
    status: pending
  - id: wave-4-integration
    content: "Close TS coverage, prove recovery and retire active T00"
    status: pending
plans:
  requires: []
  blocks: []
  parallel: []
  children:
    - wave: 1
      sequential: true
      plans: [t00-ts-retirement-workflows.md]
    - wave: 2
      sequential: true
      plans: [t00-ts-retirement-values-calls.md]
    - wave: 3
      sequential: true
      plans: [t00-ts-retirement-control-types.md]
    - wave: 4
      sequential: true
      plans: [t00-ts-retirement-integration.md]
---

# T00 retirement through self-hosted TS — execution index

## Mission

Follow the owner's direction: "lets make it the fastest way possible to switch to the new compiler
( that must be keep selfhosted )
remove the run command from selfhosted for now
all the features must be compilable and then run from the artifacts ( ts / c )
postpone c output to the post migration".
Finish existing supported TS features and consumers, then retire active T00. This index defines order; implementation details and atomic topic sequences live in its four child plans. Planning does not start implementation or restart the cleared autonomous goal.

## Done and verified baseline

- `32373f7`: public run removed; generated TS compile/check, check-only without effects; C output deferred.
- `f5594f3`: verification/updates use TS artifacts; T00 only via --reference; compile/check once per manifest.
- `4007639`: migration CI uses a T00-free TS archive smoke test; public tests defer native C.
- Last completed regression evidence: 274 pass, nine native-only skips, zero failures. Default suites still import T00; this is not complete generated-only coverage.
- Canonical TS verification: 60/81 scenarios pass, 21 fail (13 features, eight examples); explicit T00 reference: 81/81.
- Measured source inventory: 112/172 match; 60 failures = 13 feature cases + eight examples + 39 isolated probes. All 20 implemented lessons and eight library entries pass. Counts are not a completion percentage.
- Three generated-only self-builds reproduce selected seed 77cacbac. At plan creation, current source and artifact hashes still match the recorded inventory; stored counts were inspected, not re-executed in this planning turn.

## Child plans and execution order

1. **Wave 1 — workflows (start here).** [t00-ts-retirement-workflows.md](./t00-ts-retirement-workflows.md): w1-contracts → w2-default-tests → w3-tooling. End with default generated regression/build/corpus/performance paths usable without T00.
2. **Wave 2 — values and calls.** [t00-ts-retirement-values-calls.md](./t00-ts-retirement-values-calls.md): d1-tuples → d2-tuple-contracts → d3-arrays → d4-storage → d5-lists → d6-call-routing → d7-function-values. Port shared foundations once; keep all previously passing cases.
3. **Wave 3 — control and types.** [t00-ts-retirement-control-types.md](./t00-ts-retirement-control-types.md): c1-never-input → c2-blocks → c3-match → c4-loop-values → c5-loop-exits → c6-cleanup → c7-widths. C1 may be pulled forward after Wave 1 when it unblocks calculator typing; do not overlap shared-file edits.
4. **Wave 4 — integration and retirement.** [t00-ts-retirement-integration.md](./t00-ts-retirement-integration.md): r1-coverage → r2-recovery → r3-retire. This gate requires all mandatory prior topic acceptance, not merely launcher selection.

Commands for a later explicit execution request:
```text
/xplan @.agents/plans/t00-ts-retirement-master.md
/xplan @.agents/plans/t00-ts-retirement-workflows.md
/xplan @.agents/plans/t00-ts-retirement-values-calls.md
/xplan @.agents/plans/t00-ts-retirement-control-types.md
/xplan @.agents/plans/t00-ts-retirement-integration.md
```

## Ownership and conflict notes

Execute sequentially. No parallel agents are required or started. Workflow work owns hosts/harnesses; both language waves share frontend.lts/parser.lts/check.lts/emit-ts.lts, generated seeds, fixtures and progress docs, so they must not edit concurrently. Every topic is an atomic commit; numbered atomic actions inside a step can become separate coherent commits with their own coverage and generated evidence. Steps are dependencies and acceptance units, not a promised fixed commit count.

## Reporting after each topic

Report commit ID and exact source/seed identity; newly supported contracts/examples; remaining canonical scenarios/source cases and consumers; passed checks versus deferred cases; measured timing versus baseline with no unsupported speedup claim. Retain a nonzero verification report while unsupported cases remain. Do not estimate readiness from percentage or promise a date before the ordinary ports are measured.

## Overall acceptance and exclusions

- All existing supported features compile with Lite and execute from strictly checked TS artifacts; ordinary streams/status/effects and validation remain covered.
- Default tests/verify/check/build/compile and mandatory CI have no active T00 dependency. Readable contracts and bootstrap recovery survive in history.
- Clean checkout rebuilds S from the generated seed, passes the three-generation TS fixed point and complete mandatory TS gates, then removes handwritten T00 atomically.
- C emission/native/cross-host work is post migration. Unicode column convention, exhaustive numerical/cleanup matrices and unselected future semantics do not become hidden retirement blockers; record any scoped differences candidly.
- Keep compiler language support separate from the subset used to write S. No hand-edited generated seeds, T00 fallback, new syntax, pushed commits or release tags.
- After final acceptance, retain evidence in permanent compiler docs and remove all `t00-ts-retirement-*.md` temporary plan files together.

## Read first

[Current transition](../../compiler/transition-plan.md), [live gaps](../../compiler/gaps.md), [inventory](../../compiler/reports/current-t00-t11-inventory.md), [compiler rules](../rules/compiler-development.md), [atomic commits](../rules/atomic-commits.md).

## Current failure ownership

These are existing measured source-case failures, not predicted closures. A case stays open until all its scenarios pass; its first port can expose another dependency.

- `d1-tuples`: `feature:tuple.shape`; `probe:tuple.unnamed`; `probe:tuple.mixed`; `probe:tuple.shorthand`; `probe:tuple.destructuring`; `probe:tuple.unit-singleton`; `probe:tuple.named-positional-read`.
- `d2-tuple-contracts`: `feature:report.tuple`; `example:example.006-fixed-tuples`; `example:example.008-named-tuples`; `example:example.010-mixed-tuples`; `example:example.011-tuple-label-conversion`; `probe:tuple.receiving-labels`.
- `d3-arrays`: `example:example.009-fixed-arrays`; `probe:array.fixed`; `probe:array.inferred`; `probe:array.function`; `probe:alias.array`.
- `d4-storage`: `feature:scope.compound`; `feature:init.zero`; `feature:init.reserved`; `probe:scope.compound`; `probe:scope.reserved`.
- `d5-lists`: `feature:list.mutation`; `feature:mut.inferred`; `example:example.013-growable-lists`; `probe:list.front-operations`; `probe:list.inferred-mut`; `probe:list.unit-elements`.
- `d6-call-routing`: `example:example.012-named-arguments`; `probe:function.named-arguments`; `probe:function.argument-replacement`.
- `d7-function-values`: `probe:function.values`; `probe:function.live-helper`; `probe:function.nested-helper`; `probe:function.immutable-copy`; `probe:function.escaped-environments`.
- `c1-never-input`: `example:example.016-integer-calculator`; `probe:input.word`.
- `c2-blocks`: `feature:cond.partial`; `probe:condition.partial-default`; `probe:condition.partial-assignment`; `probe:condition.block-value`; `probe:condition.statement-value-if`; `probe:condition.unit-block`.
- `c3-match`: `feature:match.subjectless`; `probe:control.match`.
- `c4-loop-values`: `feature:loop.value`; `probe:loop.unnamed-traversal`; `probe:loop.value`.
- `c5-loop-exits`: `feature:loop.metadata`; `probe:loop.metadata`; `probe:loop.payload`; `probe:loop.tagged`; `probe:control.tagged-return`.
- `c6-cleanup`: `feature:finally.cleanup`; `probe:control.finally`.
- `c7-widths`: `feature:num.widths`; `probe:numeric.sized-int`; `probe:numeric.float32`.
