# Borrowed contiguous slices

Status: **proposed view concept, 2026-10-19**. `Slice<T>`, slicing punctuation, access construction, lifetime checks, and index conventions remain proposals. This would add a limited view contract without selecting general raw pointers or freely escaping reference values.

## A view, not another element allocation

`Slice<T>` uses [temporary generic notation](generic-notation.md). The future generic review will determine its source spelling; this view proposal does not select angle-bracket application syntax.

A slice describes a contiguous region of initialized elements owned elsewhere. The intended representation is an address plus an element count, with ownership/lifetime facts checked separately; exact ABI and alias enforcement are open. Creating or copying a permitted slice view does not copy its elements, allocate a new element buffer, or transfer the source's ownership.

```text
numbers := [10, 20, 30, 40];
middle := numbers[1..3];
print(middle[0]); /* proposed result: 20 */
```

This proposes zero-based indices for each view and a half-open range: include the lower index and exclude the upper. The view contains 20 and 30. It does not freeze the general range grammar. Original-index retention is an alternative, as in Swift ArraySlice, rather than a necessary property of slicing.

Copying a view still refers to the same source region. An independent owning copy requires a separate copy/clone operation. A view's copied references retain their permissions; shallow-copying a read-only view cannot manufacture writable access to its source.

## Inputs that actually require contiguity

```text
upload_pixels := fn (pixels: Contiguous<Pixel>) {
    upload_region(pixels.as_slice());
}
```

This is conceptual capability notation; the helper and view-acquisition method are proposals. An algorithm needing one contiguous region can request a Contiguous capability and obtain a slice from any compatible provider. A boundary specifically requiring the slice representation may accept Slice itself. Read access is the default, and no element copy or new owner is inherently required.

An operation such as summing or rendering that only traverses elements should request the broader Iterable capability. Requiring Slice would otherwise exclude sets, chunked collections, and generators unnecessarily. Exact constraints, view acquisition, conversions, and lifetime rules remain open. See [consumer abstractions](collection-abstractions.md) and [collection capabilities](collection-capabilities.md).

## Mut and var describe different effects

Under the proposal, values: mut `Slice<T>` would permit allowed writes into the viewed elements. Such access must come from a writable source through an explicit grant. The exact mutable-view formation syntax remains open; ordinary read-only slicing must not grant it.

A var-qualified `Slice<T>` parameter instead permits replacement of the caller's slice descriptor under the selected caller-location contract. That can select a different view but does not itself permit writes into the original elements. Similarly, local var view permits rebinding the local view. These do not resize its underlying owner.

Mutable view alias rules need an explicit decision. Do not silently import Rust exclusivity or promise that arbitrary copied writable views are safe under all future ownership models.

## Lifetime and invalidation

A usable view needs live backing storage and valid element bounds. It cannot escape an expiring local owner, survive incompatible owner replacement, or continue referring to a deallocated/reallocated list allocation.

```text
numbers: mut List<Int> = [10, 20, 30];
view := numbers[0..2];
append(mut numbers, 40);
print(view[0]);
```

The recommended conservative rule rejects this structural mutation while view remains in use; otherwise append could relocate its source. The compiler must not silently repair it by cloning the slice or heap-promoting the owner. More permissive rules require defined proofs or explicit ownership machinery. Borrow duration, disjoint mutable subranges, and callback/capture behavior remain open.

## Initialized bounds and emptiness

Ordinary slices expose initialized elements only. Spare capacity in a list and reserved-but-unwritten array slots need a construction/output view with a different contract. They must not be passed as readable `Slice<T>` merely because their storage exists.

Empty slices should be valid values with length zero rather than public null states. Indexing or slicing checks logical bounds; exact failure handling remains open. A length-zero view must not permit element reads.

The [checked-operation proposal](checked-collection-operations.md) considers a typed Result for dynamic indexing, with ordinary else recovery or postfix ! propagation. Static validity proofs and slicing-range errors need their own precise rules; this is not yet a selected indexing contract.

## Keep the base view small

Recommend contiguous views only in the initial core. Reverse/step adapters may use iterators or a later strided-view abstraction rather than silently making copies or changing Slice's layout. A type-level known extent `Slice<T, N>` may later preserve static length proofs, but is not an owning `Array<T, N>`.

Do not automatically treat String as `Slice<Byte>` or as grapheme-indexable by this decision. Element and string indexing have distinct contracts.

Related: [sequence families](sequence-types.md), [arrays](arrays.md), [lists](lists.md), [caller grants](caller-mutation-grants.md), [reserved storage](reserved-storage.md), and [reference comparison](sequence-types-comparison.md).
