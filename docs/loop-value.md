# Loop value

Status: **typed, universally zero-initialized .value replaces the optional accumulator, selected by the user 2026-10-19; complete inference and lifetime contracts open**.

Normative page for `.value` type, initialization, and commit rules. Loop forms are in [loops](loops.md); completion is in [loop completion](loop-completion.md); inference is in [loop type inference](loop-type-inference.md).

Implementation checkpoint, 2026-11-01: the igniter implements a typed `.value`
for value-producing loops and loops with `then`. It is zero-initialized before
the first condition check. A normally completing body commits its tail value;
plain `continue` and bare `break` preserve the committed value. Without `then`,
the loop result is the final `.value`. Type `T` comes from an expected
destination (typed declaration, assignment, return or function result), from a
named sequence source's element type when the body reads `.value`, or otherwise
from the body tail. Reading `.value` in a body with none of those sources is an
error rather than a guess. Action loops without `then` keep `Unit` and commit
nothing. `break`/`continue` payloads, tagged loops, targeted exits,
`return @loop`, `.item`/`.index` in `then`, `.count` in the body, and
noncontributing conditional body tails remain unimplemented.

## Core rule

Every loop owns a .value with a compile-time type T inferred from the body's value-producing paths and any applicable expected type. It is initialized once to T's language-defined all-zero value before the first condition check. All-zero storage must map to a valid T value. This is not an automatically inserted Option<T> or an untyped cell.

```text
sum := loop numbers as number {
    .value + number
}
```

For Int elements with no different expected type, addition constrains T to Int and its initial value is 0. A completed tail expression replaces .value; the next iteration sees that committed value. The selected normal-result rule without then is final .value, including its initialized zero when the loop produces nothing. Destination-side expected types also constrain T, as explicitly selected by the user; see [bidirectional loop inference](loop-type-inference.md).

## Updates and exits

- Normal body completion: commit the tail expression as the next T value.
- continue value: commit the explicitly supplied T value and advance; this early-value form is selected.
- Plain continue: advance without changing .value.
- Bare break: stop without changing .value, then run normal completion processing.
- Break value: commit a T value, stop the nearest loop, and run then if present. Without then, the committed .value is the result.
- Break @loop [value]: the same targeted stop-and-complete operation. Without a payload it preserves .value; with a payload it commits T before stopping the named loop.
- Return @loop result: commit the payload as T and stop the named loop. Its `then` runs to produce R if present; without `then`, T is the result. Any inner constructs exited on the way skip their own `then` blocks.

The old acc/previous receiver slots and .acc field are retired. .value is loop-owned read-only metadata; these rules describe its internal commits, not a new permission to assign to metadata.

```text
sum := @total loop numbers as number {
    if number < 0 { continue; }
    if number == 100 { break; }
    @total.value + number
} then {
    print(.count);
    .value
}
```

Count includes skipped entries. A skipped final entry does not erase an earlier value. Skipping does not roll back effects or consumed source items.

## Zero is universal and typed

The user explicitly requires [all-zero storage to be a valid value of every type](zero-initialization.md), including functions, references, enums, and unions. The earlier zeroability restriction is superseded. The implementation must define meaningful representations/operations for these zeros, not turn them into invalid values.

For ordinary numeric T this gives 0, for String empty text, for Unit its unique `Unit` value, and for records recursively zeroed fields without declared defaults. Since Unit has one inhabitant, `zero(Unit) == Unit`; the user proposes that its physical representation has zero size, requiring no stored bytes. If T is Option, its zero is .None; there is no extra Option wrapper. Exact mappings for special types remain to design under the universal requirement. Explicit nonzero initialization is separate future work, not a requirement just to admit a type into a loop.

Zero initialization still needs a known T. A .value-only body can be typed from its destination, such as x: Long = loop source { .value }. Without a destination hint or another independent constraint, reading .value alone does not establish T; the compiler must not guess a type or union member. Representation mapping is type-directed, not an arbitrary runtime default choice.

A `.value`-only body is a circular value-producing path, so the no-contributor `Unit` default does not resolve it. By contrast, a body whose reachable paths only use plain `continue` or bare `break` has no value-producing path; its `T` defaults to `Unit` unless an expected type reaches `T` through the loop result or a `.value` read in `then`.

## Completion and result types

```text
text := loop numbers as number {
    .value + number
} then {
    format_total(.value)
}
```

Assume format_total maps Int to String. The body's .value remains Int while then computes a String result. The final construct result is not readable from .value before then has computed it. Then uses ordinary tail-expression semantics; then {} returns Unit.

Action-only bodies produce Unit. A final assignment also produces Unit: an earlier calculation must not secretly remain the body's contribution. All committed paths must satisfy T's typing contract. When T is Unit, `.value` starts as the unique `Unit` value. A body that completes with Unit commits that same value; plain `continue` and bare `break` still take noncontributing control-flow paths, although `.value` looks identical afterward. `.count` measures entered iterations, not commits.

For an empty or all-skipped Int-valued loop, .value remains 0. A loop that actually produced 0 has the same value. .count separates zero entries from entered iterations, but does not reveal whether any entry committed a value. If that distinction is needed, explicit state or a future documented metadata field is required; no hidden Option/discriminator is promised by this change.

## Open contracts

- Full inference for circular .value uses, action paths, and loops with only targeted exits. When no path contributes and nothing else constrains T, T defaults to Unit; an expected type can override it.
- Complete typing algorithms for the selected no-then .value result and optional-search inference.
- Explicit nonzero seeds and complete generic/result inference under universal zero initialization.
- Ownership, replacement cleanup, moves, and borrowing of .value across iterations/completion.
- Any future contribution-count or completion-reason metadata.

Related: [loops](loops.md), [optional item name](loop-receivers.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), and [examples](loop-examples.md).
