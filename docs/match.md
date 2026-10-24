# Match and exhaustive selection

Status: **subject-based pattern matching and subjectless Boolean selection selected; subjectless form selected on 2026-10-23; optional leading or on initial/nested pattern alternatives selected 2026-10-24; if-introduced pattern-arm guards and exhaustive actions/values selected; full grammar, coverage algorithm, and ownership rules open**.

Branch-result union inference is selected 2026-10-21; explicit/expected result contracts remain constraints.

## Purpose and template

Select behavior by variant, type, or destructured data with a subject, or by Boolean conditions without a subject. Both match forms work for actions and values.

Required capabilities are equality selection, conventional payload-free enums, enums with associated values, destructuring, and type checking/narrowing. See [match pattern capabilities](match-patterns.md) for the five categories and their distinctions. Guards introduced by if, with and-chained Boolean tests and additional pattern matches, are selected too; see [match arm chains](match-guards.md).

Subject-based guards share the selected [optional leading condition separator](leading-separators.md): pattern if and ready and permitted { body } has the same meaning as the form without the first and. Initial pattern alternatives separately permit one optional leading or. Subjectless Boolean expression headers share the ordinary Boolean-expression prefix rule without gaining pattern bindings.

```text
match expression {
    pattern { arm_body }
    pattern { arm_body }
}
```

Each arm header, including an optional if guard, is followed directly by a braced body. There is no case/arrow/then delimiter or required separator between arms. Omit the optional semicolon after each arm body and after the completed match, including nested code and binding initializers. The grammar still permits those separators; see the [shared semicolon rule](lexical-structure.md#semicolon-style-after-closing-braces). Parenthesize the entire match to continue its value with a call, member, index, or operator.

The [keyword-placement review](match-keyword-placement.md) compares the current `match value { ... }` form with `value match { ... }`. It recommends retaining the current prefix form for consistency with if/loop and existing block boundaries. Subject-first matching remains an alternative under review, not a second accepted spelling.

## Subjectless Boolean selection selected

Omit the subject to select the first true Boolean condition:

```text
match {
    val1 == val2 { report_equal() }
    isUserSigned { show_account() }
    _            { show_sign_in() }
}
```

Assume compatible equality operands, an existing Bool isUserSigned, and Unit-producing handlers. Each reached condition evaluates once, in source order. False continues to the next arm. Execute only the first true arm's body, then finish the match without fallthrough; later conditions and bodies do not run. Ordinary Boolean and/or/not and comparison chains retain their expression precedence and short-circuiting. Effects already performed remain; failures and explicit exits keep their ordinary meaning instead of becoming false.

The absence of a subject selects expression headers. `isUserSigned` reads an existing Bool; it does not bind a new name. `_ready` would likewise read an existing Bool. There is no implicit subject or capture binding. Binding-producing pattern-condition headers and an additional pattern-arm if separator are not added by this selection; combine ordinary Boolean tests with and/or instead.

A complete Boolean header may start with one optional and/or under the [leading-separator rule](leading-separators.md#boolean-values-without-extra-parentheses). For example, and connected and permitted { allow() } tests exactly connected and permitted. The arm's body-opening brace establishes the header boundary without extra parentheses; indentation does not. Each reached header is still evaluated only once for that selection attempt, and no pattern name is introduced. Initial patterns in subject-based matching retain their separate alternative grammar.

A header consisting solely of `_` is the unconditional fallback in this subjectless form. It introduces no binding because there is no supplied subject. `_` inside another expression retains ordinary identifier lookup. In subject-based matching, `match value { _ { ... } }` still binds the whole subject to readable unused-allowed `_`; its selected pattern meaning is unchanged. Put a subjectless fallback last: if it appears earlier, it selects when reached and makes later arms unreachable.

Exhaustiveness remains required for actions and values. Provide a fallback when completeness of the Boolean conditions cannot be established; `_ {}` explicitly handles the all-false path with Unit. No missing-arm zero, Unit, None, or panic is synthesized. The coverage proof algorithm remains open.

A subjectless match can produce a value under the same branch-result rules:

```text
label := match {
    val1 == val2 { "equal" }
    isUserSigned { "signed in" }
    _            { "guest" }
}
```

The arms here produce String. Expected result contracts still constrain every normally completing arm; otherwise infer the normalized union of their result types. Each arm body has its ordinary local scope.

If the next non-comment token after match is `{`, that brace starts the subjectless arm list. A brace-starting subject expression must be grouped, for example `match ({ compute_subject() }) { ... }`. Within a Boolean arm header, an outer-level ungrouped opening brace starts its body; block/conditional/record value expressions used inside the header require grouping, while nested call arguments retain their ordinary delimiters. Thus val2 in `val1 == val2 { ... }` is an expression reference, not a record-construction head. Whitespace, capitalization, name lookup, and type checking do not choose the form. Complete recursive Boolean-header/body parsing still belongs to the unfinished expression grammar; this form does not introduce trailing-closure syntax or new record construction forms.

## Alternative arm patterns selected

A subject-based match arm may select alternative patterns with or:

```text
match contact {
    .Email(address) or .Sms(address) {
        deliver(address)
    }
}
```

Assume contact has exactly Email(String) and Sms(PhoneNumber) cases and deliver accepts String | PhoneNumber and returns Unit. The notation describes the cases' payload contracts, not new enum declaration grammar. Both alternatives bind address, and the shared body sees address as String | PhoneNumber. It holds only the successful case's actual payload at runtime; no conversion, wrapping, or simultaneous pair of values is implied. A distinct PhoneNumber type remains a member of that union even if its representation is numeric. Only a transparent alias resolves to its underlying type before union normalization.

Evaluate the subject once and try alternatives left to right against that supplied value. The first successful alternative supplies the body bindings and skips later alternatives. Failed alternatives introduce no names into later ones. Arm alternatives may introduce different final visible binding names. Collect the union of their name sets, including ordinary underscore pattern bindings, after each alternative's recursive ordered shadowing. Each shared continuation name has the normalized union of its binding types across alternatives, contributing Unit for an alternative that does not introduce it. An outer name never fills a missing binding. This replaces the earlier identical-name-set restriction for initial arm alternatives; complete condition/guard or alternatives now use the same payload-or-Unit join rule.

Each alternative resolves free comparison-RHS names in the common pre-pattern scope, not from failed alternatives or new sibling bindings. Preserve ordinary effects and failures; they are not converted into mismatch or rolled back. The shared body's operations must be valid for the inferred union and available access. This grants no copying, moving, mutation permission, or lifetime guarantees. The later selected rule permits related-binding narrowing only from known alternatives while the relevant bindings remain stable; arbitrary relationships remain outside that rule.

This selects alternatives at the initial arm-pattern level; constructor payload and tuple component alternatives are also selected below. Logical and/not subpatterns remain separate decisions. Shared-guard behavior is selected below. Subjectless match headers remain Boolean expressions. See [alternative binding inference](pattern-binding-inference.md#alternative-arm-binding-types-selected).

### Optional leading or and one shared body

Selected 2026-10-24: the complete initial pattern list permits one optional leading or, so payload-binding and payload-free alternatives can use the same visual shape:

```text
match contact {
    or .Email(address)
    or .Sms(address)
    or .Unavailable
    {
        deliver_optional(address)
    }
}
```

Assume exactly Email(String), Sms(PhoneNumber), and payload-free Unavailable cases and a Unit-producing handler accepting String | PhoneNumber | Unit. These are three patterns in one arm with one shared body. Removing the first or gives exactly the compact form; braces and an optional shared if guard, not newlines, establish the arm boundary. A singleton leading-or list is valid too. The leader supplies no empty pattern, test, binding, or Unit. The binding address gains Unit here only because the real Unavailable alternative lacks that binding. Keep ordinary first-success selection, payload-or-Unit binding joins, guard-once/no-retry behavior, and exhaustive checking. Empty, stacked, interior extra, and trailing or separators are invalid. See [leading pattern alternatives](leading-separators.md#pattern-alternatives-with-one-shared-body).

## Nested alternative patterns selected

Or alternatives may also appear inside constructor payload patterns and tuple component patterns:

```text
match maybe_contact {
    .Some(.Email(address) or .Sms(address)) {
        deliver(address)
    }
    _ {}
}
```

Assume maybe_contact is Option<Contact>, Contact has Email(String)/Sms(PhoneNumber) cases, and deliver accepts String | PhoneNumber and returns Unit. Some supplies its existing payload component to the inner alternatives. Test Email then Sms against that same supplied component, stop at the first success, and infer address as String | PhoneNumber. The producer/whole match subject is evaluated once; nesting does not introduce another producer call or a binding for the whole Some value.

Existing parentheses and commas delimit the component receiving or. For example, `(.Email(address) or .Sms(address), received_at)` tests the first tuple component using the alternatives and binds the second separately. The comma ends the first component's alternative list; the alternatives do not consume received_at. Constructor payload argument separators work the same way. Or at the component-pattern level separates complete patterns; Boolean or inside a comparison RHS retains its required grouping, as in `== (ready or retry)`. This selects no logical and/not subpatterns or extra constructor schema.

The union-of-names and Unit rules apply at each nested choice. `.Some(.Email(email) or .Sms(phone))` provides email: String | Unit and phone: PhoneNumber | Unit, with absent names initialized to Unit after that local choice succeeds. These are candidate bindings inside the enclosing pattern: the entire enclosing pattern must succeed before any of its bindings become available to the outer condition continuation, shared guard, or body. A failed alternative leaks no names to its peers, and new sibling pattern bindings are still unavailable as free comparison-RHS names. Resolve those names in the enclosing pre-pattern scope. Recursive written-order shadowing continues after the selected local choice, including its Unit-filled names.

Each complete constructor-payload or tuple-component alternative list may also start with one optional or. Thus .Some(or .Email(address) or .Sms(address)) and (or .Email(address) or .Sms(address), received_at) retain exactly the corresponding compact patterns' matching/binding behavior. Existing parentheses and commas bound the local list; a real pattern is required and no second bare leader is allowed at the same boundary. This does not introduce logical and/not subpatterns or a new schema. See [nested leading alternatives](leading-separators.md#nested-alternatives).

### Local first success without backtracking

Each nested choice commits to its first locally successful alternative and skips later local alternatives. If another component subsequently mismatches, the enclosing pattern fails; do not return to an earlier successful nested choice to try a different payload binding. Ordinary enclosing alternatives may then be tried under their own rules. If the shared arm guard fails after the entire initial pattern succeeds, move to the next arm without retrying initial or nested pattern choices. Failures and explicit exits retain normal control flow rather than becoming mismatch, and performed effects are not rolled back.

The same nested forms may be reused in already supported conditional patterns. Ordinary declarations still require an irrefutable pattern for their static input; this selection creates no hidden mismatch result. Subjectless match headers remain ordinary Boolean expressions, and no loop/lambda/receiver filtering is added. Full recursive productions, record-field destination composition, extraction order/effects, ownership, and complete coverage proofs remain separate contracts. See [nested inference](pattern-binding-inference.md#nested-alternative-binding-inference-selected).

## Differently named arm bindings selected

```text
match contact {
    .Email(email) or .Sms(phone) {
        deliver_optional(email, phone)
    }
}
```

Assume Email(String)/Sms(PhoneNumber) cases and a compatible Unit-producing handler. The shared guard/body scope has email: String | Unit and phone: PhoneNumber | Unit. If Email wins, email holds its String payload and phone is Unit. If Sms wins, email is Unit and phone holds its PhoneNumber payload. These are initialized typed values, not unbound or uninitialized locals. Same-name `.Email(address) or .Sms(address)` still gives address: String | PhoneNumber, with no added Unit because every alternative supplies address.

An outer same-named binding is shadowed throughout that shared scope, including on a path where the new binding is Unit. Alternatives themselves still resolve their inputs/free names before the shared bindings exist. If all alternatives fail, no new names escape; no body or shared guard executes. Ordinary access/type checks apply to the union, so a payload-only operation requires a valid narrowing/test first. This adds no mutation or ownership permissions.

The Unit contribution is literal Unit/(), not a new Option/None value or synthetic discriminator. If a matched payload type already includes Unit, that payload and the absent-binding Unit are not distinguishable by that binding's value/type alone. The known Email/Sms binding combinations are now retained for related-binding narrowing while stable. With Email(String), email: String proves phone is Unit; if Email may carry Unit, email: Unit does not uniquely select Sms. See [related stable bindings](pattern-binding-inference.md#narrowing-related-stable-bindings-selected). Complete condition/guard or alternatives now use this same missing-name Unit rule, including alternatives that introduce no names and only test an existing Bool.

## Alternative selection before a shared guard selected

An arm may contain one or more pattern alternatives, with any finite number written using or. For `A or B or C if guard { body }`, the if separates the complete pattern section from its shared guard. This is not the ordinary Boolean expression `A or B and C`, whose and operator has higher precedence than or.

Evaluate the subject once and test initial patterns from left to right. Stop at the first successful pattern; do not evaluate remaining alternatives. Use that pattern section's successful bindings to evaluate the shared guard once, under the guard's ordinary internal and/or short-circuit rules. If the complete guard is false or mismatches, try the next arm; do not retry a later initial pattern in the same arm. Failures and explicit exits retain their normal meaning, and performed effects are not rolled back.

Thus each arm has one shared body and at most one shared guard, but it can have many alternative initial patterns. A failure inside an or alternative within the guard may still try another guard alternative; that is distinct from retrying the initial pattern section. Nested constructor/tuple component alternatives follow the selected local choice rule below.

## Arm chains

```text
match find_user(id) {
    .Some(user) if user.age > 14 { greet(user) }
    .Some(user) { report_too_young(user) }
    .None { report_missing() }
}
```

An if starts the guard after the initial arm pattern. An additional pattern uses an explicit source, such as `if .Some(profile) := find_profile(user.id)` as its first operand, or `and .Some(profile) := find_profile(user.id)` after an earlier guard operand. Within each and chain, operands run left to right. A failed chain may try the next or alternative from the same incoming scope; only a failed complete guard permits the next arm. Binding-producing or alternatives expose the union of introduced names, supplying the first successful alternative's binding values and Unit for absent names. Select the first fully successful arm. Names unpacked by earlier patterns are available to later operands and that arm's body only. See [match arm chains](match-guards.md).

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

## Remaining types in later arms

A later arm sees only subject possibilities not handled by earlier arms. For a stable initialized value: String | Float | Int, an unguarded `: String { ... }` arm leaves Float | Int for the following `_` arm; both the original stable value and the new `_` binding have that narrower type in the fallback. No failed-pattern bindings are carried forward. Binding inference for the later pattern uses this remaining subject type.

A guarded String arm can reject Strings through its guard, so it does not remove String entirely from the next arm's input. Partial literal/comparison/payload tests likewise cannot erase a whole containing type without a supported proof. Subject identity/stability is required to refine the original name; the once-evaluated subject does not cache future getters or calls. The outer declared type remains unchanged after the match. See [remaining subject types](type-tests-and-narrowing.md#remaining-subject-types-across-match-arms-selected).

## Result and typing rules

- With a subject, evaluate that input once. Without a subject, evaluate each reached Boolean arm condition once in source order.
- Subject-based pattern bindings are arm-local; subjectless Boolean headers introduce no pattern bindings.
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

Bind (`name`), type match (`: Type`), and value match (comparison prefixes such as `== expected` or `>= limit`) are selected base operations. They compose within structural patterns; components use variable bindings or nested patterns without combined whole-value/nested collectors; complete recursive record/tuple parsing remains open. Bare identifiers bind, and `.None` explicitly selects the absent Option case; see [pattern bindings and tests](pattern-bindings-and-tests.md).

Automatic refinement applies only while the original subject name still denotes the tested value. A match evaluates its subject once; this must not make repeated calls or mutable getters appear stable, or silently freeze a reassignable name. A producer can already use explicit arm bindings to name the matched payload.

### One evaluated subject, one selected body

Source-order selection of the first fully successful arm is selected, with no implicit fallthrough. Finishing an arm finishes selection; it does not require break. Its if guard runs after structural success; a failed complete guard permits later arms, after trying any or alternatives within that guard. Explicit fallthrough syntax is not selected. Unreachable-arm diagnostics remain to specify.

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

The selected guard form is `pattern if condition { body }`, including additional explicit pattern bindings, and chains, and or alternatives with payload-or-Unit bindings inside the guard. This supersedes the earlier pattern-and separator; no as binding marker is selected. Mutation restrictions, ownership commitment, and evaluation with alternative patterns need formal rules; see [match arm chains](match-guards.md).

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
