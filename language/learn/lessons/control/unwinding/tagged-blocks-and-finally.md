# Labeled `@tag` Exits & LIFO `finally` Cleanup

Target outer scopes or loops safely from deeply nested code using `@tag` transfers while `finally` guarantees cleanup runs in strict inner-to-outer order.

## Walkthrough

1. `@pick { ... }` attaches a label to a value-producing block.
2. `return @pick row * col;` unwinds out of both `@col` and `@grid` loops directly to `@pick`.
3. As execution unwinds across `{ ... } finally { ... }`, the inner `finally` executes *before* the outer `finally` (LIFO), visible in `log` output.
4. `@tagIf if ... then { @tagIf.value + "-checked" }` reads the tagged conditional's result cleanly inside its `then` hook.

> [!IMPORTANT]
> `finally` blocks run on every exit path: normal completion, `break`, `return @tag`, or panics.

## Try Modifying This

1. Change the `if row * col >= 12` threshold to `100` (unreachable) and inspect how `selected`, `summary`, and the cleanup trace behave.
2. Inspect the **Generated TS** tab in **Program** view to see how `@tag` unwinding and `finally` translate cleanly.

See [Handbook: Conditionals, Match & Loops](lite://handbook/conditionals-match-and-loops) and [Finally](lite://doc/finally).
