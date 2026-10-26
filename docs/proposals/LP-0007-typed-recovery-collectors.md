# LP-0007 r1: Typed recovery collectors and occurrence order

- ID: `LP-0007`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the unselected `errs: [Error]` group-capture spelling explored in LP-0005; complements [LP-0006 r1](LP-0006-whole-match-failure-consumption.md).
- Superseded by: none.

## Selected collector and bound type

```text
{ read_cached() }
    else ...errs: Error {
        loop errs as err { report_failure(err) }
    }
```

`...errs: Error` explicitly collects every matching pending Error occurrence. Inside the catch, errs has the readable indexed-sequence type [Error]; each loop item has type Error. The annotation names the collected element/filter type, and the ellipsis supplies collection meaning, consistently with the existing declared `...rest: T` collector direction.

One matching failure gives a one-element sequence. Several give all matching elements. No match skips the clause rather than entering it with an empty sequence. The number of occurrences is not a required field in Error and is not a count parameter in the function's declared error contract.

The matching catch body runs once for that clause's evaluation; it is not automatically repeated for each occurrence. Per-error work is expressed by an explicit loop. Receiverless catching also consumes all supported matches and evaluates its fallback once. Ordinary typed filters retain all-match consumption; scalar receiver binding for multiple values remains a separate unresolved contract and must not select an arbitrary payload silently.

## Selection and order

Catch clauses are considered in written `else` order. A collector receives a stable subsequence of the pending remainder: it preserves the selected failures' occurrence order and excludes failures already consumed by earlier clauses. Filtering neither sorts by type nor reconstructs consumed occurrences.

The broad Error selector captures returned-error occurrences only. An all-failures selector may capture both errors and supported typed panics; its source symbol is not selected. The discussion's `symbolOfAny` is a placeholder, not a new identifier, keyword, wildcard, or source production.

For a schematic pending stream (ErrB1, Panic1, ErrA1, ErrB2, ErrA2):

- An Error collector preserves (ErrB1, ErrA1, ErrB2, ErrA2), leaving Panic1 pending.
- One all-failures collector would preserve the complete mixed stream.
- An ErrA collector followed by ErrB collects (ErrA1, ErrA2), then (ErrB1, ErrB2). Each group is ordered, while processing the groups in clause order changes their original interleaving.

To inspect a complete mixed occurrence stream, use one all-failures capture before other clauses consume any of its entries. The eventual spelling of that selector remains open. Group order does not change clause order or cleanup's existing provenance rules.

When an A handler raises a new C while an older B remainder is pending, their known synchronous occurrence order is B before C. Consuming A does not reorder B, and the new failure does not re-enter the same handler. Ordering across future concurrent execution needs its own contract; no global timestamp or concurrent merge mechanism is selected here.

## Scope and implementation boundaries

Capturing matched failures and explicitly iterating their values are separate actions. Breaking the reporting loop does not revive failures consumed by the catch. A nonlocal exit with a different unmatched category still needs its separate rule; this proposal does not authorize suppressing that remainder.

A handler is outside its own recovery boundary. New handler failures follow existing outward composition/propagation and do not restart the same clause. Result and panic origins remain distinct, and the broad Error filter must not consume panic occurrences merely because an underlying payload type overlaps.

The [T] type promises readable iteration, cheap exact count, and indexed reads. It chooses no fixed extent, contiguous owner, heap allocation, cloning policy, or escape lifetime. Filtered capture needs a provider satisfying that complete contract; general carrier representation, ownership/retention, allocation-failure policy, and ABI remain open. This typed collector does not change structural tuple-pattern remainder rules.

The former `errs: [Error]` group-capture candidate is not an alternative spelling for the selected collector. Ordinary sequence-valued error matching retains its existing typed-receiver context; this proposal does not finish scalar binding for multiple array-valued errors. Complete element-filter type parsing, nested/combined capture patterns, the all-failures marker, and general expression precedence remain open.

## Revision history

`r1` records the selected ellipsis collector, [Error] binding type, one/many/no-match behavior, once-per-clause execution, stable filtered occurrence order, error-only versus all-failure selection, and open exit/storage details. No compiler, runtime, allocation, or performance result is claimed.

Normative owner: [expression recovery](../expression-recovery.md#typed-recovery-collectors-selected). Related: [declared array collectors](../tuple-array-shapes.md#a-declared-variadic-tail-collects-an-array), [indexed sequence](../indexed-sequence-contract.md#readable-t), and [remaining exit review](LP-0005-handler-execution-and-exits.md).
