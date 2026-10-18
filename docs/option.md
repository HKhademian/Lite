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
found := @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
}
```

The intended whole-loop result is `Option<User>`. A matching exit supplies `Some(user)`; exhausting the source supplies `None`. There is no required trailing `None` in the body or redundant `else { None }`.

This is a specific implicit optional-completion rule. It does not introduce nullable ordinary values, implicit zero, or arbitrary default error values. Its precise inference interaction with the iteration body's `Unit` type is still open.

## Accumulator state

An unseeded previous contribution is represented as `Option<T>`:

- `None` before a contribution.
- `Some(value)` after a contribution.
- Unchanged after a plain `continue` or bare `break`.

That internal state and the whole loop's result need not be the same type.

## Open decisions

Construction inference for an isolated `None`, extraction-helper names, ownership of extracted payloads, optional chaining, propagation with `?`, nested optional behavior, and exact layout guarantees remain open.

## Related concepts and references

- [Unit](unit.md)
- [Loop accumulator](loop-accumulator.md)
- [Loop completion](loop-completion.md)
- [Rust Option documentation](https://doc.rust-lang.org/std/option/index.html) provides an established comparison. Some optional representations can be optimized, but no universal zero-size-overhead layout guarantee has been selected for LiteScript.
