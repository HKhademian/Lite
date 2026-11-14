# Implicit known values and module initialization

Status: **bounded investigation, 2026-11-14; pure calls with known inputs
subsequently selected, remaining options unselected; no implementation evidence**. Relates to INV-062.01–.02 and
INV-003.05. The user would like ordinary literal arithmetic and ordinary
function calls with known inputs to be usable as compile-time-known values,
and asks whether module top-level definitions should require compile-time-known
values.

## Existing decisions and terminology

The selected [compile-time direction](../../docs/compile-time-evaluation.md)
allows explicit compile-time evaluation of ordinary functions, including the
intended file, interactive input, and network use cases. Compile-time-required
inputs must be known during compilation. A literal binding such as `x := 1` is
known, while a runtime-dependent initializer is not known merely because its
binding is fixed. General implicit evaluation, effects, exact syntax and
materialization remain open.

The selected [source-kind direction](../../docs/modules-and-packages.md#distinct-script-and-module-files)
distinguishes executable `.lts` scripts from declaration-oriented `.lt`
modules. The user referred to `.lite` files in the current question; this note
investigates the proposal for module top level as a working interpretation,
without selecting a change to file extensions or assuming it applies to scripts.
The compiler's current `.lts` namespace imports are a separate implemented
slice; they do not establish the future `.lt` initialization policy.

## The motivating example

```text
square := fn (x: Int): Int { x * x }
a := 4 * 4;
b := square(a);
```

The desired candidate behavior is that `a` is known as `16` and `b` as `256`
during compilation, without an annotation or explicit compile-time block.
The function definition is itself usable as a callable, while executing its
body is a separate event. The user subsequently selected known pure calls as
compile-time known; the full inference algorithm and compiler support remain
open. See [pure calls with known inputs](../../docs/compile-time-evaluation.md#pure-calls-with-known-inputs).

Three concepts must not be conflated:

1. **Proven value:** the compiler can establish what an expression's value is.
2. **Execution stage and effects:** its operations occur during compilation,
   program execution, or both because the source explicitly asks for both.
3. **Optimization:** generated work may be removed only while preserving the
   observable behavior required by the eventual contract.

For simple arithmetic these can look the same. A function that reads input,
prints, fetches a URL, fails, or does not terminate exposes the differences.
Knowing the returned value alone does not prove that discarding or moving a
call preserves its effects.

## Implicit evaluation options

The following alternatives predate the selected pure-call rule and remain useful
for its unresolved boundaries and for effectful operations. They are not a
list of constraints already placed on Lite's compile-time engine.

### A. Required-context evaluation

When a value is required at compile time, try to evaluate an ordinary expression
whose inputs are available. Simple literal arithmetic and `square(a)` can
satisfy that requirement. Outside a required context, evaluating early is an
optimization subject to ordinary observable behavior. This keeps a normal
runtime call's stage unless a surrounding rule requires compile-time evaluation.

The subsequent selection makes a pure computation with known inputs known;
proof boundaries and the treatment of other ordinary initializers remain open.
Reexecuting an effectful initializer would be observable.

### B. Implicit early evaluation when justified

Treat ordinary expressions and calls as known when the compiler can establish
their result and preserve the selected stage/effects. This can make `b` known
everywhere without special syntax. The language would need a stable minimum
contract: if acceptance of a compile-time-required input depends only on an
optional optimizer, changing compiler version or optimization level could turn a
valid program into an error. Exact eligibility, failure, termination, caching,
and diagnostics need specification.

### C. General implicit execution, including effects

Automatically run a broader class of calls at compilation, including possibly
I/O, when their inputs are available. This follows the user's broad interest
in effectful compile-time execution, but it is a stronger change to ordinary
program behavior: `io.readLine()` or `fetch(url)` would act during the build
if selected by the rule. Define when this happens, how it is visible, what a
rebuild means, and whether the program must also execute the operation. Do not
assume a pure-only language or forbid this option; equally, do not silently
select it as the meaning of ordinary calls.

These choices are not mutually exclusive in every detail: Lite could select
required-context evaluation plus a separately defined general known-value rule.
Explicit `comptime { ... }` remains the illustrated way to request the stage,
including for interactive or external operations, subject to its still-open
grammar and host contract.

### Possible explicit runtime counterpart

The user also proposes exploring an explicit **runtime** construct as the
opposite stage guarantee. `runtime { ... }` below is a placeholder, not
selected syntax or an implemented feature:

```text
buildName := comptime { io.readLine() }  /* read during compilation */
runName := runtime { io.readLine() }     /* candidate: read when reached at runtime */
```

This could let ordinary code benefit from implicit known values while making
the desired timing explicit when a programmer needs it. It would be a stage
request in the language, distinct from assuming that I/O functions are always
runtime-only or compile-time-only. Ordinary functions would remain usable in
either context where their operations and inputs are available.

There are two variants to investigate rather than silently equating them:

- **Observable-effect timing:** observable operations in a reached runtime
  block occur at runtime with the required order and count; safe optimizations
  may still precompute or eliminate unobservable work.
- **Strict runtime execution:** the block's specified evaluation is required
  at runtime even for otherwise precomputable or unobserved work. This is
  stronger than effect timing and needs an explicit account of which operations
  must execute and what it means to observe that guarantee.

Both require reachability: neither should execute an untaken runtime branch
merely because a block is marked. Consider failure timing, resource and input
availability, visible output before a failure, repeated function calls, and
how the marker composes with function calls and nested stage contexts. In
particular, should a nested explicit `comptime` expression be evaluated during
compilation inside a runtime block, or should the blocks conflict? The reverse
nesting needs its own rule. No nesting answer is selected here.

Also separate a provably predictable **value** from a required **execution
stage**: a compiler might prove a runtime-marked `4 * 4` equals `16` while
still having to preserve whatever execution guarantee the chosen runtime
construct makes. Whether such a value can satisfy a compile-time-required
input, and whether doing so conflicts with either variant, must be decided
explicitly; don't infer the answer just from constant folding.

## Module-level policy options

The user's candidate is a module whose top-level definitions must be known at
compilation. It is essential to specify **what** must be known. A function's
callable definition can be available during compilation without calling its
body, and a mutable global's **initial value** can be known without its later
runtime values remaining known.

```text
/* Illustrative module declarations: imports/visibility omitted. */
square := fn (x: Int): Int { x * x } /* do not call body to define it */
width := 4 * 4;                      /* candidate known initial value */
var counter := 0;                    /* known initial value; mutable later */
board := comptime { loadBoard() }    /* explicit build-time operation */
live := readRuntimeSetting();         /* assume runtime-only input */
```

- **Compile-time initialization:** require each applicable top-level value
  initializer to produce a valid compile-time-known initial value. The first
  four examples can be considered for admission; `live` cannot be a runtime
  initializer under this option. Which definitions, storage forms, function
  captures, foreign imports, and explicit effectful initializers are admitted
  needs separate specification. A build-time value is not automatically
  serializable or suitable for a target runtime.
- **Runtime module initialization:** permit runtime initializers and define
  their ordering, dependencies, cycles, imports, and failure behavior. This
  accommodates `live` but requires a runtime initialization model.
- **Explicit runtime initialization:** require compile-time-known module
  initial values, while putting runtime setup in an explicit callable invoked
  by the application. Exact syntax, module ownership, and enforcement of such
  an entry are not selected. This preserves the possibility of runtime services
  without relying on implicit import-time execution.

Compile-time-known initialization is not the same as a rule forbidding
effects: the user explicitly wants file, input, and network operations to be
possible during compilation. A module initializer with `comptime { fetch(...) }`
could have a known result *and* a build-time effect. Conversely, creating a
function whose body can perform runtime I/O does not itself perform that I/O.
Whether effectful initializers must be explicit or may be implicit is open.

## Interactions that need decisions

- **Order and cycles:** the existing module direction permits safe forward
  declaration lookup, not arbitrary reordering of effects. Define dependency
  scheduling, effect ordering, cycle diagnostics, and function-body references
  separately. An explicitly effectful initializer must not be silently
  skipped, duplicated, or reordered by an assumed pure dependency graph.
- **Mutable state and aliases:** a known initial value for `var counter`
  doesn't mean every later read is known. Read-only access is not deep
  immutability or proof of no effects; aliasing and transitive calls matter.
- **Compile-time resources:** strings, arrays, records, unions, references,
  function values, host handles, and allocator-owned graphs do not necessarily
  share a materialization rule. Define what can be preserved for a target,
  relocated, reconstructed, or rejected; don't encode a live compiler-process
  file handle as an assumed valid runtime handle.
- **Calls and control flow:** known arguments alone do not prove a body returns,
  avoid a fault, or avoid runtime-only inputs. Specify recursion/loop limits,
  indirect calls, branch reachability, error and panic behavior, and whether
  unsupported evaluation is a diagnostic or a runtime fallback in each context.
  An untaken branch must not be executed merely to infer a value.
- **External observations:** explicit build-time file, terminal and network
  interactions require defined order and invocation timing. Track changed
  inputs and decide how caching, incremental rebuilds, multiple consumers,
  parallel builds, and failures affect repetition. Don't claim hermetic or
  reproducible builds merely from a compile-time-known result.
- **Build versus run target:** describe which environment supplies files and
  operations and how target-dependent arithmetic, layout and values are
  evaluated when compiler host and program target differ.
- **Public API and tools:** changing a public constant can affect downstream
  type checking, inline data and compilation. Document dependencies and provide
  diagnostics explaining *why* a value is or is not compile-time known; tooling
  may surface inferred stage without requiring annotations everywhere.
- **Source kinds:** `.lt` modules may have a different top-level policy from
  `.lts` script execution. A proposal about module definitions does not
  automatically reorder script effects or change namespace import behavior.

## Concrete pending cases

All examples below are design probes, not current compiler conformance passes.
Some require later decisions and are intentionally shown as alternatives.

1. `a := 4 * 4; b := square(a);`: the selected pure-call direction gives `16`
   for `a` and `256` for `b`, usable by a compatible compile-time-required
   consumer. Use both direct and nested calls and distinct valid input values.
2. `x := readRuntimeInput();`: a fixed binding is not sufficient to use `x`
   as a compile-time array extent. Under the module-constant option, a runtime
   top-level initializer is rejected or must be moved to an explicit runtime
   entry; the precise treatment remains a decision.
3. `f := fn (): Int { print("called"); 1 }`: defining `f` does not print.
   Calling it during compilation prints at build time when that call is
   explicitly evaluated; a runtime call has its own runtime effect.
4. `name := comptime { io.readLine() }`: if explicit build-time input is
   admitted, it reads during compilation; using its materialized result in a
   program does not repeat the read merely to reconstruct the value. An
   ordinary unmarked call is an unresolved implicit-stage case.
5. `asset := comptime { fetch(url) }`: consider successful fetch, failure,
   changed remote content and repeated/incremental builds separately. No
   particular invalidation, request count, or host API is selected.
6. `var n := 3; n = readRuntimeInput();`: a known initializer is not a proof
   of the current value after runtime mutation. Alias writes and a later
   permitted update require their own evidence.
7. `x := if false { 1 / 0 } else { 1 }`: a candidate evaluator follows
   selected conditional execution; the untaken fault must not be performed.
   Reached arithmetic faults, compile-time catches and diagnostics are separate.
8. Mutually dependent top-level value initializers and recursive function
   definitions must be distinguished: a declaration cycle is not necessarily
   an execution cycle; a cycle requiring unavailable values needs a defined
   diagnostic. No blanket ban on recursion follows.
9. A computed target value containing an array/record and one containing a
   live host resource need separate materialization tests. A copyable value
   example does not decide ownership, references, or resource persistence.
10. A script with two observable output calls and an imported module must
    retain the selected script execution order; module compilation/effects and
    their timing must be tested separately under whichever policy is chosen.
11. **Explicit runtime input:** compile a program with an illustrative
    `runtime { io.readLine() }`; the candidate stage guarantee should determine
    whether the read happens on execution, not during compilation. Check
    reached and untaken branches and multiple calls independently.
12. **Explicit stage interaction:** compare `runtime { 4 * 4 }` used as an
    ordinary runtime value and in a compile-time-required position. Investigate
    both observable-effect timing and strict-runtime variants; neither a pass
    nor a rejection is selected yet. Test nested `comptime`/`runtime` blocks
    in both orders once their syntax and nesting policy are decided.

## Reference points

- Zig says namespace-level variable initializers are implicitly compile-time;
  a `const` value is compile-time-known while a `var` remains runtime-known.
  Its namespace declarations are order-independent and lazily analyzed. This
  is useful evidence for separating an initializer from later mutable reads,
  not a choice to adopt Zig's entire staging or effects model. [Zig namespace variables](https://ziglang.org/documentation/master/#Namespace-Level-Variables).
- Rust requires a static item's initializer to be a compile-time constant
  expression, including for mutable statics. This illustrates the same
  initialization/read distinction; Rust's constant-expression restrictions
  differ from Lite's intended effectful compile-time use cases. [Rust static items](https://doc.rust-lang.org/reference/items/static-items.html).
- C++ also supports dynamic initialization of non-block static-storage
  variables and specifies ordering cases. It illustrates the additional
  initialization-order contract when runtime module-level setup is admitted.
  [C++ dynamic initialization](https://eel.is/c++draft/basic.start.dynamic).

## Working recommendation

The user selected a language-level known-value direction for pure computations
with known inputs, including `square`, independent of optimization flags.
Investigate its proof and failure boundaries. Separately investigate
the compile-time-initialized module option, with function declarations not
invoked merely by definition, mutable globals distinguished from their initial
values, and explicit runtime initialization available for runtime-only needs.
Preserve the user's requested effectful compile-time capability. Whether
ordinary effects can run implicitly during compilation remains a user-facing
design choice, not a conclusion of this note. Investigate an explicit runtime
stage guarantee as a possible counterpart, including its effect timing and
optimization implications; it is not yet selected.

Before selection, resolve the scope of the module rule, how implicit evaluation
is triggered and fails, materialization, initialization order, and the chosen
behavior for explicit and implicit effects. Complete the aspect-to-case list
with independent cases for accepted programs, errors, stage-specific output,
input variations, and combined features.
