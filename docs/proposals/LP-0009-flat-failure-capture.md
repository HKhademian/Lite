# LP-0009 r1: Explicit capture and flat failure outcomes

- ID: `LP-0009`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: the one-error-only Result description retained by LP-0004/LP-0007, only insofar as it excluded stored multiple occurrences; selects the all-failures spelling left open by LP-0007. Count-free declarations, collector spelling, execution count, and ordering are retained.
- Superseded by: none.

## Decision

Postfix exp? explicitly captures supported failures from evaluation of its entire operand as a stored outcome. The boundary is active before evaluation and the operand runs once. Any expression may be the operand. Existing continuation rules require grouping a completed block: `({ work() })?`. For a simple call, `work()?` has the same capture extent as its one-call block. Argument/receiver/callee and synchronous called-code panics are included. Ordinary unmarked operation else retains LP-0001's narrower fault scope.

For outward T, capture yields T ! Panic. For outward T ! E, it yields T ! (E | Panic), normalizing one outward Result layer. Results deliberately stored inside the success payload remain data. Capture does not scan discarded Results, unwrap Result arguments, retry, roll back effects, catch prior escaped panics, or intercept function/closure exits such as postfix !. Cleanup retains its existing ordering and primary/secondary rules. Arbitrary foreign crashes and hard aborts are not promised recoverable.

The flat outcome's failure side preserves ordered occurrences, including several of the same category. The type lists admitted categories without counts; union normalization never discards occurrence payloads. Explicit .err(error) remains singular construction. There is no mandatory public Captured or FailureGroup wrapper. The earlier generic Result = ok(T) | err(E) sketch describes singular outcomes rather than a complete aggregate carrier. Exact aggregate construction, .err pattern payload access, ownership, and ABI remain open. Ordinary outcome storage/passing/widening must preserve occurrences and channel origins without depending on the caller knowing capture provenance.

Error selects returned errors, Panic selects typed panic occurrences without requiring a compile-time enumeration of all categories, and Failure selects both, conceptually Error | Panic. Concrete panic identity/payload must support specific matching; full schemas and category declarations remain open. A returned error does not become a panic based on payload spelling. Origin must survive possible type overlap; complete admissible-error/overlap rules remain open.

Stored outcomes support the existing munching recovery rules. `...fails: Failure` binds [Failure] in occurrence order, `...ps: Panic` binds [Panic], and `...errs: Error` binds [Error]. A matching body runs once, no match skips it, and clauses run in written else order. Matching consumes all matches, with or without a collector. Later clauses see the unmatched remainder and any new handler failures. Scalar multi-match binding remains open.

## Compatibility and open boundaries

Ordinary T ! E functions do not implicitly add Panic, and T! remains T ! Error. Capture stores supported panics explicitly; ordinary calls retain implicit panic propagation. The ? token is capture, not the rejected recoverable-propagation spelling or an Option operator. Complete postfix precedence, repeated capture, mixed-origin inspection, retention-failure policy, and implementation remain open. No component version is assigned until release.

## Revision history

`r1` selects explicit operand capture, flat failure types, one-outward-layer normalization, broad Error/Panic/Failure selectors, stored ordered occurrences, and subsequent munching. It replaces the provisional Captured/FailureGroup public type idea and records the limited change to earlier singular Result descriptions. No compiler or runtime result is claimed.

Normative owner: [failure capture and unwrapping](../failure-capture-and-unwrapping.md). Related: [Result](../result-and-errors.md), [recovery](../expression-recovery.md), [typed collectors](LP-0007-typed-recovery-collectors.md), and [extraction](LP-0010-outcome-extraction-and-exhaustion.md).
