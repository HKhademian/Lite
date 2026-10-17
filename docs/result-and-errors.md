# Result and errors

Status: **explicit failure and implicit success established; inference and propagation details open**.

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
    };

    age
};
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
};
```

Postfix `?` was proposed for early propagation:

```text
load_age := fn(path: String): Result<Int, LoadError> {
    text := read_text(path)?;
    parse_age(text)?
};
```

This is a working illustration. A real contract must define error conversion or explicit mapping between the operations' error types. `?` must not erase those types.

## Unit success

```text
save := fn(data: Data): Result<Unit, SaveError> {
    write_data(data)?;
    Unit
};
```

The final `Unit` represents success without data.

## Failure boundaries

Recoverable errors, programmer defects, process termination, and allocation failure have not been unified under one mechanism. A small terminating trap mechanism was suggested for violated invariants. That is not a settled license for implicit ordinary exceptions.

## Related concepts and references

- [Functions](functions.md), [Conditionals](conditionals.md), and [Control-flow exits](control-flow.md).
- [Rust Result handling](https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html) informed explicit error values and propagation. LiteScript deliberately proposes implicit ordinary success instead of mandatory `Ok(...)` construction.
