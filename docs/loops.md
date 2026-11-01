# Loops

Status: **one keyword, three source modes, one optional item name, and metadata-only state selected; optional leading and/or on unparenthesized Boolean sources selected 2026-10-24; full protocol/inference contracts open**.

Normative page: loop forms, source modes, item naming, and the metadata surface. [Loop value](loop-value.md) owns `.value` type/initialization/commit rules; [loop completion](loop-completion.md) owns `then` and targeted exits; [loop type inference](loop-type-inference.md) owns body/result inference; [last item](loop-last-item.md) owns completion-time item state. See the [normative page map](normative-pages.md).

Implementation coverage, 2026-10-30: the [experimental igniter](../igniter/README.md#action-loops)
now runs Boolean-condition and unconditional loops as actions, with bare nearest-
loop break/continue. Bodies are scoped and condition reads are repeated before
entry. Value-producing loops, metadata, iterables, tags, payload exits, header
transfers and completion/cleanup hooks remain unsupported. This implements a
bounded effect-only use of the rules below without changing their value contract.

The approved **2026-10-31** [fixed-array increment](../igniter/README.md#fixed-arrays-and-traversal)
adds action traversal of the supported array values, with source-once evaluation,
positional order and an optional fixed as item binding. Body/item scopes are
fresh on each entry; bare continue advances and break stops the nearest loop.
Whole-source variable replacement does not retarget that evaluated traversal.
General iterables, metadata, named Boolean/unconditional receivers, loop values
and completion/cleanup remain unimplemented; no new always-Unit loop contract
is selected. See [INV-054](../investigations/INV-054-fvp-fixed-arrays.md).

Implementation coverage, 2026-11-01: the igniter now implements typed loop
`.value` and one receiverless `then`. `.value` starts at `zero(T)`; a normally
completing body tail commits it, plain continue and bare break preserve it, and
without `then` the loop result is the final `.value`. `then` receives the final
`.value` and `.count` and its tail is the result. Action loops without `then`
remain Unit and commit nothing. Tags, `@name.value`, payload exits, targeted
return/break, `.item`/`.index` in `then`, `.count` in bodies, and noncontributing
partial-conditional tails remain unimplemented. See [loop value](loop-value.md)
and [loop completion](loop-completion.md).

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

A Boolean source may use the selected optional leading and/or without parentheses:

```text
loop
    and running
    and remaining > 0
{
    process_next()
}
```

Assume running is Bool, remaining is Int, and process_next returns Unit and may update the state read by the source. Removing the leading and gives exactly the same reevaluated, short-circuit Boolean source. The loop keyword and body-opening brace establish the header boundaries; line breaks do not. A bare leader is not an omitted source, and an iterable cannot be coerced into this Bool expression. No pattern bindings or additional metadata are introduced. See [leading Boolean loop sources](leading-separators.md#boolean-loop-sources), selected 2026-10-24.

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
- .index: zero-based traversal position for sources that provide positional traversal, not original source index/key. Ordered arrays, lists, and slices provide it; a unique set or other nonpositional iterable does not expose `.index`. Body positions begin at 0 even for an explicit reverse or stepped source.
- .count: number of entered iterations. It starts at zero before the first check, is one-based in the body, includes skipped entries, and remains readable in completion.
- .value: last committed body result of static type T, initialized to T's language-defined all-zero value. A completed tail expression, continue value, or break value commits; plain continue and bare break preserve it.

During an active iteration, `.item` and, for positional sources, `.index` describe that entry. In `then`, they describe the last entered iteration when one exists. If no body was entered, `then` exposes a type-directed zero placeholder for `.item`; for positional sources `.index` is `0`, while nonpositional sources have no `.index`. `.count == 0` distinguishes empty completion from an actual first entry. These fields are not available in source/condition evaluation before an entry. Count and value are available before the first condition, in the body, and in `then`. Retain last-item state only when completion observably uses it. See [empty-loop metadata](loop-last-item.md#zero-iteration-placeholders), [loop value](loop-value.md) for zero rules, and [continuity](continuity-and-analogy.md#similar-input-different-capabilities) for the capability boundary.

See [last-item/index access](loop-last-item.md) for zero/empty behavior and field-sensitive retention.

For loops, leading-dot access uses the loop context without searching outward; inside a conditional, use an explicit loop tag for loop metadata. A conditional's `.value` requires its own explicit tag and is readable only in its attached `then`; ambiguous leading-dot metadata reads are rejected. Named @tag access selects a lexical context explicitly. No implicit ordinary variables or dynamically allocated tag objects are required.

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

Index counts traversal position for positional sources; nonpositional sources do not expose it. Reversal/step do not turn it into an original source index. Reversal must respect source capabilities rather than silently buffering an arbitrary stream. Zero stride needs a defined rejection rule.

## Recovery and cleanup

Operation-local recovery remains available inside bodies. Returned Results still require explicit handling/propagation. External whole-loop error handlers are retired; body-wide recovery/cleanup, defer, and resource-management syntax remain [deferred](deferred-cleanup-and-resources.md). `then` is normal result processing, not cleanup; an attached construct-level `finally` runs afterward and does not replace the loop result.

Related: [full examples](loop-examples.md), [item naming](loop-receivers.md), [loop value](loop-value.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), [exits](control-flow.md), and [historical accumulator](loop-accumulator.md).
