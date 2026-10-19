# Provider-neutral collection algorithms

Status: **library-design proposal, 2026-10-19**. Capability-based consumer APIs are selected as a direction. Customization hooks, output contracts, fallback precedence, and exact syntax below remain proposals.

## Generic input alone does not choose the best algorithm

Accepting `Iterable<T>` avoids depending on List, but a loop-based membership search still traverses elements even when a provider has an efficient lookup index. Static specialization can remove abstraction overhead; it does not automatically change an algorithm's complexity.

Recommend semantic customization points with a valid generic fallback. Conceptually, contains(source, wanted) could use a provider's declared membership operation when available, otherwise use the specified traversal fallback. The hook should be open to conforming user providers, not a list of privileged standard-container types.

This needs a precise contract. Provider equality/ordering semantics, observable effects, failure behavior, and results must agree with the public operation. A fast implementation may not skip required observable work or swallow recoverable errors. Disagreement between hashing and equality cannot be repaired by dispatch alone.

The design must settle how fallback and specialized implementations are selected, how conflicts are diagnosed, and how a runtime-erased provider advertises optional abilities. No blanket implementation, overlapping overload scheme, or generic-specialization syntax is selected here.

## Require stronger abilities when the algorithm needs them

A genuine random-access algorithm should request indexed access; a bulk memory operation needs a suitable contiguous region and element/ownership contract. A provider lacking these abilities should not receive a hidden collection conversion just to pass the call.

Offer a weaker-capability algorithm when appropriate, or make an adapting/materializing operation explicit. Bounds, overlap, ownership, and nontrivial element cleanup must still be respected by any proposed bulk-copy fast path.

Cheap exact length and counting a traversal are different operations. Counting a one-shot source can consume it; replacing a required traversal by a length lookup can also change observable effects. Do not treat metadata, traversal, and materialization as interchangeable solely because they can return the same integer.

## Output abstractions matter too

If every transformation returns the standard List, provider independence is lost at the next call boundary. Recommend offering lazy transformations and explicit materialization into caller-selected destinations or factories where their semantics permit it.

```text
selected := filter(icons, is_visible);
collect_into(mut destination, selected);
```

These are schematic operations, not selected APIs. Filtering need not immediately allocate a List. A destination might be a standard list, set, arena builder, or application-defined sink, provided it meets the operation's element/access and error contract. Destination semantics such as uniqueness and ordering must be explicit; they are not equivalent to always constructing a List.

The chosen default List can remain a convenient materialization target. It must not be the only supported target. A function intentionally returning a concrete provider is also valid when that ownership/layout choice is part of its documented result.

Lazy adapters retain source lifetime and consumption constraints. Fallible predicates or destinations must expose their declared failures. This proposal does not select exact lazy-adapter ownership, exception cleanup, or partial-output rollback.

## Open extension instead of implementation lock-in

Allow providers to implement the standard capability contracts explicitly, or participate through a local adapter where direct conformance is unavailable. The interface review must settle conformance/coherence and dependency rules so users can integrate a foreign type without requiring its original author to change an API.

Capability names need stable behavior, cost promises, and evolution rules. Standard algorithms must not rely on private container layout, undocumented iterator categories, or a particular allocator when their published requirements do not promise those properties.

A source-level contract is not by itself a stable binary ABI. Dynamic plugin boundaries and erased interface representations require a separate decision. This does not justify forcing every ordinary generic call through that representation.

## Public contract checks

Recommended review questions: Does the operation request only necessary abilities? Can an independent provider conform? Are extra traversals or allocation visible? Can a lawful provider offer a faster implementation? Can the caller choose the output provider? Do the body and optimized path preserve declared errors and mutation permissions?

These are library-design criteria, not runtime checks or a mandate for one dispatch implementation. Related: [consumer abstractions](collection-abstractions.md), [capabilities](collection-capabilities.md), [generic collection performance](generic-collection-performance.md), [interfaces](composition-and-interfaces.md), and [result handling](result-and-errors.md).
