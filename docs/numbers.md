# Numbers and ranges

Status: **numeric usability and predictable cost are goals; arithmetic fault channel selected, exact numeric contract open**.

## Purpose

Allow an initial `x := 2` without requiring representation knowledge, while providing explicit control for performance-sensitive code.

## Templates

```text
x := 2;
x: Int = 2;
var total := 0;
```

The examples assume the same inferred integer family as an explicit `Int`. Capitalization and the full primitive type naming convention have not been frozen.

## Identity leading plus

Selected 2026-10-25: a complete additive-chain entry may start with one optional +. With compatible numeric inputs, total := + rent + groceries; denotes the same expression as total := rent + groceries;. A singleton + amount preserves the admitted operand's value and type, without numeric promotion/conversion or an implicit 0 + amount operation. The prefix has no separate overflow/failure or evaluation step. Minus retains negation; leading * and / are not redundant alternatives and gain no implicit initial operand. Complete numeric and unary-operator contracts remain open. See [leading plus](leading-separators.md#additive-chains-with-leading-plus).

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

A signed 64-bit default `Int` was suggested, with explicit sized types and an optional arbitrary-precision library; the representation is not selected. When a basic arithmetic operation has a defined fault, it uses the typed panic channel rather than returning `Result`. Overflow must not silently wrap, become undefined, or change meaning between build modes. Recover a matching panic locally with target-level `else` and a typed filter; exact category names remain open. See [arithmetic fault boundaries](arithmetic-faults.md).

## Arithmetic grouping

Within the selected set, prefix negation binds above multiplicative * / // %, then binary + -. Binary operations at each level associate left to right; parentheses override grouping, and operands retain left-to-right evaluation. Identity leading + does not alter that grouping or introduce promotion. See [operators](operators.md#basic-arithmetic-grouping-selected). Exponentiation and its result types, signed-exponent rules, and precedence relative to negation remain open; [the language comparison](arithmetic-operators-comparison.md) records alternatives.

## Division

```text
ratio := 7 / 2;     /* fractional quotient: 3.5 */
quotient := 7 // 2; /* integer quotient: 3 */
```

`//` and `//=` support ordinary integer-only arithmetic without floating-point intermediates or named rounding helpers. Integer division rounds toward negative infinity: `-7 // 2` and `7 // -2` both produce `-4`. Integer `%` is paired with that quotient; a nonzero remainder has the divisor's sign. See [division](division.md). These rules do not select an implicit casting policy, a floating-point representation, or exact arithmetic fault triggers.

## Ranges

```text
loop 1..=10 as number { process(number) }
loop 10..=1 as number { process(number) }
loop (10..=1).step(3) as number { process(number) }
```

The unstepped descending range `10..=1` visits `10, 9, 8, 7, 6, 5, 4, 3, 2, 1`. The stepped range `(10..=1).step(3)` visits `10, 7, 4, 1`. A positive step magnitude follows the direction chosen by bounds. Zero step requires rejection. Equal bounds, exclusive ranges, overflow near numeric limits, and dynamic invalid steps need precise contracts.

## Matching numbers and ranges

Numeric literals and == expected use the shared value-match contract, without implicit numeric-string conversion or approximate Float matching. Float representation, NaN/signed-zero equality, and literal representability remain numeric contracts rather than a separate pattern-equality system.

Matching a range object by equality differs from testing scalar membership. Comparison-chain guards already express an ascending interval; a strided descending range requires its own membership semantics. A bare range pattern or in-prefix pattern is not selected. See the [all-type pattern review](pattern-type-review.md#9-ranges-values-versus-membership) for examples and pending choices.

## Counter versus range value

```text
loop (10..=1).step(3) as value {
    process(value, .count)
}
```

The proposed body counts are `1, 2, 3, 4`, independent of range values. Reverse traversal must not turn the iteration count into a descending index.

## Open decisions

Integer widths, floating-point defaults, exact decimal support, arithmetic promotions, literal polymorphism, casts, noninteger remainder, combined quotient/remainder APIs, exact arithmetic fault triggers and payloads, wrapping operations, and range bounds all remain open.

Arithmetic must support local recovery of an individual operation, including addition overflow, without requiring verbose named checked-arithmetic helpers as its ordinary interface. Basic arithmetic faults use typed panics, not returned `Result` errors. The selected local surface is target-level `else` with typed filters; exact fault cases remain open. See [arithmetic fault boundaries](arithmetic-faults.md).

## Related concepts and references

- [Types and inference](types-and-inference.md)
- [Operators](operators.md)
- [Collections and iterators](collections-and-iterators.md)
- [Zig reference](https://ziglang.org/documentation/master/) is relevant comparison material for explicit numeric representations and safety policies; its build-mode semantics are not adopted.
