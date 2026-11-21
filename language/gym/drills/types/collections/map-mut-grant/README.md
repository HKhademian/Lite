# Mutable `Map<K, V>` Grants

`Map<K, V>` bindings are read-only by default. Writing with `m[k] = v` or calling `map.set(mut m, k, v)` requires a `mut Map<K, V>` binding and an explicit `mut` grant.

Fix the binding and `map.set` call so the starter reads an integer bonus from stdin, stores `"bonus"` in `scores`, and prints `scores["base"] + scores["bonus"]`.
