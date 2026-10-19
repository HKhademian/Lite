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

The [ordered-sequence review](sequence-patterns.md) proposes treating an ordinary pair as the two-element tuple shape, exact arity unless rest is written, and one trailing rest capture. It separates tuples from list/array patterns and retains the existing whole-value/type-colon questions below. These additions do not select tuple grouping, singleton/empty spelling, or rest ownership automatically.

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

Rest capture belongs to the destructuring pattern. The user also requests ...tuple in construction expressions to combine tuples while preserving positional types. See [construction spread and pattern rest](tuple-spread-and-rest.md) for both directions and the remaining empty/singleton and ownership questions. This does not yet introduce variadic tuple-type declarations.

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

Only b is explicitly type-constrained here. Infer x, a, c, y, and rest from all input possibilities compatible with the entire pattern; each receives its concrete type or a union of remaining types. Excluded input alternatives contribute nothing. Composite bindings retain unions of whole shapes rather than a product of independently widened fields. This static inference rule is selected independently of the proposed whole-value/rest syntax; see [pattern binding inference](pattern-binding-inference.md) for a worked example.

### Candidate rules

Recommend allowing at most one rest capture per tuple pattern, in the final position. It accepts zero or more remaining components. For a fixed tuple, rest would be a tuple with statically determined component types; an empty rest would use the zero-element tuple/Unit relationship once that contract is formalized. List/sequence rests need their own result-type, allocation, and borrowing contracts and are not selected by this tuple example.

Read `name: Type` as a typed binding and `name: (subpatterns)` as a binding of the whole value plus a nested tuple constraint. This is a candidate composition rule, not a complete parser. If tuple types also use parentheses, `y: (A, B)` could be read as a tuple type or as nested bindings; resolve that before selecting the syntax. One possible rule reserves parenthesized forms here for subpatterns and uses a named tuple-type alias for a whole-value type annotation. Do not let identifier capitalization decide the parse. Generalizing colon to arbitrary subpatterns is a further decision.

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

## Notes and open decisions

For named fields, source names and destination bindings are distinct. Explicit aliases can keep both destination names accessible when ordered shadowing would hide one of them, without changing positional tuple patterns. See [pattern aliases and duplicate names](pattern-aliases.md) for the reference comparison and proposed as spelling.

Tuple type syntax, singleton tuples, tuple indexing, named fields, record patterns, nested patterns, guards, alternatives, typed patterns, and rest-pattern forms need formal specification. Ordinary underscore bindings and ordered pattern shadowing are selected. Destructuring need not imply heap allocation, but its move/borrow behavior depends on the memory model.

## Related concepts and references

- [Loop receivers](loop-receivers.md)
- [Conditionals](conditionals.md)
- [Receiver clauses](receiver-clauses.md)
- [Rust tuple types](https://doc.rust-lang.org/reference/types/tuple.html) are a comparison for tuple values and `Unit`, not a complete LiteScript tuple contract.
