# Conditional pattern chains

Status: **and-chained binding, ordered shadowing, and binding-producing or alternatives with identical introduced-name sets selected on 2026-10-23; binding-producing not, logical subpattern alternatives, and ownership remain open**.

## Purpose and selected example

Match and bind a value, then test it in the same condition without an extra nested conditional.

```text
if .Some(user) := find_user(id) and user.age > 14 {
    greet(user)
}
```

The and separates two condition operands. It is not part of the value supplied to Some: the pattern matches `find_user(id)`, and the age comparison runs only after that match succeeds.

## Evaluation and binding scope within an and chain

1. Evaluate the first condition operand.
2. If it is a pattern, evaluate its source once and attempt the whole pattern. If it is an ordinary expression, require Bool and test that value.
3. On success, make that pattern's bindings available to later and operands and the successful body.
4. On false or mismatch, skip the remaining operands of this and chain. If it is an or alternative, try the next alternative from the common incoming scope. Only when the whole condition fails, skip the successful body and continue with ordinary else-if/else selection, if present.

Thus user exists for the age test only after Some matches. The failed branch does not receive the newly introduced user, even when the pattern succeeded but a later guard failed. Following code and sibling conditions/bodies do not receive that new binding. An enclosing same-named value retains normal lookup outside the binding's successful scope.

Pattern source expressions resolve before introducing that pattern's names. They can use bindings established by earlier operands. A later successful binding of the same name shadows the earlier one for subsequent operands and the successful body; it does not reassign or change the earlier binding's type. Within each operand, recursive ordered shadowing still applies. See [pattern binding and shadowing](pattern-shadowing.md).

Side effects already performed by earlier operands are not rolled back when a later operand fails. Existing borrowing, mutation, and cleanup rules still apply. This feature does not choose ownership commitment timing or silently unwrap fallible calls.

## More than one match

```text
if .Some(user) := find_user(id)
    and .Some(profile) := find_profile(user.id)
    and profile.visible {
    greet(user, profile)
}
```

The line breaks have no structural meaning. user is available to find_profile; both user and profile are available to the final guard and body. Skipped operations do not run. Each component binding retains the type inferred from input portions compatible with its pattern.

## Ordered shadowing across operands selected

A binding-producing operand may introduce a name already bound by an earlier operand:

```text
if .Some(value) := find_user(id)
    and .Some(value) := find_profile(value.id)
    and value.visible {
    show_profile(value)
}
```

Assume find_user returns Option<User>, find_profile takes a user id and returns Option<Profile>, Profile has a Bool visible field, and show_profile returns Unit. The second source reads value as the earlier User. Only after its whole pattern succeeds does the new Profile binding become visible to value.visible and the body. These are distinct bindings and may have different types; shadowing needs no var and does not assert equality or infer a union for one changing binding.

Resolve each operand's source and free names in comparison-pattern RHS expressions in the scope available before that pattern. This includes earlier successful chain bindings, but not new sibling bindings inside the current pattern. Then apply the pattern's existing recursive binding order; only after the whole pattern succeeds do its final bindings extend or shadow the chain scope.

The rule includes underscore-prefixed pattern names and `_`, which remain ordinary readable bindings with permission for nonuse. It also applies when a match-arm guard shadows a name from that arm's initial subject pattern. Boolean operands and existing-name type tests do not themselves introduce a replacement binding; they keep their existing testing/narrowing roles.

If any later match or test fails, no chain-local binding is available in the failed branch, a sibling arm, or following code. An outer same-named binding remains the name visible there. Earlier effects are not undone. Hidden bindings retain their own types/access and ownership obligations; this rule does not specify moves, immediate destruction, or cleanup timing. Different names remain available when both values need to be used later.

This selection covers ordinary conditional chains and subject-based match guards. Subjectless match headers remain ordinary Boolean expressions and gain no binding-producing pattern conditions. Binding-producing or alternatives are selected below; binding-producing not and alternatives inside one structural pattern remain open.

## Binding-producing or alternatives selected

Complete condition alternatives may be joined by or:

```text
if .Some(user) := cached_user
    or .Some(user) := find_user(id) {
    greet(user)
}
```

Assume both sources provide Option<User> and greet returns Unit. Try the alternatives left to right. A successful first alternative supplies user to the body and skips the second source entirely. If the first fails, evaluate the second. Each reached source/test evaluates once for that occurrence. Failures and explicit exits keep their ordinary control flow; they are not false or mismatch, and effects already performed are not rolled back.

### Binding names and types

Every alternative must introduce the same set of visible binding names on success, even when the body does not read them. Collect the final binding of each name after that alternative's own recursive/and-chain shadowing. Repeated occurrences of one name count as one visible name, not several names. Underscore-prefixed pattern names and `_` are ordinary bindings and participate in this comparison; unused-name permission is not permission to omit a binding from one alternative. Existing incoming names are not newly introduced and cannot fill a missing name in an alternative.

```text
/* Rejected: alternatives introduce different names. */
if .Some(user) := cached_user
    or .Some(other) := find_user(id) {
    refresh()
}
```

A Boolean-only alternative introduces no names. Thus two Boolean alternatives remain ordinary or, while mixing a branch that introduces user with a branch that introduces nothing is rejected, even if an outer user already exists. This selection does not silently synthesize a missing binding, an Option, a default, or a copy.

After success, each shared name denotes the value from the first successful alternative. Its static type is the normalized union of that name's final binding types across the alternatives, collapsing identical types. For example, Int and String alternatives give value type Int | String. Body operations must be valid for that contract; no implicit conversion or common-supertype replacement is added. Only access valid for every possible successful binding is available; full access/ownership joins remain part of their broader contracts. No arbitrary cross-binding correlation/refinement algorithm is selected.

### Scope, precedence, and grouping

Each alternative starts in the same scope that existed before the or group. It may read common earlier and-chain or initial match-arm bindings. A failed alternative's tentative bindings, including bindings established before a later guard failed, are unavailable to subsequent alternatives. Successful alternatives shadow same-named incoming bindings only in the shared successful continuation. If all alternatives fail, no alternative-local names leak to else, sibling match arms, or following code.

And binds more tightly than or. Thus A and B or C and D selects between two and chains; it does not feed A/B's bindings into C/D. Group a disjunction before a shared later test:

```text
if (.Some(user) := cached_user
    or .Some(user) := find_user(id))
    and user.active {
    greet(user)
}
```

Assume User.active is Bool. The selected alternative supplies user before the shared active test. If active is false, the condition fails; it does not retry the other alternative after the or group already succeeded. Grouping a condition does not turn its bindings into an ordinary value expression.

At the top level of a pattern-source operand, both and and or are condition separators. A source value containing those Boolean operators needs its own ordinary expression grouping. This separates `.Some(user) := source or ...` from a source expression that computes an or value; whitespace does not choose the reading.

This rule applies to conditional chains and subject-based match guards after their if separator. It does not add `patternA or patternB` inside one structural pattern, binding-producing not, alternative loop headers, or binding-producing subjectless match headers. Exact recursive parsing, negative flow, ownership commitment, cleanup timing, and coverage proofs remain open.

## Ordinary Boolean grouping

An and operand can contain a grouped Boolean expression:

```text
if .Some(user) := find_user(id) and (user.admin or user.age > 14) {
    greet(user)
}
```

This or introduces no new bindings. It operates on two Boolean expressions after user is available. Plain Boolean conditions keep their existing not/and/or precedence.

Binding-producing or is selected only between complete condition alternatives with identical introduced-name sets, as described above. Not around a binding-producing condition remains unselected: a negated match can succeed when its payload is absent. Neither ordinary Boolean grouping nor this or rule permits exporting a name that may be unbound.

## Parsing boundary

At the top level of a pattern-source operand, both and and or are condition-chain separators. To put logical operations inside the source value instead, group that source explicitly. Calls, tuples, and other nested syntax keep their own grouping. Whitespace cannot decide whether and/or belongs to a source expression or to the condition chain.

The grammar sketch uses restricted condition-operand placeholders for this boundary; it is not a complete expression grammar. And/or precedence, condition grouping, and the same-name alternative contract are selected. Full recursive parsing with not, tagged block values, record literals, and future trailing closures remains to formalize.

## Related features

The same chain rules apply inside [match arm guards](match-guards.md), introduced by if after the initial pattern that already receives the match subject. Guards admit the same and/or condition structure, ordered shadowing, and same-name alternative rule as ordinary conditional chains. These features do not automatically select refutable loop receiver filtering, repeated typed hook dispatch, or pattern conditions as loop sources. Existing-name type tests and their stability/flow rules remain documented separately.

## References

- [Rust condition chains](https://doc.rust-lang.org/reference/expressions/if-expr.html#chains-of-conditions): left-to-right conjunction with pattern bindings available to later operands and the successful body. Its let/&& spelling and or restrictions are not copied as automatic aliases or complete LiteScript rules.
- [Kotlin logical smart casts](https://kotlinlang.org/docs/typecasts.html#logical-operators): related flow-sensitive checking, distinct from introducing new pattern bindings.
- [Conditionals](conditionals.md), [pattern contexts](pattern-contexts.md), and [evaluation order](evaluation-order.md).
