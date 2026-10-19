# Sequence storage families

Status: **proposal and design review, 2026-10-19**. This recommends array owners, list owners, and slice views. Names, generic punctuation, literals, conversions, ownership, and complete access grammar are not selected by this review. Existing var/mut, record-copy, and initialization decisions remain in force.

## Three roles

- Array: owns a contiguous sequence whose length does not change after construction.
- List: owns a contiguous sequence whose length can grow or shrink.
- Slice: views a contiguous region of existing initialized elements; it does not own or grow their storage.

The array family needs a distinction between a compile-time length and a length chosen once at runtime. Schematic types below use `Array<T, N>` for inline compile-time arrays and `Array<T>` for runtime-sized fixed-length owners. `List<T>` and `Slice<T>` name the other roles. These are illustrative names, not a selected generic declaration grammar.

## Candidate teaching progression

```text
numbers := [10, 20, 30];                 /* recommend ordinary List<Int> */
point: Array<Int, 3> = [10, 20, 30];     /* compile-time fixed array */
tail: Slice<Int> = numbers[1..3];        /* view containing 20, 30 */
```

These examples propose bracket literals, half-open slicing, and type syntax together; they are not existing executable syntax. The default for an unannotated literal is being reviewed with the user. Recommend List for beginner code, with an expected array type selecting fixed layout. Do not change the inferred collection kind merely because mut is added or an append occurs later. Empty and heterogeneous literals need their own inference rules, without an implicit Any type.

Teach literals, indexing, and loop iteration first. Introduce fixed layout when a program needs it, then slices when functions or subranges should avoid element copies. There is no requirement to teach ownership notation in the first example, but the semantics must exist before an implementation can safely infer representation.

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

1. Confirm array/list/slice roles and the default literal family.
2. Choose owner copy/move/share semantics and slice lifetime/invalidation rules.
3. Select type/literal/slicing spellings, index origin, and bounds-failure handling.
4. Specify capacity allocation, bulk initialization, partial cleanup, and generic inference.

Related: [arrays](arrays.md), [lists](lists.md), [slices](slices.md), [reference comparison](sequence-types-comparison.md), [collection iteration](collections-and-iterators.md), and [reserved storage](reserved-storage.md).
