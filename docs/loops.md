# Loops

Status: **one keyword, three source modes, one optional item name, and metadata-only state selected; full protocol/inference contracts open, updated 2026-10-19**.

## Template

```text
[@tag] loop [source] [as item_name] {
    body
} [then { completion_body }]
```

Brackets are optional grammar notation, not literal characters. As is provisional spelling for one optional item identifier. There are no positional receiver lists or completion receivers. Destructure/select inside the body. See [item naming](loop-receivers.md).

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

- .item: current source element. An optional item name denotes this same value.
- .index: zero-based iteration position, not original source index/key. Body positions begin at 0 even for a reversed or stepped source.
- .count: number of entered iterations. It starts at zero before the first check, is one-based in the body, includes skipped entries, and remains readable in completion.
- .value: last committed body result of static type T, initialized to T's language-defined all-zero value. A completed tail expression or continue value commits; plain continue and break preserve it.

Item requires an active iteration. Index availability in conditions/completion remains a phase question; empty sources must not invent a last item/index. Unit as the item payload for Boolean/unconditional sources remains a proposal. See [loop value](loop-value.md) for inference and universal zero rules.

Leading-dot access uses only the current construct; named @tag access selects a lexical context explicitly. No implicit ordinary variables or dynamically allocated tag objects are required.

## Normal result and completion

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

Then shares the owning loop context, tagged or untagged. Its tail expression produces the final result; then {} produces Unit. The working result direction without then is the final .value, including initialized zero for an empty/all-skipped loop. Complete inference remains open. See [completion](loop-completion.md).

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
