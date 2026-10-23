# Tuple construction spread and pattern rest

Status: **construction spread and typed pattern rest requested by the user, 2026-10-19; positional tuple rest shape, placement, and arity selected 2026-10-22; preservation of remainder labels selected 2026-10-23; construction spread remains a proposal**. Singleton value forms were selected later: (value,) is an unnamed singleton, while (value) groups. Rest after named selectors, variadic tuple-type declarations, complete recursive type/pattern integration, and ownership remain separate decisions. The empty tuple is selected as Unit, with () as equivalent value/type syntax. This is a design contract, not implemented parser/runtime behavior.

## Positional tuple rest selected

Selected by the user, 2026-10-22: a positional tuple pattern may contain one ...rest capture, placed last. It binds the remaining components as a tuple, preserving their individual types and stored order.

```text
(first, ...rest) := (1,);      /* first = 1; rest = () */
(first, ...rest) := (1, 2);    /* first = 1; rest = (2,) */
(first, ...rest) := (1, 2, 3); /* first = 1; rest = (2, 3) */
(first, ...rest) := (1, "a", true); /* rest has type (:String, :Bool) */
```

Zero remaining components produce Unit/(); one produces a singleton tuple rather than a scalar. Omitting rest requires exact arity. A rest capture permits zero remaining components but never fills a missing required component.

```text
/* rejected ordinary declarations: */
/* (first, ...rest) := ();          required first component missing */
/* (first, ...rest, last) := (1, 2); rest must be last */
/* (first, ...a, ...b) := (1, 2);    only one rest capture */
/* (first, second) := (1, 2, 3);    extra component without rest */
```

Ordinary declarations require an irrefutable match for the source contract. Supported conditional/match contexts retain their mismatch rules when required components or their subpatterns fail. Evaluate the source once before introducing bindings. This selection covers positional tuple patterns, including named/mixed source tuples with label preservation below; it does not select rest after named selectors, list rest, rest-only pattern spelling, or new header-pattern support. Copy/move/borrow and simultaneous ownership remain separate; capturing a tuple does not itself promise heap allocation or deep cloning.

## Remainder labels selected

Selected by the user, 2026-10-23: positional tuple rest preserves each remaining component's label, if present, along with its type and stored order. Removing a positional prefix does not rename, reorder, or remove labels from the suffix. Numeric positions restart at zero within the remainder.

```text
meal := (cake = 10, tea = 20, fruit = 30);
(first, ...rest) := meal;
/* first = 10; rest has type (tea: Int, fruit: Int) */
rest.0;     /* 20 */
rest.tea;   /* 20 */
rest.1;     /* 30 */
rest.fruit; /* 30 */

(first, ...rest) := (cake = 10, tea = 20);
/* rest = (tea = 20), with type (tea: Int), not (:Int,) */

(first, ...rest) := (1, 2, tea = "green");
/* rest has type (:Int, tea: String) */
rest.0;   /* 2: remains unnamed */
rest.1;   /* "green" */
rest.tea; /* "green" */
```

The prefix binding name first does not become a component label. Consumed fields are absent from rest; rest.cake in the meal example is rejected. A fully unnamed remainder stays unnamed, and exhausting any tuple produces Unit/(). A named singleton keeps its label rather than converting to an unnamed singleton or scalar. Existing structural tuple identity and stored-label compatibility apply to the resulting tuple.

This selects a positional prefix plus rest over named, unnamed, or mixed source tuples. It does not select named-selector-plus-rest patterns such as (drink = tea, ...rest), whose coverage and removal rules remain separate.

## Two directions for the same punctuation

```text
joined := (...left, ...right, last); /* construction: insert components */
(first, second, ...rest) := joined; /* pattern: capture components */
```

In a tuple expression, ...expression spreads an existing tuple's components into the new tuple. In a tuple pattern, ...name captures the remaining components in a new binding. The declaration uses destructuring on its left; rest is not an extra field declared in the source tuple's type.

## The requested examples

```text
(A, B, C, ...rest) := (...(1, 2), 3);
```

Under the construction-spread proposal, the right side constructs the three-component tuple (1, 2, 3). The selected positional rest rule then binds A to 1, B to 2, C to 3, and rest to the empty tuple Unit/(). These examples combine proposed construction syntax with selected rest semantics.

```text
(A, B, C, ...rest) := (...(1, 2), 3, 4);
```

The right side constructs (1, 2, 3, 4). A is 1, B is 2, C is 3, and rest is a one-component tuple containing Int value 4. It is not an Int scalar. Its value display (4,) is selected singleton construction. Singleton types require (:T,) for an unnamed component; singleton binding patterns now require their comma for positional extraction, while (pattern) groups.

Uppercase A/B/C are ordinary binding names in these examples. They do not request type matching. Sequential redeclarations follow the existing shadowing rules.

## Shape and type preservation

```text
identity := (7, "Ali");
details := (...identity, true);
```

The result has three positions with Int, String, and Bool types respectively. Spreading does not turn them into one homogeneous collection of union-valued elements. A rest capture likewise preserves the actual remaining positional types.

For the construction-spread proposal, the operand requires a tuple with a statically known shape. The selected positional rest captures a statically typed tuple remainder. An arbitrary runtime-length List, set, or generator cannot silently expand into a statically fixed tuple. Generalized iterable spread needs a separate collection-construction and consumption contract. Fixed-array-to-tuple conversion is also not selected here.

## Evaluation and placement

Evaluate tuple entries from left to right. Evaluate each spread operand once, then insert its components in their original positional order. A nested tuple remains one component unless its expression is explicitly spread.

Construction can contain multiple spreads at any positions because each operand's shape is known:

```text
combined := (0, ...left, 3, ...right, 6);
```

Positional tuple patterns now select at most one trailing rest capture. Omitting rest requires exact arity. Writing rest permits zero remaining components but never supplies missing required components. Construction spread remains proposed; its multiple-position placement does not extend pattern rest placement.

No public heap allocation, bitwise-copy policy, deep cloning, duplicate resource ownership, or mutable aliasing permission follows from the ellipsis. The eventual copy/move/borrow contracts govern component use and simultaneous bindings.

## Reference comparisons

TypeScript supports tuple spreads that preserve type relationships, including generic variadic tuple types; these are a useful precedent without adopting its array runtime representation or generic grammar. Source: [TypeScript variadic tuples](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types).

Zig tuples support concatenation with ++, demonstrating the same composition capability with different punctuation. Source: [Zig 0.15.1 tuples](https://ziglang.org/documentation/0.15.1/#Tuples).

Python starred unpacking assigns a list to the rest target, even when the source is a tuple. LiteScript's requested rest instead preserves tuple shape and positional types. Source: [Python assignment](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements).

Related: [tuples and patterns](tuples-and-patterns.md), [sequence patterns](sequence-patterns.md), [evaluation order](evaluation-order.md), and [generic notation](generic-notation.md).
