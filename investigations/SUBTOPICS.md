# Starter subtopics

Status: **question inventory only**, established 2026-10-27; lightweight execution and multilingual learning questions added 2026-10-28; module-effects and replaceable-library questions added 2026-10-30. All subtopics start as
**not started**. No investigation findings, selected mechanisms, priorities, or
implementation plans are recorded here.

These questions give selected broad [catalog topics](TOPICS.md) a manageable
starting scope. They are not exhaustive and do not prescribe a sequence. A
question may already have part of its answer in selected language contracts:
establish that evidence before treating anything as open.

Use the parent's starting references, the [contributor guide](README.md), and
the [note template](NOTE-TEMPLATE.md). Each subtopic inherits its parent's scope
and evidence requirements. When work starts, record its individual status and
coverage in the linked note, and register that note on the parent's tracking
line.

Boundaries that cross topics should be linked rather than decided twice:
ordinary transfers belong to [value semantics](TOPICS.md#inv-041); responsibility
to [ownership](TOPICS.md#inv-043); access validity to
[lifetimes](TOPICS.md#inv-045); overlap to [aliasing](TOPICS.md#inv-046);
reclamation mechanisms to [memory reclamation](TOPICS.md#inv-053); and foreign
adaptation to [foreign interfaces](TOPICS.md#inv-066). These are scopes for
investigation, not a selected memory architecture.

<a id="inv-003"></a>

## INV-003 — Scripting model

Parent: [scope, starting references, and tracking](TOPICS.md#inv-003).

- <a id="inv-003-01"></a> **INV-003.01 — Top-level execution:** What is the executable body of a source file, and how do statements produce observable effects?
- <a id="inv-003-02"></a> **INV-003.02 — Declarations and lookup:** How do top-level definitions, local helpers, forward references, and recursion interact with execution?
- <a id="inv-003-03"></a> **INV-003.03 — Script environment:** Which inputs, predefined names, and host facilities are available to a standalone file?
- <a id="inv-003-04"></a> **INV-003.04 — Growth into modules:** Which script rules remain unchanged when code is imported or moved into a package?
- <a id="inv-003-05"></a> **INV-003.05 — Module top-level effects and declaration initializers:** Should non-scripting .lt files forbid top-level side-effect execution, and how would that work when declarations are assignments with evaluated initializers? Distinguish binding introduction, function-body creation versus invocation, pure computation, compile-time evaluation, and runtime initialization. Probe literals, fn bodies with deferred effects, calls such as value := load_file(...), hidden/transitive initializer effects, imports, and cycles. How are allowed effects proved, diagnosed, or moved to an explicit entry/init operation? This is a question, not a selected ban, effect system, purity requirement, or initialization schedule.

<a id="inv-004"></a>

## INV-004 — Execution modes

Parent: [scope, starting references, and tracking](TOPICS.md#inv-004).

- <a id="inv-004-01"></a> **INV-004.01 — Native executable path:** What does a standalone native program require at deployment, and how can its dependencies remain small without a mandatory VM or tracing collector?
- <a id="inv-004-02"></a> **INV-004.02 — Script compilation and caching:** How could cold compilation, cached native launch, invalidation, and warm execution preserve the same semantics, and what are their separate latency and storage costs?
- <a id="inv-004-03"></a> **INV-004.03 — Execution-mode parity:** Which observable behaviors must agree between script execution and an ahead-of-time build, including failures and cleanup?
- <a id="inv-004-04"></a> **INV-004.04 — Restricted environments:** What would a freestanding or restricted-support profile require, which operations would be unavailable, and how would those restrictions remain explicit?

<a id="inv-008"></a>

## INV-008 — Lexical structure

Parent: [scope, starting references, and tracking](TOPICS.md#inv-008).

- <a id="inv-008-01"></a> **INV-008.01 — Source vocabularies and versions:** How could explicit, reproducible source-language vocabularies map to common tokens without ambient OS locale changing program meaning? Compare file/project selection and versioning without choosing directive syntax.
- <a id="inv-008-02"></a> **INV-008.02 — Reserved names and mixing:** How would localized keywords interact with student identifiers, dependencies, missing translations, pack upgrades, and mixed-language files without silently reinterpreting old source?
- <a id="inv-008-03"></a> **INV-008.03 — Unicode and text direction:** Which normalization, letter-variant, join-control, bidi-control, and confusable rules preserve usable names and logical token order, and which checks belong in display/review tools?
- <a id="inv-008-04"></a> **INV-008.04 — Language versus writing system:** Which scripts, transliterations, digit sets, decimal punctuation, and keyboard conventions would a supported source presentation accept, and how would each affect scanning independently of human-language choice?

<a id="inv-014"></a>

## INV-014 — Numeric semantics

Parent: [scope, starting references, and tracking](TOPICS.md#inv-014).

- <a id="inv-014-01"></a> **INV-014.01 — Concrete numeric types:** Which widths, signedness, precision, and default literal types are available?
- <a id="inv-014-02"></a> **INV-014.02 — Inference and conversion:** How do operands, expected results, and typed storage constrain numeric computation?
- <a id="inv-014-03"></a> **INV-014.03 — Arithmetic boundaries:** What happens at overflow, division by zero, non-finite values, and unrepresentable conversions?
- <a id="inv-014-04"></a> **INV-014.04 — Domain and library needs:** Which exercise cases need exact integers, decimals, arbitrary precision, or numerical library operations?

<a id="inv-016"></a>

## INV-016 — Text and characters

Parent: [scope, starting references, and tracking](TOPICS.md#inv-016).

- <a id="inv-016-01"></a> **INV-016.01 — Text units and encoding:** What do bytes, code points, and user-perceived characters mean to text operations?
- <a id="inv-016-02"></a> **INV-016.02 — Ownership and representation:** What does a string value own or reference, and what do copying and concatenation cost?
- <a id="inv-016-03"></a> **INV-016.03 — Indexing and slicing:** Which positions and boundaries are valid, and how do text views remain valid?
- <a id="inv-016-04"></a> **INV-016.04 — Construction and formatting:** How do literals, escaping, interpolation candidates, parsing, and formatting preserve text and report failure?

<a id="inv-018"></a>

## INV-018 — Type-system foundations

Parent: [scope, starting references, and tracking](TOPICS.md#inv-018).

- <a id="inv-018-01"></a> **INV-018.01 — Identity and compatibility:** Which structural or nominal facts identify types, and which facts merely establish value compatibility?
- <a id="inv-018-02"></a> **INV-018.02 — Inference boundaries:** Where can types be inferred, and where are explicit or expected contracts needed?
- <a id="inv-018-03"></a> **INV-018.03 — Constraint interaction:** How do branch results, generics, recursion, and access requirements constrain one another?
- <a id="inv-018-04"></a> **INV-018.04 — Checking and diagnostics:** What evidence admits or rejects a program, and how can a diagnostic expose the failed obligation?

<a id="inv-024"></a>

## INV-024 — Enums and unions

Parent: [scope, starting references, and tracking](TOPICS.md#inv-024).

- <a id="inv-024-01"></a> **INV-024.01 — Alternative identity:** How are enum cases and plain-union members distinguished and normalized?
- <a id="inv-024-02"></a> **INV-024.02 — Construction and initialization:** What establishes an active alternative, including defaults and zero initialization?
- <a id="inv-024-03"></a> **INV-024.03 — Payload access and replacement:** Which reads and writes target a proven payload, and which replace the complete union?
- <a id="inv-024-04"></a> **INV-024.04 — Representation boundaries:** What information identifies a runtime alternative, and what remains separate from tag encoding and ABI?

<a id="inv-027"></a>

## INV-027 — Generics

Parent: [scope, starting references, and tracking](TOPICS.md#inv-027).

- <a id="inv-027-01"></a> **INV-027.01 — Parameter and constraint language:** Which relationships must generic declarations and applications express?
- <a id="inv-027-02"></a> **INV-027.02 — Inference and compatibility:** How are instantiated contracts inferred and checked without assuming unrestricted container variance?
- <a id="inv-027-03"></a> **INV-027.03 — Specialization and sharing:** Which generated-code choices preserve semantics, and what code-size and compilation costs follow?
- <a id="inv-027-04"></a> **INV-027.04 — Recursive and public contracts:** How are recursive generic families and externally consumed generic interfaces made checkable?

<a id="inv-028"></a>

## INV-028 — Interfaces and capabilities

Parent: [scope, starting references, and tracking](TOPICS.md#inv-028).

- <a id="inv-028-01"></a> **INV-028.01 — Requirements and conformance:** How does an implementation demonstrate the exact operations a consumer needs?
- <a id="inv-028-02"></a> **INV-028.02 — Composition and conflicts:** How are overlapping requirements, default behavior, and ambiguous providers resolved?
- <a id="inv-028-03"></a> **INV-028.03 — Static provider resolution:** What information permits concrete calls without runtime provider selection?
- <a id="inv-028-04"></a> **INV-028.04 — Erased or dynamic providers:** Which representation, lifetime, permission, and dispatch contracts are needed when a provider is chosen at runtime?

<a id="inv-030"></a>

## INV-030 — Functions and calls

Parent: [scope, starting references, and tracking](TOPICS.md#inv-030).

- <a id="inv-030-01"></a> **INV-030.01 — Input and result contracts:** What does a signature guarantee about accepted values, permissions, and possible outcomes?
- <a id="inv-030-02"></a> **INV-030.02 — Body inference and recursion:** When is body-based inference sufficient, and how are recursive definitions constrained?
- <a id="inv-030-03"></a> **INV-030.03 — Call evaluation:** What is evaluated and when, including supplied inputs, exits, and required cleanup?
- <a id="inv-030-04"></a> **INV-030.04 — Public versus implementation details:** Which defaults, captures, and internal choices remain private while preserving callable compatibility?

<a id="inv-031"></a>

## INV-031 — Argument routing

Parent: [scope, starting references, and tracking](TOPICS.md#inv-031).

- <a id="inv-031-01"></a> **INV-031.01 — Labels and routing:** How do labels and positions identify the receiving input without reordering evaluation?
- <a id="inv-031-02"></a> **INV-031.02 — Omission and defaults:** Which contracts allow omission, which implementation supplies a default, and when is it evaluated?
- <a id="inv-031-03"></a> **INV-031.03 — Pack application:** How does a stored tuple pack supply a complete callable input shape?
- <a id="inv-031-04"></a> **INV-031.04 — Variadic segments:** How are extra inputs collected while retaining tuple boundaries, labels, and segment roles?

<a id="inv-032"></a>

## INV-032 — Callable values

Parent: [scope, starting references, and tracking](TOPICS.md#inv-032).

- <a id="inv-032-01"></a> **INV-032.01 — Callable compatibility:** Which input, access, and result adaptations preserve the complete callable contract?
- <a id="inv-032-02"></a> **INV-032.02 — Callable storage:** How are noncapturing and environment-bearing implementations represented in stored callable values?
- <a id="inv-032-03"></a> **INV-032.03 — Zero invocation:** What implements the selected zero-callable behavior while preserving supplied-argument effects and cleanup?
- <a id="inv-032-04"></a> **INV-032.04 — Lifetime and transfer:** Which callable values can be copied, returned, or retained under their environment's ownership contract?

<a id="inv-033"></a>

## INV-033 — Closures and captures

Parent: [scope, starting references, and tracking](TOPICS.md#inv-033).

- <a id="inv-033-01"></a> **INV-033.01 — Capture contents and permissions:** Which values or locations enter an environment, and what access does each capture permit?
- <a id="inv-033-02"></a> **INV-033.02 — Environment ownership:** Who owns captured state, and what happens when an environment is copied, transferred, or destroyed?
- <a id="inv-033-03"></a> **INV-033.03 — Escape and retention:** What proves a captured location remains valid for every permitted use of the closure?
- <a id="inv-033-04"></a> **INV-033.04 — Representation and invocation:** How can concrete and uniformly stored closures preserve their contracts, and what allocation or dispatch do they require?

<a id="inv-040"></a>

## INV-040 — Cleanup and resources

Parent: [scope, starting references, and tracking](TOPICS.md#inv-040).

- <a id="inv-040-01"></a> **INV-040.01 — Acquisition and partial construction:** Which acquired resources need cleanup when later initialization fails?
- <a id="inv-040-02"></a> **INV-040.02 — Scope exits and ordering:** Which actions run on normal completion, returns, loop exits, errors, and panics, and in what order?
- <a id="inv-040-03"></a> **INV-040.03 — Cleanup failure:** How are pending results and primary or secondary failures preserved when cleanup itself fails?
- <a id="inv-040-04"></a> **INV-040.04 — Resource protocols and deferred actions:** Which disposal or deferred-action contracts are needed beyond the already selected construct-level finally rules?

<a id="inv-041"></a>

## INV-041 — Value semantics

Parent: [scope, starting references, and tracking](TOPICS.md#inv-041).

- <a id="inv-041-01"></a> **INV-041.01 — Ordinary transfer meaning:** What observable value and effects must the selected ordinary-copy rule preserve?
- <a id="inv-041-02"></a> **INV-041.02 — Copy eligibility:** Which type and component contracts permit a copy, and how is an unavailable copy diagnosed?
- <a id="inv-041-03"></a> **INV-041.03 — Reference-bearing values:** What is preserved when a copied value explicitly contains references, without implying a deep graph clone?
- <a id="inv-041-04"></a> **INV-041.04 — Alternative transfers and optimization:** What would an explicit move or borrow mean, and when may physical copies be eliminated without changing semantics?

<a id="inv-042"></a>

## INV-042 — Mutability and access permissions

Parent: [scope, starting references, and tracking](TOPICS.md#inv-042).

- <a id="inv-042-01"></a> **INV-042.01 — Binding versus payload:** Which operations replace a binding's value, and which mutate data held by that value?
- <a id="inv-042-02"></a> **INV-042.02 — Grant admission and forwarding:** What proves authority at a call boundary, and how is it temporarily handed to nested calls?
- <a id="inv-042-03"></a> **INV-042.03 — Read-only access:** Which writes are forbidden by a read-only contract, and what changes through other permitted accesses remain observable?
- <a id="inv-042-04"></a> **INV-042.04 — Authority preservation:** How do fields, union views, returns, and callable conversions avoid silently widening permissions?

<a id="inv-043"></a>

## INV-043 — Ownership

Parent: [scope, starting references, and tracking](TOPICS.md#inv-043).

- <a id="inv-043-01"></a> **INV-043.01 — Responsibility boundaries:** Which value or scope is responsible for each resource, including resources held by components?
- <a id="inv-043-02"></a> **INV-043.02 — Ownership transfer:** How is responsibility transferred explicitly, and what remains valid at the source afterward?
- <a id="inv-043-03"></a> **INV-043.03 — Shared ownership:** What explicit mechanisms could share responsibility, and what costs and failure modes would they introduce?
- <a id="inv-043-04"></a> **INV-043.04 — Destruction responsibility:** Who disposes of the resource, and how do replacement, partial initialization, and failure affect that responsibility?

<a id="inv-044"></a>

## INV-044 — References and borrowing

Parent: [scope, starting references, and tracking](TOPICS.md#inv-044).

- <a id="inv-044-01"></a> **INV-044.01 — Reference targets and identity:** Which storage or subobject does an explicit reference designate, and what identifies that target?
- <a id="inv-044-02"></a> **INV-044.02 — Borrowed permissions:** Which read or write capabilities accompany temporary access, and can they be reduced or forwarded?
- <a id="inv-044-03"></a> **INV-044.03 — Borrow scope:** When does access begin and end, and how is that boundary expressed or inferred?
- <a id="inv-044-04"></a> **INV-044.04 — Reference values versus access grants:** How do stored references differ from temporary var or mut grants without silently making grants escapable?

<a id="inv-045"></a>

## INV-045 — Lifetimes and escape analysis

Parent: [scope, starting references, and tracking](TOPICS.md#inv-045).

- <a id="inv-045-01"></a> **INV-045.01 — Scope validity:** What establishes that a target's storage remains live throughout each access?
- <a id="inv-045-02"></a> **INV-045.02 — Calls and results:** How do input, output, and retained-access relationships describe lifetimes across a call?
- <a id="inv-045-03"></a> **INV-045.03 — Escaping environments and views:** What proof permits a closure, reference, or view to leave the scope that created it?
- <a id="inv-045-04"></a> **INV-045.04 — Proof limits and diagnostics:** Which valid patterns can the compiler establish, and how does it explain unprovable or invalid lifetime relationships?

<a id="inv-046"></a>

## INV-046 — Aliasing and exclusivity

Parent: [scope, starting references, and tracking](TOPICS.md#inv-046).

- <a id="inv-046-01"></a> **INV-046.01 — Overlap models:** Which whole values, fields, elements, and views can refer to overlapping storage?
- <a id="inv-046-02"></a> **INV-046.02 — Compatible concurrent access:** Which combinations of read and write access can coexist within a single execution context?
- <a id="inv-046-03"></a> **INV-046.03 — Disjointness proofs:** Which static facts establish non-overlap, and which source-admission obligations cannot be replaced by an optimization guess?
- <a id="inv-046-04"></a> **INV-046.04 — Reentrancy and handoff:** How do callbacks, nested grants, and recovery suspend or restore access without duplicate authority?

<a id="inv-047"></a>

## INV-047 — Allocation control

Parent: [scope, starting references, and tracking](TOPICS.md#inv-047).

- <a id="inv-047-01"></a> **INV-047.01 — Allocation triggers:** Which source operations require, permit, or forbid allocation under their contracts?
- <a id="inv-047-02"></a> **INV-047.02 — Caller control:** How could callers select allocation policy, reuse buffers, or supply storage without exposing unrestricted pointers?
- <a id="inv-047-03"></a> **INV-047.03 — Allocator and region lifetimes:** How would arenas, pools, and custom allocators constrain the lifetime of allocated values?
- <a id="inv-047-04"></a> **INV-047.04 — Allocation failure and observability:** How are exhaustion, capacity limits, and observable allocation effects represented and handled?

<a id="inv-048"></a>

## INV-048 — Storage placement

Parent: [scope, starting references, and tracking](TOPICS.md#inv-048).

- <a id="inv-048-01"></a> **INV-048.01 — Automatic placement:** Which values can the compiler place in registers or stack storage while preserving behavior?
- <a id="inv-048-02"></a> **INV-048.02 — Escaping storage:** What makes heap or other surviving storage necessary, and who controls its lifetime?
- <a id="inv-048-03"></a> **INV-048.03 — Static and per-thread storage:** What initialization, access, and cleanup rules would longer-lived storage require?
- <a id="inv-048-04"></a> **INV-048.04 — Placement control:** Which placement guarantees are useful to programmers, and how do they differ from incidental backend choices?

<a id="inv-049"></a>

## INV-049 — Initialization safety

Parent: [scope, starting references, and tracking](TOPICS.md#inv-049).

- <a id="inv-049-01"></a> **INV-049.01 — Zero and default states:** Which types have valid zero or default values, and which require another initialization path?
- <a id="inv-049-02"></a> **INV-049.02 — Reserved storage and first writes:** What permissions exist before initialization, and which writes make reads available?
- <a id="inv-049-03"></a> **INV-049.03 — Path-sensitive initialization:** How do branches, loops, calls, and early exits establish or preserve initialization facts?
- <a id="inv-049-04"></a> **INV-049.04 — Partial aggregate states:** How are initialized components tracked and cleaned up when construction stops partway?

<a id="inv-050"></a>

## INV-050 — Memory layout

Parent: [scope, starting references, and tracking](TOPICS.md#inv-050).

- <a id="inv-050-01"></a> **INV-050.01 — Scalar and product layout:** Which size, alignment, padding, and offset guarantees apply to scalars, records, and tuples?
- <a id="inv-050-02"></a> **INV-050.02 — Sequence and zero-sized layout:** How do fixed extents, element stride, empty products, and zero-sized elements retain their semantic shapes?
- <a id="inv-050-03"></a> **INV-050.03 — Alternatives and descriptors:** Which information must union values and runtime-sized owners or views retain, and where can it live?
- <a id="inv-050-04"></a> **INV-050.04 — Layout exposure and constraints:** How might explicit layout controls work, and which guarantees remain distinct from aliasing permission and calling convention?

<a id="inv-051"></a>

## INV-051 — Addresses and identity

Parent: [scope, starting references, and tracking](TOPICS.md#inv-051).

- <a id="inv-051-01"></a> **INV-051.01 — Observable identity:** Which operations can observe whether two accesses designate the same location?
- <a id="inv-051-02"></a> **INV-051.02 — Relocation and stability:** When may storage move, and what guarantees would an address-stable or pinned value require?
- <a id="inv-051-03"></a> **INV-051.03 — Subobjects and zero-sized positions:** How are identity and address observations defined for fields, elements, and zero-sized values?
- <a id="inv-051-04"></a> **INV-051.04 — Identity across replacement:** What survives when a value is replaced, a container grows, or storage is reused?

<a id="inv-052"></a>

## INV-052 — Raw memory boundaries

Parent: [scope, starting references, and tracking](TOPICS.md#inv-052).

- <a id="inv-052-01"></a> **INV-052.01 — Required low-level operations:** Which concrete workloads need address arithmetic, external storage, or representation inspection?
- <a id="inv-052-02"></a> **INV-052.02 — Permission boundaries:** How would restricted or unsafe operations be exposed without implicitly granting them to ordinary code?
- <a id="inv-052-03"></a> **INV-052.03 — Validity and provenance:** What establishes that an address denotes valid, aligned, initialized storage with the requested access?
- <a id="inv-052-04"></a> **INV-052.04 — Reinterpretation and foreign memory:** Which checks and obligations apply to byte casts, external buffers, and externally managed lifetimes?

<a id="inv-053"></a>

## INV-053 — Memory reclamation

Parent: [scope, starting references, and tracking](TOPICS.md#inv-053).

- <a id="inv-053-01"></a> **INV-053.01 — Deterministic reclamation:** Which ownership contracts permit disposal at a defined point without global reachability analysis?
- <a id="inv-053-02"></a> **INV-053.02 — Shared-lifetime mechanisms:** What reference-counting or other shared-retention options would cost, including updates and finalization?
- <a id="inv-053-03"></a> **INV-053.03 — Cycles and tracing:** Which shared graphs can retain cycles, and what explicit policy or tracing mechanism could address them?
- <a id="inv-053-04"></a> **INV-053.04 — Failure and host boundaries:** How does reclamation interact with cleanup failure, foreign resources, callbacks, and program shutdown?

<a id="inv-055"></a>

## INV-055 — Runtime-sized arrays and lists

Parent: [scope, starting references, and tracking](TOPICS.md#inv-055).

- <a id="inv-055-01"></a> **INV-055.01 — Owner and descriptor:** What storage does a runtime-sized sequence own, and what do its length and capacity mean?
- <a id="inv-055-02"></a> **INV-055.02 — Growth and replacement:** When can backing storage change, and how does growth affect existing accesses?
- <a id="inv-055-03"></a> **INV-055.03 — Copies and explicit sharing:** How does the ordinary-copy rule apply to the owner, and which explicit alternatives need separate contracts?
- <a id="inv-055-04"></a> **INV-055.04 — Element lifecycle:** How do insertion, removal, resizing, and allocation failure preserve element initialization and cleanup?

<a id="inv-056"></a>

## INV-056 — Slices and views

Parent: [scope, starting references, and tracking](TOPICS.md#inv-056).

- <a id="inv-056-01"></a> **INV-056.01 — View shape:** Which offset, count, stride, and source information define a view?
- <a id="inv-056-02"></a> **INV-056.02 — Access permissions:** Which views permit reads or writes, and how is their authority bounded by the source?
- <a id="inv-056-03"></a> **INV-056.03 — Lifetime and invalidation:** What keeps the source valid, and which replacements or resizes invalidate a view?
- <a id="inv-056-04"></a> **INV-056.04 — Bounds and composition:** How do indexing and slicing a view preserve valid bounds and nested-view meaning?

<a id="inv-061"></a>

## INV-061 — Compiler structure

Parent: [scope, starting references, and tracking](TOPICS.md#inv-061).

- <a id="inv-061-01"></a> **INV-061.01 — Frontend contracts:** What information should scanning, parsing, name resolution, and syntax diagnostics produce?
- <a id="inv-061-02"></a> **INV-061.02 — Semantic analysis:** How are type, initialization, access, lifetime, and other proof obligations represented and checked?
- <a id="inv-061-03"></a> **INV-061.03 — Intermediate representations:** Which explicit operations and effects must survive lowering so transformations remain valid?
- <a id="inv-061-04"></a> **INV-061.04 — Backend boundaries:** How are target layout, code generation, runtime support, and diagnostics connected without making backend accidents language rules?

- <a id="inv-061-05"></a> **INV-061.05 — C and LLVM lowering parity:** What common typed operations can drive C emission and direct LLVM generation, and how are LiteLang evaluation, numeric, copy, check, failure, and cleanup semantics preserved where backend behavior differs? Compare implementation effort and emitted cost without selecting a backend or order.

<a id="inv-063"></a>

## INV-063 — Optimization contracts

Parent: [scope, starting references, and tracking](TOPICS.md#inv-063).

- <a id="inv-063-01"></a> **INV-063.01 — Specialization versus code sharing:** When do concrete generic instantiations need separate code, and when can implementations be shared without boxing or changing behavior? Measure speed, binary growth, and compilation cost.
- <a id="inv-063-02"></a> **INV-063.02 — Inlining versus shared helpers:** Which call paths benefit from inlining, and when do outlined checks, adapters, or cleanup reduce code size at an acceptable execution cost?
- <a id="inv-063-03"></a> **INV-063.03 — Proof-based cost elimination:** What facts justify removing physical copies, bounds checks, initialization stores, or temporary environments while preserving ordinary-copy, access, failure, and cleanup contracts?
- <a id="inv-063-04"></a> **INV-063.04 — Link-time reachability:** How can dead-code removal and optional library boundaries exclude unused support, including metadata, registration, and failure helpers, without dropping reachable behavior?
- <a id="inv-063-05"></a> **INV-063.05 — Lean code from replaceable libraries:** How can explicit standard-module dependencies and alternative providers generate small code without retaining unused implementations, wrappers, dispatch machinery, metadata, or runtime services? Compare direct calls, specialization, shared helpers, cross-module optimization, and linking on equivalent workloads; measure code growth and deployment dependencies while preserving selected behavior. No zero-overhead or size guarantee is implied.

<a id="inv-064"></a>

## INV-064 — Runtime responsibilities

Parent: [scope, starting references, and tracking](TOPICS.md#inv-064).

- <a id="inv-064-01"></a> **INV-064.01 — Minimal program support:** Which startup, termination, and support facilities does an ordinary native program actually need?
- <a id="inv-064-02"></a> **INV-064.02 — Generated code versus shared services:** Which checks and operations can be local code, and which require reusable runtime machinery?
- <a id="inv-064-03"></a> **INV-064.03 — Runtime facilities and costs:** What allocation, failure transport, metadata, and cleanup services are required by the eventual contracts?
- <a id="inv-064-04"></a> **INV-064.04 — Linking and compatibility:** How are optional services included, and how do compiler and runtime versions agree on their boundary?

- <a id="inv-064-05"></a> **INV-064.05 — Feature footprint accounting:** Which startup, allocation, string/I/O, closure, panic/aggregation, and concurrency facilities are retained by each feature, and how can generated reports expose their code/data/metadata and dependency costs?

<a id="inv-065"></a>

## INV-065 — Calling conventions and ABI

Parent: [scope, starting references, and tracking](TOPICS.md#inv-065).

- <a id="inv-065-01"></a> **INV-065.01 — Value and aggregate passing:** How are scalars, products, and runtime descriptors passed and returned across compiled boundaries?
- <a id="inv-065-02"></a> **INV-065.02 — Callable environments:** How do function values and closure environments preserve invocation and lifetime contracts across an ABI?
- <a id="inv-065-03"></a> **INV-065.03 — Failure and cleanup transfer:** How are returned errors, panics, and cleanup obligations transported across calls?
- <a id="inv-065-04"></a> **INV-065.04 — Compatibility and targets:** Which ABI properties are target-specific, and how are representation changes versioned independently of source syntax?

<a id="inv-066"></a>

## INV-066 — Foreign interfaces

Parent: [scope, starting references, and tracking](TOPICS.md#inv-066).

- <a id="inv-066-01"></a> **INV-066.01 — Foreign type mapping:** Which foreign scalars, aggregates, pointers, and layouts can be represented with explicit conversions?
- <a id="inv-066-02"></a> **INV-066.02 — Memory and resource ownership:** Who allocates, retains, and frees foreign data, and what bounds access from safe code?
- <a id="inv-066-03"></a> **INV-066.03 — Callbacks and retention:** What keeps callbacks and their environments valid when foreign code stores or later invokes them?
- <a id="inv-066-04"></a> **INV-066.04 — Failure and unwinding boundaries:** Which errors or panics can cross the boundary, and what adapters preserve cleanup and host contracts?

<a id="inv-068"></a>

## INV-068 — Concurrency and parallelism

Parent: [scope, starting references, and tracking](TOPICS.md#inv-068).

- <a id="inv-068-01"></a> **INV-068.01 — Execution and task model:** What are the units of concurrent work, and how are their start, completion, and results observed?
- <a id="inv-068-02"></a> **INV-068.02 — Data transfer and sharing:** Which values may move or be shared between concurrent contexts, with what permissions and lifetime proof?
- <a id="inv-068-03"></a> **INV-068.03 — Async suspension and retention:** What state and resources survive suspension, and how is their storage and ownership represented?
- <a id="inv-068-04"></a> **INV-068.04 — Cancellation and cleanup:** How does cancellation interact with pending work, failures, resource disposal, and structured lifetimes?

<a id="inv-069"></a>

## INV-069 — Memory ordering

Parent: [scope, starting references, and tracking](TOPICS.md#inv-069).

- <a id="inv-069-01"></a> **INV-069.01 — Data-race definition:** Which conflicting accesses constitute a race, and what behavior is guaranteed or rejected?
- <a id="inv-069-02"></a> **INV-069.02 — Atomic operations:** Which values and operations can be atomic, and what alignment or representation obligations apply?
- <a id="inv-069-03"></a> **INV-069.03 — Visibility and ordering:** Which observations do synchronization operations order between concurrent contexts?
- <a id="inv-069-04"></a> **INV-069.04 — Safe abstraction boundaries:** How do high-level concurrent APIs expose sufficient guarantees without requiring every caller to reason about low-level atomics?

<a id="inv-071"></a>

## INV-071 — Standard-library boundaries

Parent: [scope, starting references, and tracking](TOPICS.md#inv-071).

Later questions added 2026-10-30, all **not started**. The replaceable-standard
goal is selected; the mechanisms below are unresolved.

- <a id="inv-071-01"></a> **INV-071.01 — Standard-module swapping:** How does a project explicitly choose a replacement standard module/file, at what granularity, and how are transitive dependencies, module/type identity, conflicts, versions, and reproducible builds handled? Distinguish build-time provider selection from runtime replacement; neither mechanism is selected.
- <a id="inv-071-02"></a> **INV-071.02 — Compiler primitives versus library definitions:** Which types, operations, literal contracts, and support hooks are compiler-defined, which can live in replaceable standard modules, and what obligations must an alternative provider satisfy? How do incompatible providers fail clearly without an implicit standard import?
- <a id="inv-071-03"></a> **INV-071.03 — Interface and implementation definition locations:** Where do public contracts and their implementations live: together, in separate modules/packages/files, or in generated interface artifacts? How does a consumer bind an implementation to a contract, and how are visibility, generic bodies, compile-time needs, compatibility, and separate compilation checked without mandatory handwritten headers or duplicated signatures? Coordinate general package boundaries with [INV-007](TOPICS.md#inv-007) and code costs with [INV-063.05](#inv-063-05).

<a id="inv-072"></a>

## INV-072 — Tooling and diagnostics

Parent: [scope, starting references, and tracking](TOPICS.md#inv-072).

- <a id="inv-072-01"></a> **INV-072.01 — Localized vocabulary and APIs:** Which keyword, predefined-type/value, teaching-API, diagnostic, documentation, and lesson vocabulary must be available for a complete first lesson, and how can aliases retain one underlying symbol/contract?
- <a id="inv-072-02"></a> **INV-072.02 — Editing and source locations:** How can completions, formatting, debugging, search, accessibility, and mixed-direction editing preserve actual source spellings, meaningful positions, and the chosen presentation?
- <a id="inv-072-03"></a> **INV-072.03 — Conversion and name mapping:** What syntax/symbol-aware operations can convert vocabulary or explicitly rename names without changing bindings, public APIs, named labels, strings, or comments unintentionally?
- <a id="inv-072-04"></a> **INV-072.04 — Reference form and collaboration:** How do localized files, canonical files with localized editor views, side-by-side English views, and mixed-team workflows differ in reproducibility, review, pack maintenance, and unsupported dependency handling?

<a id="inv-073"></a>

## INV-073 — Testing and verification

Parent: [scope, starting references, and tracking](TOPICS.md#inv-073).

- <a id="inv-073-01"></a> **INV-073.01 — Presentation conformance:** Which paired cases establish that source presentations preserve types, evaluation, access, failure, cleanup, and API identity through the same semantic core?
- <a id="inv-073-02"></a> **INV-073.02 — Conversion guarantees:** Which binding, collision, scope, public-label, literal/comment, source-map, and round-trip cases distinguish semantic preservation from exact source recovery, including unsupported translations?
- <a id="inv-073-03"></a> **INV-073.03 — Learner evaluation:** How do paired familiar-language and English lessons measure logic/programming understanding separately from reading, vocabulary, keyboard/script familiarity, and transfer to the reference presentation?
- <a id="inv-073-04"></a> **INV-073.04 — Localization footprint checks:** Which native builds show whether unused vocabulary/diagnostic resources remain out of executables, and which required program strings, metadata, and debug resources explain any measured size or runtime difference?

<a id="inv-074"></a>

## INV-074 — Performance evaluation

Parent: [scope, starting references, and tracking](TOPICS.md#inv-074).

- <a id="inv-074-01"></a> **INV-074.01 — Workloads and budgets:** Which representative workloads and target-specific budgets assess lightness and near-C performance, including small scripts and larger programs, without inventing an unsupported universal threshold?
- <a id="inv-074-02"></a> **INV-074.02 — Executable and deployment size:** How are file bytes, sections, debug/stripping state, static/dynamic dependencies, required runtime bytes, and loaded memory reported separately?
- <a id="inv-074-03"></a> **INV-074.03 — Incremental feature footprint:** What does the minimal program retain, and how much code, data, metadata, and startup work does adding each individual feature retain?
- <a id="inv-074-04"></a> **INV-074.04 — Time and memory protocol:** How are cold build, cached launch, startup, steady-state time, relevant tail latency, allocation count/bytes, and peak memory measured with reproducible inputs and repetitions?
- <a id="inv-074-05"></a> **INV-074.05 — Fair native comparison:** How do equivalent C and LiteLang cases match algorithms, work, numeric behavior, safety, failure semantics, and outputs before speed and size are compared?
- <a id="inv-074-06"></a> **INV-074.06 — Backend conformance and regression evidence:** If C and LLVM paths are implemented, which differential cases establish observable parity, and what artifacts and thresholds distinguish real regressions from noise?
