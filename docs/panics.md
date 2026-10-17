# Panics and failure channels

Status: **a panic path separate from typed recoverable errors established; triggers, arithmetic classification, execution behavior, and cleanup guarantees open**.

## Purpose

Distinguish a declared recoverable outcome from a failure outside ordinary Result handling. A separate path does not imply that panics are automatically recoverable, use hardware exceptions, or require a stack-unwinding runtime.

## Recoverable failure template

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return Err(AgeError.Negative)
    }

    age
}
```

This example explicitly returns a recoverable failure. The ordinary final integer supplies implicit success. Callers inspect the Result, recover with `else(error) { ... }` or `else { ... }`, or propagate using postfix `!`, subject to their declared error contracts.

## Separate channels

- Every escaping recoverable error must be covered by the function's declared error contract, including errors forwarded by postfix `!`.
- Panics are not implicitly included in every recoverable error declaration.
- The broad shorthand `T!` means `T ! Error` and still excludes the separate panic channel.
- Postfix `!` extracts a Result or forwards its recoverable error; it does not assert success, trigger a panic, or catch a panic.
- A Result `else(error)` clause receives its declared error type, not an arbitrary panic payload.
- Returning `Err(value)` explicitly constructs a recoverable failure; it does not trigger a panic.
- No panic-trigger spelling or panic-handler syntax has been selected. Examples must not imply an implemented `panic()` API or a general `try/catch` mechanism.

## Arithmetic is still a classification decision

Integer division by zero, overflow, and unrepresentable quotients can be detected without deciding whether they belong to the recoverable channel or the panic channel. That classification remains open for LiteScript.

The design still requires local arithmetic recovery without a verbose named helper as the ordinary interface. A policy that makes arithmetic faults unconditionally unhandleable would need to reconcile that requirement, rather than silently override it. No wrapping, undefined behavior, implicit Result conversion, or build-dependent semantics are selected here.

## Cleanup and state

Returned recoverable errors follow the language's structured-exit cleanup rules. Panic behavior is not yet specified: the existence of a separate path does not establish whether it unwinds or terminates immediately, or whether `finally` runs.

Recoverable errors do not imply automatic rollback of earlier mutations. Transactional recovery or state-restoration facilities would require separate contracts.

## Open decisions

- Which invariant violations, arithmetic faults, and allocation failures can panic.
- Explicit panic-trigger syntax and any payload type.
- Termination, unwinding, and guarantees for `finally` or other cleanup.
- Whether a restricted outer boundary can observe or recover a panic.
- Interaction with foreign code, host runners, threads, and process termination.

## Related concepts and references

- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Numbers and ranges](numbers.md)
- [Division](division.md)
- [Memory and performance](memory-and-performance.md)

The source for the selected separation is the LiteScript design discussion. Comparisons in [Result and errors](result-and-errors.md#reference-language-distinction) do not adopt another language's panic implementation.
