# Value Blocks, Final-Item Rule & Dead-Code Pruning

Understand Lite's unified `{ ... }` block semantics: statement blocks yield `Unit`, value blocks yield their final semicoloned-omitted expression, and pure dead bindings are safely eliminated.

## Walkthrough

1. `computed := { ... doubled + offset }` omits `;` after `doubled + offset` so the block evaluates cleanly to `17`.
2. `{ step := computed - 2; acc += step; }` ends with `;`, so it yields `Unit` and executes solely for updating `acc`.
3. `unusedValue` and `unusedClosure` have no side effects and are never read, so compiler DCE prunes them cleanly without changing output.
4. `ignoredResult := bump(3);` calls an effectful function—so DCE retains the call to preserve updates to `acc`.

> [!TIP]
> Switch **Output** to **Generated TS** (`Program` view) to verify `unusedValue` was stripped cleanly while `bump(3)` stays!

## Try Modifying This

1. Add a `;` after `doubled + offset` in `computed` and read the compile-time error.
2. Add another effectful statement inside `simplified` and confirm it executes.

See [Handbook: Blocks, Wiring & Closures](../../../handbook/execution/blocks-wiring-and-closures.md) and [Blocks & Results](../../../../../docs/blocks-and-results.md).
