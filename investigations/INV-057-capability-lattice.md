# INV-057 — Collection capability lattice and concept boundaries

Status: recorded (reference survey and lattice proposal; no contract selected)
Contributor: redacted (agent-assisted)
Last updated: 2026-11-01
Catalog brief: [INV-057](TOPICS.md#inv-057)
Covered subtopics: whole topic; traversal, indexing, ordering, capabilities, and
custom containers.
Subtopic brief: none

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

The draft selected capability-based collection consumers, the `[T]` indexed
bundle, `Iterable<T>` as traversal-only notation, and the fixed-array / List /
Slice storage roles. It did not settle the concept graph: which properties are
independent, which are physically correlated, when two concepts should be merged
into one contract with a weaker promise, and when they must stay separate.

The user's framing is the question: set, array (elements adjacent in memory),
list (dynamic nodes), fixed size, and the rest, generalized, abstracted,
supported, merged, or split. The concrete questions:

1. What is the minimal set of independent capabilities?
2. Which combinations are forced by representation and therefore need no
   separate concept?
3. When is merging honest, and when does it create a lie that a provider cannot
   keep (indexing a linked list, adding to a read-only view)?
4. How does an operation state the capability and the cost it requires?
5. How are the eager/lazy and cold/hot execution dimensions kept from collapsing
   into the storage dimension?
6. What should the standard library actually ship, as opposed to what the
   protocol should admit?

## Current contracts and evidence

Selected or established, and therefore constraints:

- Consumers request capabilities, not one container. `[T]` is the selected
  indexed contract: read element type, finite exact count without traversal,
  zero-based positions, traversal in positional order with duplicates preserved,
  and constant-time positional reads. `Iterable<T>` is temporary notation for
  traversal only. `Indexable` is general keyed lookup and is explicitly not the
  positional bundle. See [indexed sequence](../docs/indexed-sequence-contract.md)
  and [capabilities](../docs/collection-capabilities.md).
- `mut [T]` adds element replacement and requires a provider that implements a
  setter; a `mut` grant does not manufacture one. Growth is a separate capability
  (`push_front`/`push_back`/`pop_front`/`pop_back` are selected names). See
  [end operations](../docs/sequence-end-operations.md).
- Ordinary sequences preserve supplied order and duplicates; ordered never means
  sorted or unique. Sets may traverse in insertion, sorted, or unspecified order.
  See [order and traversal](../docs/collection-order-and-traversal.md).
- Size knowledge, indexing, contiguity, repeatability, order, and production mode
  are independent and must not collapse into one flag. See
  [source contracts](../docs/collection-source-contracts.md).
- Storage roles are fixed array `[T; N]` (inline, header-free, layout equal to a
  homogeneous tuple), growable contiguous `List<T>`, and `Slice<T>` views.
  A list is explicitly not a linked list in the current proposal.
- `Sequence<T>` and `Stream<T>` are proposed in
  [INV-060](INV-060-sequence-execution-and-surface-models.md) as the cold and hot
  execution types; they are orthogonal to the storage family.
- Generic constraints, exact protocol spellings, conformance rules, and lifetime
  enforcement remain open. `List<T>` is the only approved builtin generic
  spelling; angle brackets elsewhere are temporary notation.

## Method and sources

**Eleven languages** were checked against official documentation on
**2026-11-01**, in four groups: C++20/23 ranges and containers, Rust's standard
collections and traits, Swift's protocol hierarchy; Kotlin, Java SE 25, C#/.NET,
and Scala 3; Python 3.14, JavaScript/TypeScript, Go 1.27, and Dart 3.13. A fourth
survey took a storage-family view of fixed arrays, dynamic arrays, views, linked
lists, deques, chunked sequences, hash tables, sorted trees, insertion-ordered
maps, bitsets, SoA, and text.

This is document review, not execution. No reference toolchain was run and no
benchmark was performed. Complexity and layout claims are as documented; no
foreign runtime was measured.

_Reference findings are recorded below; the analysis that follows them is the
note's own proposal._

## Reference findings

### C++20/23 — structural concepts, orthogonal satellites

C++ has no nominal collection hierarchy, only structural concepts plus prose
"named requirements". The ranges graph is a chain with orthogonal satellites:

```
range → input_range → forward_range → bidirectional_range → random_access_range → contiguous_range
  ├── sized_range      (orthogonal)
  ├── view             (orthogonal; not necessarily non-owning)
  ├── common_range     (orthogonal)
  └── borrowed_range   (orthogonal)
```

Two decisions worth copying: `sized_range` is a separate capability from
`random_access_range`, and `borrowed_range` plus `std::ranges::dangling` turns
some dangling-view returns into compile errors. Contiguity is a concept
(`contiguous_range` plus `ranges::data`), and C++ ties it to random access only
because its iterators need arithmetic.

The cautionary data is richer than the good data:

- `std::deque` is segmented: `O(1)` `operator[]`, no `data()`, no contiguity.
  This is the proof that positional indexing and a contiguous region are
  different capabilities.
- `vector<bool>` is bit-packed with proxy references, no `data()`, and is not a
  contiguous container — the canonical failed specialization.
- `flat_map` (sorted vector) and `map` (node-based) have the same interface and
  different layout; only complexity and invalidation tell them apart.
- `span` carries no lifetime relationship, so dangling views are the standard's
  best-known bug class.
- Every complexity claim is prose; a `SequenceContainer` promise is satisfied by
  both `vector` and `list`.
- `forward_list` has no `size()`, and that absence is the model: no runtime
  "unsupported operation".

C++26 adds `inplace_vector<T, N>`: inline storage, static capacity, dynamic size.
Swift 6.2 adds the same cell as `InlineArray<let count: Int, Element>`. LiteLang
currently has neither; the gap is recorded in INV-058.

### Rust — no collection abstraction, but the best mutation split

Rust has no `Collection` trait at all. The abstractions are `Iterator`,
`IntoIterator`, `AsRef<[T]>`, `Index`/`IndexMut`, and `Deref<Target = [T]>`.
That absence is a real cost: any generic container-shaped API reinvents its
bounds, and there are exactly three concrete contiguous types (`[T; N]`, `Vec<T>`,
`[T]` behind a pointer).

What is worth taking:

- **Three levels of mutation, cleanly separated.** `&[T]` reads, `&mut [T]`
  replaces elements but cannot resize, `Vec<T>` owns and grows. Growth is never a
  property of a view.
- **`IntoIterator` (source) is separate from `Iterator` (cursor).** This is the
  same split the lattice needs for repeatability.
- **`FromIterator` chooses the output container at the sink** (`collect::<B>()`),
  which is output-shape polymorphism without naming a container in the
  signature.
- **`size_hint() -> (usize, Option<usize>)`** is an honest size lattice: lower
  bound plus optional upper bound, explicitly not trusted.
- **`FusedIterator`** marks "after `None`, always `None`", because the base
  `Iterator` contract permits resuming. The marker is the precedent for making
  one-shot explicit rather than assumed.
- **`HashSet` exposes no `iter_mut`,** and `BTreeSet` exposes no mutable element
  access, so a stored key cannot be mutated through the container.

The cautionary data:

- `LinkedList`'s own documentation discourages it; indexing is
  `O(min(i, n−i))`, and every operation is cache-hostile.
- `VecDeque` is a ring buffer whose only contiguous story is `as_slices()` plus an
  `O(n)` `make_contiguous()`; a caller that needs contiguity must ask and pay.
- Hash/equality inconsistency is a documented "logic error… not undefined
  behavior", whose consequences may include "panics, incorrect results, aborts,
  memory leaks, and non-termination". LiteLang should make key invariance a
  typing rule instead.
- Complexity lives in one prose table with `*` for amortized and `~` for
  expected; nothing in the type carries it.

### Swift — the two-axis protocol graph

Swift is the closest existing model to capability-based consumers, because it has
two axes instead of one chain:

- traversal: `Sequence` → `Collection` → `BidirectionalCollection` →
  `RandomAccessCollection`;
- mutation: `MutableCollection` (replace elements) and
  `RangeReplaceableCollection` (grow/shrink), off to the side, independent of
  traversal depth.

`Sequence` may be single-pass; `Collection` is guaranteed multipass. That is the
one-shot versus repeatable split, in the type system, and it is exactly what the
lattice needs.

Swift also demonstrates the traps:

- `count` is `O(1)` only for `RandomAccessCollection` and is `O(n)` otherwise, so
  the same property name carries two costs. The lattice's answer — `Sized` means
  `O(1)`, and counting a traversal gets a different name — is a direct response.
- `ArraySlice`/`Substring` share the base's indices and storage, so `slice[0]`
  traps. The draft's proposal for zero-based view indices is the cheaper choice.
- Contiguity is deliberately outside the hierarchy and is discoverable at runtime
  through `withContiguousStorageIfAvailable -> R?` — a runtime test for a static
  property, and the anti-pattern to avoid.
- `Collection`'s `O(1)` subscript is "expected" with documented departures,
  which is prose again.
- `Set`/`Dictionary` iteration order is unspecified and randomized per process.

Swift 6.2's `Span` (non-escapable, lifetime-checked, no runtime overhead) is the
modern answer to C++'s dangling `span`, and the model for a view that cannot
outlive its owner.

### Python — the best decomposition of *what* the capabilities are

Python's `collections.abc` is the closest published match to this note's axes, and
it is orthogonal rather than chained:

```
Iterable ──▶ Iterator            (Iterator adds __next__; __iter__ comes free)
Collection = Sized + Iterable + Container
   ├─ Sequence ──▶ Reversible
   │     └─ MutableSequence
   ├─ Set ──▶ MutableSet
   └─ Mapping ──▶ MutableMapping
```

`Iterable`, `Sized`, and `Container` are independent, so "traversal only", "exact
size", and "membership" are three capabilities, not one. `Sequence` adds
positional access; `MutableSequence` strictly extends it. That is the lattice
shape this note proposes, arrived at independently.

Python also demonstrates the derivation rule and its price. `Sequence` provides
`__contains__`, `__iter__`, `__reversed__`, `index`, and `count` given only
`__getitem__` and `__len__`; `Mapping` derives `keys`, `items`, `values`, `get`,
and `__eq__` from three members. The documentation then states the trap exactly:
if `__getitem__` is `O(1)` the mixins are linear, "however, if the underlying
method is linear (as it would be with a linked list), the mixins will have
quadratic performance and will likely need to be overridden". That is the
"one name, two costs" problem, and the language's only remedy is prose.

Two more findings matter:

- **Contiguity is request/response at runtime.** The buffer protocol has
  `PyBUF_C_CONTIGUOUS` and friends, and an exporter that cannot satisfy a request
  "MUST raise `BufferError`". Python is the only surveyed language where a caller
  can demand contiguity and get a checked failure — and it is also the only one
  where the type system cannot state it at all.
- **The structural/nominal seam is at the worst layer.** "Complex interfaces do
  not support this last technique because an interface is more than just the
  presence of method names", so a duck-typed class with `__getitem__` and
  `__len__` is not a `Sequence` for `isinstance`. Capability recognition is
  nominal for the interfaces that matter.

`bool` is an `int` subtype, so `{1, True}` has one element and `True` finds key
`1` — the numeric-equality edge case INV-058 has to decide.

### JavaScript/TypeScript — one symbol buys the whole surface

One structural protocol, `[Symbol.iterator]`, powers `for…of`, spread,
destructuring, `yield*`, `Array.from`, and the lazy `Iterator.prototype` helpers.
That is the strongest evidence in the survey that a single traversal capability
should be the root of the lattice.

The failures are equally instructive:

- Everything is erased. TypeScript cannot recover element types at runtime, and
  protocol conformance "is not possible to know reflectively".
- `Object.freeze` is shallow and **throws** on a typed-array view
  ("Cannot freeze array buffer views with elements"), while `ReadonlyArray` is
  compile-time only and one-way assignable. JS has the strongest shallow runtime
  freeze and the weakest static read-only, and they do not compose.
- `slice` copies, `subarray` views, and both return the same type.
- Sparse arrays make `length` different from element count.
- `Set` and `Map` do carry one complexity promise: implementations must "on
  average, provide access times that are sublinear on the number of elements".
  That is a cheap, valuable sentence LiteLang can state once.

Insertion order is specified for `Set` and `Map`, and plain objects have a
different specified order (integer-like keys ascending) — a documented surprise
that supports choosing one order and stating it.

### Go — layout and flow, but no semantic capability

Go states contiguity in the type: a slice "is a descriptor for a contiguous
segment of an underlying array". That is the good part, and it is why `[]int` is
contiguous machine integers with no boxing.

The rest is a warning:

- There is no collection interface. `range` accepts a closed set of types, and
  `~[]E` / `~map[K]V` are *shape* constraints that cannot express "traversal
  only" or "`O(1)` index". Algorithms duplicate per shape; `slices.Sort` cannot
  sort a `container/list`.
- Slicing shares storage, `append` may reallocate and silently detach every
  alias, and none of it is visible in a type.
- `comparable` keys are checked at compile time for concrete types and **panic at
  runtime** for interface keys.
- Map order is randomized, which is a correctness guarantee about
  nondeterminism rather than a cost guarantee.

`iter.Seq`'s push model (`func(yield func(V) bool)`) and `iter.Pull` are the flow
half LiteLang needs; INV-060 already recommends the emit-callback shape for
generators on this evidence.

### Dart — one abstract member, and a read-only lie

`Iterable` "implements every member other than the `iterator` getter", deriving
roughly thirty operations from one member. That is the derivation rule at its
strongest, and it matches Python's lesson.

The cautionary case is `UnmodifiableListView`: it is still statically a `List`,
so every mutator remains callable and fails at runtime. Copy and view are
distinguished only by constructor name (`sublist` versus `sublistView`/`view`),
and growable-versus-fixed is a constructor flag rather than a type property.
Dart also pays for unsound-variance-looking ergonomics with per-write runtime
checks (`List<int>` is a `List<num>`; adding a double throws), and its
`Iterable.length` may be `O(n)` while `List.length` is `O(1)` — the same
"one name, two costs" seam.

The good parts: `sync*` iterables are cold and re-iterable while `async*` streams
are single-subscription, documented as contracts; typed-data exposes
`buffer`/`offsetInBytes`/`lengthInBytes`; and the `Map` documentation lists
unordered, insertion-ordered, and sorted implementations as one family with
different order promises.

### Kotlin, Java, C#/.NET, and Scala — four answers to the same three problems

These four are the closest prior art, because all four are nominal and all four
have lived with their choices for years. They disagree on three questions.

**Cost.** Three systems put cost in the type, at different granularity. Scala
splits by access pattern — `IndexedSeq` versus `LinearSeq`, documented as "a
linear sequence has efficient `head` and `tail` … an indexed sequence has
efficient `apply`, `length`, and (if mutable) `update`" — and publishes a
per-type cost table. It is the only surveyed design that also names the *slow*
side, so a bare `Seq` is not silently assumed `O(1)`. Swift encodes the same idea
as `RandomAccessCollection` (constant-time index offsets and distances), and C++
as `random_access_range`; both name only the fast side. Java has the right idea
but not the mechanism: `RandomAccess` is a marker "used by `List` implementations
to indicate that they support fast (generally constant time) random access", and
generic algorithms must test it with `instanceof` because it is invisible in
signatures.
Kotlin and C# simply document the cost and hope. Java's own `List.get`
documentation admits the result: it "may execute in time proportional to the index
value for some implementations (the `LinkedList` class, for example)".

**Mutability.** Four different designs, and only one is a guarantee:

| Design | Prevents mutation through the read-only type? | Failure mode |
|---|---|---|
| Kotlin `MutableList : List` | Yes, until cast | `listOf(1,2) as MutableList` reaches a JVM wrapper and throws |
| Java optional operations | No | `UnsupportedOperationException` at runtime |
| C# `IReadOnlyList` plus `IsReadOnly` | No | Two mechanisms, one of them a runtime boolean on the mutating interface |
| Scala `mutable.` package split | **Yes** for `immutable._`, by construction | none; immutability is "for everyone" |

C#'s `IsReadOnly` is the clearest anti-pattern in the survey: a mutable interface
carries a boolean saying whether it is mutable, and the documentation admits the
flag's most famous case is an array cast to `ICollection<T>` where it returns
`true` while elements remain writable.

**Execution mode.** Scala names four, the others at most two:

| Scala type | One-shot | Lazy | Memoized |
|---|---|---|---|
| `Iterator` | yes | yes | no |
| `Iterable` (strict) | no | no | n/a |
| `LazyList` | no | yes | **yes** |
| `View` | no | yes | no, recomputed |

Memoization is the property everyone else forgets, and it changes observable
behavior: a `LazyList` computes each element at most once, while a `View` may
recompute it on every traversal, which is "very confusing if the delayed
operations have side effects". Java splits `Stream` (one-shot) from `Collection`
(repeatable); Kotlin splits `Sequence` from `Iterable` but admits its sequences
"throw an exception on an attempt to iterate them the second time"; C# has only
the `IEnumerable<T>` convention and ships a static analyzer (CA1851) to warn about
multiple enumeration.

**Four mechanisms worth taking:**

1. **Cost-bearing subtypes** (Scala `IndexedSeq`/`LinearSeq`) plus a published
   cost table. This is the strongest evidence for the lattice's rule that
   `Indexed` means `O(1)` and weaker access gets a different name.
2. **Omission over lying.** C#'s `LinkedList<T>` does not implement `IList<T>`;
   it exposes `First`/`Last`/`Next` instead. That is the exact model for
   "advertise only the capabilities you can honour at the promised cost".
3. **Result-shape construction as a separate explicit parameter** (Scala's
   `Factory`/`BuildFrom`). It is the only mechanism surveyed that lets `map`
   return the caller's own container kind without a per-type override, and
   Scala's retreat from implicit `CanBuildFrom` says it must be explicit and
   visible in signatures.
4. **The short name is the safe one.** `scala.Seq` aliases the immutable branch,
   so mutation costs the extra word `mutable.`. LiteLang's read-only default and
   `mut` grant already have this property; the note records it as a principle to
   keep rather than an accident.

Two more decisions are precedents rather than warnings:

- **Scala 2.13 made views a different type** that does not extend the collection
  type, precisely because conflating them caused bugs. That validates treating
  `Slice<T>` as its own kind.
- **Kotlin's `ArrayDeque` advertises both deque and indexed-list capabilities on
  one storage type**, and Scala's `ArrayDeque` is likewise "a resizable circular
  buffer" with amortized constant-time random access. One implementation, several
  capabilities, is exactly the lattice's model.

**The anti-patterns, collected:**

- Optional operations (`UnsupportedOperationException`, `NotSupportedException`):
  every instance is a capability claimed and not held.
- A runtime mutability boolean inside a mutating interface (`IsReadOnly`).
- Two parallel hierarchies (`IList<T>` / `IReadOnlyList<T>`) instead of one
  hierarchy with a mutability parameter.
- Retrofitted ordering: Java needed `SequencedCollection` 25 years later, and its
  `reversed()` view has implementation-dependent visibility.
- A shape promise without a discipline promise: `Queue` orders "typically, but
  not necessarily" FIFO, and `PriorityQueue` breaks ties arbitrarily.
- Read-only views that reflect the backing collection (Java's
  `unmodifiableList`, Kotlin's `asReversed`, C#'s `ReadOnlyCollection`) presented
  as read-only values.

### Lessons carried into the lattice

1. Model capabilities as a **product of axes**, not one chain: Swift needed two
   axes and still bolted mutation on.
2. **Size is its own capability**; `sized_range` is the shape, and folding a
   cheap count into indexing (Swift) or making it a hint (Rust) are the two ways
   to get it wrong.
3. **Contiguity and indexing are separate**; `deque` proves it. `Contiguous`
   refines `Indexed` only because a region has a stride and a length, not because
   every indexed provider is contiguous.
4. **Mutation splits three ways**, and growth needs ownership.
5. **Views must not escape**; `borrowed_range` and Swift's `Span` are the
   precedents.
6. **Optionality belongs in the type**; `forward_list`'s missing `size()` is
   better than `withContiguousStorageIfAvailable`'s runtime `nil`.
7. **Static extent is worth keeping in the type** — and the missing cell is
   inline storage with runtime length (`inplace_vector`, `InlineArray`).
8. **Key immutability should be structural**, as in `pair<const K, V>` and
   `HashSet`'s missing `iter_mut`.
9. **Capability recognition must be static and total.** Python recognizes only
   one-method interfaces structurally, Go's `~[]E` sees shape and not meaning, and
   Dart's read-only wrapper is still a `List` that throws at runtime. Partial
   recognition is worse than none, because it looks like a guarantee.
10. **A derived operation must carry the cost of its primitives.** Python's mixins
    go quadratic on a linked shape, Dart's `Iterable.length` may be `O(n)`, and
    Swift's `count` is cheap only on `RandomAccessCollection`. The fix is either a
    cheaper primitive or a different name.
11. **One root protocol is enough to attach the whole surface.** A single
    traversal member powers JavaScript's `for…of`, spread, `Array.from`, and the
    lazy iterator helpers, and Dart derives about thirty operations from
    `iterator`. The lattice should resist adding primitives that derivation can
    supply.
12. **Contiguity belongs in the type, not in a runtime question.** Python's buffer
    flags and Swift's `withContiguousStorageIfAvailable` are honest but
    late-checked; a capability is checked once, at compile time.
13. **Cost-uniformity is the first test, not the last.** Every surveyed failure
    with a long life is one name with two costs: Java's `List.get`, Swift's
    `count`, Dart's `Iterable.length`, Python's mixins on a linked shape. Split
    the name or index the cost.
14. **Never change element addressability in a specialization.** `vector<bool>`
    is the proof: a space optimization that changes the element type breaks
    generic code, so a packed `Bool` store must be a different family, not a
    specialization of the generic one.
15. **Merge representation, split surface.** A set is a map with no value, and
    Rust's `HashSet` is literally `HashMap<T, ()>`; the representation merges
    while the operations stay separate.
16. **Read-only view and immutable container are different laws.** A view promises
    "I will not mutate through this handle"; an immutable container promises
    "nobody can ever mutate this". Four languages conflate them and then
    document the leak.

### The surveyed hierarchies side by side

| System | Conformance | Axes it encodes | Read / replace / grow | Size capability | Contiguity | One-shot marker |
|---|---|---|---|---|---|---|
| C++ | structural concepts | range chain plus sized/view/borrowed satellites | `const&` / mutable view / concrete only | `sized_range`, opt-out `disable_sized_range` | `contiguous_range` | `input_range` |
| Rust | nominal traits | `Iterator` plus supertraits | `&[T]` / `&mut [T]` / `Vec<T>` | `ExactSizeIterator` (`len`) | `[T]` / `AsRef<[T]>` | `FusedIterator` marker; `IntoIterator` vs `Iterator` |
| Swift | nominal protocols | two axes: traversal depth, mutation depth | `Collection` / `MutableCollection` / `RangeReplaceableCollection` | only `RandomAccessCollection` | outside the hierarchy; runtime query | `Sequence` vs `Collection` |
| Python | nominal ABCs plus registration | orthogonal ABCs | `Sequence` / `MutableSequence` | `Sized` | none; buffer protocol only | iterator object vs container |
| JavaScript/TypeScript | structural symbol | one protocol | none / `freeze` / none | `length` or `size` | TypedArray only | none |
| Go | shape constraints only | none | none / mutable slice | array `N`, `len`/`cap` | `[]T` is the type | documentation only |
| Dart | nominal interfaces | `Iterable` plus `List` | unmodifiable wrapper / fixed-length flag | `length` | TypedData only | `sync*` vs `async*` |
| Kotlin | nominal interfaces | `Iterable`/`Collection`/`List`/`Set`/`Map`, plus separate `Sequence` | `List` / `MutableList` (same object) | `Collection.size` | not modelled | `Sequence`, documented only |
| Java | nominal interfaces | `Collection`/`List`/`Set`/`Map`, `Sequenced*`, `Stream` | none / optional operations / — | `Collection.size()` | not modelled | `Stream` versus `Collection` |
| C#/.NET | nominal interfaces | `IEnumerable`/`ICollection`/`IList`/`ISet` plus `IReadOnly*` | `IReadOnlyList` / `IList` / — | `Count` | `Span`/`Memory` as a separate family | none; analyzer CA1851 |
| Scala | nominal plus type classes | `Iterable`/`Seq`/`Set`/`Map`, plus `Iterator`/`LazyList`/`View` | immutable package / `mutable.` package | `size` (`O(n)` on `LinearSeq`) | `ArraySeq`/`Array` | `Iterator` / `Iterable` / `LazyList` |

The pattern is consistent: **every system has one traversal root, and size is
handled everywhere differently.** It is an orthogonal capability in C++
(`sized_range`), Rust (`ExactSizeIterator`), and Python (`Sized`); a member of the
container in Java, Kotlin, and C#; folded into the traversal depth in Swift
(`RandomAccessCollection`); and attached to the traversal type in Dart, where
`Iterable.length` may be `O(n)`. Growth is never on a read-only type: it is either
folded into the mutable container (Kotlin, Java, C#) or a separate mutable
refinement (Swift's `RangeReplaceableCollection`). The one-shot/repeatable split
is typed in C++, Rust, Swift, Java, and Scala but only documented in Kotlin, Go,
and Dart, and only Scala names the memoized lazy variant at all. Those last three
properties are what the draft is missing most.

## Axes: what genuinely varies

Each axis below can be chosen independently of the others unless a later section
says otherwise. "Type-visible" means it can appear in a signature; "law" means it
belongs to the provider's documented contract without being a type parameter.

| Axis | Values | Where it lives |
|---|---|---|
| Element type | any `E` | type parameter |
| Count knowledge | static `N`, exact runtime, unknown, possibly unbounded | type / capability / law |
| Positional access | none, traversal only, `O(1)`, `O(log n)`, `O(n)` | capability (cost in the name) |
| Contiguity | none, logical runs, physically contiguous | refinement / concrete family |
| Element address stability | unstable, stable under growth, stable until erased | law |
| Order | positional, insertion, comparator-sorted, unspecified | capability / law |
| Uniqueness | multiset, set under equality | capability |
| Keyed lookup | none, `K -> V` with a cost class | capability |
| Mutation | read, element replace, structural change, whole replace | grant + provider capability |
| Lifetime | owned, borrowed | type |
| Repeatability | one-shot cursor, repeatable source | capability |
| Production | cold, hot, warm | type (`Sequence`/`Stream`) |
| Delivery | synchronous, asynchronous | modifier |
| Failure | infallible, typed fault | type (`T ! E`) |

Two corrections to the usual list are needed for LiteLang:

- **Repeatability is about the source, not the traversal.** A repeatable list
  still produces one-shot cursors. Rust's split of `IntoIterator` (source) from
  `Iterator` (cursor) is the model; a single "Iterable" concept that does not say
  which one it is will blur exactly the distinction this note needs.
- **Permission and provider capability are different facts.** A caller's `mut`
  grant says what the caller may do; a provider's setter says what exists. The
  draft already treats them separately, which is why Kotlin's parallel
  `MutableList` hierarchy is not needed here.

## What is forced, not chosen

Some combinations are not independent because representation implies them. These
are the cases where adding a separate concept would be redundant:

- **Physically contiguous and bounded ⇒ `O(1)` positional read, exact count,
  positional-order traversal.** A contiguous region already has a stride and a
  length. `Contiguous<E>` therefore refines `Indexed<E>` rather than sitting
  beside it.
- **`Indexed<E>` + exact count ⇒ traversal.** Positions zero through count are
  enumerable, so traversal is derivable; it does not need to be a separate
  requirement of `[T]`.
- **Node-based ⇒ no `O(1)` positional read, but stable element addresses and
  `O(1)` splice at a known node.** This is the trade a linked list makes, and it
  cannot be hidden behind the same contract as a contiguous array.
- **Hashed ⇒ equality plus hash, no order guarantee.** Iteration order may be
  insertion order or unspecified, but it is never "the sorted order" for free.
- **Comparator-sorted ⇒ no stable positions under insertion.** A sorted set can
  be traversed in order, but positions shift when elements are added.
- **Bitset ⇒ no addressable element slot.** A bit-indexed store can answer
  `get(i)` and `contains`, and cannot honestly provide a `Contiguous<Bool>` view.
- **Struct-of-arrays ⇒ no element identity.** A "column" is not an element
  address; code that needs one field per element must materialize or project.
- **A borrow cannot be an owner.** `Slice<T>` and `List<T>` cannot be one type
  without either a lifetime parameter or a hidden copy.

Conversely, these are *not* forced and therefore are separate axes: count
knowledge versus indexing (`O(1)` index without a cheap count is possible but
unusual), order versus uniqueness (an insertion-ordered set is both), mutation
versus ownership, and production mode versus every storage property.

## Split or merge: a decision procedure

Seven tests, applied to a candidate pair of concepts. Four force a split
(M1, M2, M4, M5); three keep one concept and express the difference as a
refinement or a derivation (M3, M6, M7).

| Test | Question | Failure example |
|---|---|---|
| M1 capability presence | Can a conforming provider lack the operation? | Java's `Collection.add` optional operation and `UnsupportedOperationException` |
| M2 cost law | Do honest providers differ asymptotically? | `List.get` on a linked list is `O(n)` |
| M3 derivability | Can the operation be defined from the primitives without losing a guarantee? | Python's `Sequence` mixins derive `count`/`index`/`__contains__` |
| M4 ownership | Does one side borrow and the other own? | `Slice<T>` versus `List<T>` |
| M5 permission versus provider | Is the difference a caller grant or a provider capability? | `mut` does not create a setter |
| M6 representation | Does the guarantee depend on layout? | `contiguous_range` versus `range` |
| M7 uniformity | Is the behavior identical and only the cost different? | Swift `Sequence` versus `Collection` |

Applied to the user's examples:

- **Set versus array/list.** Not a storage split at all. A set is a different
  *element contract* (uniqueness and membership under equality), and it can be
  backed by a hash table, a tree, or insertion-ordered storage. Split at the
  contract (`SetLike`), keep storage concrete.
- **Array versus list (contiguous owner versus node owner).** Merge at the
  contract level, split at the type level. Both can satisfy `Iterable + Sized`;
  only a contiguous owner can satisfy `[T]` and `Contiguous`.
- **Fixed versus dynamic.** Same positional contract; differs in static extent
  and in growth. `[T; N]` keeps `N` in the type, `List<T>` keeps a runtime count,
  and both satisfy `[T]`. Merge the contract, split the type.
- **Array versus slice.** Split: ownership and lifetime differ (M4).
- **List versus deque.** Both are growable and indexed; a deque additionally
  guarantees `O(1)` at both ends. If the growable contract does not promise end
  cost, these can share a contract and differ in a `Deque` refinement.
- **Indexed versus keyed lookup.** Split, as the draft already selected: a hash
  map is not a positional sequence, and `Indexable` does not imply positions.

### Decisions at a glance

| Candidate pair | Decision | Deciding test |
|---|---|---|
| Array contract / List contract | merge contract, split type | M7 (same behavior, different storage) |
| Fixed extent / dynamic extent | merge contract, split type (`N` vs count) | M7 |
| Array owner / Slice view | split | M4 (ownership) |
| Sequence / Set | split | M1 (uniqueness is an element contract) |
| Set / Map | split, share an entry-iteration view | M1 (keyed lookup is additional) |
| Read-only / immutable | split into three facts: grant, provider capability, deep freeze | M5 |
| Indexed / keyed lookup | split | M2 and behavior |
| Traversal / indexed | refine (`[T]` implies traversal) | M3 (derivable) |
| Sized / indexed | refine | M3 |
| Contiguous / indexed | refine | M6 (layout promise) |
| Repeatable / iterable | refine (a source property) | M1 (providers differ) |
| Cursor / iterable source | split | M1 and Rust precedent |
| Insertion order / sorted order | split | M2 (different structures, different costs) |
| Uniqueness / order | independent axes | no entailment either way |
| Text / `[Char]` | split | M2 and unit ambiguity |

## Proposed lattice

A proposal for discussion, not a selected contract. Primitives are written first;
everything after is derived or a named bundle.

**Primitives (smallest honest set):**

| Concept | Operation | Law |
|---|---|---|
| `Cursor<E>` | `next() -> Option<E>` | one-shot state; normal exhaustion distinct from failure |
| `Iterable<E>` | `iterate() -> Cursor<E>` | each call yields a fresh cursor when the source is repeatable |
| `Sized` | `count() -> Int` | exact, cheap, no traversal, no consumption |
| `Indexed<E>` | `at(Int) -> E ! Bounds` | zero-based, `O(1)` |
| `Keyed<K, V>` | `get(K) -> V ! Missing` | key type and cost class declared by the provider |
| `Membership<E>` | `contains(E) -> Bool` | under a declared equality; claims a sublinear cost, unlike the generic traversal fallback |

**Derived or refinement concepts:**

| Concept | Definition | Why not primitive |
|---|---|---|
| `Repeatable<E>` | `Iterable<E>` whose cursors are independent | a property of the source, checked where a second pass is needed |
| `Bounded<E>` | bundle of `Iterable + Sized` | a linked list is exactly this; it adds no operation |
| `Reversed<E>` | traversal in reverse | derivable from `Indexed + Sized`, native for a deque |
| `WritableIndexed<E>` | `set_at(Int, E)` under `mut` | separate provider capability |
| `Contiguous<E>` | bounded physically contiguous region; `view(start, len)` | refines `Indexed` and adds the layout promise |
| `Growable<E>` | `push_front`/`push_back`/`pop_front`/`pop_back` | structural change, separate from element replacement |
| `Sorted<E>` | total order plus traversal in that order | carries the comparator requirement |
| `StableNode<E>` | element addresses survive insert/erase; a node handle addresses an element | node storage only; not derivable |
| `Splice<E>` | `O(1)` relink of a run between containers | refines `StableNode` |
| `Packed` | logical `Bool` read/write without an addressable element | bitset only; never a `[Bool]` specialization |
| `Columns<S>` | per-field indexed access, no whole-element identity | SoA only |
| `Text<Unit>` | sequence of a declared unit | never a bundle of `[Char]` |

**Named bundles (ergonomics, not primitives):**

| Bundle | Expands to |
|---|---|
| `[T]` | `Indexed<T> + Sized` (traversal derived) |
| `Iterable<T>` | `Iterable<T>` |
| `Rev[T]` (if wanted) | `[T] + Reversed` |
| `mut [T]` | `[T]` plus a writable provider and the caller's mut grant |

`[T]` is therefore a *name for a bundle*, not a primitive. That is the merge
answer: merge at the name a beginner writes, split at the contract the compiler
checks. The draft's choice that `[T]` includes constant-time indexing and an
exact count is preserved; nothing in this lattice weakens it.

The storage survey independently proposed the same shape with cost parameters
rather than names (`Index<T, O1>`, `Contig<T>`, `MultiPass<T>`, `StableNode<T>`,
`Splice<T>`, `Ring<T>`, `Packed`, `Columns<S>`, `Text<Unit>`). The two designs
agree on the concepts and differ only on how cost is spelled; see
[cost in the name, or cost as a parameter](#cost-in-the-name-or-cost-as-a-parameter).

**Worked mappings:**

| Family | Satisfies |
|---|---|
| `[T; N]` fixed array | `Indexed + Sized + Contiguous + WritableIndexed`; `N` static |
| `List<T>` growable | `Indexed + Sized + Contiguous + WritableIndexed + Growable` |
| `Slice<T>` view | `Indexed + Sized + Contiguous`; borrowed |
| Linked list | `Iterable + Sized + Growable`; not `[T]` |
| Deque | `Indexed + Sized + Contiguous? (chunked) + Growable + Reversed` |
| Hash set | `Iterable + Sized + Membership`; order unspecified or insertion |
| Sorted set | `Iterable + Sized + Membership + Sorted` |
| Hash map | `Keyed + Iterable<Entry> + Sized` |
| Sorted map | `Keyed + Iterable<Entry> + Sized + Sorted` |
| Bitset | `Sized + Membership + Indexed<Bool>` if it exposes logical reads; no contiguity |
| SoA columns | `Indexed` per column; no element identity |
| Text | its own family, not `[Char]` (see INV-058) |

## Derivation, and the trap of one name with two costs

A small primitive set is only useful if the rest of the operations come from it.
The reference models agree: Rust derives dozens of methods from `next`, Python's
`Sequence` mixin derives `count`, `index`, and membership from `__getitem__` plus
`__len__`, and Swift derives `IndexingIterator` from `Collection`.

Derivable from this lattice:

| Derived operation | From | Cost |
|---|---|---|
| traversal | `Indexed + Sized` | `O(n)` |
| `first`, `last` | `Indexed + Sized` | `O(1)` |
| `reverse` | `Indexed + Sized` | `O(n)` unless the provider has `Reversed` |
| `contains` | `Iterable + equality` | `O(n)` unless the provider has `Membership` |
| `map`, `filter`, `take` | `Iterable` | lazy adapters |
| `fold`, `sum`, `any`, `all` | `Iterable` | one pass |
| `extend`, `clear` | `Growable` | one push per element |

The trap appears as soon as a derived operation and a primitive share a name with
different costs. Counting is the canonical case: a `Sized` count is `O(1)`, while
counting a traversal is `O(n)` and may consume the source. Java's `Stream.count()`
is a terminal that traverses, and it surprises people precisely because the same
word means both things. The draft's `[T]` bundle already gives `count` the cheap
meaning, so the traversal-counting operation needs a different name
(`tally`, `count_of`, or simply `fold`), and the difference must be visible at the
call site.

The second half of the rule is lawful customization, already recommended in the
[algorithm proposal](../docs/collection-algorithms.md): a provider may replace a
derived operation with a better implementation only if the observable behavior
matches. `contains` on a hash set is the standard example — same result, `O(1)`
instead of `O(n)`, provided equality agrees.

## Conformance: who may claim a capability

The reference models split into two camps:

- **Nominal, explicit implementation** — Rust traits, Swift protocols, Java
  interfaces, Kotlin interfaces. A type must declare conformance.
- **Structural** — Python protocols and `__subclasshook__`, Go's implicitly
  satisfied interfaces, TypeScript's structural types. A type conforms by shape.

The draft's direction is explicit implementation with static dispatch preferred,
and a runtime-erased interface value only when chosen. That points at nominal
conformance. The hard part is *retroactive* conformance: can a program make a
third-party type satisfy `Iterable` without editing it? Swift extensions allow it,
Rust's orphan rule forbids implementing a foreign trait for a foreign type, and
Go/TypeScript allow it freely.

Recommendation: nominal conformance, no blanket structural matching, and a local
adapter type for foreign types, because that is the only option that keeps
"I implemented this" auditable in source. This is also consistent with the draft's
rejection of runtime inspection for operation sugar.

## What the lattice deliberately does not model

Four properties are real and are not capabilities here:

- **Allocator.** A growable family allocates; which allocator is a parameter of
  the value or the operation, not of the capability.
- **Capacity.** Spare storage is not a sequence capability. It is an
  implementation detail with a documented `reserve`-style operation at most.
- **Thread-safety.** Whether a collection may be shared across threads is a
  separate contract; conflating it with the storage family is how "concurrent
  collections" become a parallel hierarchy.
- **Asynchronous delivery.** It modifies the production mode in INV-060; it does
  not change the storage family.

Keeping these out is what prevents the lattice from growing into a hierarchy with
a type per combination.

## How an operation states its requirement

Three mechanisms exist and they are not interchangeable:

1. **Named bundle in the signature** (`fn (xs: [T])`). Readable, complete, and
   already selected as the direction; the cost is that a reader cannot weaken it
   without naming the weaker contract.
2. **Explicit capability clause** (`where xs: Indexed(<cost>)`). More precise and
   more machinery; the generic/constraint grammar is deferred.
3. **Inference from the body**, for omitted parameter annotations only. Existing
   direction: the inferred contract is real and visible to callers, but never
   silently added to an explicit signature.

### Cost in the name, or cost as a parameter

There are two ways to keep cost honest, and the storage survey proposed the
second:

- **Cost in the name** — `Indexed<E>` means `O(1)`; a weaker access gets its own
  name such as `LogIndexed<E>` or `Sequential<E>`. No generic machinery is
  needed, and a signature is readable today.
- **Cost as a parameter** — `Index<T, O1>` / `Index<T, Olog>` / `Index<T, On>`,
  as in the survey's lattice sketch. More uniform, and a generic algorithm can
  quantify over the cost class, but it needs value-level generic parameters or
  associated constants that the draft has not designed.

Recommendation: use named refinements for now, and keep the parameterized form as
the target if the generic review lands const-generic parameters. The two are not
incompatible: `Indexed<E>` can be defined as `Index<E, O1>` later, with the name
kept as a bundle. Scala is evidence that the named approach works in practice —
`IndexedSeq` and `LinearSeq` are names, not parameters, and the library still
publishes a per-type cost table.

The one rule that matters under either spelling is cost-uniformity: an operation
name must not hide two different asymptotic costs, which is exactly what Java's
`List.get` and Swift's `count` do.

## Cases

Unselected exploration syntax:

```text
/* The weak contract: any element source, including a linked list or a stream. */
render := fn (items: Iterable<Icon>) {
    loop items as icon { draw(icon) }
}

/* The strong contract: indexed and sized; a linked list is rejected here. */
pick := fn (items: [Icon]): Icon! {
    items[3]
}

/* Contiguity is asked for only where it is genuinely needed. */
copy_bytes := fn (src: Contiguous<Byte>, mut dst: Contiguous<Byte>) { ... }
```

The first two definitions differ only in the annotation, and the third uses a
capability the first two do not request. A set can satisfy the first and neither
of the others; a `Slice<Byte>` can satisfy all three; a `LinkedList` can satisfy
only the first and would need an explicit materialization to satisfy the second.

## Verification and limits

Document review on **2026-11-01**: eleven languages in four survey groups plus a
twelve-family storage survey. No toolchain was executed and no benchmark was run.
The reference material is in the companion sections and in
[references](../docs/references.md). The lattice, the seven tests, and the
primitive list are this note's proposal, not a language decision, and the cost
classes are qualitative. Versions checked: C++ working draft (post-C++23), Rust
1.99.1, Swift 6.x, Kotlin 2.4.x, Java SE 25, C#/.NET 10, Scala 3.10, Python
3.14, TypeScript 7.0.2/ES2026, Go 1.27, Dart 3.13.7.

## Findings and remaining questions

1. The draft's existing concepts already form a lattice; what was missing is a
   stated primitive set and a rule for when to add a node. The seven tests give
   that rule.
2. The largest simplification available is *not* a new type: it is that traversal
   is derivable from `Indexed + Sized`, so `[T]` needs one fewer required
   operation than the draft lists.
3. The largest risk is merging storage into contracts. A node-based list should
   be admitted by the protocol and probably not shipped by the standard library;
   a consumer that demands `[T]` must be rejected, not quietly given a
   materialized copy.
4. Cost classes need a spelling before public signatures are frozen. A named
   refinement is the cheapest option; a cost parameter is the more uniform one
   and can be introduced later without renaming the bundles.
5. The reference evidence converges on the same four moves: cost-bearing subtypes
   (Scala `IndexedSeq`/`LinearSeq`), omission over lying (C#'s `LinkedList` not
   implementing `IList`), static capability recognition (against Python's
   method-name sniffing and Dart's throwing wrappers), and views as distinct
   types (Scala 2.13).
6. The three storage roles should stay concrete types. What is missing is a
   fourth cell, inline storage with runtime length, which C++26 and Swift 6.2
   both added; INV-058 records it.

Open: Q1–Q6 in the handoff.

## Decision references

No decision has been made. The note records the user's 2026-11-01 direction that
collection sources and operations must be generalized, abstracted, merged, and
split explicitly. Explicit consent is required for each chosen rule under the
[explicit-consent rule](README.md#explicit-consent-for-language-changes).

## Handoff

Resume by confirming the primitive set and the seven tests. Then decide:

- Q1: is `[T]` formally `Indexed + Sized` with derived traversal, or does it keep
  listing traversal as a required operation?
- Q2: is `Contiguous<E>` a refinement of `Indexed<E>` or an independent
  capability that a chunked source can also satisfy logically?
- Q3: does `Iterable<E>` mean a source (repeatability separate) or a traversal,
  and is the cursor type user-visible?
- Q4: are cost classes named refinements or a generic parameter?
- Q5: which families does the standard library ship (INV-058 proposes the list)?
- Q6: how is a user type's conformance to a capability declared and checked
  (INV-057's remaining half, overlapping INV-030's receiver rule)?

