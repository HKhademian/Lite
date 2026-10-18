# Match arm condition chains

Status: **and-chained Boolean tests and additional pattern matches selected; alternatives, mutation effects, and ownership details open**.

## Purpose and template

After matching the arm's subject pattern, test conditions or match additional values using the names already unpacked. The same left-to-right rules apply as in conditional pattern chains.

```text
pattern and condition_operand and condition_operand { body }
```

The initial pattern matches the match subject. Later operands are Bool tests, existing-name type tests where valid, or explicit pattern bindings of another expression. There is no separate if, when, or where separator.

## Boolean guard example

```text
match find_user(id) {
    Some(user) and user.age > 14 { greet(user) }
    Some(user) { report_too_young(user) }
    None { report_missing() }
}
```

Assume the calls produce Unit and find_user returns Option<User>. The source call runs once. The age check runs only after Some matches. A false age check rejects that arm and permits the later Some arm to handle the same subject. An if placed inside an already selected body would not have that behavior.

## Match additional unpacked data

```text
match find_user(id) {
    Some(user)
        and user.age > 14
        and Some(profile) := find_profile(user.id)
        and profile.visible {
        greet(user, profile)
    }
    Some(user) { report_ineligible(user) }
    None { report_missing() }
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
- The body's normal result obeys the existing compatible-arm result contract. Binding inference may preserve unions without introducing automatic unions of unrelated arm results.
- A guarded pattern does not alone prove coverage of every value admitted by its structural pattern. Provide complete coverage where required; the exact coverage algorithm and action-match policy remain open.

## Remaining rules

The and chain uses the same expression boundaries as [conditional pattern chains](condition-chains.md): grouping is required when logical operators belong inside a pattern's source value. Grouped Bool or operands introduce no extra pattern bindings. Binding-producing or/not, repeated names within a chain, alternative patterns in one arm, and custom field/equality effect contracts remain open.

The ownership model must permit later arms after a failed test or guard. Do not silently duplicate a noncopyable value or commit a move that makes that path invalid. Mutations that invalidate a refinement require explicit rules; these examples do not grant unrestricted writable aliases. The exact order and effect model of recursive structural extraction is separate from the selected left-to-right order of and operands.

The earlier `pattern if condition { ... }` LiteScript guard candidate is superseded. No second spelling is selected.

## References

- [Rust match guard chains](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards): guards can use earlier pattern bindings, chain additional pattern matches, and reject an arm. LiteScript reuses and instead of introducing Rust's if/let/&& punctuation; Rust's detailed ownership and alternative-pattern evaluation rules are not adopted wholesale.
- [Conditional chains](condition-chains.md), [match patterns](match-patterns.md), [pattern binding inference](pattern-binding-inference.md), and [match](match.md).
