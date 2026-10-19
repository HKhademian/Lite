# Last item and index during loop completion

Status: **completion access with use-based retention selected by the user, 2026-10-19; ownership/lowering mechanics remain open**. Item/index are available during active iterations and as the last visited entry in then. Only metadata observed during completion needs retention for that phase.

## What it is useful for

- Report which item caused bare break, including its traversal position.
- Record the last visited item after normal source exhaustion.
- Resume external work from a visited position, when the source offers a suitable protocol; an index alone does not make an arbitrary stream replayable.
- Distinguish the last visited input from the last committed .value when an iteration skips or breaks.

No lookahead is required to know the last entered iteration after the loop ends. If completion observes .item, preserve the last entered item until its last required use. If completion does not observe it, no retention is required solely for completion.

## Reuse existing field names

```text
report := @scan loop [4, 8, 12] as number {
    if number > 5 { break; }
    number * 10
} then {
    entered := .count;

    if entered == 0 {
        "No items"
    } else {
        describe_last(@scan.item, @scan.index, @scan.value)
    }
}
```

Assume describe_last returns String. With these rules, bare break on 8 leads to then with item 8, index 1, count 2, and value 40. The item/index describe the last entered body, not the last committed body value. If the last entry instead used continue, it would likewise remain the last visited item without overwriting .value.

This adds no last/last_item field names or completion receivers. .item and .index directly inside then select the same loop context even without an explicit tag. A nested if/match still requires a tag or captured locals; no outward field lookup is added. The optional as number binding remains iteration-local rather than being reintroduced implicitly in then.

## Empty source

To follow universal zero initialization without an automatic Option wrapper, initialize retained item storage to the element type's valid all-zero value and retained index to 0. If no body is entered, these stay zero and count is 0. A zero item is valid but is not evidence that a source item existed; count distinguishes this from a real first item at index 0.

This does not make item/index readable in a loop source expression or condition. Completion access does not extend these fields into source/condition evaluation. Index always means zero-based traversal position, independent of source keys, reversed positions, or stride.

## Use-based retention

Retention is field-sensitive and driven by observable use, not merely by declaring a tag or adding then:

- Completion reads .item: preserve the last visited item for that read.
- Completion reads .index but not .item: preserve/reconstruct the index without keeping item storage for completion.
- Completion reads only .count/.value: no last-item retention is needed.
- A tagged access or a capture into a local counts as a use of the referenced field. Merely naming @scan or reading @scan.count does not retain every loop field.
- Retain only the latest item required by the computation, not a history of all items.

```text
score := loop large_records as record {
    score_record(record)
} then {
    .value
}
```

Here then never observes .item, so the language does not require retaining a large record for completion. Ordinary source lifetimes, body effects, captures, and required cleanup still retain their own semantics.

The implementation must keep a used item valid under the eventual ownership/borrowing rules. Use-based retention does not require an unconditional snapshot, clone, heap allocation, or runtime metadata dictionary. Exact representation and lifetime analysis remain part of the shared ownership design, rather than a reason to retain unused fields.

Related: [loop metadata](loops.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), [loop value](loop-value.md), and [zero initialization](zero-initialization.md).
