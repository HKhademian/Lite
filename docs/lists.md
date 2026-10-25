# Growable owning lists

Status: **growable List remains an explicitly selected collection family; the unconditional bracket-literal List default is superseded by fixed-array inference, 2026-10-24**. Full List<T> generic grammar, contiguous owner representation, helper names, and capacity APIs remain proposals. Ordinary value transfers follow the general copy default, with no implicit references; this does not decide the List owner's copy contract, copy eligibility, storage sharing, explicit move modes, or allocation/error policy. Those type-specific and safety contracts remain deferred; see [the general copy default](parameter-values-and-slots.md#general-copy-default-selected).

## Purpose and beginner examples

`List<Int>` is [temporary explanatory notation](generic-notation.md), not selected generic application syntax. An expected concrete List type or an explicit constructor requests growable storage. Fresh statically sized literals instead follow [fixed-array inference](tuple-array-shapes.md#known-size-fresh-literals-infer-fixed-arrays).

A list owns a contiguous allocation with a current initialized length and possibly larger capacity. Adding/removing elements changes length. A list is not a linked list in this proposal.

```text
numbers: List<Int> = [10, 20, 30];
loop numbers as number { print(number) }

editable: mut List<Int> = [10, 20, 30];
editable[0] = 99;
push_back(mut editable, 40);
```

The explicit expected List types above select growable construction; push_back remains a [proposed end operation](sequence-end-operations.md), and the complete indexing API still needs formalization. Without such an expected concrete type, [10, 20, 30] now infers [Int; 3], regardless of var/mut modifiers. A read-only List value retains its List contract; readable access alone does not turn an existing provider into a fixed array.

The explicit mut argument follows selected caller grants. Mut grants supported mutation without changing a collection family or inventing growth. A fixed List binding can permit container mutation without permitting binding replacement. Fixed arrays permit writable elements without supporting growth. Known-type heterogeneous nonempty construction uses normalized-union element inference when no expected element contract selects another compatible type. Uncontextual [] constructs an empty fixed array; its exact default element type is deferred. Unresolved nonempty element types and runtime-length literal provider inference remain open.

A var binding with an explicit List contract permits compatible whole-binding replacement; adding mut also permits supported held-data operations. Typed forms retain the selected placement, such as values: mut `List<Int>`. An unannotated var numbers := [1, 2, 3] instead remains a fixed [Int; 3] binding with replacement permission.

The [end-operation review](sequence-end-operations.md) proposes push_front/push_back/pop_front/pop_back. These require structural capabilities beyond mut [T]; fixed arrays and slices can support element replacement without changing length. The user accepts direct indexing/pop with typed faults and requests shared else recovery. A separate Option-returning removal remains an alternative. Capture scope, concrete helper names, and allocation failure policy remain open.

## Length, capacity, and initialization

Conceptually:

```text
0 <= initialized length <= allocated capacity
live elements:       [0, length)
unwritten capacity:  [length, capacity)
```

An empty valid list can own capacity for a million elements without constructing any element. This directly supports the large-buffer goal. It exposes no uninitialized elements through ordinary iteration or indexing.

Candidate zero semantics are an empty valid list, without requiring a zero value for T because no T elements are created. Reserving capacity also need not construct a T. This differs from zero-initializing a nonempty fixed array, which needs a valid zero for every element.

```text
samples: mut List<Float> = list_with_capacity(count);
```

This is a proposed allocation helper: initialized length is zero, while capacity is at least the requested amount on success. It does not select a recoverable-error versus panic allocation policy. The valid descriptor differs from samples: `List<Float>` = ?, which reserves an uninitialized descriptor and does not specify a runtime element count or automatically allocate its payload.

Reserve capacity and construct elements separately. Growing initialized length must provide valid elements; it cannot merely expose spare bytes. Bulk-fill APIs, initialized-prefix commits, and partial cleanup require their own contract. Exact helper names remain open.

## Copy and ownership decision

Copying an owning header must not accidentally create two independent owners of the same allocation. Candidate semantics include transferring an owner with explicit cloning for a new allocation, shared ownership, or value semantics backed by copying/copy-on-write. The lightweight starting recommendation is explicit independent cloning and scoped views, with the exact transfer rules still open.

This does not rewrite shallow record copying. Inline descriptor fields and stored references retain their existing semantics, while resource copy eligibility and release rules determine whether a particular owner is copyable. Mut copy := existing_list must not silently be advertised as an independent payload clone before that decision.

## Growth and active views

Appending may need a new allocation and move element storage. Removing, shrinking, sorting, or replacing the owner can also affect existing views. Recommended baseline: reject operations that invalidate a slice while it can still be used. Do not keep it alive by silently cloning elements or introducing shared ownership without a selected rule.

Appending within spare capacity may avoid relocation, but a safe API rule may conservatively forbid all structural mutation during an active view. That policy, nonlexical view liveness, and allowed overlapping updates remain open.

## Empty values, access, and cost

Prefer a valid empty list without a public null state or mandatory allocation for emptiness. A read-only list view does not imply that no authorized alias can modify its allocation. Bounds faults in the accepted sequence direction use the typed fault path, with attached else recovery requested. Checks may be optimized when proved unnecessary; capture scope and transfer/cleanup remain open.

The goal is specialized element storage and predictable allocation costs, without mandatory per-element boxing. No implementation, mandatory two/three-word ABI, growth factor, or measured performance is established.

Related: [sequence families](sequence-types.md), [arrays](arrays.md), [slices](slices.md), [reserved storage](reserved-storage.md), and [mutability](mutability.md).
