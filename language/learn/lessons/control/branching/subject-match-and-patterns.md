# Subject-Based `match`, Comparison Patterns, `or` Alternatives & Guards

Select behavior and extract structured values directly from a single-evaluated subject with literal, comparison, `or`, guard, and recursive record/tuple/array patterns.

## Walkthrough

1. `match n { 0 { ... } 1 or 2 or 3 { ... } >= 100 { ... } v if 10 <= v < 20 { ... } _ { ... } }` evaluates `n` once and tries arms top-to-bottom.
2. `match ok { true { "ok" } false { "fail" } }` is exhaustive for `Bool` without needing a trailing `_` arm.
3. Record patterns support compact field tests (`urgent == true`), nested subpatterns (`500 or 503 = code`), and `=name` shorthand (`= kind`) alongside `if` guards.
4. Fixed-array patterns (`[0, 0]`, `[0, _] or [_, 0]`, `[x, y] if x == y`) unpack static `[T; N]` elements cleanly.

> [!NOTE]
> Comparison patterns cannot be chained implicitly (`>= 10 < 20` is rejected). Bind the value and write a clear `if` guard (`v if 10 <= v < 20`), which falls through to later arms when false.

## Try Modifying This

1. Add a `404 = code` arm to `describeEvent` before the final `{ = kind }` fallback.
2. Add a `[x, y] if x < 0 or y < 0` arm to `classifyPair` and test negative coordinates.

See [Handbook: Conditionals, Match & Loops](lite://handbook/conditionals-match-and-loops), [Match](lite://doc/match), [Comparison Patterns](lite://doc/comparison-patterns), and [Match Guards](lite://doc/match-guards).
