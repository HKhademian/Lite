# Panics and failure channels

Status: **a panic path separate from typed recoverable errors established; basic arithmetic faults use that channel and target-level typed `else` filters can recover a specific category. A same-scope matching typed-panic handler recovers before its owning scope's `finally`; escaped panics unwind entered scopes and run applicable `finally` blocks inner-to-outer before reaching an outer matching handler. Operation-specific and explicit whole-block recovery are selected 2026-10-26; fault attribution, complete chain/attachment rules, triggers, and hard-abort behavior remain open. Cleanup-failure precedence and declaration-ordered member-wise handling are selected; aggregate representation and duplicate-member behavior remain open**.

## Purpose

Distinguish a declared recoverable outcome from a failure outside ordinary Result handling. A separate path does not imply that panics are automatically recoverable, use hardware exceptions, or require a stack-unwinding runtime.

The user requests [strongly typed panics](typed-panics.md) in the future, including underlying null access, zero division, arithmetic overflow, and related faults. Typed categories and structured payloads are the intended direction; the later [shared expression recovery](expression-recovery.md) direction adds else as the recovery surface. An operation handler covers only its defined faults; evaluated argument/operand panics bypass it. An explicit `{ ... } else { ... }` block instead covers supported typed panics across its executed contents and synchronous calls. Fault-contract syntax, safe transport, complete chain/attachment rules, and exact triggers still need definition. Underlying null faults do not introduce public nullable values.

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
- Panics propagate implicitly through calls until an applicable recovery boundary or the unhandled-fault policy is reached. If a typed panic matches a handler in the same scope that owns `finally`, recovery runs first and that scope's `finally` runs once as it exits. During language-managed propagation to an outer matching handler, each exited inner scope's applicable `finally` runs before transfer reaches that handler. No ! or recoverable-error declaration is required for that transfer; implementation mechanism remains open.
- Panics are not implicitly included in every recoverable error declaration.
- The broad shorthand `T!` means `T ! Error` and still excludes the separate panic channel.
- Postfix `!` extracts a Result or forwards its recoverable error; it does not assert success, trigger a panic, or catch a panic.
- Result-only recovery retains its declared E receiver. The shared else direction can also handle typed panics; mixed-channel receiver typing is pending rather than an implicit flattening of payloads.
- Returning `.err(value)` explicitly constructs a recoverable failure; it does not trigger a panic.
- Attached else is selected as a shared recovery surface. Operation-specific and explicit whole-block panic recovery are selected; panic-trigger spelling, complete chain/attachment rules, and fault-transfer implementation remain open; no implemented panic() API is implied.

## Arithmetic channel and typed recovery selected

Basic arithmetic faults use typed panics, not returned `Result` errors. This includes arithmetic overflow and integer division faults when their operation contract defines them as faults. Exact triggers and payloads remain open; floating-point division may instead define non-finite results. See [arithmetic fault boundaries](arithmetic-faults.md).

The user requires local recovery for each individual arithmetic operation, without a verbose named helper as the ordinary interface. Target-level `else` with a typed filter supplies that recovery; the category names and operation fault attribution remain open. Argument/operand panics bypass the operation handler under [the selected boundary](expression-recovery.md#operation-specific-panic-boundary-selected). No wrapping, undefined behavior, implicit `Result` conversion, or build-dependent semantics are selected here.

The [bounds/arithmetic policy review](checked-fault-policy.md) retains ordinary asserting operations plus explicit typed checked capture as history. Arithmetic uses typed panics, and local recovery of each operation remains required. Its operation handler covers the arithmetic operation's own defined faults, excluding panics from evaluated operands. Operation fault attribution and transfer remain open; this is distinct from deciding the arithmetic fault channel.

## Cleanup and state

Recovery uses the selected [pending-occurrence model](expression-recovery.md#pending-occurrences-and-munching-selected) for both single and aggregated failures. Schematic (ErrSingle,) contains one pending occurrence, while () contains none. A matching clause consumes its match; a nonmatch consumes nothing and runs no handler. No failure clause matches an empty remainder. A proof of complete exhaustion removes handling obligations for those failures; it does not merge panic and returned-error channels or discard new failures raised during recovery/cleanup.

Returned recoverable errors follow the language's structured-exit cleanup rules. When postfix `!` forwards a typed error, applicable construct-level `finally` blocks in exited scopes run from inner to outer before the error leaves the enclosing function or closure; body-wide cleanup remains deferred. When a language-managed typed panic propagates toward an outer matching handler, it unwinds exited scopes and runs each applicable `finally` from inner to outer before reaching that handler. The cleanup extent and outcome when no panic handler matches remain open. A hard process abort is outside this guarantee. If cleanup also fails, any already pending failure stays primary and cleanup failures are retained as secondary; the bound aggregate's public type/operations, inspection, and duplicate-member rules remain open.

Recoverable errors do not imply automatic rollback of earlier mutations. Transactional recovery or state-restoration facilities would require separate contracts.

## Open decisions

- Which invariant violations, arithmetic faults, and allocation failures can panic.
- Explicit panic-trigger syntax and any payload type.
- The unhandled-fault policy when no typed panic handler matches, and how handlers inspect or consume members of an aggregated failure.
- Operation-specific fault contracts, attribution through helpers, complete block attachment/recovery-chain integration, and how safe recovery is guaranteed. Argument panics bypass an outer operation handler.
- Interaction with foreign code, host runners, threads, and process termination.

## Related concepts and references

- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Numbers and ranges](numbers.md)
- [Division](division.md)
- [Memory and performance](memory-and-performance.md)

The source for the selected separation is the LiteScript design discussion. Comparisons in [Result and errors](result-and-errors.md#reference-language-distinction) do not adopt another language's panic implementation.
