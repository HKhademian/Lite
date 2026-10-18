# Conditionals

Status: **mandatory braces, unified actions/values, and existing-name type tests and declaration-shaped pattern conditions selected; full pattern semantics open**.

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

All branch bodies require braces. Ordinary conditionals need neither `then` nor `endif`. These keyword forms and unblocked single-statement conditionals are superseded.

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
- A conditional without `else` must have `Unit` behavior; it does not silently produce an optional value.
- A branch that explicitly exits checks its payload against its exit target, not against a local value it never produces.
- No arbitrary implicit union is introduced merely to accept incompatible branches.

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

A trailing `finally` was proposed for cleanup. There is no extra ordinary `then` separator: braces already distinguish condition from body. General typed receiver clauses are exploratory, not required conditional grammar.

## Related concepts and references

- [Type tests and narrowing](type-tests-and-narrowing.md).
- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Blocks and results](blocks-and-results.md), [Receiver clauses](receiver-clauses.md), and [Tags](tags-and-contexts.md).
- [Rust conditionals](https://doc.rust-lang.org/reference/expressions/if-expr.html), [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html), and [V conditionals](https://docs.vlang.io/statements-&-expressions.html).
- [Swift conditional expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#Conditional-Expression) have restrictions that LiteScript has not chosen to copy.
