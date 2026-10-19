# Collection and source contracts

Status: **design proposal, 2026-10-19**. The user requires collection abstractions to account for known and unknown size, hot and cold sources, and future generators. These are independent properties; generator, asynchronous, and subscription syntax remain future work.

## Size knowledge

- Static extent: an exact element count is part of the type contract.
- Runtime exact count: a provider reports its current length, without exhausting it.
- Bounds or estimates: a source may report a minimum, maximum, or hint without promising an exact count.
- Unknown count: traversal supplies values without a count guarantee. The source may be finite or unbounded.

Distinguish total collection length from a cursor's remaining count. A static count does not prove that every runtime index is valid. A runtime count does not make a set indexable. Unknown count does not mean infinite, and eventual completion does not imply a cheaply available count.

Rust's Iterator separates size_hint from consuming operations such as count, illustrating why estimates and destructive counting must not become an exact-size contract. Source: [Rust Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html#method.size_hint).

## Access and stability

Traversal, random indexing, contiguous storage, and repeatability are separate capabilities. An algorithm requesting one pass should admit a suitable unknown-size source; an operation needing random access must request that capability explicitly.

Traversal order also needs a precise contract: list positions preserve the supplied occurrence order, insertion-preserving sets retain insertion policy, sorted providers use an ordering relation, and other traversals may leave order unspecified. These guarantees do not require the same storage. See [collection order](collection-order-and-traversal.md).

Size facts must remain valid until the dependent access completes. A prior length check is insufficient if aliases, callbacks, or concurrent updates can invalidate it. The eventual access model must establish a stable read, borrow, snapshot, or another appropriate guarantee. Do not silently snapshot every source.

## Production and replay

A cold source starts its production for a consumer. A hot source can produce independently of a particular consumer. Those descriptions do not establish total size, indexing, retained history, or identical results across traversals. A repeatable cold computation can execute again and still observe different external data.

Kotlin's Flow documentation distinguishes per-collection execution from a shared running source; SharedFlow documents a hot stream with configurable replay and buffering. These are reference concepts rather than an adoption of Kotlin's exception or coroutine model. Sources: [Flow](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-flow/) and [SharedFlow](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-shared-flow/).

Eager versus lazy evaluation, hot versus cold production, synchronous versus asynchronous delivery, and repeatability must not be collapsed into one flag. Creating fresh traversal state also differs from advancing a caller's existing cursor; existing permission and ownership rules still apply.

## Consequences for patterns and extraction

The initial square-bracket pattern proposal applies to suitable ordered sequences, not every traversable source. Before accessing an element, establish the shape safely. A short sequence produces a pattern mismatch, not an internal out-of-bounds read.

For an unknown-size one-shot source, establishing exactly two elements may require requesting a third element or observing completion after the second. Either can consume input, suspend, or never complete. Even a prefix read of two values can consume one value before discovering there is no second value. Failure does not inherently rewind the source.

Do not implicitly subscribe to a hot source, drain a generator, count a one-shot traversal, buffer an entire stream, or manufacture random indexing to make an ordinary pattern fit. Future explicit reading operations need contracts for consumption, remaining input, early completion, producer errors, suspension, cancellation, buffering, and replay. Exhaustion can be normal end-of-input; it is distinct from a producer failure. An extraction requiring more values can separately report insufficient input.

Generators and reactive sources may provide additional capabilities when their implementations can prove them. They need not all have unknown size or be one-shot. Generic traversal should preserve actual guarantees rather than assign capabilities based only on the provider's category name.

## Beginner presentation

Teach loops and values first. Explain a restriction at the operation: "This source supports traversal but has no random indexing" or "This read consumes input." Protocol names and a complete source taxonomy should not become mandatory annotations in early lessons.

Related: [capabilities](collection-capabilities.md), [consumer requirements](collection-abstractions.md), [sequence patterns](sequence-patterns.md), and [collection inference](collection-inference.md).
