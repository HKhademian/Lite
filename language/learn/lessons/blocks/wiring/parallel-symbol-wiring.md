# Parallel Compile-Time Wiring & Nearer-Forward Shadowing

Explore how root scripts and inner blocks wire function references in parallel while eager initializers execute sequentially from outer to inner scopes.

## Walkthrough

1. `readLate := fn(): Int { lateRoot * 2 };` compiles cleanly even though `lateRoot := 15;` appears afterward!
2. Inside `wired := { ... }`, `isEven` and `isOdd` call each other across declaration order (mutual recursion) and `stepSum` calls itself cleanly.
3. In `precedence`, `d1()` sees the `depth := 9;` declared later in its own block, while `d2Fn` sees `depth := 2;`, demonstrating nearer-forward shadowing for deferred functions.
4. In `shadowRead`, the eager RHS `depth := depth + 40;` reads outer `depth` (`1`) before binding inner `depth` (`41`).

> [!IMPORTANT]
> Only *deferred* function bodies see forward bindings in the same block; eager initializers evaluate top-to-bottom.

## Try Modifying This

1. Swap the declaration order of `isEven` and `isOdd` to confirm parallel wiring is order-independent.
2. Change `lateRoot` from `15` to `25` and re-run.

See [Handbook: Blocks, Wiring & Closures](../../../handbook/execution/blocks-wiring-and-closures.md) and [Functions](../../../../../docs/functions.md).
