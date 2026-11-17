# Precompiled Lite representation

Status: **user-directed future investigation, 2026-11-17**. Artifact format,
contents, compilation stages, compatibility rules and implementation are open.
This is not an executable feature or an approved file extension.

## User's direction

The user considers it important for Lite eventually to have a **precompiled
Lite representation of libraries, modules, and files**, distinct from emitted
C or another target representation. This could improve incremental builds,
library publication, and separately compiled Lite-to-Lite use.

“Not emitted” here distinguishes the proposed Lite-level representation from
emitted target code; the representation would still need to be stored or
transmitted as an artifact. Its precise contents and whether it is source,
serialized compiler data, intermediate representation, interface information,
or a combination have not been selected. Precompiled does not by itself imply
machine code or that implementation source is available to a consumer.

## Candidate roles to compare

- **Public interface:** record the exposed types, symbols, functions and their
  contracts so a consumer can check a separately compiled library without
  importing implementation source.
- **Reusable compilation state:** preserve enough validated information for
  incremental builds to avoid recomputing unaffected work. How much semantic or
  implementation detail to retain is open.
- **Publishable Lite artifact:** distribute the needed Lite-level metadata,
  target code or other components for reusable libraries. Which components are
  required, optional, source-available, target-specific or private remains open.
- **Type and value agreement:** carry or support stable public type identities,
  aliases, distinct types, normalized union Kind mappings and other contracts.
  An artifact is not itself a uniqueness algorithm or proof that every linked
  producer and consumer is compatible.

One artifact could serve multiple roles, or separate artifacts could serve
interfaces, reusable implementation, and target output. No packaging layout or
linking strategy is selected. Generics and compile-time functions need special
analysis: consumers may need implementation information to instantiate or
execute them even if ordinary non-generic APIs can use only an interface and
linkable code. Do not infer that every published library must expose source.

## Candidate: a type-reference and metadata table

The user suggests that the precompiled Lite representation could have a richer
table of internal information and metadata for each type reference. This is a
candidate design, not a selected table format, identifier encoding, public
reflection mechanism, or runtime registry.

Conceptually, an entry might help the compiler or linker find the type's stable
identity and relevant structural or representation information. The exact
contents depend on the type and on the artifact's role; investigate whether an
entry should describe, for example:

- module/file ownership and the identity used to reconcile independently built
  libraries;
- whether a name is a transparent alias to an existing identity or declares a
  distinct identity, and an underlying type reference where applicable;
- members or component types of records, tuples, arrays, enums and unions,
  including normalized union members and their agreed Kind mapping where needed;
- public signatures, visibility and dependencies needed by consumers;
- size, alignment, field offsets, calling convention or other target-specific
  facts, where the selected contract needs them.

Those entries are illustrative possibilities, not a requirement that every
type has every field. Compare separating target-independent semantic identity
from target-specific representation, while ensuring the two layers agree at
link and runtime. Decide what metadata is exported publicly, kept private for
incremental builds, or omitted; a public interface should not accidentally
expose private fields merely because the compiler needs layout information.

A table reference is useful only if independently built components can resolve
it consistently. Definition reordering, aliases, distinct identity, generic
instances, library versions, collisions and link/load-time reconciliation
still need rules. No runtime table, lookup on every access, user-visible
reflection, allocation, or 64-bit reference format follows automatically from
having compile-time metadata.

## Incremental and separate-build requirements

A valid cache key may need compiler and artifact format versions, target and
flags, the relevant source and imported public/implementation contracts, and
compile-time inputs or effects. The precise dependencies must follow what the
compiler actually uses. A changed private implementation, public type, library
version or external compile-time file may require different rebuild scopes;
recorded dependencies must not miss a change merely to avoid rebuilding.

Compare at least these cases:

1. Build a library, compile a consumer against its precompiled Lite contract in
   a later invocation, then link them without implementation-source imports.
2. Reorder unrelated definitions and rebuild. Previously published identities
   and union Kind meanings must continue to satisfy the chosen compatibility
   contract; declaration-order counters alone do not ensure this.
3. Change an exposed type or function contract and diagnose, rebuild or otherwise
   handle affected consumers according to a future compatibility policy. Do not
   silently claim that incompatible artifacts agree.
4. Change a private implementation detail without changing its public contract;
   determine which internal artifact or consumers genuinely need rebuilding.
5. Change a compile-time input file used to generate public data or code; the
   appropriate dependent artifact must not remain stale.
6. Load a malformed, stale or incompatible artifact. Define validation and
   diagnostics before trusting embedded type/layout information or code.

These are investigation cases, not tests that have passed. Content identities,
determinism, collision handling, path/identity stability, shared caches,
trusted/untrusted artifacts, compiler-version transitions, target and ABI
boundaries, generic instantiation, dependencies, format evolution, link-time
relocation and diagnostics all need specification.

## Performance and footprint

Reusing validated work may reduce incremental build time and make publication
more practical, at the cost of artifact size, serialization, dependency tracking,
versioning and maintenance. The representation could be target-independent,
target-specific, layered, or contain parts of each; none is selected. Its use
by the compiler does not imply a runtime registry or a runtime dependency in a
finished program. Measure clean build, incremental rebuild, cache hit/miss,
artifact size and resulting binary/runtime costs rather than treating
precompilation as automatic evidence of a speedup.

See [type reference identity](type-reference-table.md), [separate-library value
compatibility](separate-library-value-compatibility.md), and
[compile-time evaluation](../../../docs/compile-time-evaluation.md).
