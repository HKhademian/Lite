# 7. Collections — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Arrays](../../../docs/arrays.md)
- [Tuple array shapes](../../../docs/tuple-array-shapes.md)
- [Lists](../../../docs/lists.md)
- [Slices](../../../docs/slices.md)
- [Collection capabilities](../../../docs/collection-capabilities.md)
- Related investigation catalog areas: INV-054–060, INV-044–045.

## 7.1 Collection families

**Baseline:** Fixed arrays have static extent and inline layout; runtime-length owner, list, and view differ in size, growth, or ownership.

**Initial assessment and probes:** Compare `[Int; 3]`, a three-Int tuple, and a runtime-sized sequence. Ask which type and operation differences remain justified if layout is shared.

## 7.2 Construction and inference

**Baseline:** Known-size nonempty literals infer fixed arrays; heterogeneous established elements can infer a union. Empty literal element typing is unresolved.

**Initial assessment and probes:** Compare `[1, 2]`, `[1, "tea"]`, and `[]` with and without an expected type. Check fixed extents, zero/singleton and no invented Any or Never default.

## 7.3 Access and mutation

**Baseline:** Fixed arrays have literal positional access and checked runtime indexing; mutation depends on access permissions.

**Initial assessment and probes:** Compare `items.0`, `items[i]`, and a tuple position. Check out-of-bounds, source evaluation once, distinct element grants and unknown overlap.

## 7.4 Iteration

**Baseline:** The review direction favors consumer capabilities over forcing each API to require a particular collection.

**Initial assessment and probes:** A sum should work over an array or suitable view without assuming allocation. Check item order, empty iteration, early exit, and whether iteration permits mutation.

## 7.5 Storage, copies, and views

**Baseline:** Fixed array layout is inline; a runtime-sized owner requires available length information. Borrowing and ownership of views are not a complete selected model.

**Initial assessment and probes:** For a 2 GB list, compare independent value semantics, an optimized-away copy, and an explicit no-copy read-only view. Clarify lifetime, retention and mutation before choosing a mechanism.

## Working judgment

Keep fixed extent, element homogeneity, growth, ownership, and view access as independent properties. Arrays may merit distinct behavior even with tuple-equivalent layout, but runtime indexing and length must earn any separate conceptual machinery.

## Expanded assessment

### Compiler evidence and boundaries

The generated TS verifier passes fixed-array indexing, list-end mutation, named tuple and array traversal examples. These use Node-hosted arrays and helpers, not the selected native storage proof. The verified slice does not establish generic user collections, borrowed slices, arbitrary element mutation, list allocation policy or native layout. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **7.1 Families:** static arrays, runtime-sized owners, growable lists and borrowed views solve different lifetime/size problems. A fixed array can be inline with statically known length; a growable owner needs capacity/reallocation policy, and a view needs accessible length and valid backing. Distinct surface types cost complexity; collapsing them can hide ownership or growth.
- **7.2 Construction:** inferred `[T; N]` captures extent and can avoid storing length. Heterogeneous literals may require union element representation and per-element tags; empty inference remains unresolved. Initializing large buffers element by element versus uninitialized construction affects bandwidth, security, and partial cleanup.
- **7.3 Access and mutation:** runtime indexing needs a valid bounds proof or check under the chosen safety semantics; invalid indexes must retain selected fault behavior. Statically proven bounds may remove checks. Writable aliases and reallocation invalidate views; permission alone is not a lifetime proof.
- **7.4 Iteration:** specialized iteration over a known array can be a tight pointer/index loop without iterator allocation. General abstractions should expose sufficient structure for inlining and vectorization. Dynamic dispatch and monomorphization trade call overhead for binary size and compile time; user-defined providers need matching semantic guarantees.
- **7.5 Storage:** passing a 2 GB owner by independent value may require a deep semantic copy, a cheap move, or an explicitly defined sharing strategy; copying only an owning descriptor cannot safely create independent owners. A no-copy view must specify retention and mutation constraints. Capacity, allocator injection, fragmentation, and failure handling are necessary costs of a growable list even in a no-GC program.

### Blockers and cross-feature cases

Benchmark summation, growth, filtering and map-like operations on fixed arrays, lists and views, with equivalent C safety and allocation behavior. Trace a view retained across list growth and a list of resource-owning records. Static ownership/borrow [2](02-bindings.md), aggregate zero/copy [3](03-records.md), generic dispatch [10](10-generics-comptime.md), and failure cleanup [8](08-failure-cleanup.md) must be resolved together.

## Cross-topic routing

Types (1), access and lifetimes (2), and generic capabilities (10) are prerequisites. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [2](02-bindings.md), [10](10-generics-comptime.md).

## Prior art: storage, traversal, and production

Investigation, 2026-11-20. The comparisons below describe library and language contracts. Their implications for Lite are review findings. The existing [collection capabilities](../../../docs/collection-capabilities.md) and [source contracts](../../../docs/collection-source-contracts.md) provide the vocabulary to compare them.

### What the source can promise

- **Cardinality:** exact in the type, exact at runtime, bounded, or unknown. Track total length, remaining cursor length, and output contribution count separately. Finiteness is also a separate promise. A finite source can have unknown length, and an unbounded source may still support indexing.
- **Access:** one forward pass, repeatable traversal, reverse traversal, positional access, keyed lookup, or contiguous storage. Each capability has its own cost and access contract. A traversal ordinal is useful for reporting progress even when it cannot be used to jump back to an item.
- **Production:** elements can already be stored, be computed on demand, or arrive from an independently running producer. For deferred sources, specify when production starts, whether a second pass recomputes or replays, whether advancing consumes state, and whether pulling can suspend or fail. Cold production starts per consumption or subscription. Hot production can proceed independently of a subscriber. If a design uses the term *warm*, specify the start and sharing policy directly, such as starting on the first subscriber and continuing for later subscribers.
- **Ownership:** an owning collection, a view of backing storage, and a cursor have different copy, mutation, and lifetime contracts. Published size and index facts must remain valid until the access they justify. A growable or externally updated provider needs a defined invalidation policy. Materializing a snapshot introduces its own time and storage cost.

### What other languages actually expose

- **C++ ranges** distinguish input, forward, bidirectional, random-access, and contiguous traversal, with sized and borrowed capabilities expressed separately. A `transform_view` over a sized base exposes its size. A general `filter_view` supplies no sized interface and finds matching elements during traversal. A lazy transformation can therefore keep a size or indexing property without keeping the underlying storage layout. [Range refinements](https://eel.is/c++draft/range.refinements), [range requirements](https://eel.is/c++draft/range.req), [transform view](https://eel.is/c++draft/range.transform.view), [filter view](https://eel.is/c++draft/range.filter.view)
- **Rust** separates a contiguous slice from the iterator obtained from it. An iterator can provide lower and upper bounds, or an exact remaining count through `ExactSizeIterator`, without offering random indexing. The standard library explicitly disallows relying on a safe iterator size claim to justify unsafe memory access. A `VecDeque` also demonstrates indexed ring storage whose logical element sequence may wrap. [Slices](https://doc.rust-lang.org/std/primitive.slice.html), [size hints](https://doc.rust-lang.org/stable/core/iter/traits/iterator/trait.Iterator.html#method.size_hint), [exact size](https://doc.rust-lang.org/std/iter/trait.ExactSizeIterator.html), [ring buffer](https://doc.rust-lang.org/std/collections/vec_deque/struct.VecDeque.html)
- **Java and Swift** expose why an indexing operation needs a cost contract. Java's `List` allows positional reads on both array-backed and sequential lists, with `RandomAccess` guiding algorithm choice. Repeated indexing can make a linear traversal quadratic. Swift's random-access protocol promises constant-time index movement and distance, a stronger guarantee than traversal in both directions. [Java RandomAccess](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/RandomAccess.html), [Swift RandomAccessCollection](https://docs.swift.org/latest/documentation/swift/randomaccesscollection/)
- **Go and Python** illustrate two different reasons an indexed sequence can be cheap to create. A Go slice describes existing array storage and can share it with other slices. Python's `range` stores parameters and computes requested items without storing all of them. Both provide positional access, and only the Go example has backing elements that can be aliased. [Go slices](https://go.dev/ref/spec#Slice_types), [Python range](https://docs.python.org/3/library/stdtypes.html#ranges)
- **Kotlin and OCaml** separate deferred computation from replay. Kotlin sequences evaluate lazily. Kotlin's cold `flow` runs separately for each collector, while `SharedFlow` shares production with a configurable replay buffer. OCaml's `Seq` can be persistent or ephemeral, and a query such as `is_empty` can demand an item from an ephemeral source. Live asynchronous delivery adds resource rules such as cancellation and backpressure beyond ordinary iteration. [Kotlin sequences](https://kotlinlang.org/docs/sequences.html), [Kotlin SharedFlow](https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines.flow/-shared-flow/), [OCaml Seq](https://ocaml.org/manual/5.5/api/Seq.html), [Reactive Streams](https://www.reactive-streams.org/)

### Implications to test in Lite

- **Traversal and indexing.** A sum or first-match search needs one pass. A positional access API needs a defined index domain and a cost promise. `O(1)` describes scaling with input length. Bounds checks, indirect dispatch, copying a large element, and calculating a value can still have a cost. Keep a set's keyed lookup and a string's byte versus text-element positions distinct from array indexing. Lite's existing review records the [cheap indexed sequence direction](../../../docs/indexed-sequence-contract.md) and [direct positional access with typed faults](../../../docs/checked-collection-operations.md) separately.
- **Loop collection.** A guaranteed three-entry traversal with one contribution per entry can produce `[TM; 3]`, even when outputs are computed at runtime. A filter over the same input generally proves at most three, so use `List<TM>` unless an exact output count can be proven. Only contributing paths supply element types. Distinct contributing types can form a union. A runtime exact count can help reserve storage; it cannot by itself serve as a compile-time array extent. Proofs must account for early completion and for which body paths contribute. An output bound can reserve capacity without authorizing reads past the initialized prefix. Receiver widening and allocation policy remain separate.
- **Consumption and phase changes.** Counting a cursor, restarting a cold source, reversing a one-pass source, and collecting an unbounded source have different observable consequences. Avoid hidden draining, a second traversal, replay, or buffering to satisfy a stronger contract. A finite `take`-like adapter promises at most N outputs and only promises exactly N when the source can supply them. Sorting, taking the last item, or collecting all values from a source without guaranteed completion can require explicit bounds or a completion policy.
- **Implementation probes.** Compare fixed-array map, unknown-length filter, an exact-length forward-only source, a mutable slice across owner growth, an indexed computed range, and a one-pass reader that logs each request and can fail partway through. Check that early exit consumes only the required prefix and cleans up, that failure drops the initialized output prefix correctly, and that unused `.collected` does not allocate. For a future live source, vary subscriber start time, replay and buffer limits independently. Measure native allocation count, bytes retained, bounds checks and dispatch against a C implementation with equivalent semantics.

The smallest model to evaluate first is a synchronous traversal contract plus separately requested size and cheap positional access, with explicit materialization when a caller needs stored results. Views, re-execution, and live subscriptions each need their own access or lifetime contract. This review selects no new syntax, capability names, or compiler behavior.

## Prior art: string storage and indexing

Investigation, 2026-11-20. Lite's temporary text helpers use code-point positions. Ordinary indexing, Unicode validity, and native layout remain open. The C bootstrap's UTF-8 concatenation helper is evidence of a particular lowering, not a native ownership or ABI decision. [Current text design](../../../docs/strings.md)

- **Rust** guarantees valid UTF-8 for `str`. Its byte length and byte view are distinct from scalar traversal. A text slice using byte offsets checks scalar boundaries. **Go** permits arbitrary bytes in `string`, indexes bytes directly, and decodes UTF-8 during `range`. These demonstrate different validity and indexing contracts despite both routinely processing UTF-8. [Rust `str`](https://doc.rust-lang.org/std/primitive.str.html), [Go strings](https://go.dev/blog/strings)
- **Swift** uses UTF-8 as its preferred native storage. Its public character operations use grapheme clusters and string indices, with separate UTF-8, UTF-16 and Unicode scalar views. This separates storage from the text unit exposed to callers. [Swift storage](https://www.swift.org/blog/utf8-string/), [Swift strings and characters](https://docs.swift.org/swift-book/LanguageGuide/StringsAndCharacters.html)
- **JavaScript** specifies observable 16-bit code units, including the ability to hold isolated surrogates. This is a semantic model, not an engine layout requirement. **CPython** uses one, two, or four bytes per code point within a string depending on its largest value. Constant-width storage per string allows direct code-point indexing at the cost of supporting multiple representations. [ECMAScript String type](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-string-type), [PEP 393](https://peps.python.org/pep-0393/)

UTF-8 stores a scalar in one to four bytes. UTF-16 uses two or four bytes and can be more compact for text dominated by common CJK scalars. UTF-32 uses four bytes per scalar and gives direct scalar indexing in contiguous storage. None gives direct grapheme indexing by itself. For example, `e` followed by U+0301 is two scalars and one grapheme cluster. [Unicode encoding forms](https://www.unicode.org/faq/utf_bom.html), [Unicode text segmentation](https://www.unicode.org/reports/tr29/#Grapheme_Cluster_Boundaries)

Working recommendation: start with valid UTF-8 as the native `String` representation and a separate byte sequence for arbitrary data. Use a stored byte count and an explicit byte access contract for constant-time byte indexing over contiguous storage. Use sequential scalar decoding for text iteration and explicit grapheme processing when user-visible character boundaries matter. Keep plain `text[i]` open until its unit and cost are decided. A substring formed from byte offsets must start and end on scalar boundaries to preserve valid UTF-8. A backend may use its host representation internally if it preserves the agreed Lite behavior, including any exposed byte offsets and lengths.

Test ASCII, Persian, CJK, supplementary scalars, combining marks, malformed UTF-8, a JavaScript string with an isolated surrogate, embedded NUL, and an offset inside a multibyte scalar. Compare byte scanning, scalar iteration, repeated positional queries, and boundary conversion separately. A native ABI, C NUL termination, allocation and ownership, Unicode normalization, and invalid-input handling need their own decisions. This review selects no representation, indexing syntax, or compiler behavior.

## Joint review: construction defaults and inferred collection contracts

Collection sugar should have named contracts and standard providers. In a parameter, the bracket sugar explicitly requests capability inference from use. Preserve the written element type and any written extent. Traversal, positional reads, positional replacement, structural growth, and contiguity are different requirements. A named interface fixes the contract instead. A public inferred signature should expose its actual requirements so that adding indexing can be detected as an API change.

Keep inference for inputs separate from default construction. The standard fixed-size provider embeds N inline elements, including when stored in a record or tuple. A custom provider can satisfy a fixed-count contract without inline storage. The discussion also sketched known extent plus contiguity as a possible bracket contract, with an extent-only named interface for library code. The precise relationship between that sketch and inferred access requirements remains open.

Future custom sets, lists, arrays, and maps can implement different contracts for order, lookup, mutation, and access cost. A named provider may be selected in a scope as a replacement for the standard default when it meets the required contract. File, folder and project scope, export and selection syntax, and concrete layout guarantees need separate review. Construction selects a provider, and consumers use the constructed value through its supported contracts.

Writable access requires consent and a supported write operation. Positional replacement preserves length. Growth and removal change structure. A set need not support positional replacement, and a set-specific replace operation must define ordering and collisions. An unsupported operation is a static rejection. A supported operation with an invalid operand follows its declared failure behavior.

Ordinary range indexing follows copy-by-default value semantics. For `middle := items[1..3]`, a later write to `items[1]` does not change `middle`. The compiler may avoid copying when it preserves that behavior. An explicitly requested view can share storage under a separate lifetime and mutation contract. View spelling remains open.

See [loop result inference](loop-metadata-review.md#collected-type-and-cost) and [string review](../../../docs/strings.md#joint-review-text-semantics).
