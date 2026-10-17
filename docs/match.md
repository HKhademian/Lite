# Match and exhaustive selection

Status: **pattern-and-brace arms and union type patterns selected; full pattern, coverage, and ownership rules open**.

## Purpose and template

Select behavior by variant, type, or destructured data. The same match syntax works for actions and values.

```text
match expression {
    pattern { arm_body }
    pattern { arm_body }
}
```

Each pattern is followed directly by a braced body. There is no `case`, `=>`, `then`, comma, or semicolon between arms. A completed match ends its item without a semicolon, including when initializing a binding. Parenthesize the entire match to continue its value with a call, member, index, or operator.

## Optional value example

```text
message := match find_user(id) {
    Some(user) { user.display_name() }
    None { "Not found" }
}
print(message);
```

The selected arm's final expression supplies the result. Both arms here produce `String`.

## Union type patterns and shadowing

Assume `person` has type `User | Guest`, and both display operations return `String`:

```text
label := match person {
    person: User { person.display_name() }
    guest: Guest { guest.display_name() }
}
```

The input resolves the outer `person` before introducing any arm bindings. The first arm shadows that name with a `User`; the second binds a `Guest` under a different name. These names exist only in their respective bodies. Matching neither reassigns nor changes the outer binding's static type. See [union type patterns](union-patterns.md).

## Conditional subset

```text
if Some(user) := find_user(id) {
    greet(user)
} else {
    print("Not found")
}
```

Conditionals reuse declaration-shaped pattern headers; match arms reuse those patterns directly. There is one pattern system, with no `let` declaration keyword added for conditionals.

## Result and typing rules

- Evaluate the input once.
- Bind payload names only inside the selected arm.
- Require exhaustive coverage for value-producing closed variants.
- Check normally completing arms against a compatible result type; matching does not automatically form a union to accept unrelated result types.
- Treat early exits as exits to their explicit targets, not locally missing values.
- Preserve an intact Result's outer success/failure distinction before narrowing its payload. Payload type tests alone cannot distinguish success from failure when those payload types overlap.

## Notes and open questions

Common fallback patterns, guards, arm ordering, overlap, exact type versus subtype matching, borrowing/copying/moving, coverage algorithms, and non-exhaustive public variants remain open. `_` is a readable binding, not a nonbinding wildcard. The selected surface does not settle the success-pattern spelling for stored Results or typed receiver-dispatch chains.

A body-opening brace must be distinguishable from any future record-pattern syntax without using line breaks. A fully specified type system is needed before claiming coverage checks are sound. Examples are design illustrations, not executable tests.

## Related concepts and references

- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Conditionals](conditionals.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Option](option.md)
- [Result and errors](result-and-errors.md)
- [Receiver clauses](receiver-clauses.md)
- [V sum-type matching](https://docs.vlang.io/type-declarations.html#sum-types) supplies a brace-only arm precedent; its implicit smart casts are not LiteScript's explicit pattern bindings.
- [Rust match expressions](https://doc.rust-lang.org/reference/expressions/match-expr.html) and [Dart patterns](https://dart.dev/language/patterns) provide comparisons for patterns and branch-local bindings.
