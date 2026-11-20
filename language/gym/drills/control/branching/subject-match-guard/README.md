# Drill: Subject-Based `match` & Range `if` Guard

Read an integer `n` from stdin and classify it using subject-based `match n { ... }`:
- `0` -> `"zero"`
- `1 or 2 or 3` -> `"small"`
- `10 <= n < 20` -> `"teens"`
- `>= 20` -> `"high"`
- anything else -> `"other"`

The starter writes an invalid chained comparison pattern `>= 10 < 20`. Replace it with a binding and `if` guard: `v if 10 <= v < 20`.
