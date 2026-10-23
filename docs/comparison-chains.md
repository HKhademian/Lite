# Comparison chains

Status: **accepted; all ten positive/negated comparison operators share this precedence and chain contract, selected 2026-10-23; custom comparison and ownership contracts still need formalization**.

## Purpose and template

Express mathematical bounds and adjacent comparisons without repeating the middle expression.

```text
lower <= value < upper
```

Supported comparison operators are `==`, `=!=`, `>`, `>!`, `<`, `<!`, `>=`, `>!=`, `<=`, and `<!=`. All ten share exactly one comparison precedence level. A chain produces `Bool`.

## Adjacent-pair rule

```text
a < b <= c
```

requires `a < b` and `b <= c` to succeed. It does not compare a Boolean intermediate result with `c`, and it does not add a direct comparison between `a` and `c`.

Mixed operators, equality chains, and changes in direction use the same rule:

```text
a < b > c;    /* a < b and b > c */
a == b == c;  /* a == b and b == c */
a < b == c;   /* a < b and b == c */
a >! b < c;   /* not (a > b), then b < c */
a =!= b == c; /* not (a == b), then b == c */
```

These comments describe logical conditions. Repeating a source expression in a literal `and` rewrite is not equivalent when that expression has effects.

A negated operator complements only its adjacent positive comparison: =!= negates ==, >! negates >, >!= negates >=, <! negates <, and <!= negates <=. If the resulting Bool is false, the chain stops. Prefix not instead negates the complete chain. For example, not a > b < c means not ((a > b) and (b < c)) under single-evaluation chain semantics; it is not the same rule as a >! b < c. See [negated comparisons](negated-comparison-operators.md).

## Evaluation and short-circuiting

```text
inside := low() < value() < high();
```

1. Evaluate `low()`, then `value()`.
2. Compare their results.
3. If the comparison is false, the chain is false and `high()` is not evaluated.
4. Otherwise, evaluate `high()` and compare the retained middle result with it.

Every operand expression is evaluated at most once, in source order. A successful chain evaluates every operand once. A failed chain skips operands beyond the comparison that failed.

Conceptually, this example behaves like:

```text
inside := {
    left := low();
    middle := value();
    if left < middle {
        middle < high()
    } else {
        false
    }
}
```

This is an explanation of evaluation, not a literal source substitution. Compiler temporaries must not capture user names. An explicit exit during operand evaluation follows the normal exit rules and stops the chain.

Chains follow the selected [left-to-right evaluation order](evaluation-order.md). Their single-evaluation and short-circuit rules additionally determine which later operands are skipped.

## Types and grouping

Every adjacent pair must be statically comparable, and every comparison must produce `Bool`. All pairs are type-checked even if a preceding constant comparison would short-circuit. There is no implicit truthiness or conversion from `Bool` to a numeric operand.

Parentheses explicitly separate a comparison result from the chain:

```text
(a < b) == flag /* compares a Bool result with flag */
```

The established precedence of `not` applies to the whole comparison chain:

```text
not 0 <= x < 10
```

means `not (0 <= x < 10)`. Use explicit parentheses to express another grouping. Whitespace never changes these rules.

## Ownership and cost

A middle operand must remain available for the next adjacent comparison. The compiler must retain its evaluated result according to the selected value/reference model, without silently cloning it or upgrading access permissions. Retention does not imply freezing a referenced object or taking a deep snapshot. Borrowing and aliasing restrictions still apply.

The semantics can be represented with temporaries and conditional control flow. They do not inherently require heap allocation or a larger runtime. Precise lowering, temporary lifetimes, cleanup, and representation costs depend on the unimplemented compiler and unchosen memory model.

## Notes and open decisions

Custom comparison interfaces, operand borrowing/consumption, comparison effects, floating-point behavior, and diagnostics for confusing mixed chains remain open. Those questions do not change the selected adjacent-pair, single-evaluation, and short-circuit rules.

## Related concepts and references

- [Operators](operators.md)
- [Grammar sketch](grammar-sketch.md)
- [Memory and performance](memory-and-performance.md)
- [Python comparisons](https://docs.python.org/3/reference/expressions.html#comparisons): comparison material for adjacent-pair semantics, evaluation at most once, and short-circuiting. LiteScript requires `Bool` comparison results and does not adopt Python's operator set or dynamic comparison rules.
