# Memory and performance

Status: **lightweight native execution priorities and ordinary/advanced memory-control boundary selected 2026-10-28; tuple/fixed-array storage contracts selected; complete memory model, compiler backend, and ABI unchosen**.

## Purpose

Make a convenient language compatible with predictable data representation and a small runtime. Do not mistake an attractive syntax for a proven performance result.

## Goals

- Native execution and useful performance near C on suitable workloads.
- Small final executables, low memory overhead, and fast startup as core design priorities.
- Ordinary native programs deployable without a mandatory VM or tracing garbage collector.
- Small support machinery, with optional facilities included only when their use requires them where practical.
- Unboxed scalar values and records where their semantics allow it.
- Predictable collection storage and explicit expensive representations.
- Specialization and static dispatch where appropriate.
- Shared collection capabilities for primitive and record elements without a mandatory boxed-wrapper API split.
- Metadata and tags that can lower to ordinary local state.
- Optional facilities linked only when used, where practical.

No benchmark, compiler, allocator, or binary-size result exists for this project. Universally outperforming C is not an established guarantee.

Selected target clarification, **2026-10-31**: readable TS emission first supports
early self-hosting and remains an important web target. C is the first native
target and an important maintained route for shippable libraries/projects and
migration outside Lite. Possible AssemblyScript/early Wasm support remains an
investigation. Native no-mandatory-VM/tracing goals remain native-path goals;
this does not claim them for a JS host or an unverified AS runtime profile. See
[INV-061 direction](../investigations/INV-061-first-compiler-output.md).

## Ordinary and advanced memory control

Selected by the user, **2026-10-28**: ordinary LiteLang programs should receive
safe automatic storage and cleanup without routinely requiring manual
allocation/freeing, explicit ownership bookkeeping, or lifetime annotations.
The compiler should carry that work where possible. Consequential copying,
sharing, and ownership changes must retain understandable contracts and the
selected copy/access semantics.

Current FVP focus clarified **2026-10-31**: use ordinary copy semantics and let
compiler/post-compilation optimizations remove physical copying where they can
preserve all observable behavior. Explicit noncopying modes are later work. This
sets the current investigation boundary; it does not select an optimization pass
or make a zero-copy/performance claim. See
[INV-055 clarification](../investigations/INV-055-fvp-owner-boundary.md).

Advanced memory controls must remain available through an explicit step with
little ceremony. They should stay outside the default beginner surface and be
introduced as needed within the same language. Importing a built-in memory
module is the user's example of a suitably small step; no module name, import
spelling, API, or particular advanced facility is selected. Making an API
available does not by itself change unrelated code's semantics or waive its
safety checks. Any additional responsibilities belong to the advanced
operations' eventual contracts.

This selects the usability boundary, not a reclamation mechanism. Ownership
inference, borrowing, reference counting, cycle handling, resource-copy
eligibility, escape checks, exact cleanup timing, placement/allocator controls,
and raw-memory boundaries remain investigations. Ordinary native execution
without a mandatory VM or tracing collector remains a goal. Advanced facilities
are an intended capability beyond the first useful milestone; this decision
does not require their implementation in the tiny demonstrator.

## Lightweight native execution priority

Selected by the user, **2026-10-28**: being light, fast, and economical in runtime
and final executable size is central to LiteLang's design. These priorities apply
to ordinary scripts as well as larger applications. They guide language, library,
compiler, and deployment decisions together with readability and safety.

The intended native path should require neither a VM nor a tracing garbage
collector. This selects a goal, not an ownership system or an implemented no-GC
guarantee. Allocation, cleanup, bounds checks, failure transport, and necessary
metadata still require an implementation. Small runtime support can be generated
inline or linked; removing a separately named runtime library does not erase its
bytes or execution cost. The compiler's own LLVM dependency need not become a
dependency of the produced program.

Review substantial features for representation, allocation, copying, indirection,
dispatch, checks, cleanup, startup, and linked code. Prefer static resolution and
direct representations where semantics allow them. Keep optional facilities out
of programs that do not need them where practical. Explain any unavoidable base
support. A smaller file obtained by moving required support into a shared library
is a deployment tradeoff, not proof of a smaller total deployment.

Preserve defined behavior: selected copies cannot silently become moves or live
borrows, required checks cannot disappear without proof, and cleanup/failure
information cannot be dropped to meet a speed or size target. Specialization,
inlining, shared helpers, and link-time optimization must be evaluated for both
speed and code size. No numeric size budget, mandatory optimization mode, or
universal ordering among these targets is selected yet.

### Candidate implementation direction

Status: **recommendations for investigation, not selected mechanisms**.

1. **Native data.** Build on inline fixed arrays, zero-payload Unit, metadata-free
   tuple labels, and unboxed concrete values where their contracts permit them.
   Runtime unions, dynamic sequences, and erased providers still retain the
   information their observations require. Inline storage does not mandate stack
   placement or settle the ABI.
2. **Ownership compatible with copying.** Investigate owned storage,
   deterministic cleanup, lifetime-checked views, and explicit sharing. Define
   copy eligibility and effects for strings, lists, resource-bearing records, and
   closure environments before choosing reclamation. Copying an owning pointer
   descriptor alone cannot create two safe independent owners. Explicit transfer,
   clone, or sharing operations need their own contracts; do not silently change
   ordinary-copy semantics. Compare reference-count costs and cycle policies as
   alternatives, without assuming automatic reference counting.
3. **Static abstraction.** Retain concrete provider/element types for generic
   specialization and direct calls. Compare selective specialization with shared
   implementations to control code size. Runtime-erased providers and escaping
   closures need defined storage, lifetime, and dispatch policies.
4. **Compiler core and backends.** Investigate a typed intermediate representation
   preserving evaluation order, numeric semantics, copies, access/lifetime facts,
   checks, and cleanup. C generation followed by an optimizing C compiler is a
   practical first candidate; direct LLVM generation can be evaluated against
   the same core later. Neither backend nor implementation order is selected.
   C emission must preserve LiteLang behavior where C differs, including overflow,
   shifts, evaluation order, and failure handling. LLVM alone does not establish
   efficient lowering or memory safety.
5. **Small feature support.** Account separately for startup, allocation, strings,
   formatting/I/O, panic transport, failure aggregation, closure support, and any
   concurrency services. Evaluate local branches, shared helpers, metadata, dead
   code removal, and optional library boundaries without changing their required
   semantics. Arbitrary retained failures still need a valid storage policy.
6. **Systems boundaries.** Investigate C ABI interoperation, controlled raw-memory
   access, target layout, and restricted/freestanding environments separately.
   Native performance does not alone establish suitability for kernels or devices;
   no raw-pointer syntax or freestanding profile is selected here.

A proposed first executable subset is arithmetic, functions, loops, records, and
fixed arrays, followed by owned dynamic storage and closures. Every implemented
subset must state its supported semantics and remaining gaps. This is a candidate
validation sequence, not a selected milestone or permission to weaken contracts.

### Performance evidence and size accounting

No LiteLang execution or performance results exist yet. Investigate representative
workloads and budgets before publishing numbers. Record at least:

- Correctness outputs and matching safety, numeric, and failure behavior.
- Steady-state execution, cold/warm startup, compilation/link time, and tail
  latency where relevant; distinguish a cached script launch from a cold build.
- Allocation count/bytes, peak live memory, and reclamation behavior, including
  escaping captures, resource copying, and shared cycles where supported.
- Final executable file bytes and section contributions, required runtime/library
  bytes and dependencies, and loaded memory separately. State stripped/debug,
  static/dynamic linking, target ABI, optimization, LTO, and dead-code-removal
  settings; distinguish a minimal program's base cost from each feature's delta.
- Same-work comparisons with C using documented toolchains, flags, hardware,
  workload inputs, repetition/aggregation, and raw results. Never infer general
  superiority from one benchmark or compare different correctness contracts.

Begin with an empty program, integer computation, fixed-array traversal, and a
plain record call; then add strings/I/O, dynamic storage, capturing callables,
checks/recovery, and cleanup individually. Repeat failure and boundary cases as
well as success paths. Future differential checks between C and LLVM backends
must compare observable behavior before comparing speed or size. No commands or
benchmarks listed here are implemented by this documentation update.

See the [focused investigation points](../investigations/lightweight-native-execution.md)
for owning topic IDs, starting questions, and expected evidence. External
inspiration is recorded in [references](references.md#lightweight-native-execution-reviewed-2026-10-28);
other languages' claims do not establish LiteLang results.

## Runtime-cost review

Status: **supporting design review, 2026-10-26; consequences of current contracts and recommendations, not new language selections**.

The goal is readable, strongly typed source whose ordinary operations can lower to native code with little support machinery. Reducing runtime needs means moving decisions into compilation where their inputs are static, while preserving behavior when values are known only during execution. Shortening syntax alone does not remove work.

### Separate compilation, generated code, and shared support

- **Compilation:** resolve names, tuple labels, fixed extents, supported operations, static type compatibility, and the selected initialization/access proofs. These facts do not inherently need a per-value dictionary or runtime type checker.
- **Generated execution:** evaluate expressions, copy observable values, select a union alternative, check an unknown index, and run required cleanup. Native instructions and local state can implement these operations; their existence does not imply an interpreter or managed VM.
- **Shared support:** allocation, failure transport, aggregation, or other facilities may need reusable code and metadata under the eventual contracts. Whether that support is inline, statically linked, dynamically linked, or provided by a runner remains open.

The selected name `literun` does not settle which programs need a separate runtime executable. Naming a runtime and ABI does not establish a mandatory execution dependency. See [naming and versioning](versioning-and-naming.md) and the candidate execution experience below.

### Work that can remain static

Tuple field labels and fixed array extents already have selected static representation contracts. Named input routing, context-tag lookup, and capability resolution can use known source/type structure rather than runtime string lookup. The concrete lowering and full proof systems remain unimplemented.

The recommended generic path retains concrete provider and element types for specialization and direct calls. A value whose provider is chosen at runtime still needs a defined representation and selection mechanism. Specialization does not remove element computation, copying, bounds obligations, or provider-specific costs, and can increase code size. See [generic collection requirements](#generic-collection-requirements).

Keep source-admission proofs separate from optimization proofs. The selected [fixed-array write-grant rules](call-replacement-flow.md#unproven-fixed-array-element-overlap-rejected) reject a call when required disjointness cannot be proved; an implementation must not silently add a runtime alias check to admit it. An otherwise valid indexed read instead keeps its typed bounds-fault behavior unless bounds are proved. Failure to optimize that read does not make its source invalid.

### Information that cannot simply disappear

The selected [pending-failure munching model](expression-recovery.md#pending-occurrences-and-munching-selected) uses schematic singleton/aggregate/empty tuples for recovery reasoning. It does not require allocating an ordinary tuple or a general-purpose collection for every failure. A compiler can specialize statically known matching/exhaustion paths while preserving each occurrence and its payload. Dynamic aggregation still needs an eventual representation and storage policy; the schematic () remainder is not a failure value or a request for an allocation.

A runtime-sized sequence needs its count available when observed, including for zero-sized elements. A runtime union choice needs enough information to distinguish its active alternatives. That information may be optimized or derived where a proof permits, but erasing it without preserving observations changes the contract. Neither obligation inherently requires boxing or a heap allocation.

Likewise, an index supplied by external input is not made safe by its static `Int` type alone. A compiler can remove a redundant check only with a valid proof; the runtime case still needs defined bounds behavior. All-zero initialization can lose physical stores when unobservable, but cannot lose a defined value or observable cleanup effect.

### Contracts most likely to add machinery

1. **Ordinary copies and resource ownership.** [Ordinary transfers copy evaluated values](parameter-values-and-slots.md#general-copy-default-selected). Copying an owning descriptor is not a complete rule for duplicating, sharing, or disposing of its resource. Copy eligibility, resource effects, and explicit ownership/reference alternatives remain deferred. Do not assume hidden reference counting, a deep clone, an implicit borrow, or a tracing collector to close that gap. Avoiding a physical copy must preserve the selected observable copy contract.
2. **Zero callables.** All-zero callable storage must invoke the selected zero implementation safely. A raw zero code address cannot simply be invoked as an ordinary native function address. A compiler could generate a zero-case branch or another suitable representation; no encoding or ABI is selected. A statically known zero callable can return the appropriate zero without user-body/default execution, while preserving reached supplied-argument effects and cleanup. Unknown callable values still need a mechanism that honors both zero and ordinary implementations. See [zero callables](zero-initialization.md#zero-initialized-functions).
3. **Typed panic transfer and cleanup.** Local checks can branch directly to a local handler where the boundary is known. The selected propagation through exited scopes must also preserve applicable cleanup before an outer matching handler. The selected [operation/block distinction](expression-recovery.md#explicit-whole-block-panic-boundary-selected) keeps a bare operation handler specific to its defined faults and uses an explicit block for broad recovery, including argument/callee panics. Operation fault attribution, cross-call transfer, complete attachment/chain rules, metadata, and foreign boundaries remain open. Removing a shared unwinder would require another implementation of those same observable guarantees; returning faults through generated paths can also add code and calling-convention costs. See [typed panics](typed-panics.md) and [finally](finally.md).
4. **Retaining secondary failures.** The selected cleanup policy retains each secondary failure behind the primary. If arbitrarily many failure occurrences must survive for later inspection, fixed bounded storage alone cannot retain arbitrary payloads. Representation, duplicate handling, capacity/failure policy, and inspection remain open. Static scope structure or a linked representation can help particular cases; neither proves bounded total retained storage. Do not silently truncate failures, invent an allocation policy, or replace the selected handling semantics. See [failure aggregation](finally.md#failure-aggregation-and-open-design).

### Review order and syntax boundaries

Recommend defining the ordinary static execution path first: concrete values, fixed aggregates, statically resolved calls/capabilities, and known control-flow targets. List its remaining checks, copies, cleanup, and support dependencies explicitly. Review runtime-sized/erased values and failure paths separately, so an efficient success path does not disguise an undefined failure path. Ownership/reference syntax remains deferred; this review identifies its dependency without selecting a memory model.

Two current syntax gaps block a complete parser independently of runtime strategy:

- Compact `a:/b` and `a:%b` tokenize as the name `a` followed by `:/` or `:%`; the colon-prefixed operators do not collide with identifiers. Compact and spaced forms agree. See [the lexical boundary](arithmetic-methods-and-division-revision.md#compact-and-spaced-forms-must-agree).
- Intrinsic `.call` has selected pack meanings but incomplete operand precedence/chaining. A spelling such as `f.call pack!` needs an explicit parse before reasoning about which Result is extracted. Parenthesized examples do not complete that grammar. See [pack application](callable-input-packs.md#application-with-an-existing-pack).

This review adds no new syntax, mandatory runtime dependency, no-GC guarantee, panic mechanism, or zero-cost performance claim. Measurements remain future work.

## Empty and singleton tuple layout

Status: **storage-layout contract selected by the user, 2026-10-22; not implementation or ABI verification**.

The user explicitly selects identical storage layouts for a component and its one-component tuple. The following equations use schematic notation from the discussion: T denotes the component type, not a bare inferred tuple label or a new LiteScript type spelling.

```text
memoryLayout(()) = memoryLayout(Unit) = empty
memoryLayout((T)) = memoryLayout((T,)) = memoryLayout(T)
```

Unit/() has zero payload bytes. Grouping (T) already preserves T's identity and layout. A singleton tuple containing a concrete storable T has the same size and alignment as T, with its sole component at offset zero. It adds no wrapper header, tag, padding, indirection, or allocation. A named singleton has the same rule; its field label belongs to the static type contract rather than stored per-value metadata. Nested singleton layers preserve the component layout recursively. Unit alignment and foreign calling conventions remain separate details; singleton alignment must equal its component's chosen alignment.

This is a stronger selected storage guarantee than merely hoping the optimizer removes a wrapper. It does not promise that every source construction performs no instructions: evaluation, required ownership transfer, initialization, and cleanup still follow their eventual contracts. Separate variables do not become aliases just because their types have identical layouts.

### Static type distinction needs no runtime discriminator

```text
scalar := 42;
one := (42,);
one.0;    /* statically valid */
scalar.0; /* compile error: scalar has no tuple component */
```

The compiler knows each binding's type and can select field access and operations without storing a type tag in either value. The existing scalar/singleton type and shape distinction remains selected; equal layouts do not merge their identities or add implicit wrapping/unwrapping.

The user subsequently reaffirmed this simple boundary: grouped T stays scalar and a one-component tuple stays a tuple. Treating the scalar as a tuple or automatically accepting its singleton in its place is deferred. The selected storage-layout equality remains in force; it is independent of that future semantic discussion. See [current boundary](tuple-entries-and-access.md#current-scalar-boundary-and-deferred-equivalence).

If only identical payload bytes remain and neither a static contract nor runtime metadata identifies their type, runtime code cannot discover whether they came from T or its singleton. This is an information limit, not a compiler optimization problem. Do not specify a byte-inspection test that purports to recover erased type identity.

An actual runtime choice between T and its singleton, such as a union containing both alternatives, still needs the existing union's member-identification mechanism. The tag belongs to the union representation, not to each ordinary scalar or singleton value. Likewise, a future erased value/reflection/dispatch facility would have to retain its required type information explicitly. Static generic specialization can preserve the distinction in generated code; its implementation and code-size costs remain open.

### Layout versus calling convention

Equal size, alignment, and payload layout do not alone select identical parameter/return ABI or permit arbitrary foreign reinterpretation. Those are separate contracts. As a reference precedent, Rust documents tuple layout through its default representation, while specially marked transparent wrappers can share their field's layout and ABI. Do not attribute that stronger transparent-wrapper guarantee to all Rust singleton tuples. Sources: [Rust tuple layout](https://doc.rust-lang.org/reference/type-layout.html#tuple-layout), [transparent representation](https://doc.rust-lang.org/reference/type-layout.html#the-transparent-representation).

## Fixed arrays share homogeneous tuple storage

Selected by the user, **2026-10-25**: a compile-time-sized array [T; N] has the same storage size, alignment, and corresponding element offsets as an unnamed fixed tuple of N components of that same concrete storable T. Its elements are inline, in order, with normal element layout. There is no array-specific runtime length field, header, tag, wrapper, indirection, or allocation. N is static type information. This selects representation, not stack placement or universal copyability.

For nonzero-sized T, addressing uses its normal element stride. A zero-sized T still has N semantic positions without requiring N payload bytes. [T; 0] has no element payload; [T; 1] shares its sole element's layout at offset zero. Their source-level array contracts remain distinct from Unit, a scalar, and corresponding tuple types. The exact alignment chosen for Unit/empty products and foreign calling conventions remain separate; the selected array/tuple equality must respect that choice.

Element metadata is still part of T. For example, an array of a union stores the union's selected member-identification information for each element where required; header-free array layout does not erase union tags. An ordinary array field contributes its inline elements to its containing value. Runtime-length arrays instead need available runtime count information; their exact owner/view descriptor, allocation, and ABI remain open. Merely observing a runtime count does not turn that representation into an inline [T; N].

Equal layouts do not identify array and tuple types, grant aliasing or arbitrary reinterpretation, select an identical call ABI, or make every conversion/copy free. Compatible explicit unpacking can reconstruct another shape under its own evaluation, type, access, and copy contracts. Fixed arrays retain computed indexing; tuples retain their static positional-access rules. See [arrays](arrays.md), [logical unpacking](tuple-unpacking.md), and [Unit cardinality](unit.md#zero-storage-does-not-erase-shape).

[Fixed-array value widening](arrays.md#fixed-array-values-widen-element-by-element) preserves N and each logical element value while converting compatible element representations. Source [S; N] and destination [T; N] each obey their own header-free inline layout; different S/T may require different size, alignment, stride, tags, and total storage. Compiler adaptation preserves normal copies/effects without requiring identical layouts, an in-place cast, or additional write permission. No shared source storage or borrowed-view reinterpretation is introduced.

## Zero-sized elements and enclosing runtime information

Unit itself has one value and zero value bytes. It never stores an element count, runtime shape, or discriminator. [Unit; 5] has five positions but only one possible initialized element sequence; [(), (), ()] infers [Unit; 3]. Both arrays need zero element payload bytes and no runtime length field, because their counts belong to their static types. A bounds-valid read still produces Unit, and traversal still visits the declared number of positions.

A runtime-sized array of Unit can distinguish length zero, three, or five despite having zero element payload. Its runtime count belongs to the enclosing array/container, not to the Unit elements. Likewise, a union with zero-sized alternatives retains its union-level member-identification contract. A general rest-only tuple type (...rest: ()) admits different counts of Unit elements; it is not Unit or a promise of an empty tail. The selected fixed segment form (...rest: Unit; N) instead exposes [Unit; N], whose count is static and adds no array runtime count field. These are distinct extent contracts; fixed zero extent still retains the named member. See [array segments](tuple-array-segments.md).

Zero storage never licenses erasing semantic slots, labels, counts, evaluation, failure, or required copy/cleanup effects. Assuming print returns Unit, [print("A"), print("B")] must evaluate both calls once in written order even though its resulting [Unit; 2] element payload occupies zero bytes. No universal address-uniqueness rule for zero-sized positions or concrete runtime-array descriptor is selected here.

## Tuple labels describe positions without changing storage

Selected rationale and representation contract, 2026-10-23: a tuple is an ordered product of component slots. Every slot has an implicit positional accessor; a label gives that position an additional semantic name. Labels belong to the static contract and add no per-value label strings, name dictionary, tag, wrapper, or indirection.

For the same ordered concrete storable component types, adding, removing, or changing labels preserves storage size, alignment, and corresponding component offsets. The following compares representation; the later selected explicit destination conversion may also rename these matching positions:

```text
(:Int, :Int)
(studentId: Int, teacherId: Int)
(teacherId: Int, studentId: Int)
```

All three have the same ordered component types and storage layout. The labels give different semantic roles, so structural identity still distinguishes their contracts, while a written destination type at an explicit receiving declaration can add, remove, or change labels without moving values. Ordinary assignments, arguments, and returns retain label checks; a type merely known elsewhere is not the bypass. See [labels under an explicit destination type](tuple-label-conversions.md). Naming a slot studentId does not create a new nominal scalar type for its Int payload. Numeric and named access to one labeled position select the same component.

The user's schematic ...T1.T2.T3... describes the ordered component product. The dots are writing separators, not stored bytes or a packed-layout directive. Exact target layout and ABI remain separate; labels alone never change the chosen layout. This does not promise layout equality after changing component types or their order, or after replacement changes a slot's eventual resolved type.

There is no representation reason to group labels at the end: named and unnamed positions may interleave. The former prefix/suffix rule was a syntax/routing restriction, now superseded for tuple value construction. A permitted spread collision with an existing label targets that position; it does not store another copy of the name or move the slot. Source evaluation and ownership effects retain their separate contracts. See [tuple insertion](tuple-spread-and-rest.md#append-or-replace-by-label-selected) and [label-sensitive compatibility](named-input-routing.md#label-compatibility--selected).

## Union storage and refined payload reads

A [checked plain-union member read](union-membership.md#checked-payload-reads-and-ordinary-arguments) uses the active payload while the binding retains its declared union storage. Abstract [Int][7] therefore supplies [7] to an ordinary Int parameter; a refinement does not shrink storage or reinterpret the tag as payload. Preserve normal value-copy effects and the callee's representation. Same-member writes may retain an unchanged tag, while whole-union replacement establishes the new tag/payload and invalidates stale read facts. This does not specify offsets, tag width, a physical copy/store count, atomicity, or a reference ABI.

The selected [union grant distinction](call-replacement-flow.md#union-payload-grants-and-whole-union-grants) also constrains writes: a member-only var Int grant uses the proven Int payload and retains the Int tag, while a whole-union var (Int | String) grant must establish [String]["hello"] when assigning String. A naked payload-only write cannot stand in for complete union replacement. Reject unproven member-payload access; preserve ordinary granted-location writes without a detached-copy/writeback substitution. Concrete pointer/descriptor ABI, store counts, and atomicity remain open.

## Safe callable adaptation and representation

The selected [safe callable value adaptation](callable-value-variance.md) permits direct assignment of a wider-accepting/narrower-returning ordinary implementation to a compatible required or omission-capable ordinary view. In the latter case the source contract must promise omission, and the adapter preserves it for implementation-owned handling instead of materializing a narrowed-type default. See [implementation-owned default promises](callable-value-variance.md#omission-remains-an-implementation-promise). The compiler must preserve normal value admission and copies across any representation difference; a source-level forwarding wrapper is not required. This is distinct from label-only layout preservation and the future in-place cast topic. Adapter layout/allocation, ABI, and performance remain unspecified.

Matching outer fallible callable results may also widen success/error payload contracts under [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes). Any needed outcome adaptation preserves branch, payload identity, normal copies/effects, and source zero behavior; this is not raw memory reinterpretation, implicit result extraction, or a selected zero-overhead/ABI guarantee.

[Stored Result widening](result-and-errors.md#stored-result-values-widen-safely) likewise preserves each existing Result layer and the active success/error value through ordinary copying, including matching nested payload widening. A widened zero preserves the source zero outcome; it need not have the destination zero encoding. Representation adaptation is a compiler responsibility, not an in-place cast or a new alias.

## Future in-place casting discussion

The user requested [future in-place memory-compatible casts](tuple-label-conversions.md#future-in-place-memory-compatible-casts) on 2026-10-25, including a nested pair-plus-Int versus flat three-Int tuple shape. This is a future explicit cast topic. Current label conversion preserves shape, and ordinary transfers keep label checks; no layout equivalence, flattening, cast grammar, alias/source-validity rule, copy bypass, or new ABI is selected by this note.

## Union storage model

The user clarifies [metadata plus overlapping payload](union-zero.md#current-storage-model). Payload capacity is max(size(A), size(B)); the complete value also includes active-member metadata and alignment/padding. This resolves the earlier total-versus-payload ambiguity and supports checked type narrowing. Zero initialization clears both metadata and payload; zero metadata must identify one listed member, with the exact member-selection rule still open. The conceptual inline wrapper does not require boxing or an external metadata allocation. Metadata format, exact ABI, and equivalent optimized encodings remain open.

## Candidate execution experience

The [first FVP uses a small interpreter](tooling-and-learning.md#fvp-interpreter),
selected 2026-10-30. Native compilation remains a later goal. This experimental
path does not demonstrate native performance, runtime footprint, or no-GC
deployment; those priorities and their measurement requirements remain intact.

```text
lite run lesson.lts
```

could compile and cache native code. This was a proposed scripting experience; neither caching nor a backend was selected. Compiler latency and cold startup must be evaluated independently of steady-state execution.

## Memory-model candidates

Owned values, deterministic cleanup, inferred borrowing, and explicit shared ownership were recommended as a promising direction. Automatic reference counting was discussed as another tradeoff. A tracing collector was not selected, nor was a complete no-GC ownership system specified. The 2026-10-28 priority above now explicitly targets ordinary native execution without a mandatory tracing collector; it still leaves the reclamation mechanism open.

The general language rule selected on **2026-10-25** gives ordinary reads/initializers, assignment values, call inputs, and ordinary results copy semantics, with no implicit references. Value semantics may require substantial copying, but direct construction, indirect ABI transport, and physical copy elimination must preserve all observable values and valid copy effects. This decides neither a physical copy instruction nor type-specific eligibility, ownership, safety, or resource policy; future reference-copy modes must be explicit. See [the general copy default](parameter-values-and-slots.md#general-copy-default-selected) and [result copies](parameter-values-and-slots.md#ordinary-return-values-are-copies-selected).

The selected mut copy := existing_record rule creates a shallow mutable record copy. All inline nested records belong to the outer value layout and are copied with it; reference fields preserve their targets and existing access permissions. The ordinary record argument/simple fixed temporary rule now uses the same shallow mapping where record and reference-field copy contracts are already valid; see [copyable reference-bearing records](parameter-values-and-slots.md#copyable-reference-bearing-record-values-selected). No referenced graph is cloned, and no universal unchecked memcpy contract for managed resources is selected. The user explicitly defers reference syntax and memory safety, including ownership, lifetimes, alias enforcement, capability copyability, resource cleanup, and the implementation strategy. This mapping is conditional on valid contracts, not a memory-safety implementation or a measured performance result. See [local shadowing and copies](local-shadowing-and-copies.md).

The copy default still needs type-specific eligibility and effects for nontrivial values, explicit ownership/reference alternatives, and cleanup contracts. "The compiler infers it" is not enough to define aliasing, lifetime, and destruction behavior.

Variadic rest has selected [access and retention boundaries](tuple-array-shapes.md#rest-access-storage-and-retention): readable array access by default, no mandatory heap allocation, live backing storage for borrowed uses, and explicit copy/ownership operations when independent owned storage is needed. Retaining rest needs lasting ownership or a proven lifetime; there is no implicit copy/heap-promotion repair for invalid escape. Direct source reuse and temporary/gathered call storage are possible implementations only when they preserve the observable contract. Element ownership, mutation observability, allocation/failure policy, and general lifetime machinery remain open; no zero-copy or allocation-free performance claim follows.

The selected temporary [var-qualified parameter](slot-parameters.md) gives access to a caller variable or field; it introduces no public pointer operation or general reference-value feature. The var qualifier replaces the former slot keyword. The [ordinary parameter review](parameter-values-and-slots.md) separates language-defined value/borrow behavior from backend choices such as passing an aggregate indirectly. Such choices must preserve observable identity, ownership, aliasing, and mutation behavior rather than silently select a different contract.

[Mutability, access, and operations](mutability.md) separates binding reassignment, read/write access to held data, and receiver requirements. A read-only view alone does not guarantee that no other alias can change the object. Any stronger guarantee needs a defined aliasing, borrowing, or frozen-value contract. The explicit mutable-copy declaration above has copy semantics; ordinary access requirements must not silently trigger a detached clone or runtime borrow checking.

## Generic collection requirements

The selected [collection API direction](collection-abstractions.md) separates consumer abilities from storage providers. A common traversal contract should not require object boxing, a heap-allocated iterator, dynamic dispatch, or materialization into List merely to cross the input boundary. Recommend specialization of the concrete provider/element types for the ordinary path; exact compiler and generic mechanisms remain open.

Runtime-erased providers and heterogeneous element representations are separate choices with their own dispatch/ownership costs. Specialization can also cost code size and compilation time. [Generic collection performance](generic-collection-performance.md) records those tradeoffs and reference-language examples. [Provider-neutral algorithms](collection-algorithms.md) covers fast hooks and destinations; removing generic-call overhead alone does not change a linear algorithm into indexed lookup.

## Collection contracts do not select a layout

User clarification, 2026-10-22: a collection capability such as the selected [T] indexed-sequence contract describes a promise/API, not a concrete backing implementation. It has no single storage layout without a provider or an explicit runtime-erased representation. This is not the same as selecting size zero.

The ordinary generic path can retain the provider's static type and layout without adding a mandatory descriptor or boxed interface value. A growable list implementation, inline fixed array, borrowed view, or custom provider can have different representations. These provider layouts do not become the layout of the abstract contract merely because each provider satisfies it.

An empty literal is a value-construction question, distinct from its abstract expected type. Empty element storage, zero-sized fixed products, and the storage required by an actual provider must not be conflated. An executable {} already produces Unit; contextual record initialization and collection literal inference keep their separate rules. The user's equal-layout reasoning does not, by itself, select empty nominal record/Unit type identity or collapse a collection capability into Unit.

See [indexed-sequence contract](indexed-sequence-contract.md#contract-versus-storage-layout), [collection abstractions](collection-abstractions.md), and [generic collection performance](generic-collection-performance.md).

## Proposed sequence representations

The [sequence-family review](sequence-types.md) distinguishes compile-time inline arrays, runtime-sized fixed array owners, growable list owners, and borrowed slice views. Fixed length does not mandate stack placement. A runtime-sized owner may keep its descriptor inline while managing separately allocated elements. A slice views live initialized elements without an element allocation or copy.

The header-free inline fixed-array layout above is now selected. Runtime-array owners, growable lists, and view descriptors retain their separate proposal status. Fresh statically sized bracket literals infer fixed arrays, superseding the earlier unconditional List default; runtime-array storage and type spelling remain open. Copying an owning descriptor cannot establish two independent allocation owners by itself; list move/clone/share rules and slice lifetime/invalidation still need contracts. Explicit spreads construct compatible shapes; the selected fixed-array/homogeneous-tuple layout equality does not itself guarantee zero copying. See [tuple/array shapes](tuple-array-shapes.md).

## Semantic initialization versus physical writes

Selected optimization principle, 2026-10-19: a source-level initialization requirement does not mandate physical initialization stores when the compiler proves them unobservable.

```text
var x: User;       /* valid all-zero language value */
x = make_user();   /* replaces the complete value */
```

For this example, the compiler may leave the destination storage physically uninitialized until the replacement, construct the result directly there when valid, keep the value in registers, or eliminate storage entirely. It must preserve every defined observation and any required initialization, replacement, or cleanup effect. This is permission to optimize, not a requirement that a backend discover or apply the transformation.

The proof must cover reads through x or other accessible paths, captures and callbacks, and exits before replacement. If the right-hand side fails or exits, any required cleanup or observation must still behave as if the zero value had been initialized. Once cleanup rules are defined, an observable cleanup effect cannot be erased just because the value is overwritten on the normal path.

```text
var x: User;
inspect(x);          /* must observe the defined zero value */
x = make_user();
```

Here merely exposing untouched bytes would be invalid. The compiler may still avoid physical zero stores if it can preserve the zero observation through constant folding, replacement of reads, or another equivalent representation.

Selected 2026-11-01: a partial conditional declaration initializer, such as `x := if flag { value }`, treats `zero(T)` as its declaration default. Lowering may select the branch value or the default and store once; it need not materialize the zero store before a conditional overwrite. A partial conditional assignment lowers as one guarded store with the same observable order: evaluate the condition once, then write only on the true path. Both shapes preserve values, effects and required cleanup; only the number/order of unobservable writes is implementation-defined.

Source validity is checked independently of optimization. The universal zero requirement does not make every bare local declaration valid: the selected [multi-member union restriction](union-initialization-policy.md#bare-local-declarations) requires an initialized expression or explicit = ?, and rejects bare = 0 as a member choice. Zero-dependent contracts for categories with unresolved mappings remain conditional; optimization does not define or bypass those mappings. An explicit uninitialized-storage request has a separate source contract. Backend-elided zeroing does not expose a new readable uninitialized state or choose stack versus heap.

## Explicit reservation without initialization

The selected surface direction value: Type = ? requests appropriately sized/aligned storage without zero/default initialization. Whole-value first initialization uses = once per execution path without var; later replacement requires var. The earlier generic reserve() operation remains unselected. Allocation policy, field/element and callee construction, and failure handling remain open. An admitted ordinary declaration initializes immediately unless it explicitly requests reservation; a bare multi-member union local is rejected rather than implicitly reserved or zeroed. A reservation requires tracked initialization before it becomes usable as a valid value; stack lifetimes, partial cleanup, and heap ownership do not follow merely from the marker. See [reserved storage](reserved-storage.md) and [first initialization](first-initialization.md).

Large arrays/buffers are the primary motivation: provide storage, then fill element payloads without a mandatory preliminary zero pass. The storage exists; its unwritten contents are unspecified, not a null state or readable random values. Allocation bookkeeping and element validity are separate. A sequential initialized-prefix strategy may avoid per-element runtime flags, but arbitrary filling loops, partial cleanup, and collection length/capacity semantics need explicit contracts. No measured speedup or chosen array API follows from this goal.

## Loop state costs

The typed .value starts at its all-zero value and is replaced after a body value commit. It does not implicitly mean collecting every iteration into an array. Replacement may still require destruction or ownership transfer. An optimizer cannot skip side effects just because earlier values are overwritten.

A tag is intended as a statically checked context handle, not a dictionary of runtime fields. Last-item retention for completion is driven by observable field use: unused item state need not survive for then, and reading only count/index/value does not retain every field. Used state still obeys ownership/cleanup semantics; precise representation and measured optimization claims require an implementation.

## Source adapters

Reversing a source requires reverse capability or explicit buffering. Inferring a last item may require lookahead. Stepping or enumerating should not silently turn a stream into a complete in-memory collection.

## Measurements to define later

Execution time, startup, compilation latency, binary size, allocations, peak memory, cleanup cost, and dispatch cost should have separate acceptance criteria. Comparisons need equivalent algorithms and equivalent safety contracts.

## Related concepts and references

- [Loops](loops.md), [Loop accumulator](loop-accumulator.md), and [Tags](tags-and-contexts.md).
- [Rust ownership](https://doc.rust-lang.org/stable/book/ch04-01-what-is-ownership.html).
- [Swift ARC](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/AutomaticReferenceCounting.md).
- [Swift value/reference semantics](https://www.swift.org/documentation/articles/value-and-reference-types.html).

These sources establish comparison models; they do not settle LiteScript's memory semantics.

## Explicit capture and flat outcome costs

Selected [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md) uses flat T ! (E | Panic) outcomes and occurrence-ordered collectors; [LP-0010 r1](proposals/LP-0010-outcome-extraction-and-exhaustion.md) extracts success or forwards retained occurrences. A flat public type does not eliminate storage for several payloads or category information for unknown concrete panics. Typed matching across separate compilation requires sufficient retained identity; collector [T] also requires its full count/indexing/traversal contract. The compiler may specialize a proven singular or exhausted path, but cannot deduplicate repeated occurrences or erase observable ordering, origins, and cleanup to obtain that optimization.

No common heap-object superclass, reflection on arbitrary objects, mandatory allocation, unwinder, or public FailureGroup wrapper is selected. Dynamic retention, filtered providers, ownership/lifetimes, allocation-failure behavior, mixed-channel ABI, and measured costs remain open. See [capture implementation boundaries](failure-capture-and-unwrapping.md#implementation-and-remaining-decisions).


## Implicit panics without checked effect declarations

[LP-0018 r1](proposals/LP-0018-implicit-panics-without-effect-declarations.md) forbids exhaustive live-panic lists on callable types. Indexed reads/writes and arithmetic remain ordinary operations; this does not force a language-visible Result return for each primitive or require users to enumerate transitive helper faults. Typed detection/transfer still needs an implementation. Explicit ? capture exposes broad Panic but retains concrete category/payload identity for matching.

[LP-0016](proposals/LP-0016-recapture-and-warning-policy.md) allows stable recapture with preserved occurrences. A provably redundant boundary may be optimized, but unchanged static type alone is insufficient proof. [LP-0017](proposals/LP-0017-result-failure-occurrence-patterns.md) supplies scalar and indexed-sequence pattern views without selecting cloning, heap allocation, representation, or escaping ownership. Known-fault documentation has no semantic effect and cannot justify erasing checks. No zero-runtime, allocation-free, or benchmark claim follows.
