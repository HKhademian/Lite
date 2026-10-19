# Proposed collection capabilities

Status: **protocol decomposition proposal, 2026-10-19**. Capability-based consumer APIs are selected as a direction. The names below, method requirements, refinement graph, complexity laws, and generic syntax are not selected.

These names explain semantic requirements, not mandatory annotations for beginner scripts. The [inferred-indexing proposal](collection-inference.md#inferred-indexing-for-small-scripts) derives positional-access requirements from ordinary values[index] syntax in an unannotated function parameter. Explicit published contracts and inference boundaries remain separate decisions.

The [operation-contract proposal](collection-operation-contracts.md) connects this to compiler resolution: loop/bracket sugar uses a declared implementation of the required operation. Missing support is a static contract error; failure of a supported operation follows its declared outcome type. Index/key, yielded/read access, coherence, effects, and cost laws remain part of the eventual interface contract.

The [short indexed-sequence contract](indexed-sequence-contract.md) has an accepted [T] direction: finite cheap count, zero-based constant-time positional reads, and traversal in positional order. Mut [T] adds permitted element replacement, with a real setter implementation. The user identifies get_index, set_index, and iterable hooks; full protocol grammar and precise cost/index representations remain deferred. A general keyed lookup contract need not supply this whole bundle.

## Traversal is the minimum

`Iterable<T>` provisionally means that an operation can obtain one forward traversal of T elements under an explicit access/consumption contract. Iterator/cursor state is separate from a reusable collection. A borrowed collection can often create local traversal state without mutating its elements; an existing one-shot cursor needs defined consumption or writable access.

Do not require a length, indexes, a common allocation, or a reusable source for this minimum contract. Yielded owned values versus borrowed read access must remain typed and lifetime-correct. Neither a large element copy nor a heap iterator object follows merely from the abstraction.

### Iterable versus Traversable naming

Traversable in the recent LiteScript examples denotes the same broad role commonly called Iterable: an element source from which a loop obtains iteration. These are alternative explanatory labels here, not two selected LiteScript interfaces. Recommend Iterable for this role to reduce ambiguity; final names and generic spelling remain open.

Keep Iterator as the separate cursor/state that advances through elements. Iterable does not inherently promise independent repeated passes, stable order, length, or indexed access. Rust's IntoIterator is a comparable traversal-acquisition role, while Kotlin uses Iterable. Sources: [Rust IntoIterator](https://doc.rust-lang.org/std/iter/trait.IntoIterator.html) and [Kotlin Iterable](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin.collections/-iterable/).

The names are not universal synonyms across languages: Haskell Traversable supports effectful traversal while rebuilding a structure, a stronger/different abstraction than ordinary loop support. Source: [Haskell Traversable](https://hackage.haskell.org/package/base/docs/Data-Traversable.html). This naming recommendation does not adopt those languages' ownership, replay, or dispatch contracts.

## Independent extra abilities

- Sized: obtain an exact size under a documented cheap-cost requirement, without exhausting the source. A traversal estimate is a different operation. Collection length and a cursor's remaining count need distinct definitions.
- Repeatable: create independent traversals while the source remains valid under its access contract. This does not promise a frozen snapshot across external mutation.
- Order guarantees: distinguish preserved sequence positions, insertion order, comparator-sorted order, and unspecified traversal order. A plain list needs no element comparator or uniqueness rule. An iterable set can participate without promising persistent positions. Exact capability names and their graph remain open; see [order and shared traversal](collection-order-and-traversal.md).
- `Indexed<T>`: access a valid logical index with a specified complexity contract. Linked-list indexing must not pretend to have constant-time random access.
- `Contiguous<T>`: provide an appropriate bounded view over physically consecutive initialized elements. This would refine relevant size/index requirements; the exact graph remains open.
- Reversible: traverse in reverse without silently buffering a one-shot stream. Its relationship to repeatability and cursor movement needs definition.
- `Membership<T>`: answer a membership query under specified equality semantics, potentially using a provider's efficient lookup.
- Insertion/output capabilities: accept elements into an appropriate destination. Ordered append, set insertion, indexed replacement, and arbitrary element mutation are different operations with different laws.

These are composable requirements, not a proposed class-inheritance tree or a list of methods every collection must implement. For example, a set can be traversable and cheaply sized without being indexable or contiguous. A chunked sequence can provide fast logical indexing without one contiguous element region. A packed-bit representation need not expose addressable Bool slots merely because it supports logical indexing.

The [source-contract proposal](collection-source-contracts.md) additionally separates static/runtime/unknown size from hot/cold production, eagerness, replayability, and synchronous/asynchronous delivery. No ordinary pattern should implicitly drain or subscribe to a source merely to discover its shape. Generator and subscription mechanisms remain future work.

## Consumer examples

```text
render_icons := fn(icons: Iterable<Icon>) {
    loop icons as icon { render(icon); }
}
```

This needs traversal only. A two-pass layout algorithm would additionally require repeatability; a preallocation algorithm needing a cheap exact count would require Sized as well. Requirement-composition syntax is intentionally not sketched yet, because generic and interface syntax are deferred.

Do not count a one-shot source by traversing it and then quietly assume it can be restarted. Do not allocate a List merely to make an implementation pass a stronger signature unless the conversion is explicit in the API.

## Conformance needs semantic and cost laws

An implementation must satisfy behavior, element type/access, failure handling, and any stated cost promises. Providing methods with matching names is insufficient. A capability does not imply ownership of the elements or permission to mutate them. Exact method signatures and whether constraints carry complexity guarantees must be reviewed together.

A public generic body must be checked against its published requirements, so adding indexing or a size lookup cannot silently make a traversal-only API reject other providers. Optional optimized hooks require the separately defined [customization contract](collection-algorithms.md); access to one concrete standard type must not leak into the baseline implementation.

No blanket covariance of mutable or contiguous element storage follows from these interfaces. Plain-union value widening does not justify writing a new alternative into a narrower source or reinterpreting a different element stride. A logical adapting iterator might support conversions that a direct Slice cannot, under a separately defined conversion contract.

## Integration with loops and providers

List, array, slice, set, range, generated sources, and user implementations should conform to whichever contracts they can honestly provide. Existing loop source modes remain distinct: obtaining a collection traversal does not turn a Boolean guard into a stored sequence. Reverse/step adapters should preserve capabilities they can prove rather than force a standard provider representation.

The Rust IntoIterator/Iterator distinction and C++ range refinements are useful references for separating traversal acquisition and stronger abilities. LiteScript's vocabulary and rules remain its own design. Sources: [Rust IntoIterator](https://doc.rust-lang.org/std/iter/trait.IntoIterator.html), [Rust Iterator](https://doc.rust-lang.org/std/iter/trait.Iterator.html), and [C++ range requirements](https://eel.is/c++draft/range.req).

Related: [consumer abstractions](collection-abstractions.md), [collections and iterators](collections-and-iterators.md), [interfaces](composition-and-interfaces.md), and [sequence storage families](sequence-types.md).
