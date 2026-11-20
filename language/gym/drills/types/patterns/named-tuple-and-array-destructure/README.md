# Drill: Named Tuple & Fixed-Array Destructuring

Read `a` and `b` from stdin, build `pair := (right = b, left = a);` (note the fields are ordered `right` first, then `left`), destructure by field name `(l = left, = right) := pair;`, store `[l, right, l * 10 + right]` in a fixed `[Int; 3]` array, destructure `[first, second, combined] := trio;`, and print `first`, `second`, `combined`.

The starter destructures `pair` positionally as `(l, right) := pair;`, swapping `a` and `b`. Switch to named tuple destructuring (`l = left, = right`).
