# Collection order and shared traversal

Status: **user clarification and reference review, 2026-10-19**. Ordinary sequences preserve the user-specified sequence and allow duplicates. Consumer APIs should accept compatible enumerable providers without requiring set-specific behavior. Exact order capabilities, set defaults, traversal views, and positional set-pattern support remain proposals.

## Sequence order is not sorted order

```text
values := [2, 4, 3, 1, 9, 7, 11, 4, 4, 5];
```

The literal supplies this sequence of occurrences. It must retain that order and all repetitions, subject to explicit permitted edits. It does not require an element comparator, hashing, or deduplication. A numeric ascending sort would be a separate operation with different requirements.

Use precise descriptions rather than one ambiguous ordered flag:

- Positional sequence order: positions and repeated occurrences are meaningful, as in an array or list.
- Insertion order: traversal follows the provider's insertion policy, as in an insertion-preserving set.
- Sorted order: traversal follows a declared ordering relation supplied by the provider or an operation.
- Unspecified traversal order: each pass yields a sequence of elements, but the consumer has no stronger order guarantee from the type contract.

The labels explain contracts; they are not selected source keywords or a final interface hierarchy. An ordered linked structure need not provide constant-time random indexing or contiguous storage. Mutation and alias rules determine when a previous position or traversal fact stays valid.

## Sets participate in ordinary element traversal

A set enforces uniqueness under its equality contract. Its implementation may preserve insertion order, produce comparator-sorted order, or expose an unspecified traversal order. Ordering elements by value is not required by set semantics alone. Changing equality-relevant or ordering-relevant fields of stored keys needs rules preserving the provider's invariants; a mut grant does not bypass them.

For an operation that only visits elements, the provider can be an array, list, slice, set, or suitable producer. It should not need a concrete Set input unless the consumer actually requires uniqueness, membership lookup, set algebra, or another set-specific guarantee. This follows the selected capability-based API direction.

```text
/* Under the proposed reusable parameter inference. */
render_icons := fn(icons) {
    loop icons as icon {
        render(icon);
    }
}
```

Assume render accepts Icon with read access. A compatible ordinary Icon set should be accepted. Traversal follows its provider's documented order; the function does not implicitly sort, deduplicate, copy to a List, or grant source mutation. A renderer promising a particular visual order must declare that stronger requirement or explicitly obtain it.

An arbitrary set traversal does have a first yielded element for that particular nonempty pass. It may not have a stable first element guaranteed across independent passes, mutations, process executions, or implementations. Observing one order does not establish a persistent positional API or an index-complexity guarantee.

## Traversal extraction versus unordered set matching

These are different possible operations:

- Extract the first two yielded elements of one traversal, following its order.
- Find two distinct members satisfying two constraints, potentially searching several assignments.

The second is the unordered search problem described in [set patterns](set-patterns.md). The first can be defined without sorting or treating the set as a contiguous array. It still needs length/prefix semantics, explicit source-consumption and remainder rules, permitted mismatch behavior, and clarity about unspecified order.

The earlier bracket-pattern restriction is a conservative initial policy, not a claim that sets cannot have a traversal projection. Direct set extraction or an explicit traversal view remains a possible extension. It must not silently become unordered backtracking or promise stable positions. One-shot and hot producers retain the separate [source-contract restrictions](collection-source-contracts.md).

## Reference examples

### Rust

HashSet exposes iteration in arbitrary order; BTreeSet exposes iteration according to its element ordering. Both can be traversed, despite different order guarantees.

```rust
use std::collections::{BTreeSet, HashSet};

let hashed = HashSet::from([3, 1, 2]);
for value in &hashed { println!("{value}"); } // unspecified order

let sorted = BTreeSet::from([3, 1, 2]);
for value in &sorted { println!("{value}"); } // 1, 2, 3
```

Sources: [HashSet iteration](https://doc.rust-lang.org/std/collections/struct.HashSet.html#method.iter) and [BTreeSet iteration](https://doc.rust-lang.org/std/collections/struct.BTreeSet.html#method.iter).

### Kotlin

List preserves positional order and allows duplicates. Collection extends Iterable, so a consumer can accept both lists and sets through a common contract. Default set construction preserves insertion order through LinkedHashSet; HashSet does not promise an order.

```kotlin
val items = listOf(3, 1, 3, 2)
val unique = setOf(3, 1, 3, 2)
for (value in unique) println(value) // 3, 1, 2
```

Source: [Kotlin collection contracts](https://kotlinlang.org/docs/collections-overview.html).

### Dart and Swift

Dart Set is iterable. Its documented implementations distinguish unspecified-order HashSet, insertion-preserving LinkedHashSet, and sorted SplayTreeSet. Swift likewise supports set traversal while giving Set no defined ordering. Sources: [Dart Set](https://api.dart.dev/dart-core/Set-class.html) and [Swift collection types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/CollectionTypes.md).

### JavaScript: an iterable set and a noniterable collection

```javascript
const values = new Set([3, 1, 3, 2]);
for (const value of values) console.log(value); // 3, 1, 2

const item = {};
const membership = new WeakSet([item]);
membership.has(item); // true
// for (const value of membership) {} // unsupported: not iterable
```

JavaScript Set supplies insertion-ordered iteration. WeakSet permits membership queries but deliberately provides no enumeration mechanism; its weakly held members have a different observation contract. Sources: [ECMAScript Set iteration](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-set.prototype.values) and [WeakSet](https://tc39.es/ecma262/multipage/keyed-collections.html#sec-weakset-objects).

For LiteScript, ordinary public enumerable element collections should provide traversal. That requirement need not force enumeration on future membership-only or restricted containers. Likewise, tuple spread/deconstruction is a static aggregate capability and does not by itself select a homogeneous runtime tuple iterator. General records do not automatically enumerate their fields.

## Direction for the short input syntax

This review supports the earlier candidate [Icon] as a minimal read-only element-source contract that a set can satisfy. Additional stable-order, indexing, size, uniqueness, or contiguous-view guarantees must be independently expressible and checked when needed. A runtime traversal yields a sequence of values without making every provider a positional storage sequence.

The bracket meaning, qualification syntax, inferred contracts, and stored abstract representation are still open. Do not require beginners to name every advanced guarantee in an ordinary loop, or silently add them to a traversal-only public signature.

Related: [capabilities](collection-capabilities.md), [consumer abstractions](collection-abstractions.md), [collection inference](collection-inference.md), [sequence patterns](sequence-patterns.md), and [tuple spread](tuple-spread-and-rest.md).
