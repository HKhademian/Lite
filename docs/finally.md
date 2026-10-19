# Finally: cleanup after completion or exit

Status: **existing structured-cleanup intent with a full conditional example, 2026-10-19**. The user requests finally in the recovery example. Attachment grammar, panic transfer, cleanup-failure behavior, and receiving-finally transformations remain proposals. The example below uses only Unit cleanup that preserves the pending result or exit.

## Template and proposed order

```text
operation() else(failure) {
    recover(failure)
} finally {
    cleanup()
}
```

The proposed sequence is protected evaluation, optional recovery, then finally. On successful cleanup, preserve the determined value or pending control-flow exit. A nonreceiving finally is an action hook; it does not replace an Int result with Unit merely because cleanup returns Unit.

The same shape can be proposed for an explicit inner block expression and for the complete conditional. It is not a finally after each individual loop iteration unless that iteration creates its own protected region. A construct-level loop finally runs when that loop is left.

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

This is a complete recovery/cleanup structure under the proposed syntax, not a runnable implemented program or a definition of the illustrative helper functions. Grouped inner-block attachment, call-level finally, and final conditional recovery are under review. The function literal itself has no trailing finally: such an attachment must not ambiguously mean cleanup during function creation versus each invocation.

## Scope and execution traces

Each entered construct runs its own finally once when it is left, provided cleanup itself completes. An unselected branch has not entered its local region, so its finally does not run.

- Normal import: finish_quantity_read, finish_import, then finish_run.
- Returned ReadError from read_quantity with successful local recovery: report, replacement quantity 1, finish_quantity_read, remaining import work, finish_import, then finish_run.
- Panic in calculate_total with successful branch recovery: report_import_failure, finish_import, then finish_run. The operation's earlier finally has already run; it does not run again.
- Panic from report_import_failure: finish_import while leaving that region, report_remaining_failure at the outer conditional boundary, then finish_run, under the proposed whole-conditional capture and panic-cleanup rules.
- Normal preview: finish_preview, then finish_run. Import/help cleanup never runs.
- Panic in preview after read_text recovery has completed: finish_preview while leaving the region, report_remaining_failure, then finish_run, under that same proposed scope/cleanup policy.
- Panic while evaluating a condition, before any branch region begins: report_remaining_failure, then finish_run. No branch cleanup is active.
- Early function return or explicit Result ! propagation inside an entered branch: run entered inner cleanup and finish_run while leaving; failure handlers do not intercept these return exits.

The structured-return cleanup intent already exists. Running finally during language-managed panic transfer is a proposed extension requiring a transfer/cleanup implementation; the trace must not be read as a currently selected guarantee for every panic or abort.

## A handler does not protect its own finally

The operation's recovery handler covers its protected subject, not itself or its finally. A new panic from an operation's finally can reach a surrounding branch recovery boundary. A panic from a branch finally can reach surrounding conditional recovery. A panic from finish_run must travel to an enclosing eligible boundary or the unhandled-fault policy; it does not re-enter report_remaining_failure.

These ordinary outward rules assume no preexisting failure is being replaced. If cleanup fails while a panic or returned exit is already pending, the language needs an explicit policy for retaining, combining, reporting, or terminating on those failures. This example does not choose one or silently discard the original failure. Lifecycle invariants and partial construction also need their own contracts.

Cleanup is not rollback: it does not undo earlier successful writes or side effects automatically. Forced process termination and hard implementation aborts are outside an ordinary structured-cleanup promise.

## Values and receivers

All finally bodies above produce Unit. The protected expression's value or pending exit payload is determined before cleanup, and preserved when cleanup completes. The quantity binding therefore receives the successful/read-recovery Int, not the cleanup's Unit.

Receiving finally blocks were also requested as a possible value transformation. Their input must describe normal completion, return, returned-error forwarding, or panic rather than fabricate a successful value on every path. Completion descriptor types, allowed replacement of normal results, restrictions on control flow from cleanup, and failure precedence remain open. The example does not retire or finalize that feature.

Any Result-producing operation inside cleanup still requires its own explicit handling or valid forwarding under the eventual cleanup policy. Neither finally nor a surrounding outer handler automatically unwraps an ignored Result.

## Attachment proposal

The conditional extension would have normal branches, then optional recovery, then optional finally:

```text
conditional_with_hooks := conditional_core
                          [conditional_recovery]
                          [finally_clause]
```

A grouped block or ordinary operation could expose the same final cleanup position. A receiverless recovery on a call keeps its meaning; bare else on a conditional remains false selection under the current conditional proposal. These fragments do not complete precedence, receiver typing, or the general expression grammar.

Related: [conditional recovery](conditional-recovery.md), [structured exits](control-flow.md#cleanup), [loop completion](loop-completion.md#finally), [receiver clauses](receiver-clauses.md), [shared recovery](expression-recovery.md), and [panics](panics.md).
