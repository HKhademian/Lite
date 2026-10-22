# Ordered sequence patterns

Status: **tuples, typed positional composition, and positional tuple rest shape/placement/arity are selected; bracketed list/array/slice forms, pair equivalence, and list rest details remain proposals**.

## Shared component meanings

Each position receives exactly its corresponding component. A name binds it, : Type tests its type, == expected compares it with an existing value, and nested structure/cases recursively apply the same rules. Repeated names shadow in written order, including ordinary readable _.

## Tuples and pairs

```text
(left, right)
(_: Int, == expected)
(.Some(user), label: String)
```

For positional tuples, exact arity is selected when no rest is written. One trailing ...rest captures the remaining tuple components with their types and stored order: zero is Unit/(), one remains a singleton, and more remain a multi-component tuple. Missing required components are not supplied by rest. See [selected tuple rest](tuple-spread-and-rest.md#positional-tuple-rest-selected). A two-element tuple is the proposed ordinary pair representation; a nominal record named Pair would instead use its declared schema. Do not silently map tuple patterns onto a record, map entry, or unrelated loop metadata.

The later [singleton value selection](tuple-entries-and-access.md#singleton-values-selected) establishes (value,) as an unnamed singleton and (value) as ordinary expression grouping; named (= value) or (label = expression) values are singleton tuples without requiring a trailing comma. Singleton types are selected: (T) groups, (:T,) is unnamed, (label: T) is named, and (label,) infers the named component type; (:T) is rejected. The user selected (pattern) as grouping, (pattern,) as a singleton positional tuple pattern, and (local = label) as named extraction. Unit and () are now selected equivalent spellings for the zero-component value/type. Grouped patterns and the empty tuple pattern are selected: () matches only Unit and binds no names. Complete recursive parsing remains separate. Tuple type components now have selected name: Type, inferred bare-label, and :Type forms. The separate whole-value/nested colon pattern still needs a boundary from inferred named schemas; see [component grammar](named-input-routing.md#selected-tuple-type-component-grammar) and [nested patterns](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).

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

A known compatible fixed tuple can be destructured irrefutably in a declaration. In a loop, bind the whole item with the optional `as` name, then destructure it inside the body; a general runtime list may have another length, so `[first, second]` belongs in `if`/`match` unless an explicit checked-binding failure contract is provided. The later [checked-operation proposal](checked-collection-operations.md) explores a flat else handler for this purpose. List shape checks do not become filtering loop headers through that proposal. Type-level fixed lengths may prove a declaration pattern irrefutable; that proof depends on the input contract.

Do not consume arbitrary iterators to discover a matching shape or require backtracking to restore a failed stream. Sets/maps need different semantics. Strings require an explicit byte/scalar/grapheme view rather than automatically matching as a sequence.

## Length mismatch and direct declarations

Working recommendation: a plain destructuring declaration must be statically guaranteed to match. Known length mismatches are compilation errors:

```text
[a, b] := [1]; /* rejected: pattern requires exactly two elements */
```

Do not invent a zero, None, uninitialized value, or implicit recoverable error for b. There is no successful partial declaration. An arbitrary runtime-sized source needs explicit selection or an explicit checked-binding failure contract when its shape cannot be proved. The selection form is:

```text
if [a, b] := values {
    use_pair(a, b);
} else {
    report_wrong_length();
}
```

Evaluate the source once. On a length mismatch, enter else with neither a nor b in scope. A matching length still needs every component subpattern to succeed. The same matching behavior applies in match arms, where later arms can handle other shapes.

Recommend letting a direct literal establish a known length, so [a, b] := [1, 2] can succeed without changing the literal's selected List default. Length knowledge is a refinement fact, not an implicit conversion to a fixed array. The complete proof policy for variables, aliases, mutation, and calls remains open; direct literal proof is proposed rather than an implemented check.

A rest capture permits additional elements; it does not supply missing prefix elements:

```text
[a, ...rest] := [1];    /* proposed: a is 1; rest is empty */
[a, b, ...rest] := [1]; /* rejected: needs at least two elements */
```

Rest retains the source's element typing under its eventual remainder representation; an empty rest is still a valid typed sequence. Its view/copy/ownership contract remains open. This recommendation does not select padding, optional-position patterns, or runtime assertions. The later [flat checked-binding proposal](checked-collection-operations.md#proposed-flat-checked-binding) separately explores explicit recovery for shape failures; its grammar and propagation form remain open.

## References and related concepts

[Rust rest/slice patterns](https://doc.rust-lang.org/reference/patterns.html#rest-patterns), [Dart list patterns](https://dart.dev/language/pattern-types#list), and [Python sequence patterns](https://docs.python.org/3/reference/compound_stmts.html#sequence-patterns) offer different rest placement and capture contracts. This proposal deliberately starts with one trailing capture and retains LiteScript's readable underscore bindings.

See [tuples](tuples-and-patterns.md), [pattern contexts](pattern-contexts.md), and the [full type review](pattern-type-review.md).
