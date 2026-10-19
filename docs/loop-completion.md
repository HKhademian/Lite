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

An explicit @name tag remains readable through then. Use a tag or captured local for outer metadata inside nested conditionals. Conditional metadata, if exposed, requires an explicit conditional tag, and ambiguous leading-dot metadata access is rejected rather than resolved by shadowing or outward search.

The final .value stays alive while then computes its result. Count/value are also available before the first condition. Item/index are readable during active iterations and as the last entered iteration in then if one exists; the optional as item binding itself remains iteration-local. With zero entries, then receives a type-directed zero `.item` and `.index == 0`, with `.count == 0` distinguishing placeholders from an actual first entry. See [zero-iteration placeholders](loop-last-item.md#zero-iteration-placeholders).

[Last-item/index retention](loop-last-item.md) is driven by observable field use. If then does not read .item, no retention of the last item is required for completion. Reading only index/count/value does not retain the item; an explicit tag alone does not retain all fields. Used item storage must remain valid under the eventual ownership rules.

## Exits and cleanup

Then runs after source exhaustion, a false condition, bare break, or break value. Continue stays in iteration. Whether return @loop result should run or bypass then is explicitly unresolved. Unqualified return, forwarded errors via !, and panics are not normal loop completion. Break value commits a value of body type T and then runs normal completion; bare break preserves the existing value. The earlier tagged-return bypass rule is a candidate, not a selected contrast with break.

Then is not an all-exit cleanup guarantee. Body-wide recovery, defer, disposal, finally placement, and cleanup failures remain [deferred](deferred-cleanup-and-resources.md). Operation-local recovery inside bodies remains available.

## Historical forms

Separate then/empty-else/finally clauses, completion receivers, action-preservation modes, optional accumulators, and previous-value receiver slots are superseded for loops. General Option/Result values and error receivers are unchanged.

Related: [unified completion](unified-loop-completion.md), [loop value](loop-value.md), [item naming](loop-receivers.md), [examples](loop-examples.md), and [exits](control-flow.md).
