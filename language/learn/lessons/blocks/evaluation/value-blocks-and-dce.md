# Value Blocks, Final-Expression Rule & Dead-Code Pruning

Understand Lite's unified `do { ... }` value block semantics: blocks ending in a declaration or assignment yield `Unit`, blocks ending in a value expression yield that result, and pure dead bindings are safely eliminated.

## Walkthrough

1. `computed := do { ... doubled + offset }` ends with the value expression `doubled + offset` so the block evaluates cleanly to `17`.
2. `{ step := computed - 2; acc += step; }` ends with an assignment, so it yields `Unit` and executes solely for updating `acc`.
3. `unusedValue` and `unusedClosure` have no side effects and are never read, so compiler DCE prunes them cleanly without changing output.
4. `ignoredResult := bump(3);` calls an effectful function—so DCE retains the call to preserve updates to `acc`.

> [!TIP]
> Switch **Output** to **Generated TS** (`Program` view) to verify `unusedValue` was stripped cleanly while `bump(3)` stays!

## Try Modifying This

1. Replace `doubled + offset` with `res := doubled + offset;` in `computed` and read the compile-time error (`cannot declare a Unit local`).
2. Add another effectful statement inside `simplified` and confirm it executes.

See [Handbook: Blocks, Wiring & Closures](lite://handbook/blocks-wiring-and-closures) and [Blocks & Results](lite://doc/blocks-and-results).
