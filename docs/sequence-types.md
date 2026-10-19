# Sequence storage families

Status: **growable List as the default bracket-literal family selected, 2026-10-19; storage-family details remain proposals**. Array owners, list owners, and slice views are the recommended model. Full type syntax, generic punctuation, conversions, ownership, and complete access grammar remain open. Existing var/mut, record-copy, and initialization decisions remain in force.

## Three roles

These are provider/storage roles. The user's later [abstraction-first API direction](collection-abstractions.md) places behavioral requirements at consumer boundaries: a traversal-only operation should accept a compatible element source regardless of whether the provider is a List, array, set, iterator, or custom collection. Slice is a contiguous view, not a universal input abstraction for every collection.

- Array: owns a contiguous sequence whose length does not change after construction.
- List: owns a contiguous sequence whose length can grow or shrink.
- Slice: views a contiguous region of existing initialized elements; it does not own or grow their storage.

The array family needs a distinction between a compile-time length and a length chosen once at runtime. Schematic types below use `Array<T, N>` for inline compile-time arrays and `Array<T>` for runtime-sized fixed-length owners. `List<T>` and `Slice<T>` name the other roles. These are illustrative names, not a selected generic declaration grammar.

The user explicitly deferred generic syntax: these angle-bracket forms describe concepts for now and can be replaced after the future generic-design review. Type inputs and static value inputs must not be conflated by the placeholder punctuation. See [temporary generic notation](generic-notation.md).

## Selected literal default and proposed advanced forms

```text
numbers := [10, 20, 30];                 /* selected default: growable List<Int> */
point: Array<Int, 3> = [10, 20, 30];     /* compile-time fixed array */
tail: Slice<Int> = numbers[1..3];        /* view containing 20, 30 */
```

Without a more specific expected sequence type, a bracket literal such as [10, 20, 30] infers a growable `List<Int>`. The collection can grow when mut access permits it; a plain binding still has read-only access. An explicit expected array type can select fixed layout, subject to its eventual type/construction rules. Half-open slicing and the displayed array/slice type syntax remain proposals, and no compiler is implemented.

Adding mut or observing an append later must not change the inferred collection family. Expected typing comes from an established type context rather than guesses from future mutations. Empty and heterogeneous literals need their own inference rules, without an implicit Any type.

Teach literals, indexing, and loop iteration first. Introduce fixed layout when a program needs it, capability-based function inputs for provider independence, and slices for contiguous views/subranges without element copies. There is no requirement to teach ownership notation in the first example, but the semantics must exist before an implementation can safely infer representation.

## Copying and access

An inline fixed array participates in the containing value's layout. A slice copies its view metadata when that copy is permitted; it still views the original elements. An owning heap container needs an ownership contract: duplicating its header alone cannot create two independent owners.

The existing shallow record-copy rule preserves stored references and permissions. It does not silently select list cloning, shared allocation ownership, copy-on-write, or move semantics. Those choices must be settled before claiming that mut copy := existing_list creates an independent element allocation. See the individual concept documents.

Var permits replacing a collection binding. Mut permits permitted changes to held data, such as indexed writes or list growth. Slice formation must not upgrade read-only source access. Public pointer syntax is not necessary just to introduce a bounded view, but lifetime and alias rules are necessary.

Plain-union widening does not automatically make `List<A>` compatible with `List<A | B>` or permit a contiguous `Slice<A>` to be reinterpreted as `Slice<A | B>`. Accepted writes and element representation/stride must remain valid. A union of whole collection alternatives also differs from one collection of union-valued elements. Generic variance, conversion, and any adapting view need separate rules; no implicit payload reinterpretation is selected.

## Initialization and empty sequences

The selected omitted/0/{}/? modes need type-specific definitions. For fixed compile-time arrays, a candidate zero recursively initializes every element when eligible. For lists, a valid empty container can have length zero and reserved uninitialized capacity. An ordinary slice must expose only initialized elements.

Reserve payload storage separately from exposing live elements. In particular, = ? on an owning descriptor does not by itself choose the number of runtime elements to allocate. Empty lists and slices should be valid empty values rather than public nullable states.

## Features to defer

Bounded-capacity lists, type-level slice extents, strided views, SIMD operations, and multidimensional shape syntax can follow the core roles. Nested inline arrays can model rectangular inline storage; nested lists need not share one contiguous allocation. String indexing remains separate from arbitrary element slicing.

## Decisions to take in order

1. Complete array/list/slice storage roles; the default literal family is now selected as List.
2. Choose owner copy/move/share semantics and slice lifetime/invalidation rules.
3. Select type/literal/slicing spellings, index origin, and bounds-failure handling.
4. Specify capacity allocation, bulk initialization, partial cleanup, and generic inference.

Related: [arrays](arrays.md), [lists](lists.md), [slices](slices.md), [reference comparison](sequence-types-comparison.md), [collection iteration](collections-and-iterators.md), and [reserved storage](reserved-storage.md).
