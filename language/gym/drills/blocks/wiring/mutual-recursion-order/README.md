# Drill: Parallel Wiring & Mutual Recursion

Root and block functions in Lite wire in parallel, so `isEven` and `isOdd` can call each other cleanly regardless of declaration order.

The starter's base cases in `isEven` / `isOdd` are inverted (`isEven(0)` returns `false`), and negative `n` isn't handled with `if n < 0`. Fix both base cases cleanly for non-negative `n`.
