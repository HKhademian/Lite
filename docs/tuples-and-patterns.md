# Tuples and patterns

Status: **same-value binding/destructuring and union type-pattern narrowing established; variable-or-pattern collection selected 2026-10-23, with no combined whole-value/nested binding; complete recursive pattern syntax open**.

## Purpose

Give names to an entire value or destructure that same value without making the binding pattern change what a producer supplies.

## Templates

```text
pair := (first, second);
(left, right) := pair;
```

## Same-value invariant

```text
loop pairs as pair {
    (left, right) := pair;
    process(left, right);
}
```

The optional item name always denotes the current source element. Current headers allow only that one identifier; destructuring belongs in the body. Count/index/value come from metadata and are not injected into the tuple item. Former header tuple patterns and item/count/accumulator receiver lists are retired. See [item naming](loop-receivers.md).

## Refutable and irrefutable patterns

The [ordered-sequence review](sequence-patterns.md) proposes treating an ordinary pair as the two-element tuple shape. Positional tuple patterns now select exact arity without rest and one trailing rest capture preserving remainder types and order; zero remaining components produce Unit/(), and one remains a singleton tuple. It separates tuples from list/array patterns; the collector choice below keeps nested destructuring distinct from type annotations. The later singleton value selection distinguishes (value) grouping from (value,) tuple construction and permits named (= value) singletons. The empty tuple is now Unit, also spelled (). Singleton type spellings and binding/grouped patterns are selected; rest ownership remains separate.

A declaration such as `(left, right) := pair` should use an irrefutable pattern for the known input type. Variant patterns such as `Some(value)` can fail and belong in a conditional or match construct unless a separate failure rule is introduced.

```text
if .Some(user) := find_user(id) {
    greet(user)
}
```

The bound user exists only in the successful branch.

## Type patterns for unions

A union can be narrowed by matching its active alternative's type. The selected basic pattern spelling is `binding: Type`, for example `user: User` when examining `User | Guest`. The successful branch sees `user` as `User`; the other union alternative is not silently coerced or accessed through that binding.

This capability applies equally to a successful Result payload, an error-union payload inside recovery, and a union formed by an `else` fallback. It does not erase an intact Result's outer success/failure distinction. Nested pattern grammar, type identity versus subtype matching, overlap, and binding ownership remain open; see [union type patterns](union-patterns.md).

For an existing name, `if person: User` also tests and narrows without introducing a binding. See [type tests and narrowing](type-tests-and-narrowing.md) for the distinction from binding patterns and the remaining stability rules.

## Type constraints during destructuring

Typed subpatterns are supported inside tuple and constructor payload patterns. They constrain and bind individual components in the same match operation:

```text
if (x: Int, y: String) := pair {
    handle_number_text(x, y)
}
```

The whole pattern must succeed before the branch executes. A mismatching component fails the pattern rather than requesting conversion, and no nested match is needed just to establish the component types. The same tuple pattern works directly in a match arm, and may appear inside a constructor payload pattern. New bindings remain local to the successful branch. See [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule) for examples and remaining ownership rules.

## Nested tuple patterns and rest selected

Selected by the user, 2026-10-23: collect a supplied component either into a variable binding or into a nested pattern. A variable collector names the whole component; a pattern collector destructures or tests it. Do not combine both collectors for the same supplied component in one pattern.

```text
(first, pair, ...rest) := (1, (2, 3), 4);
/* first = 1; pair = (2, 3); rest = (4,) */

(first, (a, b), ...rest) := (1, (2, 3), 4);
/* first = 1; a = 2; b = 3; rest = (4,); no pair binding */

(x, (a, b: String, c), ...rest) := (1, (2, "hello", true), 4, 5);
/* x = 1; a = 2; b = "hello"; c = true; rest = (4, 5) */
```

The nested pattern receives the second outer component, not a new or flattened source. In the last example only b has an explicit type constraint. There is no additional binding for the whole nested tuple. Each tuple level applies its selected positional/named routing and coverage rules to its own supplied tuple; a rest capture collects that level's remaining components.

Colon retains its type-annotation/type-test role. A typed variable binding such as pair: (left: Int, right: Int) constrains the component and binds only pair; the labels left and right in that type are not newly declared variables. Neither the earlier name: (subpatterns) proposal nor name @ pattern supplies a whole-value-plus-nested collector. The user rejected that extra capability rather than leaving its punctuation or double-binding policy open. Capitalization, whitespace, type-name lookup, and successful type checking must not choose between binding and destructuring parses.

The source is evaluated once before new names are introduced. Every nested component pattern must succeed before the enclosing pattern exposes bindings. Ordinary declarations require irrefutability; supported conditional/match contexts retain their mismatch behavior. Existing recursive written-order shadowing applies to the bindings the chosen collectors actually introduce. Ownership, copying, extraction effects, and complete recursive parsing remain separate contracts; this selection does not introduce loop/lambda header destructuring.

Tuple component patterns also admit [nested or alternatives](match.md#nested-alternative-patterns-selected): `(.Email(address) or .Sms(address), received_at)` applies the choice to the first component and binds the second independently. Or alternatives stay inside that component's comma/parenthesis boundaries and share its supplied value; their binding types join with Unit for absent names. Whole-pattern success still gates all outer bindings. Later component failure does not retry an earlier successful local choice; outer alternatives retain their own mismatch behavior. This adds no rest-list changes, and/not subpatterns, or new headers.

### Rest and inference retain their selected contracts

Rest belongs to the destructuring pattern. One final ...rest captures unselected tuple components with their existing types, labels, and stored order; without rest, require complete coverage. Zero remaining components give Unit/(), while one stays a singleton tuple. Positional, named, mixed, and rest-only tuple patterns retain their selected routing rules. List/sequence rest and variadic tuple-type declarations remain separate.

Infer each unannotated variable binding from the input possibilities compatible with the whole pattern. Exclude impossible alternatives before projecting the corresponding component types. Preserve unions of complete shapes for composite collectors such as rest, rather than independently widening their components into combinations the input never supplied. See [pattern binding inference](pattern-binding-inference.md) for the nested example without a second whole-value binding.

Related: [construction spread and tuple rest](tuple-spread-and-rest.md), [mixed tuple patterns](tuple-spread-and-rest.md#mixed-positional-and-named-tuple-patterns-selected), and [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule).

## Underscore bindings

`_` is an ordinary identifier with unused-name permission. Repeated names within one pattern shadow in recursive written order:

```text
(first, _, third, _) := tuple;
```

The tuple must still have the required shape. The final `_` names the fourth component and may be read. `_: String` constrains and binds a component with type String. Nested tuple and constructor patterns use the same rule; Some(_) still requires Some and binds its payload. All names, not only underscores, use ordered shadowing. See [pattern binding and shadowing](pattern-shadowing.md).

Loop headers now take only one optional item name; body-local tuple patterns retain the ordered shadowing rules above. See [item naming](loop-receivers.md).

## Named tuples under review

The [named arguments and named tuples review](named-arguments-and-tuples.md) compares positional tuples with optional access labels, tuples whose labels affect compatibility, and using existing records for named values. The user selected fresh named initializer reordering and explicit reconstruction for stored tuples with a different component order. Fresh constructors under known tuple destinations use the selected call-style routing: explicit-label uniqueness, next-unfilled positional slots, permitted named replacement, final-slot type/access checks, and complete coverage without implicit component defaults. The earlier four contextual construction forms and destination = sourceField named tuple patterns remain selected. Positional bindings follow stored order; named patterns without rest require exact coverage and reject unknown/duplicate source selectors. With one final ...rest, named selectors remove chosen fields and the remainder preserves source order, labels, and types. A whole-tuple annotation supplies a tuple type, as in (left, right): (l: Int, r: Int) = expr; := infers the source contract. Different stored tuple labels require explicit reconstruction, even when positional types agree. Identical ordered labels and resolved component types describe the same structural tuple type wherever written. Explicit tuple call spread, same-name call shorthand, next-unfilled positional routing, and named replacement are now selected. Complete recursive grammar, stored named/unnamed conversions, and superseded-value ownership remain open. See the [concrete routing catalogue](named-input-routing.md). Nominal record identity remains selected independently.

## Selected value shorthand and positional access

In tuple values, (cake, tea) supplies unnamed components without inferring labels from variable names. The selected (= cake, = tea) is shorthand for (cake = cake, tea = tea). Both named and unnamed tuples expose .0, .1, and subsequent zero-based fixed positions in stored order; reject invalid positions at compile time. Named patterns retain destination = sourceField; the separately selected = identifier pattern shorthand expands to identifier = identifier. Named selectors can reorder without positional guessing. Reject unknown/duplicate source selectors and require full coverage unless rest captures the remainder. See [same-name pattern shorthand](named-input-routing.md#same-name-tuple-pattern-shorthand-selected). Expected named tuple types still accept positional initializers. Standalone mixed tuple inference and the corresponding mixed type forms are selected: (42, = tea) infers (:Int, tea: String) when tea is String; .0/.1 cover both components and .tea accesses the named one. Mixed positional/named tuple patterns are now selected separately from mixed value construction; each source component may be selected once, without value replacement. See [tuple entries and access](tuple-entries-and-access.md).

## Singleton and grouped patterns selected

```text
one := (42,);
whole := one;
(also_whole) := one; /* complete tuple, like whole */
(value,) := one;    /* one component: Int */
meal := (cake = 42);
(local = cake) := meal; /* named component: Int */
```

Parentheses group a pattern; they do not implicitly extract. A singleton positional tuple pattern requires its comma. A named clause already marks tuple extraction. The source is evaluated once before introducing bindings. Pattern grouping and tuple shape semantics apply consistently in supported pattern contexts, while the existing declaration/conditional/match mismatch contracts remain. The selected empty tuple pattern () matches only Unit and introduces no bindings. Ordinary declarations require an irrefutable match; conditional/match contexts retain their mismatch rules. Full parser integration and new header-pattern support remain separate. See [empty tuple patterns](tuple-entries-and-access.md#empty-tuple-pattern-selected). See [complete singleton cases](tuple-entries-and-access.md#singleton-binding-patterns-selected).

## Notes and open decisions

Named tuple binding annotations may omit a component type by writing a bare label: (left, right): (l, r) = expr. Infer component types from the static source/expected contract and preserve l, r order. Use (:Int, :Int) for unnamed typed components; a written colon requires a following type, so (l:, r:) is removed. In value or pattern context, (l, r) retains its ordinary tuple-value or positional-binding meaning. See [component annotations](named-input-routing.md#selected-tuple-type-component-grammar).

For named fields, source names and destination bindings are distinct. Explicit aliases can keep both destination names accessible when ordered shadowing would hide one of them, without changing positional tuple patterns. See [pattern aliases and duplicate names](pattern-aliases.md) for the reference comparison and proposed as spelling.

Complete recursive tuple type syntax, numeric-suffix scanning, record patterns, nested patterns, guards, alternatives, typed patterns, and rest-pattern forms need formal specification. Core named tuple fields and fixed numeric dot access are selected; runtime variable tuple indexing is rejected. Dot followed by an identifier selects the literal field name, not a variable index. Ordinary underscore bindings and ordered pattern shadowing are selected. Destructuring need not imply heap allocation, but its move/borrow behavior depends on the memory model.

## Related concepts and references

- [Loop receivers](loop-receivers.md)
- [Conditionals](conditionals.md)
- [Receiver clauses](receiver-clauses.md)
- [Rust tuple types](https://doc.rust-lang.org/reference/types/tuple.html) are a comparison for tuple values and `Unit`, not a complete LiteScript tuple contract.
