# LP-0004 r1: Count-free error contracts

- ID: `LP-0004`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design clarification**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; constrains the open repeated-occurrence policy after [LP-0003 r1](LP-0003-pending-failure-munching.md).
- Superseded by: none.

## Selected contract

The user clarifies that a function declaration such as `fn(...): T ! (ErrA | ErrB)` has no error-occurrence count and must not acquire one. It describes admitted recoverable error types. A developer cannot predict aggregate multiplicity from that declaration and must not need to write one catch clause per possible occurrence.

Complete type-directed recovery therefore needs a count-independent way to account for every possible occurrence of the covered category. For schematic (ErrA1, ErrA2, ErrB), two distinct ErrA occurrences cannot force a caller to have predicted two and written two ErrA clauses. Requiring one additional clause for each unknown repeated occurrence is not the selected public contract.

The earlier assistant recommendation to consume one occurrence with at most one handler execution per written clause was not adopted. This proposal records its rejection as a required multiplicity-handling model; it does not alter an accepted repeated-occurrence algorithm, because none was selected.

## Preserved distinctions

- Clauses are considered in written `else` order, independently of error occurrence order.
- Existing munching preserves unmatched failures and new failures introduced during handling.
- An ordinary Result has one active success/error outcome. ErrA | ErrB admits one active error alternative, not simultaneous occurrences.
- A pending aggregate's occurrences are distinct from the set of admitted error types. Static union normalization does not erase occurrence payloads.
- Panics retain their separate implicit channel and are not implicitly added to every Result E.
- Target scopes, cleanup provenance, explicit Result handling, and no-runtime-layout guarantees retain their existing boundaries.

## Still open

The user has not selected per-occurrence handler execution versus grouped payload binding, or another count-independent consumption mechanism. Handler execution count, payload access/ownership, repeated-match result selection, same-type occurrence ordering, new handler failures, aggregate storage, and allocation-failure behavior remain open.

Do not infer a loop over handler bodies, collection-valued receiver syntax, automatic Result aggregation, error count parameters, or a concrete ABI from this clarification. Complete proof rules for type coverage and failure aggregation remain unimplemented.

## Revision history

`r1` records the user's count-free declaration constraint and withdraws the assistant's unaccepted one-occurrence-per-clause recommendation. No compiler or runtime behavior is claimed verified.

Normative owners: [expression recovery](../expression-recovery.md#error-contracts-do-not-declare-occurrence-counts) and [declared error coverage](../result-and-errors.md#declared-error-coverage).
