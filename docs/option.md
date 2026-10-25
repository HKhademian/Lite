# Option

Status: **explicit optional values established; full library API open**.

## Purpose

Represent meaningful absence without allowing `null`, `nil`, or `undefined` inside every type.

## Conceptual definition

```text
Option<T> = Some(T) | None
```

This is explanatory notation; generic enum declaration syntax has not been finalized.

## Example

```text
if .Some(user) := find_user(id) {
    greet(user)
} else {
    print("User not found")
}
```

An ordinary `User` is a user. An `Option<User>` is either a user-bearing variant or an explicitly absent variant. The compiler requires the program to handle that distinction before using a user payload.

## Constructor patterns versus expression values

```text
match find_user(id) {
    .Some(user) { greet(user) }
    .None { report_missing() }
}
```

In a pattern, `.Some(user)` and `.None` both use the expected Option type to select a case. The first also binds the contained user; the second introduces no name. The examples use both dots consistently. The older explicitly named Some(user) constructor form remains admitted; this is not a new syntax restriction. Bare None is an ordinary binding, not an absent-case test.

The selected tag-only form omits the payload pattern and introduces no payload binding:

```text
if .Some := find_user(id) {
    report_found()
}
```

The corresponding match arm is `.Some { report_found() }`; it covers every Some payload. By comparison, .Some(_) binds the payload to readable unused-allowed _. This rule concerns patterns, not construction of Some without data; see [tag-only enum patterns](enums-and-variants.md#tag-only-patterns).

By contrast, `_ { ... }` is a catch-all binding arm: `_` receives the whole remaining Option value and may be read. It does not mean None, introduce implicit unwrapping, or discard the input. Its underscore prefix permits nonuse without an unused-name warning.

In an expression, `None` still resolves normally as a prelude value unless shadowed. For example, `empty := None;` is value construction/use, not a pattern test; isolated Option payload inference remains open. This decision changes case-pattern spelling without adding nullability or implicit unwrapping. See [pattern bindings and tests](pattern-bindings-and-tests.md).

## Default extraction helper

Examples use a proposed library helper:

```text
total := previous.value_or(0);
```

Its spelling is not frozen. It means use the contained value, or an explicitly supplied fallback. There is no implicit numeric zero for every empty optional.

## Search-loop completion

The requested concise form is:

```text
found: Option<User> = @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
}
```

The declared destination `Option<User>` establishes the loop result. A matching exit supplies `Some(user)`; a non-match follows the conditional's missing-`else` zero fallback (`Option<User>.None`), which the loop commits. Exhaustion therefore yields `None` without a required trailing `None` in the body or a redundant `else { None }`.

This is not an implicit optional-completion rule and does not insert an Option accumulator. Unannotated tagged-result inference remains open; the destination supplies the type in this example, and no nullable ordinary values, implicit zero, or arbitrary default error values are introduced.

## Explicit optional loop values

Loops no longer insert an Option accumulator automatically. Their .value has a statically determined body-result type and is zero-initialized. If that type is explicitly Option<T>, its absent state is part of that Option type; there is no additional wrapper. See [loop value](loop-value.md). The earlier .acc/previous receiver model is superseded.

## Open decisions

Construction inference for an isolated `None`, extraction-helper names, ownership of extracted payloads, optional chaining, propagation with `?`, nested optional behavior, and exact layout guarantees remain open.

## Related concepts and references

- [Unit](unit.md)
- [Loop accumulator](loop-accumulator.md)
- [Loop completion](loop-completion.md)
- [Rust Option documentation](https://doc.rust-lang.org/std/option/index.html) provides an established comparison. Some optional representations can be optimized, but no universal zero-size-overhead layout guarantee has been selected for LiteScript.
