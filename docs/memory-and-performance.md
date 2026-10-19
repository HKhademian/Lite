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
- Metadata and tags that can lower to ordinary local state.
- Optional facilities linked only when used, where practical.

No benchmark, compiler, allocator, or binary-size result exists for this project. Universally outperforming C is not an established guarantee.

## Candidate execution experience

```text
lite run lesson.lite
```

could compile and cache native code. This was a proposed scripting experience; neither caching nor a backend was selected. Compiler latency and cold startup must be evaluated independently of steady-state execution.

## Memory-model candidates

Owned values, deterministic cleanup, inferred borrowing, and explicit shared ownership were recommended as a promising direction. Automatic reference counting was discussed as another tradeoff. A tracing collector was not selected, nor was a complete no-GC ownership system specified.

One copy rule is selected: mut copy := existing_record creates a shallow mutable record copy. All inline nested records belong to the outer value layout and are copied with it; reference fields preserve their targets and existing access permissions. No referenced graph is cloned. This is a semantic storage rule, not a universal unchecked memcpy contract for managed resources; see [local shadowing and copies](local-shadowing-and-copies.md).

The design must still decide general assignment and ordinary parameter move/copy/share/borrow rules for nontrivial values, copy eligibility, and cleanup. "The compiler infers it" is not enough to define aliasing, lifetime, and destruction behavior.

The selected temporary [slot parameter](slot-parameters.md) gives access to a caller variable or field; it introduces no public pointer operation or general reference-value feature. The [ordinary parameter review](parameter-values-and-slots.md) separates language-defined value/borrow behavior from backend choices such as passing an aggregate indirectly. Such choices must preserve observable identity, ownership, aliasing, and mutation behavior rather than silently select a different contract.

[Mutability, access, and operations](mutability.md) separates binding reassignment, read/write access to held data, and receiver requirements. A read-only view alone does not guarantee that no other alias can change the object. Any stronger guarantee needs a defined aliasing, borrowing, or frozen-value contract. The explicit mutable-copy declaration above has copy semantics; ordinary access requirements must not silently trigger a detached clone or runtime borrow checking.

## Loop state costs

An accumulator retains a candidate value and replaces it after a contribution. It does not implicitly mean collecting every iteration into an array. Replacement may still require destruction or ownership transfer. An optimizer cannot skip side effects just because earlier values are overwritten.

A tag is intended as a statically checked context handle, not a dictionary of runtime fields. Unused state can potentially be removed, but precise representation and optimization claims require an implementation.

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
