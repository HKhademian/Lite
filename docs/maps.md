# Typed maps

Status: **generated-TS `Map<K, V>` and `core/map` slice implemented; C backend map support deferred**.

`Map<K, V>` stores typed key-value entries with O(1) lookup, explicit `mut` mutation grants, and value-copy semantics on assignment.

## Purpose and beginner examples

Declare a map with an explicit `Map<K, V>` type annotation. Zero-initialization produces an empty map; reserved storage (`= ?`) is not supported for `Map`.

```text
io := import "core/io";
map := import "core/map";

scores: mut Map<String, Int>;
scores["alice"] = 10;
map.set(mut scores, "bob", 25);
scores["alice"] = 18;

io.outputLine(scores["alice"], map.getOr(scores, "carol", 0));
```

Run the interactive [typed maps example](lite://play/example/typed-maps), follow the [typed maps lesson](lite://learn/types/typed-maps), or inspect the [core/map module API](lite://module/core/map).

## Key and value contracts

- **Supported keys:** Scalar types (`Int`, `Int8`, `Int16`, `Int32`, `Int64`, `Float`, `Float32`, `Float64`, `Double`, `String`, `Bool`) and nominal `enum` types. Compound types (`List<T>`, `Map<K, V>`, records, tuples, functions) and `Unit`/`Never` are rejected as keys.
- **Supported values:** Any value type (scalars, enums, records, tuples, `List<T>`, nested `Map<K, V>`, or function values). `Unit` and `Never` are rejected as map value types.
- **Contextual `.Case` keys:** When `K` is an `enum`, contextual `.Case` shorthand works in `m[.Active] = ...`, `m[.Active]`, and `core/map` calls.

## Indexing and `core/map` operations

Direct indexing (`m[key]`) looks up `key` in O(1) time and faults with `KeyPanic: missing map key` if the key is absent. Writing (`m[key] = value;`) requires a `mut Map<K, V>` binding.

Import [core/map](lite://module/core/map) for explicit operations:

- `map.set(mut m, key, value)` — insert or overwrite an entry (`Unit`)
- `map.get(m, key)` — returns `(found: Bool, value: V)` without faulting on missing keys
- `map.getOr(m, key, fallback)` — returns the stored value or `fallback`
- `map.has(m, key)` — returns `Bool` membership
- `map.remove(mut m, key)` — removes `key` and returns whether it existed (`Bool`)
- `map.size(m)` — returns entry count (`Int`)
- `map.clear(mut m)` — removes all entries (`Unit`)
- `map.keys(m)` — returns `List<K>` in insertion order
- `map.values(m)` — returns `List<V>` in insertion order

## Value semantics, traversal, and comparisons

- **Independent value copies:** Assigning a map (`snapshot: Map<String, Int> = scores;`) copies its entries so later mutations to `scores` do not modify `snapshot`.
- **Insertion-order iteration:** `loop m as entry { ... }` yields `(key: K, value: V)` pairs in insertion order.
- **No direct equality comparison:** Comparing two maps with `==` or `=!=` is rejected at compile time.
- **C backend status:** The C backend currently rejects map values with `"C backend does not support map values yet"`.

## Verification and practice

- Feature verification: [typed-maps feature](lite://repo/language/verifications/features/types/collections/typed-maps.json)
- Runnable & rejection cases: [run-typed-map-ops](lite://repo/language/cases/types/collections/run-typed-map-ops.case.json), [reject-immutable-map-write](lite://repo/language/cases/types/collections/reject-immutable-map-write.case.json)
- Gym practice: [Mutable Map<K, V> Grants](lite://gym/drills/map-mut-grant) and [Word Frequency Counter](lite://gym/workouts/word-frequency-counter)

Related: [lists](lite://doc/lists), [typed sets](lite://doc/sets), [collections and iterators](lite://doc/collections-and-iterators), [enums and variants](lite://doc/enums-and-variants), [mutability](lite://doc/mutability), [tour](lite://doc/tour), and [documentation index](lite://doc/overview).
