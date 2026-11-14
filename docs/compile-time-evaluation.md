# Compile-time evaluation

Status: **general compile-time evaluation and known-input direction selected
2026-11-14; syntax and full execution contract under development**. This is
language design, not a claim of compiler or host support.

## General direction

Lite should support evaluating ordinary functions during compilation. A
function does not need a separate compile-time-only declaration merely to be
eligible: the same function can be called in a compile-time context or in a
runtime context. When an expression is explicitly evaluated during compilation,
its resulting supported value can be used by the compiled program without
repeating that evaluation at runtime. This is a stage choice, not a requirement
that all ordinary calls run during compilation.

A value can be known to the compiler without an explicit compile-time block.
In the example below, the literal initializer makes `x` known as `1`. An
immutable binding alone does not prove that every initializer is known during
compilation; a runtime input remains runtime-dependent.

```text
x := 1;  /* the value 1 is compile-time known */
```

The user's proposed explicit spelling uses a `comptime` block:

```text
/* Illustrative APIs and syntax; not a supported Lite program. */
y := comptime { readGameBoard(io.readFile("gamemap.raw")) }
```

The intended use includes calling ordinary user functions, reading a file,
reading a line of input, or fetching a resource during compilation. The
resulting supported value is available to the compiled program. The user
intends normal calls to be eligible broadly, including calls with effects; this
must not be reduced to a pure-only constant-folding feature.

```text
/* Illustrative API names and syntax, not supported programs. */
name := comptime { io.readLine() }     /* read while compiling */
asset := comptime { fetch(resourceLink) } /* fetch while compiling */
```

The names `io.readFile`, `io.readLine`, and `fetch` here illustrate behavior;
they do not select particular library APIs. Actual evaluation requires the
needed inputs and operations to be available at compilation. How host services
are provided, how external inputs are tracked, and what value representations
can be preserved remain open. The compiler need not already know an external
input before executing an explicit compile-time operation: its result becomes
known after the operation successfully completes.

## Possible implicit evaluation

The user also raised allowing more implicit compile-time evaluation, including
ordinary function calls whose results can be determined during compilation.
This remains a **question**, not a selected general rule. For example, whether
`x := one()` is implicitly known when `one := fn { 1 }` needs a decision;
the existence of an explicit `comptime` block does not decide it.

The user's example `a := 4 * 4; b := square(a);` and a possible rule for
module-level definitions are analyzed in the [implicit-known values and module
initialization investigation](../research/investigations/INV-062-implicit-known-values-and-module-initialization.md).
That investigation compares alternatives; it does not select them.
It also investigates an [explicit runtime counterpart](../research/investigations/INV-062-implicit-known-values-and-module-initialization.md#possible-explicit-runtime-counterpart)
for expressing the opposite stage intent. Its syntax and exact guarantees are open.

The staging boundary matters for effects. Reading a line or fetching a URL
while compiling is a different observable action from doing so when the
compiled program runs. Any implicit policy must make clear which invocation
occurs, at what stage, and how build inputs and repeated builds behave. Do not
assume that a pure-only model is the user's chosen restriction, or silently
move an ordinary runtime effect into the build under the existing design.

## Compile-time-required inputs

When a parameter or other context requires a compile-time-known value, the
supplied expression must be known at compilation. Literal or otherwise proven
known values can satisfy it without an explicit `comptime` block; the result
of a successful explicit compile-time evaluation can also satisfy it. A value
that depends on runtime input cannot satisfy the requirement merely because its
binding is immutable. Runtime computation does not become a fixed array extent
by being observed once.

The following uses **candidate generic and call syntax**, not a selected
compile-time parameter grammar:

```text
makeArray := fn <size: Int>(): [Int; size] {
    values: [Int; size];
    values
}

x := 3;
a := makeArray<x>();       /* intended: x is known, result [Int; 3] */
b := makeArray<3>();       /* intended: result [Int; 3] */
runtimeSize := readSize(); /* assume this reads runtime input */
c := makeArray<runtimeSize>(); /* reject: size is not compile-time known */
```

The example uses the selected fixed-array `[T; N]` concept. It does not yet
select `<size: Int>`, `makeArray<3>()`, how explicit generic arguments are
parsed, which constant types are allowed, or how size validity and overflow are
diagnosed. Whether compile-time values and type parameters share the angle
brackets is a separate design decision.

## Pending cases

These are contract examples to develop; they are not executable passes:

- **known literal:** a binding initialized with `1` can supply an otherwise
  compatible compile-time-required input without an explicit block.
- **runtime dependency:** an immutable binding initialized from runtime input
  cannot supply that input; the source is rejected rather than checked at
  runtime as if it had a static extent.
- **same function, two stages:** an ordinary function can be called with known
  data in an explicit compile-time context and with runtime data in an ordinary
  runtime context; both calls preserve the function's applicable semantics.
- **computed value:** a successful explicit compile-time computation produces
  a known result usable as a compatible compile-time-required input.
- **external input:** a compile-time block can call an ordinary parser on file
  contents when the necessary compile-time file access is available; its
  result can be incorporated into the compiled program where supported.
- **interactive input:** a reached explicit compile-time read obtains its line
  during compilation, and a program using its incorporated result does not
  repeat that read just to recover the value.
- **network input:** a reached explicit compile-time fetch requests the
  resource during compilation, and its successful result can be incorporated
  where supported; repeat-build and dependency rules remain open.
- **no duplicate execution:** the explicitly compiled computation is not
  repeated by the generated program merely to recover its result; effects
  occur at the stage at which the computation actually runs.
- **failure:** an evaluation that cannot produce a required compile-time value
  cannot be treated as a successful known value; exact error reporting and
  supported recovery remain to be designed.

Examples combining known arguments, runtime-dependent arguments, nonnegative
and invalid array extents, user-defined functions, and explicit file input need
independent executable cases when implementation is authorized.

## Open questions

The exact `comptime` syntax and block result rules; which expressions are
automatically proven known; eligible value types and materialization; calls
whose operations are unavailable to a compilation host; host versus target
semantics; effects and their ordering; file/environment dependency tracking,
caching and rebuilds; execution limits; permission and isolation policies;
failures and diagnostics; and target-dependent results remain open. These
questions do not negate the intended ability to request compile-time execution
of ordinary functions, including file, interactive-input, and network use cases.

Compile-time execution, compile-time-required arguments, and optional compiler
optimization are related but distinct. The selection does not imply that an
optimizer may move arbitrary side effects to compile time, or that a function
with an immutable result is necessarily compile-time evaluated. See
[INV-062](../research/investigations/TOPICS.md#inv-062) and
[generic notation](generic-notation.md).
