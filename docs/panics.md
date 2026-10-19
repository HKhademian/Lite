# Panics and failure channels

Status: **a panic path separate from typed recoverable errors established; basic arithmetic faults assigned to the typed panic channel with individual recovery required; recovery syntax, exact scope, triggers, execution behavior, and cleanup guarantees open**.

## Purpose

Distinguish a declared recoverable outcome from a failure outside ordinary Result handling. A separate path does not imply that panics are automatically recoverable, use hardware exceptions, or require a stack-unwinding runtime.

The user requests [strongly typed panics](typed-panics.md) in the future, including underlying null access, zero division, arithmetic overflow, and related faults. Typed categories and structured payloads are the intended direction; the later [shared expression recovery](expression-recovery.md) direction adds else as the recovery surface. Capture scope, safe cross-call recovery, effect declarations, and exact trigger rules still need definition. Underlying null faults do not introduce public nullable values.

## Recoverable failure template

```text
validate_age := fn(age: Int): Int ! AgeError {
    if age < 0 {
        return .err(AgeError.Negative)
    }

    age
}
```

This example explicitly returns a recoverable failure. The ordinary final integer supplies implicit success. Callers inspect the Result, recover with `else(error) { ... }` or `else { ... }`, or propagate using postfix `!`, subject to their declared error contracts.

## Separate channels

- Every escaping recoverable error must be covered by the function's declared error contract, including errors forwarded by postfix `!`.
- Panics propagate implicitly through calls until an applicable recovery boundary or the unhandled-fault policy is reached. No ! or recoverable-error declaration is required for that transfer. The transfer mechanism and cleanup contract remain open.
- Panics are not implicitly included in every recoverable error declaration.
- The broad shorthand `T!` means `T ! Error` and still excludes the separate panic channel.
- Postfix `!` extracts a Result or forwards its recoverable error; it does not assert success, trigger a panic, or catch a panic.
- Result-only recovery retains its declared E receiver. The shared else direction can also handle typed panics; mixed-channel receiver typing is pending rather than an implicit flattening of payloads.
- Returning `.err(value)` explicitly constructs a recoverable failure; it does not trigger a panic.
- Attached else is selected as a shared recovery surface. No panic-trigger spelling, full capture scope, or fault-transfer implementation has been selected; no implemented panic() API is implied.

## Arithmetic channel selected; recovery syntax open

Basic arithmetic faults use typed panics, not returned `Result` errors. This includes arithmetic overflow and integer division faults when their operation contract defines them as faults. Exact triggers and payloads remain open; floating-point division may instead define non-finite results. See [arithmetic fault boundaries](arithmetic-faults.md).

The user requires local recovery for each individual arithmetic operation, without a verbose named helper as the ordinary interface. No source syntax currently exposes that recovery, so the requirement does not select the shared `else` attachment for arithmetic. No wrapping, undefined behavior, implicit `Result` conversion, or build-dependent semantics are selected here.

The [bounds/arithmetic policy review](checked-fault-policy.md) retains ordinary asserting operations plus explicit typed checked capture as history. Arithmetic uses typed panics, and local recovery of each operation remains required. Whether its recovery boundary includes evaluated operands or calls remains open; this is distinct from deciding the arithmetic fault channel.

## Cleanup and state

Returned recoverable errors follow the language's structured-exit cleanup rules. Panic behavior is not yet specified: the existence of a separate path does not establish whether it unwinds or terminates immediately, or whether `finally` runs.

Recoverable errors do not imply automatic rollback of earlier mutations. Transactional recovery or state-restoration facilities would require separate contracts.

## Open decisions

- Which invariant violations, arithmetic faults, and allocation failures can panic.
- Explicit panic-trigger syntax and any payload type.
- Termination, unwinding, and guarantees for `finally` or other cleanup.
- Whether an expression recovery boundary includes all executed arguments/callees or only operation-specific faults, and how safe recovery is guaranteed.
- Interaction with foreign code, host runners, threads, and process termination.

## Related concepts and references

- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Numbers and ranges](numbers.md)
- [Division](division.md)
- [Memory and performance](memory-and-performance.md)

The source for the selected separation is the LiteScript design discussion. Comparisons in [Result and errors](result-and-errors.md#reference-language-distinction) do not adopt another language's panic implementation.
