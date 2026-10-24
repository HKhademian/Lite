# Conditional pattern chains

Status: **and-chained binding, ordered shadowing, and binding-producing or alternatives with Unit for absent names selected on 2026-10-23; grouped matching-condition negation also selected with no exported bindings; logical and/not subpatterns and ownership remain open**.

## Purpose and selected example

Match and bind a value, then test it in the same condition without an extra nested conditional.

```text
if .Some(user) := find_user(id) and user.age > 14 {
    greet(user)
}
```

The and separates two condition operands. It is not part of the value supplied to Some: the pattern matches `find_user(id)`, and the age comparison runs only after that match succeeds.

## Optional leading separator selected

Selected 2026-10-24: the complete condition, or an explicitly parenthesized condition group, may start with one optional `and` or `or`. Thus if and .Some(user) := find_user(id) and user.active has exactly the same evaluation and binding flow as the form without the first and. A leading or likewise creates no empty alternative, missing-name Unit contribution, or extra evaluation. Require at least one real operand; do not permit stacked leaders or a new leader after an interior separator. Normal and-before-or precedence, shadowing, successful/failed-path narrowing, and ownership obligations remain unchanged. This also applies to subject-based match guards using the same condition grammar, without adding logical subpatterns. Ordinary Boolean expressions, Boolean loop sources, and subjectless match Boolean headers share the leading-separator rule separately, without gaining condition-pattern bindings. See [optional leading separators](leading-separators.md).

## Evaluation and binding scope within an and chain

1. Evaluate the first condition operand.
2. If it is a pattern, evaluate its source once and attempt the whole pattern. If it is an ordinary expression, require Bool and test that value.
3. On success, make that pattern's bindings available to later and operands and the successful body.
4. On false or mismatch, skip the remaining operands of this and chain. If it is an or alternative, try the next alternative from the common incoming scope. Only when the whole condition fails, skip the successful body and continue with ordinary else-if/else selection, if present.

Thus user exists for the age test only after Some matches. The failed branch does not receive the newly introduced user, even when the pattern succeeded but a later guard failed. Following code and sibling conditions/bodies do not receive that new binding. An enclosing same-named value retains normal lookup outside the binding's successful scope.

Pattern source expressions resolve before introducing that pattern's names. They can use bindings established by earlier operands. A later successful binding of the same name shadows the earlier one for subsequent operands and the successful body; it does not reassign or change the earlier binding's type. Within each operand, recursive ordered shadowing still applies. See [pattern binding and shadowing](pattern-shadowing.md).

Side effects already performed by earlier operands are not rolled back when a later operand fails. Existing borrowing, mutation, and cleanup rules still apply. This feature does not choose ownership commitment timing or silently unwrap fallible calls.

An [irrefutable matching operand](conditionals.md#irrefutable-pattern-conditions-selected) is allowed: if flag := check_ready() and flag binds a Bool and then tests it. Warn when the complete matching condition is provably always successful, as in if flag := false; an irrefutable prefix alone does not cause this warning when a later test can reject the condition. Source failures/exits and the successful-condition scope remain unchanged.

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

This selection covers ordinary conditional chains and subject-based match guards. Subjectless match headers remain ordinary Boolean expressions and gain no binding-producing pattern conditions. Binding-producing or alternatives and grouped negation with no exported names are selected below; nested constructor/tuple or patterns are selected separately; logical and/not subpatterns remain open.

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

Alternatives may introduce different binding names. Collect the union of their final visible name sets after each alternative's own recursive/and-chain shadowing. Repeated occurrences of one name count as one final visible name, not several. Include ordinary underscore-prefixed bindings and `_`; their unused-name permission changes diagnostics only. For each shared continuation name, normalize the union of its final binding types from all alternatives, contributing Unit for an alternative that does not introduce it.

```text
if .Some(email) := find_email(id)
    or .Some(phone) := find_phone(id) {
    deliver_optional(email, phone)
}
```

Assume Option<String>/Option<PhoneNumber> producers and a compatible Unit-producing handler. After success, email has type String | Unit and phone has type PhoneNumber | Unit. If the first alternative succeeds, email holds its payload and phone is Unit; if only the second succeeds, email is Unit and phone holds its payload. Same-name alternatives such as user from two Option<User> sources still give User, without an added Unit because both supply it. This supersedes the earlier identical-introduced-name-set restriction for complete condition/guard or alternatives.

A Boolean-only alternative introduces no names but is permitted alongside binding-producing alternatives:

```text
if .Some(user) := find_user(id) or guest_allowed {
    greet_optional(user)
}
```

Assume find_user returns Option<User>, guest_allowed is an existing Bool, and the handler accepts User | Unit. If the match succeeds, user contains its User. If that match fails and guest_allowed is true, user is Unit. If both fail, no new binding is visible in else or following code. Two Boolean-only alternatives still introduce no names. This does not add matching-source headers to subjectless match, which retains ordinary Boolean-only headers.

Unit is an initialized ordinary value, not an unbound/uninitialized name, Option/None, an implicit cast, or an absence discriminator. If a payload can itself be Unit, its Unit value cannot be distinguished from absent-name Unit through that binding alone. The successful continuation must type-check against the whole union; payload-only access requires a valid narrowing/test first. Only access valid for all possible successful values is available; full access/ownership joins remain separate. Preserve the finite known combinations for selected related-binding narrowing while the relevant bindings remain stable; arbitrary relationships are not inferred. See [related stable bindings](pattern-binding-inference.md#narrowing-related-stable-bindings-selected).

### Scope, precedence, and grouping

Each alternative starts with the same lexical bindings that existed before the or group. Supported failure facts may refine those existing bindings on the path into a later alternative, as selected below; this never imports an earlier alternative's new names. It may read common earlier and-chain or initial match-arm bindings. A failed alternative's tentative bindings, including bindings established before a later guard failed, are unavailable to subsequent alternatives. The shared bindings shadow same-named incoming bindings on every successful path, including paths where a new name receives Unit. Incoming values never fill a missing alternative binding. Unit-filled shared bindings are created for the successful continuation only, not in time for other alternatives to use; each alternative's inputs and free names still resolve in the common incoming scope. For example, a later `or user.active` cannot read an earlier failed alternative's user unless a suitable outer user was already in scope. If all alternatives fail, no alternative-local names leak to else, sibling match arms, or following code.

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

This rule applies to conditional chains and subject-based match guards after their if separator. Nested `patternA or patternB` inside constructor payload/tuple component patterns is selected separately and may be reused in supported conditional patterns. This does not add logical and/not subpatterns, alternative loop headers, or binding-producing subjectless match headers. Grouped matching-condition negation is selected separately and exports no names. Failure-path narrowing of stable existing bindings is selected below. Exact recursive parsing, broader negative flow, ownership commitment, cleanup timing, and coverage proofs remain open.

## Narrowing into later or operands selected

Selected on **2026-10-24**: a later condition alternative receives supported type facts established when the preceding alternatives failed. This is the same false-path refinement used when entering else, applied at the point where short-circuit or reaches its next operand:

```text
value: String | Int = read_value();

if value: String or value > 0 {
    handle(value); // String | Int
}
```

Assume read_value produces the declared initialized union, Int supports comparison with 0, and handle accepts String | Int and returns Unit. The right operand runs only when the existing-name String test fails, so value is Int for value > 0. A String succeeds at the first alternative and skips that comparison. The successful body admits both String and Int because either alternative can select it. Refine existing bindings at each operand; do not give the body only the last alternative's narrower type.

Apply this successively across an or chain. For a stable String | Float | Int value, after failed whole-member String and Float tests, a third alternative receives Int. Each reached operand/source evaluates once for its occurrence in source order; failure or an explicit exit keeps its ordinary control flow rather than becoming false. Effects are not rolled back.

A failed compound alternative can have several causes. In `(value: String and is_special(value)) or value > 0`, the right side can still receive a String when is_special returns false, so the Int-only comparison is rejected for the same String | Int input. Require is_special to accept String and return Bool. Do not subtract the whole String member merely because the complete guarded alternative failed, or infer arbitrary predicate complements.

This changes type knowledge about the common incoming bindings, not their lexical scope. Names introduced by a failed alternative remain unavailable to later alternatives, even if an earlier part of that alternative matched successfully. A later or user.active cannot use an earlier failed alternative's newly bound user; an existing outer user retains its own identity. Successful alternatives still join newly introduced names using the selected payload-or-Unit rule. Existing binding identities are not merged with those new names by spelling.

Retain facts only while the tested existing binding remains stable. Replacement, relevant mutation, writable aliases, or effects can invalidate a fact unless preservation is established; fresh calls and repeated getters receive no cached-value promise. No copy/freeze, mutation permission, or lifetime extension is introduced. This selection covers the supported closed distinct union type-test facts and their existing flow rules, not a complete subtype/alias solver, interval analysis, or arbitrary disjunctive inference.

The rule applies to supported conditional chains and subject-based match guards using those chains. It adds no new subpattern forms or binding-producing subjectless headers. Pattern-alternative matching and ordinary first-success short-circuiting retain their selected rules.

## Narrowing after successful or conditions selected

Selected on **2026-10-24**: after an or condition succeeds, refine a stable existing binding to the normalized union of its supported possibilities from every alternative that can successfully reach that continuation. Each alternative includes the failure facts needed to reach it and its own successful tests:

```text
value: String | Float | Int = read_value();

if value: String or value: Float {
    /* value: String | Float */
} else {
    /* value: Int */
}
```

Assume read_value produces the declared initialized closed union of distinct, nonoverlapping types, and value remains stable. The first alternative succeeds for String. After its failure, the second sees Float | Int and succeeds for Float. The successful body therefore sees String | Float; the final else sees Int after both whole-member tests fail. The body's type is neither the original full union nor only the last successful alternative's type.

This refinement is also available to a later and operand after a grouped or condition succeeds. Preserve ordinary first-success short-circuiting: joining static possibilities does not evaluate skipped alternatives, retry a completed successful group, or select several values. An and operand after that group can still reject the complete condition under the existing scope/flow rules.

Do not add Unit merely to join an existing binding: it already has a value on every path. If Unit is genuinely among its surviving input alternatives, retain it normally. Newly introduced alternative bindings still follow the separate payload-or-Unit rule. Track binding identities through shadowing; an existing name's refinement does not convert an alternative-local replacement into that same binding.

Join only justified possibilities, while keeping every possible successful path. For value: String | Float | Int, value: String or allow_other still admits all three types in the body when the existing Bool allow_other can succeed for non-Strings. A guarded String alternative followed by a Float alternative can narrow the successful body to String | Float, but its else can retain String | Int because some Strings may fail the guard. Arbitrary predicate complements, intervals, and overlapping subtype/interface inference remain open.

Require valid stability proofs at the continuation. Relevant replacement/mutation, writable aliases, or effects can invalidate earlier facts unless preservation is established; no snapshot, copy/freeze, or new ownership permission is implied. This is path-local type knowledge, not a change to the binding's declared type. After the complete if, ordinary reaching-path joins and the selected early-exit rule still apply.

This selection applies to supported conditional chains and subject-based match guards. It changes no binding visibility, evaluation order, failure/exit behavior, source-pattern negation, or allowed subpattern/header forms. Complete type relations and alias/effect analysis remain separate.

## Negated matching conditions selected

Use `not (condition)` to negate a grouped matching condition without exporting any new bindings:

```text
if not (.Some(user) := find_user(id) and user.active) {
    report_missing_or_inactive()
}
```

Assume find_user returns Option<User>, User.active is Bool, and the handler returns Unit. Evaluate the inner condition under its ordinary matching, and/or, and short-circuit rules. Inside that condition, user becomes available after Some succeeds and can be read by user.active. Complement the inner condition's normal Bool result. A missing user or an inactive user makes this negation true.

### Scope and existing names

Bindings introduced anywhere inside the negated condition remain inside it. None are available to later outer and operands, the body, else, another alternative, or following code. This holds whether the inner condition succeeds or fails, and nested/double negation does not restore its bindings. The negated operand therefore introduces an empty name set for the enclosing or alternative rules. Its inner or conditions use the same payload-or-Unit join rule, but those shared inner bindings remain inside the negation.

An incoming binding retains ordinary lookup outside the negation. If an inner pattern shadows that name, the shadow is internal only; a later outer reference still refers to the incoming binding with its own type/access, subject to ordinary mutation/refinement stability. Negation does not assign, widen, or replace it.

```text
/* Rejected when no outer user is in scope: no binding escapes not. */
if not (.Some(user) := find_user(id)) and user.active {
    greet(user)
}
```

### Evaluation and operator distinction

Each reached source/test runs once for its occurrence. Ordinary internal and/or short-circuiting remains in effect; there is no second evaluation to invert the result. Errors, panics, propagation, and explicit exits retain their ordinary behavior instead of becoming a successful negation. Effects are not rolled back, and this rule adds no copy/move/cleanup or lifetime guarantee.

Comparisons themselves introduce no bindings, including every negated comparison operator. `actual =!= expected` reads both existing operands; the comparison pattern `=!= expected` compares its supplied subject with an existing expected value. In `v if v =!= expected { ... }`, the initial v pattern binds; =!= only tests. The same nonbinding rule applies to ==, >, >!, <, <!, >=, >!=, <=, and <!=. Explicit declarations inside an ordinary block operand retain their own local scope; the comparison operator does not declare them.

Require the grouped `not (condition)` spelling when negating a source-pattern condition, including typed source bindings; ungrouped `not pattern := source` and `not name: Type = source` are rejected. Ordinary Boolean operands and existing-name type tests permit concise negation, including if not ready, and not blocked, or not ready, and if not value: String. The type test completes before not; and binds more tightly than or. These keyword sequences use one prefix operator with the same scope as in ordinary value expressions. Parentheses extend negation over a compound condition; see [condition negation scope](operators.md#negation-scope-in-conditions-selected). Ordinary comparison meanings are unchanged. This form applies to conditional chains and subject-based match guards. Subjectless match headers remain ordinary Boolean expressions without matching-source conditions, including inside not. Stable existing bindings may retain proven types after an early exit, but this never exports names from not; see [early-exit narrowing](type-tests-and-narrowing.md#narrowing-after-early-exits-selected). Logical not subpatterns, broader negative flow, full recursive parsing, ownership, and coverage remain separate contracts.

A failed complete and condition does not prove that each operand failed: value: String and is_special(value) can fail for a String. Later else-if conditions and else receive only justified exclusions of stable existing values; no bindings from that failed chain leak. See [false-branch narrowing](type-tests-and-narrowing.md#false-branches-and-else-if-chains-selected).

## Ordinary Boolean grouping

An and operand can contain a grouped Boolean expression:

```text
if .Some(user) := find_user(id) and (user.admin or user.age > 14) {
    greet(user)
}
```

This or introduces no new bindings. It operates on two Boolean expressions after user is available. Plain Boolean conditions keep their existing not/and/or precedence.

Binding-producing or is selected between complete condition alternatives with shared names typed as payload unions plus Unit where absent. Grouped matching-condition not is also selected but exports no names, because a negated match can succeed when its payload is absent. Ordinary Boolean grouping, or alternatives, and negation never export a name that may be unbound.

## Parsing boundary

At the top level of a pattern-source operand, both and and or are condition-chain separators. To put logical operations inside the source value instead, group that source explicitly. Calls, tuples, and other nested syntax keep their own grouping. Whitespace cannot decide whether and/or belongs to a source expression or to the condition chain.

The grammar sketch uses restricted condition-operand placeholders for this boundary; it is not a complete expression grammar. And/or precedence, condition grouping, and the payload-or-Unit alternative contract are selected. Grouped matching-condition negation is selected. Full recursive parsing with tagged block values, record literals, and future trailing closures remains to formalize.

## Related features

The same chain rules apply inside [match arm guards](match-guards.md), introduced by if after the initial pattern that already receives the match subject. Guards admit the same and/or condition structure, ordered shadowing, and payload-or-Unit alternative rule as ordinary conditional chains. These features do not automatically select refutable loop receiver filtering, repeated typed hook dispatch, or pattern conditions as loop sources. Existing-name type tests and their stability/flow rules remain documented separately.

## References

- [Rust condition chains](https://doc.rust-lang.org/reference/expressions/if-expr.html#chains-of-conditions): left-to-right conjunction with pattern bindings available to later operands and the successful body. Its let/&& spelling and or restrictions are not copied as automatic aliases or complete LiteScript rules.
- [Kotlin logical smart casts](https://kotlinlang.org/docs/typecasts.html#logical-operators): related flow-sensitive checking, distinct from introducing new pattern bindings.
- [Conditionals](conditionals.md), [pattern contexts](pattern-contexts.md), and [evaluation order](evaluation-order.md).
