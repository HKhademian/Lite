# Conditionals

Status: **mandatory braces and one syntax for actions/values established; full matching grammar open**.

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

- Conditions require `Bool`; there is no implicit truthiness.
- Normally completing value branches must produce compatible types.
- A conditional without `else` must have `Unit` behavior; it does not silently produce an optional value.
- A branch that explicitly exits checks its payload against its exit target, not against a local value it never produces.
- No arbitrary implicit union is introduced merely to accept incompatible branches.

## Pattern conditions

```text
if let Some(user) = find_user(id) {
    greet(user)
} else {
    print("Not found")
}
```

`if let` is established illustrative notation, but its integration with the later uniform declaration grammar is still open. A pattern-bound value is available only in the matching branch.

Type patterns can narrow a union's active alternative inside such a matching branch. Working examples use `binding: Type`; this exact conditional production remains illustrative. See [union type patterns](union-patterns.md). Type-pattern support does not select general typed receiver-dispatch chains.

A matching pattern may shadow an outer name. In the working form `if let person: User = person`, the source expression resolves the outer `person`; the newly bound `User` name exists only in the matching branch. Sibling branches and following code resolve the outer name again. This does not reassign the outer binding or change its static type; payload ownership remains a separate rule.

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

- [Blocks and results](blocks-and-results.md), [Receiver clauses](receiver-clauses.md), and [Tags](tags-and-contexts.md).
- [Rust conditionals](https://doc.rust-lang.org/reference/expressions/if-expr.html), [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html), and [V conditionals](https://docs.vlang.io/statements-&-expressions.html).
- [Swift conditional expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#Conditional-Expression) have restrictions that LiteScript has not chosen to copy.
