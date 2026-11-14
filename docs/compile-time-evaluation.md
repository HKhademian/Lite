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

The intended use includes calling ordinary user functions and reading a file
during compilation, with the resulting game board available to the compiled
program. `io.readFile` here is illustrative; it does not select a particular
library API. Which host operations are available, how external inputs are
tracked, and what value representations can be preserved are open. The example
must not be reduced to a pure-only constant-folding feature. A compiler is not
required to have read the file before it executes the explicit compile-time
operation; the result is known after successful evaluation.

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
questions do not negate the selected ability to request compile-time execution
of ordinary functions or the file-reading use case.

Compile-time execution, compile-time-required arguments, and optional compiler
optimization are related but distinct. The selection does not imply that an
optimizer may move arbitrary side effects to compile time, or that a function
with an immutable result is necessarily compile-time evaluated. See
[INV-062](../research/investigations/TOPICS.md#inv-062) and
[generic notation](generic-notation.md).
