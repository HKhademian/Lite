# Tuple construction spread and pattern rest

Status: **construction spread and typed pattern rest requested by the user, 2026-10-19; positional tuple rest shape, placement, and arity selected 2026-10-22; preservation of remainder labels, rest after named selectors, rest-only tuple patterns, and basic tuple construction spread selected 2026-10-23**. Label collisions involving spread replace their earlier slot without moving it; duplicate explicit labels are errors, and surviving contributions determine inferred component types; named and unnamed value components may interleave, selected 2026-10-23. Mixed positional/named selector patterns, variadic tuple-type declarations, complete recursive type/pattern integration, and ownership remain separate decisions. The empty tuple is selected as Unit, with () as equivalent value/type syntax. This is a design contract, not implemented parser/runtime behavior.

## Tuple construction spread selected

Selected by the user, 2026-10-23: ...tuple inserts an existing tuple's components into the enclosing tuple. Process components in source order, preserving their labels where present and their types. New components append; permitted label collisions involving spread use the earlier slot as specified below. Evaluate each operand once in written order. Flatten only explicitly spread tuples; a nested tuple written as an ordinary entry remains one component.

```text
pair := (10, 20);
extended := (...pair, 30); /* (10, 20, 30) */
nested := (pair, 30);     /* ((10, 20), 30) */

empty := ();
one := (10,);
a := (...empty); /* () */
b := (...one);   /* (10,), with type (:Int,), not Int */
c := (...pair);  /* (10, 20) */

meal := (cake = 10, tea = 20);
same_shape := (...meal); /* (cake = 10, tea = 20), same labels and order */
/* rejected: (...10); scalar operand */
```

An enclosing expression with a spread entry constructs a tuple regardless of the expanded component count. The ellipsis distinguishes (...one) from grouped (one); no singleton comma is required for a spread-only expression. Ordinary optional trailing-comma rules apply. Unit/() contributes zero components, including when obtained by evaluating an action; its effects, failures, and required cleanup still apply. A Result or Option is not silently unwrapped for spreading.

This contract is tuple-to-tuple spread and requires operands with statically known tuple shapes. Other scalar values do not qualify as tuples. Array, list, set, and other collection spreads are different operations whose contracts remain separate; this rule does not prohibit them globally. Tuple call spreading is now selected separately; generic variadic types and new ownership permissions remain separate. Previously selected fresh expected-schema construction cases remain; extending their routing to newly interleaved/repeated-label inputs needs a separate review. Stored tuples are not silently relabeled or reordered by the spread operand itself.

### Append or replace by label selected

Selected by the user, 2026-10-23, with explicit-duplicate validation clarified later that day: construct inferred tuples from left to right, expanding each spread in source order. First require unique explicitly written labels within each tuple constructor, treating =name as name = name. A spread operand's labels belong to that operand rather than to the enclosing constructor's explicit-label set. Validate each nested constructor independently; spread does not make an invalid operand valid. For an admitted constructor, apply these insertion rules:

1. An unnamed component appends at the next free position.
2. A previously unseen label appends at the next free position and names that slot.
3. A label already introduced by an earlier component replaces that slot's value when the collision involves spread. Keep its position and label; do not append another component or move the slot. Two explicitly written entries with the same label are an error, even when their types and values agree.

```text
x := (...(cake = 10, tea = 20), cake = 30);
/* x = (cake = 30, tea = 20) */
x.0;    /* 30 */
x.1;    /* 20 */
x.cake; /* 30; x.2 is out of range */

result := (1, =c, ...(=a, 9, =b), a = new, 6);
/* result = (1, =c, a = new, 9, =b, 6) */
/* a remains at position 2; the final unnamed 6 appends at position 5 */

changed := (a = "3", ...(a = 1,));
/* changed = (a = 1), with type (a: Int); a remains at position 0 */

/* rejected: (a = "3", a = 1); duplicate explicit label */
/* rejected: (a = 3, a = 1);   same type does not permit a duplicate */
/* rejected: (a = 1, a = 1);   same value does not permit a duplicate */
/* rejected: (=a, a = 1);      shorthand also supplies an explicit label */
```

Named and unnamed components may interleave in tuple values and the corresponding stored tuple layout. This supersedes the earlier positional-prefix/named-suffix restriction. The later clarification narrows duplicate-label replacement to collisions involving spread; repeated explicit labels remain errors. Only one slot for each label survives, at the position of that label's first introduction. A later spread may replace an earlier explicit field, a later explicit field may replace a spread field, and successive spreads may replace each other's fields. Unnamed components never replace an earlier position by value or by a generated label.

For an inferred tuple, the final surviving contribution determines each slot's component type. Spread replacement may therefore change that type: the String contribution in changed above is superseded by Int, without inferring String | Int. The earlier contribution must still be a valid expression; this construction rule does not retype an already stored tuple or require the final slot to hold every intermediate contribution.

All entry/operand expressions in an admitted constructor still evaluate once in written order, including expressions whose contributed values are later replaced. The shown equivalence describes final slots, not permission to erase earlier effects or required cleanup. Static labels and tuple shapes let the compiler determine destinations; no runtime name dictionary is required by this rule. Cleanup/ownership of superseded values and integration with a fixed expected tuple schema remain separate contracts.

The former unnamed-prefix/named-suffix restriction was a uniformity choice shared with calls, not a memory-layout requirement. Interleaving itself is deterministic under this insertion algorithm. Readability requires distinguishing tuple construction from calls and patterns; later replacement must retain source-order effects. Expected-schema routing for the newly allowed construction cases remains to be reviewed.

Function calls have a separately selected fixed-slot construction rule: positional inputs fill the next unfilled declared slot, including after named inputs; admitted named inputs replace an earlier supplied value, subject to explicit-label uniqueness. =name shorthand and explicit tuple call spread are selected. Unknown labels and excess inputs remain errors, and each supplied value must fit its declared type/access. The user also selected explicit-label uniqueness for calls on 2026-10-23, including =name shorthand. Spread collisions remain allowed; every contribution must fit the declared parameter contract, so the inferred tuple rule does not change parameter types. Tuple patterns still reject duplicate source selectors. Tuple type declarations still require unique labels; valid spread collisions produce one final field, not a duplicate-field type. Mixed positional/named selector patterns remain separate.

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

Ordinary declarations require an irrefutable match for the source contract. Supported conditional/match contexts retain their mismatch rules when required components or their subpatterns fail. Evaluate the source once before introducing bindings. This selection covers positional tuple patterns, including named/mixed source tuples with label preservation below; named selector rest and rest-only patterns are selected separately below. List rest and new header-pattern support remain separate. Copy/move/borrow and simultaneous ownership remain separate; capturing a tuple does not itself promise heap allocation or deep cloning.

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

This selects a positional prefix plus rest over named, unnamed, or mixed source tuples. Named-selector-plus-rest coverage and removal are selected next.

## Named selectors with rest selected

Selected by the user, 2026-10-23: named selectors remove their chosen fields, and one trailing ...rest captures every unselected component in the source's stored order. Preserve each remaining label, if present, and its component type; numeric positions restart at zero within rest.

```text
meal := (cake = 10, tea = 20, fruit = 30);
(drink = tea, ...rest) := meal;
/* drink = 20; rest = (cake = 10, fruit = 30) */

(snack = fruit, dessert = cake, ...rest) := meal;
/* snack = 30; dessert = 10; rest = (tea = 20) */

(dessert = cake, drink = tea, snack = fruit, ...rest) := meal;
/* rest = () */

(drink = tea, ...rest) := (1, tea = "green", fruit = 30);
/* drink = "green"; rest has type (:Int, fruit: Int) */
```

The selected = identifier pattern shorthand expands to identifier = identifier, so (=fruit, ...rest) selects fruit and captures every other component. Duplicate/unknown source checks apply after expansion. See [same-name pattern shorthand](named-input-routing.md#same-name-tuple-pattern-shorthand-selected).

Selector order determines binding order, including the existing ordered-shadowing behavior; it does not reorder the source or remainder. Source selectors refer to fields in the source tuple, not lexical variables. Evaluate the source once before introducing bindings. Unknown source labels, duplicate source selectors, multiple rest captures, and a nonfinal rest capture are rejected. Repeated destination names retain existing shadowing rules and are not duplicate source selectors.

Without rest, named extraction still requires complete component coverage. With rest, all unselected components are captured, including unnamed positions in a mixed source. Fully named, mixed, unnamed singleton, named singleton, and empty remainders retain their existing shape/type identities. Ordinary declarations must be irrefutable; supported conditional/match contexts retain their established matching rules. Rest does not supply missing fields or silently discard unselected components.

This extends named-only selector patterns with a final rest; it does not select mixing positional and named selectors within one pattern, record rest, list rest, or ownership rules. Rest-only tuple patterns are selected below.

## Rest-only tuple pattern selected

Selected by the user, 2026-10-23: (...all) captures an entire tuple without consuming any prefix positions or named fields. A trailing comma is optional: (...all,) denotes the same pattern. The ellipsis establishes tuple rest syntax rather than ordinary grouping.

```text
(...all) := ();                     /* all = (), with type Unit */
(...all) := (10,);                  /* all = (10,), with type (:Int,) */
(...all) := (cake = 10, tea = 20);  /* labels and order preserved */
(...all,) := (10, 20);             /* optional trailing comma */
/* rejected: (...all) := 10; scalar source */
```

Preserve the complete tuple shape, component types, labels, and stored order. Named singletons remain named, unnamed singletons remain tuples, and mixed components retain their labels or lack of labels. Unit qualifies because it is the zero-component tuple. Other scalar values, records, and lists do not become tuples merely because a rest-only pattern is written.

Unlike all := source, the rest-only pattern requires tuple shape. Evaluate the source once before introducing all. Ordinary declarations require an irrefutable match for the source contract; supported conditional/match contexts retain their existing mismatch rules. Capturing the whole tuple does not promise a copy, alias, deep clone, allocation, or new ownership permission. Loop/lambda header support, list rest, and general recursive parsing remain separate.

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

The right side constructs the three-component tuple (1, 2, 3). The selected positional rest rule then binds A to 1, B to 2, C to 3, and rest to the empty tuple Unit/(). Both construction spread and this rest behavior are selected.

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

Construction spread requires a tuple with a statically known shape. The selected positional rest captures a statically typed tuple remainder. This tuple constructor does not implicitly convert a List, set, or generator into a statically fixed tuple. Spreading those collections belongs to separate construction and consumption contracts. Fixed-array-to-tuple conversion is also not selected here.

## Evaluation and placement

Evaluate tuple entries from left to right. Evaluate each spread operand once, then insert its components in their original positional order. A nested tuple remains one component unless its expression is explicitly spread.

Construction can contain multiple spreads, preserving each operand's expanded component order:

```text
combined := (0, ...left, 3, ...right, 6);
```

Positional tuple patterns select at most one trailing rest capture. Omitting rest requires exact arity. Writing rest permits zero remaining components but never supplies missing required components. Construction spread's placement does not extend pattern rest placement. Permitted construction label collisions involving spread use earlier-slot replacement, and named/unnamed value components may interleave.

No public heap allocation, bitwise-copy policy, deep cloning, duplicate resource ownership, or mutable aliasing permission follows from the ellipsis. The eventual copy/move/borrow contracts govern component use and simultaneous bindings.

## Reference comparisons

TypeScript supports tuple spreads that preserve type relationships, including generic variadic tuple types; these are a useful precedent without adopting its array runtime representation or generic grammar. Source: [TypeScript variadic tuples](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#variadic-tuple-types).

Zig tuples support concatenation with ++, demonstrating the same composition capability with different punctuation. Source: [Zig 0.15.1 tuples](https://ziglang.org/documentation/0.15.1/#Tuples).

Python starred unpacking assigns a list to the rest target, even when the source is a tuple. LiteScript's requested rest instead preserves tuple shape and positional types. Source: [Python assignment](https://docs.python.org/3/reference/simple_stmts.html#assignment-statements).

Related: [tuples and patterns](tuples-and-patterns.md), [sequence patterns](sequence-patterns.md), [evaluation order](evaluation-order.md), and [generic notation](generic-notation.md).
