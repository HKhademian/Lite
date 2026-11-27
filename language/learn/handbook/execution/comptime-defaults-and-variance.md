# Comptime, Defaults & Variance

Lite evaluates ordinary functions at compile time with `comptime { ... }`, unifies symbol/function re-exports under `:= alias`, supports inferred parameter defaults (`?:` omission), and checks callable conversions with full variance.

## Compile-Time Evaluation (`comptime { ... }`) & Pure Modules

Both TypeScript and native C11 builds embed the same portable compile-time evaluator (`comptime { ... }`). Ordinary functions run identically at compile time or runtime, Stage-1 `.lt` module initializers evaluate pure constants automatically, and compile-time values flow straight into fixed array sizes `[T; N]` and owned constants:

```lite
io := import "core/io";

fib := fn(n: Int): Int {
    if n <= 1 { n } else { fib(n - 1) + fib(n - 2) }
};

TABLE_LEN := comptime { fib(6) };
lookup: List<Int> = comptime {
    mut xs: List<Int> = [];
    loop 0..8 as i {
        mut xs.pushBack(fib(i));
    }
    xs
};
zeroGrid: [Int; TABLE_LEN] = [0; TABLE_LEN];
io.outputLine(TABLE_LEN, lookup[7], zeroGrid.length());
```

## Unified `:= alias`, Parameter Defaults & `?:`

`alias` uniformly aliases types, values, modules, overloaded function sets, and partial generic specializations (`ivec2 := alias vecN<Int, 2>`). Function implementations may omit parameter types when a default expression determines the type (`count = 3`) and read earlier prepared parameters in declaration order (`end = start + count`); function *types* record omission permission via `?:`:

```lite
io := import "core/io";

makeSpan := fn(start = 0, count = 3, end = start + count): (start: Int, end: Int, count: Int) {
    (start = start, end = end, count = count)
};

mk := alias makeSpan;
a := mk();
b := mk(start = 10, count = 5);
io.outputLine(a.start, a.end, b.start, b.end);
```

## Callable Value Variance

Typed callable variables (`fn(Param): Ret`) check compatibility contravariantly in value parameters, covariantly in return types and fallible `T ! E` outcomes, and invariantly in `mut` parameters—preserving implementation defaults cleanly:

```lite
io := import "core/io";

describeAny := fn(v: Int | String, pad: Int = 1): Int {
    (if v: Int { v } else { v.length() }) + pad
};

useInt: fn(n: Int, pad?: Int): (Int | String) = describeAny;
res := useInt(41);
io.outputLine(if res: Int { res.toText() } else { res });
```

See [Compile-Time Evaluation](lite://doc/compile-time-evaluation), [Type Aliases](lite://doc/type-aliases), [Callable Default Contracts](lite://doc/callable-default-contracts), and [Callable Value Variance](lite://doc/callable-value-variance).
