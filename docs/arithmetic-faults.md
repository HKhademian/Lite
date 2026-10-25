# Arithmetic fault boundaries

Status: **basic arithmetic faults use the typed panic channel, not returned `Result` errors; target-level `else` with typed filters supports individual recovery, 2026-10-20**.

## Selected channel

When a basic arithmetic operation has a language-defined fault, it raises a typed panic. The operation does not return `T ! ArithmeticError` merely because the arithmetic can fail. Ordinary declared function errors remain separate: a function may still return `T ! E`, and callers handle or propagate that `Result` explicitly.

An unhandled arithmetic panic propagates through calls under the existing panic direction. The user selects target-level `else` for operation and block targets, with typed filtering for a specific panic category. This lets a programmer recover an individual arithmetic panic without turning it into a returned `Result`. An expected-`Result` conversion is not selected.

An untyped target handler catches every failure supported by its target. Receiverless `else` binds nothing; `_` and an untyped name such as `failure` are readable bindings that also match every supported failure. A typed filter handles only matching failures. For example, `Panic` matches the panic family, while `BoundPanic` matches that specific category. The broad receiver type when returned errors and panics are both possible remains open.

This channel decision does not define which floating-point outcomes are faults. If an operation is defined to fault, that fault uses the panic channel; whether a floating-point edge case instead produces a valid non-finite value is a separate numeric rule.

## Concrete cases

For fixed-width arithmetic, successful operations produce ordinary values. A detected overflow or other unrepresentable result uses typed panic rather than a recoverable `Result`:

```text
sum := left + right
```

The expression has an ordinary integer result on success. Its overflow behavior must not silently wrap, become undefined, or change between build modes. The operation's exact fault category and payload remain open.

Integer division keeps the selected rounding rule and uses a typed panic for a defined arithmetic fault such as a zero divisor or an unrepresentable quotient:

```text
quotient := dividend _/ divisor
```

For a fixed-width signed type, the minimum value divided by `-1` is one such unrepresentable quotient. It must not wrap. Integer remainder % and modulo _% fault on a zero divisor. Their minimum % -1 and minimum _% -1 cases still need independent result rules: each mathematical result is representable as zero even though its associated quotient is not, so the quotient rule alone does not settle whether either operation faults.

The same rule applies to other basic math operators when their numeric contract defines a fault. It does not decide floating-point representation, non-finite results, mixed operands, or conversions.

## Individual recovery remains a requirement

Recovery can be local to the operation whose arithmetic fault the programmer wants to handle:

```text
sum := left + right else (p: OverflowPanic) {
    recover_overflow(p)
}
```

`OverflowPanic` is an illustrative category name, not a selected declaration. A matching typed handler runs; a nonmatching panic propagates implicitly. If the target can also return a `Result` error, that error remains explicit and can be forwarded with `!` after the typed handler. A larger surrounding function or unrelated computation need not be the only recovery boundary.

The selected form does not settle the exact recovery boundary around evaluated operands/callees, the broad mixed-channel receiver type, fallback typing for panic recovery, or behavior when recovery code faults. Language-managed panic propagation runs applicable `finally` blocks for exited scopes before an outer matching handler; capture scope, hard aborts, and cleanup-failure aggregation/inspection remain open. Cleanup-failure precedence is selected in [finally](finally.md#pending-outcomes).

## Decisions still open

- Exact fixed-width integer types and which operations can overflow.
- The arithmetic panic categories, payloads, and source information.
- Whether floating-point division by zero produces non-finite values or a typed panic; define other floating-point edge cases separately.
- The independent results of min % -1 and min _% -1 for fixed-width signed integers.
- Exact arithmetic panic type names and the result type of a panic fallback.
- The boundary around evaluated operands and calls, transfer mechanism, cleanup, and handling of a second panic.
- Explicit wrapping/saturating operations and conversion behavior.

Related: [numbers and ranges](numbers.md), [division](division.md), [panics](panics.md), [shared expression recovery](expression-recovery.md), [Result and errors](result-and-errors.md), and [bounds/arithmetic policy history](checked-fault-policy.md).
