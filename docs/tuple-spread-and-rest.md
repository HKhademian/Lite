# Tuple construction spread and pattern rest

Status: **fixed-tuple construction/pattern rest selected through 2026-10-23; type spread with label overriding, fixed-array spread, and declared homogeneous array tails selected 2026-10-24**. Spread collisions replace the original slot without moving it; explicit labels remain unique. Fixed-tuple pattern rest retains its typed tuple remainder. A declared ...rest: T describes an array tail, including in ordinary tuples. Complete grammar, runtime-array spelling, ownership, and some routing remain open. See [tuple and array shapes](tuple-array-shapes.md). This is design documentation, not parser/runtime verification.

## Tuple construction spread selected

Selected by the user, 2026-10-23: ...tuple inserts an existing tuple's components into the enclosing tuple. Process components in source order, preserving their labels where present and their types. Without an expected destination tuple type, new components append and permitted label collisions involving spread use the earlier slot as specified below. A known destination instead uses its fixed slots under the selected contextual routing. Evaluate each operand once in written order. Flatten only explicitly spread tuples; a nested tuple written as an ordinary entry remains one component.

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

The original rule expands fixed tuple components without scalar conversion or Option/Result unwrapping. The 2026-10-24 extension also expands a fixed array's known elements into fixed tuple positions and supports fixed tuple/array spreads into array construction. Runtime-length arrays may supply declared homogeneous tails; arbitrary set/provider spread is not selected. Fresh fixed tuple destinations retain [fixed destination routing](named-input-routing.md#fixed-destination-routing-selected), unique explicit labels, final-slot type/access checks, and complete fixed coverage without tuple defaults. Stored tuple-valued components are not silently relabeled or reordered. See [known-size construction and array tails](tuple-array-shapes.md).

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

All entry/operand expressions in an admitted constructor still evaluate once in written order, including expressions whose contributed values are later replaced. The shown equivalence describes final slots, not permission to erase earlier effects or required cleanup. Static labels and tuple shapes let the compiler determine destinations; no runtime name dictionary is required by this rule. Cleanup/ownership of superseded values remains separate. A known fixed destination uses the selected destination routing and checks each final surviving contribution against its component type. Superseded expressions still must be valid and evaluate, but their types need not fit that destination; this permits patching a spread source to fit a different tuple type.

The former unnamed-prefix/named-suffix restriction was a uniformity choice shared with calls, not a memory-layout requirement. Interleaving itself is deterministic under this insertion algorithm. Readability requires distinguishing tuple construction from calls and patterns; later replacement must retain source-order effects. Known tuple destinations use the selected call-style routing with complete coverage and no implicit component defaults. Omitted component types are inferred from their final surviving contributions. Complete generic constraint solving and recursive parsing remain separate.

Function calls have a separately selected fixed-slot construction rule: positional inputs fill the next unfilled declared slot, including after named inputs; admitted named inputs replace an earlier supplied value, subject to explicit-label uniqueness. =name shorthand and explicit tuple call spread are selected. Unknown labels and excess inputs remain errors, and each final surviving input must fit its declared type/access. The user also selected explicit-label uniqueness for calls on 2026-10-23, including =name shorthand. Spread collisions remain allowed; only the final surviving input must fit the declared parameter contract; superseded expressions must still type-check and evaluate. This final-value rule is shared with typed tuple patching and does not change parameter types. Tuple patterns still reject duplicate source selectors. Tuple type declarations still require unique labels; valid spread collisions produce one final field, not a duplicate-field type. Mixed positional/named tuple patterns are selected below; they reject duplicate source selection rather than replacing values.

## Type construction and declared array tails selected

In type position, ...Params expands a tuple schema using the same append-or-replace-by-label rule as value construction. Unnamed components append; a later spread label replaces its original slot's type without moving it. Explicit labels remain unique. This constructs a contract at compile time; it does not change a stored tuple's type.

```text
Params1 := type (:Int, score: String, :Int);
Params2 := type (:Int, score: Int);
/* (...Params1, ...Params2) gives (:Int, score: Int, :Int, :Int) */

exp : fn (...Params1, ...Params2, ...rest: Int): Int =
    (a, score, b, c, ...myrest) {
        42
    }
```

A declared ...rest: T accepts zero or more additional T values collected as an array. T may itself be a tuple; each extra tuple remains one input. Both known-size and runtime-length array spreads may feed a declared tail. The same segment is valid in ordinary tuple schemas: a remainder from `(q: Int, w: Int, e: Int, ...rest: Int)` after selecting q/w preserves `(e: Int, ...rest: Int)`. Ordinary fixed-tuple pattern rest below remains a tuple operation. Exact runtime-array spelling, tail normalization/composition, and ownership remain open; the discussion's [T; ...] was only a placeholder. See [the complete selected examples](tuple-array-shapes.md).

Access a declared tail by its schema name: mytuple.rest obtains the array through existing named tuple access. mytuple.rest[index] then follows array-indexing rules, outside tuple access. This does not introduce runtime tuple positions, a numeric position for the tail, or multiple declared rest segments. See [named tail access](tuple-array-shapes.md#declared-names-access-array-tails).

A rest declaration can infer its element type with (...rest:) when an initializer or expected contract supplies sufficient static information. The colon distinguishes a named declaration from (...Params), which expands an existing tuple type. (...rest: T) remains the explicitly typed form; no infer keyword is selected, and ordinary dangling name: entries remain invalid. See [inferred rest declarations](tuple-array-shapes.md#a-colon-distinguishes-inferred-rest-declarations-from-type-spread).

## Spreading a stored array tail selected

For pack := (...numbers = [1, 2, 3]), inferred tuple construction copy := (...pack) preserves the named numbers tail and its element contract. Passing op(...pack), or applying op.call pack, supplies the three tail elements as positional Int inputs when op's contract admits them. The stored tail label does not select a named call slot. Ordinary labeled array-valued fields retain their existing one-named-input behavior instead of expanding their arrays. Fixed components keep their existing label/position routing. Empty tails contribute no inputs, and tuple-valued tail elements stay intact.

This is governed by the whole-composition proof, written-order single evaluation, permissions, and lifetime rules. A tail type alone proves no minimum length for required fixed inputs. Direct named variadic call supply, multiple stored tails, general mixed tuple construction, and tail-label collisions remain separate. Preserving the tuple schema does not select copying or ownership identity. See [rest-bearing tuple spread](tuple-array-shapes.md#spreading-a-rest-bearing-tuple).

## Inferred positional prefix and one array tail selected

With no explicit/expected destination shape, keep fixed positional components before the first runtime-sized array spread; that spread and all following positional contributions form one trailing array with the default label rest. Multiple runtime-array spreads append to that same tail in written order. Consequently (...left), (...left, ...right), (...left, 1, 2), and (...left, 1, 2, ...right) are rest-only, while (1, 2, ...right) retains two fixed components, assuming runtime-sized Int array operands. Infer a common normalized union only for tail contributions; keep individual fixed-prefix types. Fully static contributions infer fixed components unless an explicit tail is declared.

These are inference defaults. An explicit or established expected tuple type is the reference contract and can request a different partition, subject to the whole-composition proof; only omitted information is inferred. No fixed-suffix model, arbitrary named-tail merging, or new ownership behavior follows. See [the five cases and explicit overrides](tuple-array-shapes.md#destination-types-take-precedence-over-inferred-shape).

## Destination-guided prefix and tail repacking selected

An explicit expected tuple schema can guide spread reconstruction between a compatible fixed prefix plus array tail and a rest-only tuple, selected 2026-10-25. For Prefix := type (:Int, :Int, ...rest: Int) and TailOnly := type (...rest: Int), packed: TailOnly = (...prefix_value) gathers the fixed values and original tail into packed.rest. Reconstructing Prefix from a TailOnly source requires proof of at least two compatible values; the rest-only schema alone supplies no such minimum. Without a requested destination shape, copy := (...prefix_value) still infers and preserves the source schema. Plain stored assignment retains its compatibility rules. Existing labels, access, ownership, evaluation, and cleanup requirements remain; no implicit cast, array/tuple identity, zero-copy guarantee, or general mixed-label collision policy is selected. See [repacking examples and limits](tuple-array-shapes.md#destination-guided-repacking).

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

Named-only selector patterns with a final rest remain selected; mixing positional and named selectors is selected next. Record rest, list rest, and ownership rules remain separate. Rest-only tuple patterns are selected below.

## Mixed positional and named tuple patterns selected

Selected by the user, 2026-10-23: one tuple pattern may interleave positional component patterns, explicit destination = sourceField selectors, and =name shorthand. Routing selects source components; it does not replace values or reorder the source.

1. Evaluate the source once before introducing any new bindings. Begin with all source component positions unselected.
2. Process entries from left to right. A positional entry selects the next unselected component in stored source order. A named entry selects its literal source field, including after expanding =name to name = name.
3. Mark each selected component unavailable to later entries. Reject an unknown field, selecting an already selected component, or a positional entry when no component remains. Do not reserve fields for later named entries or search ahead to make the pattern valid.
4. Permit at most one final ...rest. It captures all unselected components in stored source order, preserving their types and labels; numeric positions restart at zero. Without rest, require complete component coverage.

```text
meal := (cake = 10, tea = 20, fruit = 30);

(first, drink = tea, ...rest) := meal;
/* first = 10; drink = 20; rest = (fruit = 30) */

(drink = tea, first, ...rest) := meal;
/* drink = 20; first = 10; rest = (fruit = 30) */

(=fruit, first, ...rest) := meal;
/* fruit = 30; first = 10; rest = (tea = 20) */

(drink = tea, first, last) := meal;
/* drink = 20; first = 10; last = 30; complete coverage without rest */

(drink = tea, first, ...rest) := (7, tea = "green", true);
/* drink: String = "green"; first: Int = 7; rest = (true,), type (:Bool,) */

/* rejected: (first, dessert = cake, ...rest) := meal; cake selected twice */
/* rejected: (first, drink = tea) := meal; fruit omitted without rest */
/* rejected: (first, drink = coffee, ...rest) := meal; unknown field */
/* rejected: (first, ...rest, drink = tea) := meal; rest is not final */
```

Selection identity is the source position, so choosing a named field also consumes it for positional routing and vice versa. A bare binding name does not select a same-named source field; it remains positional. Repeated destination names retain ordered shadowing when they receive distinct source components; duplicate source selection remains invalid. This is extraction, not construction's permitted replacement.

The selected component pattern receives its source component's existing type; rest retains its complete remaining tuple shape. Unit/() is an empty remainder, and one remaining component stays a singleton tuple. Every component subpattern must succeed before bindings are exposed to the branch. Ordinary declarations require irrefutability; supported conditional/match contexts retain their mismatch rules. Within an already supported nested tuple pattern, routing applies to that pattern's own supplied tuple. A component uses either a variable binding or a nested pattern, without a combined whole-value binding. This does not add numeric source selectors, loop/lambda header support, allocation, copying, or ownership permissions.

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

Fixed tuple construction requires statically known component counts. Explicit fixed-array spread is now selected: a [T; N] operand contributes N unnamed T components. A runtime-length array may supply a declared homogeneous tail, but cannot manufacture an unknown number of fixed tuple fields. Ordinary fixed-tuple pattern rest preserves its structural tuple remainder. List, set, and generator adaptation remain separate contracts; see [tuple/array shapes](tuple-array-shapes.md).

Ordinary tuple construction also accepts runtime-sized spreads against an established tuple schema when the whole supplied composition proves its fixed-slot and array-tail contract. Runtime-dependent value origins do not change the guaranteed destination type. Without an expected schema, (...extra) for an established runtime-sized T array infers a rest-only tuple: zero fixed components plus an array tail of T with the default label rest. The source identifier does not become its label. Explicit (...extra = expression) instead declares a tail named extra; (=...extra) expands to (...extra = extra). These forms request an array tail even for a fixed-size source. Empty [] still needs an element-type source. Full tail compatibility and equivalence with a bare array remain open; see [destination guarantees](tuple-array-shapes.md#construction-guarantees-the-destination-type), [rest-only tuples](tuple-array-shapes.md#rest-only-tuples-need-no-fixed-components), and [named tails](tuple-array-shapes.md#named-rest-values-and-same-name-shorthand).

## Common rest element type and construction extent selected

A destination (...rest:) can collect (1, "tea", true) into a rest array with the inferred homogeneous element type Int | String | Bool and known extent three. The ordinary literal [1, "tea", true] uses the same known-size inference, and (=...rest) preserves the explicitly requested tail label. Every resulting array position has the union type; re-expansion does not restore the original heterogeneous per-position types. Concrete known-size tail construction retains its extent, while the general (...rest: T) schema alone promises no exact length. Empty/unresolved-element and wider API/ownership fact propagation remain separate; see [union element inference](tuple-array-shapes.md#union-element-inference-and-known-construction-extents).

## Zero and singleton source extents selected

Without a destination requesting another shape, (...arr0) for [Int; 0] produces Unit and (...arr1) for [Int; 1] produces a fixed singleton (:Int,), not a scalar. Explicit (...rest = arr0) and (...rest = arr1) instead preserve a named tail containing zero or one element. An empty tail does not normalize to Unit; a one-element tail does not become a fixed singleton. Concrete tail extents remain known under the construction rule. Call spread supplies zero or one input respectively, without making the tuple values/types identical. Preserve source evaluation and ordinary destination proofs. See [the boundary examples](tuple-array-shapes.md#zero-and-singleton-fixed-expansion-versus-declared-tails).

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
