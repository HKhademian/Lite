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

## Expanded assessment

### Compiler evidence and boundaries

The generated TS verifier passes `num.widths`, `num.aliases`, `tuple.shape`, `array.fixed`, and `alias.transparent`. These are named finite scenarios: they establish neither arbitrary recursive types nor native representation. The direct `distinct` and `Int | String` probes reject. The checked type-call probe stops at `distinct`, so it says nothing independently about whether a type can be called. [Baseline and exact probes](compiler-baseline.md).

### Benefits and cost model

- **1.1 Literals and primitives:** default inference keeps simple programs short; statically known constants can eliminate runtime work. Checked integer overflow and precise string encoding can add checks or conversion work. Constant folding must preserve overflow and fault timing on untaken paths. Exact widths, signedness, overflow, and Unicode behavior matter to native interoperability and vectorization.
- **1.2 Type identity:** a distinct UserID can prevent mixing identifiers at compile time, plausibly with identical native representation and no runtime discriminator. This is an implementation opportunity, not a selected ABI or a demonstrated zero-cost guarantee. A domain with validation creates a harder question: can every underlying String become an ID, and can all-zero storage be valid? If invalid values exist, unrestricted conversion and universal zero may conflict.
- **1.3 Aggregates:** tuple labels are static information in principle; ordered tuple positions, named record fields, and runtime array indexing expose different operations. Header-free fixed arrays have a selected inline layout, but union elements may still need per-element discrimination. Separate models cost language and compiler complexity; over-unification can make positional record access or runtime indexing semantically awkward.
- **1.4 Conversion:** `id: UserID = raw` could be an explicit conversion request like the selected tuple-label receiving declaration; `id = raw` and `take_id(raw)` supply contextual types too but do not write a new annotation. Compare both directions, fresh literals, return, generic arguments, overload/type calls, and validation failure. Two-way identity alone does not pick any of those rules. A type call's meaning is independently open.
- **1.5 Unions and values:** tagged inline payloads permit heterogeneous values without mandatory boxing, at the cost of tag storage, branch selection and layout; optimizations may remove a tag only when its observation is preserved. Order-independent union identity conflicts with simply picking the first written member for zero. Equality, copying and resource cleanup must use the active payload.

### Blockers and cross-feature cases

Compare `UserID | String` narrowing, a record field of that union, a `[UserID; 0]`, and a function that returns either type: identity, zero, widening, generic compatibility and matching all meet here. Decide conversions and valid zero before promising that constrained IDs are interchangeable with their storage. Defer cross-cutting copy/borrow and failure details to [2](02-bindings.md) and [8](08-failure-cleanup.md); decide the feature contract here before runtime layout in [7](07-collections.md).

## Cross-topic routing

Records (3), enums (4), collections (7), and generic constraints (10) depend on these choices. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [4](04-enums.md), [7](07-collections.md), [10](10-generics-comptime.md).
