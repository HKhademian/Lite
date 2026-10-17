# Result and errors

Status: **typed recoverable failures, implicit success construction, explicit caller handling or propagation, and operation-local recovery established; shorthand and arithmetic failure policy open**.

## Purpose

Represent recoverable failure in a function's return type and support ordinary conditional pattern handling rather than an implicit exception channel.

## Recoverable failure contract

- A fallible function exposes a statically typed recoverable error contract. `Result<T, E>` is the current explanatory notation; a shorter spelling may be chosen without losing the concrete error type `E`.
- To obtain the successful payload, a caller must explicitly inspect/handle the outcome, provide a fallback, or propagate the failure. A fallible call does not automatically supply its payload and silently return from the enclosing function on error.
- An outcome can remain a `Result` value for storage or later handling. Keeping an outcome does not unwrap it; exact diagnostics and rules preventing an ignored recoverable failure still need formalization.
- Implicit success means constructing a successful result from a compatible ordinary return value. It does not mean automatic success extraction or automatic error propagation at every call.
- A single universal error envelope is not the selected default in place of refined error contracts. Error inference, aliases, unions, and explicit error mapping may reduce repetition; their syntax and conversion rules remain open.

The earlier discussion of ordinary `: Int` signatures hiding recoverable failure with automatic propagation is superseded by this explicit caller contract. Function signature shorthand and requirements for inferred versus written error types are separate decisions.

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

Propagation must be explicit. Postfix `?` is a working candidate for requesting early propagation:

```text
load_age := fn(path: String): Result<Int, LoadError> {
    text := read_text(path)?;
    parse_age(text)?
}
```

This is a working illustration. A real contract must define error conversion or explicit mapping between the operations' error types. `?` must not erase those types.

## Recovery at a single operation

A programmer must be able to inspect and handle the failure of an individual fallible operation, including arithmetic and a function call. Addition overflow is included; this is not solely a division-by-zero mechanism.

- Local recovery must be available at the operation's expression, without requiring the surrounding function or a larger computation to be used as the recovery boundary.
- A requested local capture or recovery must observe the operation's outcome without a prior implicit unwrap or automatic propagation.
- Evaluate the selected operation and its executed operands once. Handling its error must not silently repeat the operation.
- Preserve a typed error value so that conditional patterns can distinguish failures and decide whether to recover or explicitly return an error.
- Supporting local recovery does not require every ordinary intermediate binding to be a programmer-visible `Result`.
- Recoverable errors require explicit handling, a default, or propagation before using the successful payload. Exact notation remains open; automatic propagation from ordinary code is not selected.

### Capture proposal

One candidate is an explicit expected `Result` type at the capture point:

```text
attempt: Result<Int, ArithmeticError> = a + b;

if let Err(error) = attempt {
    report(error)
}
```

This is a proposal for requesting a recoverable arithmetic outcome. It does not establish that ordinary `+` returns a `Result`, or that expected types can change the operator's failure policy. Expected-type capture, distinct from ordinary success lifting, has not been selected. The example handles the error case only; success extraction still follows the eventual pattern contract.

### Expression-local recovery proposal

Another candidate reuses an attached receiving `else` for the selected expression:

```text
sum := (a + b) else(error) {
    report(error);
    0
}

user := load_user(id) else(error) {
    guest_user()
}
```

On success, this candidate supplies the successful payload. On failure, its receiver gets the typed error and the recovery block supplies a compatible fallback value. Only the selected expression is handled; a failure arising in the recovery block is not handled again by that same clause. Evaluation scope for nested fallible operands still needs a contract.

This is exploratory syntax, not accepted grammar. It would extend receiving `else` beyond the previously discussed loop clauses. A recoverable failure cannot propagate merely because the clause is absent; explicit handling or propagation is required to obtain its successful payload. This does not introduce dynamic handler lookup through arbitrary callees.

## Unit success

```text
save := fn(data: Data): Result<Unit, SaveError> {
    write_data(data)?;
    Unit
}
```

The final `Unit` represents success without data.

## Failure boundaries

Recoverable errors, programmer defects, process termination, and allocation failure have not been unified under one mechanism. A small terminating trap mechanism was suggested for violated invariants. That is not a settled license for implicit ordinary exceptions.

An arithmetic fault is not automatically a recoverable returned error merely because it can be detected. Whether ordinary fixed-width addition overflow, integer division by zero, and unrepresentable quotients belong to the recoverable contract remains open. Any selected policy must reconcile concise ordinary arithmetic with the existing requirement for local arithmetic recovery. No implicit trapping, wrapping, undefined behavior, or build-dependent change is adopted by this distinction.

### Reference-language distinction

- Rust's ordinary integer division by zero panics; ordinary integer overflow is governed by overflow checks. Neither operation automatically returns a `Result`. Its `checked_add` and `checked_div` methods offer recoverable `Option` outcomes, without a detailed error payload. See [Rust operators](https://doc.rust-lang.org/reference/expressions/operator-expr.html#overflow) and [checked division](https://doc.rust-lang.org/std/primitive.i64.html#method.checked_div).
- Zig separates typed error unions from illegal arithmetic behavior. Overflow and zero division are safety-checked faults when checks are enabled, rather than automatically returned errors. Zig's inferred error sets are still statically typed; inference does not make them untyped. See [Zig errors](https://ziglang.org/documentation/master/#Errors) and [integer overflow](https://ziglang.org/documentation/master/#Integer-Overflow).
- C++ `std::expected` does not turn built-in integer division by zero or signed arithmetic overflow into returned errors. Integer division by zero and an unrepresentable signed quotient have undefined behavior in the built-in arithmetic contract. See [C++ multiplicative operators](https://eel.is/c++draft/expr.mul).

These comparisons explain why ordinary arithmetic does not require recoverable-error propagation markers in those languages. They do not select a LiteScript arithmetic policy.

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
