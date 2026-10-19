# Loops

Status: **one keyword, three source modes, one optional item name, and metadata-only state selected; full protocol/inference contracts open, updated 2026-10-19**.

## Template

```text
[@tag] loop [source] [as item_name] {
    body
} [then { completion_body }]
```

Brackets are optional grammar notation, not literal characters. As is the selected spelling for one optional item identifier. There are no positional receiver lists or completion receivers. Destructure/select inside the body. See [item naming](loop-receivers.md).

## Source modes

### Iterable

```text
loop users as user {
    greet(user);
}

loop users {
    greet(.item);
}
```

Evaluate the source expression once, obtain its iterator, and advance for each entry.

### Boolean condition

```text
@attempts loop @attempts.count < 10 {
    attempt();
}
```

A statically Boolean source is reevaluated before each body entry. A Boolean/iterable union has no specified loop meaning. Count and the typed zero-initialized value exist before the first check:

```text
total := @bounded loop @bounded.count < 10 and @bounded.value < 30 {
    @bounded.value + @bounded.count
}
```

The numeric body establishes the loop value type; complete circular/expected-type inference remains to formalize.

### Unconditional

```text
loop {
    work();
    if finished() { break; }
}
```

An omitted source means unconditional iteration. There is no while keyword, required loop if header, or trailing/post-tested loop condition. Put a post-work check inside the body.

## Context state

- .item: current source element in iterable mode, and `Unit` in Boolean or unconditional mode. If the loop enters no body, `.item` in `then` is the type-directed zero for that mode: zero of the iterable element type, or `Unit` for a source-less loop.
- .index: zero-based iteration position, not original source index/key. Body positions begin at 0 even for a reversed or stepped source.
- .count: number of entered iterations. It starts at zero before the first check, is one-based in the body, includes skipped entries, and remains readable in completion.
- .value: last committed body result of static type T, initialized to T's language-defined all-zero value. A completed tail expression, continue value, or break value commits; plain continue and bare break preserve it.

During an active iteration, `.item` and `.index` describe that entry. In `then`, they describe the last entered iteration when one exists. If no body was entered, `then` exposes a type-directed zero placeholder for `.item` and index `0`; `.count == 0` distinguishes those placeholders from an actual first entry. These fields are not available in source/condition evaluation before an entry. Count and value are available before the first condition, in the body, and in `then`. Retain last-item state only when completion observably uses it. See [empty-loop metadata](loop-last-item.md#zero-iteration-placeholders) and [loop value](loop-value.md) for zero rules.

See [last-item/index access](loop-last-item.md) for zero/empty behavior and field-sensitive retention.

For loops, leading-dot access uses the loop context without searching outward; inside a conditional, use an explicit loop tag for loop metadata. Conditional metadata, if exposed, requires `@tag.field`, and ambiguous leading-dot metadata reads are rejected. Named @tag access selects a lexical context explicitly. No implicit ordinary variables or dynamically allocated tag objects are required.

## Normal result and completion

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

Then shares the owning loop context, tagged or untagged. Its tail expression produces the final result; then {} produces Unit. Without then, the selected normal result is final .value, including initialized zero for an empty/all-skipped loop. Complete inference remains open. See [completion](loop-completion.md).

## Direction and step

Direction/stride belong to sources and adapters, with provisional library spellings:

```text
loop 1..=10 as number { process(number); }
loop 10..=1 as number { process(number); }
loop (1..=10).step(2) as number { process(number); }
loop users.reverse() as user { greet(user); }
loop users.reverse().step(2) as user { greet(user); }
loop directory.keys() as key { process(key); }
loop directory.items() as entry {
    (key, value) := entry;
    process_entry(key, value);
}
```

Index counts traversal position; reversal/step do not turn it into an original source index. Reversal must respect source capabilities rather than silently buffering an arbitrary stream. Zero stride needs a defined rejection rule.

## Recovery and cleanup

Operation-local recovery remains available inside bodies. Returned Results still require explicit handling/propagation. External whole-loop error handlers are retired; body-wide recovery/cleanup, defer, and resource-management syntax remain [deferred](deferred-cleanup-and-resources.md). Then is normal completion processing, not an all-exit cleanup promise.

Related: [full examples](loop-examples.md), [item naming](loop-receivers.md), [loop value](loop-value.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), [exits](control-flow.md), and [historical accumulator](loop-accumulator.md).
