# LP-0013 r1: Scalar recovery selection and discarded matches

- ID: `LP-0013`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the typed scalar multi-match binding gap retained by LP-0006/LP-0007/LP-0009. Whole-match consumption, once-per-clause execution, and collector order are unchanged.
- Superseded by: none.

## Decision

A typed scalar receiver such as `else err: Error { body }` consumes every matching pending Error occurrence, binds the first match in occurrence order to err, and intentionally discards access to the other matched payloads. Those other matches are handled, not left pending. Failures outside the filter remain untouched. No match skips the clause; a match runs its body once. A singleton behaves ordinarily.

For pending (ErrA1, Panic1, ErrB1, ErrA2), err: Error binds ErrA1, consumes/discards the other returned errors ErrB1 and ErrA2, and leaves Panic1 pending. err: ErrA instead consumes only ErrA occurrences, exposing ErrA1 and leaving Panic1 and ErrB1 in their existing order. The same scalar rule applies to individual-failure category filters such as Panic, BoundPanic, and Failure.

Explicit ellipsis collection consumes the same matches but exposes every matching occurrence in order: ...errs: Error binds [Error]. Receiverless/type-only catches continue to consume all matches without exposing a payload. Clause execution is written else order; first-match selection uses occurrence order within that clause's remainder.

This is the user's explicit discard policy, not implicit repeated handler invocation or arbitrary selection. Discarded matches are not revived by a later raise of the one exposed value. Other pending categories still have their own handling/exit obligations. General untyped receiver binding, aggregate .err inspection, and metadata/lifetime representation remain open. Ordered tuple receivers retain their existing exact-group tuple binding; this decision concerns scalar category filters and does not rewrite aggregate patterns.

## Revision history

`r1` records typed scalar first-match exposure, consumption and intentional discard of other matches, preservation of nonmatching categories, and the contrast with explicit all-match collection. No carrier ABI, allocation policy, parser, or runtime result is supplied.

Normative owner: [expression recovery](../expression-recovery.md#typed-scalar-receivers-selected). Related: [typed collectors](LP-0007-typed-recovery-collectors.md), [directed raise](LP-0014-directed-failure-exits.md), and [remaining shortfalls](../failure-handling-shortfalls.md).
