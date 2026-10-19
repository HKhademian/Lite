# Loop recovery and finally

Status: **historical recovery/completion example; external construct-handler placement superseded, 2026-10-19**. The example's receiver lists, Option accumulator, `then(result)`, and external grouped-loop recovery are not current syntax. It is retained only to record the earlier discussion. The user now requires recovery inside fn/if/loop/match bodies. Current loop completion and value rules are in [loops](loops.md); body-wide scope and syntax are reviewed in [body-owned recovery](body-recovery.md). Finally placement is not independently settled by that correction.

**Latest loop update, 2026-10-19:** header receiver lists/patterns, .acc, and automatic Option accumulator state shown below are historical. Current loops use one optional item name plus .item/.index/.count/.value metadata, with typed zero-initialized value. See [current loops](loops.md) and [loop value](loop-value.md).

## A collision the if proposal does not solve

Loops already explore both else { ... } and else(empty) { ... } for normal no-contribution completion. Receiver presence therefore cannot distinguish that hook from failure recovery. A binder named failure is not special syntax, and changing its spelling must not change the clause's meaning.

The if proposal's bare-else versus receiving-else distinction cannot be copied here without retiring the requested optional empty-hook receiver. This review does not make that change. A typed receiver does not solve ownership until a shared dispatch/coverage model is explicitly designed.

The example below used the `then(result)` receiver and Option accumulator proposed at that time. Both have since been superseded by receiverless `then` and typed zero-initialized `.value`. Its grouping only illustrates the old attempt to attach recovery outside a loop; external construct recovery is no longer recommended. See [current completion](loop-completion.md).

## Full historical example

Assume read_score(job) returns Int ! ReadError. Other helpers return ordinary values or Unit and may raise typed panics. All finally helpers finish normally with Unit for the illustrated traces. The Option value_or helper and as receiver punctuation remain working API/syntax, not a finalized generic/library definition.

```text
run := fn(jobs): String {
    (
        loop jobs as job, count, previous {
            ({
                show_progress(count);

                if not eligible(job) {
                    continue
                }

                score := read_score(job) else(failure) {
                    report_read_failure(failure);
                    0
                } finally {
                    finish_read(job)
                }

                /* This tail value is the next accumulated total. */
                previous.value_or(0) + score

            }) else(failure) {
                report_job_failure(failure);
                continue
            } finally {
                finish_job(job)
            }

        } then(result) {
            match result {
                .Some(total) { format_total(total) }
                .None { "No contributing jobs" }
            }
        }

    ) else(failure) {
        report_run_failure(failure);
        "Job processing failed"
    } finally {
        finish_run()
    }
}
```

Both format_total and the two fallback literals produce String, so the normal completion and recovery results agree with the function annotation. The arithmetic expression illustrates the existing accumulator direction rather than settling all addition/overflow policies. If a future numeric operation returns a Result, it still requires explicit handling/extraction before ordinary use.

## What belonged to each level in the historical proposal

- read_score else/finally: handles that operation's Result or supported typed panic, then performs its cleanup. A normal read fallback of 0 is still a valid contribution, not a skipped iteration.
- Inner grouped-block else/finally: protects the current iteration region. Its recovery reports the failure and continues, making no contribution and preserving the previous accumulator. Finish_job runs when the entered region is left, including continue.
- then(result): runs once during normal completion processing and receives Option<Int>. Some holds the last accumulated total; None means no contribution, even if some/all iterations were entered and skipped. It is not a failure handler.
- Outer grouped-loop else/finally: under whole-evaluation capture, handles remaining supported panics during source/iterator evaluation, iteration execution, or completion processing, then cleans up the whole region. It does not manufacture a successful partial total after a failed loop. It supplies the explicit String fallback instead.

The grouping makes ownership visible: the loop and its completion clauses finish before the outer recovery clause is parsed. A receiverless outer fallback could also be written after that grouping; receiver omission does not become globally invalid because the subject contains a loop.

## Evaluation and cleanup order in the historical proposal

An iterable source is obtained once and advanced for each item. The count is the body-entry count, beginning at one, not a collection index. The body receives the previous optional accumulator. A successful body result supplies the next contribution after the body completes.

For an eligible job with a read attempt, ordinary cleanup order is finish_read(job), then finish_job(job). On normal overall completion, then processes the final Option once and finish_run runs. An ineligible job skips the read but still leaves the entered iteration region, so finish_job runs and finish_read does not. A failed job recovered with continue does not reach then immediately; iteration continues.

The existing proposed bare-break rule stops iteration without contribution and routes preserved state through normal completion processing; applicable iteration cleanup runs before completion. A tagged return was previously modeled as a direct final-result exit that bypasses then, but the user has challenged that rule; its completion behavior and T/R payload relationship are now unresolved. The earlier cleanup claim is part of the historical proposal, not a selected all-exit guarantee. Plain return and explicit Result ! propagation leave the enclosing function and do not become errors handled by the loop's else; their cleanup behavior remains under the deferred lifecycle review.

A panic during a local handler or operation finally is not handled again by that same operation handler. It may reach the surrounding iteration handler. A panic in iteration recovery or its finally may reach outer recovery; that outer handler abandons the loop rather than silently resuming it. A panic in outer recovery/finally travels farther outward. These examples assume no cleanup failure is competing with an already pending failure.

Panic cleanup and cross-call capture still require their final contracts. Cleanup failure, partial construction, dropped/retained contributions during abnormal cleanup, and receiver-bearing finally transformation remain open. No rollback, automatic retry, or cleanup after a hard process abort is promised.

## Historical empty-hook proposal

A separate empty/no-contribution loop hook was considered alongside the old receiver-bearing completion form. It is superseded by the selected receiverless `then` context and typed zero-initialized `.value`; do not read this section as a current proposal.

The historical example expresses empty behavior by matching an optional accumulator in `then`. Current `.value` is never automatically wrapped in Option. Its outer failure fallback is likewise part of the superseded external-recovery sketch.

Using the same bare/receiving else for both empty completion and failure recovery still needs a uniform language-wide decision. Explicit grouping is one workable surface; a distinct marker or a shared completion/failure dispatch design are alternatives, not selected additions here.

## Other loop modes

The external recovery/cleanup layering in this historical sketch is not current. Boolean sources are reevaluated before each entry and unconditional loops have no source; no post-condition mode is added. Conditions that return Result still need explicit handling before supplying Bool. The selected uniform `.item` value for active Boolean/unconditional bodies is Unit; no implicit ordinary item/count/acc names are introduced.

Related: [loops](loops.md), [accumulator](loop-accumulator.md), [completion hooks](loop-completion.md), [finally](finally.md), [expression recovery](expression-recovery.md), [conditional recovery](conditional-recovery.md), and [exit rules](control-flow.md).
