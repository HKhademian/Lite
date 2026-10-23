# Tuples and patterns

Status: **same-value binding/destructuring and union type-pattern narrowing established; complete pattern syntax open**.

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

The [ordered-sequence review](sequence-patterns.md) proposes treating an ordinary pair as the two-element tuple shape. Positional tuple patterns now select exact arity without rest and one trailing rest capture preserving remainder types and order; zero remaining components produce Unit/(), and one remains a singleton tuple. It separates tuples from list/array patterns and retains the existing whole-value/type-colon questions below. The later singleton value selection distinguishes (value) grouping from (value,) tuple construction and permits named (= value) singletons. The empty tuple is now Unit, also spelled (). Singleton type spellings and binding/grouped patterns are selected; rest ownership remains separate.

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

## Proposal: whole-value binding, nested patterns, and rest

Rest capture belongs to the destructuring pattern. Basic ...tuple construction spread is now selected, preserving component positions, types, and labels; label collisions involving spread replace their earlier slot without moving it, duplicate explicit labels are errors, surviving contributions determine inferred component types, and named/unnamed value components may interleave. See [construction spread and pattern rest](tuple-spread-and-rest.md) for both directions and the remaining construction-spread, recursive pattern, and ownership questions. Positional tuple rest shape, placement, and arity are [selected](tuple-spread-and-rest.md#positional-tuple-rest-selected), along with [remainder label preservation](tuple-spread-and-rest.md#remainder-labels-selected). Named selectors with rest are also [selected](tuple-spread-and-rest.md#named-selectors-with-rest-selected): remove chosen fields and retain unselected components in source order. Rest-only tuple patterns (...all) and (...all,) are also [selected](tuple-spread-and-rest.md#rest-only-tuple-pattern-selected): require tuple shape and preserve the complete tuple. Mixed positional/named tuple patterns are now [selected](tuple-spread-and-rest.md#mixed-positional-and-named-tuple-patterns-selected): process selectors left to right, with positional entries taking the next unselected source component and named entries selecting fields. Reject duplicate source selection; keep rest final and require coverage without it. Whole-value colon syntax and ownership remain separate. This does not introduce variadic tuple-type declarations.

The proposed shape combines binding the nested value itself, destructuring its components, a typed subpattern, and a remainder capture:

```text
(x, y: (a, b: str, c), ...rest)
```

Here str denotes a type name or alias supplied by the surrounding program; this does not select a lowercase built-in alias for String.

Proposed interpretation:

- x binds the first outer component.
- y binds the whole second outer component, which must match the nested three-component pattern.
- a, b, and c bind its components; b must match str without conversion.
- rest captures the remaining outer components, not the remainder of y.

For example, matching `(1, (2, "hello", true), 4, 5)` with str denoting String would bind x to 1, y to `(2, "hello", true)`, a to 2, b to `"hello"`, c to true, and rest to `(4, 5)`. The components and y remain separately named in the successful branch, subject to ownership permissions.

Only b is explicitly type-constrained here. Infer x, a, c, y, and rest from all input possibilities compatible with the entire pattern; each receives its concrete type or a union of remaining types. Excluded input alternatives contribute nothing. Composite bindings retain unions of whole shapes rather than a product of independently widened fields. This static inference rule is selected independently of the proposed whole-value colon syntax and selected positional tuple rest; see [pattern binding inference](pattern-binding-inference.md) for a worked example.

### Candidate rules

Selected for positional tuple patterns: at most one rest capture, in the final position, accepts zero or more remaining components. Rest retains statically determined component types and stored order; an empty rest is Unit/(), and one component remains a singleton tuple. Remainder labels are preserved for named/mixed sources, and numeric positions restart at zero within rest. Named selectors with rest are selected separately; rest-only tuple patterns are selected; mixed positional/named tuple patterns are selected with next-unselected positional routing and duplicate-source rejection; ownership remains separate. List/sequence rests need their own result-type, allocation, and borrowing contracts and are not selected by this tuple rule.

Read `name: Type` as a typed binding. The separate proposed `name: (subpatterns)` would bind the whole value and constrain its nested components, but its grammar still needs resolution. Tuple type components now use name: Type, inferred bare labels, or :Type; a type-only tuple is `(:A, :B)`. In a type annotation, bare `(A, B)` denotes inferred labels rather than two positional types. A shape such as `y: (a, b: str, c)` can still resemble an inferred named tuple annotation or the proposed nested pattern, so that recursive boundary remains open. Do not let capitalization, name lookup, or successful type checking choose the parse. Generalizing colon to arbitrary subpatterns is a further decision.

The whole pattern must succeed before its branch executes; failure of the nested shape or b's type fails the enclosing pattern. Ordinary declarations still require irrefutable destructuring. Simultaneous whole-value and component names must not silently clone a value, create two owners, or permit overlapping writable accesses; the borrow/move/copy model determines which uses are legal. Rest capture does not itself promise or require allocation.

These shapes may be used in a match arm or conditional pattern once their grammar is selected. They do not require a second, nested match statement.

### Reference comparison

Rust uses `name @ subpattern` to bind a matched value while checking another pattern. Dart list patterns support `...` with a collecting subpattern. These are useful precedents for the two capabilities, but do not select LiteScript's colon syntax, tuple-rest result type, or ownership semantics. See [Rust identifier patterns](https://doc.rust-lang.org/reference/patterns.html#identifier-patterns) and [Dart rest elements](https://dart.dev/language/pattern-types#rest-element).

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
