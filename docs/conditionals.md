# Conditionals

Status: **mandatory braces, unified actions/values, existing-name type tests and declaration-shaped pattern conditions selected; missing-`else` zero results, the no-contributor `Unit` default, explicit-tag conditional metadata lookup, and a post-selection `then` with `@tag.value` readable only inside it selected 2026-10-20; condition metadata is hidden. Conditional `then` behavior, `then`-before-`finally` cleanup order, and cleanup-failure precedence are selected; exact cleanup attachment scope and aggregate handling remain open**.

Conditional branch-result union inference is selected 2026-10-21; explicit/expected result contracts remain constraints. Irrefutable pattern conditions are selected 2026-10-24, with a warning when the complete matching condition is provably always successful.

## Template

```text
if condition {
    success_body
} else if other_condition {
    other_body
} else {
    fallback_body
} then {
    result_body
}
```

All branch bodies require braces. A `then` block may follow the complete conditional chain, after its optional final `else`; it processes the selected branch result or the missing-`else` zero result. The old `endif` and unblocked single-statement forms are superseded.

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
- Normally completing value branches must satisfy an expected result contract when one exists. Otherwise infer their normalized plain union, collapsing duplicate type identities.
- Every conditional owns a result context, whether tagged or untagged. Its result has type `T`, constructed from the selected branch or, where allowed, the missing-else zero fallback. Exhaustive union-valued chains do not require an initial undirected `zero(T)` before selecting a member. If the conditional has an attached `then`, that block produces the final result of type `R`; without `then`, the conditional produces `T`. Read-only `@tag.value` access to `T` is available only inside that conditional's attached `then`. It requires an explicit tag and does not expose branch or condition metadata.
- A normally completing selected branch supplies the conditional result. If the chain has no final `else` and no branch matches, an allowed single-type zero fallback supplies `zero(T)`. When resolved `T` is a normalized multi-member plain union, require an explicit fallback if selection can normally complete without a contributor.
- This fallback does not form `Option<T>` or handle an error. For example, a conditional expected as `Option<User>` returns that type's zero state, `.None`, when no pattern matches.
- A conditional whose normally completing branches produce `Unit` remains `Unit` on the unmatched path too. A non-`Unit` branch makes a missing-`else` conditional a value-producing expression, including when it is the final item of a loop body.
- Zero initialization does not infer `T` by itself. Normally completing branch values and the surrounding expected type constrain `T`. When no normally completing branch constrains `T`, it defaults to `Unit`; an expected type can override that default.
- A branch that explicitly exits checks its payload against its exit target, not against a local value it never produces.
- Mixed branch results infer a plain union without inventing conversions or an escaping error channel. Explicit/expected result contracts remain constraints.

The selected [branch-result inference rule](branch-result-inference.md) applies to conditional branches and match arms, consistently with local-lambda completion inference. An allowed missing-else path supplies zero(T), without adding Unit. A normally reachable unmatched multi-member union result requires an explicit fallback.

The selected [union fallback rule](conditional-union-fallback.md) requires an explicit fallback when resolved T is a multi-member plain union and selection can normally finish without a contributor. Exhaustive chains construct their chosen member directly; conditional then receives a valid T. This supersedes unconditional pre-selection zero initialization of conditional result storage.

## Missing final `else`

```text
message: String = if ready {
    "Continue"
}
```

When `ready` is false, this returns the zero value of `String` (the empty string). In a chain, the same fallback is used only after every condition is false or every pattern/guard fails:

```text
message: String = if use_cache {
    "Cached"
} else if use_guest {
    "Guest"
}
```

If neither branch matches, `message` is the zero `String`. An explicit final `else` supplies its ordinary branch result instead.

```text
found: Option<User> = @lookup if .Some(user) := find_user(id) {
    .Some(user)
}
```

On pattern mismatch, `found` is the zero value of `Option<User>`, `.None`; no explicit `.None` branch is needed. The expected type establishes `T` here. `@lookup` names the conditional context; its `.value` is readable only in an attached `then`. Case-specific zero mappings beyond the selected `Option` rule remain in [zero initialization](zero-initialization.md).

The conditional's normal result is supplied by the selected branch or by the zero fallback. The attached `then` runs after that result is selected and may transform `T` into `R`; only its body can read the original result as `@tag.value`. Neither conditions nor branch bodies can read the conditional's `.value` metadata.

For an allowed missing-else zero fallback, `then` receives `zero(T)` just as it receives a selected branch's result. An unmatched multi-member union path requires an explicit fallback first; `then` cannot repair a missing T after the fact.

### Result processing with conditional `then`

The selected `then` spelling reuses the loop's result-processing clause for a conditional. It follows the complete chain, receives the branch/zero result of type `T`, and its tail expression produces the conditional expression's final type `R`. The conditional tag's `.value` is readable only in this block, using explicit `@tag.value` access.

```text
label: String = @notice if should_warn {
    "Warning"
} then {
    normalize_notice(@notice.value)
}
```

Assume `normalize_notice` accepts and returns `String`, mapping an empty string to `"No notice"` and otherwise passing the warning through. If `should_warn` is false, the conditional first produces the zero `String`; `then` sees that result and produces the final `String`. The explicit tag is required for conditional metadata access.

`then` is result processing, not an all-exit cleanup guarantee. A return targeting this conditional supplies its `T` and runs its attached `then`; a return targeting an outer construct exits this conditional without running its `then`. Propagated errors and unhandled panics supply no conditional result, so its result-processing `then` is skipped. If this conditional has both hooks, `then` completes before `finally` performs cleanup as the conditional exits. On an outer-target return, error, or panic, applicable `finally` cleanup still runs while leaving even though this conditional's `then` is skipped. `finally` does not recover failures; recovery is a separate construct. Exact attachment syntax/scope remains open. Cleanup-failure precedence is selected; aggregate handling remains open.

### Interaction with loop bodies

Without `then`, the selected branch's final expression is the `if` expression's result. With `then`, the `then` block's final expression is the conditional's result. That result flows to its parent expression; when the `if` is the loop body's final item, the loop commits it as the next `.value`. Inside the conditional, use the loop tag to read the outer accumulator explicitly.

This no-`else` version has type `Int`, but it is still the wrong summation:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    }
}
```

When `should_add` is false, no branch matches. The conditional contributes its zero `Int`, and the loop commits that zero, losing the earlier total. This does not create `Int | Unit`; the conditional has one result type `T`, constrained to `Int` here.

To keep the previous total when the condition is false, return it explicitly:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    } else {
        @sum.value
    }
}
```

The `if` now returns either the updated total or the previous total, and the loop commits that `Int`. A separate guard with `continue` is another way to skip an iteration. The zero fallback is a value contribution, not implicit loop continuation. The explicit `@sum` access follows the selected rule for outer loop metadata inside conditionals. See [loop value inference](loop-type-inference.md).

### Conditional metadata requires explicit tags

The conditional still owns its branch result and zero fallback. Its `.value` is readable only in its attached `then`, through explicit `@tag.value`. Conditional metadata has no implicit leading-dot target: an untagged `if` does not shadow the enclosing loop, and leading-dot access does not fall through to that loop. In a conditional nested in a loop, name the intended context explicitly; reject ambiguous leading-dot metadata reads rather than guessing or searching outward.

For example, both the updated and unchanged paths explicitly read the loop accumulator:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    } else {
        @sum.value
    }
}
```

The conditional result remains an ordinary expression value. No read of `@check.value` is needed to produce a branch result; when a `then` is attached, `@check.value` is available only inside that block.

## Existing-name type tests

```text
if person: User {
    greet_user(person)
}
```

This tests the existing value and narrows its usable type where the test is known to hold, subject to stability. It introduces no name, assignment, copy, or unchecked cast. The declared type remains unchanged. Redeclaring `person` is optional; explicit binding is useful when a new name or producer expression is wanted.

See [type tests and narrowing](type-tests-and-narrowing.md) for the selected forms, false-branch narrowing through else/else if and into later or operands, stable existing-binding refinement after early exits, and remaining mutation, broader logical-flow, subtype, and generic-test decisions. Existing-name type tests are selected; their full flow-sensitive semantics are not yet a complete contract.

For a stable initialized closed union of distinct members, a failed whole-member type test removes that member in else. Each later else-if condition receives the remainder from preceding failed conditions, just as an if nested inside else does. For String | Float | Int, testing String and then Float leaves Int in the final else. A complete condition such as value: String and is_special(value) can fail for a String, so its else must retain String. Earlier branch-local names do not leak; effects that invalidate stability can discard the refinement. See [false-branch narrowing](type-tests-and-narrowing.md#false-branches-and-else-if-chains-selected).

Supported false-path facts also carry into a later or operand: with a stable String | Int value, value: String or value > 0 tests the right side as Int, while the successful body still admits String | Int. This refines existing bindings without exposing names introduced by a failed alternative; see [or-operand narrowing](condition-chains.md#narrowing-into-later-or-operands-selected).

Concise negation of Boolean operands and existing-name tests is selected: if not value: String means if not (value: String). Not binds more tightly than and, which binds more tightly than or, so if not blocked or trusted and ready means (not blocked) or (trusted and ready). Negating a source-pattern condition still requires parentheses, including typed source bindings. See [condition negation scope](operators.md#negation-scope-in-conditions-selected).

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

A pattern condition tests **matching**, not the truthiness of its payload. `if Some(flag) := lookup_flag()` matches `Some(false)` as well as `Some(true)`. By contrast, `if flag` requires a `Bool` and tests its value. Irrefutable conditions are permitted under the selected policy below.

`if x = value` remains invalid assignment-as-condition. The selected `if x: Type = value` is a typed declaration-shaped pattern header, not an assignment expression. Conditional binding modifiers remain unspecified. Type-pattern support does not select typed receiver-dispatch chains.

A whole typed binding must use that = form: `if age: Int := read_value()` is rejected. Type constraints inside a structural pattern still use the pattern's ordinary := source separator:

```text
if .Some(age: Int) := find_user_age(id) {
    show_age(age)
}
```

The same outer-binding restriction applies to ordinary declarations. It does not change direct `age: Int` patterns in match arms or type constraints inside tuple/constructor patterns.

## Irrefutable pattern conditions selected

Selected on **2026-10-24**: allow an irrefutable pattern in a supported matching condition. It succeeds whenever its source completes normally, including when that source produces false:

```text
if flag := false {
    use(flag); // body runs with flag == false
}
```

The compiler issues a warning because this complete condition always succeeds. It remains valid code; the warning does not reject the binding, turn the payload into a Boolean test, or add a mismatch path. Refutability depends on the source's admitted type/shape and the whole pattern, as in other pattern contexts.

An irrefutable operand can introduce a binding for a later real test:

```text
if flag := check_ready() and flag {
    proceed(); // body runs only when flag is true
}
```

Assume check_ready returns Bool and use/proceed return Unit. The source is evaluated once when reached, the pattern binds its result, and the later Boolean operand tests flag. Since that operand can reject the complete condition, the binding prefix alone does not trigger the always-success warning. This keeps matching and Boolean testing explicit and preserves ordinary and/or precedence, short-circuiting, shadowing, and successful-condition scope.

Warn when the complete matching condition is provably always successful, rather than warning for every irrefutable operand inside a condition that can still fail. The standalone binding example requires that warning; this does not require deciding arbitrary predicates, solving all coverage, or issuing the warning when success cannot be proven. Exact diagnostic wording, suppression controls, always-false diagnostics, and general unreachable-code analysis remain open.

Normal success is distinct from source failure or an explicit exit. Such outcomes retain their ordinary behavior; they do not become pattern mismatch or successful selection. Preserve all reached-source effects and ownership/cleanup obligations even when the match itself cannot fail. Names remain local to the condition's successful scope; no names escape into else or following code. This policy also applies to matching conditions inside subject-based match guards. It adds no binding-producing headers to subjectless match and no new pattern placement in loop/parameter/receiver headers. Ordinary declarations keep their existing irrefutability requirement.

## Case equality versus case-pattern binding

The existing expression form `if progress == .completed` compares enum values. The enum type inferred from progress supplies the owner of .completed, which is a complete payload-free value.

The following earlier candidates are superseded as binding-condition syntax; == does not introduce pattern bindings:

```text
/* Not binding conditions: equality never declares user or _. */
if .Some(user) == find_user(id) { greet(user) }
if .Some(_) == find_user(id) { report_found() }
if .Some == find_user(id) { report_found() }
```

The first form can already be read as constructing Some from an existing user and comparing it with the returned Option, assuming construction inference and equality are available. Introducing user instead is a different operation. The grammar must not choose between those meanings based on whether user happens to exist in an outer scope. Structural matching also need not require the payload to implement equality.

Selected rule: retain ordinary == equality and use the := condition to supply a pattern's input explicitly:

```text
if .Some(user) := find_user(id) { greet(user) }
if .Some(== outValAge) := find_user_age(id) { report_expected() }
if .Some(_) := find_user(id) { report_found() }
```

The second condition uses the selected equality-test subpattern: compare the contained age with existing outValAge, without binding that name or comparing the whole Option. In the third condition, _ is the selected ordinary readable binding with unused-name permission; it is not a newly introduced nonbinding wildcard. The same pattern meanings apply in match and nested structures; see the [operator-placement audit](pattern-contexts.md#operator-placement-audit).

Tag-only patterns are also selected for payload-bearing cases:

```text
if .Some := find_user(id) { report_found() }
```

Here .Some tests only the case tag and binds no payload. The same selected omission rule applies to match arms and nested case patterns. It does not turn a bare constructor into a complete enum value for ordinary equality. Access/ownership effects and complete case-owner inference retain their separate contracts; see [tag-only enum patterns](enums-and-variants.md#tag-only-patterns). Equality-binding conditions remain ruled out.

## Pattern binding followed by guards

```text
if .Some(user) := find_user(id) and user.age > 14 {
    greet(user)
}
```

Within an and chain, evaluate operands left to right and stop at the first false result or pattern mismatch. A successful pattern makes its bindings available to later and operands and the successful body. They do not leak into else or following code. This includes chains with more than one pattern match; or alternatives permit different binding names and Boolean-only alternatives, exposing the union of names with the first successful alternative's values and Unit where absent. Each name's type is the normalized union of its payload types and any absent-path Unit; same-name alternatives need no extra Unit when every alternative supplies the name. And binds more tightly than or, and grouping supports a shared later test; see [conditional pattern chains](condition-chains.md). Grouped not around a matching condition is now selected, with internal bindings confined to that condition and no new names exported to either branch or later tests. Ordinary Boolean not and comparison operators remain nonbinding; broader negative-flow refinement remains open.

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

## Recovery belongs inside bodies

The user rejects an external error-catching else(failure) attached to the whole conditional. Recovery belongs inside fn/if/loop/match bodies; ordinary else retains false-selection meaning. Operation-level handlers inside each branch remain valid with optional receivers. Body-wide handler syntax and coverage are deferred for the joint cleanup/resource review; see [body-owned recovery](body-recovery.md).

The earlier [conditional recovery investigation](conditional-recovery.md) is retained as superseded placement history. This correction does not give ! a new return target or implicitly unwrap inner Results. When conditional `then` and construct-level `finally` are both attached, `then` precedes cleanup; exact attachment syntax/scope remains open. Cleanup-failure precedence is selected; aggregate handling remains open.

## Tags and completion

```text
@access if permitted() {
    grant_access()
} else {
    deny_access()
}
```

The tag names the entire conditional chain and can identify a tagged exit target. No `.condition` metadata is exposed, either for a simple condition or an `else if` chain. Conditions are evaluated only as needed for branch selection and are not reevaluated by `then`. If later logic needs branch identity, include that identity in the branch result `T`.

The conditional owns a result of type `T`, initialized to `zero(T)`, and that result supplies the normal result when no arm matches and there is no final `else`. An attached `then` transforms that result to final type `R`; read-only access to `T` is available there as `@access.value` when the conditional is tagged. Conditional metadata has no implicit leading-dot target.

A conditional `then` follows the complete branch chain, not a separate condition or branch body. Normal branch completion, including the missing-`else` zero path, supplies `T` to `then`. A tagged return to this conditional also supplies `T` and runs its `then`; a return to an outer target skips it. A propagated error or unhandled panic supplies no `T`, so conditional result processing does not run. A locally recovered failure can still lead to a normal branch value and `then`. When an applicable construct-level `finally` is attached, it follows `then` on normal completion and runs during scope exit on abrupt paths; it performs cleanup only and does not recover failures. Exact attachment scope remains open. Cleanup-failure precedence is selected; aggregate handling remains open. Typed filtering applies to operation/block recovery targets; it does not add a recovery receiver after the conditional chain.

## Related concepts and references

- [Type tests and narrowing](type-tests-and-narrowing.md).
- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Blocks and results](blocks-and-results.md), [Receiver clauses](receiver-clauses.md), and [Tags](tags-and-contexts.md).
- [Rust conditionals](https://doc.rust-lang.org/reference/expressions/if-expr.html), [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html), and [V conditionals](https://docs.vlang.io/statements-&-expressions.html).
- [Swift conditional expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#Conditional-Expression) have restrictions that LiteScript has not chosen to copy.
