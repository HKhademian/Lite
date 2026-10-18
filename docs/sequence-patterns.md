# Ordered sequence patterns

Status: **tuples and typed positional composition are established; bracketed list/array/slice forms, pair equivalence, and rest details below are a finalization proposal**.

## Shared component meanings

Each position receives exactly its corresponding component. A name binds it, : Type tests its type, == expected compares it with an existing value, and nested structure/cases recursively apply the same rules. Repeated names shadow in written order, including ordinary readable _.

## Tuples and pairs

```text
(left, right)
(_: Int, == expected)
(.Some(user), label: String)
```

Recommend exact positional arity. A two-element tuple is the proposed ordinary pair representation; a nominal record named Pair would instead use its declared schema. Do not silently map tuple patterns onto a record, map entry, or unrelated loop metadata.

Empty/singleton tuples and parenthesized grouping still need one rule. The familiar candidate is (value,) for a singleton tuple and (pattern) for grouping, but the unit value's selected spelling is Unit. Neither ()/Unit equivalence nor grouped-pattern syntax is selected by this review. Tuple types and whole-value colon subpatterns also retain their [existing ambiguity](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).

## Lists, arrays, and slices: proposed surface

```text
[]
[only]
[first, second]
[first, ...rest]
[head: Int, ..._tail]
[.Some(user), == expected]
```

Recommended rules:

1. Square brackets select an explicitly supported ordered sequence type, not any iterable.
2. Without a rest capture, the length must equal the number of component patterns.
3. One trailing ...name accepts the remaining zero or more elements. Keep middle/multiple rests deferred initially to avoid split-search rules.
4. Shape/length checks precede component access. Compare the prefix from left to right and stop on mismatch.
5. Rest bindings are ordinary names: ..._ binds readable _, ..._tail binds readable _tail, and both allow nonuse. A bare ... with no name is not introduced by this proposal.
6. The []/[head, ...rest] shapes in the example below are candidate syntax, not an adopted collection literal declaration or a constructor call.

```text
/* Proposed sequence forms. */
match values {
    [] { report_empty() }
    [first, ...rest] { process(first, rest) }
}
```

Element constraints can reject the whole pattern; they do not filter elements from an accepted list. [1, 2] means exactly two matching elements, not a subsequence search or whole-list constructor invocation. Whole-list equality remains == expectedList when equality is available.

## Rest types and cost

For a fixed tuple, a rest binding should retain the concrete tuple types of the remaining components. For a homogeneous sequence it should retain its element type in a specified remainder representation. Do not silently widen it to an untyped list.

Prefer a view when the eventual ownership model permits it, but no borrowed Slice type, lifetime, copying, or allocation policy is selected yet. A rest binding must not promise both independent ownership and zero-copy access without the necessary contract. Remainder type, mutation permission, and invalidation belong in the sequence/ownership specification.

## Context restrictions

A known compatible fixed tuple can be destructured irrefutably in a declaration or loop receiver. A general runtime list may have another length, so [first, second] would normally be refutable and belongs in if/match. List shape checks do not become permitted filtering loop headers through this proposal. Type-level fixed lengths may prove a particular pattern irrefutable; that proof depends on the input contract.

Do not consume arbitrary iterators to discover a matching shape or require backtracking to restore a failed stream. Sets/maps need different semantics. Strings require an explicit byte/scalar/grapheme view rather than automatically matching as a sequence.

## References and related concepts

[Rust rest/slice patterns](https://doc.rust-lang.org/reference/patterns.html#rest-patterns), [Dart list patterns](https://dart.dev/language/pattern-types#list), and [Python sequence patterns](https://docs.python.org/3/reference/compound_stmts.html#sequence-patterns) offer different rest placement and capture contracts. This proposal deliberately starts with one trailing capture and retains LiteScript's readable underscore bindings.

See [tuples](tuples-and-patterns.md), [pattern contexts](pattern-contexts.md), and the [full type review](pattern-type-review.md).
