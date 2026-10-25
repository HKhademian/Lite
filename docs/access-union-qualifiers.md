# Qualified alternatives in access summaries

Status: **historical user-proposed notation explored 2026-10-18; not selected**. Existing value-union normalization, var/mut permissions, and all-target field-write safety remain established. Mut is held-data access and var is the replacement marker; the meaning of a per-alternative `A | mut B` access summary and access-summary boundaries remain unselected.

The subsequent replacement qualifier used slot, then the [var qualifier decision](var-access-qualifier.md) selected canonical A | var B | C. These access summaries distinguish replacement acceptance from held-data mutability. The mut spellings below preserve the original investigation and are superseded for that role. Complete access grammar and boundaries remain open; see [replacement access summaries](slot-access-qualifier.md).

## Proposed compact outcome

The proposal is:

```text
(mut A | mut B) | (mut C | mut B)

common access summary:
A | mut B | C
```

This outcome can describe the selected field-access safety rule if each parenthesized input describes one complete access contract:

- First input: readable A | B; writable A | B.
- Second input: readable C | B; writable C | B.
- Common summary: readable A | B | C; writable B.

All types here are assumed to be exact, unrelated alternatives under the current nominal/normalization rules. No subtype intersection or conversion is implied.

## A possible meaning for each marker

Inside one access summary, interpret each plain member as readable, and each mut member as both readable and accepted for replacement through this access path:

```text
A | B           /* read A | B; no write guarantee */
mut A | mut B   /* read A | B; write A | B */
A | mut B | C   /* read A | B | C; write B */
mut C | D | E   /* read C | D | E; write C */
```

These are proposed access-summary spellings, not ordinary union-type declarations already admitted by LiteScript. A write marker would guarantee replacement with that member regardless of the current stored alternative, subject to actual mutation permissions and ownership.

Within one such summary, repeating a readable member removes the duplicate. Including that same member as writable also includes its readable capability. These are candidate summary rules; they must not be applied to two alternative access paths as though their authorities were all available at once.

This representation covers exact field contracts whose writable alternatives are a subset of readable alternatives. It cannot describe every possible getter/setter contract, such as a setter accepting String while its getter produces Int through conversion. General properties are still open.

## Different from mutable payload alternatives

There is another plausible interpretation of A | mut B | C: the active value is a read-only A, a writable B, or a read-only C. That describes permission on the current payload. It does not guarantee that an A-valued location can be replaced with B.

Mutating an existing B and replacing a selected field with a B are different operations. For example, a read-only B could be stored through a writable slot without granting permission to mutate B's own fields. Conversely, writable access to an existing B does not inherently allow replacement of its containing binding.

Existing declaration mut governs held-data mutation; var governs whole-binding replacement. A proposed type-position mut must not silently change those selected meanings. Either give the access-summary marker a clearly scoped meaning, choose another spelling for accepted replacement types, or keep separate read/write clauses. None is selected here.

## Keep the access-path boundary

The prior mathematical distinction remains:

```text
Slot<A | B>          /* one slot accepting either member */
Slot<A> | Slot<B>    /* an unknown choice of two restricted slots */
```

Under the proposed replacement-summary interpretation, mut A | mut B describes the first slot's contract. It cannot also mean the second expression: when A and B are unrelated, that second expression has no common accepted write type without narrowing.

Ordinary union normalization makes this flattening valid for ordinary type alternatives:

```text
(X | Y) | (Z | Y) = X | Y | Z
```

Applying it to the user's unmarked input would leave mut A | mut B | mut C, preserving all three markers. It would not explain why only B keeps mut. Therefore the proposed outcome is a merge of whole access contracts, not a new rewrite of ordinary union membership.

One possible way to retain the boundary, using explicitly illustrative and unselected notation, is:

```text
access(mut A | mut B) | access(mut C | mut B)

common access summary:
access(A | mut B | C)
```

Here access(...) marks a complete read/write contract. This is not selection of an access keyword or constructor. An existing context might supply an equally explicit boundary, but relying on optional parentheses that ordinary union normalization erases would lose the distinction.

## Composition rule

Represent a contract internally as its readable possibilities R and accepted writes W. For a choice of possible access paths:

```text
R = union of every path's readable possibilities
W = common accepted writes of every path
```

For the current exact-member model, common accepted writes are the set intersection of normalized write alternatives. The public language need not add an intersection operator to perform this check.

These operations on whole contracts are associative, commutative, and idempotent. Their input atoms are complete access contracts, not individual mut-marked members inside one contract. Adding another possible path can add readable possibilities and remove guaranteed writes; it cannot grant a write that one path forbids.

For example:

```text
path one: read A | B; write A
path two: read A | B; write B

summary:  read A | B; no common write guarantee
```

This preserves safety when source ordering changes and when summaries are combined in stages.

## A summary is not every fact about the original type

The common read/write summary describes operations safe without further narrowing. It does not necessarily preserve which parent or access path is active, correlations with other fields, or branch-specific permissions available after a type test. Keep the original alternatives for those purposes rather than replacing their full union type with the summary unconditionally.

In particular, a later value test showing that a field currently holds B does not by itself prove which source path supplied it or which additional writes its location permits. Stable narrowing of the actual parent/access path needs its own proof.

## Reference comparison

TypeScript's documented callable-union example accepts only arguments supported by every possible function and produces a union of possible return types. That illustrates the same producer/consumer direction: outputs combine, while inputs must fit every candidate. The cited 3.3 release note is a historical example with its own overload/generic limits, not an assertion that LiteScript adopts TypeScript's current callable rules. Source: [TypeScript callable unions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-3.html#improved-behavior-for-calling-union-types).

Rust distinguishes variance of shared and mutable references and makes mutable references invariant in the referred-to type. This supports retaining storage constraints when access is composed; its lifetime-based subtype model is separate from LiteScript's exact plain unions. Source: [Rust subtyping and variance](https://doc.rust-lang.org/reference/subtyping.html).

## Assessment and next decision

The compact output A | mut B | C is useful as a proposed access summary and fits immutability by default. The unresolved choices are whether mut describes payload mutation or accepted replacement, how a whole contract is delimited, and whether users can declare/pass these contracts or only inspect inferred summaries.

Recommend defining those semantics before selecting the rewrite or treating it as type equality. Keep ordinary value union normalization unchanged and preserve original access alternatives behind any common summary.

Related: [union values and access contracts](union-values-and-access.md), [field reads](union-field-reads.md), [field writes](union-field-writes.md), [immutability by default](immutability-by-default.md), [mutability](mutability.md), and [normalization](union-normalization.md).
