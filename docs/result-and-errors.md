# Result and errors

Status: **typed declared recoverable failures, implicit success construction, `try` propagation, expression-local `else` recovery, and first-class Result outcomes established; compact signature spelling and arithmetic failure policy open**.

## Purpose

Represent recoverable failure in a function's return type and support ordinary conditional pattern handling rather than an implicit exception channel.

## Recoverable failure contract

- A fallible function explicitly declares a statically typed recoverable error contract. `Result<T, E>` is the current explanatory notation; a shorter spelling may be chosen without losing the concrete error type `E`.
- To obtain the successful payload, a caller must explicitly inspect/handle the outcome, provide a fallback, or propagate the failure. A fallible call does not automatically supply its payload and silently return from the enclosing function on error.
- An outcome can remain a `Result` value for storage or later handling. Keeping an outcome does not unwrap it; exact diagnostics and rules preventing an ignored recoverable failure still need formalization.
- Implicit success means constructing a successful result from a compatible ordinary return value. It does not mean automatic success extraction or automatic error propagation at every call.
- A single universal error envelope is not the selected default in place of refined error contracts. Aliases, unions, and explicit error mapping may reduce repetition; their syntax and conversion rules remain open. Inference can check a declared contract but must not silently add undeclared escaping errors.

The earlier discussion of ordinary `: Int` signatures hiding recoverable failure with automatic propagation is superseded by this explicit caller contract. Compact signature spelling remains a separate decision. The candidate `T ! E` spelling preserves a refined error type; it has not been selected as final punctuation or as a second interchangeable source spelling.

## Declared error coverage

Every recoverable error that can escape a function must be covered by its declared error type. This includes errors explicitly returned by the function and errors forwarded when a `try` operation fails. Compiler-generated forwarding does not exempt an error from declaration.

- A function declaring no recoverable failure must handle such failures internally; it cannot use `try` to let them escape.
- If an operation can return an error outside the declared contract, propagating it is a compile-time error unless an explicit, defined conversion or mapping makes it compatible.
- Fully handled internal errors need not appear in the enclosing function's outward contract. The producing operation still has its own declared error type.
- The compiler may verify coverage and identify missing declarations; it must not widen the contract to a universal error type or silently infer additional escaping failures.

Exact error-set composition, generic error contracts, and conversion rules remain open. [Panics](panics.md) use a separate channel and are not implicit members of every recoverable error contract.

## Conceptual definition

```text
Result<T, E> = success(T) | Err(E)
```

This explanatory notation does not settle enum declaration syntax. Ordinary success paths should not require an `Ok(...)` wrapper.

## Function template

```text
validate_age := fn(age: Int): Result<Int, AgeError> {
    if age < 0 {
        return Err(AgeError.Negative)
    }

    age
}
```

The expected `Result<Int, AgeError>` contract makes the final integer a success. Errors are explicit. Early returns are encouraged when they keep the normal path flat.

## Proposed conversion boundary

- An already compatible `Result` passes through unchanged.
- A plain `T` can be lifted to success when `Result<T, E>` is expected.
- A plain error payload is not silently made an error result; construct the error explicitly.
- Without an expected `Result`, an ordinary value does not become fallible by default.
- No automatic flattening of nested results.

Ambiguous cases, including when `T` is itself a `Result`, need a precise rule and possibly an explicit constructor for exceptional cases.

## Handling and propagation

Pattern matching should expose success or failure explicitly. Earlier examples used `Ok(value)` as a success pattern. Removing routine success construction does not necessarily remove the need for a named success pattern; its spelling is open.

```text
if let Err(error) = validate_age(text_age) {
    report(error)
}
```

Propagation uses prefix `try`:

```text
load_age := fn(path: String): Result<Int, LoadError> {
    text := try read_text(path);
    try parse_age(text)
}
```

`try` evaluates its operand once. For success it supplies the payload; for a recoverable error it exits the nearest function or closure with that error, subject to the enclosing declared error contract. It does not dynamically search for a handler or cross a function boundary to return from an outer caller. Applicable structured cleanup follows the existing exit rules.

The example assumes the read and parse errors are covered by `LoadError`; their composition or mapping must be declared and defined, not guessed from the example. `try` must not erase error types. Its complete precedence and nested-expression grammar remain open.

Postfix `?` is superseded as the recoverable-error propagation operator. The alternative `?` capture marker is not selected either. Optional-value propagation is a separate open decision.

## Keeping an outcome as data

An ordinary fallible call returns its `Result` without automatic extraction:

```text
attempt := read_text(path);
```

Here `attempt` retains the typed success-or-error outcome for storage, passing to another function, or conditional inspection. No capture marker or expected-type conversion is required. `try attempt` requests extraction and propagation later; an attached recovery clause can instead provide a fallback. Neither ordinary variable access nor storing a Result recursively unwraps or flattens it.

## Recovery at a single operation

A programmer must be able to inspect and handle the failure of an individual fallible operation, including arithmetic and a function call. Addition overflow is included; this is not solely a division-by-zero mechanism.

- Local recovery must be available at the operation's expression, without requiring the surrounding function or a larger computation to be used as the recovery boundary.
- A requested local capture or recovery must observe the operation's outcome without a prior implicit unwrap or automatic propagation.
- Evaluate the selected operation and its executed operands once. Handling its error must not silently repeat the operation.
- Preserve a typed error value so that conditional patterns can distinguish failures and decide whether to recover or explicitly return an error.
- Supporting local recovery does not require every ordinary intermediate binding to be a programmer-visible `Result`.
- Recoverable errors require explicit handling, a default, or `try` propagation before using the successful payload. Automatic propagation from ordinary code is not selected.

### Arithmetic capture proposal

One earlier candidate for arithmetic is an explicit expected `Result` type at the capture point:

```text
attempt: Result<Int, ArithmeticError> = a + b;

if let Err(error) = attempt {
    report(error)
}
```

This is a proposal for requesting a recoverable arithmetic outcome. It does not establish that ordinary `+` returns a `Result`, or that expected types can change the operator's failure policy. Expected-type capture, distinct from ordinary success lifting, has not been selected. The example handles the error case only; success extraction still follows the eventual pattern contract.

### Expression-local recovery

An attached receiving `else` handles the selected Result outcome:

```text
user := load_user(id) else(error) {
    report(error);
    guest_user()
}
```

On success, the clause supplies the successful payload without executing the recovery block. On failure, its receiver gets the statically typed error and the recovery block supplies a compatible fallback value or explicitly exits. The selected outcome is evaluated once. A failure arising in the recovery block is not handled again by that same clause; it requires its own handling or explicit propagation.

This Result recovery form is selected. It does not introduce dynamic handler lookup through arbitrary callees or catch a panic. Full precedence, whether a receiver can be omitted, and evaluation scope for nested operands remain open. Do not automatically inherit the separate loop-completion hook's action-versus-result rules.

Applying the same form to `(a + b) else(error) { ... }` remains an arithmetic-recovery proposal until operator failure contracts are settled. Selecting Result recovery does not silently make ordinary arithmetic return Result.

## Unit success

```text
save := fn(data: Data): Result<Unit, SaveError> {
    try write_data(data);
    Unit
}
```

The final `Unit` represents success without data.

## Failure boundaries

Recoverable errors and panics have separate paths. `try` and Result recovery operate on declared recoverable outcomes; they do not turn panics into returned errors. Which conditions panic, how a panic is triggered, termination versus unwinding, and panic cleanup guarantees remain open; see [panics](panics.md). Process termination and allocation failure have not been assigned a universal mechanism.

An arithmetic fault is not automatically a recoverable returned error merely because it can be detected. Whether ordinary fixed-width addition overflow, integer division by zero, and unrepresentable quotients belong to the recoverable contract remains open. Any selected policy must reconcile concise ordinary arithmetic with the existing requirement for local arithmetic recovery. No implicit trapping, wrapping, undefined behavior, or build-dependent change is adopted by this distinction.

### Reference-language distinction

- Rust's ordinary integer division by zero panics; ordinary integer overflow is governed by overflow checks. Neither operation automatically returns a `Result`. Its `checked_add` and `checked_div` methods offer recoverable `Option` outcomes, without a detailed error payload. See [Rust operators](https://doc.rust-lang.org/reference/expressions/operator-expr.html#overflow) and [checked division](https://doc.rust-lang.org/std/primitive.i64.html#method.checked_div).
- Zig separates typed error unions from illegal arithmetic behavior. Overflow and zero division are safety-checked faults when checks are enabled, rather than automatically returned errors. Zig's inferred error sets are still statically typed; inference does not make them untyped. See [Zig errors](https://ziglang.org/documentation/master/#Errors) and [integer overflow](https://ziglang.org/documentation/master/#Integer-Overflow).
- C++ `std::expected` does not turn built-in integer division by zero or signed arithmetic overflow into returned errors. Integer division by zero and an unrepresentable signed quotient have undefined behavior in the built-in arithmetic contract. See [C++ multiplicative operators](https://eel.is/c++draft/expr.mul).

These comparisons explain why ordinary arithmetic does not require recoverable-error propagation markers in those languages. They do not select a LiteScript arithmetic policy.

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
