# Type agreements and values across compiled libraries

Status: **user-directed design requirement, 2026-11-17; mechanism and full ABI
open**. This is not evidence of native compilation, binary imports or a selected
interface-file syntax. The current compiler path and its limits are described
in the [compiler baseline](compiler-baseline.md).

## Two connected worlds

The user distinguishes compile-time wiring diagrams and compatibility—type or
form—from runtime bits, bytes and values. Compile-time agreement is useful only
if runtime values also respect the agreement, regardless of their defining
source location or origin. This extends the selected
[shared union Kind mapping](../../../docs/union-zero.md#one-kind-mapping-for-the-same-union-type)
to the broader library boundary question.

The motivating future example is a Lite-written library compiled into artifacts
such as `.c`, `.h`, `.so`, `.a`, or an illustrative `.lth` public Lite interface,
then imported and linked as a library by another program instead of importing
its implementation source. These names illustrate possible artifacts, not an
approved format, requirement to generate every artifact, guaranteed C ABI, or
claim that the current compiler supports the route. Static versus dynamic
linking and the nature of the interface remain open.

## Required relationship

When a separately compiled producer and consumer are treated as compatible,
the values they exchange must satisfy the agreed runtime contract. Neither
matching source spellings alone nor a compiler's local inference is sufficient.
For a shared union representation, both sides must interpret each member's Kind
consistently, including equivalent order-independent union spellings. Matching
record and array contracts, function signatures and other public values have
their own layout and transfer obligations.

For data originating outside Lite, the relevant boundary must define what it
means to accept, inspect or reject the representation, including unrecognized
tags and invalid payloads. This requirement does not assume that arbitrary
bytes are a valid value, that unsafe foreign memory is always readable, or that
a compiler can prevent all external mutation or corruption. Do not silently
reinterpret incompatible data as a valid value. The handling mechanism remains
open and should be reviewed against the user's fail-closed concerns.

## Cases to establish

- A library produces an `Int64 | String` value and the application consumes it;
  repeat for both active members, with the consumer spelling the type in the
  opposite order. Preserve value, active identity and the shared Kind mapping.
- A public record or fixed array crosses the boundary with the same public type
  contract. Check field/element layout, target alignment and permitted transfer.
- A library and consumer disagree on their public representation contract.
  Compare explicit detection, adaptation and defined rejection; no silent
  acceptance should claim compatibility without a valid agreement.
- A C-originated union representation has an unrecognized Kind, and another has
  a recognized Kind with an invalid payload. Their handling must be specified
  independently; no payload is interpreted merely because bytes are present.
- Compare a producer/consumer using the same target and compatible interface
  with different targets, versions or toolchains. The intended compatibility
  guarantees and any versioning boundaries are not yet selected.

These are design cases, not executable test passes. A complete contract needs
type and member identity, sizes and alignment, Kind encodings and zero state,
calling convention and return layout, ownership and lifetime, error and cleanup
semantics, target and version compatibility, and initialization. Which rules
are language-wide, ABI-specific or adapter-provided is open. A generated
interface could carry evidence, but file naming, tooling, build/link workflow,
binary compatibility guarantees and mismatch diagnostics are not selected.

The intent is efficient separately compiled reuse with truthful compatibility,
not a mandatory runtime registry, virtual machine, GC, implicit heap allocation,
or per-access check where an applicable proof justifies another implementation.
No zero-cost, no-runtime, native safety or performance result follows without
the relevant implementation and measurements.
