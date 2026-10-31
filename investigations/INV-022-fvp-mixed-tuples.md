# INV-022 — Mixed fixed tuples in the FVP

Status: recorded (bounded implementation of existing selected rules)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)

## Question and scope

Can the named-field implementation accept interleaved named and unnamed scalar
fields without changing their meaning or runtime representation? Yes. The
[selected mixed-tuple contract](../docs/tuple-entries-and-access.md#mixed-tuples-selected)
already specifies arbitrary interleaving, numeric access to every position,
literal name access to labeled positions, and label-sensitive structural identity.
The [automatic progression rule](README.md#automatic-progression-within-selected-contracts)
authorizes this implementation without a new language decision.

## Delivery and evidence

Remove the parser/checker restrictions against mixing existing entry forms.
Retain unique labels, written evaluation order and flat scalar components.
Explicit mixed function annotations, copies, whole-value replacements and
homogeneous array elements retain each ordered label or its absence. Numeric
and named reads resolve to the same stored component. No runtime name table is
introduced.

Strict TypeScript checking and all 97 interpreter test groups pass on the pinned
Node 26.13.0/TypeScript 7.0.2. Checks include observable entry evaluation order,
mixed function contracts and array traversal, independent copies and before-effect
rejection of moved/duplicate labels and unknown fields. The real launcher runs
[010-mixed-tuples.lts](../examples/010-mixed-tuples.lts), reporting
7 green 2 true twice; check-only mode emits nothing. The editor grammar also
checks the expanded example corpus. These are interpreter results, not native
layout, ABI or performance measurements.

## Handoff

Tag this increment igniter-v0.1.0-alpha.11 and preserve prior tags. Explicit
receiving-declaration label conversion is a separate selected contract to inspect
next. Contextual constructor routing, nested tuples, rest/spread, named patterns
and field mutation remain outside this delivery. Text-helper consent is unchanged.
