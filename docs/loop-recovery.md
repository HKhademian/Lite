# Loop recovery and finally

Status: **full example requested by the user, 2026-10-19; attachment and cleanup rules remain proposals**. This combines the existing loop receiver/optional-accumulator direction with operation recovery, iteration-region recovery, completion processing, and whole-loop recovery/cleanup. It does not select a new empty-completion meaning or rename its receiver as a failure receiver.

## A collision the if proposal does not solve

Loops already explore both else { ... } and else(empty) { ... } for normal no-contribution completion. Receiver presence therefore cannot distinguish that hook from failure recovery. A binder named failure is not special syntax, and changing its spelling must not change the clause's meaning.

The if proposal's bare-else versus receiving-else distinction cannot be copied here without retiring the requested optional empty-hook receiver. This review does not make that change. A typed receiver does not solve ownership until a shared dispatch/coverage model is explicitly designed.

The example uses the current then(result) direction to inspect Option accumulator state, including absence. It puts the loop inside a grouping so the outer recovery belongs to the completed loop expression rather than its empty hook. This is a concrete disambiguation proposal; general grouping/recovery/cleanup grammar remains under review.

## Full example

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

## What belongs to each level

- read_score else/finally: handles that operation's Result or supported typed panic, then performs its cleanup. A normal read fallback of 0 is still a valid contribution, not a skipped iteration.
- Inner grouped-block else/finally: protects the current iteration region. Its recovery reports the failure and continues, making no contribution and preserving the previous accumulator. Finish_job runs when the entered region is left, including continue.
- then(result): runs once during normal completion processing and receives Option<Int>. Some holds the last accumulated total; None means no contribution, even if some/all iterations were entered and skipped. It is not a failure handler.
- Outer grouped-loop else/finally: under whole-evaluation capture, handles remaining supported panics during source/iterator evaluation, iteration execution, or completion processing, then cleans up the whole region. It does not manufacture a successful partial total after a failed loop. It supplies the explicit String fallback instead.

The grouping makes ownership visible: the loop and its completion clauses finish before the outer recovery clause is parsed. A receiverless outer fallback could also be written after that grouping; receiver omission does not become globally invalid because the subject contains a loop.

## Evaluation and cleanup order

An iterable source is obtained once and advanced for each item. The count is the body-entry count, beginning at one, not a collection index. The body receives the previous optional accumulator. A successful body result supplies the next contribution after the body completes.

For an eligible job with a read attempt, ordinary cleanup order is finish_read(job), then finish_job(job). On normal overall completion, then processes the final Option once and finish_run runs. An ineligible job skips the read but still leaves the entered iteration region, so finish_job runs and finish_read does not. A failed job recovered with continue does not reach then immediately; iteration continues.

The existing proposed bare-break rule stops iteration without contribution and routes preserved state through normal completion processing; applicable iteration cleanup runs before completion. A tagged return supplying a final loop result bypasses then but runs applicable cleanup. Plain return and explicit Result ! propagation leave the enclosing function and do not become errors handled by the loop's else; entered cleanup runs under the structured-exit intent.

A panic during a local handler or operation finally is not handled again by that same operation handler. It may reach the surrounding iteration handler. A panic in iteration recovery or its finally may reach outer recovery; that outer handler abandons the loop rather than silently resuming it. A panic in outer recovery/finally travels farther outward. These examples assume no cleanup failure is competing with an already pending failure.

Panic cleanup and cross-call capture still require their final contracts. Cleanup failure, partial construction, dropped/retained contributions during abnormal cleanup, and receiver-bearing finally transformation remain open. No rollback, automatic retry, or cleanup after a hard process abort is promised.

## The separate empty hook remains under review

A normal empty/no-contribution else could still be written inside the loop grouping if its semantics are selected. It must not process the same absent accumulator twice together with a then block already matching None. Priority versus desugaring, its receiver payload, and whether then receives Option or only a present value in that combined form remain open.

This full example therefore expresses empty behavior in then, as the latest optional-state direction already recommends, rather than pretending that all exploratory completion clauses have finalized composition. Its outer failure fallback is separate from normal absence.

Using the same bare/receiving else for both empty completion and failure recovery still needs a uniform language-wide decision. Explicit grouping is one workable surface; a distinct marker or a shared completion/failure dispatch design are alternatives, not selected additions here.

## Other loop modes

The same recovery/cleanup layering can be proposed for Boolean-source and unconditional loops. A Boolean source is reevaluated before each entry; no post-condition mode is added. The first condition can fail before an iteration cleanup region is entered. Conditions that return Result still need explicit handling before supplying Bool; outer recovery does not implicitly unwrap them. Neither mode introduces implicit item/count/acc variable names.

Related: [loops](loops.md), [accumulator](loop-accumulator.md), [completion hooks](loop-completion.md), [finally](finally.md), [expression recovery](expression-recovery.md), [conditional recovery](conditional-recovery.md), and [exit rules](control-flow.md).
