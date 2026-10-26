# LP-0005 r1: Recovery-handler execution and pending exits

- ID: `LP-0005`
- Revision: `r1`
- Status: **draft, 2026-10-26; counterexample and alternatives under review**
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

Consuming matched failures and executing a recovery computation are distinct design decisions. The earlier assistant recommendation to repeat an ordinary handler automatically for each matching occurrence is withdrawn as a general default. No execution-count rule is adopted by this draft.

## Revised candidate: one recovery action per matching clause

Recommend evaluating each matching `else` body at most once for one evaluation of its target, after selecting its matched pending failures. A receiverless catch-all would consume the supported pending group and evaluate the database fallback once, regardless of that group's occurrence count. A typed clause would select its covered category/group and leave unmatched categories for later clauses. Clauses would retain written source order.

This candidate still needs a payload-binding contract for several same-type occurrences. An annotation `error: ErrA` must not silently bind an arbitrary occurrence and discard others, or pretend that one ErrA value is a group. Do not invent a group type/syntax here. Explicit iteration could support per-occurrence work once an inspection/iteration API exists; no such API is selected by this draft.

An alternative would repeat named scalar handlers while running receiverless handlers once. That makes adding or removing a receiver name change side-effect counts. Review that cost explicitly against optional-receiver semantics; it is not selected. Distinguishing per-occurrence processing with an explicit source form is another open alternative.

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

## Revision history

`r1` records the expensive-fallback counterexample, the withdrawn default recommendation, the at-most-once candidate, payload-binding alternatives, exploratory type-owned count/details, and nonlocal exits with a pending remainder. It changes no accepted proposal, grammar, or runtime behavior.

Current rules: [expression recovery](../expression-recovery.md). Supporting discussion: [handler execution review](../recovery-receiver-types.md#handler-execution-and-expensive-fallbacks) and [cleanup/exit review](../finally.md#failure-aggregation-review).
