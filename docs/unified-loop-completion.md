# Unified loop completion

Status: **single receiverless then using the owning context, uniform source-less `Unit` item, zero-iteration placeholders, metadata-only state, and typed zero-initialized .value selected 2026-10-19; tagged return, explicit targeted break/continue, and then execution selected. Remaining open: full loop/result inference, cleanup ordering/attachment, and nonzero initialization**.

## Current syntax direction

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

One then block replaces the old then/empty-else/common-final combination for normal completion. Every loop has an unnamed context, so no explicit tag or completion receiver is required. Then uses that same owning context and ordinary tail-expression rules; then {} returns Unit.

## Loop metadata

- .item: current iterable element during an active iteration, or `Unit` in a Boolean/unconditional loop; the last entered item in then when observed there. With zero body entries, then exposes its type-directed zero placeholder.
- .index: for positional sources, zero-based iteration position, selected by the user. It is independent of original source indices/keys, reversal, or stride. It is available during active iterations and as the last entered index in then; after zero entries, then exposes index 0 as a placeholder. A unique set or other nonpositional source has no `.index`.
- .count: entered-iteration count, zero before entry and one-based during the body; final count remains available in then.
- .value: the last committed body result, initialized to its statically determined type's valid all-zero value before iteration; final value remains available in then.

If no body was entered, `.count == 0` distinguishes the zero `.item` and, for positional sources, `.index` placeholders from metadata for a real first iteration, whose index is also 0. A nonpositional source has no index placeholder. The source-less `.item` placeholder is `Unit`; an iterable placeholder is zero of the item type. The placeholders do not claim that an item was visited. See [zero-iteration placeholders](loop-last-item.md#zero-iteration-placeholders).

A loop may name only its item with as name. Count/value receiver lists and completion receivers are retired. So are .acc, previous, automatic Option wrapping, and mandatory value_or extraction. See [loop value](loop-value.md) for typing, commits, and universal zero mappings.

## Access through the owning loop tag

```text
sum := @sum loop numbers as number {
    @sum.value + number
} then {
    report_iterations(.count);
    @sum.value
}
```

The tag names the same loop context as direct .field access. It remains lexically available through completion and is useful inside nested conditionals when outer metadata must be explicit. Conditional `.value` requires an explicit conditional tag and is readable only in that conditional's attached `then`; ambiguous leading-dot metadata reads are rejected rather than resolved by shadowing or outward search. An untagged loop can capture metadata into ordinary locals before entering a nested context.

Metadata is read-only. The final .value has body type T while then computes final result R; reading .value is not reading an unfinished R. Keeping the tag available does not automatically retain all item storage, iteration-local references, or iterator resources. Completion observes last-item and, for positional sources, index fields through use-based retention; unused item state need not survive for then. Tags are not accepted first-class escaping values and need not be allocated objects.

## Empty and skipped processing

```text
message := loop items as item {
    if not eligible(item) { continue; }
    score(item)
} then {
    entered := .count;
    total := .value;

    if entered == 0 {
        "No iterations"
    } else {
        format_score(total)
    }
}
```

Assume score returns Int. Empty input and all-skipped input both leave value 0; count distinguishes whether any entries ran. Value 0 does not prove that a body result was committed. A future contribution flag/count requires a separate decision; it is not an implicit optional accumulator.

## Completion versus cleanup

Then runs after exhaustion, a false condition, any `break` targeting this loop (bare, named without a payload, or with a value), or a tagged return to this loop. Plain `continue` and a payloadless break—bare or `break @loop`—preserve `.value`. `continue value` commits early; ordinary body completion commits its tail expression. `break value` and `break @loop value` commit their operand to `.value`, stop the selected loop, and still run `then`. A `return @loop value` commits T and runs this loop's `then`; a return targeting an outer construct skips this loop's `then`. Function returns, forwarded errors, and panics leave without supplying this loop's T.

Construct-level `finally` is cleanup-only and runs after `then` on normal loop completion; applicable cleanup also runs when an exit skips `then`. Cleanup-failure precedence is selected: any already pending failure remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure cancels normal completion and becomes primary. Exact attachment scope and the `&` form's public value/operations remain open. Body-wide cleanup sections, defer, and scoped resources remain in the [deferred lifecycle review](deferred-cleanup-and-resources.md). Renaming a hook or adding metadata does not settle those remaining lifecycle rules.

## Open contracts

- Exact inference for .value, action/Unit bodies, and targeted-result-only loops.
- Special-type zero mappings, additional metadata, and nonzero initialization syntax.
- Ownership/lifetime mechanics for observed last-item state; unused fields require no completion retention.
- Ownership, replacement cleanup, and representation/cost rules.

Related: [full examples](loop-examples.md), [completion](loop-completion.md), [loop value](loop-value.md), [tags](tags-and-contexts.md), and [loops](loops.md).
