# Functions

Status: **binding syntax, colon result types, tail results, and early-return direction established**.

## Template

```text
name := fn(parameter: ParameterType): ResultType {
    body
}
```

Functions are definitions bound to names, not a separate category requiring a second named-definition syntax. `fn name(...)` occurred in early sketches; uniform binding syntax is the current direction.

## Example

```text
double := fn(x: Int): Int {
    2 * x
}
```

Use `:` for result annotations, matching other type annotations. The earlier `->` spelling is superseded.

## Call evaluation order

Evaluate the callee expression first, then the supplied argument expressions from left to right in source order, then invoke the callable. A function argument is not evaluated before an earlier supplied argument merely because of parameter type, dispatch, or optimization. This does not choose move/copy/borrow rules or temporary lifetimes; see [evaluation order](evaluation-order.md).

## Collection input requirements

Simple collection functions should not require beginner authors to know protocol names. The [inference proposal](collection-inference.md) explores fn(icons) with reusable requirements inferred from the body, plus contextual construction of collection elements. Generalization, public signatures, and any short annotation remain open; omitting a parameter type does not yet select a generic mechanism.

The [signature proposal](collection-function-signatures.md) separates required input behavior from guaranteed output behavior, inferred inputs from explicitly complete contracts, and static abstract returns from runtime-erased values. A common contract alone does not preserve concrete input/output identity or choose a stored representation. The [operation-contract model](collection-operation-contracts.md) resolves loop/bracket sugar statically and distinguishes unsupported operations from supported operations returning typed failures.

The user-selected direction is to constrain collection inputs by the operations required, not their provider type or compile-time size. Conceptually, fn(icons: `Iterable<Icon>`) can traverse compatible list, array, set, slice, or generated sources without requiring a List conversion. The angle-bracket/interface notation is provisional and does not mandate boxed runtime dispatch. Sized, repeatable, indexed, or contiguous requirements belong in a signature only when needed. Cursor consumption, yielded access, and retained-source lifetimes must remain explicit in their eventual contracts. See [collection abstractions](collection-abstractions.md) and [capabilities](collection-capabilities.md).

## Parameter mutation contracts

The selected [placement rule](mut-qualifier-placement.md) is user: mut User for typed parameters. It replaces the earlier name-prefix spelling while preserving the mutation contract.

Parameters provide read access by default. Qualify the affected parameter's type with mut to request writable access:

```text
rename := fn(user: mut User, name: String): Unit {
    user.name = name
}
```

The example assumes `name` is an accessible writable field in the implementation context. The operation requires writable access to `user`; it only reads the replacement `name` parameter. Each affected receiver or parameter needs its own `mut` marker. A read-only argument cannot satisfy a writable-access requirement.

The same rule applies to a method's receiver binding. The complete method notation and whether it uses an explicit `self` parameter remain open. There is no additional `mut fn` or other function-level mutation marker.

The declaration `mut rename := fn(...) { ... }` would instead describe writable access to the held function value. It does not replace the mutation contracts on the function's parameters.

Calling a mut-qualified parameter requires an explicit grant, as in rename(mut userVar, "Ali"). The caller must already provide mutable access. Updates affect that supplied data; the compiler must not silently mutate a detached copy or upgrade a read-only argument. This selects temporary writable caller-data access for mut parameters. Ordinary read-only input transfer, complete alias/lifetime rules, capture permissions, and purity remain open; see [caller grants](caller-mutation-grants.md).

[Var parameters](slot-parameters.md) provide temporary access to a caller-supplied location: assignment through the parameter replaces the supplied variable or field. The explicit call grant replace(var value) requires a compatible writable location; a whole-binding argument must be var. Var alone grants no payload mutation. General reference values, public pointers, and complete compatibility/alias rules remain open.

The [ordinary parameter review](parameter-values-and-slots.md) keeps the current feature scope to ordinary inputs and writable slots. Read-only defaults do not decide copying versus borrowing. An efficient indirect calling convention must preserve the eventual observable semantics; it does not by itself introduce a public reference feature or caller writeback.

The [access-ergonomics goal](slot-ergonomics.md) hides derived mathematical type structure. Use local declarations and shadowing for working values: fn(count: Int) { var count := count; count += 1; count }. Left-side local-only var headers are omitted; type-side var declares caller replacement. The shorthand fn(param: var) requires an inferable value type under the eventual inference rules. See [var access](var-access-qualifier.md) and [parameter permissions](parameter-permissions.md).

## Result rules

The body's final expression supplies normal completion. A final declaration or assignment produces `Unit`. Trailing separators after an ordinary body item change nothing. The completed function definition ends its outer item with an optional trailing semicolon; see [blocks and results](blocks-and-results.md).

```text
greet := fn(name: String): Unit {
    print("Hello, " + name)
}
```

## Early return

```text
validate := fn(value: Int): Int ! ValidationError {
    if value < 0 {
        return .err(ValidationError.Negative)
    }

    value
}
```

Early returns are encouraged for guards and invalid cases. Explicit final `return` was recommended to remain legal, rather than adding a prohibition with little semantic benefit. Whether a formatter or linter expresses a preference is open.

`return` is control flow, never a parser's ambiguity-breaking hint.

## Recovering at a call

A fallible function exposes a statically typed recoverable error contract. A caller must explicitly handle/inspect the outcome, provide a default, or propagate the error before using the successful payload. Keeping the returned outcome as a `Result` for later handling does not unwrap it. Implicit success construction inside a fallible function does not grant automatic propagation at its callers.

Postfix `operation()!` extracts success or forwards its recoverable error from the nearest function or closure. Member access and calls can continue directly, as in `load_user(id)!.load_profile()!.name`; see [propagation and call chaining](propagation-and-chaining.md). Use `operation() else(error) { ... }` for a local fallback or explicit exit. Without handling or extraction, the call retains its Result as ordinary data. Every recoverable error that can escape, directly or through propagation, must be covered by the function's declared error type. A declaration that promises no recoverable failure cannot silently gain one through inference. One outer propagation marker must not silently extract all intermediate Results in a chain.

The recovery receiver may be omitted: `operation() else { fallback }`. Both recovery forms combine success type `T` and normal fallback type `D` as `T | D`. A fallback need not have the same type as the original success. Returning that union still needs to satisfy the enclosing function's declared return type.

Fallible return annotations use `T ! E`; `T!` is shorthand for `T ! Error`. The general form declares broad recoverable failure, while the explicit error type can retain a refined contract. A return annotation `T` still declares no recoverable error channel. The exact general Error contract remains open.

Local handling does not require a catch boundary around unrelated statements. Complete expression precedence, error conversion rules, and ignored-outcome diagnostics remain open; see [result and errors](result-and-errors.md). [Panics](panics.md) use a separate path. Existing arithmetic examples illustrate success paths and do not settle whether ordinary operators expose recoverable errors or another checked-fault policy.

## Closures

```text
double := fn(x: Int) {
    x * 2
}
```

The same body-result rule applies to anonymous functions. A plain `return` inside a closure exits that closure, not the function that created it. Capture modes and escaping lifetime rules depend on the memory model.

## Recursion and inference

Destructured parameter forms need both surface grammar and a mismatch policy. The [pattern context review](pattern-contexts.md#5-function-and-closure-parameters) recommends patterns irrefutable under the declared parameter contract; no implicit runtime dispatch, skipped call, or new failure channel is selected by writing a parameter pattern.

The language needs a declaration-resolution rule allowing recursive definitions without making arbitrary initialization order implicit. Unannotated parameter inference, public signature requirements, generic constraints, and recursive result inference are still open.

## Tagged exits

`return @tag value` exits a lexically enclosing named construct. It cannot jump across a function or closure boundary. Whether function definitions themselves can carry tags, and how that would interact with ordinary `return`, is not yet specified.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Types and inference](types-and-inference.md)
- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Rust blocks](https://doc.rust-lang.org/reference/expressions/block-expr.html) and [Kotlin functions](https://kotlinlang.org/docs/functions.html) provide comparisons. LiteScript's proposed rule is not a claim that all compared languages handle function bodies identically.
