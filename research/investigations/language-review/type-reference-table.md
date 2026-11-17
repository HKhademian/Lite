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
selected. The user clarifies that, in the three-section reference idea, a
zero type reference cannot identify a type; `UNKNOWN` follows from that rather
than from reserving a separate type entry. This does not itself define the
semantics of other unrecognized values or complete the union-zero revision.

The width provides a finite **encoding space**, not a uniqueness algorithm. It
cannot uniquely identify an unlimited universe of independently created types.
Whether 64 bits are practically adequate depends on the identity scope, lifetime,
allocation method, collision policy, version policy and number of types.

## Candidate: predefined references for built-in types

The user suggests reserving a common library/file namespace for internal types,
illustratively `library = 0`, `file = 0`, with a predefined type constant for
each built-in. This could give `Int64`, `String` and other agreed built-ins
reproducible references across compilations. The namespace, bit split, numerical
constants, set of built-ins, stability across targets and versions, and
implementation remain open. This is an idea for review, not a selected
encoding.

The user subsequently observes that this adds nothing to the system in the
present discussion. Keep the suggestion as explored history, not a feature to
adopt or a requirement for a special reserved built-in namespace. In
particular, predefined numbers alone do not define a persistent data format.

If aliases are transparent, `Int` and `Int64` resolve to the same identity and
thus the same reference; a distinct type based on `Int64` has its own identity.
The user clarifies that an all-zero reference identifies no type under the
proposed three-section model, not a specially reserved type entry. The detailed
encoding, the separate fields' possible values and other unknown tags remain
under review.

A stable built-in reference establishes identity, not the complete persistent
encoding of its payload. A durable representation still needs defined width,
byte order, string encoding and length, array shape, and version/format rules
where applicable. Fixed references might be useful in an explicitly designed
data format, but the user has separately proposed no general persistence
guarantee for dynamic internal type references; see [persistence](#user-direction-persistence-is-a-separate-data-contract).

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

### User correction: clean compilation

The user rejects relying on persisted build metadata as the basis for stable
identities, because a clean compilation cannot depend on an earlier build's
output. Independently built compatible libraries and consumers need to arrive
at a consistent agreement using inputs available to a fresh build. Do not
assume a previous compiler cache or generated precompiled artifact exists.

Investigate deriving identity from reproducible inputs such as a documented
library/package identity, file/module identity and declaration identity, with
canonical rules for structural and generic types. These are possible inputs,
not selected syntax, naming conventions, or an identity algorithm. They need
to work independently of declaration discovery order and be available to each
separate build. Finite encodings require a collision policy, and local numeric
slots can still need the proposed link/load reconciliation.

A source-controlled or published manifest could be an explicit input to a
clean build, unlike a disposable build cache, but the user has not chosen such
a mechanism. Rename and move stability cannot be assumed: deriving identity
solely from a name or path ordinarily changes it when that input changes;
preserving identity across renames needs another stable input or a deliberate
compatibility mechanism. Whether such stability is required, and how library
versions and forks relate, remain open.

### User idea: use the newly built library's table

The user asks whether a changed library can be built with its new fields and
table, and a consumer can then use that latest table, so both sides agree
without relying on a previous build's output. This is an important candidate:
the library artifact and its accompanying table are inputs to the consumer's
clean build, not a disposable cache that the consumer must have retained.

If the producer and a newly built consumer both use the same library artifact
and contract, its table could supply their shared type/Kind meanings even if
local numbering changed from an earlier build. The mechanism for importing,
identifying and applying that agreement remains open; the idea does not require
the compiler to reproduce an identical numeric table from source order.

Evaluate separately: a second library already compiled against an older table;
a consumer binary not rebuilt when the library changes; a value shared using
the old mapping; a changed record layout or function contract; and two library
versions used together. Such runtime cases need a defined compatibility,
rebuild, relink, translation or rejection rule. Rebuilding a library and using
its newest table in a *new* consumer establishes a possible agreement for that
pair; it does not automatically rewrite an older artifact. The specific policy
and binary/version guarantees are not selected. Persistence is discussed below.

A future [precompiled Lite representation](precompiled-lite-representation.md)
may help carry public identities and dependencies between builds, but its format,
contents, and identity-assignment algorithm are not selected. The user also
suggests a richer per-type-reference metadata table in that representation;
whether it is present at runtime or exposed to programs remains open.

The user subsequently frames old and new builds as separate dependency
instances identified by build hashes, with error, replacement, or side-by-side
as possible resolutions. See [dependency build identity](dependency-build-identity.md);
do not assume automatic reconciliation between distinct build identities.

### User direction: persistence is a separate data contract

The user does not want a guarantee that dynamic type-reference/Kind mappings
remain stable for persistent application data across rebuilds or library
changes. The user's direction is to persist raw data such as integers, strings
and fixed arrays, or use descriptive data models such as JSON, YAML or BSON,
rather than rely on a live program's internal type references. Exact supported
formats, APIs and persistent encodings remain open.

This does not remove the requirement that compatible, independently built Lite
components agree on runtime values they exchange through their shared library
or memory boundary. Persistence across builds and runtime interoperability among
linked components are distinct contracts. A precompiled library's own metadata
may still be saved as a versioned build artifact; it is not thereby a promise
that arbitrary application values' in-memory bytes are a stable data format.

Raw data also needs an explicit storage contract to be portable or durable:
width, encoding, byte order, length, schema and versioning matter. In particular,
the in-memory representation of a String, reference, or fixed array is not
automatically a cross-platform or cross-version file format. An application may
define an explicit stable format or schema, including a typed serialization;
this direction does not select a format, require JSON, or establish that raw
memory dumps are always safe.

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
