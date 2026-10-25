# Arithmetic methods and the selected division family

Status: **/, _/, %, and _% selected 2026-10-25; ordinary arithmetic methods requested in addition; compact/spaced equivalence required, with underscore/identifier scanning unresolved**. The user retained this family after reviewing underscore boundaries and punctuation-only alternatives. This is a language-design selection, not an implemented lexer, compiler, or numeric API.

## Selected operations

For Int operands without a different expected division result:

```text
b: Int = -7;
c: Int = 2;

b / c;  /* truncating quotient: -3 */
b _/ c; /* floor quotient: -4 */
b % c;  /* remainder: -1 */
b _% c; /* modulo: 1 */
```

With an Int quotient, the truncating pair is / and %; the floor pair is _/ and _%. Their integer identities are a == b * (a / b) + (a % b) and a == b * (a _/ b) + (a _% b), for successful admitted operations. Nonzero remainder follows the dividend; nonzero modulo follows the divisor. Expected Float/Double results retain fractional /; expected Int results truncate, including the selected mixed literal examples. Without a result context, a decimal literal on either side gives fractional division. Broader mixed-value compatibility, conversions, numeric representation, and exact faults remain separate.

The old always-fractional Int division rule, the subsequent operand-only rule, // floor symbol, and %% modulo symbol are superseded. The new family is recorded in [division](division.md) and the updated [signed table](signed-division-table.md). Foreign-language spellings and observed probe results are unchanged.

## Ordinary named operations in addition

The user's requested surface remains ordinary dot calls, including a.plus(b), a.div(b), and a.floorDiv(b). Working operation names correspond to the selected meanings:

```text
a.plus(b)     /* actual binary addition */
a.div(b)      /* corresponding division; exact method typing remains open */
a.floorDiv(b) /* floor quotient */
a.rem(b)      /* truncating remainder */
a.mod(b)      /* floor modulo */
```

Minus/times are coherent additional names, while exact complete method names, signatures, numeric coverage, lookup, and general operator-to-method dispatch still require specification. A method form must preserve its corresponding operation's result, result type, evaluation count/order, and defined failure behavior. Built-in arithmetic returns a value without implicitly replacing the receiver; later assignment retains ordinary var/mut authority requirements.

The method spelling need not force a runtime function call: admitted built-in operations may lower to the same arithmetic as the symbolic form. This is an implementation direction, not a fixed CPU instruction-count guarantee or a completed custom-overload facility. Kotlin-style infix methods remain an explicitly future topic.

The optional identity-leading + remains a no-op entry prefix. It must not invoke plus/unaryPlus, supply an implicit zero, or acquire an extra conversion or failure through this method surface. Actual binary addition is a separate operation.

## Expected result types guide division

Selected 2026-10-25: the expected result type participates in / typing and rounding. Float/Double result contexts preserve the quotient's fraction even with integer-spelled literals. Int result contexts truncate even when either supplied literal is decimal-spelled:

```text
fraction: Float = 2 / 7;   /* approximately 0.285714... */
precise: Double = 2 / 7;   /* approximately 0.285714... */
whole: Int = 2 / 7;        /* 0 */
whole: Int = 2.0 / 7;      /* 0 */
whole: Int = 2 / 7.0;      /* 0 */

left := 2.0 / 7;           /* fractional without an Int result context */
right := 2 / 7.0;          /* fractional without an Int result context */
```

This replaces the earlier requirement that a destination could only check or convert an already chosen quotient. The fractional cases must not truncate first and then widen zero. The shown Int cases are admitted, rather than rejected merely for the decimal literal spelling. No result context leaves the existing integer-only default in place.

The result contract does not settle general stored-value coercion, nonintegral decimal operands under Int division, expected-type propagation through larger expressions/calls/returns, or exact numeric representation. It does not permit truncating operands before division. Numeric methods remain an additional requested surface; complete context flow and signatures for div must preserve corresponding arithmetic behavior when admitted and still need specification. See [the selected literal cases and limits](division.md#contextual-division-selected).

## Compact and spaced forms must agree

The user requires compact/spaced equivalence for these operators, including a_%b and a _% b. The distinct identifier spellings a_b and a_ b still mean one identifier and two identifier tokens respectively; ordinary identifier separation is not removed.

There is an unresolved conflict with the current identifier direction:

```text
a _/ b; /* selected floor operator spelling with an explicit boundary */
a_/b;   /* ordinary longest-identifier scanning would instead read a_ / b */

a _% b; /* selected modulo spelling with an explicit boundary */
a_%b;   /* ordinary longest-identifier scanning would instead read a_ % b */
```

Selecting the symbols does not resolve that conflict or waive the compact/spaced requirement. Do not silently impose mandatory operator spaces, steal trailing underscores from names, reserve all underscore identifiers, or choose tokenization by type-check/lookup success. The exact lexical integration remains open and must be settled before claiming a complete unambiguous grammar or implementing it. Standalone _ remains an ordinary readable name under its existing contract.

The corresponding update family is /=, _/=, %=, and _%=. Once the operator boundary is established, recognize a complete longer update token before its shorter prefix. Precedence remains the shared multiplicative level with left association. No redundant prefix floor operator, missing left operand, or implicit seed follows from the symbol choice.

## Comments and earlier alternatives

The earlier R-style %/% and %% recommendation was not chosen. R remains a reference for floor arithmetic, not the selected LiteScript spelling or a source of general percent-delimited infix operators. The earlier ~/ candidate is likewise unselected; Dart uses it for truncation, not floor division. ASCII tilde and the user's earlier small-tilde glyph are not implicit aliases.

Retiring // as an arithmetic spelling does not itself adopt // line comments. Current nested/raw block comments remain selected. The proposed future spacing-dependent line comment still requires its own lexical decision; no formatter whitespace rule introduces it.

## Separate open contracts

- Resolve compact underscore-operator scanning against ordinary identifier rules.
- Complete numeric compatibility beyond the selected contextual literal cases, expected-type propagation, nonintegral-decimal admission, conversions, and fixed-width/fractional representations.
- Specify exact typed arithmetic panic cases and payloads, including zero divisors and minimum-integer/-1 cases; preserve the existing failure channels.
- Specify exact numeric method signatures and general lookup/overloading/extension behavior.
- Define noninteger floor/remainder/modulo domains, optional combined quotient/remainder APIs, power methods, and any future infix syntax independently.

## Primary comparisons

- [Kotlin operator methods](https://kotlinlang.org/docs/operator-overloading.html) and [numeric division](https://kotlinlang.org/docs/numbers.html#integer-division) inform the additional named surface. LiteScript separately selects contextual division results; these references do not establish that rule or import their wider inference, conversion, and overflow rules.
- [Kotlin floorDiv](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/floor-div.html) and [mod](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/mod.html) provide named floor operations.
- [Dart ~/](https://api.dart.dev/dart-core/num/operator_truncate_divide.html) is truncating division; [R arithmetic](https://stat.ethz.ch/R-manual/R-devel/library/base/html/Arithmetic.html) uses %/% and %% for a floor pair. These earlier spelling alternatives remain comparative history.

## Related documents

- [Division](division.md)
- [Operators](operators.md)
- [Identifiers](identifiers.md)
- [Lexical structure](lexical-structure.md)
- [Evaluation order](evaluation-order.md)
- [Decision ledger](decisions-and-open-questions.md)
