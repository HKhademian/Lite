# Pattern contexts and mismatch behavior

Status: **review dated 2026-10-18; shared capabilities selected, several placement and failure policies still proposals**.

## Purpose

Use one composable pattern vocabulary across binding and selection contexts. The enclosing construct determines whether mismatch is permitted, what happens next, and where names exist. Sharing patterns does not imply identical failure behavior everywhere.

An **irrefutable** pattern matches every value admitted by its input contract. A **refutable** pattern can fail for some admitted value. Refutability depends on both the pattern and the input type: a typed tuple pattern can be irrefutable for a known matching tuple and refutable for a broader union.

The selected capabilities and typing rules are in [match patterns](match-patterns.md) and [pattern binding inference](pattern-binding-inference.md). The base operations are bind (`name`), type match (`: Type`), and value match (`== expected`). Whole-value colon patterns, rest capture details, and enum/metadata collision handling still have separate open decisions. The .case enum shorthand itself is selected.

Partially annotated patterns constrain their input and infer every binding from compatible possibilities as one type or a union. This does not change the separate compatible-result policy for if/match branch expressions.

## Operator-placement audit

Review dated 2026-10-18, with operator roles and tag-only patterns subsequently confirmed: the shared pattern meanings are consistent with the Some conditions, but their surrounding punctuation is construct-specific. `:=` supplies an explicit source in an inferred declaration or pattern condition; it is not part of the pattern itself. `== expected` is a value-test subpattern. Ordinary expression equality remains `left == right` and introduces no bindings. All four Some condition forms below use selected capabilities.

### Conditions and nested patterns

These three conditions use selected pattern capabilities:

```text
if .Some(age) := find_user_age(id) { show_age(age) }
if .Some(== outValAge) := find_user_age(id) { report_expected() }
if .Some(_) := find_user_age(id) { report_found() }
```

The first binds age, the second compares the payload with an existing outValAge without binding it, and the third binds readable _ with unused-name permission. Each source is evaluated once. A mismatch skips its body. The value-test pattern does not construct Some or compare the whole Option.

Nested structure preserves the same meaning:

```text
if .Some((age: Int, == expectedName)) := lookup_age_name(id) {
    show_age(age)
}
```

This tests Some, then its tuple payload, binds the Int age, and compares the second component with an existing expectedName. New bindings are visible only after the whole pattern succeeds. Later and operands can use them under the existing chain rules.

### Match supplies its subject

```text
match find_user_age(id) {
    .Some(== outValAge) { report_expected() }
    .Some(age) { show_age(age) }
    .None { report_missing() }
}
```

The arm patterns have the same meanings as in if. They need no := because match already supplies the subject. A later arm's additional match does supply another source explicitly, for example `and .Some(profile) := find_profile(user.id)`. An ordinary guard such as `and age == outValAge` remains a Boolean expression, not another binding pattern.

### Declarations, parameters, and receivers

- `(left, right) := pair` explicitly supplies pair to a declaration pattern. Outside a conditional, a refutable pattern still needs a failure contract; writing `.Some(age) := possibleAge` cannot silently acquire if's mismatch behavior.
- `age: Int = expression` and `if age: Int = expression` are the selected whole typed-binding forms. They are not assignment expressions. Both `age: Int := expression` and `if age: Int := expression` are rejected. This resolves the previously reported grammar overlap: the := source form excludes an outermost typed binding, while nested constraints such as `.Some(age: Int)` remain valid. Match arms and receiver patterns have no := source separator to restrict and retain their ordinary typed-binding capability, subject to their own grammar/mismatch contracts.
- `loop pairs as (left, right), count` receives the item and count from the loop. No := is required inside those slots. Each slot pattern must now be irrefutable for its input contract; a refutable receiver such as `.Some(== outValAge)` is rejected when it cannot match every admitted input. Selection belongs inside the body. The loop separator remains open.
- Function parameters receive arguments, and completion/recovery receivers receive phase-specific values. Their shared patterns do not need an explicit source separator. Full destructured parameter/receiver grammar and refutable dispatch remain open; ordinary binding examples do not promise that arbitrary selective patterns are accepted there.
- Assignment `target = value` updates an existing permitted target. Neither := nor == replaces it, and destructuring assignment still needs its own contract.

Loop receiver slots now require irrefutable binding. The corresponding policy remains a recommendation for function parameters and completion/recovery receivers. Refutable selection can be expressed explicitly with if/match inside the function, loop, or handler. That preserves error handling and cleanup requirements without introducing an implicit mismatch path.

### Tag-only omission is selected

The fourth condition, `if .Some := find_user_age(id)`, tests the case without binding its payload. The corresponding match arm is `.Some { report_found() }`. Both use the selected rule: omit the entire payload-pattern list to test the case tag only. The same meaning applies to any payload-bearing enum case and nested case patterns. Partial payload lists, empty-parentheses behavior, and construction arity are not selected by this omission rule; see [tag-only patterns](enums-and-variants.md#tag-only-patterns).

This tag-only form introduces no binding, whereas .Some(_) introduces the ordinary readable _. Neither pattern implicitly unwraps a stored Result, propagates a failure, or grants mutation access. Loop receiver patterns must be irrefutable; other receiver mismatch and enum/metadata collision policies remain separate open questions.

## 1. Ordinary declarations

```text
(left, right) := pair;
```

Current direction requires an irrefutable pattern for the known input type. A refutable declaration needs an explicitly defined failure contract; none is selected. Do not silently panic, skip initialization, or introduce an absent binding.

The [checked collection-operation proposal](checked-collection-operations.md) explores an explicit else handler on a fallible sequence binding, keeping successful names at the surrounding scope. This would add a failure contract rather than make ordinary stored values implicitly become Results. The existing if/match selection forms remain valid; no general refutable-declaration grammar is selected yet.

An annotation in ordinary destructuring constrains a statically valid declaration; it does not secretly turn the declaration into a runtime filter. Use conditional matching when failure is expected. The ordinary declaration's final result remains Unit.

## 2. Conditional selection

```text
if .Some(user) := find_user(id) {
    greet_user(user)
} else {
    report_missing()
}
```

Refutable matching is selected. A successful whole pattern introduces its new bindings only in the matched branch. Mismatch selects the next branch or completes the action conditional without entering its body. The source resolves before shadow bindings and is evaluated once for that condition.

An existing-name type test, `if person: User`, narrows the existing value instead of declaring a name. It needs stability rules; it is distinct from `if user: User = expression`. Literal/payload constraints test matching, not the Boolean value of a bound payload. `Some(false)` matches `Some(flag)`.

And chains can combine pattern matches and Boolean guards: successful bindings are available to subsequent operands and the successful body, with left-to-right short-circuiting. See [conditional pattern chains](condition-chains.md). Irrefutable conditional patterns, binding-producing or/not, negative flow, repeated chain names, and refinement after early exits remain open. A plain assignment is not a condition. Action/value result rules remain those of [conditionals](conditionals.md).

## 3. Match arms

```text
match value {
    .Some(item) { process(item) }
    .None { report_missing() }
}
```

The subject is evaluated once; arm bindings are local. Every match must be exhaustive, including action-only matching; ignored cases can use an explicit empty fallback `_ {}`. And-chained conditions and additional pattern matches are selected, with source-order first-success selection and no implicit fallthrough. A final else fallback and any explicit fallthrough feature remain unselected.

A mismatch allows later arms to be tried. The and conditions run after structural success and can reject the arm; see [match arm chains](match-guards.md). Do not commit an ownership move that prevents trying the next arm after a failed subpattern or guard; the full ownership model must make this precise. This is not a general promise to roll back side effects.

## 4. Loop receiver slots

```text
loop pairs as (left, right), count {
    process(left, right, count)
}
```

The item pattern receives the source element. Count and accumulator have distinct receiver slots; a tuple pattern does not acquire all loop metadata. Ordered shadowing applies both between slots and recursively within each slot's pattern, including ordinary `_` bindings; see [pattern shadowing](pattern-shadowing.md).

**Selected initial policy:** require each receiver pattern to be irrefutable for that slot's contract. Reject patterns that can fail for an admitted input. A receiver must not filter, stop the loop, panic, or introduce an error on mismatch. Explicit matching inside the body expresses selection. [Deferred alternatives](loop-pattern-alternatives.md) preserve filtering, adapters, termination, per-item mismatch branches, recoverable failure, and assertions for later consideration.

Likewise, matching Some(acc) directly against an Option accumulator that admits None is rejected; receive the whole optional state and inspect it in the body. This applies to item, count, and accumulator slots in all loop modes. Loop-source patterns are a separate question: the current grammar selects Boolean or iterable sources, not a pattern-binding condition. Do not assume `loop Some(item) := next()` is accepted because the analogous if form exists.

## 5. Function and closure parameters

Destructured parameters are part of the intended shared-pattern direction; their complete surface grammar remains open.

**Recommendation:** require parameter patterns to be irrefutable under the declared parameter contract. Do not add implicit runtime overload dispatch, skipped calls, panics, or recoverable error types through parameter syntax. A function accepting a broader union can use if or match in its body, or expose an explicitly fallible validation API.

An affected parameter still requires mut for writable access. Pattern inference does not create access capabilities, and whole-value/component names cannot duplicate ownership. Return and propagation targets remain the nearest function/closure, regardless of patterns in its parameter list.

## 6. Result recovery receivers

```text
value := operation() else(error) {
    recover(error)
}
```

The receiver gets the failed outcome's error payload, not the whole Result or its successful payload. Omitting the receiver introduces no implicit name. These are selected recovery rules.

**Recommendation:** ordinary error receivers bind irrefutably. A future selective error pattern needs explicit handling or propagation of every unmatched error; do not swallow it or convert it into successful Unit. A broad error union can already be matched inside the handler. A receiver type constraint that excludes some declared errors cannot be treated as an exhaustive handler merely because one block was written.

Success/failure distinction remains explicit for a stored Result even when success and error payload types overlap. Use the selected lowercase .ok(value) and .err(error) patterns; tag-only .ok and .err are also available. A recovery receiver already receives only the error payload, so it does not match another outer .err unless that payload itself is a Result.

An ordinary fallible call remains Result data in a match or conditional source too. Matching must not silently unwrap it: use explicit extraction, recovery, or an outcome pattern before testing its successful payload. For example, `if user: User = load_user(id)!` explicitly propagates failure; omitting the bang must not gain the same behavior through matching.

## 7. Completion-hook receivers

**Loop update, 2026-10-19:** loop completion no longer takes a receiver pattern. Use then { ... } with .count/.acc from the owning loop context and ordinary tail-expression semantics. The receiver/mismatch and action-only proposals below are historical for loops; they remain exploration material for other hooks. See [current loop completion](loop-completion.md).

then, loop else, and finally receive different phase-specific inputs. Matching must be checked against that actual input; an empty loop cannot supply an invented accumulator value, and cleanup on an abrupt exit is not an ordinary successful result.

**Recommendation:** use irrefutable receiver binding and explicit if/match inside a hook initially. Repeated typed clauses remain exploratory. Before selecting them, define dispatch versus transformation pipelines, ordering, coverage, unmatched input behavior, cleanup guarantees, and compatibility of transformed results.

The loop-hook proposal that receiver omission means action behavior does not apply to Result recovery; recovery without a receiver still supplies its fallback value.

## 8. Assignment, captures, and other declaration lists

Destructuring assignment would update existing targets rather than introduce bindings. It is not implied by declaration destructuring and is not yet selected. Define var/mut permissions, overlapping targets, target-selection order, and behavior if later matching or writes fail before permitting tuple assignment syntax.

Closure capture lists, imports, type/member declarations, and tag declarations do not automatically gain arbitrary pattern matching. They introduce different kinds of names or capabilities; each needs an explicit grammar and contract. Patterns do not change ordinary source evaluation order or cross function control-flow boundaries.

## Review findings and decisions to settle first

1. **Binding versus testing an existing value: settled base forms.** Bind with name, type-match with `: Type`, and value-match with `== expected`. A typed binding `name: Type` combines binding and type matching. Bare names remain bindings independent of imports or capitalization; `.None` selects the absent Option case. Full expression boundaries, constructor/field composition, and equality effects still need contracts; see [pattern primitives](pattern-bindings-and-tests.md).
2. **Colon grammar.** Typed binding, a whole-value nested pattern, tuple-type annotation, and record field labels can collide. Set their productions together before finalizing `y: (a, b: str, c)`; whitespace and capitalization cannot disambiguate them.
3. **Mismatch outside selection.** Loop slots now require irrefutable patterns with selection inside the body. Adopt or revise the corresponding recommendation for parameters and completion/recovery receivers separately. Do not infer hidden filtering, unchecked unwrap, or extra error channels.
4. **Flow and capabilities.** Define when reassignment/alias mutation invalidates narrowing, when component relationships survive extraction, and how whole/component bindings share access. Current input projection preserves composite alternatives; arbitrary later cross-binding narrowing is still open.
5. **Names within one pattern: settled.** Repeated bindings such as `(x, x)` and `(_, _)` shadow in recursive written order. The final binding of each name is visible after success; `_` is readable and explicitly allowed to be unused. The former recommendation to reject duplicates is superseded. Rebinding across separate and operands is still open. Named-field aliases remain useful for preserving access to both values; `field as localName` is a candidate, not selected syntax. See [pattern shadowing](pattern-shadowing.md) and [pattern aliases](pattern-aliases.md).
6. **Ordered tests and effects.** Specify subpattern and guard evaluation order, getter/custom equality effects, and ownership commitment. Subject-once evaluation does not specify every subsequent comparison or field access.
7. **Coverage and diagnostics.** Every match now requires complete coverage, with explicit empty ignore arms available. Complete coverage proofs, optional else fallback syntax, overlap, and impossible/always-matching diagnostics. Preserve closed-alternative precision without assuming the compiler can decide arbitrary Boolean guards.
8. **Leading dot.** Resolve inferred enum cases against metadata `.field`; no outward context search, no case-owner search across unrelated enums, and no silent type-driven reinterpretation of existing metadata. The collision policy remains a proposal.

The syntax is promising, but these are specification gaps. No parser or soundness/completeness claim follows from the examples.

## Reference-language comparison

- Rust reuses patterns across declarations, parameters, match, and loops; iterator-loop receivers are irrefutable. This supports separating common pattern vocabulary from mismatch policy. [Rust patterns](https://doc.rust-lang.org/reference/patterns.html), [Rust iterator loops](https://doc.rust-lang.org/reference/expressions/loop-expr.html#iterator-loops).
- Dart supports patterns in declarations, assignments, if/switch cases, and loops. Assignment patterns demonstrate why binding and updating existing names need different contexts. It also distinguishes an arm guard from an if inside the selected body. [Dart pattern contexts](https://dart.dev/language/patterns#places-patterns-can-appear).
- Kotlin destructuring uses component operations and can appear in loops and lambda parameters. Such operator/getter-based extraction has effects to specify; LiteScript has not selected arbitrary component calls as its destructuring mechanism. [Kotlin destructuring](https://kotlinlang.org/docs/destructuring-declarations.html).
- Zig's optional/error conditional captures make absence or failure explicit; that does not imply every loop or function receiver is a filtering pattern. [Zig if](https://ziglang.org/documentation/master/#if), [Zig for](https://ziglang.org/documentation/master/#for).
- V and Swift provide contextual enum-case precedents, while Odin provides explicit switch/type-switch receivers; none settles LiteScript's combined syntax. The broader [pattern syntax comparison](pattern-syntax-comparison.md) records those references and distinctions.

## Related concepts

- [Declarations](declarations-and-assignment.md), [functions](functions.md), and [loop receivers](loop-receivers.md).
- [Receiver clauses](receiver-clauses.md), [recovery](recovery-and-fallbacks.md), and [type tests](type-tests-and-narrowing.md).
