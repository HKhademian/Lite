---
name: t00-ts-retirement-control-types
status: pending
created: 2026-11-02
todos:
  - id: c1-never-input
    content: "Never exits and remaining existing input helpers"
    status: pending
  - id: c2-blocks
    content: "Statement-bearing and partial conditional values"
    status: pending
  - id: c3-match
    content: "Existing subjectless Boolean match"
    status: pending
  - id: c4-loop-values
    content: "Unnamed traversal and loop result completion"
    status: pending
  - id: c5-loop-exits
    content: "Metadata, payloads and targeted exits"
    status: pending
  - id: c6-cleanup
    content: "Construct-level finally across supported exits"
    status: pending
  - id: c7-widths
    content: "Existing narrow integer and Float32 contracts"
    status: pending
plans:
  requires: ["t00-ts-retirement-values-calls.md"]
  blocks: []
  parallel: []
---

# Port existing control flow, builtins and remaining widths

## Mission

Compile existing control forms and remaining types to TS; basic feature support is required, advanced edge perfection and C lowering are not.

## Done

Basic action loops, if/else, recursion and selected function completion already run on generated TS. Existing six I/O helpers are already ported.

## Plan links

- Orchestrator: [t00-ts-retirement-master.md](./t00-ts-retirement-master.md), Wave 3.
- Execute sequentially; the compiler frontend and seed files are shared.

## Implementation order

### c1-never-input — Never exits and remaining existing input helpers

**Depends on:** w3-tooling; d2-tuple-contracts for calculator integration.
**Files:** Lite frontend/checker/emitter; existing io/control cases; `examples/016-integer-calculator.lts`.
**Actions / atomic commit order:**
1. Carry Never through exit/fault completion and receiving contexts. Port supported exit() default status while retaining exit(status). Reject Unit/exit comparisons where the selected contract requires it.
2. Port the existing inputWord helper without changing the selected optional-prompt contracts or restoring report. Preserve input lookahead and strict byte decoding.
3. Run example 016 and retain additional ordinary blockers it exposes under the responsible later steps; do not rewrite the example to avoid existing syntax.

**Acceptance:** input.word passes, existing exit/call/return contracts compile and run, calculator ordinary nonreturning paths typecheck; every remaining calculator failure is explicitly assigned.
**Verify:** Exit-as-tail/branch/argument, default/explicit statuses, prior output, word boundaries/EOF and calculator valid/malformed input.

### c2-blocks — Statement-bearing and partial conditional values

**Depends on:** c1-never-input; d4-storage.
**Files:** Lite frontend/parser/checker/emitter; `cond-partial.*` and condition probes.
**Actions / atomic commit order:**
1. Port statement-bearing expression blocks and value-if arms, including Unit tails and contextual aggregate results.
2. Port partial declaration defaults and false-branch assignment no-write behavior separately. Preserve actual branch evaluation, side effects and the selected unreachable-statement rule.

**Acceptance:** cond.partial and condition.partial-default/partial-assignment/block-value/statement-value-if/unit-block pass; no hidden assignment on an untaken arm.
**Verify:** Declaration/assignment/return/argument contexts, nested branches, Unit tails and name/type errors in unreachable statements.

### c3-match — Existing subjectless Boolean match

**Depends on:** c2-blocks.
**Files:** Lite frontend/parser/checker/emitter and `match-subjectless.*`.
**Actions / atomic commit order:**
1. Port existing ordered subjectless alternatives and fallback using shared branch/value-completion logic; maintain lazy conditions and bodies.

**Acceptance:** match.subjectless and control.match pass in statement and admitted value contexts.
**Verify:** First match/fallback, condition/body effects, no-match rule and incompatible branch results.

### c4-loop-values — Unnamed traversal and loop result completion

**Depends on:** c2-blocks; d3-arrays; d5-lists.
**Files:** Lite frontend/parser/checker/emitter; loop value and traversal probes.
**Actions / atomic commit order:**
1. Port traversal without an explicit item binding while preserving lexical scope and collection order.
2. Port selected loop .value/then completion and zero/last result handling. Preserve ordinary returns through loops, including zero-iteration result paths.

**Acceptance:** loop.value and loop.unnamed-traversal/value pass; the false-loop Int function case produces its selected result and strict TS remains valid.
**Verify:** Zero/one/multiple iterations, conditional/sequence loops, return/value/then paths, scopes and iteration effects.

### c5-loop-exits — Metadata, payloads and targeted exits

**Depends on:** c4-loop-values; c1-never-input.
**Files:** Lite frontend/parser/checker/emitter; loop metadata/payload/tag probes.
**Actions / atomic commit order:**
1. Port existing item/index/count metadata and correct lifetime at each loop point.
2. Port value-bearing break/continue and named outer-loop routing with single-evaluation payloads.
3. Trace the existing tagged-return semantics in owning docs and focused reference tests before porting control.tagged-return. Record conflicts explicitly; never invent then/bypass behavior from a test accident.

**Acceptance:** loop.metadata and loop.metadata/payload/tagged/control.tagged-return probes pass under selected semantics.
**Verify:** Nested loops, zero iterations, payload effects, same/nested tags and returns; advanced combinatorial matrices remain later.

### c6-cleanup — Construct-level finally across supported exits

**Depends on:** c5-loop-exits.
**Files:** Lite frontend/parser/checker/emitter and `finally-cleanup.*`.
**Actions / atomic commit order:**
1. Port existing construct cleanup on normal completion, return, break/continue, faults and explicit process exit as required by the selected contract. Preserve completion values and cleanup order.

**Acceptance:** finally.cleanup and control.finally pass; cleanup neither disappears nor overwrites the selected pending completion incorrectly.
**Verify:** Nested cleanup, output order, exit/fault interaction, loop/call combinations and invalid attachments.

### c7-widths — Existing narrow integer and Float32 contracts

**Depends on:** d4-storage; c2-blocks.
**Files:** `compiler/src/numeric-literals.lts`, frontend/checker/TS emitter, `num-widths.*`.
**Actions / atomic commit order:**
1. Port existing narrow integer annotations, range checks, ordinary promotion/lossless receiving conversions and checked arithmetic in their supported contexts.
2. Port Float32 storage/rounding/promotion using the selected numerical contract. Keep exhaustive libm/promotion matrices out of this migration; cover ordinary supported forms and their immediate invalid counterparts.

**Acceptance:** num.widths and numeric.sized-int/float32 pass with arithmetic/storage/function interactions, without relaxing type/range checks.
**Verify:** Boundary storage and arithmetic, widening/narrowing rejection, Float32 representative rounding and combined call/aggregate cases.

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
