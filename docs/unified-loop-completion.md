# Unified loop completion

Status: **single receiverless then using the owning context selected; metadata-only state and typed zero-initialized .value selected 2026-10-19; full typing/exit contracts open**.

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

- .item: current iterable element, available during an active iteration.
- .index: zero-based iteration position, selected by the user. It is independent of original source indices/keys, reversal, or stride. Its condition/completion availability remains a separate phase contract.
- .count: entered-iteration count, zero before entry and one-based during the body; final count remains available in then.
- .value: the last committed body result, initialized to its statically determined type's valid all-zero value before iteration; final value remains available in then.

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

The tag names the same context as direct .field access. It remains lexically available through completion and is useful inside nested if/match/loop contexts, where leading-dot access does not search outward. An untagged loop can capture metadata into ordinary locals before entering such a nested context.

Metadata is read-only. The final .value has body type T while then computes final result R; reading .value is not reading an unfinished R. Keeping the tag available does not retain a current item, iteration-local references, or iterator resources automatically. Tags are not accepted first-class escaping values and need not be allocated objects.

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

The current direction runs then after exhaustion, a false condition, or bare break. Plain continue and break preserve .value. Continue value commits early; ordinary body completion commits its tail expression. Return @loop result supplies the final construct result directly, bypassing then. Function returns, forwarded errors, and panics are not ordinary completion.

All-exit cleanup, defer, scoped resources, pending-exit replacement, and cleanup failures remain in the [deferred lifecycle review](deferred-cleanup-and-resources.md). Renaming a hook or adding metadata does not settle those lifecycle rules.

## Open contracts

- Exact inference for .value, action/Unit bodies, and targeted-result-only loops.
- Special-type zero mappings, additional metadata, and nonzero initialization syntax.
- Item/index availability outside active iterations and any last-item retention.
- Ownership, replacement cleanup, and representation/cost rules.

Related: [full examples](loop-examples.md), [completion](loop-completion.md), [loop value](loop-value.md), [tags](tags-and-contexts.md), and [loops](loops.md).
