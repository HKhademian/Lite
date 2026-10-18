# Conditional pattern chains

Status: **and-chained pattern binding and Boolean guards selected; binding-producing or/not and rebinding across operands open**.

## Purpose and selected example

Match and bind a value, then test it in the same condition without an extra nested conditional.

```text
if .Some(user) := find_user(id) and user.age > 14 {
    greet(user)
}
```

The and separates two condition operands. It is not part of the value supplied to Some: the pattern matches `find_user(id)`, and the age comparison runs only after that match succeeds.

## Evaluation and binding scope

1. Evaluate the first condition operand.
2. If it is a pattern, evaluate its source once and attempt the whole pattern. If it is an ordinary expression, require Bool and test that value.
3. On success, make that pattern's bindings available to later and operands and the successful body.
4. On false or mismatch, skip all remaining operands and the successful body. Continue with the ordinary else-if/else selection, if present.

Thus user exists for the age test only after Some matches. The failed branch does not receive the newly introduced user, even when the pattern succeeded but a later guard failed. Following code and sibling conditions/bodies do not receive that new binding. An enclosing same-named value retains normal lookup outside the binding's successful scope.

Pattern source expressions resolve before introducing that pattern's names. They can use bindings established by earlier operands. Repeating a name in later operands needs its own policy; the selected ordered shadowing within each pattern and between loop receiver slots does not silently decide it. See [pattern binding and shadowing](pattern-shadowing.md).

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

## Ordinary Boolean grouping

An and operand can contain a grouped Boolean expression:

```text
if .Some(user) := find_user(id) and (user.admin or user.age > 14) {
    greet(user)
}
```

This or introduces no new bindings. It operates on two Boolean expressions after user is available. Plain Boolean conditions keep their existing not/and/or precedence.

Direct or between binding-producing alternatives and not around a binding-producing condition are not selected by the and-chain decision. A true disjunction need not establish either alternative's bindings, and a negated match succeeds when its payload may be absent. Define guaranteed-binding sets before permitting either form. Grouping must not export a name that may be unbound.

## Parsing boundary

At the top level of a pattern-source operand, and is a condition-chain separator. To put logical operations inside the source value instead, group that source explicitly. Calls, tuples, and other nested syntax keep their own grouping. Whitespace cannot decide whether the and belongs to a source expression or to the condition chain.

The grammar sketch uses restricted condition-operand placeholders for this boundary; it is not a complete expression grammar. Exact interactions with or, not, tagged block values, record literals, and future trailing closures remain to formalize.

## Related features

The same chain rules are selected for [match arm conditions](match-guards.md), where the initial pattern already receives the match subject. These features do not automatically select refutable loop receiver filtering, repeated typed hook dispatch, or pattern conditions as loop sources. Existing-name type tests and their stability/flow rules remain documented separately.

## References

- [Rust condition chains](https://doc.rust-lang.org/reference/expressions/if-expr.html#chains-of-conditions): left-to-right conjunction with pattern bindings available to later operands and the successful body. Its let/&& spelling and or restrictions are not copied as automatic aliases or complete LiteScript rules.
- [Kotlin logical smart casts](https://kotlinlang.org/docs/typecasts.html#logical-operators): related flow-sensitive checking, distinct from introducing new pattern bindings.
- [Conditionals](conditionals.md), [pattern contexts](pattern-contexts.md), and [evaluation order](evaluation-order.md).
