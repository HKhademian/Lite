# Adding and removing sequence ends

Status: **naming and structural-capability proposal, 2026-10-19**. The user requests push/pop at both ends. The user objects that Option-returning default pops are inconsistent with the indexing direction. Recommend aligning ordinary pops with the eventual ordinary index failure policy; no default is selected. Names, allocation failures, and API signatures remain under review.

## Proposed operations

Recommend one symmetric family:

- push_front adds one element before the current first element.
- push_back adds one element after the current last element.
- pop_front removes and returns the first element; empty behavior follows the operation's selected failure mode.
- pop_back removes and returns the last element; empty behavior follows the operation's selected failure mode.

Front/back name logical sequence ends, irrespective of physical buffer layout or element comparisons. Existing element order is preserved. A push adds exactly one occurrence, allowing repeats; it does not implicitly flatten an iterable or enforce set uniqueness. Bulk extension needs its own operation contract.

Push_start/push_end/pop_start/pop_end are coherent alternatives. Front/back has an established deque vocabulary; prepend/append/remove_first/remove_last is more descriptive but less symmetric. Choose one canonical family rather than requiring beginners to learn several equivalent names. This document recommends front/back without treating that recommendation as approved.

## Examples

```text
/* Proposed helpers; ordinary calls retain explicit mutation grants. */
mut numbers := [2, 3];
push_front(mut numbers, 1);
push_back(mut numbers, 4);

/* Revised candidate: direct values, like ordinary indexing. */
first := pop_front(mut numbers);
last := pop_back(mut numbers);
print(first);
print(last);
```

These examples assume the currently recommended asserting default for indexing and removal; an empty pop would fault safely, rather than return Option. That policy remains a proposal. These examples use free functions to avoid selecting an additional method-receiver grant syntax. The names could ultimately be public methods or library operations backed by explicit implementations. They do not create a new loop mode or change the List literal default. Push failure handling is still deferred; the example spelling assumes no escaping recoverable allocation error. If an API returns a declared Result, the established !/else rules apply.

## Mutability and supported operations

Mut access is permission to use the provider's mutable capabilities; it does not invent capabilities the provider lacks.

- Readable [T] guarantees the accepted indexed/traversal bundle.
- Mut [T] permits supported replacement at existing positions via set_index, without changing length.
- Growing and shrinking require additional declared structural operations.

A writable fixed array or fixed-length slice can satisfy element replacement without satisfying push/pop. A List can additionally support growth/removal. A deque can support both ends efficiently. A traversal-only output sink might support push_back without indexed reads. Do not require every output provider to implement the entire [T] bundle, or require all four end operations when an algorithm needs only one.

A concrete inferred List value can expose its actual growth operations. An explicit parameter values: mut [T] exposes only that contract; a library function using push_back must state its extra requirement, or deliberately use an inferred input contract. Full generic composition syntax is deferred. Mut alone must not conceal an additional growth requirement in a complete public signature.

## Align indexing and removal failure modes

The earlier default Option<T> recommendation is withdrawn after the user's consistency objection. It is a useful optional-removal design, but it adds mandatory unpacking to ordinary pop while the current indexing recommendation allows direct values. Method names borrowed from another language do not require importing that language's default return policy.

Recommend one source-level failure policy for ordinary positional operations:

- Under the currently recommended asserting default, indexed reads and pops produce T; indexed writes produce Unit. An invalid position or empty removal triggers the appropriate safe typed fault before that operation changes storage.
- Under the alternative recoverable default, reads and pops produce typed Results, and writes produce a typed Result with Unit success. Their errors can distinguish BoundsError from EmptySequence; these names are illustrative. The established explicit handling/propagation rules apply.
- Explicit checked variants of asserting operations produce typed Results for local recovery. The exact checked spelling and capture scope remain unselected; attaching else to a plain T is not automatically a handler for panics.

A separate deliberately optional query/removal may return Option<T>. This expresses an expected absence rather than a request to assert availability. Such a helper is an alternative API, not the proposed ordinary-pop default; names and whether it is needed initially remain open. No implicit conversion between Option and Result is introduced.

This proposal unifies the choice of failure mode, not all error payloads or mutation contracts. A successful read returns an element under its read/access contract; a successful write returns Unit; a successful pop removes and returns an element. The removed value is not a borrowed view into the vacated slot, and its transfer/copy rules must follow the eventual ownership contract.

An empty removal leaves the sequence unchanged. This is an operation-local guarantee, not rollback of earlier mutations or argument side effects. General panic capture and cleanup remain separate decisions. See [bounds and checked fault policy](checked-fault-policy.md).

## Costs depend on storage

For the proposed contiguous List representation, push_back can be amortized constant time, with occasional linear relocation on growth. Pop_back can be constant time excluding element cleanup. Inserting/removing at the front generally shifts the remaining elements and is linear in length. Element transfer and cleanup costs must be accounted for separately.

A growable ring deque can provide amortized constant-time insertion at both ends and constant-time removal, excluding element lifecycle costs. It can also offer constant-time logical indexing without promising that the whole sequence occupies one contiguous view.

Consequently a generic end-operation contract must state its complexity guarantees, and efficient-both-ends algorithms may require a stronger cost contract. The compiler must not silently change a List into a deque because a function calls push_front. These are design targets, not measured LiteScript performance.

## Remaining contracts

- Choose canonical names and a shared default failure mode for ordinary indexing/removal. Keep optional removal as a distinct alternative rather than the assumed default.
- Define allocation/capacity failure channels and push results; no blanket Result or panic policy is selected here.
- Specify ownership transfer, exception/fault safety during element construction, and cleanup.
- Define view/cursor invalidation and overlapping mutation. Structural mutation may relocate or invalidate storage even when indexed replacement is permitted.
- Decide public capability composition and any efficiency refinements alongside generics/interfaces.

## Reference languages

Rust VecDeque uses push_front, push_back, pop_front, and pop_back. Its pops return Option, and its ring buffer need not occupy one contiguous slice. This supplies the naming and absence precedent, not an automatic adoption of Rust ownership. Source: [Rust VecDeque](https://doc.rust-lang.org/std/collections/struct.VecDeque.html).

Kotlin ArrayDeque uses addFirst/addLast and removeFirst/removeLast. The ordinary removals throw when empty; removeFirstOrNull/removeLastOrNull offer nullable alternatives. A deliberately optional LiteScript removal could use Option instead; that does not select its ordinary default. Source: [Kotlin ArrayDeque](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-array-deque/).

Rust Vec documents amortized constant-time push, while insertion/removal at the front shifts elements. Its collections overview distinguishes the performance of Vec and VecDeque. Sources: [Vec operations](https://doc.rust-lang.org/std/vec/struct.Vec.html) and [collection costs](https://doc.rust-lang.org/std/collections/index.html#performance).

Related: [indexed sequence](indexed-sequence-contract.md), [capabilities](collection-capabilities.md), [lists](lists.md), [slices](slices.md), [operation contracts](collection-operation-contracts.md), and [generic notation](generic-notation.md).
