# Loops

Status: **one keyword, three source modes, one optional item name, and metadata-only state selected; optional leading and/or on unparenthesized Boolean sources selected 2026-10-24; full protocol/inference contracts open**.

Normative page: loop forms, source modes, item naming, and the metadata surface. [Loop value](lite://doc/loop-value) owns `.value` type/initialization/commit rules; [loop completion](lite://doc/loop-completion) owns `then` and targeted exits; [loop type inference](lite://doc/loop-type-inference) owns body/result inference; [last item](lite://doc/loop-last-item) owns completion-time item state. See the [normative page map](lite://doc/normative-pages).

Implementation coverage, 2026-10-30: the [experimental igniter](lite://repo/igniter/README.md#action-loops)
now runs Boolean-condition and unconditional loops as actions, with bare nearest-
loop break/continue. Bodies are scoped and condition reads are repeated before
entry. Value-producing loops, metadata, iterables, tags, payload exits, header
transfers and completion/cleanup hooks remain unsupported. This implements a
bounded effect-only use of the rules below without changing their value contract.
The [restricted compiler prototype](lite://doc/compiler/overview) lowers the same bare
nearest-loop exits in Boolean and unconditional loops to TS and C, and in
list-traversal loops to TS; payloads, tags and exits outside a loop are rejected
there.

The approved **2026-10-31** [fixed-array increment](lite://repo/igniter/README.md#fixed-arrays-and-traversal)
adds action traversal of the supported array values, with source-once evaluation,
positional order and an optional fixed as item binding. Body/item scopes are
fresh on each entry; bare continue advances and break stops the nearest loop.
Whole-source variable replacement does not retarget that evaluated traversal.
General iterables, metadata, named Boolean/unconditional receivers, loop values
and completion/cleanup remain unimplemented; no new always-Unit loop contract
is selected. See [INV-054](lite://repo/research/investigations/INV-054-fvp-fixed-arrays.md).

Implementation coverage, 2026-11-01: the igniter now implements typed loop
`.value` and one receiverless `then`. `.value` starts at `zero(T)`; a normally
completing body tail commits it, plain continue and bare break preserve it, and
without `then` the loop result is the final `.value`. `then` receives the final
`.value` and `.count` and its tail is the result. Action loops without `then`
remain Unit and commit nothing. Tags, `@name.value`, payload exits, targeted
return/break, `.item`/`.index` in `then`, `.count` in bodies, and noncontributing
partial-conditional tails remain unimplemented. A construct-level `finally`
now runs after `then` and on exits from the loop; see [finally](lite://doc/finally).
See [loop value](lite://doc/loop-value) and [loop completion](lite://doc/loop-completion).

## Template

```text
[@tag] loop [source] [as item_name] {
    body
} [then { completion_body }]
```

Brackets are optional grammar notation, not literal characters. As is the selected spelling for one optional item identifier. There are no positional receiver lists or completion receivers. Destructure/select inside the body. See [item naming](lite://doc/loop-receivers).

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

Assume running is Bool, remaining is Int, and process_next returns Unit and may update the state read by the source. Removing the leading and gives exactly the same reevaluated, short-circuit Boolean source. The loop keyword and body-opening brace establish the header boundaries; line breaks do not. A bare leader is not an omitted source, and an iterable cannot be coerced into this Bool expression. No pattern bindings or additional metadata are introduced. See [leading Boolean loop sources](lite://doc/leading-separators#boolean-loop-sources), selected 2026-10-24.

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
- .collected: ordered `List<T>` of every committed body contribution (tail expressions, `continue v`, and `break v`), available in `then` (or as a direct loop suffix `.collected`). Bare `continue`, bare `break`, and noncontributing paths do not append; `Unit`-producing loops do not expose `.collected`. Storage is retained only when `.collected` is observably used.

During an active iteration, `.item` and, for positional sources, `.index` describe that entry. In `then`, they describe the last entered iteration when one exists. If no body was entered, `then` exposes a type-directed zero placeholder for `.item`; for positional sources `.index` is `0`, while nonpositional sources have no `.index`. `.count == 0` distinguishes empty completion from an actual first entry. These fields are not available in source/condition evaluation before an entry. Count and value are available before the first condition, in the body, and in `then`. Retain last-item state only when completion observably uses it. See [empty-loop metadata](lite://doc/loop-last-item#zero-iteration-placeholders), [loop value](lite://doc/loop-value) for zero rules, and [continuity](lite://doc/continuity-and-analogy#similar-input-different-capabilities) for the capability boundary.

See [last-item/index access](lite://doc/loop-last-item) for zero/empty behavior and field-sensitive retention.

For loops, leading-dot access uses the loop context without searching outward. Inside a conditional (`if` / `match`), unambiguous loop fields (`.item`, `.index`, `.count`) resolve to the enclosing loop, while `.value` still requires an explicit loop `@tag` (because conditionals also have a `.value` concept in `then`). Ambiguous leading-dot metadata reads (e.g. colliding with an expected enum case) are rejected. Named `@tag` access selects a lexical context explicitly. No implicit ordinary variables or dynamically allocated tag objects are required.

## Writable iteration

Selected direction, 2026-11-27. Compiler support is pending. `loop mut source` grants writable access to the current element for each iteration. The source must itself permit writable access and provide a writable element location. The optional `as` binder and `.item` name the same place with the same access. Choosing a name requires no additional `mut`.

```text
loop mut rngs as r {
    _ := mut r.nextInt();
}

loop mut rngs {
    _ := mut .item.nextInt();
}
```

These are alternative loops. Each advances the elements in place and leaves the same collection state when started from the same seeds. The source grant makes the element writable. The `mut` in each call grants that access to `nextInt` under the ordinary receiver rule. Omitting `as` gives access through `.item`.

Pending verification cases cover equal final element states for the two forms on TS and C11, rejection of a writable loop over a read-only source, and a diagnostic when `r` and `.item` are both supplied as writable arguments to the same call. The writable borrow ends with the iteration, including on `continue` or `break`. It cannot escape into `then`. An ordinary local initializer such as `mut copy := .item` follows the normal initialization and ownership rules.

## Normal result and completion

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

When a loop has no `then` block, you can also project its completion metadata directly with a suffix (`.collected`, `.count`, or `.value`), and partial `if` / `match` tails commit only when a branch matches (leaving `.value` and `.collected` untouched otherwise):

```text
doubled := loop numbers { .item * 2 }.collected;
posDoubled := loop numbers { if .item > 0 { .item * 2 } }.collected;
squares := loop 1..=5 { .item * .item }.collected;
evens := loop 0..10 as i { if i % 2 == 0 { i } }.collected;
iterations := loop numbers { .item * 2 }.count;
```

Integer range loops (`loop start..end` half-open, `loop start..=end` inclusive, with optional `as i`) evaluate `start` and `end` once and expose `.item`, `.index`, `.count`, `.value`, and `.collected` with zero intermediate list allocation.

Then shares the owning loop context, tagged or untagged. Its tail expression produces the final result; then {} produces Unit. Without then, the selected normal result is final .value, including initialized zero for an empty/all-skipped loop. Complete inference remains open. See [completion](lite://doc/loop-completion).

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

Operation-local recovery remains available inside bodies. Returned Results still require explicit handling/propagation. External whole-loop error handlers are retired; body-wide recovery/cleanup, defer, and resource-management syntax remain [deferred](lite://doc/deferred-cleanup-and-resources). `then` is normal result processing, not cleanup; an attached construct-level `finally` runs afterward and does not replace the loop result.

Related: [full examples](lite://doc/loop-examples), [item naming](lite://doc/loop-receivers), [loop value](lite://doc/loop-value), [completion](lite://doc/loop-completion), [tags](lite://doc/tags-and-contexts), [exits](lite://doc/control-flow), and [historical accumulator](lite://doc/loop-accumulator).
