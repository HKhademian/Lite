# Numbers and ranges

Status: **numeric usability and predictable cost are goals; exact numeric contract open**.

## Purpose

Allow an initial `x := 2` without requiring representation knowledge, while providing explicit control for performance-sensitive code.

## Templates

```text
x := 2;
x: Int = 2;
var total := 0;
```

The examples assume the same inferred integer family as an explicit `Int`. Capitalization and the full primitive type naming convention have not been frozen.

## Leading zero in fractional literals

Fractional literals require a digit before the decimal point. Write `0.5`; `.5` is rejected.

```text
ratio := 0.5;
```

This keeps leading-dot context access distinct from fractional-literal spelling:

```text
@attempts loop .count < 10 {
    work()
}
```

Requiring a leading zero settles spelling only. Floating-point representation, decimal types, exponent notation, and the complete numeric token grammar remain open.

## Representation proposal

A signed 64-bit default `Int` with checked arithmetic was suggested, with explicit sized types and an optional arbitrary-precision library. This is not yet a selected specification. Overflow should not silently change meaning merely because a different build mode is used.

## Division

```text
ratio := 7 / 2;     /* fractional quotient: 3.5 */
quotient := 7 // 2; /* integer quotient: 3 */
```

`//` and `//=` support ordinary integer-only arithmetic without floating-point intermediates or named rounding helpers. Integer division rounds toward negative infinity: `-7 // 2` and `7 // -2` both produce `-4`. Integer `%` is paired with that quotient; a nonzero remainder has the divisor's sign. See [division](division.md). These rules do not select an implicit casting policy, a floating-point representation, or an arithmetic failure mechanism.

## Ranges

```text
loop 1..=10 as number { process(number) }
loop 10..=1 as number { process(number) }
loop (10..=1).step(3) as number { process(number) }
```

The intended descending example visits `10, 7, 4, 1`. A positive step magnitude follows the direction chosen by bounds. Zero step requires rejection. Equal bounds, exclusive ranges, overflow near numeric limits, and dynamic invalid steps need precise contracts.

## Counter versus range value

```text
loop (10..=1).step(3) as value, count {
    process(value, count)
}
```

The proposed body counts are `1, 2, 3, 4`, independent of range values. Reverse traversal must not turn the iteration count into a descending index.

## Open decisions

Integer widths, floating-point defaults, exact decimal support, arithmetic promotions, literal polymorphism, casts, noninteger remainder, combined quotient/remainder APIs, arithmetic failure representation, overflow errors, wrapping operations, and range bounds all remain open.

Arithmetic must support local error inspection and recovery, including addition overflow, without requiring verbose named checked-arithmetic helpers as its ordinary interface. Whether ordinary operators always expose typed recoverable outcomes, require proof that a fault is impossible, or use another explicit recovery mechanism remains open. A typed recoverable outcome requires explicit handling, a fallback, or propagation before using its payload; it does not automatically propagate. Fault classification and recovery syntax must be settled together; see [result and errors](result-and-errors.md).

## Related concepts and references

- [Types and inference](types-and-inference.md)
- [Operators](operators.md)
- [Collections and iterators](collections-and-iterators.md)
- [Zig reference](https://ziglang.org/documentation/master/) is relevant comparison material for explicit numeric representations and safety policies; its build-mode semantics are not adopted.
