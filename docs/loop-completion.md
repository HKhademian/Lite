# Loop completion

Status: **one receiverless then block using loop metadata selected; .value now typed and zero-initialized, 2026-10-19; complete exit/type contracts open**.

## Template

```text
sum := loop numbers as number {
    .value + number
} then {
    print(.count);
    .value
}
```

Every loop has a context even without a named tag. Then is an attached phase of that same loop, with final .count and .value available directly. There is no done/result receiver and no .acc or automatic Option wrapper. See [loop value](loop-value.md).

## Results

Then follows the ordinary final-expression rule and can transform body value type T into final result type R:

```text
then { .value }             /* body's final T value */
then { format_total(.value) } /* a transformed result */
then { "Finished" }         /* String */
then { Unit }               /* Unit */
then {}                     /* Unit */
```

These are clause fragments. A Unit tail does not silently preserve an earlier value. Trailing semicolons do not discard expression values. Without then, the selected normal-completion result is .value; the exact inference rules remain to formalize.

## Empty, skipped, and zero-valued loops

For Int-valued loops, .value starts at 0. An empty source or all-skipped entries leave it at 0; no value_or helper is required. A positive .count means entries ran, not that any entry committed a value. A genuine contribution of 0 is also 0, so .value alone cannot distinguish these histories.

Capture metadata before entering another construct context:

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

Assume score returns Int and format_score returns String. All-skipped nonempty input reaches format_score(0). There is no separate loop empty-else.

## Scope and availability

An explicit @name tag remains readable through then. Nested if/match/loop constructs own their own current contexts; leading-dot lookup never searches outward. Use a tag or captured local for outer metadata.

The final .value stays alive while then computes its result. The selected baseline makes .item, .index, and the optional item name available during active iterations only; retaining a tag does not automatically retain the last item. Count and value are available before the first condition, in the body, and in then. Last-item/index access in then is separately proposed, not selected.

The [last-item proposal](loop-last-item.md) illustrates this possible extension using existing .item/.index spellings, with zero values on empty input and .count as evidence of actual entry. It requires a retention contract before adoption.

## Exits and cleanup

Then runs after source exhaustion, a false condition, bare break, or break value. Continue stays in iteration. Return @loop result supplies the final construct result directly and bypasses then. Unqualified return, forwarded errors via !, and panics are not normal loop completion. Break value commits a value of body type T and then runs normal completion; bare break preserves the existing value. Only return @tag value is the direct tagged result exit that bypasses then.

Then is not an all-exit cleanup guarantee. Body-wide recovery, defer, disposal, finally placement, and cleanup failures remain [deferred](deferred-cleanup-and-resources.md). Operation-local recovery inside bodies remains available.

## Historical forms

Separate then/empty-else/finally clauses, completion receivers, action-preservation modes, optional accumulators, and previous-value receiver slots are superseded for loops. General Option/Result values and error receivers are unchanged.

Related: [unified completion](unified-loop-completion.md), [loop value](loop-value.md), [item naming](loop-receivers.md), [examples](loop-examples.md), and [exits](control-flow.md).
