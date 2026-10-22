# Last item and index during loop completion

Status: **completion access, zero-iteration placeholders, and use-based retention selected by the user, 2026-10-19; ownership/lowering mechanics remain open**. Item/index are available during active iterations and as the last visited entry in `then` when an iteration occurred. Only metadata observed during completion needs retention for that phase.

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

## Zero-iteration placeholders

The user selected zero placeholders for `.item` and `.index` in `then` when no body was entered. The loop's `.count` is 0, and its typed `.value` remains its initialized zero. These are distinct metadata fields with their own types.

For an iterable loop, `.item` is the language-defined zero of the source element type. For a Boolean or unconditional loop, `.item` is `Unit`, which is its own zero value because Unit has one inhabitant. Under the user's selected zero-sized representation, no payload bytes need to be stored. `.index` is zero. `.count == 0` distinguishes these placeholders from the item and index of an actual first entry, whose index is also zero. The placeholder does not claim that a source element existed or that a body ran. If completion reads this field after zero entries, no last source item needs to be retained.

This rule applies to `then` after the loop. `.item` and `.index` are not available in a loop source expression or condition before an iteration is entered. Index means zero-based traversal position, independent of source keys, reversed positions, or stride.

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
