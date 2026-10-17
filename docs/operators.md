# Operators

Status: **equality and logical direction established; complete precedence and numeric semantics open**.

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

The full grammar must still specify arithmetic precedence, unary minus, ranges, associativity, and whether comparison chaining is prohibited. Whitespace never selects a different grouping.

## Compound updates

```text
count += 3;
count *= 8;
```

The target is evaluated once. The update uses the corresponding operation's types and overflow behavior.

```text
items[next_index()] += delta;
```

`next_index()` must not be evaluated twice.

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
