# Arithmetic fault boundaries

Status: **basic arithmetic faults use the typed panic channel, not returned `Result` errors; local recovery of an individual operation is required, but its syntax is unresolved, 2026-10-19**.

## Selected channel

When a basic arithmetic operation has a language-defined fault, it raises a typed panic. The operation does not return `T ! ArithmeticError` merely because the arithmetic can fail. Ordinary declared function errors remain separate: a function may still return `T ! E`, and callers handle or propagate that `Result` explicitly.

An unhandled arithmetic panic propagates through calls under the existing panic direction. The user also requires the ability to recover from each individual arithmetic operation. No syntax currently exposes that local arithmetic recovery, so this requirement does not select an `else` attachment, a checked block, an expected-`Result` conversion, or a named helper API. In particular, the selected shared `else` surface for sequence faults does not by itself establish how it attaches to arithmetic.

This channel decision does not define which floating-point outcomes are faults. If an operation is defined to fault, that fault uses the panic channel; whether a floating-point edge case instead produces a valid non-finite value is a separate numeric rule.

## Concrete cases

For fixed-width arithmetic, successful operations produce ordinary values. A detected overflow or other unrepresentable result uses typed panic rather than a recoverable `Result`:

```text
sum := left + right
```

The expression has an ordinary integer result on success. Its overflow behavior must not silently wrap, become undefined, or change between build modes. The operation's exact fault category and payload remain open.

Integer division keeps the selected rounding rule and uses a typed panic for a defined arithmetic fault such as a zero divisor or an unrepresentable quotient:

```text
quotient := dividend // divisor
```

For a fixed-width signed type, the minimum value divided by `-1` is one such unrepresentable quotient. It must not wrap. Integer `%` faults on a zero divisor. The minimum `% -1` case still needs its own result rule: the mathematical remainder is representable as zero even though the paired quotient is not, so the quotient rule alone does not settle whether this remainder operation faults.

The same rule applies to other basic math operators when their numeric contract defines a fault. It does not decide floating-point representation, non-finite results, mixed operands, or conversions.

## Individual recovery remains a requirement

Recovery must be local to the operation whose arithmetic fault the programmer wants to handle. A larger surrounding function or unrelated computation should not be the only possible recovery boundary. The operation and its operands must execute once, and a recovery handler must receive enough typed information to distinguish relevant fault cases.

These are required semantics, not a source example: the local recovery spelling, receiver type, fallback typing, behavior when the recovery code faults, and whether operands/callees are included in the recovery boundary all remain open. Do not write an arithmetic `else` example as if it were already valid grammar.

## Decisions still open

- Exact fixed-width integer types and which operations can overflow.
- The arithmetic panic categories, payloads, and source information.
- Whether floating-point division by zero produces non-finite values or a typed panic; define other floating-point edge cases separately.
- The independent result of `min % -1` for fixed-width signed integers.
- Syntax for recovering one arithmetic operation and its result type.
- The boundary around evaluated operands and calls, transfer mechanism, cleanup, and handling of a second panic.
- Explicit wrapping/saturating operations and conversion behavior.

Related: [numbers and ranges](numbers.md), [division](division.md), [panics](panics.md), [shared expression recovery](expression-recovery.md), [Result and errors](result-and-errors.md), and [bounds/arithmetic policy history](checked-fault-policy.md).
