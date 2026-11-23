# Loop `.collected` Filtering

Read an integer `n` followed by `n` integers into a list, then use a `loop ... { if .item > 0 { .item * 2 } }.collected` expression to collect every positive value doubled.

Print `doubled.length()` followed by either `"empty"` (when `doubled.isEmpty()`) or the space-separated doubled values.

## Requirements

- Use a single `loop ... { if .item > 0 { .item * 2 } }.collected` expression (no `mut List` + `pushBack` for the filtered result).
- Use `.length()` and `.isEmpty()` on the collected list.
