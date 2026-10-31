# Division, remainder, and modulo

Status: **contextual division and quotient storage clarified 2026-10-25; / truncates for Int storage, :/ floors; % remainder and :% modulo remain selected**. A floating operand supplies floating arithmetic even when the destination is Int. Float/Double destinations retain the fraction for /. Compact/spaced equivalence remains required, with identifier-boundary scanning unresolved. Complete numeric representation, inference, fault rules, and parsing remain open.

## Selected family

A floating operand supplies floating division semantics; an Int destination receives the rounded quotient rather than forcing integer operands. For Int storage, / truncates toward zero and :/ rounds toward negative infinity. A Float/Double destination retains the fraction for /, including 2 / 7. Without a result context, a floating operand gives fractional /; integer-only division retains its integer default. Remainder % pairs with truncating integer quotients; modulo :% pairs with floor quotients.

```text
b: Int = -7;
c: Int = 2;

quotient := b / c;  /* -3 */
floor := b :/ c;    /* -4 */
remainder := b % c; /* -1 */
modulo := b :% c;   /* 1 */
```

## Contextual division selected

Distinguish the arithmetic used for the calculation from the value stored. A floating operand, including a nonintegral literal or an established floating value, supplies floating arithmetic. An expected Float/Double result can also request fractional division from integer-spelled literals:

```text
from_integers: Float = 2 / 7;    /* approximately 0.285714... */
as_double: Double = 2 / 7;      /* approximately 0.285714... */
left_decimal := 2.0 / 7;        /* fractional */
right_decimal := 2 / 7.0;       /* fractional */
both_decimal := 7.0 / 2.0;      /* 3.5 */
```

An Int destination accepts the integer part using the selected operation's rounding. These original forms remain admitted:

```text
from_integers: Int = 2 / 7;     /* 0 */
left_decimal: Int = 2.0 / 7;    /* 0 */
right_decimal: Int = 2 / 7.0;   /* 0 */
```

A floating operand keeps its floating arithmetic role under Int storage. The fractional cases do not truncate operands, switch to integer arithmetic because of the destination, or compute integer zero and then widen it to satisfy Float/Double. Ordinary integer-only division still needs no floating intermediate. These are language semantics, not a required sequence of CPU instructions.

## Floating calculation and integer storage

Selected by the user, 2026-10-25: nonintegral floating operands are admitted for division into Int. Calculate with their floating values, then use truncation for / or floor for :/ when producing the stored integer:

```text
positive: Int = 7.5 / 2;       /* 3: quotient 3.75, truncated */
negative: Int = -7.5 / 2;      /* -3: quotient -3.75, truncated */
floored: Int = -7.5 :/ 2;      /* -4: quotient -3.75, floored */
small_divisor: Int = 2 / 0.5;  /* 4: divisor stays 0.5 */

source: Float = 7.5;
from_value: Int = source / 2;  /* 3: floating value, not only literal syntax */
fraction: Float = 7.5 / 2;     /* 3.75 */
```

Truncation discards the fractional part toward zero; floor chooses the greatest integer no larger than the quotient. They agree for positive quotients but differ for negative inexact quotients. Never truncate 0.5 to a zero divisor or truncate 7.5 before division.

The storage rule applies to these division expressions; it does not select an unrestricted Float-to-Int assignment cast or change a source binding's type/value. The floating-expression storage boundary is selected below; complete expected-type propagation and call/return conversion boundaries remain open. So do concrete Float/Double precision, mixed floating widths, representability, overflow, zero divisors, non-finite quotients, and floating remainder/modulo. The examples use small finite quotients and establish expected values, not a LiteScript runtime implementation. See [types and inference](types-and-inference.md), [arithmetic faults](arithmetic-faults.md), and [arithmetic methods](arithmetic-methods-and-division-revision.md).

## Floating intermediates and storage boundaries

Selected by the user, 2026-10-25: in the admitted floating calculation, preserve floating intermediates until the complete expression reaches Int storage. Parentheses group calculations without introducing a numeric conversion. An explicitly typed Int binding introduces a storage boundary:

```text
a: Int = (7.5 / 2) * 2.0; /* 3.75 * 2.0 = 7.5; stores 7 */

half: Int = 7.5 / 2;      /* stores 3 */
b: Int = half * 2;        /* 6: reads the already stored integer */
```

The outer Int destination must not truncate the floating 3.75 intermediate to 3 before the multiplication in the first line. This preserves the source expression's ordinary grouping and evaluation order; it does not permit reassociation or recovering a discarded fraction from half. Explicit rounding operations still have their own semantics; this rule does not postpone an explicit floor operation past later arithmetic.

This settles the shown floating-expression storage boundary. Full expected-type propagation through unresolved integer-only subexpressions, calls, returns, custom arithmetic, and mixed floating widths still needs specification. Broader Float-to-Int assignment conversions and out-of-range/non-finite storage remain separate.

## Integer-only code

```text
var remaining := 100;
remaining /= 2;
remaining += 3;
```

Ordinary integer-only division needs no floating-point intermediate or mandatory named rounding helper:

```text
truncated: Int = -7 / 2;  /* -3: integer calculation */
floored: Int = -7 :/ 2;   /* -4: integer floor calculation */
```

The operators have different rounding for negative inexact quotients, so :/ cannot replace truncating /. A typed Int binding already supplies an explicit integer boundary before later calculations. A Float destination such as fraction: Float = 2 / 7 requests fractional division instead; a context-independent integer quotient inside a larger fractional expression is a separate API question. See [the proposed truncDiv method](arithmetic-methods-and-division-revision.md#explicit-truncating-division-proposal). No additional truncation symbol or method is selected by this storage-boundary decision.

## Compound updates

The corresponding updates are /=, :/=, %=, and :%=. Each selects its target once, reads its existing value, evaluates the right operand, computes the matching operation, and writes a compatible result.

```text
var truncated := -7;
truncated /= 2; /* -3 */

var floored := -7;
floored :/= 2; /* -4 */
```

Whole-binding writes require var; held-data writes require mut and the target's ordinary permission. Neither spelling supplies extra write authority. No implicit conversion permits an incompatible result to be stored. /= and :/= apply the matching calculation/storage contract. An Int target does not strip fractional parts from a floating right operand before division; the matching quotient rounding supplies the stored integer. Exact width/precision compatibility and fault boundaries still need specification.

## Signed floor division

For valid integer operands with an Int division result, a nonzero divisor, and a representable quotient, / discards the fractional part toward zero, while :/ takes the mathematical floor. The unannotated integer-only expressions below retain that default:

```text
7 / 2;    /* 3 */
7 / -2;   /* -3 */
-7 / 2;   /* -3 */
-7 / -2;  /* 3 */

7 :/ 2;   /* 3 */
7 :/ -2;  /* -4 */
-7 :/ 2;  /* -4 */
-7 :/ -2; /* 3 */
```

These rules stay consistent across evaluation contexts and build modes. Lowering to a CPU with truncating division must perform any required floor correction; it cannot silently substitute truncation for :/.

## Integer remainder and modulo selected

The selected names remain remainder (rem) and modulo (mod), following the reviewed Zig terminology. The final LiteScript symbols are % and :%, replacing the earlier %% modulo spelling.

```text
7 % 2;    /* 1 */
7 % -2;   /* 1 */
-7 % 2;   /* -1 */
-7 % -2;  /* -1 */

7 :% 2;   /* 1 */
7 :% -2;  /* -1 */
-7 :% 2;  /* 1 */
-7 :% -2; /* -1 */
```

For successful integer operations with an Int quotient, the mathematical identities are a == b * (a / b) + (a % b) and a == b * (a :/ b) + (a :% b). They describe mathematical values, not required intermediate fixed-width multiplications or fractional conversions.

A nonzero remainder follows the dividend's sign, with abs(a % b) < abs(b). A nonzero modulo result follows the divisor's sign. For positive b, 0 <= a :% b < b; for negative b, b < a :% b <= 0. Both results are zero for exact division. Modulo is not always nonnegative for negative divisors.

The fixed-width minimum % -1 and minimum :% -1 cases still need independent result/fault contracts: their mathematical result is zero even though an associated quotient may be unrepresentable. A naive overflowing product used only to reconstruct a valid result must not introduce a new fault.

## Operator grouping and method surface

The operations * / :/ % :% share the selected multiplicative precedence and binary left association. Parentheses override grouping; actual operands evaluate once in source order. None gains a redundant leading prefix or an implicit initial operand.

The user requests explicit numeric methods in addition: a.plus(b), a.div(b), and a.floorDiv(b). Working names div/rem/floorDiv/mod describe the matching operations; exact numeric signatures and the general operator/method dispatch mechanism remain open. A method spelling must not introduce different rounding or force an extra runtime call for an admitted built-in operation. Future Kotlin-style infix calls remain deferred.

## Lexer interaction

The symbols `:/` and `:%` are selected. The user also requires compact/spaced operator equivalence, including `a:%b` and `a :% b`. Because the spellings begin with a colon, `a:/b` and `a:%b` tokenize as the name `a` followed by the operator; underscore remains admitted in identifiers without conflict. No mandatory-space rule, stolen trailing underscore, or context-sensitive scanner is selected. Examples above use explicit boundaries, but the compact forms are part of the selected contract.

Once an operator boundary is established, longer update tokens :/= and :%= must be recognized before their shorter operator prefixes. Full recognition around identifiers remains pending. See [the compact-form requirement](arithmetic-methods-and-division-revision.md#compact-and-spaced-forms-must-agree).

The former // and %% arithmetic spellings are superseded. This does not introduce a // line-comment form, spacing-dependent comments, or an alias for the old operators. Current block/raw comment rules remain selected; future line comments require a separate decision.

## Open numeric contracts

- Preserve typed panics for defined arithmetic faults and local typed-else recovery; returned Result errors remain a separate channel.
- Define numeric widths, Float/Double precision and mixed-width compatibility, representability/conversion faults, general numeric conversions, and expected-type propagation through unresolved subexpressions/calls/returns. Preserve the selected floating-expression storage boundary.
- Define precise zero-divisor and overflow/unrepresentable-result cases and payloads, including minimum-integer/-1 quotient and remainder/modulo cases.
- Complete floating floor result typing beyond the selected Int-storage cases, floating remainder/modulo, and any combined quotient/remainder API.
- Resolve identifier/operator scanning while retaining the user's compact/spaced requirement; complete the recursive grammar and numeric method signatures.

## Related concepts and references

- [Signed division table across the reference languages](signed-division-table.md)
- [Arithmetic methods and selected family](arithmetic-methods-and-division-revision.md)
- [Operators](operators.md)
- [Numbers](numbers.md)
- [Evaluation order](evaluation-order.md)
- [Comments](comments.md)
- [Arithmetic fault boundaries](arithmetic-faults.md)
