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

## Representation proposal

A signed 64-bit default `Int` with checked arithmetic was suggested, with explicit sized types and an optional arbitrary-precision library. This is not yet a selected specification. Overflow should not silently change meaning merely because a different build mode is used.

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

Integer widths, floating-point defaults, exact decimal support, arithmetic promotions, literal polymorphism, casts, division, remainder, overflow errors, wrapping operations, and range bounds all remain open.

## Related concepts and references

- [Types and inference](types-and-inference.md)
- [Operators](operators.md)
- [Collections and iterators](collections-and-iterators.md)
- [Zig reference](https://ziglang.org/documentation/master/) is relevant comparison material for explicit numeric representations and safety policies; its build-mode semantics are not adopted.
