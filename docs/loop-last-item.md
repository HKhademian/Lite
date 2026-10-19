# Last item and index during loop completion

Status: **requested usage/syntax proposal for evaluation, 2026-10-19; not selected**. The accepted baseline permits .item/.index only during active iterations. This document proposes an optional extension to then without changing that baseline yet.

## What it is useful for

- Report which item caused bare break, including its traversal position.
- Record the last visited item after normal source exhaustion.
- Resume external work from a visited position, when the source offers a suitable protocol; an index alone does not make an arbitrary stream replayable.
- Distinguish the last visited input from the last committed .value when an iteration skips or breaks.

No lookahead is required to know the last entered iteration after the loop ends. The main additional obligation is retaining its item until completion finishes.

## Candidate: reuse existing field names

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

Assume describe_last returns String. Under this candidate, bare break on 8 leads to then with item 8, index 1, count 2, and value 40. The item/index describe the last entered body, not the last committed body value. If the last entry instead used continue, it would likewise remain the last visited item without overwriting .value.

The candidate adds no last/last_item field names or completion receivers. .item and .index directly inside then select the same loop context even without an explicit tag. A nested if/match still requires a tag or captured locals; no outward field lookup is added. The optional as number binding remains iteration-local rather than being reintroduced implicitly in then.

## Empty source candidate

To follow universal zero initialization without an automatic Option wrapper, initialize retained item storage to the element type's valid all-zero value and retained index to 0. If no body is entered, these stay zero and count is 0. A zero item is valid but is not evidence that a source item existed; count distinguishes this from a real first item at index 0.

This does not make item/index readable in a loop source expression or condition. It is specifically a proposed completion-phase extension. Index always means zero-based traversal position, independent of source keys, reversed positions, or stride.

## Retention contract to decide before adoption

Integer item retention is straightforward. Generic items may be owned, borrowed, moved into .value, or backed by iterator storage reused on each advance. Merely retaining a tag cannot promise those old items remain readable.

The feature therefore needs an explicit access/lifetime contract. Do not silently clone resource-bearing items, extend a released borrow, allocate a hidden snapshot, or promise simultaneous ownership of an item moved elsewhere. Whether a source capability, explicit item retention, or a restricted borrowed view provides this access remains open. Last-index access can be considered separately because it needs no item retention.

If adopted, only requested metadata needs to survive as observable state; there is no requirement to retain a history of all items. Compiler lowering and performance remain unimplemented.

## Existing alternative without this feature

A programmer can retain a known copyable item explicitly today in the design:

```text
var last: Int;

report := loop numbers as number {
    last = number;
    number * 10
} then {
    describe_last(last, .count, .value)
}
```

This helper's second argument is the entered count, not an index. Last starts at its zero value; code needing to distinguish empty input should also inspect the count. The explicit binding makes the retention visible while the general metadata extension remains undecided.

Related: [loop metadata](loops.md), [completion](loop-completion.md), [tags](tags-and-contexts.md), [loop value](loop-value.md), and [zero initialization](zero-initialization.md).
