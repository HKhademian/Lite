# Loop receiver selection: decision and deferred alternatives

Status: **selection inside the loop body is selected for now; filtering headers and other receiver-mismatch behaviors are deferred**.

**Latest loop update, 2026-10-19:** header receiver lists/patterns, .acc, and automatic Option accumulator state shown below are historical. Current loops use one optional item name plus .item/.index/.count/.value metadata, with typed zero-initialized value. See [current loops](loops.md) and [loop value](loop-value.md).

## Selected form

Bind the current source item, then select explicitly inside the body:

```text
loop optional_users as candidate {
    if .Some(user) := candidate {
        greet(user)
    }
}
```

optional_users is the source collection, candidate is its current Option<User> item, and user is the payload bound only when Some matches. The source name does not silently change meaning. As is now selected for the single optional item name; the receiver-pattern forms below remain historical.

Match works in the same location and can explicitly skip a contribution:

```text
loop optional_users as candidate {
    match candidate {
        .Some(user) { greet(user) }
        .None { continue }
    }
}
```

Plain continue retains its existing no-contribution meaning. This example introduces no new loop result or completion rule.

## Historical header rule (retired)

The earlier receiver-list design required every loop receiver pattern to match every value admitted by its slot's input contract. A failing receiver could not silently skip items, stop iteration, panic, or add an error channel. That design and its item/count/accumulator slots are retired; current loop headers accept only an optional item identifier.

The historical syntax allowed irrefutable destructuring such as `loop pairs as (left, right)` when each item had the required tuple shape. It would have rejected the following form when the item was Option<User> and might be None:

```text
/* Rejected for a source that can yield None. */
loop optional_users as .Some(user) {
    greet(user)
}
```

The tag-only .Some form can also fail for Option input, so omitting the payload does not bypass this rule. An optional accumulator must likewise be received as its whole Option state and inspected explicitly. Refutability depends on the actual input contract, not just the presence of constructor or tuple punctuation.

## Deferred alternatives

These approaches preserve the discussion; none is selected syntax or an initial library requirement.

### 1. Automatic filtering through the receiver

Give the rejected header above a new meaning: mismatching items are skipped and matching payloads enter the body. This is concise but makes receiver changes affect iteration selection. A future explicit filtering marker would need its own grammar rather than silently changing ordinary receiver behavior.

### 2. A source adapter

```text
/* Deferred library sketch, not a selected API. */
loop optional_users.present() as user {
    greet(user)
}
```

The adapter would yield contained users and omit None, leaving the ordinary receiver irrefutable. This fits source composition, but present is only a candidate name. Laziness, ownership, fallible advancement, and representation need contracts before adopting such an API.

### 3. Stop at the first mismatch

Finish iteration when a receiver fails, rather than skipping that item. This resembles a take-while source operation and is observably different from filtering. A future design must specify whether the first mismatching source item has been consumed. Explicit selection and break inside the body already express early termination without changing receiver meaning.

### 4. A per-item mismatch branch

Run an alternative body for each item that fails to match. The current loop else is a completion clause, not a per-item handler; reusing its spelling would require an unambiguous new attachment rule. An inner if/else or match already expresses both paths.

### 5. A recoverable mismatch error

Abort with a declared typed error instead of skipping or terminating normally. This would require a defined error type, caller handling/propagation, and result inference. Receiver syntax must not add that channel implicitly. Validation inside the body can use the existing explicit error model.

### 6. An explicit invariant assertion

Treat mismatch as a programming fault under a separately requested assertion contract. No panic-producing receiver marker is selected, and postfix ! already means recoverable Result propagation. Panics must remain on their distinct path.

## Questions before revisiting these alternatives

- Count examined source items or body entries? Current body selection does not prevent body entry; any new filtering behavior must specify its counting effect.
- Does mismatch contribute to or preserve the accumulator? Do not infer this from missing payload bindings.
- How do empty/nonempty completion hooks behave when a nonempty source yields no accepted items?
- When are source items consumed, borrowed, moved, or destroyed?
- Which patterns may perform fallible or effectful comparisons, and how are their outcomes handled?

## Related concepts

- [Loop receivers](loop-receivers.md), [pattern contexts](pattern-contexts.md#4-loop-receiver-slots), and [collections and iterators](collections-and-iterators.md).
- [Loop accumulator](loop-accumulator.md), [completion](loop-completion.md), [control-flow exits](control-flow.md), and [panics](panics.md).
