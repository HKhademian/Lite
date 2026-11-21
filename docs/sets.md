# Typed sets

Status: **generated-TS `Set<T>` and `core/set` slice implemented; C backend set support deferred**.

`Set<T>` stores unique typed values with O(1) membership lookup, explicit `mut` mutation grants, and value-copy semantics on assignment.

## Purpose and beginner examples

Declare a set with an explicit `Set<T>` type annotation, optionally initialized with a `[elem, ...]` or `[]` literal. Zero-initialization also produces an empty set; reserved storage (`= ?`) is not supported for `Set`.

```text
io := import "core/io";
set := import "core/set";

fixedTags: Set<String> = ["lite", "typed", "lite"];
tags: mut Set<String> = ["lite"];
set.add(mut tags, "typed");

io.outputLine(tags, tags.size, tags.isEmpty, set.has(fixedTags, "lite"));
```

Run the interactive [typed sets example](lite://play/example/typed-sets), follow the [typed sets lesson](lite://learn/types/typed-sets), or inspect the [core/set module API](lite://module/core/set).

## Element contracts

- **Supported elements:** Scalar types (`Int`, `Int8`, `Int16`, `Int32`, `Int64`, `Float`, `Float32`, `Float64`, `Double`, `String`, `Bool`) and nominal `enum` types. Compound types (`List<T>`, `Map<K, V>`, `Set<T>`, records, tuples, functions) and `Unit`/`Never` are rejected as set elements.
- **Contextual `.Case` elements:** When `T` is an `enum`, contextual `.Case` shorthand works in `set.add(mut s, .Read)`, `set.has(s, .Read)`, and `set.remove(mut s, .Read)`.

## `core/set` operations

Import [core/set](lite://module/core/set) for set operations:

- `set.add(mut s, value)` — insert `value` if absent (`Unit`, O(1))
- `set.has(s, value)` — returns `Bool` membership (O(1))
- `set.remove(mut s, value)` — removes `value` and returns whether it existed (`Bool`, O(1))
- `set.size(s)` (or `s.size`) — returns element count (`Int`, O(1)); `s.isEmpty` returns `Bool`
- `set.clear(mut s)` — removes all elements (`Unit`, O(1))
- `set.values(s)` — returns `List<T>` in insertion order (O(n))

## Value semantics, traversal, and comparisons

- **Independent value copies:** Assigning a set (`snapshot: Set<String> = tags;`) copies its elements so later mutations to `tags` do not modify `snapshot`.
- **Insertion-order iteration:** `loop s as item { ... }` yields each element `T` in insertion order.
- **No direct equality comparison:** Comparing two sets with `==` or `=!=` is rejected at compile time.
- **C backend status:** The C backend currently rejects set values with `"C backend does not support set values yet"`.

## Verification and practice

- Feature verification: [typed-sets feature](lite://repo/language/verifications/features/types/collections/typed-sets.json)
- Runnable & rejection cases: [run-typed-set-ops](lite://repo/language/cases/types/collections/run-typed-set-ops.case.json), [reject-immutable-set-add](lite://repo/language/cases/types/collections/reject-immutable-set-add.case.json)
- Gym practice: [Mutable Set<T> Grants](lite://gym/drills/set-mut-grant) and [Unique Visitor Counter](lite://gym/workouts/unique-visitor-count)

Related: [lists](lite://doc/lists), [typed maps](lite://doc/maps), [collections and iterators](lite://doc/collections-and-iterators), [enums and variants](lite://doc/enums-and-variants), [mutability](lite://doc/mutability), [tour](lite://doc/tour), and [documentation index](lite://doc/overview).
