# LP-0011 r1: Explicit failure raising from recovery

- ID: `LP-0011`
- Revision: `r1`
- Status: **draft, 2026-10-27; explicit forwarding requested, remainder policy unresolved**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; explores explicit forwarding from handlers alongside LP-0010 extraction.
- Superseded by: none.

## Requested behavior

```text
x12
    else p: BoundPanic { raise p }
    else { default_value }
```

The user wants selected panics explicitly forwarded rather than recovered by default_value. If raise merely emits a new local failure, the following else encloses the first handler and can catch it under the existing expression-composition rules. Forwarding past that clause therefore needs a distinct control-flow contract. It cannot be implemented by silently changing ordinary chained-else coverage.

The reviewed direction is nearest-function/closure outward transfer, analogous to postfix !, preserving original origin and running required cleanup. This would bypass remaining local recovery clauses for the transfer itself. It would not relabel a panic as a returned Error or create another occurrence of the same panic. Source triggering of a new panic remains a different, unselected facility.

## Multiplicity and remainder

Scalar p: BoundPanic is unresolved when several occurrences match. The unambiguous payload collection direction is:

```text
x12
    else ...ps: BoundPanic { raise ...ps }
    else { default_value }
```

The collector syntax is selected; raise and its spread operand remain proposed. The body would run once, forwarding all collected matches. Other unmatched failures cannot disappear. Alternatives are forwarding those remainders too in their preserved original occurrence order, or rejecting the exit until they are handled. The former was recommended but no final policy was selected. Cleanup may add failures during any transfer under its existing rules. Scalar matching, target semantics, exact raise grammar, and mixing newly supplied values with retained occurrences need a joint decision.

Unlike outcome!, a raise inside a partially consuming handler needs to account for the implicit unmatched recovery remainder as well as its explicit operand. Do not claim that the already selected ! forwarding settles this separate exit conflict.

## Revision history

`r1` records the requested explicit raise form, proposed collector forwarding and nearest-function/closure target, the distinction from emitting a locally catchable failure, and unresolved remainder policies. This draft adds no selected exit production or panic-trigger API.

Current selected extraction: [LP-0010 r1](LP-0010-outcome-extraction-and-exhaustion.md). Related: [pending exits](LP-0005-handler-execution-and-exits.md), [temporary scope traces](LP-0008-recovery-block-tags-and-traces.md), and [capture reference](../failure-capture-and-unwrapping.md#explicit-raise-remains-under-review).
