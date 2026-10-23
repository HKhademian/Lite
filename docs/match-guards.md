# Match arm guards and condition chains

Status: **pattern-if separator and binding-producing or alternatives with Unit for absent names selected on 2026-10-23; Boolean tests and additional matches retain left-to-right and chains; logical and/not subpatterns, mutation effects, and ownership details open**.

This page describes subject-based pattern arms. The selected [subjectless match](match.md#subjectless-boolean-selection-selected) instead uses ordinary Boolean headers directly, without a separate pattern or an additional if separator.

## Purpose and template

After matching the arm's subject pattern, test conditions or match additional values using the names already unpacked. The same left-to-right rules apply as in conditional pattern chains.

```text
pattern if condition { body }
```

The initial pattern matches the match subject. An optional if introduces the guard; its operands are Bool tests, existing-name type tests where valid, or explicit pattern bindings of another expression. Guard conditions use and chains and or alternatives with the same precedence, scope, short-circuiting, and payload-or-Unit binding join rule as conditional chains. A guard may contain just one operand. No as marker is needed to introduce the arm binding.

Ordering comparisons and compound relationships already work as Boolean guards, for example `value if lower <= value < upper and (ready or retry_allowed)`. All ten direct comparison prefixes, including >= minimum and >! limit, are now selected as nonbinding [comparison patterns](comparison-patterns.md). A prefix tests one supplied value; compound and cross-component conditions retain these if guards. Boolean or inside a grouped guard does not select alternative binding-producing patterns.

## Binding visibility and simple arms

The if separator makes the initial name's binding role visible without an additional as marker:

```text
match target {
    v: T if condition(v) { handle_t(v) }
    v if other(v)        { handle_other(v) }
    _                    { ignore() }
}
```

Assume statically valid Bool-producing predicates and Unit-producing handlers. The first pattern type-tests and binds v with type T before evaluating its guard. The second binds the whole subject with its inferred type. If a guard is false, try the next arm; these arm-local bindings never leak into sibling arms. The subject is evaluated once, not once per binding.

Simple `v: T { ... }`, `v { ... }`, `_v { ... }`, and `_ { ... }` arms remain valid without if. `_v` and `_` are ordinary readable bindings with permission for nonuse. An unguarded untyped binding accepts every remaining subject, so these last three forms are alternatives rather than successive fallback stages. Direct comparison patterns such as `>= minimum { ... }` also remain available and bind nothing. The separator introduces no implicit conversion, copy, or new ownership permission.

This selects `pattern if guard { body }` for every initial arm pattern, including structural and nonbinding patterns. It does not add a general as-pattern form, combined whole-value-plus-subpattern collectors, or implicit-subject comparison chains. Full comparison-operand parsing remains open.

For example, `v if lower <= v < upper { accept(v) }` visibly binds v before applying the ordinary comparison chain. The comparison-pattern spelling `>= lower < upper` is invalid; a single comparison prefix does not start an implicit-subject chain. Common arithmetic/call/member RHS forms and grouped computed RHS values are selected separately and introduce no pattern names. Outer-level comparison/Boolean/conditional/block RHS expressions require grouping; an arm if guard starts only after that complete operand/pattern. See [common comparison operands](comparison-patterns.md#common-right-operands-selected) and [grouped comparison operands](comparison-patterns.md#grouped-right-operands-selected).

## Preferred style for compound comparisons

The user prefers a visible variable binding followed by an if guard for interval and other compound comparisons. Use the same rule for a whole match subject and a nested constructor payload:

```text
match score {
    score if minimum <= score < maximum { accept(score) }
    _                                   { reject() }
}

match maybe_score {
    .Some(score) if minimum <= score < maximum { accept(score) }
    _                                         { reject() }
}
```

Assume compatible Int inputs/bounds, Option<Int> for maybe_score, and Unit-producing handlers. The initial pattern visibly supplies the local score name; the ordinary Boolean guard tests it only after matching succeeds. A false guard permits the next arm, and the subject producer still evaluates once. This preference keeps direct single-comparison patterns available. Pattern-level comparison conjunctions such as >= minimum and < maximum remain unselected at both the whole-subject and nested levels; this is an open syntax proposal, not a selected nested-only capability or a permanent rejection.

## Boolean guard example

```text
match find_user(id) {
    .Some(user) if user.age > 14 { greet(user) }
    .Some(user) { report_too_young(user) }
    .None { report_missing() }
}
```

Assume the calls produce Unit and find_user returns Option<User>. The source call runs once. The age check runs only after Some matches. A false age check rejects that arm and permits the later Some arm to handle the same subject. An if placed inside an already selected body would not have that behavior.

## Match additional unpacked data

```text
match find_user(id) {
    .Some(user)
        if user.age > 14
        and .Some(profile) := find_profile(user.id)
        and profile.visible {
        greet(user, profile)
    }
    .Some(user) { report_ineligible(user) }
    .None { report_missing() }
}
```

Within an and chain, every reached operand runs once, in source order, until false or mismatch. A successful additional pattern extends the bindings available to later operands and this body. The initial pattern is applied to the original subject; `Some(profile) := ...` explicitly identifies another source rather than silently rematching the original Option<User>.

Underscore-prefixed bindings can leave positional components unused in additional matches, such as `and (_, last: String) := user.name_parts`. `_` is an ordinary readable binding; repeated names shadow in pattern order. Later operands may read the final visible binding of each name. See [underscore bindings and skips](wildcards-and-skips.md).

Nested destructuring also works directly in that chain, for example `and (first, last: String) := user.name_parts`, assuming a suitable tuple-valued field. Alternatively a structural pattern such as `Some((first: String, last: String))` can match an optional tuple in one step. These reuse the same typed component patterns and inference rules; no nested match statement is required merely to extract or constrain components.

## Shadowing earlier arm bindings

A successful guard pattern may shadow a binding from the initial subject pattern or an earlier guard operand:

```text
match find_user(id) {
    .Some(value)
        if .Some(value) := find_profile(value.id)
        and value.visible {
        show_profile(value)
    }
    .Some(value) { show_user(value) }
    .None {}
}
```

Assume Option<User>/Option<Profile> producers, a Bool Profile.visible, and Unit-producing handlers. The guard source reads the first value as User. Its successful pattern then introduces value as Profile for later guard operands and the body. If the guard fails, the second arm matches the original subject and binds its own User; the failed arm's bindings do not leak. No binding is reassigned or changes type, and no implicit var permission or new ownership permission follows. Source evaluation, comparison-RHS lookup, and per-pattern recursive order follow [selected chain shadowing](condition-chains.md#ordered-shadowing-across-operands-selected). Subjectless match headers remain ordinary Boolean expressions.

Initial arm-pattern alternatives such as `.Email(address) or .Sms(address)` are selected separately, with shared continuation bindings typed as normalized unions, contributing Unit for names absent from an initial alternative. The shared guard sees those same initialized payload-or-Unit bindings; outer same-named values are not substituted. The if separator ends the entire initial pattern section: try its patterns left to right, stop at the first success, and then evaluate the complete shared guard once. If that guard fails, try the next arm without retrying any remaining initial pattern alternatives. An arm may have any finite number of initial alternatives; or alternatives inside the guard retain their own condition short-circuit rules. See [alternative arm patterns](match.md#alternative-arm-patterns-selected).

## Binding-producing guard alternatives

```text
match find_group(id) {
    .Some(group)
        if .Some(user) := cached_user(group.id)
            or .Some(user) := find_user(group.id) {
        greet(user)
    }
    _ { report_missing() }
}
```

Assume Option<Group>/Option<User> sources and Unit-producing handlers. Both alternatives begin with the same group binding from the initial arm pattern and introduce user. The first successful alternative supplies user and skips the other; a failed alternative exposes no tentative bindings to the next. The common binding's type is the normalized union of the alternatives' final types, here User. Differently named alternatives are also allowed: the shared continuation sees the union of introduced names with Unit for a name absent from the successful alternative. A Boolean-only alternative contributes Unit for all those new names; incoming values are not substituted. Group a disjunction before any shared later and test. Grouped matching-condition not is selected separately and exports no names; nested constructor/tuple or patterns are selected separately with local first-success/no-backtracking; logical and/not subpatterns remain open; see [selected or alternatives](condition-chains.md#binding-producing-or-alternatives-selected).

## Negating a guard condition

A guard may use the selected grouped negation:

```text
match find_group(id) {
    .Some(group)
        if not (.Some(user) := find_user(group.id) and user.active) {
        report_missing_or_inactive(group)
    }
    _ {}
}
```

Assume Option<Group>/Option<User> sources, Bool User.active, and a Unit-producing handler. The incoming group remains available after the negation. The inner user can be used only inside its parentheses and is unavailable in the handler or later outer guard operands unless an outer user already exists, in which case lookup still denotes that outer binding. Negation contributes no introduced names to any enclosing or alternative; it complements only a normal result and does not recover failures. Comparisons including =!= introduce no bindings in any guard. See [negated matching conditions](condition-chains.md#negated-matching-conditions-selected).

## Narrowing related guard bindings

The selected [related-binding rule](pattern-binding-inference.md#narrowing-related-stable-bindings-selected) retains finite known alternative combinations while their values remain stable. For `.Email(email) or .Sms(phone) if email: String`, with Email(String)/Sms(PhoneNumber), the guard proves email: String and phone: Unit for the body. It does not retry another initial pattern alternative. If a payload may itself be Unit, a Unit test retains every compatible combination rather than inventing an absent-value tag. Later shadows are distinct binding identities; relevant replacement/effects must invalidate unpreserved relationships. Whole-pattern success and pre-pattern RHS lookup rules are unchanged.

## Scope, failure, and result

- Try arms in source order; choose the first whose initial structural pattern and complete guard condition succeed. Execute only its body, with no implicit fallthrough.
- Bindings are available only after their own successful match, to later operands and the selected body. They do not leak into later arms or following code. A binding source resolves before its new names are introduced.
- False or mismatch skips the remaining operands of its current and chain; try another or alternative if present. A failed complete guard permits the next arm. Side effects already performed are not rolled back.
- Explicit return or Result propagation in an operand keeps its ordinary control-flow meaning; it is not converted into a false guard or a request to try another arm. Ordinary Results are not implicitly unwrapped by matching or guarding.
- The body's normal result must satisfy an expected result contract when present; otherwise normally completing arms infer a normalized plain union under selected [branch-result inference](branch-result-inference.md). Input binding inference remains a separate rule.
- A guarded pattern does not alone prove coverage of every value admitted by its structural pattern. Provide complete coverage where required; the exact coverage algorithm and action-match policy remain open.

## Remaining rules

The guard uses the same expression boundaries as [conditional pattern chains](condition-chains.md): grouping is required when and/or belongs inside a pattern's source value. Grouped Boolean-only or operands introduce no extra pattern bindings; binding-producing or alternatives export the union of introduced names with the first successful alternative's payloads and Unit for absent names. Grouped matching-condition not exports no names. Nested or in constructor/tuple components is selected with local first-success and no backtracking after a later component/guard failure. Logical and/not subpatterns and custom field/equality effect contracts remain open. Repeated binding names across successful guard operands now use ordered shadowing.

The ownership model must permit later arms after a failed test or guard. Do not silently duplicate a noncopyable value or commit a move that makes that path invalid. Mutations that invalidate a refinement require explicit rules; these examples do not grant unrestricted writable aliases. The exact order and effect model of recursive structural extraction is separate from the selected left-to-right order of and operands.

The earlier `pattern and condition { ... }` arm separator is superseded. Use `pattern if condition { ... }`; and/or remain condition operators inside the guard, with and binding more tightly. The alternative as-name arm marker was considered but not selected. Ordinary conditional chains retain their existing syntax.

## References

- [Rust match guard chains](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards): guards can use earlier pattern bindings, chain additional pattern matches, and reject an arm. LiteScript selects if between an arm pattern and its guard, then reuses its existing condition-chain forms and and spelling; Rust's detailed ownership and alternative-pattern evaluation rules are not adopted wholesale.
- [Conditional chains](condition-chains.md), [match patterns](match-patterns.md), [pattern binding inference](pattern-binding-inference.md), and [match](match.md).
