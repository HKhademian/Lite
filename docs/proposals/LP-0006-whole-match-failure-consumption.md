# LP-0006 r1: Whole-match failure consumption

- ID: `LP-0006`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design clarification**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; resolves ordinary type-filter consumption multiplicity left open by [LP-0004 r1](LP-0004-count-free-error-contracts.md).
- Superseded by: none.

## Selected contract

The user clarifies that the simple catch still munches/captures all of its matches. Explicit group access must not turn ordinary catching into one-occurrence consumption.

- A receiverless catch-all covers all pending failures supported by its target.
- An ordinary typed filter covers every pending occurrence matching its type, leaving other types for later clauses.
- Written `else` order governs clause processing, independently of error occurrence order.
- No matching occurrence means no handler execution and no consumption. A successful target does not activate recovery with an empty collection.
- A type-based catch does not require a predicted occurrence count or one written clause per occurrence.
- Captured/consumed original failures are distinct from new outward failures produced by a handler; existing no-self-catching and remainder-preservation rules continue to apply.

For schematic (ErrA1, ErrA2, ErrB), where both ErrA values match the same category, the ErrA clause consumes both; ErrB remains for a later eligible clause or its channel's outward handling. With only (ErrA,), that same filter covers the single occurrence. A receiverless catch-all covers the entire supported original group.

## Collector follow-up

During this clarification, the user explored `else errs: [ErrA] { ... }` to expose all matching values for explicit iteration, including a single match as a one-element sequence. The subsequent [LP-0007 r1](LP-0007-typed-recovery-collectors.md) selects `else ...errs: ErrA { ... }` instead, with errs typed [ErrA], once-per-clause execution, and stable occurrence order. The earlier bracket-only capture candidate is retained in LP-0005's revision history.

Whole-match consumption does not depend on spelling an explicit sequence receiver. Ordinary typed and receiverless forms keep their complete matching coverage. Scalar receiver behavior with several payloads, ownership/retention, and nonlocal exits with unmatched failures remain open in LP-0005. Repeated entries inside combined/ordered receiver patterns also need their own matching rules.

## Revision history

`r1` records the user's clarification that simple catches retain all-match consumption and sequence capture supports singleton capture. It links the subsequent collector-spelling selection in LP-0007, invents no implicit handler loop, and claims no parser/compiler/runtime validation.

Normative owner: [expression recovery](../expression-recovery.md#whole-match-consumption-selected).
