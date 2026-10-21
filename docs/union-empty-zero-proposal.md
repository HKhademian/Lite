# Empty zero state for plain unions

Status: **new alternative proposed by the user, open review 2026-10-21**. This would revise the previously selected rule that union zero belongs to exactly one listed member. It is not yet adopted. Metadata-plus-overlapping-payload storage and universal valid bytewise zero remain selected.

## Proposed behavior

```text
var x: (A | B) = 0

if x: A { /* not entered */ }
if x: B { /* not entered */ }
```

Under this proposal, zero metadata denotes a valid initialized union state with no active payload member. Both member tests fail. The payload bytes are zero but are not thereby an A or B object available for reading. This is a valid value of the newly expanded union contract, not reserved/uninitialized storage or an invalid pointer.

The user's previous reasoning rejected neither-member zero as invalid under the member-only contract. This proposal changes that contract: a union admits an explicit language-defined empty state in addition to its listed alternatives. The same bytes are valid only because their meaning is defined; the name alone does not make a previously invalid tag valid.

The user describes the union as neither type until unwrapped. Distinguish static type from stored member identity: a value supplied as A can have static type A | B while already holding A. Successful narrowing reveals that stored member. It does not choose a type or manufacture a value. A zero-tag value cannot be narrowed to either member merely by requesting it; both tests fail as shown. Subsequent assignment of an A value can establish A as the active member. Exact checked-extraction syntax remains separate.

## What this simplifies

Zero metadata can consistently mean empty for unions admitting this state; positive tags can identify actual members. No canonical zero-member ranking or Unit preference is needed for those union zeros. This preserves order independence without choosing arbitrary default members. Specific positive tag numbering, metadata width/position, and ABI still need design; this is not a complete layout specification.

A union-to-union widening could preserve empty as empty while preserving all active member values. This is a proposed extension of widening, not an already selected conversion rule. Widening a zero-valued A into A | B would still supply an active A; it would not erase it into destination-empty.

## Consequences that need a contract

### Coverage and negative type tests

A match with only A and B arms no longer covers an arbitrary A | B value. It needs a way to handle empty, or proof that the input is nonempty. An existing catch-all can structurally handle the extra state, but explicit empty-test/pattern syntax is not chosen. Failing an A test cannot imply B while empty is possible; sequential failed A and B tests can leave the empty path.

### Direct operations and cleanup

The selected common-field rule currently requires a field on every member alternative. Empty has no active payload field. To keep this proposal safe, an operation would need proof of a nonempty member or a newly specified empty-state behavior. No implicit zero field reads, ignored writes, panics, or automatic Results are selected here. Payload cleanup must likewise avoid treating empty bytes as a live A or B; exact cleanup rules remain to be designed.

### Unit, Option, and Result remain different states

If Unit is explicitly listed, A | Unit can contain an active A, an active Unit, or empty. A Unit test must not automatically match empty without a further decision. Similarly, an outer empty union state differs from an active Option member containing .None, or an active Result member containing .ok(zero(T)). There is no automatic flattening of these boundaries. Adding implicit emptiness therefore adds an observable case even when another empty-like member is already present.

### Normalization and single-member cases

The selected rule A | A = A currently removes duplicate identities, and nested plain unions flatten. If every union spelling adds an empty state even after collapsing to one member, A | A would no longer simply be A unless A also gained that state. One possible scope is to add empty only when normalization leaves at least two distinct alternatives. Another is to revise normalization or make emptiness an explicit type constructor. No scope is selected. Nested multi-member unions would also need one coherent empty state and equivalent zero behavior after flattening.

### Existing zero fallback and inference

For a conditional whose inferred T is a union admitting empty, its missing-else zero(T) would be empty under the proposal. This does not add Unit. A conditional inferred as Int still returns numeric zero when unmatched. Zero-result callables and stored union fields would use the same empty union zero. Explicitly supplied branch/member values retain their active identities.

## Comparison and review boundary

[Odin's ordinary unions](https://odin-lang.org/docs/overview/#unions) provide a relevant precedent: they are discriminated unions whose zero is nil, and their type-switch example handles nil in a default case. Odin separately offers no-nil unions. Checked 2026-10-21. This precedent does not decide LiteScript's syntax, normalization, field operations, or ownership rules.

Evaluate this alternative against member-only zero before continuing canonical ordering or Unit priority. The user has not yet explicitly adopted the revision; current selected semantics must not be silently migrated. No new public None type, null pointer, unchecked cast, empty-pattern syntax, or full union ABI is selected by this review.
