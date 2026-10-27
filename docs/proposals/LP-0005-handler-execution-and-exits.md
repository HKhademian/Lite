# LP-0005 r5: Recovery-handler execution and pending exits

- ID: `LP-0005`
- Revision: `r5`
- Status: **draft, 2026-10-27; counterexample and alternatives under review**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; investigates the execution/binding questions left open by [LP-0004 r1](LP-0004-count-free-error-contracts.md).
- Superseded by: none.

## User counterexample

```text
{ read_cached() }
    else { fallback_heavy_db_read() }
```

The explicit block can expose several pending errors or supported typed panics. Automatically invoking the fallback once per occurrence can turn one failed cache attempt into several expensive database operations. The user raises this as a problem with the proposed per-occurrence execution rule and asks for more attention to exits from the handler's scope.

Consuming matched failures and executing a recovery computation are distinct design decisions. The earlier assistant recommendation to repeat an ordinary handler automatically for each matching occurrence is withdrawn as a general default. This draft originally left execution count open. The later accepted [LP-0007 r1](LP-0007-typed-recovery-collectors.md) selects once-per-matching-clause execution and typed ellipsis collectors; this draft now tracks the remaining scalar binding and exit questions.

## Recovery action follow-up

The candidate below was subsequently selected in LP-0007: evaluate each matching `else` body at most once for one evaluation of its target, after selecting its matched pending failures. A receiverless catch-all would consume the supported pending group and evaluate the database fallback once, regardless of that group's occurrence count. A typed clause would select its covered category/group and leave unmatched categories for later clauses. Clauses would retain written source order.

An annotation `error: ErrA` must not silently bind an arbitrary occurrence and discard others, or pretend that one ErrA value is a group. The user's explicit sequence-capture candidate below provides a concrete way to review multiple-payload access. Scalar receiver behavior remains open. The collector grammar and binding direction are now selected separately in LP-0007; this draft does not finalize scalar multi-payload binding or an escaping inspection API.

An alternative would repeat named scalar handlers while running receiverless handlers once. That makes adding or removing a receiver name change side-effect counts. Review that cost explicitly against optional-receiver semantics; it is not selected. Distinguishing per-occurrence processing with an explicit source form is another open alternative.

## Explicit sequence capture candidate

Historical r2 spelling, superseded by the selected ellipsis collector in LP-0007:

```text
{ read_cached() }
    else errs: [ErrA] {
        loop errs as err { report_failure(err) }
    }
```

The historical candidate captured all pending ErrA matches as a sequence and runs the catch body once; the written loop performs per-error work explicitly. For one ErrA occurrence, errs has one element. For several, it contains all of them. With no ErrA match, skip the clause rather than run it with an empty sequence. Other failure categories remain for later written clauses. This form does not require a multi-error aggregate to be useful.

The user explicitly reaffirms in [LP-0006 r1](LP-0006-whole-match-failure-consumption.md) that simple receiverless and ordinary typed catches still consume all their matches. The sequence receiver exposes matched payloads; it does not create the all-match behavior or restrict ordinary forms to one occurrence. No automatic error count field or signature multiplicity is added.

Using the existing [readable indexed-sequence contract](../indexed-sequence-contract.md#readable-t) would provide traversal, a cheap exact count, and positional reads with default read access. It does not itself choose List ownership, contiguous storage, allocation, copying, or escape lifetimes. Filtering a heterogeneous pending group may require storage/indexing adaptation to meet the complete [T] contract; do not promise a free materialized array or silently weaken [T] to traversal only. LP-0007 now selects stable occurrence order; provider/storage choices remain open.

LP-0007 resolves the group-capture spelling with `...errs: ErrA`, which binds errs as [ErrA]. The former `errs: [ErrA]` candidate is not selected as an alternative spelling. Complete element-filter parsing, union-valued group filters, channel-origin access, and ownership/retention remain open.

With whole-match consumption, explicit iteration is work on captured failures, not the operation that incrementally consumes the pending set. Breaking out of the explicit loop stops reporting without reviving matched ErrA failures under the selected collector direction. Returning from the enclosing scope still raises the separate question of an unmatched ErrB remainder; spelling a loop does not resolve that conflict. A new report_failure failure follows the existing outward handler rules and does not re-enter this same catch.

## Selected collector follow-up

```text
{ read_cached() }
    else ...errs: Error {
        loop errs as err { report_failure(err) }
    }
```

LP-0007 selects this typed collector and the [Error] type of errs. It handles one or many matches, skips no-match clauses, preserves occurrence order in each filtered group, and keeps per-error work in an explicit loop. Error filters returned errors only. The later LP-0009 now selects Failure for all failures and Panic for typed panics, preserving LP-0007 ordering and execution count. See that accepted record and the normative expression-recovery page for current rules. Nonlocal exits with an unmatched remainder remain the open concern below.

## Type-owned repetition information

The user explores whether ErrA itself could carry a count or other repeated-occurrence information when that information makes sense for the domain. This is a candidate, not a selected universal error representation. A batch-write error could expose a failed-item count or detailed failures; a cache miss may need neither. Error values can carry meaningful domain information without adding occurrence counts to the function's type contract or requiring every error to store count metadata.

This leaves several distinct questions: whether the producing operation deliberately constructs one aggregated error, how independently produced values of the same error type combine, which payload details matter, and how a receiver exposes them. A count field alone does not define merging or authorize discarding other payloads merely because their types match. No mandatory counter, grouping container, merge hook, or same-type deduplication is selected here. The existing requirement to retain secondary cleanup failures is unchanged.

Domain-specific aggregation may intentionally omit occurrence details that its explicit error/operation contract does not promise. The language should not invent a diagnostic field merely to expose information the program does not use. A receiverless fallback need not inspect counts to replace one failed computation; deciding its execution count remains separate from the contents of ErrA.

## New handler failures do not re-enter the same clause

The existing rule puts a handler outside its own recovery boundary. A new failure from fallback_heavy_db_read must follow the existing outward outcome/propagation rules or reach a later eligible enclosing clause. It does not restart that fallback. Any future repeated-processing rule must define its matched input occurrences without turning the clause into a retry loop over failures its own body creates.

## Exiting with a remainder

Assume an enclosing function and a valid return payload:

```text
{ perform_work() }
    else (: ErrA) { return fallback_value() }
    else (: ErrB) { recover_b() }
```

If both ErrA and ErrB were pending, consuming ErrA leaves ErrB. The return exits the enclosing function; it is not normal completion that automatically advances to the next `else`. The language still needs a rule for this conflict between an explicit exit and an unhandled remainder. Static rejection of an exit that cannot preserve/handle the remainder, or continued outward failure transport instead of that exit, are possible policies, not selected behavior. Do not silently treat ErrB as consumed.

A catch-all that has consumed the whole original group has no original remainder at that point; new failures and required cleanup retain their own obligations. Return/break/continue targets, cleanup ordering, no self-catching, and prior mutation effects retain their existing contracts. Broad recovery does not promise rollback or safe capture of arbitrary foreign crashes.

## Tagged handler follow-up

[LP-0008 r1](LP-0008-recovery-block-tags-and-traces.md) resolves handler-local completion: a tag belongs to its explicit block, and `return @myblock` from a tagged catch body completes that body while retaining the unmatched remainder for later clauses. An @inner tag on the protected block alone does not enclose its handlers; returning around the entire chain requires an explicit wrapper. True nonlocal exits with an unmatched remainder remain the unresolved question above. [LP-0011 r1](LP-0011-explicit-failure-raising.md) records explicit raise forwarding alternatives; LP-0010 extraction forwards its entire operand and does not independently settle a partial handler's implicit remainder. Temporary expression/outcome traces should precede decisions on confusing examples.

## Revision history

`r1` records the expensive-fallback counterexample, the withdrawn default recommendation, the at-most-once candidate, payload-binding alternatives, exploratory type-owned count/details, and nonlocal exits with a pending remainder. It changes no accepted proposal, grammar, or runtime behavior.

`r2` adds the user's explicit `errs: [ErrA]` capture candidate, singleton support, explicit iteration, the complete [T] capability/storage implications, and the array-payload parsing ambiguity. It links the separately accepted all-match clarification in LP-0006. The capture syntax and remaining handler execution/exit rules stay under review.

`r3` records the accepted follow-up in LP-0007: ellipsis spelling, [Error] bound type, once-per-clause execution, and stable filtered occurrence order. The former bracket-annotation capture is retained as history. This proposal remains draft for unresolved scalar binding, lifetime/transport, and nonlocal exits with unmatched failures.

`r4` records the accepted LP-0008 scope and handler-local completion follow-up while retaining the unresolved nonlocal-exit policy.

`r5` links LP-0009's selected Failure/Panic selectors and LP-0011's explicit raise review. The unmatched-remainder policy remains draft; LP-0010 extraction alone does not settle a partial handler's implicit remainder.

Current rules: [expression recovery](../expression-recovery.md). Supporting discussion: [handler execution review](../recovery-receiver-types.md#handler-execution-and-expensive-fallbacks) and [cleanup/exit review](../finally.md#failure-aggregation-review).
