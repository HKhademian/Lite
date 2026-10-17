# Fractional and integer division

Status: **fractional `/`, integer floor `//`, and paired integer `%` selected; numeric representations and failure contracts open**.

## Purpose and templates

Use compact operators for ordinary arithmetic in fractional or integer space.

```text
ratio := 7 / 2;     /* fractional result: 3.5 */
quotient := 7 // 2; /* integer quotient: 3 */
```

`/` is fractional division. `//` is integer division on integer operands. Integer division does not pass through a floating-point intermediate or require converting a floating-point quotient back to an integer.

The floating-point type name, width, rounding, and precision rules for `/` remain open. A fractional result does not imply exact rational arithmetic.

## Integer-only code

```text
var remaining := 100;
remaining //= 2;
remaining += 3;
```

On successful evaluation, the stored values remain integers. Ordinary integer division does not require named rounding helpers, a conversion to `Float`, or choosing an advanced arithmetic API.

The earlier family of named `div_trunc`, `div_floor`, `div_ceil`, and `divmod_trunc` helpers is not the selected everyday interface. An advanced library could still supply explicitly named alternatives later; their names and APIs are not adopted here.

## Compound updates

`//=` applies integer floor division and writes the quotient to the selected target. `%=` applies the paired integer remainder rule. They follow the same target-once and left-to-right evaluation rules as other compound updates:

```text
var count := 7;
count //= 2; /* integer quotient: 3 */
```

```text
var negative := -7;
negative //= 2; /* -4 */
```

A whole-binding update needs `var`. A field or element update needs `mut` and the target's other permissions. The result must satisfy the target's static type. `/=` uses fractional division and is not silently substituted for `//=`.

## Signed floor division

`a // b` is the mathematical quotient rounded toward negative infinity, for valid integer operands with nonzero `b` and a representable result. This rule applies to positive and negative divisors:

```text
7 // 2;   /* 3 */
-7 // 2;  /* -4 */
7 // -2;  /* -4 */
-7 // -2; /* 3 */
```

Floor division is not truncation toward zero. The result is consistent across evaluation contexts and build modes. An implementation must account for the signed rounding difference when lowering to an instruction with another rounding rule; it cannot substitute truncation.

## Paired integer remainder

For integer operands, `%` supplies the remainder paired with `//`:

```text
7 % 2;   /* 1 */
-7 % 2;  /* 1 */
7 % -2;  /* -1 */
-7 % -2; /* -1 */
```

The mathematical identity is `a == b * (a // b) + (a % b)`. A nonzero remainder has the divisor's sign. For a positive divisor, `0 <= remainder < b`; for a negative divisor, `b < remainder <= 0`. An exact division has remainder zero.

This identity describes mathematical integer values, not a required fixed-width multiplication intermediate. A valid result must not be rejected merely because a naive computation of `b * quotient` would overflow. The remainder is not guaranteed nonnegative when the divisor is negative.

A combined quotient/remainder API and noninteger `%` behavior remain open. The behavior of `%` when the mathematical quotient is unrepresentable also needs a failure contract; the signed-minimum/`-1` case must not acquire accidental wrapping semantics.

## Lexer interaction

Outside comments and strings, `//` denotes integer division, not a line comment. `//=` is a single compound-update token. Within the slash operator family, recognize the longest valid token; do not split `//=` into `//` and `=`.

```text
quotient := 7//2;
```

This has the same tokens and meaning as the spaced example. Ordinary and raw block comments retain their existing delimiter rules, and newlines never terminate a comment or alter division semantics.

## Open numeric contracts

- Define division by zero and unrepresentable results, including the signed minimum divided by `-1` for fixed-width integers.
- Define the failure representation for operators; the earlier suggestion that named utilities return `Result` does not settle operator result types or add implicit traps.
- Choose floating-point result representations, large-integer precision handling, and mixed numeric operand rules.
- Define noninteger remainder behavior and any combined quotient/remainder API.
- Set arithmetic precedence and associativity in the complete operator grammar.
- Choose implicit conversion and explicit narrowing policies independently of the operator spelling.

Examples illustrate successful values rather than selecting a failure mechanism. These decisions must preserve the goal of explicit recoverable errors and cannot introduce null or undefined results.

## Related concepts and references

- [Operators](operators.md)
- [Numbers and ranges](numbers.md)
- [Evaluation order](evaluation-order.md)
- [Comments](comments.md)
- [Result and errors](result-and-errors.md)
- These operators record the LiteScript design discussion. Their spelling does not automatically adopt another language's rounding or exception rules.
