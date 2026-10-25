# Finally: cleanup after completion or exit

Status: **cleanup-only `finally`, completion ordering, panic unwinding, returned-error cleanup, same-scope typed-panic recovery ordering, and cleanup-failure precedence selected, 2026-10-20**. `finally` has no receiver, does not recover failures, and cannot transform the pending outcome. When a loop or conditional has both `then` and `finally`, `then` finishes first and `finally` runs afterward as the construct exits. On a normal exit, cleanup preserves the completed result; on an abrupt exit, it preserves that pending exit if cleanup completes normally. A typed panic matched by a handler in the same scope is recovered before that scope's `finally` runs once as it exits. During language-managed panic propagation toward an outer matching handler, exited scopes' applicable `finally` blocks run inner-to-outer. Postfix `!` returned-error propagation runs the same applicable construct-level cleanup before the error leaves the enclosing function or closure; body-wide cleanup remains deferred. If any failure is already pending, keep it primary and retain each new cleanup failure as secondary; if only normal completion is pending, the first cleanup failure becomes primary and cancels that completion. Exact aggregate representation and inspection, attachment grammar/scope, no-handler policy, and hard-abort behavior remain open. The example below uses only Unit cleanup.

Body-wide special cleanup sections are now explicitly deferred for a joint [defer and resource-management review](deferred-cleanup-and-resources.md). The illustrations here do not finalize that feature or its syntax.

## Placement correction

The full example below predates the user's [body-owned recovery rule](body-recovery.md). Error-catching clauses attached outside complete if/loop/match constructs are superseded; keep the example as cleanup-order history rather than current complete syntax. The selected construct-level order is `then`, then `finally`; body-wide cleanup-section syntax remains open.

## Template and selected typed-panic order

```text
operation() else (p: BoundPanic) {
    recover(p)
} finally {
    cleanup()
}
```

When a typed panic matches a handler in the same scope that owns `finally`, the handler recovers first, then that scope's `finally` runs once as the scope exits. When a panic escapes toward an outer matching handler, each exited inner scope runs its applicable `finally` before the panic reaches that handler; the handler's own scope runs its `finally` after recovery when that scope later exits. Whenever a `finally` hook runs and completes normally, it preserves the pending normal result, control-flow exit, propagated recoverable error, or typed panic. It has no implicit receiver for that outcome and cannot transform it into another value or exit. Cleanup can still refer to ordinary lexical names in scope.

For a loop or conditional with both hooks, execution reaches `then` after normal body/branch completion; `then` computes the final result, and `finally` performs cleanup as the construct exits. The construct's value is the `then` result (or its ordinary result when no `then` is present); the cleanup block's `Unit` does not replace it when cleanup succeeds. `finally` is not a recovery clause: it does not catch a failure or receive a failure value. Operation or body recovery remains a separate construct. Exact attachment syntax/scope remains open.

For example, assuming `values` contains `Int` values and `report.close()` returns `Unit`:

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

## Full conditional example

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

This is a complete recovery/cleanup structure under the proposed syntax, not a runnable implemented program or a definition of the illustrative helper functions. The same-scope typed-panic ordering is selected; grouped inner-block and call-level `finally` attachment remain under review. The example's external conditional-recovery tail is superseded. The function literal itself has no trailing `finally`: such an attachment must not ambiguously mean cleanup during function creation versus each invocation.

## Scope and execution traces

Each entered construct runs its own finally once when it is left, provided cleanup itself completes. An unselected branch has not entered its local region, so its finally does not run.

- Normal import: finish_quantity_read, finish_import, then finish_run.
- Returned ReadError from read_quantity with successful local recovery: report, replacement quantity 1, finish_quantity_read, remaining import work, finish_import, then finish_run.
- Panic in calculate_total with successful branch recovery: report_import_failure, finish_import, then finish_run. The operation's earlier finally has already run; it does not run again.
- Panic from report_import_failure: finish_import while leaving that region, then the example's outer recovery, followed by finish_run. The whole-conditional recovery tail is historical and superseded; this trace illustrates the selected cleanup before an outer matching handler.
- Normal preview: finish_preview, then finish_run. Import/help cleanup never runs.
- Panic in preview after read_text recovery has completed: finish_preview while leaving the region, then the example's outer recovery, followed by finish_run. The whole-conditional recovery tail is historical and superseded; inner-to-outer panic cleanup is selected.
- Panic while evaluating a condition, before any branch region begins: report_remaining_failure, then finish_run. No branch cleanup is active.
- Early function return or explicit Result ! propagation inside an entered branch: run entered inner cleanup and finish_run while leaving; failure handlers do not intercept these return exits.

Language-managed typed panics run applicable `finally` blocks for exited scopes before reaching an outer matching handler. The transfer implementation remains open. Hard process aborts are outside this cleanup guarantee.

## Full loop counterpart

The [loop recovery example](loop-recovery.md) adds operation cleanup, per-entered-iteration cleanup, then completion processing, and whole-loop cleanup. Continue leaves the iteration region but does not finish the loop; loop-level cleanup runs when the whole region is left. Its grouping also separates normal no-contribution else from failure recovery, a collision that the conditional receiver distinction cannot solve by itself.

## A handler does not protect its own finally

The operation's recovery handler covers its protected subject, not itself or its finally. A new panic from an operation's finally can reach a surrounding branch recovery boundary. A panic from a branch finally can reach surrounding conditional recovery. A panic from finish_run must travel to an enclosing eligible boundary or the unhandled-fault policy; it does not re-enter report_remaining_failure.

Cleanup failure has two selected cases. If a failure is already pending, keep it primary and retain each new cleanup failure as secondary. For example, if `write` fails with `DiskFull` and `close` then fails with `CloseFailed`, the outward failure must still identify `DiskFull` as primary and preserve `CloseFailed` as secondary; the caller must not infer that the write succeeded. If work completed normally and cleanup then fails, the cleanup failure becomes the escaping primary failure and cancels the pending normal result or control-flow exit. If a same-scope handler recovered the work failure before `finally`, cleanup failure is the only pending failure and becomes primary. Further cleanup failures during unwinding are retained behind that already pending failure. The aggregate's exact type, representation, ordering, and typed-handler access remain open. Lifecycle invariants and partial construction also need their own contracts.

Cleanup is not rollback: it does not undo earlier successful writes or side effects automatically. Forced process termination and hard implementation aborts are outside an ordinary structured-cleanup promise.

## Pending outcomes

The user selected cleanup-only behavior: `finally` has no implicit receiver or completion descriptor and cannot transform the pending outcome. When cleanup completes normally, the protected expression's value, control-flow exit, or propagated recoverable error remains pending. The quantity binding therefore receives the successful/read-recovery Int, not the cleanup's Unit. Ordinary lexical names remain available to cleanup.

If cleanup succeeds, the pending outcome is preserved. If cleanup fails while any failure is already pending, that failure remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure becomes primary and cancels pending normal completion. A locally recovered failure is no longer pending when `finally` begins. The aggregate carrier, how handlers inspect its parts, attachment syntax, and behavior on hard process abort remain unresolved.

Any Result-producing operation inside cleanup still requires its own explicit handling or valid forwarding under the eventual cleanup policy. Neither finally nor a surrounding outer handler automatically unwraps an ignored Result.

## Failure aggregation and open design

The precedence rule is useful beyond cleanup: independent operations can fail while one failure is already pending, and callers need a way to retain the primary cause plus all secondary causes. A reusable aggregate error type could express that for recoverable errors in transactions, parallel work, validation, or multiple resource releases. However, a generic `ErrorGroup<E>` only groups recoverable errors of its declared error type; it must not silently turn the separate typed-panic channel into a recoverable `Error`.

Possible designs include an ordinary library aggregate type for same-channel errors; a broader failure-group value that preserves `Error` and `Panic` as distinct tagged components; or an implicit runtime accumulator used only when failures collide. The ordinary type is simplest and keeps aggregation explicit, but heterogeneous failures need a clear conversion or sum type. A broad carrier preserves typed categories but complicates matching and inspection. An implicit accumulator hides syntax but makes allocation, ownership, propagation, and handler semantics harder to see. A chained representation can avoid a general-purpose mutable accumulator API, while collecting an arbitrary number of cleanup failures raises storage questions. Recommendation: require preservation of primary/secondary roles and original failure categories, then select a representation and inspection API only after comparing these cases. No concrete aggregate type, source syntax, or runtime representation is selected here; the selected handling policy follows below.

The user selected **declaration-ordered member-wise handling** (a "munching" model) for an aggregate such as `A & B`: each typed handler consumes matching pending members, and the next clause sees the remainder. A partial match must never mark the whole aggregate handled. Both `else (: A) { R1 } else (: B) { R2 }` and its reverse can run both handlers for `A & B`, but in different orders; clause order is semantically observable. If a remainder survives the chain, it still propagates. When all matching handlers complete normally, the last matching handler's value becomes the recovered value (`R2` for A then B, `R1` for B then A). The aggregate carrier and duplicate-member consumption remain open.

`A & B` above is illustrative notation for simultaneous failures, not a selected source type or aggregate representation. An ordinary `A | B` error payload has one active alternative and does not by itself run both filters. See the [union and aggregate recovery traces](expression-recovery.md#match-all-failures-or-filter-by-type).

A later recovery wraps the entire preceding recovery expression and can also catch a matching new failure raised by its handler. That new failure joins any already pending remainder: after consuming A from simultaneous A and B failures, a handler failure C leaves B and C pending together. The aggregate carrier and duplicate-member rules remain open; see [fallible handler outcomes](expression-recovery.md#fallible-handler-outcomes).

## Attachment shape

The selected hook order can be sketched for loops and complete conditional chains as:

```text
loop_with_hooks := loop_core [then_clause] [finally_clause]
conditional_with_hooks := conditional_core [then_clause] [finally_clause]
finally_clause := "finally" block
```

The cleanup clause has no receiver. This does not settle which other scopes can attach `finally`, the complete expression grammar, or body-wide cleanup-section syntax. A recovery clause belongs to its own supported recovery form; it is not part of `finally`.

Related: [conditional recovery](conditional-recovery.md), [structured exits](control-flow.md#cleanup), [loop completion](loop-completion.md#exits-and-cleanup), [receiver clauses](receiver-clauses.md), [shared recovery](expression-recovery.md), and [panics](panics.md).
