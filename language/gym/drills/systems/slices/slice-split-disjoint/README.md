# Drill: Disjoint Mutable `Slice<T>` via `splitAt(mid)`

Read `n`, `n` integers into `mut xs: List<Int>`, then read `leftDelta` and `rightDelta`.

Borrow a mutable slice `mut view := mut xs[0..n];` inside a `do { ... }` block, split it at `mid := n :/ 2;` via `(left, right) := mut view.splitAt(mid);`, and add `leftDelta` to every element in `left` and `rightDelta` to every element in `right` using `loop mut`.
