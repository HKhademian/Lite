# Workout: Matrix Saddle Point

Read `rows`, `cols`, and `rows * cols` row-major integers from stdin.
A **saddle point** is an element at `(r, c)` that is simultaneously the **minimum** in its row `r` (allowing ties) and the **maximum** in its column `c` (allowing ties).

Scan in row-major order and print the first saddle point as `<r>,<c>:<value>` (0-based coordinates), or `"NONE"` if none exists (or if dimensions `<= 0`).
