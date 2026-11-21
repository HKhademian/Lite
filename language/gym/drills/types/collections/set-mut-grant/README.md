# Mutable `Set<T>` Grants

`Set<T>` bindings are read-only by default. Inserting or removing elements with `set.add(mut s, v)` or `set.remove(mut s, v)` requires a `mut Set<T>` binding and an explicit `mut` grant.

Fix the binding and `set.add` call so the starter reads an integer `x` from stdin, adds `10` and `x` to `seen`, and prints `set.size(seen)`.
