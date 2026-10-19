# Set matching: equality, membership, and unordered extraction

Status: **whole-value equality and Boolean guards use existing primitives; unordered extraction and compact set/membership patterns are undecided**.

## Why sets differ from sequences

A set describes distinct elements. Its membership contract alone does not establish stable positional order, but its traversal can preserve insertion order, use sorted order, or leave order unspecified. A particular traversal can yield first and second values without the set promising stable indexes. The mathematical set {10, 20, 30} is used below as explanatory notation, not selected LiteScript literal syntax. See [order and shared traversal](collection-order-and-traversal.md) for this distinction and the reference comparisons.

## 1. Equality: exactly the same elements

```text
match actualSet {
    == expectedSet { report_equal() }
    _ { report_different() }
}
```

This uses the existing equality pattern, assuming the set type supplies appropriate equality. It binds no element. Standard set-content equality would ignore insertion/iteration order; exact collection equality still belongs to the type's contract. A set containing 10, 20, 30 would not equal one containing only 10 and 20.

## 2. Membership/subset checks: required values may be present

```text
/* contains is an illustrative API, not selected library spelling. */
match actualSet {
    values and values.contains(10) and values.contains(20) {
        report_contains_both()
    }
    _ { report_missing_required_values() }
}
```

This accepts a set containing 10, 20, 30 because the guard only requires 10 and 20. It does not choose values to bind as new element names. Exact-set comparison and contains-both selection therefore answer different questions.

A count constraint could require exactly two elements, but the count API is also a library decision. An empty-set test needs no positional syntax: use the type's emptiness/count predicate. A future explicit in pattern could test one subject's membership in a set; it is not selected here.

## 3. Unordered extraction: search for elements to bind

This section concerns finding assignments by member constraints. Extracting positions from one set traversal is a different candidate operation: it follows that traversal's order and need not search permutations. Direct traversal-pattern syntax, stability, shape failure, consumption, and rest contracts remain open. The current sequence-pattern restriction does not assert that such a projection is impossible.

Consider a hypothetical pattern selecting two different Int elements from a set and binding them to a and b. For the set {10, 20, 30}, the assignments include (10, 20), (20, 10), (10, 30), and others. Even a two-element set still permits both assignments unless another rule chooses one.

This is not equivalent to a tuple/list pattern. The language would need to answer:

- Must the pattern consume the entire set, or only find a subset?
- Must separate element subpatterns select distinct elements?
- Which assignment is chosen when several satisfy the pattern?
- Does a failed guard retry another assignment or move to the next arm?
- Are comparisons pure, and how often can they run during search?
- Does a rest binding contain all unselected elements, and at what ownership/allocation cost?

Sorting would require a defined ordering and an explicit cost; many element types only provide equality. Using the set implementation's iteration order would expose a potentially unstable assignment policy. Searching combinations can also add substantial work as the number of element patterns grows. Those are design choices, not consequences of ordinary destructuring.

## Recommendation for the initial language

Support whole-set equality through existing == patterns and express membership/subset predicates in guards. Keep element selection explicit through a future collection lookup/search API, whose Option/Result output uses existing case patterns.

Defer unordered element-binding syntax until it has a deterministic assignment, failure, ownership, and cost model. This recommendation is awaiting the user's choice; no set header, literal, rest syntax, or search algorithm is selected by this document.

## Maps are a separate review

Maps have keys and payloads. A key can identify which value a subpattern receives without a permutation search. That does not make map matching positional or settle whether required keys are exact/partial. See [maps in the type review](pattern-type-review.md#10-mapsdictionaries).

## References and related concepts

[Kotlin when](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements) demonstrates explicit membership selection for ranges/collections. [Dart map/list patterns](https://dart.dev/language/pattern-types) and [Python mapping/sequence patterns](https://docs.python.org/3/reference/compound_stmts.html#patterns) help distinguish keyed and ordered extraction; neither analogy supplies a deterministic unordered element-binding rule for LiteScript.

See [sequence patterns](sequence-patterns.md), [pattern primitives](pattern-bindings-and-tests.md), and [collections](collections-and-iterators.md).
