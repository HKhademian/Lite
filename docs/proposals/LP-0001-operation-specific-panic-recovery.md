# LP-0001 r1: Operation-specific panic recovery

- ID: `LP-0001`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; replaces the unselected whole-evaluation recommendation for operation targets.
- Superseded by: none.

## Selected contract

An operation's attached `else` handles only faults defined by that operation. Panics from evaluating its arguments or operands bypass that handler, even when their category would match its typed filter. Arbitrary panics inside called code are not automatically faults of the outer operation; operation fault attribution needs an explicit contract.

The user selected: “Only faults defined by the outer operation; argument panics escape.” The concrete question was whether the outer handler in `answer := multiply(values[0], values[1]) else { 0 }` should catch a bounds panic from either indexed argument.

For that expression:

- Evaluate the callee, then arguments in the selected source order.
- If the first indexed argument panics, skip the second argument and invocation. The multiply fallback does not run.
- If the second indexed argument panics, skip invocation. Effects of the first argument remain; the multiply fallback does not run.
- If multiply raises a fault defined by its operation contract, its matching fallback can produce 0.
- A nonmatching or ineligible panic propagates implicitly under existing cleanup/transfer rules.

Local argument recovery can supply replacement inputs and permit invocation:

```text
answer := multiply(
    values[0] else { 2 },
    values[1] else { 3 },
) else { 0 }
```

Assuming ordinary successful multiplication for the illustrated values, empty values produces 6; [5] produces 15; [5, 7] produces 35. The outer handler covers multiply's operation faults, not the indexed argument evaluations.

## Preserved contracts

Result-producing arguments still require explicit handling/extraction before use as plain values. Postfix `!` still exits the nearest function/closure on a returned error. Panics propagate implicitly, retain their separate channel, and run applicable exited-scope cleanup. Prior effects are not rolled back, and operations are not retried automatically.

Handler chains retain their selected declaration order and coverage of new failures from earlier handlers. Typed filters restrict eligible faults; receiverless or broad filters do not enlarge an operation boundary. This decision changes no cleanup-failure precedence, aggregate consumption, or ownership contract.

## Remaining work

- Operation fault contracts: category definitions, attribution through helpers, custom providers, declaration/inference syntax, and separate-compilation stability.
- Complete expression precedence and attachment, especially indexed writes and postfix chains.
- General block recovery and integration of operation eligibility with nested recovery chains, including faults excluded by an earlier operation boundary.
- Mixed-channel receiver types, origin, payload storage, and aggregate representation.
- Transfer/cleanup mechanism, allocation failures, unhandled-fault policy, and foreign boundaries.

The contract must remain stable across inlining and helper extraction. This decision selects no new source spelling for panic effects, panic triggers, blocks, or runtime transport. It does not guarantee allocation-free recovery or eliminate the existing implicit propagation and cleanup requirements.

## Revision history

`r1` records the user's operation-specific selection and the concrete argument-fault traces. No implementation or performance result is claimed.

Normative owner: [expression recovery](../expression-recovery.md#operation-specific-panic-boundary-selected). Supporting traces: [recovery boundaries](../recovery-boundaries.md).
