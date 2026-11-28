# `comptime`, Structural `{ ... }` Records, Parameter Defaults & Variance

Evaluate ordinary Lite functions at compile time via `comptime { ... }`, construct anonymous structural `{ ... }` records, re-export symbols with `alias`, infer parameter defaults, and pass functions through contravariant/covariant callable types.

## Walkthrough

1. `LIMIT := comptime { stepScore(3) };` computes `10` during compilation so `zeros: [Int; LIMIT]` gets a known static array extent on both TS and C11.
2. `meta := { =name, "slot count" = LIMIT, nested = { ... } };` builds an anonymous structural record directly without a nominal `record` declaration.
3. `buildWindow` infers `start` and `width` types from their defaults (`0`, `5`), computes `end = start + width` from earlier parameters, and is re-exported cleanly via `winAlias := alias buildWindow;`.
4. `intAdapter: fn(Int, ?:Int): (Int | String) = evalFlexible;` adapts an `Int | String` parameter contravariantly to `Int` and widens the `Int` return covariantly to `Int | String`.

## Try Modifying This

1. Call `winAlias(width = 12)` without passing `start` and inspect `end`.
2. Swap the target of `comptime { ... }` to another pure function returning an `Int` array size.

See [Handbook: Comptime, Defaults & Variance](lite://handbook/comptime-defaults-and-variance), [Compile-Time Evaluation](lite://doc/compile-time-evaluation), and [Callable Value Variance](lite://doc/callable-value-variance).
