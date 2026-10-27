# Finally: cleanup after completion or exit

Status: **cleanup-only `finally`, completion ordering, panic unwinding, returned-error cleanup, same-scope typed-panic recovery ordering, and cleanup-failure precedence selected, 2026-10-20; order-insensitive `A & B` co-occurrence patterns and ordered failure tuples added 2026-10-25, with the `&` form binding no value**. `finally` has no receiver, does not recover failures, and cannot transform the pending outcome. When a loop or conditional has both `then` and `finally`, `then` finishes first and `finally` runs afterward as the construct exits. On a normal exit, cleanup preserves the completed result; on an abrupt exit, it preserves that pending exit if cleanup completes normally. A typed panic matched by a handler in the same scope is recovered before that scope's `finally` runs once as it exits. During language-managed panic propagation toward an outer matching handler, exited scopes' applicable `finally` blocks run inner-to-outer. Postfix `!` returned-error propagation runs the same applicable construct-level cleanup before the error leaves the enclosing function or closure; body-wide cleanup remains deferred. If any failure is already pending, keep it primary and retain each new cleanup failure as secondary; if only normal completion is pending, the first cleanup failure becomes primary and cancels that completion. The `&` form's public value/operations/inspection, attachment grammar/scope, no-handler policy, and hard-abort behavior remain open. The example below uses only Unit cleanup.

Body-wide special cleanup sections are now explicitly deferred for a joint [defer and resource-management review](deferred-cleanup-and-resources.md). The illustrations here do not finalize that feature or its syntax.

## Scope vocabulary

- **Construct-level `finally`:** attached to a complete loop, conditional, or general block and runs when that construct is left. Selected.
- **Operation/recovery-level `finally`:** attached to one operation or block recovery expression, such as `operation() else (...) { ... } finally { ... }`. The surface is selected; exact attachment scope remains open.
- **Body-wide cleanup section:** a `finally`/cleanup region covering an entire function, loop, or conditional body. Deferred, not selected.

Examples below name their scope. “`finally`” without a qualifier means one of the two selected scopes, not a body-wide section.

## Placement correction

The full example below predates the user's [body-owned recovery rule](body-recovery.md). Error-catching clauses attached outside complete if/loop/match constructs are superseded; keep the example as cleanup-order history rather than current complete syntax. The selected construct-level order is `then`, then `finally`; body-wide cleanup-section syntax remains open.

## Operation/recovery-level template and typed-panic order

This is an operation-level example.

```text
operation() else (p: BoundPanic) {
    recover(p)
} finally {
    cleanup()
}
```

When a typed panic matches a handler in the same scope that owns `finally`, the handler recovers first, then that scope's `finally` runs once as the scope exits. When a panic escapes toward an outer matching handler, each exited inner scope runs its applicable `finally` before the panic reaches that handler; the handler's own scope runs its `finally` after recovery when that scope later exits. Whenever a `finally` hook runs and completes normally, it preserves the pending normal result, control-flow exit, propagated recoverable error, or typed panic. It has no implicit receiver for that outcome and cannot transform it into another value or exit. Cleanup can still refer to ordinary lexical names in scope.

For a loop or conditional with both hooks, execution reaches `then` after normal body/branch completion; `then` computes the final result, and `finally` performs cleanup as the construct exits. The construct's value is the `then` result (or its ordinary result when no `then` is present); the cleanup block's `Unit` does not replace it when cleanup succeeds. `finally` is not a recovery clause: it does not catch a failure or receive a failure value. Operation or body recovery remains a separate construct. Exact attachment syntax/scope remains open.

For example, assuming `values` contains `Int` values and `report.close()` returns `Unit`. This is a construct-level loop example:

```text
total: Int = @sum loop values as value {
    .value + value
} then {
    .value
} finally {
    report.close()
}
```

The normal trace is: finish loop iterations, run the `then` body, run `report.close()`, and yield the `then` result as `total`. If an outer-target return exits the loop before its `then`, the loop's applicable `finally` still runs while leaving the loop scope. A propagated returned error or typed panic likewise runs applicable construct-level `finally` blocks inner-to-outer while leaving; body-wide cleanup remains deferred. Panic recovery follows the separately selected same-scope/outer-handler ordering below.

The same cleanup shape can be proposed for an explicit inner block expression and for the complete conditional. It is not a finally after each individual loop iteration unless that iteration creates its own protected region. A construct-level loop finally runs when that loop is left.

## Current construct-level conditional example

The handler belongs inside the selected branch; it is not attached to the complete conditional.

```text
result: Int = @run if ready(path) {
    text := read_text(path) else (e: ReadError) {
        report_read_error(e);
        ""
    }
    text.length
} then {
    @run.value
} finally {
    finish_run()
}
```

`read_text` handles its own returned error in the branch. The conditional's `finally` runs when the conditional exits; the branch-level operation handler is not an external conditional-recovery tail. The `then` result is the final conditional result, and cleanup does not replace it. This is the current placement; the full example below is retained for its cleanup-order history.

## Historical full conditional example

This historical example mixes operation-level and construct-level `finally`; its external conditional-recovery placement is superseded.

Assumptions: read_quantity returns Int ! ReadError; read_text returns String ! ReadError. The other helpers return ordinary values or Unit and can raise typed panics. All cleanup helpers in this trace finish normally with Unit. Their possible failure is a separate contract, not silently ignored. The conditions are plain Bool values supplied by their helpers.

```text
run := fn(mode: Int, path: String) {
    if is_import(mode) {
        ({
            /* One operation, its recovery, and its cleanup. */
            quantity := read_quantity(path) else(failure) {
                report(failure);
                1
            } finally {
                finish_quantity_read()
            }

            total := calculate_total(quantity);
            print(total);

        }) else(failure) {
            report_import_failure(failure)
        } finally {
            finish_import()
        }

    } else if is_preview(mode) {
        /* Cleanup can be present without a local branch handler. */
        ({
            text := read_text(path) else {
                "Preview unavailable"
            }

            print(text);

        }) finally {
            finish_preview()
        }

    } else {
        ({
            print("Unknown mode");
            show_help();

        }) else(failure) {
            report_help_failure(failure)
        } finally {
            finish_help()
        }

    } else(failure) {
        report_remaining_failure(failure)
    } finally {
        finish_run()
    }
}
```

This historical example illustrates cleanup ordering and the retired external handler placement; it is not current complete syntax. The current placement uses body-local handlers, as in the example above. The same-scope typed-panic ordering is selected; grouped inner-block and call-level `finally` attachment remain under review. The function literal itself has no trailing `finally`: such an attachment must not ambiguously mean cleanup during function creation versus each invocation.

## Historical execution traces

The following traces describe the historical example above. Each entered construct runs its own finally once when it is left, provided cleanup itself completes. An unselected branch has not entered its local region, so its finally does not run.

- Normal import: finish_quantity_read, finish_import, then finish_run.
- Returned ReadError from read_quantity with successful local recovery: report, replacement quantity 1, finish_quantity_read, remaining import work, finish_import, then finish_run.
- Panic in calculate_total with successful branch recovery: report_import_failure, finish_import, then finish_run. The operation's earlier finally has already run; it does not run again.
- Panic from report_import_failure: finish_import while leaving that region, then the example's outer recovery, followed by finish_run. The whole-conditional recovery tail is historical and superseded; this trace illustrates the selected cleanup before an outer matching handler.
- Normal preview: finish_preview, then finish_run. Import/help cleanup never runs.
- Panic in preview after read_text recovery has completed: finish_preview while leaving the region, then the example's outer recovery, followed by finish_run. The whole-conditional recovery tail is historical and superseded; inner-to-outer panic cleanup is selected.
- Panic while evaluating a condition, before any branch region begins: report_remaining_failure, then finish_run. No branch cleanup is active.
- Early function return or explicit Result ! propagation inside an entered branch: run entered inner cleanup and finish_run while leaving; failure handlers do not intercept these return exits.

Language-managed typed panics run applicable `finally` blocks for exited scopes before reaching an outer matching handler. The transfer implementation remains open. Hard process aborts are outside this cleanup guarantee.

## Historical full loop counterpart

The [loop recovery example](loop-recovery.md) is historical; its operation and construct cleanup spellings are not body-wide cleanup-section syntax.

The [loop recovery example](loop-recovery.md) adds operation cleanup, per-entered-iteration cleanup, then completion processing, and whole-loop cleanup. Continue leaves the iteration region but does not finish the loop; loop-level cleanup runs when the whole region is left. Its grouping also separates normal no-contribution else from failure recovery, a collision that the conditional receiver distinction cannot solve by itself.

## A handler does not protect its own finally

The following statements concern selected construct-level and operation/recovery-level boundaries, not body-wide cleanup sections.

The operation's recovery handler covers its protected subject, not itself or its finally. A new panic from an operation's finally can reach a surrounding branch recovery boundary. A panic from a branch finally can reach surrounding conditional recovery. A panic from finish_run must travel to an enclosing eligible boundary or the unhandled-fault policy; it does not re-enter report_remaining_failure.

Cleanup failure has two selected cases. If a failure is already pending, keep it primary and retain each new cleanup failure as secondary. For example, if `write` fails with `DiskFull` and `close` then fails with `CloseFailed`, the outward failure must still identify `DiskFull` as primary and preserve `CloseFailed` as secondary; the caller must not infer that the write succeeded. If work completed normally and cleanup then fails, the cleanup failure becomes the escaping primary failure and cancels the pending normal result or control-flow exit. If a same-scope handler recovered the work failure before `finally`, cleanup failure is the only pending failure and becomes primary. Further cleanup failures during unwinding are retained behind that already pending failure. The aggregate's exact type, representation, and typed-handler access remain open. LP-0007 selects occurrence-order preservation for captured matches; that does not choose primary-promotion diagnostics or carrier ABI. Lifecycle invariants and partial construction also need their own contracts.

Cleanup is not rollback: it does not undo earlier successful writes or side effects automatically. Forced process termination and hard implementation aborts are outside an ordinary structured-cleanup promise.

## Pending outcomes

The user selected cleanup-only behavior: `finally` has no implicit receiver or completion descriptor and cannot transform the pending outcome. When cleanup completes normally, the protected expression's value, control-flow exit, or propagated recoverable error remains pending. The quantity binding therefore receives the successful/read-recovery Int, not the cleanup's Unit. Ordinary lexical names remain available to cleanup.

If cleanup succeeds, the pending outcome is preserved. If cleanup fails while any failure is already pending, that failure remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure becomes primary and cancels pending normal completion. A locally recovered failure is no longer pending when `finally` begins. The `&` form's public value/operations, how handlers inspect its parts, attachment syntax, and behavior on hard process abort remain unresolved.

Any Result-producing operation inside cleanup still requires its own explicit handling or valid forwarding under the eventual cleanup policy. Neither finally nor a surrounding outer handler automatically unwraps an ignored Result.

## Cleanup after an early return from captured recovery

[LP-0015 r1](proposals/LP-0015-early-return-recovery-paths.md) selects a normal function return even if the unfinished captured recovery has other unmatched categories. Those captured values are abandoned with that expression; they are not carried as active propagating failures into exit cleanup. Applicable cleanup still runs with the normal return pending. A newly produced cleanup failure can cancel that return under the existing precedence rules. This distinguishes abandoned captured data from a failure already being propagated; it does not change cleanup's primary/secondary retention rule for actually propagating failures. Payload evaluation can also fail before the return begins.

## Capture and explicit extraction

[LP-0009 r1](proposals/LP-0009-flat-failure-capture.md) selects explicit ? capture into flat outcomes that retain supported errors and panics, including cleanup failures arising inside the protected extent. It changes no cleanup ordering or primary/secondary retention rule. [LP-0010 r1](proposals/LP-0010-outcome-extraction-and-exhaustion.md) forwards every retained occurrence through !, preserving origin and running required exited-scope cleanup. Later local recovery does not intercept that control-flow transfer itself; new cleanup failures still follow the existing retention rules. Carrier ABI, ownership, retention failure, and complete finally attachment remain open. Manual raise uses the same applicable cleanup under LP-0012. Nonlocal exits with remainders and unmatched-remainder/provenance transport remain a [draft](proposals/LP-0011-explicit-failure-raising.md).

## Failure aggregation and open design

The precedence rule is useful beyond cleanup: independent operations can fail while one failure is already pending, and callers need a way to retain the primary cause plus all secondary causes. A reusable aggregate error type could express that for recoverable errors in transactions, parallel work, validation, or multiple resource releases. However, a generic `ErrorGroup<E>` only groups recoverable errors of its declared error type; it must not silently turn the separate typed-panic channel into a recoverable `Error`.

Possible designs include an ordinary library aggregate type for same-channel errors; a broader failure-group value that preserves `Error` and `Panic` as distinct tagged components; or an implicit runtime accumulator used only when failures collide. The ordinary type is simplest and keeps aggregation explicit, but heterogeneous failures need a clear conversion or sum type. A broad carrier preserves typed categories but complicates matching and inspection. An implicit accumulator hides syntax but makes allocation, ownership, propagation, and handler semantics harder to see. A chained representation can avoid a general-purpose mutable accumulator API, while collecting an arbitrary number of cleanup failures raises storage questions. The selected recovery syntax uses an order-insensitive `A & B` co-occurrence pattern and ordered failure tuples; the `&` form binds no value, while an ordered tuple binds its tuple. Require preservation of primary/secondary roles and original failure categories; public `&` operations, representation, inspection API, and ownership remain open. The selected handling policy follows below.

The user selected **declaration-ordered member-wise handling** (a "munching" model) for a failure set such as `A & B`: each typed handler consumes matching pending members, and the next clause sees the remainder. A partial match must never mark the whole aggregate handled. Individual filters `else a:A { R1 } else b:B { R2 }` both run when both members are pending; their order is written else order, independent of error occurrence order, so reversing the clauses changes the final value (`R2` vs `R1`). A combined `else : A & B` clause consumes both and prevents later individual consumers from running; if an individual consumer runs first, the combined match can no longer see both. An ordered tuple such as `else e: (: A, : B)` matches only that order and binds the tuple. Outer receiver parentheses are optional when unambiguous. If a remainder survives the chain, it still propagates. The `&` form's public value/operations and duplicate-member consumption remain open.

Clarified 2026-10-26 in [LP-0003 r1](proposals/LP-0003-pending-failure-munching.md): singleton and aggregate failures share the pending-occurrence model. Schematic (ErrSingle,) has one occurrence; () has none. A clause consumes only its match; with no match, it neither runs nor consumes. A proven empty remainder leaves no original failure to catch or propagate; new handler/cleanup failures retain their own obligations. Catching uses the remainder without requiring a primary-promotion step; this selects no tuple carrier ABI or diagnostic relabeling rule. See [munching traces](expression-recovery.md#pending-occurrences-and-munching-selected).

`A & B` is the selected order-insensitive recovery-receiver pattern: it matches when both A and B are pending, and `B & A` is the same pattern. It is not a general source type or ordinary value. Ordered failure tuples reuse tuple syntax: `e: (: A, : C, : B)` or `e: (a: A, c: C, b: B)`; positional access works in both, labels only in the named form. Raw tuple patterns remain ordered: `(A, B)` and `(B, A)` are different value patterns. An individual A | B payload has one active alternative. LP-0009 allows an outcome under a flat failure-category type to retain several occurrences; both filters may then run. Union normalization never deduplicates occurrence payloads. See the [union and aggregate recovery traces](expression-recovery.md#match-all-failures-or-filter-by-type).

A later recovery wraps the entire preceding recovery expression and can also catch a matching new failure raised by its handler. That new failure joins any already pending remainder: after consuming A from an A-and-B failure set, a handler failure C leaves B and C pending together. The known occurrence order keeps the older B before the handler's new C under LP-0007. The `&` form's public value/operations and repeated-type combined-pattern matching remain open; see [fallible handler outcomes](expression-recovery.md#fallible-handler-outcomes).

## Failure aggregation review

Status: **supporting review, 2026-10-26; questions below remain open, with no change to the selected retention/consumption rules**.

Operation-specific recovery and [explicit whole-block recovery](expression-recovery.md#explicit-whole-block-panic-boundary-selected) settle where a panic can be handled. They do not settle how a collection of pending failures is represented or leaves a scope. Four cases need explicit contracts:

- **Diagnostic provenance after consumption:** work fails with primary A and cleanup adds secondary B. Handling A leaves B pending. The selected occurrence model continues matching B without first promoting it to primary. Whether diagnostics relabel a surviving occurrence, and what historical provenance they expose, remains open; this is not a prerequisite for matching or remainder exhaustion. The earlier promotion recommendation was not adopted.
- **Handler exits:** LP-0015 now settles plain function return from captured recovery: it abandons that expression and returns its normal value even when another captured category remains. Handler-local tagged return still retains the remainder for following layers. Failure-directed raise/! and other nonlocal tagged/loop exits remain the narrower policy question in [LP-0005 r7](proposals/LP-0005-handler-execution-and-exits.md#exiting-with-a-remainder); do not infer their behavior from normal return.
- **Mixed channels:** a returned A error and cleanup panic B retain both origins. LP-0009 now selects explicit capture under T ! (A | Panic), with ordered ...fails: Failure access; LP-0010 forwards retained occurrences through their original channels. Ordinary T ! A does not silently include panic B. Concrete carrier storage, generalized .err inspection, and transport remain open.
- **Repeated occurrences and storage failure:** two failed releases can produce two distinct B payloads. The selected [count-free declaration contract](expression-recovery.md#error-contracts-do-not-declare-occurrence-counts) forbids requiring a caller to predict their count and repeat a catch clause per occurrence. Matching bodies execute once and explicit collector loops express per-error work under LP-0007; scalar multi-value binding and transport remain open; plain-union normalization does not authorize losing payloads. If arbitrarily many occurrences must be retained, define storage and failure-on-retention policy; an allocator failure cannot be resolved by assuming another successful allocation.

These are semantic dependencies even if local checks compile to branches. A runtime failure dictionary, heap-backed list, reference-counted carrier, or particular unwinder is not selected by identifying them. Body-wide cleanup and resource ownership remain deferred.

## Attachment shape

The selected hook order can be sketched for loops and complete conditional chains as:

```text
loop_with_hooks := loop_core [then_clause] [finally_clause]
conditional_with_hooks := conditional_core [then_clause] [finally_clause]
finally_clause := "finally" block
```

The cleanup clause has no receiver. This does not settle which other scopes can attach `finally`, the complete expression grammar, or body-wide cleanup-section syntax. A recovery clause belongs to its own supported recovery form; it is not part of `finally`.

Related: [conditional recovery](conditional-recovery.md), [structured exits](control-flow.md#cleanup), [loop completion](loop-completion.md#exits-and-cleanup), [receiver clauses](receiver-clauses.md), [shared recovery](expression-recovery.md), and [panics](panics.md).
