# Comptime Constants, Structural Records, Parameter Defaults & Variance

Compute `BIAS := comptime { 2 + 3 };`, read `start` and `width` from stdin, build a window via `makeWin(start = 0, width = 4, end = start + width + BIAS)`, store `{ base = w.start, end = w.end }` in an anonymous structural record, and invoke an adapted `fn(Int): (Int | String)` callable backed by `fn(v: Int | String): Int`.

Output `"end=<e> adapted=<a>"`.
