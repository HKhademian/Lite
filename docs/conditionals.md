# Conditionals

Status: **mandatory braces, unified actions/values, existing-name type tests, and declaration-shaped pattern conditions selected; no-else conditionals as noncontributing guarded updates, explicit `?` no-initialization branches, explicit-tag conditional metadata lookup, and a post-selection `then` with `@tag.value` readable only inside it selected 2026-10-25; condition metadata is hidden. Conditional `then` requires a final `else`; `then`-before-`finally` cleanup order and cleanup-failure precedence are selected; exact cleanup attachment scope and the `&` form's public value/operations remain open**.

Normative page: this page owns conditional result construction, no-match/guarded-update behavior, `?` branches, and `then`. Tag naming/access and its lifecycle are in [tags and contexts](tags-and-contexts.md); condition grammar is in the [grammar sketch](grammar-sketch.md); pattern-chain binding is in [condition chains](condition-chains.md). See the [normative page map](normative-pages.md).

Implementation checkpoint, 2026-11-01: the igniter implements partial
conditionals for direct declaration initializers (the declaration keeps
`zero(T)` on no match, for example `x := if flag { 5 }` is 5 or 0) and for
assignments (no write on no match, including grouped values). A value-required
position still needs a final `else`. The explicit `else { ? }` reservation
branch, condition/binding correlation, defaults for else-if chains, branch-result
unions, `then`, and `finally` remain unimplemented; `?` is not parsed yet.
The restricted bootstrap compiler separately accepts total, same-kind value
`if`/`else if`/`else` expressions in initializers, assignments, arguments,
returns and function-tail positions, emitting TS conditional expressions; the C
path rejects value `if` clearly. Partial value conditionals, branch unions,
`then` and `finally` remain unimplemented there.

Lowering selected 2026-11-01: a partial declaration initializer selects the
branch value or `zero(T)` and stores once; it is not required to materialize a
zero store followed by a conditional overwrite, because the zero default is a
semantic value and an unobservable zero store may be elided. A partial
assignment lowers as one guarded store: evaluate the condition once, then write
only when it is true. This preserves the value and effect equivalence with
`x := 0` plus a guarded write, and with `if flag { x = value }` for assignments,
without fixing a physical double-store shape.

Conditional branch-result union inference is selected 2026-10-21; explicit/expected result contracts remain constraints. Irrefutable pattern conditions are selected 2026-10-24, with a warning when the complete matching condition is provably always successful.

Implementation coverage, 2026-10-30: the [experimental igniter](../igniter/README.md#conditions-and-block-values)
runs Bool conditions, basic braced branches, and same-type result expressions.
No-else action conditionals skip their branch on false. The broader union,
guarded initializer/assignment, pattern, then/finally, and metadata contracts
below remain unimplemented; those forms are rejected rather than reinterpreted.

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

All branch bodies require braces. A `then` block may follow a complete conditional chain with a final `else`; it processes the selected `T`. A partial no-`else` conditional has no `T` on its noncontributing path and cannot carry `then`. The old `endif` and unblocked single-statement forms are superseded.

## Optional leading and/or selected

A condition may begin with one optional `and` or `or` so every entry can use the same visual shape:

```text
if
    and connected
    and authenticated
{
    proceed()
} else if
    or cached
    or available_locally
{
    load()
}
```

Assume existing Bool flags and Unit-producing handlers. Each branch tests exactly the condition obtained by removing its first and/or token. The same option exists at the start of an explicitly parenthesized condition group. A single real operand is sufficient; empty conditions, stacked leaders, interior extra leaders, and trailing operators are invalid. Newlines do not determine grouping, and and still binds more tightly than or. Evaluation, bindings, narrowing, branch results, and hooks retain their existing contracts. See [optional leading separators](leading-separators.md), selected 2026-10-24.

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
- A conditional's result type `T` comes from its normally completing value branches. A final `else` makes it total: every normal path supplies `T`. Without a final `else` it is **partial**: a matching branch supplies `T`, while no match is a noncontributing path.
- A noncontributing path is interpreted by its context:
  - declaration initializer: the declaration's default remains (`zero(T)` normally, or reserved with an explicit `?` branch);
  - assignment: no write; the target keeps its current state;
  - loop body contribution: no contribution; `.value` is preserved;
  - value-required context such as a call argument, return, arithmetic operand, nested expression, or `then`: invalid without a final `else`.
- A conditional with `then` requires a final `else`; `then` needs a selected `T` to process. A partial conditional cannot carry `then`.
- A multi-member union declaration initializer still needs an explicit `else` or `?` branch because `zero(T)` cannot choose an active member. Assignment and loop noncontributing paths do not need a union member.
- A branch that explicitly exits checks its payload against its exit target, not against a local value it never produces.
- Mixed branch results infer a plain union without inventing conversions or an escaping error channel. Explicit/expected result contracts remain constraints.

The selected [branch-result inference rule](branch-result-inference.md) applies to conditional branches and match arms, consistently with local-lambda completion inference. A missing final `else` does not add `Unit` or `zero(T)` to the value paths; it makes the path noncontributing.

Exhausted conditional type-test branches warn and give exhausted bindings an internal Never read type, preserving ordinary checking without contributing a normally produced branch result. This does not inject Unit or create a value on the noncontributing path; see [Never and unreachable flow](never-and-unreachable-flow.md).

## No final `else`: guarded update

A conditional without a final `else` is partial. On a match, its branch supplies `T`. On no match, it produces no value and does not write, initialize, or contribute.

In a declaration initializer, the declaration's default remains:

```text
message: String = if ready {
    "Continue"
}
```

When `ready` is false, `message` is the zero `String` (`""`) because the declaration default supplies the value; the conditional itself does not produce a zero result.

```text
found: Option<User> = @lookup if .Some(user) := find_user(id) {
    .Some(user)
}
```

On pattern mismatch, `found` remains the declaration default `.None`. No trailing `.None` body is needed. The expected type establishes `T`.

In an assignment, no match means no write:

```text
var total := 0
total = if ready { 1 }
```

If `ready` is false, `total` keeps its current value. A fixed target may be first-initialized only on paths where it is definitely uninitialized; replacing an initialized fixed binding requires `var`. A `var` target accepts the write on a match.

In a loop body contribution, no match means no contribution:

```text
total := @sum loop values as v {
    if v > 0 { @sum.value + v }
}
```

Nonpositive values contribute nothing and `@sum.value` is preserved. If the conditional is not the body tail, its no-match path only skips the conditional; a later tail item still contributes normally. In particular, `x := if v > 0 { v }; x` still has `x: Int` with `x == 0` on no match, so the tail `x` contributes zero; put the conditional itself in tail position or use `else { ? }`/`continue` to skip.

Value-required contexts require a final `else`:

```text
f(if ready { 1 })          // rejected: add else
return if ready { 1 }      // rejected: add else
1 + (if ready { 1 })       // rejected: add else
```

### Explicit no-initialization with `?`

An explicit `?` branch makes the noncontributing path visible:

```text
y: User = if flag { new_user() } else { ? }
```

If `flag` is true, `y` is initialized. If false, `y` remains reserved. `y` is not readable until initialized on every reaching path. For a fixed `y`, the first write is permitted only where `y` is definitely reserved; after initialization, replacement requires `var`. A `var y` accepts replacement on initialized paths.

The same `?` branch is valid as an assignment no-write or loop no-contribution path:

```text
x = if flag { new_value } else { ? }   // same no-write behavior as no else
if flag { v } else { ? }               // same no-contribution behavior as no else
```

`?` is not `Unit`, `Option.None`, or `zero(T)`. It is a no-value marker and cannot be stored, passed, returned, compared, or used in arithmetic. `x: T = ?` remains the reserved declaration form. `else { ? }` is the explicit no-value block; it contains exactly `?` and is not a record initializer.

### Result processing with conditional `then`

The selected `then` spelling reuses the loop's result-processing clause for a conditional. It requires a complete chain with a final `else`, receives the selected result of type `T`, and its tail expression produces the conditional expression's final type `R`. The conditional tag's `.value` is readable only in this block, using explicit `@tag.value` access.

```text
label: String = @notice if should_warn {
    "Warning"
} else {
    ""
} then {
    normalize_notice(@notice.value)
}
```

Assume `normalize_notice` accepts and returns `String`, mapping an empty string to `"No notice"` and otherwise passing the warning through. If `should_warn` is false, the explicit `else` supplies `""`; `then` sees that `T` and produces the final `String`. The explicit tag is required for conditional metadata access.

`then` is result processing, not an all-exit cleanup guarantee. A return targeting this conditional supplies its `T` and runs its attached `then`; a return targeting an outer construct exits this conditional without running its `then`. Propagated errors and unhandled panics supply no conditional result, so its result-processing `then` is skipped. If this conditional has both hooks, `then` completes before `finally` performs cleanup as the conditional exits. On an outer-target return, error, or panic, applicable `finally` cleanup still runs while leaving even though this conditional's `then` is skipped. `finally` does not recover failures; recovery is a separate construct. Exact attachment syntax/scope remains open. Cleanup-failure precedence is selected; the `&` form's public value/operations remain open.

### Interaction with loop bodies

Without `then`, the selected branch's final expression is the `if` expression's result. With `then`, the `then` block's final expression is the conditional's result. That result flows to its parent expression. A partial no-`else` conditional used as the loop body's final item contributes on a match and does not contribute on no match, so `.value` is preserved:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    }
}
```

When `should_add` is false, no branch matches and the conditional contributes nothing. The loop keeps its previous `.value`; it does not commit `zero(Int)`. `total` is the sum of the selected numbers.

To make the no-match path explicit, either return the previous total or use `continue`:

```text
total: Int = @sum loop numbers as number {
    if should_add(number) {
        @sum.value + number
    } else {
        @sum.value
    }
}
```

The `if` now returns either the updated total or the previous total, and the loop commits that `Int`. A guard with `continue` is another way to skip an iteration. The explicit `@sum` access follows the selected rule for outer loop metadata inside conditionals. See [loop value inference](loop-type-inference.md).

A conditional used in a declaration initializer is different: `x := if should_add(number) { number }` makes `x: Int` with `x == 0` on no match, so a following tail `x` contributes zero. Put the conditional itself in tail position, or use `else { ? }`/`continue`, to skip the contribution.

### Conditional metadata requires explicit tags

A total conditional with a final `else` owns a result of type `T`; a partial no-`else` conditional has no `T` on its noncontributing path. `.value` is readable only in an attached `then`, through explicit `@tag.value`, and `then` itself requires a final `else`. Conditional metadata has no implicit leading-dot target: an untagged `if` neither establishes a leading-dot context nor falls through to the enclosing loop. Inside a conditional, leading-dot metadata has no target; name the intended context explicitly with `@loop.field` for the loop or `@tag.value` only in the conditional's attached `then`, and reject ambiguous leading-dot metadata reads rather than guessing or searching outward.

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

Well-formed existing-name type tests remain valid when proven always true or always false, with a warning for the constant test. For text: String, text: String always matches and text: Int never matches when String/Int are disjoint. Unknown names/types and other invalid expressions remain errors; general unreachable-code analysis is separate. See [constant type tests](type-tests-and-narrowing.md#provably-constant-type-tests-selected).

The successful body of an or condition joins the supported successful-path types of stable existing bindings. For value: String | Float | Int, testing value: String or value: Float leaves String | Float in the body and Int in else. No Unit is introduced by this existing-binding join; new alternative-local names retain their separate payload-or-Unit rule. Preserve all possible successful paths and stability across effects; see [successful or narrowing](condition-chains.md#narrowing-after-successful-or-conditions-selected).

An existing-name type test may target a plain union: with stable value: String | Float | Int, if value: (String | Float) leaves String | Float in the body and Int in else. A target member absent from the input creates no new possibility. See [union targets](type-tests-and-narrowing.md#union-targets-in-type-tests-selected).

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

Warn when the complete matching condition is provably always successful, rather than warning for every irrefutable operand inside a condition that can still fail. The standalone binding example requires that warning; this does not require deciding arbitrary predicates, solving all coverage, or issuing the warning when success cannot be proven. Provably constant existing-name type tests have a separate warning policy, even within a larger condition. Exact diagnostic wording, suppression controls, broader always-false diagnostics, and general unreachable-code analysis remain open; see [constant type tests](type-tests-and-narrowing.md#provably-constant-type-tests-selected).

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

The earlier [conditional recovery investigation](conditional-recovery.md) is retained as superseded placement history. This correction does not give ! a new return target or implicitly unwrap inner Results. When conditional `then` and construct-level `finally` are both attached, `then` precedes cleanup; exact attachment syntax/scope remains open. Cleanup-failure precedence is selected; the `&` form's public value/operations remain open.

## Tags and completion

```text
@access if permitted() {
    grant_access()
} else {
    deny_access()
}
```

The tag names the entire conditional chain and can identify a tagged exit target. No `.condition` metadata is exposed, either for a simple condition or an `else if` chain. Conditions are evaluated only as needed for branch selection and are not reevaluated by `then`. If later logic needs branch identity, include that identity in the branch result `T`.

A total conditional with a final `else` owns a result of type `T`; a partial no-`else` conditional has no `T` on its noncontributing path. An attached `then` requires a final `else`, transforms the selected `T` to final type `R`, and exposes `T` there as `@access.value` when the conditional is tagged. Conditional metadata has no implicit leading-dot target.

A conditional `then` follows a complete chain with a final `else`, not a separate condition or branch body. Normal branch completion supplies `T` to `then`. A tagged return to this conditional also supplies `T` and runs its `then`; a return to an outer target skips it. A propagated error or unhandled panic supplies no `T`, so conditional result processing does not run. A locally recovered failure can still lead to a normal branch value and `then`. When an applicable construct-level `finally` is attached, it follows `then` on normal completion and runs during scope exit on abrupt paths; it performs cleanup only and does not recover failures. Exact attachment scope remains open. Cleanup-failure precedence is selected; the `&` form's public value/operations remain open. Typed filtering applies to operation/block recovery targets; it does not add a recovery receiver after the conditional chain.

## Related concepts and references

- [Type tests and narrowing](type-tests-and-narrowing.md).
- [Pattern syntax comparison](pattern-syntax-comparison.md): primary-reference review and the reasons for these surface choices.

- [Blocks and results](blocks-and-results.md), [Receiver clauses](receiver-clauses.md), and [Tags](tags-and-contexts.md).
- [Rust conditionals](https://doc.rust-lang.org/reference/expressions/if-expr.html), [Kotlin control flow](https://kotlinlang.org/docs/control-flow.html), and [V conditionals](https://docs.vlang.io/statements-&-expressions.html).
- [Swift conditional expressions](https://docs.swift.org/swift-book/ReferenceManual/Expressions.html#Conditional-Expression) have restrictions that LiteScript has not chosen to copy.
