# Unified loop completion

Status: **user-requested simplification under exploration, 2026-10-19; not selected grammar**. Replace separate loop then/empty-else/common-final processing with one block receiving completion state. This proposal does not finalize the deferred body-wide cleanup design.

The user additionally requires the owning loop tag to remain accessible in its completion block. This scope requirement is selected independently of the pending keyword and receiver grammar.

## Minimal receiver

The final block needs two independent facts:

- count: number of entered iterations, including skipped entries.
- acc: optional last committed contribution, with the existing accumulator rules.

Zero entries means count is zero and acc is .None for an unseeded loop. A loop that entered and skipped every iteration has a positive count but still has .None. A loop with a contribution has .Some(value). A final skipped entry or bare break preserves an earlier contribution. Seeded loops still need the existing distinction between a seed and an actual contribution.

This receiver is explicitly named metadata, not a new implicit loop variable. It does not supply a fabricated last item for an empty loop. Whether it also exposes a normal-exhaustion versus break reason is a separate question; count and acc alone do not distinguish those exits.

## Candidate syntax

See [full loop examples](loop-examples.md) for the combined syntax, alternate source modes, nested exits, and completion edge cases.

Reuse then as one completion block, now receiving the state rather than only Option<T>:

```text
sum := loop numbers as number, _, prev {
    prev.value_or(0) + number
} then(done) {
    done.acc.value_or(0)
}
```

The processing runs once after iteration ends. All cases can share actions and then select a final value:

```text
message := loop items as item {
    if not eligible(item) { continue; }
    score(item)
} then(done) {
    report_attempts(done.count);

    if .Some(last) := done.acc {
        format_score(last)
    } else {
        "No eligible items"
    }
}
```

The inner else is ordinary conditional selection; there is no separate loop empty clause. The receiving block follows the ordinary final-expression rule and can transform contribution type T into whole-loop result R. Nonreceiving action hooks and behavior when the completion block is omitted retain their existing open questions; this proposal does not settle them implicitly.

## Access through the owning loop tag

The loop's lexical scope includes its attached completion block. Finishing iteration does not end the tag's lifetime before completion processing has finished:

```text
sum := @sum loop numbers as number {
    @sum.acc.value_or(0) + number
} then(done) {
    report_iterations(done.count);
    @sum.acc.value_or(0)
}
```

Here done.count and @sum.count describe the same final entered-iteration count; done.acc and @sum.acc describe the same final accumulated state. The completion receiver is a convenient named view of that state, not a second accumulator. The tag can expose other documented metadata when that metadata is valid in the completion phase; its interface need not be limited to the receiver's minimal fields.

- @sum.count is available even when zero iterations ran.
- @sum.acc is the final committed optional accumulator, including preservation across skips and bare break. The completion block can inspect it and calculate a different final result from it.
- Metadata remains read-only. Producing the completion block's final expression does not implicitly overwrite the iteration accumulator or contribute another iteration.
- A current item, an iteration-local binding, or a reference into released iterator storage must not become accessible merely because the tag still exists. Last-item retention and any additional metadata need explicit phase and lifetime contracts; no empty-loop item is fabricated.
- The final whole-loop result is still being computed, so the tag cannot expose that unfinished result as an already available value.

Nested constructs retain their own current contexts. An explicit @sum.acc can reach the owning loop from inside a nested conditional; leading-dot access still never searches outward. Nested same-named tags follow ordinary lexical shadowing. The tag cannot escape as a first-class stored value, and retaining its scope does not make the finished iteration resumable.

The completion block therefore has access to all loop information that is still valid, without keeping every item or consumed resource alive by default. Exact ownership and lowering remain separate design work.

## Completion versus cleanup

Recommended initial scope: run this block after source exhaustion, a false loop condition, or bare break. Continue stays within iteration; targeted return supplies the final loop result directly and bypasses completion, as previously intended. A function return, an error forwarded by !, or a panic does not become normal completion.

This collapses three clauses if common-final processing means work shared by the contributing and noncontributing completion cases. A block guaranteed during every structured exit also needs rules for pending return values, errors, cleanup failures, and resources. That broader meaning remains in the [deferred cleanup and resource review](deferred-cleanup-and-resources.md). Neither rename then to finally nor claim full cleanup equivalence merely because both ordinary states reach it.

An enriched receiver could describe more exit reasons, but information alone does not decide whether its final expression replaces a pending return or whether it may prevent propagation. Those control-flow rules must be selected with the lifecycle design.

## Tradeoffs and open decisions

- One block removes overlapping then/else dispatch and makes shared actions easy to write.
- Simple transforms gain an acc field access compared with receiving the optional accumulator directly.
- No helper-function allocation or runtime reflection is required by this conceptual state record; final lowering and performance remain unimplemented.
- Confirm the single-block direction and keyword before migrating existing examples. This is a candidate replacement, not an additional fourth hook.
- Decide receiver fields, seed/contribution tracking, completion reasons, omitted-hook behavior, and nonreceiving hooks without silently changing existing targeted-return semantics.

Related: [loop completion](loop-completion.md), [accumulator](loop-accumulator.md), [loop exits](control-flow.md), and [loops](loops.md).
