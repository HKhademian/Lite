# Match and exhaustive selection

Status: **five pattern families, and-chained arm tests/matches, and pattern-and-brace bodies selected; exhaustive actions/values selected; full grammar, coverage algorithm, and ownership rules open**.

Branch-result union inference is selected 2026-10-21; explicit/expected result contracts remain constraints.

## Purpose and template

Select behavior by variant, type, or destructured data. The same match syntax works for actions and values.

Required capabilities are equality selection, conventional payload-free enums, enums with associated values, destructuring, and type checking/narrowing. See [match pattern capabilities](match-patterns.md) for the five categories and their distinctions. And-chained Boolean tests and additional pattern matches are selected too; see [match arm chains](match-guards.md).

```text
match expression {
    pattern { arm_body }
    pattern { arm_body }
}
```

Each arm header, including any and conditions, is followed directly by a braced body. There is no case/arrow/then delimiter or required separator between arms. A trailing semicolon after a braced arm body is allowed. A completed match also permits an optional trailing semicolon, including when initializing a binding. Parenthesize the entire match to continue its value with a call, member, index, or operator.

The [keyword-placement review](match-keyword-placement.md) compares the current `match value { ... }` form with `value match { ... }`. It recommends retaining the current prefix form for consistency with if/loop and existing block boundaries. Subject-first matching remains an alternative under review, not a second accepted spelling.

## Arm chains

```text
match find_user(id) {
    .Some(user) and user.age > 14 { greet(user) }
    .Some(user) { report_too_young(user) }
    .None { report_missing() }
}
```

An additional pattern uses an explicit source, such as `and Some(profile) := find_profile(user.id)`. Operands run left to right; false or mismatch permits the next arm. Select the first fully successful arm. Names unpacked by earlier patterns are available to later operands and that arm's body only. See [match arm chains](match-guards.md).

## Optional value example

```text
message := match find_user(id) {
    .Some(user) { user.display_name() }
    .None { "Not found" }
}
print(message);
```

The selected arm's final expression supplies the result. Both arms here produce `String`.

## Tag-only enum cases

Omitting a case's entire payload-pattern list tests only its tag and introduces no payload binding:

```text
match find_user_age(id) {
    .Some { report_found() }
    .None { report_missing() }
}
```

This selected rule applies to any payload-bearing enum case and uses the same meaning as `if .Some := source`. An unguarded .Some arm covers every Some payload; put more specific Some patterns earlier if they should be selected. It differs from .Some(_), which binds readable unused-allowed _. Complete payload-list arity, ownership, and diagnostics remain separate; see [tag-only patterns](enums-and-variants.md#tag-only-patterns).

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
if .Some(user) := find_user(id) {
    greet(user)
} else {
    print("Not found")
}
```

Conditionals reuse declaration-shaped pattern headers; match arms reuse those patterns directly. There is one pattern system, with no `let` declaration keyword added for conditionals.

## Result and typing rules

- Evaluate the input once.
- Bind payload names only inside the selected arm.
- Require exhaustive coverage for every match, including action-only selection; an explicit catch-all can handle ignored cases.
- Check normally completing arms against an expected result contract when present; otherwise infer their normalized plain union, collapsing duplicate type identities.
- Treat early exits as exits to their explicit targets, not locally missing values.
- Preserve an intact Result's outer success/failure distinction before narrowing its payload. Payload type tests alone cannot distinguish success from failure when those payload types overlap.

The selected [branch-result inference rule](branch-result-inference.md) joins mixed arm results as a normalized plain union when no expected result contract supplies the type. Explicit/expected contracts remain constraints; matching still requires exhaustive coverage.

## Type-only arms and remaining coverage proposals

Type-only arms and the three base pattern operations are selected. Every match must now be exhaustive. The separate else fallback spelling remains a recommendation; detailed coverage proofs/diagnostics remain open. See [pattern primitives](pattern-bindings-and-tests.md) and the [reference comparison](pattern-syntax-comparison.md#match-specific-comparison-and-recommendations).

### Type-only arms without redeclaration

The selected `: Type` arm refines an existing stable subject, analogous to `if person: User`:

```text
label := match person {
    : User { person.display_name() }
    : Guest { person.display_name() }
}
```

This example assumes a stable `person: User | Guest` and String-producing methods. Explicit `user: User` bindings would remain available for renaming or matching a producer with no existing subject name. No implicit `it` or other receiver name would be introduced.

The earlier bare `User` type-arm candidate is ruled out by the selected bare-name binding rule: it binds a name rather than testing a type. Capitalization and type-name lookup do not change that meaning. The selected `: User { ... }` marks a type-only pattern explicitly and parallels the colon in existing-name tests. It introduces no name; explicit `user: User` combines the same type match with a binding.

Bind (`name`), type match (`: Type`), and value match (`== expected`) are selected base operations. They compose within structural patterns; exact record and whole-value composition grammar remains open. Bare identifiers bind, and `.None` explicitly selects the absent Option case; see [pattern bindings and tests](pattern-bindings-and-tests.md).

Automatic refinement applies only while the original subject name still denotes the tested value. A match evaluates its subject once; this must not make repeated calls or mutable getters appear stable, or silently freeze a reassignable name. A producer can already use explicit arm bindings to name the matched payload.

### One evaluated subject, one selected body

Source-order selection of the first fully successful arm is selected, with no implicit fallthrough. Finishing an arm finishes selection; it does not require break. Its and conditions run after structural success; false or additional pattern mismatch permits later arms. Explicit fallthrough syntax is not selected. Unreachable-arm diagnostics remain to specify.

The required pattern categories include equality values, plain enum cases, payload cases, destructuring, and type alternatives. Complete constant resolution and equality semantics before choosing their full grammar. Range patterns, alternatives in one arm, and custom matching hooks can be designed separately. Record destructuring is in scope for the destructuring requirement, with its syntax open. No additional `switch` keyword is proposed.

### Fallback and exhaustiveness

Recommend a final `else { ... }` arm for remaining values. It would bind no implicit name. An unconstrained `_` binding already supplies a catch-all pattern and names the whole matched subject; whether to also retain else as a convenience remains open.

```text
message := match status {
    200 { "Ready" }
    404 { "Not found" }
    else { "Other status" }
}
```

This is proposed literal/fallback syntax, not an extension of the current grammar sketch.

Every match must be exhaustive for both actions and values. Partial handling remains available through if. An explicit `_ {}` handles remaining inputs with Unit; `_ { Unit }` is equivalent because an empty block already returns Unit. The separate else fallback remains proposed, not required. For a closed union or enum, prefer enumerating all alternatives when additions should trigger a compiler diagnostic. A fallback intentionally handles future alternatives too and can hide that signal.

An integer or open-interface subject needs a catch-all unless the coverage checker can establish completeness. See [coverage and explicit ignoring](match-coverage.md). A guarded arm does not by itself cover every value of its structural pattern. Do not synthesize `None`, a default payload, or a panic for a missing arm.

### Guards and result types

The selected guard form is `pattern and condition { body }`, including additional explicit pattern bindings as later operands. The earlier pattern-if candidate is superseded. Mutation restrictions, ownership commitment, and evaluation with alternative patterns need formal rules; see [match arm chains](match-guards.md).

All normally completing arms must satisfy an expected result contract when present. Otherwise, a String arm and an Int arm infer String | Int under the selected union-inference rule. An explicit exit is checked against its own target. Braces, final-expression values, and optional trailing semicolons follow the same rules for actions and values.

## Notes and open questions

Common fallback patterns, overlap, exact type versus subtype matching, borrowing/copying/moving, coverage algorithms, and non-exhaustive public variants remain open. `_` is an ordinary readable binding and supplies an unconstrained catch-all arm; repeated names shadow in nested patterns too. Stored Results use selected lowercase .ok(value)/.err(error) patterns; typed receiver-dispatch chains remain open.

A body-opening brace must be distinguishable from any future record-pattern syntax without using line breaks. A fully specified type system is needed before claiming coverage checks are sound. Examples are design illustrations, not executable tests.

## Related concepts and references

- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Conditionals](conditionals.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Match pattern capabilities](match-patterns.md)
- [Enums and variants](enums-and-variants.md)
- [Option](option.md)
- [Result and errors](result-and-errors.md)
- [Receiver clauses](receiver-clauses.md)
- [Type tests and narrowing](type-tests-and-narrowing.md).
- [V sum-type matching](https://docs.vlang.io/type-declarations.html#sum-types) supplies a brace-only arm precedent; LiteScript selects colon-prefixed type-only arms, with full refinement stability rules still open.
- [Rust match expressions](https://doc.rust-lang.org/reference/expressions/match-expr.html) and [Dart patterns](https://dart.dev/language/patterns) provide comparisons for patterns and branch-local bindings.
