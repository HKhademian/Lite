# Loop accumulator

Status: **contribution model and optional previous state established direction; complete type equations open**.

## Purpose

Let a body produce an iteration contribution, preserve previous contributions when skipping, and support collection/aggregation without mandatory mutable outer variables.

## State model

For iteration contribution type `T`, an unseeded accumulator is `Option<T>`:

- `None` before any contribution.
- `Some(value)` after the most recent contribution.
- Unchanged after plain `continue` or bare `break`.

The body sees the previous state. A normal tail value is committed after the body completes and before the next condition check.

## Example

```text
sum := loop numbers as number, _, prev {
    prev.value_or(0) + number
} then(result) {
    result.value_or(0)
};
```

The proposed helper `value_or(0)` explicitly supplies an additive seed for the first contribution. The compiler does not invent zero as a universal empty-loop value.

Tagged access expresses the same state:

```text
sum := @sum loop numbers as number {
    .acc.value_or(0) + number
} then(result) {
    result.value_or(0)
};
```

## Skipped contributions

```text
last := loop numbers as number {
    if not eligible(number) {
        continue
    };

    number
} then(result) {
    result.value_or(0)
};
```

For conceptual contributions `10, skip, 30, skip`, the final stored contribution is `30`. If every iteration skips, no contribution exists. Skipping the last body entry does not erase an earlier contribution.

Skipping affects only contribution state. It does not undo consumed input, output, mutation, or other effects performed before the skip.

## Early contribution

`continue value` was proposed to contribute early and move to the next iteration. Plain `continue` needs no fabricated value. The payload must match the iteration contribution type, not necessarily the final loop result type.

## Two distinct types

The iteration body may produce `T`, while completion processing produces a different whole-loop result `R`. Internal `Option<T>` state is not automatically identical to `R`.

This matters for the requested search form:

```text
found := @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
};
```

The body normally completes with `Unit`, but the whole loop is intended to produce `Option<User>`, with `None` on exhaustion. A sound design must formalize this targeted implicit completion without treating `Unit` as a user value or silently returning `Some(Unit)`.

## Explicit seed

Explicit seeded receivers were requested and several earlier header forms illustrated them. Their current spelling is not settled. A seed must be initialized once before any condition references it. It must also be decided whether seed presence and body-contribution presence are tracked separately, especially when selecting `else`.

## Open contracts

- Whether `Unit` is an ordinary contribution in all loop modes.
- How `T` and `R` are inferred when only targeted exits produce data.
- Exact normal-completion behavior without `then`.
- How an explicit seed affects `else` eligibility.
- Ownership, replacement cleanup, and borrowing of previous contributions.

## Related concepts and references

- [Loop completion](loop-completion.md)
- [Control-flow exits](control-flow.md)
- [Option](option.md)
- This contribution model is an original design proposal. [Rust loops](https://doc.rust-lang.org/reference/expressions/loop-expr.html) provide a comparison for explicit loop exits, not this accumulator contract.
