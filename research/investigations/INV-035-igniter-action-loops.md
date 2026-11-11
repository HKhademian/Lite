# INV-035 — Action-loop igniter increment

Status: recorded (bounded implementation; wider loop contracts unimplemented)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-035](TOPICS.md#inv-035)
Covered scope: Boolean and unconditional action loops with bare body break/continue.

## Contracts and implementation boundary

Baseline: `e09cf63`, preserved as igniter-v0.1.0-alpha.2. The user requests the
next runnable increment. This implements existing [loop source rules](../../docs/loops.md#source-modes)
and [control transfers](../../docs/control-flow.md#target-and-payload-boundaries),
not a replacement for the full loop value/completion contract.

The [igniter](../../igniter/README.md#action-loops) now runs loop Bool { ... } and
source-less loop { ... } as actions. Test the source before each body entry,
including after continue. Bare break stops the nearest loop without rechecking
the source; bare continue skips the body tail and tests that source again.
Bodies introduce lexical scope, reinitialize locals on each entry, and preserve
explicit outer var updates. Nested loops target their own body transfers;
runtime faults and exit(code) propagate through loops.

Loop expressions used for values, metadata/accumulators, iterables/ranges, tags,
break/continue payloads, source/header transfers to an enclosing loop, then,
finally, and recovery are explicitly unsupported. No observable loop-result
value is exposed in this subset. The body tail still evaluates for its effects;
the implementation does not select a new always-Unit loop result rule.

## Evidence

Strict TypeScript no-emit checking and all 30 Node test groups pass on the pinned
Node 26.13.0/TypeScript 7.0.2 toolchain. Added cases cover zero iterations,
reevaluated conditions, input consumption after continue/break, nearest-loop
targeting in nested loops, body-local reinitialization, lexical shadowing,
fault/exit propagation, and rejected sources/unsupported transfer forms. Invalid
or unknown code in an untaken body is still rejected before effects.

The real CLI example [sum-positive.lts](../../language/examples/003-sum-positive.lts)
reads 3, -2, 4, 0 and reports 7; initial 0 reports 0. Its negative values exercise
continue and its sentinel exercises break. No existing lesson source is changed.
No native, iterable, lifetime, cleanup, or self-hosted compiler result is claimed.

## Handoff

Preserve this version as igniter-v0.1.0-alpha.3 without changing previous tags.
User functions, collections/text operations, and file I/O remain steps toward the
Lite-written compiler. Wider loop result/inference/completion work remains open
and should be tested separately when implemented.
