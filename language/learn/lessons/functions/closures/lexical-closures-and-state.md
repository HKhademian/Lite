# Lexical Closures Capturing State, Lists & Loop Items

Closures in Lite capture surrounding mutable `var` bindings, shared `mut List<T>` collections, and per-iteration loop bindings accurately even after enclosing scopes return.

## Walkthrough

1. `makeCounter(start, step)` allocates an independent mutable `var current` box per call—so `cFast` and `cOffset` advance independently.
2. `pushScaled` inside the inner scope captures `threshold` and appends directly into the outer `events: mut List<Int>`.
3. Inside `loop [1, 2, 3] as item`, each closure captures its own iteration snapshot (`10`, `20`, `30`), avoiding the classic shared-loop-variable pitfall!

> [!TIP]
> Notice loop closures capture *per-iteration* bindings automatically—no manual copy workaround required.

## Try Modifying This

1. Create a third counter `makeCounter(50, -5)` and call it twice.
2. Inspect **Generated TS** to see how closure captures and loop bindings compile cleanly.

See [Handbook: Blocks, Wiring & Closures](../../../handbook/execution/blocks-wiring-and-closures.md) and [Closures](../../../../../docs/closures.md).
