# Match arm guards and condition chains

Status: **pattern-if guard separator selected on 2026-10-23; Boolean tests and additional pattern matches retain selected left-to-right and chains; alternatives, mutation effects, and ownership details open**.

This page describes subject-based pattern arms. The selected [subjectless match](match.md#subjectless-boolean-selection-selected) instead uses ordinary Boolean headers directly, without a separate pattern or an additional if separator.

## Purpose and template

After matching the arm's subject pattern, test conditions or match additional values using the names already unpacked. The same left-to-right rules apply as in conditional pattern chains.

```text
pattern if condition_operand and condition_operand { body }
```

The initial pattern matches the match subject. An optional if introduces the guard; its operands are Bool tests, existing-name type tests where valid, or explicit pattern bindings of another expression. Further guard operands use and, with the same left-to-right scope and short-circuit rules as conditional chains. A guard may contain just one operand. No as marker is needed to introduce the arm binding.

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

Every reached operand runs once, in source order, until false or mismatch. A successful additional pattern extends the bindings available to later operands and this body. The initial pattern is applied to the original subject; `Some(profile) := ...` explicitly identifies another source rather than silently rematching the original Option<User>.

Underscore-prefixed bindings can leave positional components unused in additional matches, such as `and (_, last: String) := user.name_parts`. `_` is an ordinary readable binding; repeated names shadow in pattern order. Later operands may read the final visible binding of each name. See [underscore bindings and skips](wildcards-and-skips.md).

Nested destructuring also works directly in that chain, for example `and (first, last: String) := user.name_parts`, assuming a suitable tuple-valued field. Alternatively a structural pattern such as `Some((first: String, last: String))` can match an optional tuple in one step. These reuse the same typed component patterns and inference rules; no nested match statement is required merely to extract or constrain components.

## Scope, failure, and result

- Try arms in source order; choose the first whose structural pattern and all additional operands succeed. Execute only its body, with no implicit fallthrough.
- Bindings are available only after their own successful match, to later operands and the selected body. They do not leak into later arms or following code. A binding source resolves before its new names are introduced.
- False or mismatch skips the rest of this arm's tests. Side effects already performed are not rolled back.
- Explicit return or Result propagation in an operand keeps its ordinary control-flow meaning; it is not converted into a false guard or a request to try another arm. Ordinary Results are not implicitly unwrapped by matching or guarding.
- The body's normal result must satisfy an expected result contract when present; otherwise normally completing arms infer a normalized plain union under selected [branch-result inference](branch-result-inference.md). Input binding inference remains a separate rule.
- A guarded pattern does not alone prove coverage of every value admitted by its structural pattern. Provide complete coverage where required; the exact coverage algorithm and action-match policy remain open.

## Remaining rules

The guard's and chain uses the same expression boundaries as [conditional pattern chains](condition-chains.md): grouping is required when logical operators belong inside a pattern's source value. Grouped Bool or operands introduce no extra pattern bindings. Binding-producing or/not, repeated names within a chain, alternative patterns in one arm, and custom field/equality effect contracts remain open.

The ownership model must permit later arms after a failed test or guard. Do not silently duplicate a noncopyable value or commit a move that makes that path invalid. Mutations that invalidate a refinement require explicit rules; these examples do not grant unrestricted writable aliases. The exact order and effect model of recursive structural extraction is separate from the selected left-to-right order of and operands.

The earlier `pattern and condition { ... }` arm separator is superseded. Use `pattern if condition { ... }`; and remains a separator between subsequent guard operands. The alternative as-name arm marker was considered but not selected. Ordinary conditional chains retain their existing syntax.

## References

- [Rust match guard chains](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards): guards can use earlier pattern bindings, chain additional pattern matches, and reject an arm. LiteScript selects if between an arm pattern and its guard, then reuses its existing condition-chain forms and and spelling; Rust's detailed ownership and alternative-pattern evaluation rules are not adopted wholesale.
- [Conditional chains](condition-chains.md), [match patterns](match-patterns.md), [pattern binding inference](pattern-binding-inference.md), and [match](match.md).
