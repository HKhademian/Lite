# Loop type inference from both directions

Status: **destination-side expected types and body-side constraints selected by the user, 2026-10-19; full numeric/operator and inference algorithms open**.

## Body and destination cooperate

A loop's value type is inferred from its body together with the expected type of the surrounding expression. The destination may be an annotated binding, a function result, an argument position, or another established expression context; there is no new loop receiver syntax.

```text
x: Long = loop my_ints {
    .value + .item
}
```

Without then, the loop's normal result is its .value. Therefore the Long expectation constrains .value to Long before its initial zero and arithmetic are typed. The compiler must not first force an Int accumulator solely from the element type and then treat the entire completed loop as an unchecked cast.

Long is the user's illustrative explicit numeric type name, not a new selection of its bit width or primitive naming scheme. The source item's declared type does not change. If it is a fixed Int while .value is Long, addition must obey the eventual numeric compatibility/promotion rules. Destination-side inference does not independently authorize every implicit cast, numeric narrowing, or a special loop-only arithmetic overload.

## A value-only body can be inferred

```text
x: Long = loop source {
    .value
}
```

The destination supplies the missing type: .value is Long, its initial value is that type's zero, and each entry recommits it. No arbitrary default type is needed.

With no independent constraint, x := loop source { .value } remains ambiguous. Knowing that every type has a zero does not decide which type the programmer meant. Require ordinary type information rather than inventing a type or choosing an arbitrary union alternative.

## Completion can have a different result type

```text
label: String = loop numbers as number {
    .value + number
} then {
    format_total(.value)
}
```

Assume numbers has Int elements and format_total accepts Int and returns String. Here the body's value type T is Int while the final result R is String. The destination constrains R; then and its operations can transmit constraints to T. A String destination does not force an unrelated body accumulator to become String.

When then simply returns .value, T and R are directly connected and the destination can constrain both. When then returns a constant unrelated to .value, the body still needs its own T constraints.

## All paths must agree with their contracts

- Body tail expressions and continue value must satisfy the selected body type T.
- Then tail expressions, break value, and return @loop value must satisfy the final result R.
- Bare break and plain continue do not invent new value types.
- Assignment/declaration tails produce Unit; a Long destination does not silently turn such a body into a numeric sum.
- Conditional/match branches retain their ordinary type/union rules; inference cannot erase incompatible operations.
- Types and zero representations are determined at compile time, before runtime source checks or body execution.

Full overload resolution, literal polymorphism, numeric promotion, unions, ownership, and targeted-result-only search inference remain separate formalization work. See [numbers](numbers.md), [loop value](loop-value.md), [completion](loop-completion.md), and [general inference](types-and-inference.md).
