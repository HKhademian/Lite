# LP-0010 r1: Outcome extraction and failure exhaustion

- ID: `LP-0010`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the returned-error-only limitation of postfix ! when its operand is a captured panic-bearing outcome; complements LP-0009 and LP-0003.
- Superseded by: none.

## Decision

`outcome!` evaluates once and supplies one outcome layer's successful payload. For failure, it forwards all retained occurrences with original categories, origins, multiplicity, and order. Returned errors leave the nearest function/closure subject to its declared coverage. Captured panics resume the panic channel through applicable exited-scope cleanup. Mixed transport must retain both channels and existing primary/secondary provenance. Ordinary ! still does not capture an uncaptured panic arising while its operand executes.

Failure forwarding is a function/closure-directed exit, not emission of a new local failure for the following else to recover. Later local recovery cannot intercept that control-flow transfer itself. Panic delivery outside the exited activation still follows the ordinary panic policy; cleanup failures follow the existing retention rules. No crossing a closure to return from an outer function is permitted. Complete mixed-channel ABI/implementation remains open.

For `attempt: T ! Panic`, `value := attempt!` has normal result T. The attempt binding retains its declared type. A plain T function can forward captured panics without treating them as returned Error; a function forwarding returned E still needs E coverage. No implicit catch, forced-success assertion, or recursive Result extraction follows.

Recovery that proves no possible failures remain on any continuing path produces its normal value type directly. With failure-free T-producing handlers, T ! (E1 | E2 | Panic), then E1 recovery, then E2 recovery, then Panic recovery yields respectively T ! (E2 | Panic), T ! Panic, and T. No extra ! is required at the last step. A narrower BoundPanic filter cannot exhaust an open Panic family. New handler/cleanup failures remain obligations; the accidental runtime absence of a failure is not a static proof of exhaustion.

This selects no public empty-failure type, no general coercion from arbitrary T ! E to T, and no unwrapping of a Result deliberately stored within T. A handler returning U may widen the normal result to T | U; an outward-exiting handler supplies no local normal alternative.

## Revision history

`r1` records generalized explicit extraction/forwarding, preserved failure origins and counts, nearest-function/closure transfer, and automatic ordinary-value typing after static failure exhaustion. Explicit raise syntax and unmatched-remainder exits remain separately under review in LP-0011/LP-0005. No parser/runtime behavior was executed.

Normative owner: [failure capture and unwrapping](../failure-capture-and-unwrapping.md#explicit-extraction-and-propagation). Related: [Result](../result-and-errors.md), [propagation](../propagation-and-chaining.md), and [cleanup](../finally.md).
