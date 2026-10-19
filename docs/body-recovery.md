# Recovery owned by a construct body

Status: **body-local ownership selected by the user, 2026-10-19; exact body-handler syntax and scope pending**. Treat fn/if/loop/match bodies as owners of their recovery. Do not attach an error-catching else(failure) at the outer level of an if/loop/match construct. Operation-level recovery remains available inside bodies. The user asks what the distinction between operation-local and body-wide handling means; the second form below is an illustration, not selected grammar.

## One operation inside the body

```text
if condition {
    first();
    second() else(failure) {
        recover(failure)
    }
}
```

This existing recovery form belongs to second(). A panic in first() happens before that handler is active and propagates outward. It is not caught merely because the handler is textually inside the same body.

## One handler owned by the body

```text
/* Illustrative body-wide section; its delimiter is not selected. */
if condition {
    first();
    second();

    else(failure) {
        recover(failure)
    }
}
```

The intended difference is that supported panics from first() or second() could reach the same body-owned handler. The handler is inside the body's braces rather than a second outer else competing with normal branch selection. This is the interpretation suggested by the function analogy, but the user has not yet chosen the exact body-wide form or its full scope.

The delimiter must distinguish a body-wide recovery section from a handler attached to the final operation. A newline cannot do that. The semicolon in this illustration ends the second operation; whether that suffices as the body-clause discriminator or another explicit form is needed remains a grammar decision. This document does not select a new meaning for existing separators or claim a complete parser.

## What the ownership correction settles

- Ordinary if else remains branch selection.
- Loop then/empty else remain completion hooks under their existing contracts.
- Match arms remain ordinary exhaustive pattern selection.
- Calls such as operation() else { fallback() } and operation() else(failure) { ... } retain their selected recovery forms.
- External recovery tails proposed on whole if/loop/match constructs are retired, including grouping workarounds whose purpose was to attach such a handler.
- A Result produced by a construct can still be stored, passed as Result data, or explicitly inspected later. Body-local ownership is not a ban on ordinary use of result values.

No function allocation, implicit closure, new plain-return target, or change to postfix ! follows merely from treating bodies similarly for recovery ownership. Returned Result arguments still need explicit handling/extraction before ordinary payload use. A returned .err remains data until explicitly handled or forwarded; a body handler does not silently collect every inner Result. A handler's own failure does not re-enter that handler.

## Scope questions still pending

For a literal body-only region, the condition/header/source/subject is evaluated before entering its body: an if condition, loop source acquisition/advancement, or match subject/arm guard is not automatically inside a selected branch/iteration/arm body. A surrounding body-owned handler could cover that evaluation, and operation-local handling can be attached to its producing call. A rule extending an inner body handler to its construct's header would need an explicit decision; it is not adopted by placement alone.

A loop body-owned handler naturally raises a per-iteration versus whole-loop question. An iteration failure must not silently continue, break, discard accumulator state, or retry; the handler's normal completion/explicit exit needs a defined contribution rule. Whole-function recovery would be active once per invocation rather than once per loop entry. These scopes and active-handler entry points still require confirmation.

The user correction names recovery placement. It does not independently move or retire finally hooks, specify panic cleanup, or finalize receiving cleanup transformations. Finally placement, ordering, cleanup failures, and Result-forwarding interactions remain separate decisions.

Related: [operation recovery](expression-recovery.md), [boundary comparison](recovery-boundaries.md), [Result handling](result-and-errors.md), [conditionals](conditionals.md), [loops](loops.md), [match](match.md), and [finally](finally.md).
