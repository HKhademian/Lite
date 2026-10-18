# Pattern contexts and mismatch behavior

Status: **review dated 2026-10-18; shared capabilities selected, several placement and failure policies still proposals**.

## Purpose

Use one composable pattern vocabulary across binding and selection contexts. The enclosing construct determines whether mismatch is permitted, what happens next, and where names exist. Sharing patterns does not imply identical failure behavior everywhere.

An **irrefutable** pattern matches every value admitted by its input contract. A **refutable** pattern can fail for some admitted value. Refutability depends on both the pattern and the input type: a typed tuple pattern can be irrefutable for a known matching tuple and refutable for a broader union.

The selected capabilities and typing rules are in [match patterns](match-patterns.md) and [pattern binding inference](pattern-binding-inference.md). The base operations are bind (`name`), type match (`: Type`), and value match (`== expected`). Whole-value colon patterns, rest capture details, and enum/metadata collision handling still have separate open decisions. The .case enum shorthand itself is selected.

Partially annotated patterns constrain their input and infer every binding from compatible possibilities as one type or a union. This does not change the separate compatible-result policy for if/match branch expressions.

## 1. Ordinary declarations

```text
(left, right) := pair;
```

Current direction requires an irrefutable pattern for the known input type. A refutable declaration needs an explicitly defined failure contract; none is selected. Do not silently panic, skip initialization, or introduce an absent binding.

An annotation in ordinary destructuring constrains a statically valid declaration; it does not secretly turn the declaration into a runtime filter. Use conditional matching when failure is expected. The ordinary declaration's final result remains Unit.

## 2. Conditional selection

```text
if Some(user) := find_user(id) {
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
    Some(item) { process(item) }
    .None { report_missing() }
}
```

The subject is evaluated once; arm bindings are local. Value selection over closed alternatives must be exhaustive. And-chained conditions and additional pattern matches are selected, with source-order first-success selection and no implicit fallthrough. A final else fallback, exhaustive action matches, and any explicit fallthrough feature remain unselected.

A mismatch allows later arms to be tried. The and conditions run after structural success and can reject the arm; see [match arm chains](match-guards.md). Do not commit an ownership move that prevents trying the next arm after a failed subpattern or guard; the full ownership model must make this precise. This is not a general promise to roll back side effects.

## 4. Loop receiver slots

```text
loop pairs as (left, right), count {
    process(left, right, count)
}
```

The item pattern receives the source element. Count and accumulator have distinct receiver slots; a tuple pattern does not acquire all loop metadata. Ordered shadowing applies both between slots and recursively within each slot's pattern, including ordinary `_` bindings; see [pattern shadowing](pattern-shadowing.md).

**Recommended initial policy:** require each receiver pattern to be irrefutable for that slot's contract. A refutable item pattern must not silently filter, stop the loop, panic, or produce an undeclared error. Explicit matching inside the body already expresses selection. A future filtering form or source adapter would need its own contract.

Likewise, matching `Some(acc)` directly against an Option accumulator requires a defined None path; receiver syntax alone must not make that state disappear. Loop-source patterns are a separate question: the current grammar selects Boolean or iterable sources, not a pattern-binding condition. Do not assume `loop Some(item) := next()` is accepted because the analogous if form exists.

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

Success/failure distinction must remain explicit for a stored Result when success and error payload types overlap. The named success-pattern spelling is still open.

An ordinary fallible call remains Result data in a match or conditional source too. Matching must not silently unwrap it: use explicit extraction, recovery, or an outcome pattern before testing its successful payload. For example, `if user: User = load_user(id)!` explicitly propagates failure; omitting the bang must not gain the same behavior through matching.

## 7. Completion-hook receivers

then, loop else, and finally receive different phase-specific inputs. Matching must be checked against that actual input; an empty loop cannot supply an invented accumulator value, and cleanup on an abrupt exit is not an ordinary successful result.

**Recommendation:** use irrefutable receiver binding and explicit if/match inside a hook initially. Repeated typed clauses remain exploratory. Before selecting them, define dispatch versus transformation pipelines, ordering, coverage, unmatched input behavior, cleanup guarantees, and compatibility of transformed results.

The loop-hook proposal that receiver omission means action behavior does not apply to Result recovery; recovery without a receiver still supplies its fallback value.

## 8. Assignment, captures, and other declaration lists

Destructuring assignment would update existing targets rather than introduce bindings. It is not implied by declaration destructuring and is not yet selected. Define var/mut permissions, overlapping targets, target-selection order, and behavior if later matching or writes fail before permitting tuple assignment syntax.

Closure capture lists, imports, type/member declarations, and tag declarations do not automatically gain arbitrary pattern matching. They introduce different kinds of names or capabilities; each needs an explicit grammar and contract. Patterns do not change ordinary source evaluation order or cross function control-flow boundaries.

## Review findings and decisions to settle first

1. **Binding versus testing an existing value: settled base forms.** Bind with name, type-match with `: Type`, and value-match with `== expected`. A typed binding `name: Type` combines binding and type matching. Bare names remain bindings independent of imports or capitalization; `.None` selects the absent Option case. Full expression boundaries, constructor/field composition, and equality effects still need contracts; see [pattern primitives](pattern-bindings-and-tests.md).
2. **Colon grammar.** Typed binding, a whole-value nested pattern, tuple-type annotation, and record field labels can collide. Set their productions together before finalizing `y: (a, b: str, c)`; whitespace and capitalization cannot disambiguate them.
3. **Mismatch outside selection.** Adopt or revise the irrefutable-default recommendation for loops, parameters, and receivers. Do not infer hidden filtering, unchecked unwrap, or extra error channels.
4. **Flow and capabilities.** Define when reassignment/alias mutation invalidates narrowing, when component relationships survive extraction, and how whole/component bindings share access. Current input projection preserves composite alternatives; arbitrary later cross-binding narrowing is still open.
5. **Names within one pattern: settled.** Repeated bindings such as `(x, x)` and `(_, _)` shadow in recursive written order. The final binding of each name is visible after success; `_` is readable and explicitly allowed to be unused. The former recommendation to reject duplicates is superseded. Rebinding across separate and operands is still open. Named-field aliases remain useful for preserving access to both values; `field as localName` is a candidate, not selected syntax. See [pattern shadowing](pattern-shadowing.md) and [pattern aliases](pattern-aliases.md).
6. **Ordered tests and effects.** Specify subpattern and guard evaluation order, getter/custom equality effects, and ownership commitment. Subject-once evaluation does not specify every subsequent comparison or field access.
7. **Coverage and diagnostics.** Set action-match coverage, fallback syntax, overlap, and impossible/always-matching diagnostics. Preserve closed-alternative precision without assuming the compiler can decide arbitrary Boolean guards.
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
