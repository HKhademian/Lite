# Typed Sets `Set<T>` & `core/set`

Lite provides typed value sets (`Set<T>`) with O(1) membership checks and deduplication, explicit `mut` mutation grants, and value-copy semantics on assignment.

## Key Concepts

- **Empty zero-initialization:** Declaring `roles: mut Set<String>;` starts with an empty set. Reserved storage (`= ?`) is rejected.
- **Scalar & enum elements:** Elements must be scalar (`Int*`, `Float*`, `String`, `Bool`) or nominal `enum` types so membership uses value equality.
- **Explicit `core/set` operations:** Import [core/set](lite://module/core/set) for `add(mut s, v)`, `has(s, v)`, `remove(mut s, v)`, `size(s)`, `clear(mut s)`, and `values(s)`.
- **Value snapshots & iteration:** Assigning a set (`frozen: Set<String> = roles;`) copies its elements independently, and `loop frozen as role` yields elements in insertion order.

## Try It

1. Add a third role `"admin"` to `roles` before creating `frozen`, and observe how both `live` and `frozen` change.
2. Call `set.values(frozen)` to turn the set into a `List<String>`.
3. Practice explicit `mut` grants in [Mutable Set<T> Grants](lite://gym/drills/set-mut-grant) and build a deduplicator in [Unique Visitor Counter](lite://gym/workouts/unique-visitor-count).

See [Typed sets](lite://doc/sets) and [Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases) for the full contract.
