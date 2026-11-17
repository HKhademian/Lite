# Two-level type references for union Kind

Status: **user idea under investigation, 2026-11-17**. No type-reference format,
Kind width, registry, identifier assignment, runtime table or implementation is
selected. The [existing union contract](../../../docs/union-zero.md#one-kind-mapping-for-the-same-union-type)
requires a shared mapping for the same normalized type at compatible boundaries;
the mapping mechanism and `UNKNOWN` semantics remain open.

## User's idea

Use a table of type references, unique within its intended scope, potentially
with two layers: one identifying a module (local or imported), the other an
inner type reference. A distinct type can have its own reference while pointing
to an underlying type; an alias can resolve to the same reference. The user
asks whether 64 bits are enough. The exact table structure and whether the two
references are stored in every value or only in type metadata are not specified.

## Illustrative split

The user suggests a possible 64-bit split of **16 bits for a library, 32 bits
for a file/module within that library, and 16 bits for a type within that file**.
Before reservations, these fields encode at most 65,536 library slots,
4,294,967,296 file slots per library, and 65,536 type slots per file. The user
sees the library limit as a practical concern only for exceptionally large
projects and also suggests that the file part might use 32 bits or more. More
than 32 bits there would require changing another field, the total width, or
the encoding; no alternative split or overflow policy is selected.

An earlier 32/32 module/type split was only an illustration. Neither split is
selected. Reserving all-zero as `UNKNOWN` would consume an encoding, but would
not itself define the semantics of other unrecognized values or replace the
current selected union-zero rule.

The width provides a finite **encoding space**, not a uniqueness algorithm. It
cannot uniquely identify an unlimited universe of independently created types.
Whether 64 bits are practically adequate depends on the identity scope, lifetime,
allocation method, collision policy, version policy and number of types.

## Worked identity examples

- A transparent `Int` alias and `Int64` resolve to the same type identity and
  therefore the same reference, if this mechanism is adopted. Merely assigning
  each spelling a table slot would not make them distinct types.
- A distinct `UserID` based on `Int64` has a different identity reference while
  its descriptor can separately refer to the underlying type/layout. It is not
  an alias and sharing layout does not make values interchangeable. This is a
  possible metadata organization, not a requirement for two runtime words per
  `UserID` value.
- Two modules can each declare a different `UserID`; equal names or layouts must
  not accidentally merge their identities. A public type imported in a consumer
  must retain the library's identity rather than receive a new one by import.
- Union types `A | B` and `B | A` normalize to the same type; when a shared
  union representation uses global member references as Kind values, the same
  member must have the same reference in independently built compatible
  components. Different active values of that union may still hold different
  member references.
- Fixed arrays, tuples, generic instantiations, anonymous/local types and nested
  unions need identity rules too. A module/local-number pair for declarations
  alone does not yet define canonical identities for all composite types.

## Assignment and separate builds

1. **Coordinated identifiers:** a registry or published package/module identity
   assigns collision-free references within its authority. This needs a process
   for independent authors, offline builds, dependency versions, local types,
   package forks and exhaustion; a runtime registry is not automatically required.
2. **Deterministic derived identifiers:** derive identifiers from a specified
   stable type identity. Independent builds can reproduce them, but finite hashes
   can collide. A design needs collision detection and a defined resolution or
   rejection strategy; merely choosing a 64-bit hash is not a proof of uniqueness.
3. **Link/load-time assignment or translation:** components can carry local
   identifiers and metadata that a linker or loader resolves. This can avoid a
   single global namespace but adds a contract for separately built libraries,
   dynamic loading, shared memory and values that outlive a particular process.
   Memory addresses or per-process table indices are not automatically stable
   across processes or independent builds.

These are families of options, not exhaustive implementations or recommendations
selected by the user. Defining how a module receives its identity, how published
identities survive rebuilds, renames and revisions, and which compatibility
boundaries are promised is a central prerequisite. Never silently equate types on
an undetected collision. Interface files or generated metadata might carry this
agreement but their format is open.

### User idea: reconcile library-local references at link time

The user suggests that a library could assign a local reference to an imported
library, with the relationship adjusted when independently built libraries are
linked. The stable-identity problem remains: reordering declarations or building
producer and consumer separately must not silently turn one public type into a
different one.

Conceptual example, not a selected encoding: library A calls an imported
library's local slot `3`; the final program assigns that library slot `7`. The
build/link mechanism needs an identity for the imported library that establishes
that A's `3` and the program's `7` refer to the same contract. It must then
ensure that all tags **actually exchanged at runtime** use the agreed meaning.
Possible techniques include relocatable symbolic references resolved at link or
load time, runtime indirection, and explicit translation at boundaries. Their
availability and costs differ; no technique is selected.

Changing a number in a compile-time table alone is insufficient if generated
code or stored data still produces the old Kind. The design must cover code and
static data containing references, values constructed after linking, dynamically
loaded components, and the lifetime of already-created values. Static linking
may resolve some symbolic references without a runtime lookup; separately loaded
libraries or dynamic values may need other mechanisms. No mandatory registry,
indirection or per-access conversion follows solely from this proposal.

The scope of the reconciled reference matters: process-local slots agreed by
linked components do not automatically have the same numeric meaning in a
separately linked process or shared file/memory. Cross-process sharing therefore
needs either a shared stable mapping or a defined translation boundary. This
must be reconciled with the user's requirement that independently compiled
compatible components agree; local numbering cannot be presented as universally
stable merely because a linker can resolve it within one program.

Declaration-order stability is also separate from link-time numbering. Compare
persisted interface/manifest identifiers (including deletion, reuse and version
policy) with identifiers derived from stable definition identities (including
collisions, renames, generated and generic types). A plain declaration counter
can change when definitions are reordered. These are options for later review,
not a selected identity algorithm.

## Footprint and access

A static compiler table can exist only during compilation; a runtime table is
needed only if the selected observable operations require runtime lookup. A
64-bit integer Kind in each union value is possible without a lookup table on
ordinary matching paths, but an explicit per-value field may increase layout,
loads and cache use compared with a smaller union-local tag. Actual overhead
also depends on payload size, alignment, padding, optimizations and whether the
identity is statically known. A global Kind may reduce remapping between unions;
no performance or ABI benefit is established without an implementation and
measurement. A target that cannot handle a 64-bit field natively may need
additional work.

The `UNKNOWN` state, invalid external tags, payload validity, ownership,
collision handling, cross-target representation and ABI, and generated code
remain separate design questions. Weigh stable separately compiled Lite
libraries and the no-GC/minimal-runtime goals together. This idea does not mean
all raw 64-bit patterns are safe type references or that arbitrary foreign memory
is already a valid Lite value.
