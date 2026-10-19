# Adding and removing sequence ends

Status: **naming and structural-capability proposal, 2026-10-19**. The user requests push/pop at both ends. Canonical names, empty-pop behavior, allocation failures, and API signatures remain under review.

## Proposed operations

Recommend one symmetric family:

- push_front adds one element before the current first element.
- push_back adds one element after the current last element.
- pop_front removes and returns the first element, if present.
- pop_back removes and returns the last element, if present.

Front/back name logical sequence ends, irrespective of physical buffer layout or element comparisons. Existing element order is preserved. A push adds exactly one occurrence, allowing repeats; it does not implicitly flatten an iterable or enforce set uniqueness. Bulk extension needs its own operation contract.

Push_start/push_end/pop_start/pop_end are coherent alternatives. Front/back has an established deque vocabulary; prepend/append/remove_first/remove_last is more descriptive but less symmetric. Choose one canonical family rather than requiring beginners to learn several equivalent names. This document recommends front/back without treating that recommendation as approved.

## Examples

```text
/* Proposed helpers; ordinary calls retain explicit mutation grants. */
mut numbers := [2, 3];
push_front(mut numbers, 1);
push_back(mut numbers, 4);

/* Proposed pop result: Option<Int>. */
if .Some(first) := pop_front(mut numbers) {
    print(first)
}

match pop_back(mut numbers) {
    .Some(last) { print(last) }
    .None {}
}
```

These examples use free functions to avoid selecting an additional method-receiver grant syntax. The names could ultimately be public methods or library operations backed by explicit implementations. They do not create a new loop mode or change the List literal default. Push failure handling is still deferred; the example spelling assumes no escaping recoverable allocation error. If an API returns a declared Result, the established !/else rules apply.

## Mutability and supported operations

Mut access is permission to use the provider's mutable capabilities; it does not invent capabilities the provider lacks.

- Readable [T] guarantees the accepted indexed/traversal bundle.
- Mut [T] permits supported replacement at existing positions via set_index, without changing length.
- Growing and shrinking require additional declared structural operations.

A writable fixed array or fixed-length slice can satisfy element replacement without satisfying push/pop. A List can additionally support growth/removal. A deque can support both ends efficiently. A traversal-only output sink might support push_back without indexed reads. Do not require every output provider to implement the entire [T] bundle, or require all four end operations when an algorithm needs only one.

A concrete inferred List value can expose its actual growth operations. An explicit parameter values: mut [T] exposes only that contract; a library function using push_back must state its extra requirement, or deliberately use an inferred input contract. Full generic composition syntax is deferred. Mut alone must not conceal an additional growth requirement in a complete public signature.

## Proposed empty-pop behavior

Recommend Option<T>: .Some(value) after removing an element, .None when already empty. Empty removal leaves the sequence unchanged. An Option absence is not an uninitialized payload or public null pointer. The returned element is a value removed from storage, not a borrowed view into the vacated slot; its transfer/copy rules must follow the eventual ownership contract.

This is independent of asserting positional bounds checks. A deliberately optional removal can coexist with values[index] using the selected eventual fault policy. An asserting or typed-error removal alternative remains possible, but adding every variant is not required for the first API.

## Costs depend on storage

For the proposed contiguous List representation, push_back can be amortized constant time, with occasional linear relocation on growth. Pop_back can be constant time excluding element cleanup. Inserting/removing at the front generally shifts the remaining elements and is linear in length. Element transfer and cleanup costs must be accounted for separately.

A growable ring deque can provide amortized constant-time insertion at both ends and constant-time removal, excluding element lifecycle costs. It can also offer constant-time logical indexing without promising that the whole sequence occupies one contiguous view.

Consequently a generic end-operation contract must state its complexity guarantees, and efficient-both-ends algorithms may require a stronger cost contract. The compiler must not silently change a List into a deque because a function calls push_front. These are design targets, not measured LiteScript performance.

## Remaining contracts

- Choose canonical names and whether ordinary pop returns Option.
- Define allocation/capacity failure channels and push results; no blanket Result or panic policy is selected here.
- Specify ownership transfer, exception/fault safety during element construction, and cleanup.
- Define view/cursor invalidation and overlapping mutation. Structural mutation may relocate or invalidate storage even when indexed replacement is permitted.
- Decide public capability composition and any efficiency refinements alongside generics/interfaces.

## Reference languages

Rust VecDeque uses push_front, push_back, pop_front, and pop_back. Its pops return Option, and its ring buffer need not occupy one contiguous slice. This supplies the naming and absence precedent, not an automatic adoption of Rust ownership. Source: [Rust VecDeque](https://doc.rust-lang.org/std/collections/struct.VecDeque.html).

Kotlin ArrayDeque uses addFirst/addLast and removeFirst/removeLast. The ordinary removals throw when empty; removeFirstOrNull/removeLastOrNull offer nullable alternatives. LiteScript's proposed optional removal uses Option instead. Source: [Kotlin ArrayDeque](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-array-deque/).

Rust Vec documents amortized constant-time push, while insertion/removal at the front shifts elements. Its collections overview distinguishes the performance of Vec and VecDeque. Sources: [Vec operations](https://doc.rust-lang.org/std/vec/struct.Vec.html) and [collection costs](https://doc.rust-lang.org/std/collections/index.html#performance).

Related: [indexed sequence](indexed-sequence-contract.md), [capabilities](collection-capabilities.md), [lists](lists.md), [slices](slices.md), [operation contracts](collection-operation-contracts.md), and [generic notation](generic-notation.md).
