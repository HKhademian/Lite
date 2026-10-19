# Unified loop completion

Status: **single completion block with receiverless context access selected by the user, 2026-10-19; full exit/type contracts open**. Use one then block for normal completion processing, with loop state available through .count and .acc. Separate completion receivers and the old then/empty-else/common-final combination are superseded for loops. This does not finalize the deferred body-wide cleanup design.

Every loop has a construct context, whether or not the programmer names it with a tag. Its body and attached then block use that same owning context. An explicit loop tag remains accessible through completion.

## Completion context

The final block accesses two independent facts:

- count: number of entered iterations, including skipped entries.
- acc: optional last committed contribution, with the existing accumulator rules.

Zero entries means count is zero and acc is .None for an unseeded loop. A loop that entered and skipped every iteration has a positive count but still has .None. A loop with a contribution has .Some(value). A final skipped entry or bare break preserves an earlier contribution. Seeded loops still need the existing distinction between a seed and an actual contribution.

Leading-dot access uses construct metadata; it introduces no ordinary variable named done, count, or acc. It does not supply a fabricated last item for an empty loop. Whether it also exposes a normal-exhaustion versus break reason is a separate question; count and acc alone do not distinguish those exits.

## Current syntax direction

See [full loop examples](loop-examples.md) for the combined syntax, alternate source modes, nested exits, and completion edge cases.

Use then without a receiver list; its context is the owning loop:

```text
sum := loop numbers as number, _, prev {
    prev.value_or(0) + number
} then {
    .acc.value_or(0)
}
```

The processing runs once after iteration ends. All cases can share actions and then select a final value:

```text
message := loop items as item {
    if not eligible(item) { continue; }
    score(item)
} then {
    report_attempts(.count);

    result := .acc;
    if .Some(last) := result {
        format_score(last)
    } else {
        "No eligible items"
    }
}
```

The inner else is ordinary conditional selection; there is no separate loop empty clause. Then follows the ordinary final-expression rule and can transform contribution type T into whole-loop result R. There is no receiver-presence switch: then { expression } returns that expression, then { Unit } returns Unit, and then {} returns Unit. An action-only tail that returns Unit also makes the completion result Unit; it does not silently preserve the accumulator. Behavior when then is omitted remains a separate typing question.

## Access through the owning loop tag

The loop's lexical scope includes its attached completion block. Finishing iteration does not end the tag's lifetime before completion processing has finished:

```text
sum := @sum loop numbers as number {
    @sum.acc.value_or(0) + number
} then {
    report_iterations(.count);
    @sum.acc.value_or(0)
}
```

Here .count and @sum.count describe the same final entered-iteration count; .acc and @sum.acc describe the same final accumulated state. Then is an attached phase of the loop, not a new metadata context. The explicit tag gives a name to the same underlying context; an untagged loop supports the same leading-dot access. Other metadata needs documented completion-phase availability.

- @sum.count is available even when zero iterations ran.
- @sum.acc is the final committed optional accumulator, including preservation across skips and bare break. The completion block can inspect it and calculate a different final result from it.
- Metadata remains read-only. Producing the completion block's final expression does not implicitly overwrite the iteration accumulator or contribute another iteration.
- A current item, an iteration-local binding, or a reference into released iterator storage must not become accessible merely because the tag still exists. Last-item retention and any additional metadata need explicit phase and lifetime contracts; no empty-loop item is fabricated.
- The final whole-loop result is still being computed, so the tag cannot expose that unfinished result as an already available value.

Nested constructs retain their own current contexts. An explicit @sum.acc can reach the owning loop from inside a nested conditional; leading-dot access still never searches outward. With an untagged loop, capture .acc or .count into a local before entering a nested construct that needs that value. The optional-state example above captures result for exactly that reason. Nested same-named tags follow ordinary lexical shadowing. The tag cannot escape as a first-class stored value, and retaining its scope does not make the finished iteration resumable.

The completion block therefore has access to all loop information that is still valid, without keeping every item or consumed resource alive by default. Exact ownership and lowering remain separate design work.

## Completion versus cleanup

Recommended initial scope: run this block after source exhaustion, a false loop condition, or bare break. Continue stays within iteration; targeted return supplies the final loop result directly and bypasses completion, as previously intended. A function return, an error forwarded by !, or a panic does not become normal completion.

This collapses three clauses if common-final processing means work shared by the contributing and noncontributing completion cases. A block guaranteed during every structured exit also needs rules for pending return values, errors, cleanup failures, and resources. That broader meaning remains in the [deferred cleanup and resource review](deferred-cleanup-and-resources.md). Neither rename then to finally nor claim full cleanup equivalence merely because both ordinary states reach it.

Additional context fields could describe more exit reasons, but information alone does not decide whether its final expression replaces a pending return or whether it may prevent propagation. Those control-flow rules must be selected with the lifecycle design.

## Tradeoffs and open decisions

- One block removes overlapping then/else dispatch and makes shared actions easy to write.
- No completion receiver name or receiver-presence value rule is needed. The older then(done), then(result), and then(_) loop forms are retired, rather than retained as alternate spellings.
- The unnamed context is not a generated source-visible tag or a promise to allocate an object. No helper-function allocation or runtime reflection is required by this design; final lowering and performance remain unimplemented.
- The single-block direction replaces the old completion combination; it is not an additional fourth hook. All-exit cleanup remains deferred.
- Decide additional metadata, seed/contribution tracking, completion reasons, and omitted-hook behavior without silently changing existing targeted-return semantics.

Related: [loop completion](loop-completion.md), [accumulator](loop-accumulator.md), [loop exits](control-flow.md), and [loops](loops.md).
