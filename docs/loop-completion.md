# Loop completion

Status: **one receiverless then block with owning-loop context selected by the user, 2026-10-19; complete exit/type contracts open**.

## Purpose and template

Handle final contributions and their absence in one completion block, without a separate receiver name or empty-case hook:

```text
sum := loop numbers as number, _, previous {
    previous.value_or(0) + number
} then {
    .acc.value_or(0)
}
```

Every loop has a context, even without an explicit tag. Then uses that same context; .count is the final entered-iteration count and .acc is the optional final accumulator. An explicit @name tag names this context and remains accessible through completion. See [unified completion](unified-loop-completion.md) and [full examples](loop-examples.md).

## Results

Then follows the ordinary final-expression rule. It may transform contribution type T into whole-loop result R. Receiver presence is no longer a switch between result transformation and action-only behavior:

```text
then { .acc.value_or(0) }  /* explicit Int result */
then { "Finished" }       /* explicit String result */
then { Unit }             /* Unit */
then {}                   /* Unit */
```

These are clause fragments. The older then(result), then(done), and then(_) forms are retired for loop completion. If common finishing actions should preserve a value, explicitly return that value as the tail expression; an action returning Unit does not silently preserve an earlier accumulator. Trailing semicolons still do not discard expression values.

Behavior and inference when then is omitted remain separate design questions.

## Empty versus no contribution

For an unseeded loop, zero entered iterations gives .count == 0 and .acc is .None. All-skipped iterations give a positive count but still .None. A final skipped entry or bare break preserves a prior contribution. Seeded loops still need explicit seed-versus-contribution rules.

Capture metadata before entering a different construct context:

```text
message := loop items as item {
    if not eligible(item) { continue; }
    score(item)
} then {
    entered := .count;
    result := .acc;
    report_attempts(entered);

    if .Some(last) := result {
        format_score(last)
    } else {
        "No eligible items"
    }
}
```

The inner else is normal conditional selection. The old separate loop else and its priority/composition question are superseded by handling both states inside then.

## Context scope

Then is an attached loop phase, not a new metadata owner. Its direct .count/.acc access works on tagged and untagged loops. A nested if/match/loop has its own context; leading-dot lookup never searches outward. Use a named loop tag or captured local to reach outer state from that nested construct.

Metadata remains read-only and phase-checked. The final accumulator stays available while then computes a result; iteration-local values and a last item are not automatically retained. The final whole-loop result cannot be read before it has been computed.

## Exits and cleanup

The current completion direction runs then once after source exhaustion, a false condition, or bare break. Continue remains inside iteration. Return @loop value supplies the final result directly and bypasses completion; unqualified return exits the nearest function/closure. Error forwarding by ! and panics are not normal loop completion.

Break value remains unconfirmed shorthand. Its retention does not follow from the receiverless completion choice.

Then is not an all-exit cleanup guarantee. Body-wide recovery, defer, resource disposal, finally placement, and cleanup failures remain in the [deferred lifecycle review](deferred-cleanup-and-resources.md). Ordinary operation-level recovery inside loop bodies remains available, and returned Results still require explicit handling or propagation.

## Historical designs

Separate then/empty-else/finally clauses, Option or state-record completion receivers, and receiver-presence action/result modes were earlier explorations. They are superseded for normal loop completion. Historical generic hook and cleanup discussions do not reintroduce them as alternate loop forms.

Related: [receivers](loop-receivers.md), [accumulator](loop-accumulator.md), [control-flow exits](control-flow.md), [tags](tags-and-contexts.md), and [historical hook proposals](receiver-clauses.md).
