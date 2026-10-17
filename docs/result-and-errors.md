# Result and errors

Status: **explicit failure, implicit success, and operation-local recovery established; capture syntax and default propagation open**.

## Purpose

Represent recoverable failure in a function's return type and support ordinary conditional pattern handling rather than an implicit exception channel.

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

Postfix `?` was proposed for early propagation:

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
- A requested local capture or recovery must observe the operation's outcome before any automatic success unwrapping or error propagation.
- Evaluate the selected operation and its executed operands once. Handling its error must not silently repeat the operation.
- Preserve a typed error value so that conditional patterns can distinguish failures and decide whether to recover or explicitly return an error.
- Supporting local recovery does not require every ordinary intermediate binding to be a programmer-visible `Result`.
- Whether unhandled operations propagate automatically, require explicit propagation, or use another explicit policy remains open. The operation-local requirement does not adopt a general `try/catch` model.

### Capture proposal

One candidate is an explicit expected `Result` type at the capture point:

```text
attempt: Result<Int, ArithmeticError> = a + b;

if let Err(error) = attempt {
    report(error)
}
```

This is a proposal for capturing the addition's outcome without propagating its error first. Expected-type capture, distinct from ordinary success lifting, has not been selected. The example handles the error case only; success extraction still follows the eventual pattern contract.

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

This is exploratory syntax, not accepted grammar. It would extend receiving `else` beyond the previously discussed loop clauses. It does not settle propagation for an expression with no attached clause, and it does not introduce dynamic handler lookup through arbitrary callees.

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

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
