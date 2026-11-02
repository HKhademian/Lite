# LP-0003 r1: Pending-failure munching

- ID: `LP-0003`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design clarification**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; clarifies the selected declaration-ordered member-wise recovery model.
- Superseded by: none.

## Selected contract

Error catching supports munching: the first matching clause consumes its match, and the remainder still needs handling. Clauses run in declaration order and see the remaining pending occurrences, including any new outward failure from an earlier handler under the existing handler-chain rules.

For recovery reasoning, schematic `(ErrA, ErrB, ErrC)` describes multiple pending failures. A single failure is the same model with one occurrence, `(ErrSingle,)`. The empty remainder `()` means no failure remains to match or handle. This does not select an ordinary source tuple type, payload conversion, or runtime carrier layout.

- A matching clause consumes its match and runs its handler.
- A clause without a match runs no handler and consumes nothing.
- With no pending failures, failure clauses do not match, including catch-all clauses. Normal success passes through without recovery.
- Consuming part of an aggregate never consumes the unmatched remainder.
- If handler execution produces a new outward failure, preserve it alongside any existing remainder; already consumed occurrences remain consumed.
- With a provably empty remainder on every admitted path, there is no remaining returned error requiring `!` or an additional catch for those handled failures.

## Selected example

```text
status := { save_outputLine() }
    else (: DiskFull) { "Write failed" }
    else (: CloseFailed) { "Cleanup failed" }
```

Assume the block can produce only DiskFull and CloseFailed, at most one of each, the normal save result is String, and the handlers introduce no new failures. Both clauses together exhaust those failure possibilities. Neither failure -> preserve the normal result. DiskFull alone -> "Write failed". CloseFailed alone -> "Cleanup failed". Both -> the first clause leaves CloseFailed pending, then the second consumes it and supplies "Cleanup failed" under the existing last-matching-handler rule.

An execution with an empty remainder is distinct from a static proof that all paths have an empty remainder. An uncovered category or possible new handler/cleanup failure must still be accounted for. A function's declared Result error type alone does not enumerate every supported block panic.

## Preserved boundaries and remaining work

Operation-specific and explicit block recovery retain [LP-0001](LP-0001-operation-specific-panic-recovery.md) and [LP-0002](LP-0002-explicit-block-panic-recovery.md) respectively. Returned Results and implicitly propagating panics retain their separate origins and propagation rules. Stored Results are not recursively searched or unwrapped.

This clarification does not select a primary-promotion algorithm. Matching uses the pending remainder; cleanup's existing primary/secondary provenance is separate. Diagnostic relabeling, same-type repeated-occurrence consumption, runtime storage/ownership, aggregate inspection, nonlocal handler exits with pending failures, and the occurrence ordering of newly joined failures remain open. Existing typed filters, co-occurrence patterns, and exact ordered tuple receivers retain their selected matching rules.

## Revision history

`r1` records the user's singleton/aggregate/empty pending-failure clarification. No compiler, runtime, proof-system implementation, or performance result is claimed.

Normative owner: [expression recovery](../expression-recovery.md#pending-occurrences-and-munching-selected). Cleanup interaction: [finally](../finally.md#failure-aggregation-review).
