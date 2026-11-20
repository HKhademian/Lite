# Callable Types, Contextual Inference & Higher-Order Pipelines

Treat functions as first-class values: pass lambdas without redundant annotations, store them in lists, and compose `map` / `filter` / `fold` pipelines.

## Walkthrough

1. `IntOp := type fn(Int): Int;` and `IntCheck := type fn(Int): Bool;` give readable names to function signatures.
2. `applyOp(fn(k) { k * k + 1 }, 4)` infers both parameter type `k: Int` and return type `Int` directly from `IntOp`!
3. `ops: List<IntOp> = [...]` stores a pipeline of functions applied sequentially in a loop.
4. `mapList(filterList(source, fn(n) { n % 2 == 0 }), fn(n) { n * 2 })` composes functional transformations concisely.

> [!NOTE]
> Parameter-type inference triggers cleanly whenever the target expression has a known callable type (`IntOp`, `fn(Int): Bool`, etc.).

## Try Modifying This

1. Add a fourth step `fn(x) { x :/ 2 }` inside `ops` and predict `piped`.
2. Change `filterList` predicate to keep odd multiples of 3.

See [Handbook: Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures) and [Closures](lite://doc/closures).
