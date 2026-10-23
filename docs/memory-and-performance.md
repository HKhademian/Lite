# Memory and performance

Status: **performance goals established; memory model and compiler backend unchosen**.

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

## Tuple labels describe positions without changing storage

Selected rationale and representation contract, 2026-10-23: a tuple is an ordered product of component slots. Every slot has an implicit positional accessor; a label gives that position an additional semantic name. Labels belong to the static contract and add no per-value label strings, name dictionary, tag, wrapper, or indirection.

For the same ordered concrete storable component types, adding, removing, or changing labels preserves storage size, alignment, and corresponding component offsets. The following compares representation, not implicit assignment compatibility:

```text
(:Int, :Int)
(studentId: Int, teacherId: Int)
(teacherId: Int, studentId: Int)
```

All three have the same ordered component types and storage layout. The labels give different semantic roles, so the existing structural identity and label-sensitive compatibility rules still distinguish their contracts. Naming a slot studentId does not create a new nominal scalar type for its Int payload. Numeric and named access to one labeled position select the same component.

The user's schematic ...T1.T2.T3... describes the ordered component product. The dots are writing separators, not stored bytes or a packed-layout directive. Exact target layout and ABI remain separate; labels alone never change the chosen layout. This does not promise layout equality after changing component types or their order, or after replacement changes a slot's eventual resolved type.

There is no representation reason to group labels at the end: named and unnamed positions may interleave. The former prefix/suffix rule was a syntax/routing restriction, now superseded for tuple value construction. A permitted spread collision with an existing label targets that position; it does not store another copy of the name or move the slot. Source evaluation and ownership effects retain their separate contracts. See [tuple insertion](tuple-spread-and-rest.md#append-or-replace-by-label-selected) and [label-sensitive compatibility](named-input-routing.md#label-compatibility--selected).

## Union storage model

The user clarifies [metadata plus overlapping payload](union-zero.md#current-storage-model). Payload capacity is max(size(A), size(B)); the complete value also includes active-member metadata and alignment/padding. This resolves the earlier total-versus-payload ambiguity and supports checked type narrowing. Zero initialization clears both metadata and payload; zero metadata must identify one listed member, with the exact member-selection rule still open. The conceptual inline wrapper does not require boxing or an external metadata allocation. Metadata format, exact ABI, and equivalent optimized encodings remain open.

## Candidate execution experience

```text
lite run lesson.lite
```

could compile and cache native code. This was a proposed scripting experience; neither caching nor a backend was selected. Compiler latency and cold startup must be evaluated independently of steady-state execution.

## Memory-model candidates

Owned values, deterministic cleanup, inferred borrowing, and explicit shared ownership were recommended as a promising direction. Automatic reference counting was discussed as another tradeoff. A tracing collector was not selected, nor was a complete no-GC ownership system specified.

One copy rule is selected: mut copy := existing_record creates a shallow mutable record copy. All inline nested records belong to the outer value layout and are copied with it; reference fields preserve their targets and existing access permissions. No referenced graph is cloned. This is a semantic storage rule, not a universal unchecked memcpy contract for managed resources; see [local shadowing and copies](local-shadowing-and-copies.md).

The design must still decide general assignment and ordinary parameter move/copy/share/borrow rules for nontrivial values, copy eligibility, and cleanup. "The compiler infers it" is not enough to define aliasing, lifetime, and destruction behavior.

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

These storage representations are proposals; the growable List default for unannotated bracket literals is selected. Copying an owning descriptor cannot by itself establish two independent allocation owners; list move/clone/share rules and slice lifetime/invalidation need explicit contracts. Do not silently add copy-on-write, reference counting, or heap promotion to satisfy a borrowed-view use. These facilities could be evaluated separately. Full literal inference, type syntax, allocator/failure policy, and exact ABI remain open.

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
