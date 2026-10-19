# Conditionals

Status: **mandatory braces, unified actions/values, existing-name type tests and declaration-shaped pattern conditions selected; missing-`else` zero results, the no-contributor `Unit` default, and explicit-tag conditional metadata lookup selected 2026-10-19; a conditional `then` clause, result-field exposure, abrupt-exit behavior, and multi-branch condition metadata remain open**.

## Template

```text
if condition {
    success_body
} else if other_condition {
    other_body
} else {
    fallback_body
}
```

All branch bodies require braces. The selected conditional form has no trailing `then` or `endif`. Reusing loop `then` after a complete conditional is a proposal for post-selection result processing; its grammar is not selected. The old `endif` and unblocked single-statement forms are superseded.

## Action example

```text
if ready {
    run()
} else {
    wait()
}
```

## Value example

```text
message := if passed {
    "Congratulations"
} else {
    "Try again"
}
```

The same conditional syntax produces a value through the selected branch's final expression. There is no separate ternary operator.

```text
price := if premium {
    discounted := calculate_discount(base);
    discounted + shipping
} else {
    base + shipping
}
```

## Type rules

- Ordinary expression conditions require `Bool`; pattern and type-test conditions succeed by matching. There is no implicit truthiness.
- Normally completing value branches must produce compatible types.
- Every conditional owns a result context, whether tagged or untagged. Its result has type `T` and begins as `zero(T)` before branch selection. Whether that result is exposed as `.value` metadata remains open; if exposed, conditional metadata requires an explicit tag, and an untagged conditional does not participate in unqualified `.field` lookup. A possible conditional `then` would be the only proposed read phase for `@tag.value`; it would not imply general branch or condition access.
- A normally completing selected branch supplies the conditional result. If the chain has no final `else` and no branch matches, the result is the initial zero value of `T`.
- This fallback does not form `Option<T>` or handle an error. For example, a conditional expected as `Option<User>` returns that type's zero state, `.None`, when no pattern matches.
- A conditional whose normally completing branches produce `Unit` remains `Unit` on the unmatched path too. A non-`Unit` branch makes a missing-`else` conditional a value-producing expression, including when it is the final item of a loop body.
- Zero initialization does not infer `T` by itself. Normally completing branch values and the surrounding expected type constrain `T`. When no normally completing branch constrains `T`, it defaults to `Unit`; an expected type can override that default.
- A branch that explicitly exits checks its payload against its exit target, not against a local value it never produces.
- No arbitrary implicit union is introduced merely to accept incompatible branches.

## Missing final `else`

```text
message: String = if ready {
    "Continue"
}
```

When `ready` is false, this returns the zero value of `String` (the empty string). In a chain, the same fallback is used only after every condition is false or every pattern/guard fails:

```text
message: String = if use_cache {
    "Cached"
} else if use_guest {
    "Guest"
}
```

If neither branch matches, `message` is the zero `String`. An explicit final `else` supplies its ordinary branch result instead.

```text
found: Option<User> = @lookup if .Some(user) := find_user(id) {
    .Some(user)
}
```

On pattern mismatch, `found` is the zero value of `Option<User>`, `.None`; no explicit `.None` branch is needed. The expected type establishes `T` here. `@lookup` names the conditional context, but does not by itself settle which result metadata fields are exposed. Case-specific zero mappings beyond the selected `Option` rule remain in [zero initialization](zero-initialization.md).

The conditional's expression result is supplied by the selected branch or by the zero fallback. This result exists independently of whether the language exposes it as a readable `.value` field. The user sees no ordinary use for reading such a field in the condition or branch. The user proposes comparing the existing loop `then` with a post-selection conditional clause that can read the completed result. Whether it exists, exposes `@tag.value`, or runs for any abrupt exit remains open.

The missing-`else` case still has a normal result: if no branch matches, it is `zero(T)`. This internal result does not require an exposed metadata field.

### Candidate: conditional `then`

The user suggests reusing `then`, already used for loop completion, after a complete conditional chain. Under this candidate, `then` would run after a branch completes normally or after a missing-final-`else` path supplies `zero(T)`. Its body could inspect `@tag.value` and its tail expression could transform the conditional's body/result type `T` into a final type `R`, paralleling loop `then`.

```text
label: String = @notice if should_warn {
    "Warning"
} then {
    normalize_notice(@notice.value)
}
```

Assume `normalize_notice` accepts and returns `String`, mapping an empty string to `"No notice"` and otherwise passing the warning through. If `should_warn` is false, the conditional first produces the zero `String`; the proposed `then` still sees that result. The explicit tag follows the selected rule that exposed conditional metadata requires `@tag.field`.

This is a normal-completion/result-processing proposal, not an all-exit cleanup guarantee. Whether a tagged return, propagated error, or panic bypasses the conditional `then` needs an explicit rule. Use `finally` when the intended contract is cleanup on normal and abrupt exits; its placement and failure rules remain in the deferred lifecycle review. If both clauses are allowed, their ordering also needs a rule. The exact suffix grammar and whether `.value` is visible only in this phase are open.

### Interaction with loop bodies

The selected branch's final expression is the `if` expression's result. That result flows to its parent expression; when the `if` is the loop body's final item, the loop commits it as the next `.value`. Inside the conditional, use the loop tag to read the outer accumulator explicitly.

This no-`else` version has type `Int`, but it is still the wrong summation:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    }
}
```

When `should_add` is false, no branch matches. The conditional contributes its zero `Int`, and the loop commits that zero, losing the earlier total. This does not create `Int | Unit`; the conditional has one result type `T`, constrained to `Int` here.

To keep the previous total when the condition is false, return it explicitly:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    } else {
        @sum.value
    }
}
```

The `if` now returns either the updated total or the previous total, and the loop commits that `Int`. A separate guard with `continue` is another way to skip an iteration. The zero fallback is a value contribution, not implicit loop continuation. The explicit `@sum` access follows the selected rule for outer loop metadata inside conditionals. See [loop value inference](loop-type-inference.md).

### Conditional metadata requires explicit tags

The conditional still owns its branch result and zero fallback. Any conditional metadata that is exposed has no implicit leading-dot target: an untagged `if` does not shadow the enclosing loop, and leading-dot access does not fall through to that loop. In a conditional nested in a loop, name the intended context explicitly; reject ambiguous leading-dot metadata reads rather than guessing or searching outward. Whether the result itself is exposed as `@tag.value` remains open.

For example, both the updated and unchanged paths explicitly read the loop accumulator:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    } else {
        @sum.value
    }
}
```

The conditional result remains an ordinary expression value. No read of `@check.value` is needed to produce a branch result; whether to expose that field, perhaps only in a proposed conditional `then`, remains open.

## Existing-name type tests

```text
if person: User {
    greet_user(person)
}
```

This tests the existing value and narrows its usable type where the test is known to hold, subject to stability. It introduces no name, assignment, copy, or unchecked cast. The declared type remains unchanged. Redeclaring `person` is optional; explicit binding is useful when a new name or producer expression is wanted.

See [type tests and narrowing](type-tests-and-narrowing.md) for the selected forms and the remaining mutation, logical-flow, early-return, subtype, and generic-test decisions. Existing-name type tests are selected; their full flow-sensitive semantics are not yet a complete contract.

## Pattern conditions

```text
if .Some(user) := find_user(id) {
    greet(user)
} else {
    print("Not found")
}
```

Conditional patterns reuse declaration syntax: `if pattern := expression` for inferred destructuring and `if name: Type = expression` for typed narrowing. No `let` keyword is added. Evaluate the source once, then test the pattern; a successful pattern introduces branch-local bindings.

```text
if person: User = person {
    greet_user(person)
} else if guest: Guest = person {
    greet_guest(guest)
}
```

The right-hand `person` resolves to the outer binding before the pattern introduces its shadow. The first body sees a `User`; sibling conditions, sibling bodies, and following code resolve the outer name again. This does not reassign the outer value or change its static type. Borrowing, copying, and moving remain separate ownership decisions. See [union type patterns](union-patterns.md).

A pattern condition tests **matching**, not the truthiness of its payload. `if Some(flag) := lookup_flag()` matches `Some(false)` as well as `Some(true)`. By contrast, `if flag` requires a `Bool` and tests its value. Whether an irrefutable condition such as `if flag := false` is rejected or diagnosed remains open; if accepted as a pattern, it would always match.

`if x = value` remains invalid assignment-as-condition. The selected `if x: Type = value` is a typed declaration-shaped pattern header, not an assignment expression. Conditional binding modifiers remain unspecified. Type-pattern support does not select typed receiver-dispatch chains.

A whole typed binding must use that = form: `if age: Int := read_value()` is rejected. Type constraints inside a structural pattern still use the pattern's ordinary := source separator:

```text
if .Some(age: Int) := find_user_age(id) {
    show_age(age)
}
```

The same outer-binding restriction applies to ordinary declarations. It does not change direct `age: Int` patterns in match arms or type constraints inside tuple/constructor patterns.

## Case equality versus case-pattern binding

The existing expression form `if progress == .completed` compares enum values. The enum type inferred from progress supplies the owner of .completed, which is a complete payload-free value.

The following earlier candidates are superseded as binding-condition syntax; == does not introduce pattern bindings:

```text
/* Not binding conditions: equality never declares user or _. */
if .Some(user) == find_user(id) { greet(user) }
if .Some(_) == find_user(id) { report_found() }
if .Some == find_user(id) { report_found() }
```

The first form can already be read as constructing Some from an existing user and comparing it with the returned Option, assuming construction inference and equality are available. Introducing user instead is a different operation. The grammar must not choose between those meanings based on whether user happens to exist in an outer scope. Structural matching also need not require the payload to implement equality.

Selected rule: retain ordinary == equality and use the := condition to supply a pattern's input explicitly:

```text
if .Some(user) := find_user(id) { greet(user) }
if .Some(== outValAge) := find_user_age(id) { report_expected() }
if .Some(_) := find_user(id) { report_found() }
```

The second condition uses the selected equality-test subpattern: compare the contained age with existing outValAge, without binding that name or comparing the whole Option. In the third condition, _ is the selected ordinary readable binding with unused-name permission; it is not a newly introduced nonbinding wildcard. The same pattern meanings apply in match and nested structures; see the [operator-placement audit](pattern-contexts.md#operator-placement-audit).

Tag-only patterns are also selected for payload-bearing cases:

```text
if .Some := find_user(id) { report_found() }
```

Here .Some tests only the case tag and binds no payload. The same selected omission rule applies to match arms and nested case patterns. It does not turn a bare constructor into a complete enum value for ordinary equality. Access/ownership effects and complete case-owner inference retain their separate contracts; see [tag-only enum patterns](enums-and-variants.md#tag-only-patterns). Equality-binding conditions remain ruled out.

## Pattern binding followed by guards

```text
if .Some(user) := find_user(id) and user.age > 14 {
    greet(user)
}
```

Evaluate operands left to right and stop at the first false result or pattern mismatch. A successful pattern makes its bindings available to later and operands and the successful body. They do not leak into else or following code. This includes chains with more than one pattern match; full scope, parsing boundaries, and open or/not interactions are in [conditional pattern chains](condition-chains.md).

## Nested ownership

```text
if c1 {
    if c2 {
        a1()
    }
} else {
    a2()
}
```

Braces establish which conditional owns `else`; indentation is irrelevant.

## Recovery belongs inside bodies

The user rejects an external error-catching else(failure) attached to the whole conditional. Recovery belongs inside fn/if/loop/match bodies; ordinary else retains false-selection meaning. Operation-level handlers inside each branch remain valid with optional receivers. Body-wide handler syntax and coverage are deferred for the joint cleanup/resource review; see [body-owned recovery](body-recovery.md).

The earlier [conditional recovery investigation](conditional-recovery.md) is retained as superseded placement history. This correction does not give ! a new return target, implicitly unwrap inner Results, or settle finally placement.

## Tags and completion

```text
@access if permitted() {
    audit(@access.condition);
    grant_access()
} else {
    deny_access()
}
```

The tag names the entire conditional. `.condition` denotes its evaluated condition in the simple case and must not call it again. Metadata for an `else if` chain needs a more precise definition because not all conditions are evaluated.

The conditional owns a result of type `T`, initialized to `zero(T)`, and that result supplies the normal result when no arm matches and there is no final `else`. Whether the result is exposed as `.value` metadata is unresolved. If exposed, it requires an explicit tag such as `@access.value`; conditional metadata has no implicit leading-dot target. A post-selection `then` reusing the loop keyword is a proposal for reading or transforming this result.

A conditional `then` would follow the complete branch chain, not separate a condition from its body. It is not selected syntax and does not by itself promise cleanup on every exit. All-exit cleanup remains a separate `finally`/lifecycle question. General typed receiver clauses are exploratory, not required conditional grammar.

## Related concepts and references

- [Type tests and narrowing](type-tests-and-narrowing.md).
- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Blocks and results](blocks-and-results.md), [Receiver clauses](receiver-clauses.md), and [Tags](tags-and-contexts.md).
- [Rust conditionals](https://doc.rust-lang.org/reference/expressions/if-expr.html), [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html), and [V conditionals](https://docs.vlang.io/statements-&-expressions.html).
- [Swift conditional expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#Conditional-Expression) have restrictions that LiteScript has not chosen to copy.
