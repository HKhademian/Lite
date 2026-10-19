# Loop value

Status: **typed, zero-initialized .value replaces the optional accumulator, selected by the user 2026-10-19; complete inference and lifetime contracts open**.

## Core rule

Every loop owns a .value with a compile-time type T inferred from the body's value-producing paths and any applicable expected type. It is initialized once to T's valid semantic zero before the first condition check. This is not an automatically inserted Option<T>, an untyped cell, or a request for raw zero bytes.

```text
sum := loop numbers as number {
    .value + number
}
```

For Int elements, addition constrains T to Int and its initial value is 0. A completed tail expression replaces .value; the next iteration sees that committed value. The working normal-result rule without then is the final .value, including its initialized zero when the loop produces nothing. Full inference, including expected-type propagation, remains to formalize.

## Updates and exits

- Normal body completion: commit the tail expression as the next T value.
- continue value: commit the explicitly supplied T value and advance; this early-value form remains the established working proposal.
- Plain continue: advance without changing .value.
- Bare break: stop without changing .value, then run normal completion processing.
- Return @loop result: supply the final construct result directly and bypass normal completion, as before.

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

## Zero is typed and valid

The existing [zero-initialization contract](zero-initialization.md) applies: numeric zero for numeric T, empty text for String, Unit for Unit, and recursively valid zeros for eligible records. Declared record field defaults are not used. If T itself is an Option, its semantic zero is .None; there is no extra Option wrapper around it.

A type with no valid semantic zero cannot silently acquire one. Required references, resources, nonzero domains, enums/unions without a chosen valid zero, and records containing such fields retain their existing restrictions. An explicit seed or alternative initialization mechanism would need a later design; none is selected here. A generic loop that requires this initialization also needs a future zeroability contract.

Zero initialization needs a known T. Reading .value does not establish T by itself, and the compiler must not guess an arbitrary type or union case. Ordinary annotations in the body or an applicable result annotation can provide missing constraints. This is a compile-time typing problem, not a runtime missing-value case.

## Completion and result types

```text
text := loop numbers as number {
    .value + number
} then {
    format_total(.value)
}
```

Assume format_total maps Int to String. The body's .value remains Int while then computes a String result. The final construct result is not readable from .value before then has computed it. Then uses ordinary tail-expression semantics; then {} returns Unit.

Action-only bodies produce Unit. A final assignment also produces Unit: an earlier calculation must not secretly remain the body's contribution. All committed paths must satisfy T's typing contract.

For an empty or all-skipped Int-valued loop, .value remains 0. A loop that actually produced 0 has the same value. .count separates zero entries from entered iterations, but does not reveal whether any entry committed a value. If that distinction is needed, explicit state or a future documented metadata field is required; no hidden Option/discriminator is promised by this change.

## Open contracts

- Full inference for circular .value uses, action paths, and loops with only targeted exits.
- Exact no-then result typing and optional-search inference.
- Explicit nonzero seeds and zeroability constraints for generics.
- Ownership, replacement cleanup, moves, and borrowing of .value across iterations/completion.
- Any future contribution-count or completion-reason metadata.

Related: [loops](loops.md), [optional item name](loop-receivers.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), and [examples](loop-examples.md).
