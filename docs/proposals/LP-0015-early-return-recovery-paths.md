# LP-0015 r1: Early function returns and continuing recovery paths

- ID: `LP-0015`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the ordinary function-return portion of the unmatched-remainder question retained by LP-0008/LP-0009/LP-0014 and drafts LP-0005/LP-0011. Withdraws the proposed automatic remainder forwarding or rejection for this return case; other exit kinds are not decided here.
- Superseded by: none.

## Selected example

```text
tmp1 := operation()?;
/* tmp1: T ! (ErrA | ErrB | Panic) */

tmp2 := tmp1 else :ErrB {
    return 1
}
/* If this declaration completes: tmp2: T ! (ErrA | Panic). */
```

When ErrB matches, the handler consumes its matching occurrences and returns 1 from the nearest function/closure. tmp2 is never initialized on that path, and later recovery clauses/statements do not execute. The 1 belongs to the enclosing function's successful return contract, not tmp2's success type. It must fit an explicit/expected function output or participate in eligible normal result inference.

When ErrB does not match, recovery can complete with the original T success or an outcome retaining ErrA/Panic occurrences. That continuing path supplies tmp2's residual type. Captured panics are data in tmp1, not a requirement to re-raise on scope exit. The type lists possible categories, not a claim that every execution contains all of them.

If tmp1 actually contains (ErrA, ErrB, Panic), the same explicit return still returns 1. ErrA and Panic were not consumed by the ErrB filter; instead, the nonlocal return abandons the unfinished recovery expression. They are not implicitly added to the outgoing return, and their presence is not grounds for an extra handling/rejection requirement on this early-return pattern. There is no hidden scan or forwarding of other stored Result locals.

## Ordinary early-return patterns

```text
if not condition1 { return "not ready" }

do_op()? else { return "error happened" }
```

Both perform ordinary function returns. The receiverless catch consumes all supported captured matches before running its body. A typed partial catch may instead abandon unmatched captured categories when it returns. By contrast, a handler-local return @handler completes only that handler and leaves its remainder for later recovery layers, as already selected in LP-0008. Temporary traces distinguish those paths; temporary binding itself is not extraction.

## Contrast with handler-local failure completion

With op outward T and err2 an Error value of type Err2, tmp1 := op()? has T ! Panic. `tmp2 := tmp1 else @bl2 { raise @bl2 err2 }` has T ! Err2: the catch-all consumes all original panics, then the directed raise completes only the handler block with Err2. It does not exit the function or re-enter the same catch. `tmp3 := tmp2!` supplies T on success, or forwards Err2 under the enclosing function's error contract without initializing tmp3. This is the existing LP-0014 local-target composition, not the abandonment behavior of plain function return. No original unmatched remainder is present on this catch-all path. See [the worked example](../manual-failures-and-inference.md#handler-local-raise-changes-the-stored-outcome).

## Cleanup and scope limits

Evaluate the return payload under ordinary evaluation rules. If it completes, applicable cleanup runs while exiting. The abandoned captured remainder is not carried into cleanup as an active propagating failure. New failures during payload evaluation or cleanup retain their existing behavior; a cleanup failure can cancel the pending normal return. Abandoning stored failures does not swallow newly produced live panics or undo prior side effects.

This decision does not select what another unmatched remainder does during raise, failure-forwarding !, or a different nonlocal tagged/loop exit. It also does not change general ignored-result diagnostics, ownership/disposal, carrier representation, or the channels/order of failures explicitly forwarded. Those remain separate questions.

## Revision history

`r1` records plain early function-return precedence over unfinished captured recovery, continuing-path residual typing, unchanged function success typing and cleanup, and the distinction from handler-local completion. It rejects the earlier implicit-failure-conversion and remainder-based rejection recommendations for this case. No implementation, release, or runtime conformance result is supplied.

Normative owner: [expression recovery](../expression-recovery.md#early-function-returns-and-continuing-path-types). Related: [control flow](../control-flow.md), [manual failures](../manual-failures-and-inference.md), [cleanup](../finally.md), and [remaining shortfalls](../failure-handling-shortfalls.md).
