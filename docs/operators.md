# Operators

Status: **equality, comparison chaining, and logical direction established; complete arithmetic precedence and numeric semantics open**.

## Working operator set

```text
+  -  *  /  %
==
<  <=  >  >=
and  or  not
=
+=  -=  *=  /=  %=
```

`=` is assignment, not comparison. `:=` and `: Type =` belong to declarations. No increment or decrement operator has been selected.

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

Ordering and equality support for user-defined types, reference identity, floating-point comparison details, overflow, division, bitwise operators, and short-circuit update forms remain open. `and` and `or` are intended to short-circuit, but their complete effect and overload rules need specification.

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Conditionals](conditionals.md)
- [References](references.md): language operator conventions are comparative, not normative for this operator set.
