# Mutable `Set<T>` Grants

`Set<T>` bindings are read-only by default. Inserting or removing elements with `mut s.add(v)` or `mut s.remove(v)` requires a `mut Set<T>` binding and an explicit `mut` grant.

Fix the binding declaration so the starter reads an integer `x` from stdin, adds `10` and `x` to `seen`, and prints `seen.size()`.
