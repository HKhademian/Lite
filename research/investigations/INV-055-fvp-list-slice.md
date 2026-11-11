# INV-055 — Approved bounded FVP list slice

Status: recorded (explicitly approved bounded implementation)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-055](TOPICS.md#inv-055)
Baseline: `7cafc24`; interpreter remains igniter-v0.1.0-alpha.13

Subsequent status, **2026-10-31**: the user explicitly approves the temporary
textLength/textAt/textSlice helpers after the focused review. Earlier pending
consent statements in this dated increment describe its original baseline, not
the current status. See [INV-016 approval](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

## Consent and baseline

The user selects the four front/back operation names and authorizes automatic
progression until another permission is required. Copies are the current semantic
model; explicit noncopying modes are later work. At the proposal baseline, those decisions did not select
the concrete growable type/construction spelling. The owning
[generic convention](../../docs/generic-notation.md) explicitly says List<Int> is
explanatory notation before this approval, and [allocation behavior](../../docs/sequence-end-operations.md#remaining-contracts)
was still open. The baseline igniter also lacked explicit mut argument support.

The proposal in `8f637d6` bundled the smallest runnable list demonstration and its temporary
failure boundary so those remaining choices could be reviewed together. It drew
on existing List and mut examples; it introduces no alternative notation.
The user explicitly replies "Approve this FVP list slice" to that concrete scope.
This authorizes the builtin List<T> spelling and temporary runtime policy below,
without selecting the broader generic/library/ownership design.

## Approved runnable example

```text
values: mut List<Int> = [1, 2];
saved := values;
push_front(mut values, 0);
push_back(mut values, 3);
report(pop_front(mut values), pop_back(mut values));
loop saved as value {
    report(value);
}
```

Verified output: 0 3, then 1, then 2 on separate lines. Both pop calls
execute in report's written argument order. Mutating values leaves saved's
sequence intact under the copy-first contract. The fixed binding values permits
held-data mutation, not whole-binding replacement.

## Approved implemented scope

1. Adopt List<T> as source spelling for this builtin FVP family only. T is an
   existing scalar or flat scalar tuple type; do not implement generic
   declarations/application for arbitrary user-defined families, nested lists,
   unions, constraints or specialization machinery. The broader generic design
   remains a separate INV-027 investigation; other angle-bracket examples remain
   explanatory notation.
2. Construct lists through explicitly typed, fully initialized declarations using
   bracket literals. The expected concrete List type chooses the growable family;
   an uncontextual [1, 2] remains a fixed array. A typed empty literal obtains T
   from this explicit destination; bare [] inference remains outside this slice.
   Literal contributions retain written evaluation order and exact element
   contracts. No list constructor, length, reserve or capacity helper is added.
3. Support readable Int bracket access and existing action traversal for these
   list values. Runtime count belongs to the list, not its static type. Keep
   runtime-list numeric dot positions unsupported: their selected fixed-array
   meaning requires a static extent. Report scalar elements/tuple fields through
   existing helpers; do not add aggregate formatting.
4. Make the four selected operations available as temporary bindings in the
   existing single-file FVP runner, alongside its temporary I/O helpers. Use only
   positional arguments: push_front/push_back take mut target and one element,
   return Unit; pop_front/pop_back take mut target and return one element.
   This does not select public parameter labels, module placement, an import
   model or additional method syntax. Permanent standard-library placement is
   later work.
5. Implement the existing explicit mut grant only for a directly named list
   binding whose declaration grants held-data mutation. Ordinary list reads,
   inferred copies and ordinary function inputs/results retain copied values
   under exact element contracts. Do not invent implicit write grants. Complex
   grant targets, simultaneous grants, view aliases and reentrant mutation during
   argument preparation stay unsupported with diagnostics, rather than acquiring
   an ad hoc permanent alias policy. General user-function mut parameters remain
   outside this first implementation.
6. Keep copies observably independent under growth/removal of the source. Host
   storage is private; no shared mutable alias, implicit move, native layout or
   performance guarantee follows. Do not add an optimizer or resource framework
   to the disposable igniter.

## Approved temporary failure boundary

- Reuse the igniter's existing terminal BoundPanic diagnostic for an invalid list
  index or empty ordinary pop, with a clear operation-specific message. A failed
  empty removal does not change the sequence. This temporary diagnostic category
  does not select a permanent public empty-pop error type.
- Keep catchable host resource failures terminal under the existing CLI policy
  (nonzero status, including the existing RangeError resource-limit message).
  No recoverable allocation Result, allocator API or automatic retry is added.
  This is a temporary FVP limit, not a guarantee to catch fatal host exhaustion
  or a selection of the permanent language allocation policy.
- Check syntax, names, types and grant eligibility before executing effects.
  Evaluate the target location once, then the supplied element once, then perform
  the operation. Unsupported grant-overlap/reentrancy cases fail before execution.
  Preserve supplied expression faults and exits; do not introduce rollback of
  earlier effects or implement attached else recovery in this increment.

The direct-pop fault direction is already selected. Reusing BoundPanic for empty
pop and retaining terminal allocation handling were explicitly part of the
approved scope, not inferred consent from the operation-name approval.

## Verification and implementation limits

Separate strict TypeScript no-emit checking and all 120 interpreter test groups
pass on Node 26.13.0/TypeScript 7.0.2. New tests cover typed empty/nonempty lists,
compact type-close/initializer boundaries, fixed-array/list identity, both ends,
ordering/duplicate values, scalar and named/mixed tuple elements, independent
saved/argument/result copies, indexed receiver order, snapshot traversal and
nearest-loop exits. Negative cases check wrong element contracts, missing grants,
readonly copies, captured data, bounds/empty pops, complex targets, overlapping
reads/replacement and simultaneous/reentrant mutations before effects.

The real launcher runs [013](../../language/examples/013-growable-lists.lts), reporting
0 3, then 1, then 2; --check emits nothing. The real CLI reports a located
BoundPanic and status 1 for an empty pop. Existing CLI resource-limit handling is
retained; these checks do not simulate host heap exhaustion or promise recovery
from fatal host failures. All 9 editor checks pass with the expanded corpus and
List type-name highlighting.

The disposable evaluator publishes a new immutable host sequence after each
successful end operation, preserving older copied values and traversal snapshots.
This is deliberately simple and may copy the whole sequence per mutation; no
amortized growth, capacity ABI, native ownership or performance claim is made.
There is no optimizer or mandatory physical-copy strategy for a future compiler.

Explicit receiving declarations construct fresh list literals. Other fresh
literal contexts, nested collections, indexed writes, views, generic machinery,
capacity controls, arbitrary resource elements, user-function mut parameters,
advanced aliases and recovery remain outside this slice. Those limits do not
select new permanent language restrictions. Text-helper consent is unchanged.

## Handoff

Commit implementation, tests, example, editor changes and owning documentation
atomically as igniter-v0.1.0-alpha.14, preserving all earlier tags. Continue with
already selected scope automatically. The follow-up [014 input-history example](../../language/examples/014-input-history.lts)
uses only this supported list/I/O subset: collect entered integers until zero,
then traverse/report and sum them. Real-launcher checks cover mixed-sign inputs,
immediate zero, and check-only mode without input or output. No new feature or
release tag is introduced by this example. A character tokenizer still depends on the
existing unapproved text-helper experiment and needs its own explicit review.
