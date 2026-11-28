# Typed Maps `Map<K, V>` & `type/map`

Lite provides typed key-value maps (`Map<K, V>`) with O(1) lookup, explicit `mut` mutation grants, and value-copy semantics on assignment.

## Key Concepts

- **Literals & zero-initialization:** Initialize with `mut prices: Map<String, Int> = ["apple" = 3];` (or inferred `defaults := ["apple" = 3];`, or empty `empty: Map<String, Int>;` / `= []`). Reserved storage (`= ?`) is rejected.
- **Scalar & enum keys:** Keys must be scalar (`Int*`, `Float*`, `String`, `Bool`) or nominal `enum` types so lookup uses value equality.
- **Indexed reads & writes:** Write with `prices["apple"] = 4;` or `prices["apple"] += 1;` (requires `mut Map<K, V>`) and read with `prices["apple"]` (faults with `KeyPanic` if the key is missing).
- **Operations (`type/map`):** Call `prices.size()` (`Int`), `prices.isEmpty()` (`Bool`), `prices.set(k, v)`, `prices.get(k)` (returning `(found: Bool, value: V)`), `prices.getOr(k, fallback)`, `prices.has(k)`, `prices.remove(k)`, `prices.clear()`, `prices.keys()`, and `prices.values()` directly on any `Map<K, V>`.
- **Value snapshots & iteration:** Assigning a map (`frozen: Map<String, Int> = prices;`) copies its entries independently, and `loop frozen as entry` yields `(key: K, value: V)` in insertion order.

## Try It

1. Add a third item `"coffee"` with price `7` to `prices` before creating `frozen`, and check how `frozen total` changes.
2. Read a missing key with `map.getOr(prices, "milk", 2)` and compare it with `map.get(prices, "milk")`.
3. Practice explicit `mut` grants in [Mutable Map<K, V> Grants](lite://gym/drills/map-mut-grant) and build a tally in [Word Frequency Counter](lite://gym/workouts/word-frequency-counter).

See [Typed maps](lite://doc/maps) and [Tuples, Arrays, Lists & Aliases](lite://handbook/tuples-arrays-lists-and-aliases) for the full contract.
