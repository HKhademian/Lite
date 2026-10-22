# Tuple construction spread and pattern rest

Status: **construction spread and typed pattern rest requested by the user, 2026-10-19; the rules below are a syntax/semantics proposal**. Singleton value forms were selected later: (value,) is an unnamed singleton, while (value) groups. Variadic tuple-type declarations, singleton type spellings, complete recursive pattern integration, and ownership remain separate decisions. The empty tuple is now selected as Unit, with () as equivalent value/type syntax.

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

The right side constructs the three-component tuple (1, 2, 3). A is 1, B is 2, C is 3, and rest has the empty tuple shape. Under the selected empty tuple identity, that zero-component shape is Unit, also spelled (). The rest operation itself remains part of this proposal.

```text
(A, B, C, ...rest) := (...(1, 2), 3, 4);
```

The right side constructs (1, 2, 3, 4). A is 1, B is 2, C is 3, and rest is a one-component tuple containing Int value 4. It is not an Int scalar. Its value display (4,) is selected singleton construction. Singleton type spellings remain separate; singleton binding patterns now require their comma for positional extraction, while (pattern) groups.

Uppercase A/B/C are ordinary binding names in these examples. They do not request type matching. Sequential redeclarations follow the existing shadowing rules.

## Shape and type preservation

```text
identity := (7, "Ali");
details := (...identity, true);
```

The result has three positions with Int, String, and Bool types respectively. Spreading does not turn them into one homogeneous collection of union-valued elements. A rest capture likewise preserves the actual remaining positional types.

For the initial proposal, construction spread requires a tuple with a statically known shape. An arbitrary runtime-length List, set, or generator cannot silently expand into a statically fixed tuple. Generalized iterable spread needs a separate collection-construction and consumption contract. Fixed-array-to-tuple conversion is also not selected by this proposal.

## Evaluation and placement

Evaluate tuple entries from left to right. Evaluate each spread operand once, then insert its components in their original positional order. A nested tuple remains one component unless its expression is explicitly spread.

Construction can contain multiple spreads at any positions because each operand's shape is known:

```text
combined := (0, ...left, 3, ...right, 6);
```

Pattern matching keeps the earlier recommendation of at most one trailing rest capture initially. Omitting rest requires exact arity. Writing rest permits zero remaining components but never supplies missing required components. Construction spread and capture have different placement rules because one concatenates known shapes and the other divides a matched input.

No public heap allocation, bitwise-copy policy, deep cloning, duplicate resource ownership, or mutable aliasing permission follows from the ellipsis. The eventual copy/move/borrow contracts govern component use and simultaneous bindings.

## Reference comparisons

TypeScript supports tuple spreads that preserve type relationships, including generic variadic tuple types; these are a useful precedent without adopting its array runtime representation or generic grammar. Source: [TypeScript variadic tuples](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types).

Zig tuples support concatenation with ++, demonstrating the same composition capability with different punctuation. Source: [Zig 0.15.1 tuples](https://ziglang.org/documentation/0.15.1/#Tuples).

Python starred unpacking assigns a list to the rest target, even when the source is a tuple. LiteScript's requested rest instead preserves tuple shape and positional types. Source: [Python assignment](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements).

Related: [tuples and patterns](tuples-and-patterns.md), [sequence patterns](sequence-patterns.md), [evaluation order](evaluation-order.md), and [generic notation](generic-notation.md).
