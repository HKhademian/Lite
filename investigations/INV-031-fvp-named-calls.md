# INV-031 — Named fixed-slot user calls in the FVP

Status: recorded (bounded implementation of existing selected rules)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-031](TOPICS.md#inv-031)

## Contract and scope

Implement the selected [fixed-slot algorithm](../docs/named-input-routing.md#fixed-destination-routing-selected)
for current user functions with explicitly typed required parameters. The
[automatic progression rule](README.md#automatic-progression-within-selected-contracts)
authorizes this existing syntax/behavior; no new language decision is needed.

Explicit labels and =name shorthand select their declared public slots. Unnamed
entries fill the next unfilled slot. Named entries may replace earlier positional
contributions; duplicate explicit labels, unknown names, missing required slots
and excess positional entries fail before effects. Check every expression under
ordinary expression rules, but require destination compatibility only of each
slot's surviving contribution. Superseded expressions remain evaluated once.

Select the callee before evaluating supplied expressions in written order. Bind
the surviving values to declaration-order parameters only after preparation
succeeds. An exit or fault stops later preparation and invocation. Apply the
same rules to self calls. Retain ordinary label-sensitive tuple transfers.

Defaults, spreads, omission, access grants, callable label adaptation and generic
input packs remain outside this increment. Temporary builtin helpers retain
positional arguments because their public labels are unselected; inputInt's
optional prompt does not establish a public prompt label. A user function bound
to a builtin spelling uses its own public parameter labels normally.

## Verification

Strict TypeScript checking and all 108 interpreter groups pass on the pinned
Node 26.13.0/TypeScript 7.0.2. Checks cover interleaving, shorthand, named
replacement with a different superseded type, invalid superseded expressions,
source-order reports, final type checks, callee selection before source-binding
replacement, early exit/faults, aggregate inputs, named recursion, invalid mapping
before effects, and rejecting invented builtin labels. Runtime preparation keeps
the written expressions and a private checked slot-to-contribution map; no public
reflection or runtime label API is added.

The real launcher runs [012](../examples/012-named-arguments.lts), reporting
123, 123 and 10 on separate lines; check-only emits nothing. Editor checks cover
the expanded corpus. No native compiler, cleanup/ownership or ABI claim follows.

## Handoff

Preserve the source as igniter-v0.1.0-alpha.13 without moving previous tags.
Investigate runtime collection storage/construction next under INV-055; fixed
arrays do not provide a selected growable token-buffer API. Stop if that work
needs an unselected owner/type/operation spelling. Text-helper consent remains
unchanged.
