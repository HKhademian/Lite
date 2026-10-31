# INV-055 — Proposed bounded FVP list slice

Status: proposed (source spelling and temporary runtime scope need explicit consent)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-055](TOPICS.md#inv-055)
Baseline: `7cafc24`; interpreter remains igniter-v0.1.0-alpha.13

## Why another decision is needed

The user selects the four front/back operation names and authorizes automatic
progression until another permission is required. Copies are the current semantic
model; explicit noncopying modes are later work. Those decisions do not select
the concrete growable type/construction spelling. The owning
[generic convention](../docs/generic-notation.md) explicitly says List<Int> is
explanatory notation, and [allocation behavior](../docs/sequence-end-operations.md#remaining-contracts)
is still open. The current igniter also lacks explicit mut argument support.

This proposal bundles the smallest runnable list demonstration and its temporary
failure boundary so those remaining choices can be reviewed together. It draws
on existing List and mut examples; it introduces no alternative notation.
It is not implementation consent and does not change the selected language yet.

## Proposed concrete source

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

Proposed expected output: 0 3, then 1, then 2 on separate lines. Both pop calls
execute in report's written argument order. Mutating values leaves saved's
sequence intact under the copy-first contract. The fixed binding values permits
held-data mutation, not whole-binding replacement.

## Proposed implementation scope

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

## Proposed temporary failure boundary

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
pop and retaining terminal allocation handling are explicitly part of this
proposal, not inferred consent from the operation-name approval.

## Verification planned after consent

Run separate strict TypeScript checking and the interpreter suite. Add meaningful
checks for typed empty/nonempty construction; fixed-array versus list identity;
both ends, ordering and duplicate values; independent saved/argument/result
copies; runtime indexing/traversal; source/argument evaluation order; wrong types
and missing mut grants before effects; bounds/empty failures; and deliberate
unsupported grant cases. Add the next indexed runnable example only when the
runner supports it, and run it through ./lite run and --check plus editor checks.

No list code, executable example or release tag is produced by this proposal.
After explicit consent, complete the bounded investigation/implementation/docs
and appropriate checks in one atomic milestone, preserve previous tags, then
continue automatically within selected scope.
