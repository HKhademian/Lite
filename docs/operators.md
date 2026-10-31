# Operators

Status: **all ten positive/negated comparison operators selected at one shared comparison precedence on 2026-10-23; optional leading and/or in conditions and ordinary Boolean expressions selected 2026-10-24; identity leading plus on additive chains selected 2026-10-25; basic arithmetic grouping selected 2026-10-25; comparison chaining and logical direction established; power spelling and explicit unary-minus grouping selected 2026-10-25; remaining expression integration and numeric semantics open**.

## Working operator set

```text
+  -  *  /  :/  %  :%  **
==  =!=  >  >!  <  <!  >=  >!=  <=  <!=
and  or  not
=
+=  -=  *=  /=  :/=  %=  :%=
```

`=` is assignment, not comparison. `:=` and `: Type =` belong to declarations. No increment or decrement operator has been selected.

## Optional leading plus selected

Selected 2026-10-25: a complete additive-chain entry permits one optional leading +, including a singleton. total := + rent + groceries + transport has the same meaning as the form without the first +; the ordinary initializer can be written over several lines without parentheses. For an admitted operand, +A preserves A's value/type and evaluates that occurrence once. No implicit zero, extra addition/overload call, numeric conversion, promotion, or new effect/failure is introduced.

This identity rule does not extend to minus: -A retains negation and cannot be ignored as redundant punctuation. Leading * or / is not selected; no implicit 1 seed, reciprocal, or other unary meaning follows. There is likewise no automatic leading :/, %, or :% rule. Preserve every actual interior operator and the original grouping/evaluation contracts. Require a real operand and no stacked/interior extra redundant leaders. Basic arithmetic grouping is selected below; complete unary integration and nonnumeric/custom arithmetic contracts remain open. See [additive leading plus](leading-separators.md#additive-chains-with-leading-plus).

## Basic arithmetic grouping selected

Selected 2026-10-25: within the selected arithmetic operator set, precedence runs from tighter to looser:

1. Prefix negation: `-a`.
2. Multiplicative operations: `*`, `/`, `:/`, `%`, `:%`.
3. Additive operations: binary `+`, `-`.

Binary operators at each level associate left to right. Parentheses override grouping:

```text
2 + 3 * 4;   /* 2 + (3 * 4): 14 */
20 - 5 - 2;  /* (20 - 5) - 2: 13 */
20 :/ 5 * 2; /* (20 :/ 5) * 2: 8 */
-2 * 3;      /* (-2) * 3: -6 */
```

An optional leading + at a complete additive-chain entry leaves this grouping unchanged. Binary associativity does not authorize regrouping or reordering actual operations; ordinary operands still evaluate left to right under the separate [evaluation contract](evaluation-order.md#operator-operands).

This selects the basic ladder, not a completed expression grammar. The `**` power spelling and explicit grouping at the unary-minus/base boundary are selected separately below. Power association, complete precedence/integration, operand/result typing, power updates, bitwise operations, and numeric conversions remain open. The [cross-language arithmetic comparison](arithmetic-operators-comparison.md) records primary sources and foreign-runtime probes without adopting their extra operators or numeric contracts.

## Power and unary minus selected

Selected 2026-10-25: use `**` for power and reject an unparenthesized unary-minus/power spelling such as -2 `**` 2 or -base `**` exponent. Require (-base) `**` exponent for a negative base, or -(base `**` exponent) to negate the completed power. The odd case -2 `**` 3 is also invalid even though its two mathematical interpretations both give -8. Outer grouping alone, (-2 `**` 2), does not clarify the inner boundary. This is a syntax restriction, independent of values, types, whitespace, comments, and constant folding.

This selects the spelling and grouping requirement, not a complete power contract. Chained-power association, right-operand forms, full precedence/recursive grammar, result types, and exact numeric/fault rules remain open; `**=` is not selected. See [power and negation](power-and-negation.md) for primary-source comparisons and the selected distinction from Python/Lua precedence.

## Division

Selected 2026-10-25: floating operands supply floating division semantics, even for Int storage. For an Int destination, / truncates the quotient toward zero and :/ floors it: -7.5 / 2 stores -3, while -7.5 :/ 2 stores -4. Nonintegral literals and established floating values are admitted; operands retain their values, so 2 / 0.5 stores 4. Float/Double results keep / fractional, including 2 / 7. With no floating operand or fractional expected result, integer-only division retains its integer default. See [calculation and storage](division.md#floating-calculation-and-integer-storage).

Implementation note, 2026-10-31: the igniter currently implements Int `%`, `:/` and `:%`, plus compound `+= -= *= /= %= :/= :%=` updates. Float floor/remainder and compiler-target lowering for these operators remain open.

Integer % is truncating remainder and :% is floor modulo. A nonzero remainder follows the dividend; a nonzero modulo follows the divisor. With an Int quotient, the successful integer identities are a == b * (a / b) + (a % b) and a == b * (a :/ b) + (a :% b). The corresponding updates are /=, :/=, %=, and :%=.

This supersedes always-fractional /, the subsequent operand-only rule, // floor division, and %% modulo. General conversions, mixed floating widths/precision, expected-type propagation through unresolved subexpressions/calls/returns, floating floor result types beyond Int storage, floating remainder/modulo, and fault rules remain open. No // line-comment rule is introduced. See [division](division.md) and [the selected family and open lexical boundary](arithmetic-methods-and-division-revision.md).

Preserve floating intermediates until the complete admitted expression reaches Int storage: a: Int = (7.5 / 2) * 2.0 stores 7. Parentheses group without truncating; half: Int = 7.5 / 2 first stores 3, so a later half * 2 gives 6. This does not postpone explicit floor or other rounding operations. See [storage boundaries](division.md#floating-intermediates-and-storage-boundaries).

## Equality and negation

Use `==` for equality and `=!=` for its Boolean complement:

```text
if a == b {
    same()
}

if a =!= b {
    different()
}
```

`not a == b` remains equivalent to `not (a == b)` for one comparison; `=!=` expresses inequality within one adjacent comparison of a longer chain. Earlier proposals for `?=` as equality and conventional `!=` as inequality remain superseded. Neither token gains an assigned meaning from the selected `=!=` spelling.

The user selected the [negated-comparison family](negated-comparison-operators.md) on 2026-10-23: =!= negates ==, >! negates >, >!= negates >=, <! negates <, and <!= negates <=. Each negative form invokes the corresponding positive comparison once on the evaluated operands and complements its normal Bool result, preserving failure and effect behavior. It does not negate an operand, independently overload a different relation, or unconditionally rewrite to the opposite ordering. Complete custom-comparison and Float contracts remain open.

All ten are expression comparison tokens. Recognize longer members before their prefixes in expression context; a trailing = belongs to the comparison token and does not introduce a compound update. Type-suffix attachment remains separately selected: T! requires ! to touch its type, with optional spacing around a following initializer =. If angle-bracket generics are adopted, grammatical type context must preserve > then attached ! then initializer =. This operator selection does not adopt a generic grammar. The user also selected the same ten operators as nonbinding comparison-pattern prefixes, with runtime right operands evaluated once when reached and ordinary comparison/failure semantics.

## Comparison chains

```text
inside := 0 <= x < 10;
```

Chains compare adjacent operands, evaluate each operand at most once from left to right, and stop at the first false comparison. Each adjacent pair must be statically comparable and produce `Bool`. All ten operators ==, =!=, >, >!, <, <!, >=, >!=, <=, and <!= share exactly one comparison precedence level. Mixed positive/negative operators and changes in direction use the same adjacent-pair rule, rather than comparing an intermediate Bool with the next operand.

`not 0 <= x < 10` means `not (0 <= x < 10)`. Parentheses can instead make a comparison result an operand, as in `(a < b) == flag`. See [comparison chains](comparison-chains.md) for evaluation examples, ownership constraints, and the difference from a literal `and` rewrite.

## Logical precedence

The intended relative precedence, from tighter to looser, is:

1. Prefix arithmetic negation.
2. Multiplicative `* / :/ % :%`.
3. Additive `+ -`.
4. Comparison.
5. `not`.
6. `and`.
7. `or`.

```text
not a == b and ready
```

means:

```text
(not (a == b)) and ready
```

To negate only `a` before comparing:

```text
(not a) == b
```

The basic arithmetic levels and left association above are selected. The full grammar must still integrate unary forms, ranges, calls/access, and recovery; power requires explicit grouping at the unary-minus/base boundary, while its remaining contracts stay open. Comparison chaining is selected rather than ordinary binary left/right association of comparisons. Whitespace never selects a different grouping.

## Optional leading logical separators selected

A complete Boolean expression or condition may start with one optional `and` or `or`, selected 2026-10-24. For example, if and a and b is equivalent to if a and b, and if or a and b or c is equivalent to if (a and b) or c. An initializer such as ready := and a and b; and a Boolean loop source such as loop and a and b { body } need no extra parentheses. An explicitly grouped expression/condition also establishes its own entry. The leading token is presentation punctuation, not a unary operator or implicit Boolean operand. Normal not/and/or precedence, short-circuiting, effects/failures, bindings, and narrowing remain unchanged.

Require at least one real operand and Bool typing for a prefixed ordinary value expression, even a singleton. Reject stacked leaders, an extra leader after an interior operator, and trailing operators. This selection covers ordinary Boolean expressions, Boolean loop sources, subjectless match Boolean headers, if/else-if conditions, and subject-based match guards. Ordinary value positions gain no condition-pattern bindings. Initial/nested pattern alternatives separately allow one leading or under their pattern grammar; this is not a new logical subpattern operator. Existing item/header delimiters apply independently of line layout. Leading | is selected separately in plain-union type context; leading & awaits intersection-type selection. See [optional leading separators](leading-separators.md) for examples and boundaries.

## Negation scope in conditions selected

Selected on **2026-10-24**: not negates the following complete Boolean operand or existing-name type test. A comparison chain completes before not; an existing-name type test likewise completes before not. Then and binds more tightly than or. The spellings if not, and not, and or not are readable keyword sequences using that same prefix operator, not separate operators with a different scope.

```text
if not blocked or trusted and ready {
    proceed()
}
```

Assume blocked, trusted, and ready are Bool and proceed returns Unit. The grouping is:

```text
if (not blocked) or (trusted and ready) {
    proceed()
}
```

If blocked is false, the first alternative succeeds and trusted/ready are skipped; readiness is not required on that path. Requiring ready for either alternative needs explicit grouping:

```text
if ((not blocked) or trusted) and ready {
    proceed()
}
```

Use parentheses to extend negation over a compound condition, as in not (blocked or restricted). Ordinary single comparisons retain their selected spelling and meaning, including not actual == expected and not (actual == expected).

Existing-name type tests permit the concise form if not value: String, equivalent to if not (value: String). For stable value: String | Int, if not value: String and value > 0 tests the comparison with value as Int. No name is introduced, and supported narrowing remains subject to stability. See [type tests](type-tests-and-narrowing.md#negation-and-condition-precedence-selected).

Source-pattern conditions retain grouped negation: not (.Some(user) := source) and not (user: User = source). Ungrouped not pattern := source or not name: Type = source is rejected; this selection adds shorthand only for existing-name tests alongside ordinary Boolean negation. This grouped requirement also preserves the existing rule for source-patterns that introduce no names. All names introduced inside negation remain internal, including through double negation; see [negated matching conditions](condition-chains.md#negated-matching-conditions-selected).

Negation complements only a normal Boolean result. Preserve short-circuiting, effects, source evaluation, and failures/exits. Not remains usable in ordinary value expressions such as allowed := not blocked; no preceding if/and/or keyword is required. This selects condition scope and the illustrated type-test precedence, not a complete expression/type parser or new logical subpatterns.

## Recoverable error propagation

Postfix `!` extracts one Result success payload or returns its declared recoverable error from the nearest function or closure. It participates in left-to-right postfix chaining:

```text
name := load_user(id)!.load_profile()!.name;
```

`!.` is propagation followed by ordinary member access, not a nullable accessor. Each marked outcome is evaluated once; failure prevents later chain steps from running. The enclosing function must declare every error that can escape. This operator neither asserts success nor triggers or catches a panic. Prefix `try` and postfix `?` are not alternative propagation spellings. Option handling and the full expression-precedence grammar remain open. See [Result and errors](result-and-errors.md) and [propagation and call chaining](propagation-and-chaining.md).

## Evaluation order

Ordinary operator operands evaluate left to right after precedence establishes grouping. Function arguments also evaluate left to right, after evaluating the callee. Short-circuiting skips unneeded operands. See [evaluation order](evaluation-order.md), including target selection before right-hand-side evaluation for assignment and compound updates.

## Compound updates

```text
count += 3;
count *= 8;
```

The target is evaluated once. The update uses the corresponding operation's types and overflow behavior.

Permission follows the assignment target. `var count := 0; count += 1;` updates the binding and requires `var`. `mut user := make_user(); user.age += 1;` updates held data and requires `mut`, plus permission to write the field. Neither modifier supplies the other capability. The same distinction applies to plain `=`.

Compound assignment computes the corresponding operation's result and writes the target; it does not silently grant an in-place mutation capability to a `var`-only binding. An optimization must preserve the program's observable access and aliasing semantics.

```text
items[next_index()] += delta;
```

`next_index()` must not be evaluated twice. This example requires writable element access through `items`, supplied by `mut` and the eventual collection/ownership contract.

`not` is unary, so `x not= x` has no defined binary-update expansion. Use:

```text
enabled = not enabled;
```

## Notes and open decisions

The user selects /, :/, %, and :% and requests named methods in addition, including a.plus(b), a.div(b), and a.floorDiv(b). Working div/rem/floorDiv/mod names follow the matching operations. Complete signatures/dispatch remain open; `a:/b` has exactly one reading, `a :/ b`, while the retired `a_/b` could be read as `a_ / b` or `a _/ b`. See [the selected family](arithmetic-methods-and-division-revision.md); future infix methods remain deferred.

Ordering and equality support for user-defined types, reference identity, floating-point comparison details, exact arithmetic fault cases and payloads, noninteger remainder, bitwise operators, and short-circuit update forms remain open. Basic arithmetic faults use typed panics, not returned `Result` errors; target-level `else` with typed filters supports local recovery. `and` and `or` are intended to short-circuit, but their complete effect and overload rules need specification. See [arithmetic fault boundaries](arithmetic-faults.md).

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Conditionals](conditionals.md)
- [References](references.md): language operator conventions are comparative, not normative for this operator set.
