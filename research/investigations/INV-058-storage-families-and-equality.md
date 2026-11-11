# INV-058 — Storage families, equality, hashing, and ordering

Status: recorded (reference survey and structure proposal; no contract selected)
Contributor: project contributor (agent-assisted)
Last updated: 2026-11-01
Catalog brief: [INV-058](TOPICS.md#inv-058)
Covered subtopics: whole topic; hashing, equality, ordering, and storage choices.
Subtopic brief: none

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

The capability question is answered in [INV-057](INV-057-capability-lattice.md):
one primitive per independent property, named bundles for ergonomics, concrete
families at the bottom. This note asks the complementary question: which concrete
storage families exist, what can each honestly promise, and what do associative
structures require from element types before they can exist at all.

1. Which storage families should the language and its standard library ship?
2. What equality, hashing, and ordering contracts do sets and maps require, and
   what happens when a key is mutated or a comparator is inconsistent?
3. How should iteration order be chosen for hash-based structures, given the
   project's reproducibility goals?
4. Is text a sequence family, and if so of what?
5. Which families are deliberately *not* shipped but must remain admissible
   through the protocol?

## Current contracts and evidence

- Storage roles are fixed array, growable contiguous `List<T>`, and `Slice<T>`
  views. The draft states that a list "is not a linked list in this proposal".
- Sets may traverse in insertion order, sorted order, or unspecified order; the
  order labels are explanatory, not keywords. See
  [order and traversal](../../docs/collection-order-and-traversal.md).
- Set matching is undecided and currently treated as whole-value equality plus
  Boolean guards; unordered extraction by constraints is separately researched.
  See [set patterns](../../docs/set-patterns.md).
- `contains` may use a provider's membership operation when available, with a
  traversal fallback; equality and hashing disagreement "cannot be repaired by
  dispatch alone". See [collection algorithms](../../docs/collection-algorithms.md).
- Text is currently exposed only through temporary code-point helpers
  (`textLength`, `textAt`, `textSlice`); general String indexing, the text unit,
  and native representation remain open. See [strings](../../docs/strings.md).
- Ordinary sequence copies are the FVP default; key storage would copy under the
  same rules.

## Method and sources

Storage families, their documented guarantees, and standard-library
implementations were surveyed on **2026-11-01** from primary documentation for
C++, Rust, Java, C#/.NET, Kotlin, Scala, Python, JavaScript/TypeScript, Go, Dart,
Swift, and Odin. No toolchain was executed and no benchmark was run.

## Reference inventory

Each family is described by what it can honestly promise. The citations are the
strongest official statement found for the family, not an exhaustive list.

### Fixed contiguous array

Inline storage, extent known at construction or compile time, no reallocation.
C++ `std::array<T, N>`, Rust `[T; N]`, Go `[N]T`, and Swift 6.2
`InlineArray<let count, T>` all put the count in the type. The guarantee is
`O(1)` indexed access, a contiguous region, and no allocation; the cost is stack
pressure for large extents and no growth. C++26 adds the adjacent cell —
`inplace_vector<T, N>`: inline storage, static *capacity*, dynamic *size*.

### Dynamic contiguous array

Amortized `O(1)` append, `O(n)` insert or remove in the middle, and reallocation
that invalidates every pointer, reference, and iterator into the buffer. C++
`std::vector`, Rust `Vec<T>`, C# `List<T>`, Java `ArrayList`, Go's slice plus
`append`. Go is the sharp case because the invalidation is implicit: `append`
"may reallocate and invalidate every alias", and the type does not say so.

### Borrowed contiguous view

`std::span`, `&[T]`, `Span`, Go slices, `memoryview`, `TypedArray.subarray`.
No copy and `O(1)` construction. The lifetime story varies from none (C++
`span` can dangle) to a borrow check (`&[T]`) to a non-escapable type (Swift
`Span`). Go's slice is a view that aliases by design, so "view" there also means
"mutation through one is visible through the other".

### Node-based linked list

`O(1)` splice at a known node and stable element addresses; `O(n)` indexing,
pointer chasing, and one allocation per node. C++ `std::list`, Java
`LinkedList`, Dart `LinkedList`, Rust `LinkedList` — whose own documentation
discourages its use. Dart documents the split honestly: "constant time adding and
removing at either end… does not allow constant time lookup by index".

### Deque and ring buffer

`O(1)` at both ends, `O(n)` in the middle, and usually no single contiguous
region. C++ `std::deque` is segmented: `O(1)` `operator[]`, no `data()`. Rust
`VecDeque` is a ring whose contiguity is exposed only as `as_slices()` plus an
`O(n)` `make_contiguous()`. Python's `deque` documents "approximately the same
O(1) performance in either direction" and indexing that "slows to O(n) in the
middle".

### Chunked, rope, and encoded sequences

Cheap concatenation and middle insertion, `O(log n)` or `O(n/chunk)` indexing, no
contiguous view. No standard rope exists in C++, Rust, or Java; Swift's `String`
is the closest standard example, a `BidirectionalCollection` of grapheme clusters
over UTF-8 storage with separate `utf8` and `unicodeScalars` views. The lesson is
that an encoded sequence is a *family of views*, not one indexable buffer.

### Hash table and hash set

Expected `O(1)` lookup, no sorted order, and a required equality-plus-hash
contract. C++ `unordered_*`, Rust `HashMap`/`HashSet`, Java `HashMap`, C#
`Dictionary`, Swift `Dictionary`, JS `Map`, Python `dict`, Go `map`. Iteration
order is unspecified in most, insertion-ordered in some (below), and randomized
in Go ("not specified and is not guaranteed to be the same from one call to the
next").

### Sorted tree map and set

`O(log n)` lookup with ordered traversal and range queries. C++ `std::map`,
Rust `BTreeMap`, Java `TreeMap`, C# `SortedDictionary`. The comparator must be a
total order consistent with equality; a sorted container cannot offer stable
positions, so it is not `[T]`.

### Insertion-ordered map and set

Iteration follows insertion. Python's `dict` has guaranteed it since 3.7,
JavaScript's `Map` and `Set` specify it, and Dart's default `Map`/`Set` are
insertion-ordered. Java ships `LinkedHashMap`/`LinkedHashSet` beside the unordered
forms. Cost: two links per entry and a more expensive removal. Swift's
`Dictionary` is explicitly not insertion-ordered.

### Bitset and bit array

Dense bit storage and fast set algebra, with no addressable element slot. C++
`std::bitset` and the cautionary `vector<bool>`: bit-packed, proxy references, no
`data()`, and not a contiguous container. Java `BitSet`. A bitset can answer
logical reads and membership; it cannot provide `Contiguous<Bool>`.

### Struct-of-arrays and columnar

Odin's `#soa` is the language-level example. Storage is per field, so there is no
element address and no element identity; operations run column-wise. A "column"
can be contiguous and indexed; the *record* cannot.

### Text as a sequence

The unit differs by language and determines what is cheap: bytes (Go `string`,
Rust `str`, which does not implement `Index<usize>` at all), UTF-16 code units
(Java, C#), code points (Python), grapheme clusters (Swift, via `String.Index`
rather than `Int`). Code-point and grapheme indexing are `O(n)` without an index
structure and still disagree about what one position means.

### The families compared

| Family | Index | Contiguous | Ends | Order | Element identity |
|---|---|---|---|---|---|
| Fixed array | `O(1)` | yes | front/back in place | positional | yes |
| Dynamic array | `O(1)` | yes | back `O(1)`, front `O(n)` | positional | yes, until reallocation |
| View | `O(1)` | yes | in place | positional | yes, while owner lives |
| Linked list | `O(n)` | no | both `O(1)` | positional if linear | yes, stable |
| Deque | `O(1)` | no (segmented) | both `O(1)` | positional | yes |
| Chunked/rope | `O(log n)` or `O(n/chunk)` | no | both cheap | positional | no |
| Hash table | keyed `O(1)` expected | no | no | unspecified or insertion | yes (stable) |
| Sorted tree | keyed `O(log n)` | no | no | sorted | yes (stable) |
| Bitset | logical `O(1)` | bits only | no | positional bits | no |
| SoA | `O(1)` per column | per column | per column | positional | no |
| Text | unit-dependent | usually | append | positional by unit | no |

### Sources for the inventory

The load-bearing claims above, by family:

- [C++ `vector<bool>`](https://en.cppreference.com/w/cpp/container/vector_bool):
  proxy references, no `data()`, does not meet every container requirement.
- [C++ `std::deque`](https://en.cppreference.com/w/cpp/container/deque) and
  [Rust `VecDeque`](https://doc.rust-lang.org/std/collections/struct.VecDeque.html):
  segmented or ring storage, `as_slices`/`make_contiguous`.
- [Rust `LinkedList`](https://doc.rust-lang.org/std/collections/struct.LinkedList.html):
  the documentation recommends `Vec` or `VecDeque` instead.
- [Go slice types](https://go.dev/ref/spec#Slice_types) and
  [map types](https://go.dev/ref/spec#Map_types): contiguous descriptors,
  comparable keys, unspecified map order.
- [Java `Map`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/Map.html):
  mutable-key behaviour is unspecified;
  [Java `LinkedList`](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/LinkedList.html)
  traverses from the nearer end.
- [C# `Dictionary`](https://learn.microsoft.com/en-us/dotnet/api/system.collections.generic.dictionary-2):
  enumeration order is undefined;
  [C# `Span<T>`](https://learn.microsoft.com/en-us/dotnet/api/system.span-1):
  stack-only contiguous view.
- [Rust `HashMap`](https://doc.rust-lang.org/std/collections/struct.HashMap.html)
  and [`BTreeMap`](https://doc.rust-lang.org/std/collections/struct.BTreeMap.html):
  expected `O(1)` with a randomized hasher versus `O(log n)` ordered.
- [Python `dict`](https://docs.python.org/3/library/stdtypes.html#typesmapping):
  insertion order guaranteed since 3.7.
- [ECMA-262 keyed collections](https://tc39.es/ecma262/multipage/keyed-collections.html):
  `Map`/`Set` insertion order and average-sublinear access.
- [Dart `Map`](https://api.dart.dev/stable/dart-core/Map-class.html): the order
  is defined by the implementation, with `Map()` creating a `LinkedHashMap`.
- [Scala `ArrayDeque`](https://www.scala-lang.org/api/3.x/scala/collection/mutable/ArrayDeque.html):
  circular buffer with amortized constant-time random access.
- [Swift `String`](https://developer.apple.com/documentation/swift/string) and
  [Swift 6.2 `InlineArray`](https://www.swift.org/blog/swift-6.2-released/).
- [Odin `#soa`](https://odin-lang.org/docs/overview/#soa-data-types).


## Equality is a contract, not a convenience

An associative container is only correct if equality is an equivalence relation:

- reflexive, symmetric, transitive;
- consistent with hashing: `a == b` implies `hash(a) == hash(b)`;
- stable for as long as the value is stored in the container.

The third condition is where most real bugs live. It is a contract on the *key
type*, not on the container, and no dispatch layer can repair a violation. The
practical options are:

1. **Require an immutable key contract.** The container accepts only element types
   whose equality-relevant state cannot be changed while stored.
2. **Do not expose writable access to stored keys.** Rust's `HashSet` deliberately
   has no `iter_mut` because mutating a key "could put the collection into an
   inconsistent state if the key hashes change". This is the honesty LiteLang
   should copy: capability absence, not a runtime check.
3. **Document that mutation invalidates the container.** Cheapest, and the option
   every mainstream language actually offers.

LiteLang has a structural advantage here: bindings are read-only by default and
element replacement requires an explicit `mut` grant. A stored key can therefore
be made unwritable by construction, with no new machinery, if the set and map
types simply do not expose a writable element view. The remaining hole is
interior mutability of a key's own fields through a separately held `mut`
reference to the same value; alias rules decide that, not the container.

Sequence equality is a separate decision: element-wise comparison with equal
length is what Java `List.equals`, Python lists, and Rust `Vec` do; JavaScript
arrays compare by identity with `===`. The draft has whole-value equality for
records and tuples, so element-wise sequence equality is the consistent choice,
with identity comparison available explicitly if ever needed.

Numeric edge cases must be settled before hashing or ordering can be specified:

- `NaN != NaN` breaks reflexivity, so a `Float` key in a hash set can be stored
  and never found again.
- `-0.0 == 0.0` requires equal hashes.
- Cross-type numeric equality (`1 == 1.0`) is not implied by any selected rule.

Three published answers to the same problem, none of which is free:

| Language | Answer |
|---|---|
| Python | `bool` is an `int` subtype, so `{1, True}` has one element and `True` finds key `1` |
| JavaScript | SameValueZero: `NaN` equals `NaN`, and `0` equals `-0` |
| Rust | `f64` implements neither `Ord` nor `Hash`; a total-order wrapper must be supplied |

Rust is the precedent worth copying: a sorted or hashed container over floats
simply does not typecheck unless the program supplies the missing contract.
LiteLang should reject rather than silently misbehave, and should decide
separately whether `Int` and `Float` are ever equal.

## Hashing: what must be true, and what must be decided

Beyond equality consistency, four things need an explicit answer:

- **Seeding.** A deterministic hash makes iteration order reproducible but exposes
  hash-flooding. A per-process seed defends against flooding and makes any
  hash-order traversal non-reproducible. If the default iteration order is
  insertion order (below), seeding no longer affects observable order, and both
  goals can be met.
- **What is hashed.** Arrays, lists, and records need a defined hash over their
  elements or fields, or must be excluded from key position.
- **Hashing user types.** A user record needs either an automatic structural hash
  or an explicit declaration; the two must not silently disagree with equality.
- **Allocation.** A hash function over a large key is `O(size)` per operation. This
  is a real cost law that callers should not have to discover.

None of this is FVP work; all of it must be decided before a standard `Set` or
`Map` ships.

## Ordering: comparator-sorted structures

A sorted container requires a total order that is consistent with equality: if
`compare(a, b) == 0`, then `a == b` must hold for the container to behave. Floats
violate totality through `NaN`, which is why sorted float collections need a
wrapper or exclusion.

Insertion order and sorted order are not the same promise, and neither implies the
other. A sorted set's positions shift on insertion, so it cannot satisfy `[T]`
(INV-057) even though it can be traversed in a well-defined order.

`reverse` is derived from `Indexed + Sized` for a positional family, but a sorted
set can also traverse backwards without being indexed; that is a `Reversed`
capability, not a property of indexing.

## Iteration order for hash structures

Three options, with real precedents:

| Option | Precedent | Cost | Reproducibility |
|---|---|---|---|
| Unspecified order | Java `HashMap`, Go map (randomized per iteration), Rust `HashMap` | cheapest storage | none |
| Insertion order | Python `dict` (guaranteed since 3.7), JavaScript `Map`/`Set` (specified), Dart's default `Map`/`Set`, Java `LinkedHashMap` | two extra links per entry | full |
| Sorted order | Java `TreeMap`, Rust `BTreeMap` | comparator, `O(log n)` | full |

Recommendation for LiteLang: **insertion order by default**, for three reasons
specific to this project rather than to fashion:

1. The verification registry compares byte-exact output across the igniter,
   TypeScript, and native C. A set or map that iterates differently per backend
   would break the project's own test model.
2. "No hidden behavior" is a stated goal, and unspecified iteration order is
   observable nondeterminism that leaks into user output.
3. Every scripting-oriented precedent that users actually rely on — Python, JS,
   Dart — chose insertion order and kept it.

The cost is honest and small: two links per entry, and `remove` must repair them.
An unordered variant can be added later as a distinct family with a stated
performance reason, not as the default.

Sorted maps and sets are a third family. They are justified only when ordered
traversal or range queries are needed; a program that sorts once should sort, not
use a tree. Ship them later, if at all.

## Text is not `[Char]`

The surveyed languages disagree about the unit: bytes (Go strings, Rust `str`),
UTF-16 code units (Java, C#), Unicode code points (Python), and extended grapheme
clusters (Swift). Each choice makes a different operation cheap:

- byte indexing is `O(1)` but splits characters;
- code-point indexing is `O(n)` without an index, and still splits graphemes;
- grapheme indexing is `O(n)` and is what a reader calls a character.

The draft's temporary helpers already use code points, which means `textAt` is
`O(n)` in a general implementation. That is acceptable for a helper and not
acceptable as a silent `[]` operator. Recommendation: keep text a distinct family,
never a `Sequence<Char>`, and require an explicit unit (`bytes`, `code_points`,
`graphemes`) when a program indexes it. A surface syntax that hides which unit is
being counted is the trap all four surveyed designs fall into differently.

## Which families to ship

A proposal, not a selection:

| Family | Ship? | Why |
|---|---|---|
| `[T; N]` fixed array | yes | already selected and implemented |
| Inline fixed-capacity, runtime length | later | the cell between `[T; N]` and `List<T>`; C++26 `inplace_vector<T, N>` and Swift 6.2 `InlineArray` both added it |
| `List<T>` growable contiguous | yes | already selected and implemented |
| `Slice<T>` view | yes | already proposed; needed for zero-copy APIs |
| Insertion-ordered `Set<T>` | yes, later | the default associative set; needs equality/hash decisions |
| Insertion-ordered `Map<K, V>` | yes, later | same |
| `Deque<T>` | probably | `push_front` on a contiguous list is `O(n)`; a deque is the honest structure for both ends |
| Sorted `Set`/`Map` | later | only for ordered traversal and ranges |
| Linked list | **no** | dominated by `List` and `Deque`; Rust's own docs discourage `LinkedList`, and Java's is a classic `O(n)` indexing trap |
| Rope / chunked text | later | needed for large text editing, not for the FVP |
| Bitset | later | distinct element model (no addressable slot) |
| SoA / columnar | later | a layout feature, not a container family |
| Unordered hash set/map | opt-in later | performance choice with nondeterministic order |

The linked-list decision matters most: the protocol must admit node-based
sequences so third-party types can conform, but shipping one would invite the
exact cost lie INV-057's split test forbids.

## Cases

```text
/* An insertion-ordered set: iteration order is the insertion order. */
seen := set_of([3, 1, 3, 2]);
loop seen as value { report(value) }        /* 3, 1, 2 */

/* A hash set under equality; a mutable key is not writable through the set. */
/* (Unselected spelling.) */

/* A sorted set requires a total order; Float is rejected without a wrapper. */
```

## Verification and limits

Document review on **2026-11-01**, covering twelve storage families and the
standard collections of C++, Rust, Java, C#/.NET, Kotlin, Scala, Python,
JavaScript/TypeScript, Go, Dart, Swift, and Odin. No execution, no measurement,
no implementation. Complexity claims are as documented by the cited libraries.
The shipping table is a recommendation, and the equality/ordering rules are
proposals.

## Findings and remaining questions

1. Every associative container founds itself on three contracts the language must
   state once: equivalence, hash consistency, and total order. None is currently
   stated.
2. The draft's "three roles" is actually four: fixed extent inline, inline
   fixed-capacity with runtime length, heap-allocated contiguous growable, and
   borrowed contiguous view. C++26 and Swift 6.2 both added the second cell in
   the last cycle, which is evidence it is not a niche. Whether LiteLang exposes
   it or leaves it to a library type is open.
3. Float keys are the sharp edge: `NaN` breaks reflexivity and totality. Reject
   them in key position unless a total-order wrapper is supplied.
4. Insertion order as the default is the option that satisfies both
   reproducibility and user expectation, at a small documented memory cost.
5. Text must not be a `Sequence<Char>`; the unit of indexing has to be named.
6. The standard library should ship few families and let the protocol admit the
   rest.

Open: whether keys require deep immutability or only non-writable exposure;
hash seeding; cross-type numeric equality; whether `Deque` is justified before a
real workload demands it; and the exact spelling of set/map construction.

## Decision references

No decision has been made. The user's 2026-11-01 direction is that storage
families and operations be investigated and compared. Explicit consent is
required for each chosen rule under the
[explicit-consent rule](README.md#explicit-consent-for-language-changes).

## Handoff

Resume after INV-057's primitive set is confirmed. The equality, hashing, and
ordering contracts can be settled independently of the capability lattice and
should be, because a `Set` cannot ship without them.
