# Division, remainder, and modulo

Status: **fractional `/` and integer floor `//` selected; `%` remainder and `%%` modulo selected 2026-10-25, superseding the earlier floor-paired `%` meaning; arithmetic faults use typed panics, while numeric representations and exact fault cases remain open**.

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

`//=` applies integer floor division and writes the quotient to the selected target. `%=` applies truncating remainder; `%%=` applies floor-paired modulo. They follow the same target-once and left-to-right evaluation rules as other compound updates:

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

## Integer remainder and modulo selected

Selected 2026-10-25: use Odin's operator symbols with Zig's operation names: `%` is **remainder** (rem), and `%%` is **modulo** (mod). The earlier choice of floor-paired `%` is superseded. These names describe the operators; no named rem/mod builtin or @-prefixed call syntax is added.

For valid integer operands with a nonzero divisor:

```text
7 % 2;    /* 1 */
-7 % 2;   /* -1 */
7 % -2;   /* 1 */
-7 % -2;  /* -1 */

7 %% 2;   /* 1 */
-7 %% 2;  /* 1 */
7 %% -2;  /* -1 */
-7 %% -2; /* -1 */
```

Remainder `%` pairs with a mathematical quotient truncated toward zero. Write q_trunc for that integer quotient; then a == b * q_trunc + (a % b). A nonzero remainder follows the dividend's sign, and abs(a % b) < abs(b). This mathematical definition does not require fractional division, a floating-point conversion, or an intermediate quotient operation in the program. It adds no new truncating-division operator.

Modulo `%%` pairs with the selected floor quotient `//`: mathematically, a == b * (a // b) + (a %% b). A nonzero modulo result follows the divisor's sign. For a positive divisor, 0 <= a %% b < b; for a negative divisor, b < a %% b <= 0. Modulo is therefore not always nonnegative when negative divisors are allowed. Both operations produce zero for an exact division.

These identities describe mathematical integer values, not required fixed-width multiplication intermediates. A valid result must not fail merely because a naive computation of b * quotient would overflow. The fixed-width minimum % -1 and minimum %% -1 cases still require independent result/fault contracts: a mathematical result of zero does not settle whether an unrepresentable associated quotient causes a fault.

Both operators belong to the selected multiplicative precedence level with * / // and associate left to right. Their compound updates preserve the corresponding operation's semantics and the ordinary target-once/source-order rules. Neither gains a redundant leading-prefix form.

Noninteger remainder/modulo and a combined quotient/remainder API remain open. The [cross-language comparison](arithmetic-operators-comparison.md#symbols-and-signed-results-are-separate-choices) explains the reference contracts; it does not import numeric representations, overflow policy, or foreign operator names as callable APIs.

## Lexer interaction

Outside comments and strings, `//` denotes integer division, not a line comment. `//=` is a single compound-update token. Within the slash operator family, recognize the longest valid token; do not split `//=` into `//` and `=`. In the percent family, recognize `%%=` and `%%` before shorter `%=` and `%` prefixes. Thus `a%%b` is one modulo expression, not two remainder operators; `%%=` is one compound-update token.

```text
quotient := 7//2;
```

This has the same tokens and meaning as the spaced example. Ordinary and raw block comments retain their existing delimiter rules, and newlines never terminate a comment or alter division semantics.

## Open numeric contracts

- Arithmetic faults use the typed panic channel, not returned `Result` errors. Individual operations can be recovered through target-level `else` with a typed filter; exact category names and target boundary remain open. See [arithmetic fault boundaries](arithmetic-faults.md).
- Define division by zero and unrepresentable results, including the signed minimum divided by `-1` for fixed-width integers.
- Define arithmetic panic categories and payloads. The channel does not settle which floating-point cases are faults or make operators return `Result`.
- Choose floating-point result representations, large-integer precision handling, and mixed numeric operand rules.
- Define noninteger remainder/modulo behavior and any combined quotient/remainder API.
- Preserve the selected shared multiplicative level for * / // % %% and binary left association; complete integration with other expression forms and any future exponentiation remains open. See [arithmetic grouping](operators.md#basic-arithmetic-grouping-selected).
- Choose implicit conversion and explicit narrowing policies independently of the operator spelling.

Examples illustrate successful values rather than selecting a failure mechanism. These decisions must preserve the goal of explicit recoverable errors and cannot introduce null or undefined results.

## Related concepts and references

- [Operators](operators.md)
- [Numbers and ranges](numbers.md)
- [Evaluation order](evaluation-order.md)
- [Comments](comments.md)
- [Result and errors](result-and-errors.md)
- These operators record the LiteScript design discussion. Their spelling does not automatically adopt another language's rounding or exception rules.
