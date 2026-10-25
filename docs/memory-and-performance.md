# Memory and performance

Status: **performance goals and selected tuple/fixed-array storage contracts documented; complete memory model, compiler backend, and ABI unchosen**.

## Purpose

Make a convenient language compatible with predictable data representation and a small runtime. Do not mistake an attractive syntax for a proven performance result.

## Goals

- Native execution and useful performance near C on suitable workloads.
- No mandatory large runtime merely to execute ordinary code.
- Unboxed scalar values and records where their semantics allow it.
- Predictable collection storage and explicit expensive representations.
- Specialization and static dispatch where appropriate.
- Shared collection capabilities for primitive and record elements without a mandatory boxed-wrapper API split.
- Metadata and tags that can lower to ordinary local state.
- Optional facilities linked only when used, where practical.

No benchmark, compiler, allocator, or binary-size result exists for this project. Universally outperforming C is not an established guarantee.

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

## Safe callable adaptation and representation

The selected [safe callable value adaptation](callable-value-variance.md) permits direct assignment of a wider-accepting/narrower-returning ordinary implementation to a compatible required or omission-capable ordinary view. In the latter case the source contract must promise omission, and the adapter preserves it for implementation-owned handling instead of materializing a narrowed-type default. See [implementation-owned default promises](callable-value-variance.md#omission-remains-an-implementation-promise). The compiler must preserve normal value admission and copies across any representation difference; a source-level forwarding wrapper is not required. This is distinct from label-only layout preservation and the future in-place cast topic. Adapter layout/allocation, ABI, and performance remain unspecified.

Matching outer fallible callable results may also widen success/error payload contracts under [fallible callable outcome widening](callable-value-variance.md#fallible-callable-views-may-widen-outcomes). Any needed outcome adaptation preserves branch, payload identity, normal copies/effects, and source zero behavior; this is not raw memory reinterpretation, implicit result extraction, or a selected zero-overhead/ABI guarantee.

## Future in-place casting discussion

The user requested [future in-place memory-compatible casts](tuple-label-conversions.md#future-in-place-memory-compatible-casts) on 2026-10-25, including a nested pair-plus-Int versus flat three-Int tuple shape. This is a future explicit cast topic. Current label conversion preserves shape, and ordinary transfers keep label checks; no layout equivalence, flattening, cast grammar, alias/source-validity rule, copy bypass, or new ABI is selected by this note.

## Union storage model

The user clarifies [metadata plus overlapping payload](union-zero.md#current-storage-model). Payload capacity is max(size(A), size(B)); the complete value also includes active-member metadata and alignment/padding. This resolves the earlier total-versus-payload ambiguity and supports checked type narrowing. Zero initialization clears both metadata and payload; zero metadata must identify one listed member, with the exact member-selection rule still open. The conceptual inline wrapper does not require boxing or an external metadata allocation. Metadata format, exact ABI, and equivalent optimized encodings remain open.

## Candidate execution experience

```text
lite run lesson.lite
```

could compile and cache native code. This was a proposed scripting experience; neither caching nor a backend was selected. Compiler latency and cold startup must be evaluated independently of steady-state execution.

## Memory-model candidates

Owned values, deterministic cleanup, inferred borrowing, and explicit shared ownership were recommended as a promising direction. Automatic reference counting was discussed as another tradeoff. A tracing collector was not selected, nor was a complete no-GC ownership system specified.

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

Source validity is checked independently of optimization. Every type must have a valid zero representation, so var x: Type; remains available for all types; optimization does not define or bypass special-type zero semantics. An explicit uninitialized-storage request has a separate source contract. Backend-elided zeroing does not expose a new readable uninitialized state or choose stack versus heap.

## Explicit reservation without initialization

The selected surface direction value: Type = ? requests appropriately sized/aligned storage without zero/default initialization. Whole-value first initialization uses = once per execution path without var; later replacement requires var. The earlier generic reserve() operation remains unselected. Allocation policy, field/element and callee construction, and failure handling remain open. Ordinary declarations still initialize immediately unless they explicitly request this reservation state. A reservation requires tracked initialization before it becomes usable as a valid value; stack lifetimes, partial cleanup, and heap ownership do not follow merely from the marker. See [reserved storage](reserved-storage.md) and [first initialization](first-initialization.md).

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
