# Workout: Minimum-Cost Grid Path (Dijkstra)

Read `rows`, `cols`, followed by `rows * cols` non-negative integer cell costs in row-major order.
Find the minimum total path cost from top-left `(0, 0)` to bottom-right `(rows - 1, cols - 1)` moving in 4 cardinal directions (`up`, `down`, `left`, `right`).
The total path cost includes both the starting cell `(0, 0)` and the destination cell `(rows - 1, cols - 1)`. Print `INVALID` if `rows <= 0` or `cols <= 0`.
