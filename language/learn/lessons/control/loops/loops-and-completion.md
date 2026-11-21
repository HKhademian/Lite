# Loops, Sequence Metadata, Break Values & Then

All iteration in Lite flows through `loop`—from `while`-style conditional loops to expression-returning sequence traversals with `.index`, `.count`, `.value`, and `then`.

## Walkthrough

1. `loop n <= 5 { ... }` runs until the condition becomes false.
2. `loop weights as w` binds each element cleanly while `.value` holds the running tail result across iterations and `.index` gives the 0-based index.
3. `break item;` inside a value loop sets `.value` early and jumps straight to the `then { ... }` clause.
4. `then { .value + .count }` transforms the loop result using total iteration `.count`, and `.collected` (or the direct suffix `loop xs { ... }.collected`) gathers every committed iteration into a `List<T>`.
5. Partial `if` and `match` tails filter cleanly: `loop xs { if .item > 0 { .item * 2 } }.collected` commits only when the condition matches and leaves `.value`/`.collected` untouched otherwise.

> [!NOTE]
> Inside a `then` block, `.value` carries either the last iteration's expression value or the payload passed to `break value;`, and `.collected` holds all committed values in order (with zero allocation when unused).

## Try Modifying This

1. Change `if item > 50 { break item; }` to `if item > 100` to see what `.value` and `.count` become when the loop finishes naturally.
2. Compute a sum with `loop [1, 2, 3, 4] { .value + .item }` or filter-transform with `loop [-2, 3, 5] { if .item > 0 { .item * 2 } }.collected`.

See [Handbook: Conditionals, Match & Loops](lite://handbook/conditionals-match-and-loops) and [Loops](lite://doc/loops).
