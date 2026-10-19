# Growable owning lists

Status: **growable List as the default bracket-literal family selected, 2026-10-19**. Full `List<T>` type grammar, contiguous owner representation, helper names, and capacity APIs remain proposals. No owner copy/move/share policy or allocation/error policy is selected here.

## Purpose and beginner examples

A list owns a contiguous allocation with a current initialized length and possibly larger capacity. Adding/removing elements changes length. A list is not a linked list in this proposal.

```text
numbers := [10, 20, 30];
loop numbers as number { print(number) }

mut editable := [10, 20, 30];
editable[0] = 99;
append(mut editable, 40);
```

The literal's growable List default is selected; the append helper and complete indexing API remain proposals. With no more specific expected type, [10, 20, 30] infers `List<Int>`, whether its binding is fixed, var, mut, or var mut. A plain binding provides read-only access even though the collection kind supports growth. Actual changes require the corresponding access permission. An explicit expected array type can select fixed layout under its future construction contract.

The explicit mut argument follows selected caller grants. Adding mut grants mutation; it must not change List into another collection kind. A fixed list binding can permit mutation of its container data without permitting replacement of the binding. Empty and heterogeneous literal inference remain open.

Var numbers := [...] would permit whole-binding replacement, while var mut would permit both replacement and held-data operations. Typed forms retain the selected placement, such as values: mut `List<Int>`.

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

Prefer a valid empty list without a public null state or mandatory allocation for emptiness. A read-only list view does not imply that no authorized alias can modify its allocation. Bound checks should be defined and may be optimized when proven safe; their failure channel remains open alongside the broader fault policy.

The goal is specialized element storage and predictable allocation costs, without mandatory per-element boxing. No implementation, mandatory two/three-word ABI, growth factor, or measured performance is established.

Related: [sequence families](sequence-types.md), [arrays](arrays.md), [slices](slices.md), [reserved storage](reserved-storage.md), and [mutability](mutability.md).
