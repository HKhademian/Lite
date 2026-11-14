# Loop completion

Status: **one receiverless then block using loop metadata selected; .value typed and zero-initialized; tagged return, explicit targeted break/continue, and then execution selected, 2026-10-19. Remaining open: complete loop/result inference, cleanup ordering/attachment, and nonzero initialization**.

Normative page for `then`, targeted exits, and the completion result. `.value` type/commits are in [loop value](loop-value.md); loop forms are in [loops](loops.md); inference is in [loop type inference](loop-type-inference.md).

Implementation checkpoint, 2026-11-14: the TypeScript backend implements one
optional receiverless `then { ... }` after a loop or conditional body. `then`
receives the final `.value` and (for loops) `.count` (entered iterations,
including skipped entries); its tail is the construct result, so `then { .value }`,
`then { .count }`, a transformed value, and `then { "text" }` work. Without
`then`, the result is the final `.value`. A statement loop or conditional may
also carry `then`; its result is discarded. Tagged loops (`@name loop ...`),
conditional tags (`@name if`/`@name match ... then { ... }`), `@name.value`/
`.count`/`.item`/`.index`, payload `break`/`continue`, `break @name`,
`continue @name`, and `return @name` are implemented. `.item`/`.index` in `then`
expose the last entered entry, or a typed zero item and index 0 after zero
entries. When a loop or conditional also carries construct-level
`finally { ... }`, `then` runs before `finally` on normal completion and is
skipped on abrupt exit (implemented in the TypeScript backend and igniter; C
backend support remains deferred).

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

An explicit @name tag remains readable through then. Use a tag or captured local for outer metadata inside nested conditionals. Conditional `.value` requires an explicit conditional tag and is readable only in that conditional's attached `then`; ambiguous leading-dot metadata access is rejected rather than resolved by shadowing or outward search.

The final .value stays alive while then computes its result. Count/value are also available before the first condition. Item is readable during active iterations and as the last entered iteration in then if one exists; index is readable there only for positional sources. The optional as item binding itself remains iteration-local. With zero entries, then receives a type-directed zero `.item`; for positional sources `.index == 0`, while nonpositional sources have no `.index`. `.count == 0` distinguishes placeholders from an actual first entry. See [zero-iteration placeholders](loop-last-item.md#zero-iteration-placeholders).

[Last-item/index retention](loop-last-item.md) is driven by observable field use. If then does not read .item, no retention of the last item is required for completion. Reading only index (when available), count, or value does not retain the item; an explicit tag alone does not retain all fields. Used item storage must remain valid under the eventual ownership rules.

## Exits and cleanup

Then runs after source exhaustion, a false condition, any `break` targeting this loop (bare, named without a payload, or with a value), or a tagged return to this loop. `continue` stays in iteration. A `return @loop result` commits T and runs this loop's `then` to produce R; if it targets an outer construct instead, this loop's `then` is skipped. Unqualified `return`, forwarded errors via `!`, and panics leave without supplying a loop T. A payloadless break—bare or `break @loop`—preserves the existing value; a break value, including `break @loop value`, commits T and then runs normal completion.

Then is not an all-exit cleanup guarantee. When a loop has both `then` and construct-level `finally`, `then` runs first and `finally` cleans up as the loop exits; successful cleanup preserves the loop result and cleanup does not recover failures. Applicable cleanup still runs on exits that skip `then`. Exact attachment syntax/scope remains open. If any failure is already pending, it remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure becomes primary and cancels normal completion. The `&` form's public value/operations remain open. Body-wide recovery/cleanup sections, defer, and disposal remain [deferred](deferred-cleanup-and-resources.md). Operation-local recovery inside bodies remains available.

## Historical forms

Separate loop empty-else and completion-receiver clauses, action-preservation modes, optional accumulators, and previous-value receiver slots are superseded. The selected `finally` is the cleanup-only hook described above; general Option/Result values and error receivers are unchanged.

Related: [unified completion](unified-loop-completion.md), [loop value](loop-value.md), [item naming](loop-receivers.md), [examples](loop-examples.md), and [exits](control-flow.md).
