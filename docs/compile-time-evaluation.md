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

## Pure calls with known inputs

Selected 2026-11-14: a pure, side-effect-free computation with
compile-time-known inputs is itself compile-time known. In particular,
`f(known)` is known when `f` and everything its result depends on are known
and the computation is pure. The same inputs lead to the same result regardless
of how many times the computation is called. This is a language direction, not
an optional optimization or an assertion that the current compiler supports it.

```text
square := fn (x: Int): Int { x * x }
a := 4 * 4;     /* compile-time known: 16 */
b := square(a); /* compile-time known: 256 */
```

The callable's ordinary declaration need not acquire a new `pure` or
`comptime` marker for this direction. A pure function called with a
runtime-dependent argument does not thereby produce a known value. Purity and
known inputs must account for transitive calls and other dependencies, including
captured state; an external or changing input is not made known merely by
wrapping it in a function. A known result is distinct from a guarantee that a
particular machine instruction must or must not execute at runtime.

This direction does not decide the complete purity/effect system, how the
compiler establishes these facts, incomplete proofs, materializable result
types, nontermination, faults, resource limits, or their diagnostics. It does
not require rejecting ordinary runtime calls just because their inputs are not
known. The proposed explicit runtime counterpart and its interaction with a
known pure result remain open.

The user's example `a := 4 * 4; b := square(a);` and a possible rule for
module-level definitions are analyzed in the [implicit-known values and module
initialization investigation](../research/investigations/INV-062-implicit-known-values-and-module-initialization.md).
That investigation records the selected pure-call direction and compares
remaining alternatives.
It also investigates an [explicit runtime counterpart](../research/investigations/INV-062-implicit-known-values-and-module-initialization.md#possible-explicit-runtime-counterpart)
for expressing the opposite stage intent. Its syntax and exact guarantees are open.

The staging boundary still matters for effects. Reading a line or fetching a URL
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
- **pure call with known input:** `square(4)` and `square(a)` in the example
  are known as `16` and `256` respectively without an explicit block; both can
  feed an otherwise compatible compile-time-required input.
- **runtime argument:** `square(runtimeValue)` is not known merely because
  `square` is pure; it remains an ordinary runtime call where permitted.
- **transitive dependencies:** a function wrapping a read or depending on
  mutable runtime state is not proven pure and known merely by its name or by
  an immutable local binding. Nested pure calls with known inputs follow the
  selected pure-call direction.
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

The exact `comptime` syntax and block result rules; the complete rules for
proving purity and automatically known values; eligible value types and materialization; calls
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
