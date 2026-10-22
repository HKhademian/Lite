# Tuple value entries and positional access

Status: **named-entry shorthand and zero-based positional access selected by the user, 2026-10-21; design contract, not an implemented parser/runtime**.

## Selected value entry forms

```text
cake := 10;
tea := 20;

plain := (cake, tea);              /* unnamed components */
meal := (= cake, = tea);           /* named components */
meal := (cake = cake, tea = tea);  /* equivalent full spelling */
order := (dessert = cake, drink = tea);
```

In a tuple value, an ordinary expression supplies a positional component without inferring a label from its spelling. The shorthand = identifier uses that identifier both as the component label and as the lexical value expression. Thus = cake expands to cake = cake, not to an explicitly unnamed entry. The earlier proposal that bare identifiers infer labels was not selected.

A descriptive entry production is:

```text
tuple_value_entry := expression
                   | identifier "=" expression
                   | "=" identifier
```

This outlines entries inside an established tuple value; it does not complete grouping, singleton, spread, assignment, or recursive expression grammar. The shorthand applies to tuple values, not automatically to function arguments, records, patterns, or tuple types.

The shorthand requires an ordinary identifier resolving to a value. It cannot derive a label from a call, member access, grouped operand, or arbitrary expression:

```text
meal := (cake = bake(), tea = brew()); /* explicit labels for expressions */
meal := (= bake(), = tea);            /* rejected: bake() is not an identifier */
```

Underscore remains an ordinary identifier; = _ refers to its visible binding and supplies the label _. Duplicate labels are rejected, including duplicates introduced by shorthand. Existing positional-prefix/named-suffix rules still apply: (= cake, tea) places a positional entry after a named one and is rejected. Standalone inference of a partially named tuple such as (cake, = tea) remains open.

Evaluate each supplied value once in written order. Shorthand adds no extra lookup, evaluation, clone, allocation, or mutation permission beyond the equivalent full entry.

## Expected named types still accept positional entries

```text
meal: (cake: Int, tea: Int) = (10, 20);
meal: (cake: Int, tea: Int) = (cake, tea);
meal: (cake: Int, tea: Int) = (= tea, = cake);
```

All three construct cake, tea destination order. The last initializer evaluates tea before cake, while the resulting positions still follow the expected type. Without an expected type, (= tea, = cake) instead infers tea, cake order. Bare expressions do not become shorthand merely because their lexical names resemble destination labels.

Tuple type context retains its separate forms: (cake, tea) supplies inferred labels, (cake: Int, tea: Int) supplies explicit named types, and (:Int, :Int) supplies unnamed types. The = identifier shorthand does not apply there.

## Selected positional access

```text
meal := (= cake, = tea);
plain := (cake, tea);

meal.cake; /* 10 */
meal.tea;  /* 20 */
meal.0;    /* same component as meal.cake */
meal.1;    /* same component as meal.tea */
plain.0;   /* 10 */
plain.1;   /* 20 */
meal.2;    /* compile error: position outside this two-component tuple */
```

Both named and unnamed tuples expose zero-based numeric dot access in stored component order. Each position has its statically known component type; heterogeneous components need no dynamic lookup or union of all component types. The receiver is evaluated once for each access expression. Numeric access does not remove labels from the whole tuple's type and does not bypass its label-sensitive identity. Reading the same component by name or position grants the same existing access permissions.

The selected syntax uses a fixed numeric position, not a runtime index expression. Dynamic tuple indexing and writes through numeric access require their own contracts; this selection does not grant mutation authority.

## Explicit reconstruction examples

```text
meal := (= cake, = tea);
plain := (meal.cake, meal.tea);
plain := (meal.0, meal.1);

meal: (cake: Int, tea: Int) = (plain.0, plain.1);
```

These construct a new tuple explicitly. Admission of an intact stored named tuple to an unnamed destination, or the reverse, remains a separate open conversion policy.

## Remaining grammar and inference issues

- Empty/singleton tuples and their distinction from grouping remain open; named shorthand alone does not select a singleton production.
- Mixed named/unnamed standalone inference and mixed tuple type components remain open. Known named destinations retain the selected positional-prefix/named-suffix construction rules.
- Numeric member suffixes need a deliberate lexer/parser boundary. A standalone .5 is not a fractional literal; tuple.5 is a member access when that position exists. Nested access such as pair.0.1 must not accidentally tokenize 0.1 as a decimal literal. Exact scanning and numeric suffix spellings remain to be formalized without relying on whitespace or type checking to choose the parse.
- Union receivers without a common tuple shape, dynamic indexing, and numeric access assignment rules remain separate type/access decisions.

Related: [named input routing](named-input-routing.md), [tuple patterns](tuples-and-patterns.md), [grammar sketch](grammar-sketch.md), and [lexical structure](lexical-structure.md).
