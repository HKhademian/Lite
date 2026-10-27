# LP-0011 r2: Explicit failure raising from recovery

- ID: `LP-0011`
- Revision: `r2`
- Status: **draft, 2026-10-27; caught-group forwarding requested; manual raise selected separately in LP-0012**
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

The r1 reviewed direction used raise for nearest-function/closure forwarding. [LP-0012 r1](LP-0012-manual-failures-and-error-inference.md) now selects manual raise expression instead: Error operands return a failure from the nearest function/closure; Panic operands initiate ordinary panic propagation and can reach eligible local recovery. Freshly constructed versus previously caught payloads do not select different raise behavior. A separate caught-group forwarding form that bypasses remaining local clauses is still requested, but its spelling/target/remainder contract is not selected. Re-emitted occurrence provenance also remains open.

## Multiplicity and remainder

Scalar p: BoundPanic is unresolved when several occurrences match. The unambiguous payload collection direction is:

```text
x12
    else ...ps: BoundPanic { raise ...ps }
    else { default_value }
```

The collector syntax is selected. The illustrated raise ...ps is retained as historical proposed group-forwarding syntax, not an adopted form of LP-0012 manual raise. The body would run once, forwarding all collected matches. Other unmatched failures cannot disappear. Alternatives are forwarding those remainders too in their preserved original occurrence order, or rejecting the exit until they are handled. The former was recommended but no final policy was selected. Cleanup may add failures during any transfer under its existing rules. Scalar matching, target semantics, exact raise grammar, and mixing newly supplied values with retained occurrences need a joint decision.

Unlike outcome!, a raise inside a partially consuming handler needs to account for the implicit unmatched recovery remainder as well as its explicit operand. Do not claim that the already selected ! forwarding settles this separate exit conflict.

## Revision history

`r1` records the requested explicit raise form, proposed collector forwarding and nearest-function/closure target, the distinction from emitting a locally catchable failure, and unresolved remainder policies. This draft adds no selected exit production or panic-trigger API.

`r2` separates LP-0012's selected manual failure emission from the still-requested caught-group outward forwarding. Panic raise follows ordinary local recovery scope; the earlier forwarding meaning is not silently retained as a second contextual meaning. Scalar/group binding, remainder preservation, forwarding syntax/target, and re-emission provenance remain under review.

Current selected extraction: [LP-0010 r1](LP-0010-outcome-extraction-and-exhaustion.md). Related: [pending exits](LP-0005-handler-execution-and-exits.md), [temporary scope traces](LP-0008-recovery-block-tags-and-traces.md), and [capture reference](../failure-capture-and-unwrapping.md#manual-raise-and-remaining-caught-group-forwarding).
