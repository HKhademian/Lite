# Finally: cleanup after completion or exit

Status: **cleanup-only `finally`, completion ordering, panic unwinding, and same-scope typed-panic recovery ordering selected, 2026-10-20**. `finally` has no receiver, does not recover failures, and cannot transform the pending outcome. When a loop or conditional has both `then` and `finally`, `then` finishes first and `finally` runs afterward as the construct exits. On a normal exit, cleanup preserves the completed result; on an abrupt exit, it preserves that pending exit if cleanup completes normally. A typed panic matched by a handler in the same scope is recovered before that scope's `finally` runs once as it exits. During language-managed panic propagation toward an outer matching handler, exited scopes' applicable `finally` blocks run inner-to-outer. Exact attachment grammar/scope, no-handler policy, hard-abort behavior, and cleanup-failure behavior remain open. The example below uses only Unit cleanup.

Body-wide special cleanup sections are now explicitly deferred for a joint [defer and resource-management review](deferred-cleanup-and-resources.md). The illustrations here do not finalize that feature or its syntax.

## Placement correction

The full example below predates the user's [body-owned recovery rule](body-recovery.md). Error-catching clauses attached outside complete if/loop/match constructs are superseded; keep the example as cleanup-order history rather than current complete syntax. The selected construct-level order is `then`, then `finally`; body-wide cleanup-section syntax and cleanup-failure rules remain open.

## Template and selected typed-panic order

```text
operation() else (p: BoundPanic) {
    recover(p)
} finally {
    cleanup()
}
```

When a typed panic matches a handler in the same scope that owns `finally`, the handler recovers first, then that scope's `finally` runs once as the scope exits. When a panic escapes toward an outer matching handler, each exited inner scope runs its applicable `finally` before the panic reaches that handler; the handler's own scope runs its `finally` after recovery when that scope later exits. Whenever a `finally` hook runs and completes normally, it preserves the pending normal result, control-flow exit, propagated recoverable error, or typed panic. It has no implicit receiver for that outcome and cannot transform it into another value or exit. Cleanup can still refer to ordinary lexical names in scope.

For a loop or conditional with both hooks, execution reaches `then` after normal body/branch completion; `then` computes the final result, and `finally` performs cleanup as the construct exits. The construct's value is the `then` result (or its ordinary result when no `then` is present); the cleanup block's `Unit` does not replace it. `finally` is not a recovery clause: it does not catch a failure or receive a failure value. Operation or body recovery remains a separate construct. Exact attachment syntax/scope and cleanup-failure precedence remain open.

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

The normal trace is: finish loop iterations, run the `then` body, run `report.close()`, and yield the `then` result as `total`. If an outer-target return exits the loop before its `then`, the loop's applicable `finally` still runs while leaving the loop scope. A propagated error or typed panic likewise runs applicable cleanup while leaving; panic recovery follows the separately selected same-scope/outer-handler ordering below.

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

These ordinary outward rules assume no preexisting failure is being replaced. If cleanup fails while a panic or returned exit is already pending, the language needs an explicit policy for retaining, combining, reporting, or terminating on those failures. This example does not choose one or silently discard the original failure. Lifecycle invariants and partial construction also need their own contracts.

Cleanup is not rollback: it does not undo earlier successful writes or side effects automatically. Forced process termination and hard implementation aborts are outside an ordinary structured-cleanup promise.

## Pending outcomes

The user selected cleanup-only behavior: `finally` has no implicit receiver or completion descriptor and cannot transform the pending outcome. When cleanup completes normally, the protected expression's value, control-flow exit, or propagated recoverable error remains pending. The quantity binding therefore receives the successful/read-recovery Int, not the cleanup's Unit. Ordinary lexical names remain available to cleanup.

If cleanup itself exits abruptly or fails while another outcome is pending, precedence remains open. Attachment syntax and behavior on hard process abort also remain unresolved.

Any Result-producing operation inside cleanup still requires its own explicit handling or valid forwarding under the eventual cleanup policy. Neither finally nor a surrounding outer handler automatically unwraps an ignored Result.

## Attachment shape

The selected hook order can be sketched for loops and complete conditional chains as:

```text
loop_with_hooks := loop_core [then_clause] [finally_clause]
conditional_with_hooks := conditional_core [then_clause] [finally_clause]
finally_clause := "finally" block
```

The cleanup clause has no receiver. This does not settle which other scopes can attach `finally`, the complete expression grammar, or body-wide cleanup-section syntax. A recovery clause belongs to its own supported recovery form; it is not part of `finally`.

Related: [conditional recovery](conditional-recovery.md), [structured exits](control-flow.md#cleanup), [loop completion](loop-completion.md#exits-and-cleanup), [receiver clauses](receiver-clauses.md), [shared recovery](expression-recovery.md), and [panics](panics.md).
