# INV-022 — Explicit tuple label conversion in the FVP

Status: recorded (bounded implementation of existing selected rules)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)

Subsequent status, **2026-10-31**: the user explicitly approves the temporary
textLength/textAt/textSlice helpers after the focused review. Earlier pending
consent statements in this dated increment describe its original baseline, not
the current status. See [INV-016 approval](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

## Contract and boundary

The selected [receiving-declaration rule](../docs/tuple-label-conversions.md)
permits a stored tuple's positions to receive new labels at an explicitly typed
declaration. It preserves position order and values. Ordinary assignment,
argument admission and return remain label-sensitive. The user's
[automatic progression instruction](README.md#automatic-progression-within-selected-contracts)
authorizes implementing this existing decision.

Implement fully initialized fixed/var declarations with explicitly written flat
scalar tuple types. Require exact ordered shape and component types. Add, remove
or change labels, including mixed positions. Evaluate the source once, preserve
its contract, and expose the destination contract on the new binding. This
needs only static type information; the runtime tuple remains ordered values.

Fresh constructors retain their distinct selected destination-routing contract.
Matching constructors work; constructors needing routing remain explicitly
unsupported rather than being admitted through positional relabeling. General
typed scalar/array storage, zero initialization, aliases, widening, nested values,
callable adaptation, access grants and native layouts are outside this increment.

## Verification

Strict TypeScript checking and all 102 interpreter groups pass on the pinned
Node 26.13.0/TypeScript 7.0.2. New checks cover reverse-named stored positions,
named/unnamed/mixed destinations, singleton Unit, source-once effects, ordinary
copies and source preservation, var replacement and same-name shadowing,
function/array use of the converted value, and before-effect rejection of
shape/type mismatches and later implicit relabeling. Contextual constructors are
kept separate by an explicit unsupported diagnostic.

The real launcher runs [011](../examples/011-tuple-label-conversion.lts), reporting
640 480 three times; check-only mode emits nothing. The editor checks the example
corpus. No ABI, native compiler, layout measurement or ownership result is claimed.

## Handoff

Preserve as igniter-v0.1.0-alpha.12 with earlier tags intact. Continue within
selected scope; inspect named fixed-slot user calls under INV-031 next. No new
helper API or syntax is introduced. Experimental text helpers still await consent.
