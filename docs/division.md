# Fractional and integer division

Status: **`/`, `//`, and the corresponding update forms selected; signed integer rounding, remainder, and failure contracts open**.

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

`//=` applies integer division and writes the quotient to the selected target. It follows the same target-once and left-to-right evaluation rules as other compound updates:

```text
var count := 7;
count //= 2; /* integer quotient: 3 */
```

A whole-binding update needs `var`. A field or element update needs `mut` and the target's other permissions. The result must satisfy the target's static type. `/=` uses fractional division and is not silently substituted for `//=`.

## Signed rounding: decision pending

Nonnegative examples do not choose the signed rounding rule. With operands of different signs, the main candidates differ:

- Floor division: `-7 // 2` produces `-4`.
- Truncation toward zero: `-7 // 2` produces `-3`.

The operator spelling is accepted; neither negative result is selected yet. The rule must be consistent across evaluation contexts and build modes.

`%` also needs a remainder rule paired with the selected quotient so that `a == b * quotient + remainder` holds mathematically for valid operands. A combined quotient/remainder API remains open.

## Lexer interaction

Outside comments and strings, `//` denotes integer division, not a line comment. `//=` is a single compound-update token. Within the slash operator family, recognize the longest valid token; do not split `//=` into `//` and `=`.

```text
quotient := 7//2;
```

This has the same tokens and meaning as the spaced example. Ordinary and raw block comments retain their existing delimiter rules, and newlines never terminate a comment or alter division semantics.

## Open numeric contracts

- Choose signed integer rounding and its paired remainder rule.
- Define division by zero and unrepresentable results, including the signed minimum divided by `-1` for fixed-width integers.
- Define the failure representation for operators; the earlier suggestion that named utilities return `Result` does not settle operator result types or add implicit traps.
- Choose floating-point result representations, large-integer precision handling, and mixed numeric operand rules.
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
