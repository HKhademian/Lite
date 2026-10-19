# Fixed-length owning arrays

Status: **proposed storage family, 2026-10-19**. `Array<T, N>` and `Array<T>` are schematic spellings. Compile-time and runtime length, ownership, construction, and type grammar need selection; do not treat the examples as implemented syntax.

## Compile-time size

The angle brackets in examples such as `Array<Float, 3>` are [temporary generic notation](generic-notation.md). Float names the intended element type; 3 names the intended static extent. Their joint spelling does not select a generic parameter mechanism, const-generic syntax, or a final array type form.

`Array<T, N>` owns exactly N contiguous inline T slots. N is part of the static type, so lengths 3 and 4 are distinct array types. For ordinary nonzero-sized elements, indexed addressing follows the element stride; zero-sized elements require a representation rule.

```text
point: Array<Float, 3> = [1.0, 2.0, 3.0];
zeroed: Array<Int, 1024>;
pending: Array<Int, 1024> = ?;
```

The first supplies all elements. The second would apply the selected recursive semantic-zero rule if this family is adopted. The third reserves the complete fixed layout without initialized elements; indexed first construction remains an open contract. Zero/default element eligibility must not be bypassed by the array.

An array field contributes its inline elements to a containing record, consistent with nested record values. Permitted copies copy those inline values under their element contracts and preserve references inside elements without cloning reference targets. Noncopyable/resource elements require their eventual copy policy.

## Runtime size fixed after construction

`Array<T>` is the candidate for an owner whose length is chosen at runtime and never changes afterward. Its size is not part of the static type. It owns its separately allocated element region; its descriptor can be stored inline in another record, while its runtime-sized elements cannot all contribute to that record's compile-time layout.

```text
samples: Array<Int> = generate_array(count, fn(i: Int): Int { i });
```

The generator name, generic inference, allocation/failure policy, and callback construction API are proposals. The aim is to allocate an appropriate region and directly construct each required element, with cleanup for a partially completed fill if needed. No preliminary zero pass is inherently required.

Avoid calling a borrowed slice an owning runtime array merely because both have runtime lengths. Ownership determines who keeps storage alive and releases it.

## Fixed length is independent of placement and mutability

Compile-time size does not force stack placement: an inline array can reside inside a heap-owned object or another valid region. Runtime allocation policy is also separate. No automatic large-stack allocation or heap fallback is selected.

Fixed length does not imply fixed elements. Mut array access could permit element updates while preserving length. Var on the array binding instead permits replacement with a compatible whole array; it does not make the existing elements writable. A whole replacement of `Array<T, N>` must retain the same N unless an explicit conversion creates a different type.

## Views and specialization

Both array forms should be able to lend a read-only slice of initialized elements without copying them. A writable view requires existing writable access and an explicit grant. Automatic function-argument coercion versus explicit slice formation is still open.

Consumer APIs should request the minimum [collection capability](collection-capabilities.md), rather than a particular array type or extent unless required. A traversal-only operation can accept other compatible providers too; an operation requiring contiguous storage can request that ability and obtain a slice. The array's N can remain available to specialization without appearing in the public consumer signature.

Known N can support exact destructuring, compile-time size checks, and specialization. A runtime length needs a checked proof before conversion to an exact-size contract. No unchecked reinterpretation of a runtime array as `Array<T, N>` is selected.

## Later library forms

A bounded-capacity list differs from an array: its length can vary up to a fixed maximum. A known-length slice differs too: it views N elements rather than owning N inline slots. Both are useful later facilities, not reasons to merge the core contracts.

Remaining choices include spelling ([N]T, [T; N], or a named generic form), multidimensional layout, element defaults, equality, fallible construction, ownership, and allocation policy. Related: [sequence families](sequence-types.md), [lists](lists.md), [slices](slices.md), [record copies](local-shadowing-and-copies.md), and [initialization](first-initialization.md).
