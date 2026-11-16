# Loops, Sequence Metadata, Break Values & Then

All iteration in Lite flows through `loop`—from `while`-style conditional loops to expression-returning sequence traversals with `.index`, `.count`, `.value`, and `then`.

## Walkthrough

1. `loop n <= 5 { ... }` runs until the condition becomes false.
2. `loop weights as w` binds each element cleanly while `.value` holds the running tail result across iterations and `.index` gives the 0-based index.
3. `break item;` inside a value loop sets `.value` early and jumps straight to the `then { ... }` clause.
4. `then { .value + .count }` transforms the loop result using total iteration `.count`.

> [!NOTE]
> Inside a `then` block, `.value` carries either the last iteration's expression value or the payload passed to `break value;`.

## Try Modifying This

1. Change `if item > 50 { break item; }` to `if item > 100` to see what `.value` and `.count` become when the loop finishes naturally.
2. Compute a sum with `loop [1, 2, 3, 4] { .value + .item }` without a separate `var` accumulator.

See [Handbook: Conditionals, Match & Loops](../../../handbook/control/conditionals-match-and-loops.md) and [Loops](../../../../../docs/loops.md).
