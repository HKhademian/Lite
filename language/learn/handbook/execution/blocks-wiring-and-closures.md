# Blocks, Wiring & Closures

A core strength of Lite is its **unified block model**: every file, function body, branch, loop body, and `{ ... }` scope follows the exact same evaluation, pruning, symbol wiring, and trace-safety rules.

## Value Blocks vs Statement Blocks

In any `{ ... }` block, statements (declarations and assignments ending in `;`) execute for their effects and bindings; ending a block with a declaration/assignment or `{ ...; () }` yields `Unit`, whereas a trailing value expression becomes the block's result value:

```lite
io := import "core/io";

hypotSq := {
    a := 3;
    b := 4;
    a * a + b * b
};
io.outputLine(hypotSq);
```

Pure unused local declarations and pure discarded expressions are pruned cleanly at compile time, while side-effecting expressions are preserved in execution order.

## Parallel Symbol Wiring & Shadowing

Inside every block—root script or nested scope—function bodies bind in **parallel**: two functions can call each other recursively (mutual recursion) or read variables initialized later in the same block, while eager initializer expressions execute sequentially and see outer bindings before shadowing them:

```lite
io := import "core/io";

isEven := fn(n: Int): Bool { if n == 0 { true } else { isOdd(n - 1) } };
isOdd := fn(n: Int): Bool { if n == 0 { false } else { isEven(n - 1) } };

depth := 1;
shadowRead := {
    depth := depth + 40;
    depth
};
io.outputLine("even(6):", isEven(6), "shadowRead:", shadowRead);
```

## Execution-Trace Safety

Both the TypeScript and C11 compilers trace forward and conditional initialization across eager code and function calls: reading an uninitialized `= ?` binding along any reachable execution trace is rejected at compile time.

## Functions, Named Routing, `self`, and Closures

Functions are first-class values (`fn(Param: Type): ReturnType { ... }`):

- Call arguments by position, by label (`scale(factor = 3, base = 5)`), or with shorthand `=arg`.
- Use `self(...)` for anonymous or refactored recursion.
- Omit parameter/return types on inline lambdas when contextual type info exists (`mapList(nums, fn(n) { n * 2 })`).
- Closures capture mutable bindings (`var` counters, `mut List<T>`, and per-iteration loop bindings) by lexical frame:

```lite
io := import "core/io";

makeCounter := fn(start: Int): fn(): Int {
    var cur := start;
    fn(): Int {
        cur += 1;
        cur
    }
};

c := makeCounter(10);
io.outputLine(c(), c());
```

See [Blocks & Results](lite://doc/blocks-and-results), [Functions](lite://doc/functions), and [Closures](lite://doc/closures).

## Next Chapter

Continue to [Imports, Visibility & Core I/O](lite://handbook/imports-visibility-and-io).
