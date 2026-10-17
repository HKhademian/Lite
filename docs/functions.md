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

## Parameter mutation contracts

Parameters provide read access by default. Prefix an affected parameter with `mut` to request writable access:

```text
rename := fn(mut user: User, name: String): Unit {
    user.name = name
}
```

The example assumes `name` is an accessible writable field in the implementation context. The operation requires writable access to `user`; it only reads the replacement `name` parameter. Each affected receiver or parameter needs its own `mut` marker. A read-only argument cannot satisfy a writable-access requirement.

The same rule applies to a method's receiver binding. The complete method notation and whether it uses an explicit `self` parameter remain open. There is no additional `mut fn` or other function-level mutation marker.

The declaration `mut rename := fn(...) { ... }` would instead describe writable access to the held function value. It does not replace the mutation contracts on the function's parameters.

These markers do not choose borrowing, copying, moving, lifetimes, argument syntax at the call site, capture permissions, or purity. Those contracts remain open; see [mutability](mutability.md) and [memory and performance](memory-and-performance.md).

## Result rules

The body's final expression supplies normal completion. A final declaration or assignment produces `Unit`. Trailing separators after an ordinary body item change nothing. The completed function definition ends its outer item without a semicolon; see [blocks and results](blocks-and-results.md).

```text
greet := fn(name: String): Unit {
    print("Hello, " + name)
}
```

## Early return

```text
validate := fn(value: Int): Result<Int, ValidationError> {
    if value < 0 {
        return Err(ValidationError.Negative)
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

Local handling does not require a catch boundary around unrelated statements. Exact signature shorthand, complete expression precedence, error conversion rules, and ignored-outcome diagnostics remain open; see [result and errors](result-and-errors.md). [Panics](panics.md) use a separate path. Existing arithmetic examples illustrate success paths and do not settle whether ordinary operators expose recoverable errors or another checked-fault policy.

## Closures

```text
double := fn(x: Int) {
    x * 2
}
```

The same body-result rule applies to anonymous functions. A plain `return` inside a closure exits that closure, not the function that created it. Capture modes and escaping lifetime rules depend on the memory model.

## Recursion and inference

The language needs a declaration-resolution rule allowing recursive definitions without making arbitrary initialization order implicit. Unannotated parameter inference, public signature requirements, generic constraints, and recursive result inference are still open.

## Tagged exits

`return @tag value` exits a lexically enclosing named construct. It cannot jump across a function or closure boundary. Whether function definitions themselves can carry tags, and how that would interact with ordinary `return`, is not yet specified.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Types and inference](types-and-inference.md)
- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Rust blocks](https://doc.rust-lang.org/reference/expressions/block-expr.html) and [Kotlin functions](https://kotlinlang.org/docs/functions.html) provide comparisons. LiteScript's proposed rule is not a claim that all compared languages handle function bodies identically.
