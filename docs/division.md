# Division, remainder, and modulo

Status: **contextual /, floor _/, remainder %, and modulo _% selected 2026-10-25; compact/spaced equivalence remains required, with identifier-boundary scanning unresolved**. Expected Float/Double division retains the fraction; expected Int division truncates, including the selected mixed literal forms. This supersedes the operand-only division rule and the earlier // / %% floor spellings. Complete numeric compatibility, representation, inference, fault rules, and parsing remain open.

## Selected family

For an Int division result, / truncates toward zero; a Float or Double division result retains the fraction. Without an expected result type, the existing integer-only default truncates, while a decimal literal in either operand selects fractional division in the admitted literal examples. Integer _/ rounds toward negative infinity. Remainder % pairs with integer-result truncating /; modulo _% pairs with floor _/.

```text
b: Int = -7;
c: Int = 2;

quotient := b / c;  /* -3 */
floor := b _/ c;    /* -4 */
remainder := b % c; /* -1 */
modulo := b _% c;   /* 1 */
```

## Contextual division selected

An explicit result type constrains the division itself. All of these literal expressions retain the fraction:

```text
from_integers: Float = 2 / 7;    /* approximately 0.285714... */
as_double: Double = 2 / 7;      /* approximately 0.285714... */
left_decimal := 2.0 / 7;        /* fractional */
right_decimal := 2 / 7.0;       /* fractional */
both_decimal := 7.0 / 2.0;      /* 3.5 */
```

With an Int result context, all three supplied literal shapes truncate toward zero:

```text
from_integers: Int = 2 / 7;     /* 0 */
left_decimal: Int = 2.0 / 7;    /* 0 */
right_decimal: Int = 2 / 7.0;   /* 0 */
```

The Float/Double rule also applies to the mixed literal shapes; Int context takes precedence over their fractional default. Thus a decimal point does not force fractional division against an explicit Int result. Conversely, 2 / 7 must not first become integer zero and then widen to Float/Double. Division is checked with its expected result type before selecting the admitted arithmetic operation; this is a static rule, not a runtime type change or formatter rule.

These examples select the result behavior and admission of the shown literals. They do not authorize unrestricted conversion of stored numeric values, truncation of operands before dividing, or a universal numeric assignment cast. Compatibility for already typed mixed operands and nonintegral decimal operands, propagation of expectations through larger expressions/calls/returns, concrete Float/Double representations, and full constraint solving remain open. In particular, the result rule alone does not decide whether 2.5 / 7 is admitted under an Int context. See [types and inference](types-and-inference.md) and [arithmetic methods](arithmetic-methods-and-division-revision.md).

## Integer-only code

```text
var remaining := 100;
remaining /= 2;
remaining += 3;
```

Ordinary integer division needs no floating-point intermediate or mandatory named rounding helper. Floor division remains explicit when its negative-input behavior is intended. Named methods are an additional surface, not the only everyday interface.

## Compound updates

The corresponding updates are /=, _/=, %=, and _%=. Each selects its target once, reads its existing value, evaluates the right operand, computes the matching operation, and writes a compatible result.

```text
var truncated := -7;
truncated /= 2; /* -3 */

var floored := -7;
floored _/= 2; /* -4 */
```

Whole-binding writes require var; held-data writes require mut and the target's ordinary permission. Neither spelling supplies extra write authority. No implicit conversion permits an incompatible result to be stored. /= applies the matching contextual division contract, with the target supplying the expected result type; broader mixed-value compatibility still needs specification.

## Signed floor division

For valid integer operands with an Int division result, a nonzero divisor, and a representable quotient, / discards the fractional part toward zero, while _/ takes the mathematical floor. The unannotated integer-only expressions below retain that default:

```text
7 / 2;    /* 3 */
7 / -2;   /* -3 */
-7 / 2;   /* -3 */
-7 / -2;  /* 3 */

7 _/ 2;   /* 3 */
7 _/ -2;  /* -4 */
-7 _/ 2;  /* -4 */
-7 _/ -2; /* 3 */
```

These rules stay consistent across evaluation contexts and build modes. Lowering to a CPU with truncating division must perform any required floor correction; it cannot silently substitute truncation for _/.

## Integer remainder and modulo selected

The selected names remain remainder (rem) and modulo (mod), following the reviewed Zig terminology. The final LiteScript symbols are % and _%, replacing the earlier %% modulo spelling.

```text
7 % 2;    /* 1 */
7 % -2;   /* 1 */
-7 % 2;   /* -1 */
-7 % -2;  /* -1 */

7 _% 2;   /* 1 */
7 _% -2;  /* -1 */
-7 _% 2;  /* 1 */
-7 _% -2; /* -1 */
```

For successful integer operations with an Int quotient, the mathematical identities are a == b * (a / b) + (a % b) and a == b * (a _/ b) + (a _% b). They describe mathematical values, not required intermediate fixed-width multiplications or fractional conversions.

A nonzero remainder follows the dividend's sign, with abs(a % b) < abs(b). A nonzero modulo result follows the divisor's sign. For positive b, 0 <= a _% b < b; for negative b, b < a _% b <= 0. Both results are zero for exact division. Modulo is not always nonnegative for negative divisors.

The fixed-width minimum % -1 and minimum _% -1 cases still need independent result/fault contracts: their mathematical result is zero even though an associated quotient may be unrepresentable. A naive overflowing product used only to reconstruct a valid result must not introduce a new fault.

## Operator grouping and method surface

The operations * / _/ % _% share the selected multiplicative precedence and binary left association. Parentheses override grouping; actual operands evaluate once in source order. None gains a redundant leading prefix or an implicit initial operand.

The user requests explicit numeric methods in addition: a.plus(b), a.div(b), and a.floorDiv(b). Working names div/rem/floorDiv/mod describe the matching operations; exact numeric signatures and the general operator/method dispatch mechanism remain open. A method spelling must not introduce different rounding or force an extra runtime call for an admitted built-in operation. Future Kotlin-style infix calls remain deferred.

## Lexer interaction

The symbols _/ and _% are selected. The user also requires compact/spaced operator equivalence, including a_%b and a _% b, while underscore remains admitted in identifiers. Ordinary maximal-identifier scanning would read a_%b as a_ % b and a_/b as a_ / b. This conflict remains an explicit unresolved lexical integration question; no mandatory-space rule, stolen trailing underscore, or context-sensitive scanner is silently selected. Examples above use explicit boundaries; they are design examples, not parser verification.

Once an operator boundary is established, longer update tokens _/= and _%= must be recognized before their shorter operator prefixes. Full recognition around identifiers remains pending. See [the compact-form requirement](arithmetic-methods-and-division-revision.md#compact-and-spaced-forms-must-agree).

The former // and %% arithmetic spellings are superseded. This does not introduce a // line-comment form, spacing-dependent comments, or an alias for the old operators. Current block/raw comment rules remain selected; future line comments require a separate decision.

## Open numeric contracts

- Preserve typed panics for defined arithmetic faults and local typed-else recovery; returned Result errors remain a separate channel.
- Define numeric widths, Float/Double representations, broader mixed-value compatibility, conversions, nonintegral-decimal admission under Int division, and inference beyond the selected literal/result contexts.
- Define precise zero-divisor and overflow/unrepresentable-result cases and payloads, including minimum-integer/-1 quotient and remainder/modulo cases.
- Define noninteger floor/remainder/modulo behavior and any combined quotient/remainder API.
- Resolve identifier/operator scanning while retaining the user's compact/spaced requirement; complete the recursive grammar and numeric method signatures.

## Related concepts and references

- [Signed division table across the reference languages](signed-division-table.md)
- [Arithmetic methods and selected family](arithmetic-methods-and-division-revision.md)
- [Operators](operators.md)
- [Numbers](numbers.md)
- [Evaluation order](evaluation-order.md)
- [Comments](comments.md)
- [Arithmetic fault boundaries](arithmetic-faults.md)
