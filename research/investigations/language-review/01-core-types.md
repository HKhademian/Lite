# 1. Core types and values — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Type categories](../../../docs/type-categories.md)
- [Types and inference](../../../docs/types-and-inference.md)
- [Tuple label conversions](../../../docs/tuple-label-conversions.md)
- [Records](../../../docs/records.md)
- [Arrays](../../../docs/arrays.md)
- [Union initialization policy](../../../docs/union-initialization-policy.md)
- Related investigation catalog areas: INV-018, INV-019, INV-020, INV-022, INV-024, INV-029.

## 1.1 Primitives and literals

**Baseline:** A literal such as `raw := "user-42"` is used as String in current inference examples. Literal grammar and context-sensitive typing are not a complete contract.

**Initial assessment and probes:** Compare a direct literal in a `UserID` destination with an already bound String; do not assume they must be treated identically. Check numeric bounds and contextual inference too.

## 1.2 Identity and distinct types

**Baseline:** Transparent aliases retain identity; record declarations are nominal. The user likes `UserID := distinct String` and `UserData := distinct (name: String, age: Int)` and favors distinctness in both directions; general distinct syntax and semantics need review.

**Initial assessment and probes:** Keep separate UserID and OrderID even with String underneath. Compare nominal wrappers with transparent aliases and ask which operations, invariants and representation each preserves.

## 1.3 Tuples, records, and arrays

**Baseline:** Tuple identity includes ordered labels and types; records are field-oriented and nominal; fixed arrays have homogeneous elements and tuple-equivalent inline layout. Shared layout does not establish identity.

**Initial assessment and probes:** Compare `(1, 2)` with `[1, 2]`: runtime indexing, extent, homogeneous typing, zero and distinct empty shapes are decision tests. Avoid assuming record fields are tuple positions.

## 1.4 Inference and conversion

**Baseline:** Typed receiving declarations already allow specific tuple label conversions; this is not a general cast rule. The user notes `UserID(raw)` is valid while explicit cast syntax remains pending.

**Initial assessment and probes:** Compare `id: UserID = raw`, `id := UserID(raw)`, `id = raw`, and passing `raw` to a UserID parameter. Should a written type request conversion, or only constrain the initializer? Decide independently whether direct literals are contextual. Do not classify a type call as a cast without its contract.

## 1.5 Unions and value operations

**Baseline:** Plain unions normalize order and duplicates; multi-member union zero is unresolved and explicit initialization or reservation is required in relevant local declarations.

**Initial assessment and probes:** Compare `Int | String` with `String | Int`; first-written-member zero would conflict with order-independent identity. Revisit equality, numeric operations, valid zero and distinct-type invariants together, without choosing a zero member now.

## Working judgment

Treat type identity, conversion, operations, and physical representation as separate decisions. Two-way nominal distinction appears useful for IDs; a typed declaration may itself be an explicit request, so compare it against the existing tuple-label rule before choosing. A direct literal deserves its own case.

## Cross-topic routing

Records (3), enums (4), collections (7), and generic constraints (10) depend on these choices. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [4](04-enums.md), [7](07-collections.md), [10](10-generics-comptime.md).
