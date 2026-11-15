# 7. Collections — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Arrays](../../../docs/arrays.md)
- [Tuple array shapes](../../../docs/tuple-array-shapes.md)
- [Lists](../../../docs/lists.md)
- [Slices](../../../docs/slices.md)
- [Collection capabilities](../../../docs/collection-capabilities.md)
- Related investigation catalog areas: INV-054–060, INV-044–045.

## 7.1 Collection families

**Baseline:** Fixed arrays have static extent and inline layout; runtime-length owner, list, and view differ in size, growth, or ownership.

**Initial assessment and probes:** Compare `[Int; 3]`, a three-Int tuple, and a runtime-sized sequence. Ask which type and operation differences remain justified if layout is shared.

## 7.2 Construction and inference

**Baseline:** Known-size nonempty literals infer fixed arrays; heterogeneous established elements can infer a union. Empty literal element typing is unresolved.

**Initial assessment and probes:** Compare `[1, 2]`, `[1, "tea"]`, and `[]` with and without an expected type. Check fixed extents, zero/singleton and no invented Any or Never default.

## 7.3 Access and mutation

**Baseline:** Fixed arrays have literal positional access and checked runtime indexing; mutation depends on access permissions.

**Initial assessment and probes:** Compare `items.0`, `items[i]`, and a tuple position. Check out-of-bounds, source evaluation once, distinct element grants and unknown overlap.

## 7.4 Iteration

**Baseline:** The review direction favors consumer capabilities over forcing each API to require a particular collection.

**Initial assessment and probes:** A sum should work over an array or suitable view without assuming allocation. Check item order, empty iteration, early exit, and whether iteration permits mutation.

## 7.5 Storage, copies, and views

**Baseline:** Fixed array layout is inline; a runtime-sized owner requires available length information. Borrowing and ownership of views are not a complete selected model.

**Initial assessment and probes:** For a 2 GB list, compare independent value semantics, an optimized-away copy, and an explicit no-copy read-only view. Clarify lifetime, retention and mutation before choosing a mechanism.

## Working judgment

Keep fixed extent, element homogeneity, growth, ownership, and view access as independent properties. Arrays may merit distinct behavior even with tuple-equivalent layout, but runtime indexing and length must earn any separate conceptual machinery.

## Expanded assessment

### Compiler evidence and boundaries

The generated TS verifier passes fixed-array indexing, list-end mutation, named tuple and array traversal examples. These use Node-hosted arrays and helpers, not the selected native storage proof. The verified slice does not establish generic user collections, borrowed slices, arbitrary element mutation, list allocation policy or native layout. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **7.1 Families:** static arrays, runtime-sized owners, growable lists and borrowed views solve different lifetime/size problems. A fixed array can be inline with statically known length; a growable owner needs capacity/reallocation policy, and a view needs accessible length and valid backing. Distinct surface types cost complexity; collapsing them can hide ownership or growth.
- **7.2 Construction:** inferred `[T; N]` captures extent and can avoid storing length. Heterogeneous literals may require union element representation and per-element tags; empty inference remains unresolved. Initializing large buffers element by element versus uninitialized construction affects bandwidth, security, and partial cleanup.
- **7.3 Access and mutation:** runtime indexing needs a valid bounds proof or check under the chosen safety semantics; invalid indexes must retain selected fault behavior. Statically proven bounds may remove checks. Writable aliases and reallocation invalidate views; permission alone is not a lifetime proof.
- **7.4 Iteration:** specialized iteration over a known array can be a tight pointer/index loop without iterator allocation. General abstractions should expose sufficient structure for inlining and vectorization. Dynamic dispatch and monomorphization trade call overhead for binary size and compile time; user-defined providers need matching semantic guarantees.
- **7.5 Storage:** passing a 2 GB owner by independent value may require a deep semantic copy, a cheap move, or an explicitly defined sharing strategy; copying only an owning descriptor cannot safely create independent owners. A no-copy view must specify retention and mutation constraints. Capacity, allocator injection, fragmentation, and failure handling are necessary costs of a growable list even in a no-GC program.

### Blockers and cross-feature cases

Benchmark summation, growth, filtering and map-like operations on fixed arrays, lists and views, with equivalent C safety and allocation behavior. Trace a view retained across list growth and a list of resource-owning records. Static ownership/borrow [2](02-bindings.md), aggregate zero/copy [3](03-records.md), generic dispatch [10](10-generics-comptime.md), and failure cleanup [8](08-failure-cleanup.md) must be resolved together.

## Cross-topic routing

Types (1), access and lifetimes (2), and generic capabilities (10) are prerequisites. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [2](02-bindings.md), [10](10-generics-comptime.md).
