# Drill: Shorthand Labels `=name` and Tuple Destructuring

Read `x` and `y` from stdin, build a labeled tuple `pt := (=x, =y);`, relabel it cleanly to `(col: Int, row: Int)`, destructure `(c, r) := ...`, and print `c * 10 + r`.

The starter swaps the tuple fields during destructuring (`(r, c)` instead of `(c, r)`). Fix the tuple binding order.
