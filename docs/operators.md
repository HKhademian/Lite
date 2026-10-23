# Operators

Status: **equality, comparison chaining, and logical direction established; complete arithmetic precedence and numeric semantics open**.

## Working operator set

```text
+  -  *  /  //  %
==
<  <=  >  >=
and  or  not
=
+=  -=  *=  /=  //=  %=
```

`=` is assignment, not comparison. `:=` and `: Type =` belong to declarations. No increment or decrement operator has been selected.

## Division

`/` produces a fractional quotient; `//` performs integer floor division on integer operands. `7 / 2` produces `3.5`, while `7 // 2` produces the integer quotient `3`. `-7 // 2` produces `-4`, rounding toward negative infinity. `//=` is the corresponding integer update, so ordinary integer arithmetic does not require named division helpers or floating-point conversions.

Integer `%` is paired with the floor quotient: mathematically, `a == b * (a // b) + (a % b)`. A nonzero remainder has the divisor's sign; `-7 % 2` is `1`, and `7 % -2` is `-1`. `%=` uses that same rule.

Numeric representations, noninteger remainder, implicit conversions, and operator failure contracts remain open. See [division](division.md). `//` is an operator, not a newline-terminated comment.

## Equality and negation

Use one equality operator, `==`:

```text
if a == b {
    same()
}

if not a == b {
    different()
}
```

The current design uses `not a == b` for inequality. Earlier proposals for `?=` as equality and `!=` as inequality are superseded. `?=` and `!=` have no currently assigned update meaning either; an `op=` form requires a defined underlying operation.

The user requested a [negated-comparison investigation](negated-comparison-operators.md) on 2026-10-23: =!=, >!, >!=, <!, and <!=, or other readable, unambiguous spellings. The review covers Boolean complements, postfix-propagation collisions, possible generic/fallible type boundaries, and alternatives. The user separately selected type-suffix attachment: T! requires the ! to touch its type, while spacing around a following initializer = is optional. If angle-bracket generics are adopted, grammatical type context must preserve > then attached ! then initializer =. None of the comparison candidates is selected; this does not change the current expression operator set.

## Comparison chains

```text
inside := 0 <= x < 10;
```

Chains compare adjacent operands, evaluate each operand at most once from left to right, and stop at the first false comparison. Each adjacent pair must be statically comparable and produce `Bool`. Equality and ordering operators share the comparison precedence level; mixed operators and changes in direction use the same adjacent-pair rule.

`not 0 <= x < 10` means `not (0 <= x < 10)`. Parentheses can instead make a comparison result an operand, as in `(a < b) == flag`. See [comparison chains](comparison-chains.md) for evaluation examples, ownership constraints, and the difference from a literal `and` rewrite.

## Logical precedence

The intended relative precedence, from tighter to looser, is:

1. Arithmetic.
2. Comparison.
3. `not`.
4. `and`.
5. `or`.

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

The full grammar must still specify arithmetic precedence, unary minus, ranges, and arithmetic associativity. Comparison chaining is selected rather than ordinary binary left/right association of comparisons. Whitespace never selects a different grouping.

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

Ordering and equality support for user-defined types, reference identity, floating-point comparison details, exact arithmetic fault cases and payloads, noninteger remainder, bitwise operators, and short-circuit update forms remain open. Basic arithmetic faults use typed panics, not returned `Result` errors; target-level `else` with typed filters supports local recovery. `and` and `or` are intended to short-circuit, but their complete effect and overload rules need specification. See [arithmetic fault boundaries](arithmetic-faults.md).

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Conditionals](conditionals.md)
- [References](references.md): language operator conventions are comparative, not normative for this operator set.
