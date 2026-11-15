# 1. Core types and values — initial review

Status: **joint review in progress**. The bounded direction below was clarified by the user; other recommendations remain hypotheses, not compiler support. Recheck sources before further decisions.

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

**Baseline:** Typed receiving declarations already allow specific tuple label conversions; this does not establish a general distinct-type conversion rule. The user requires an explicit operation for established values crossing into a distinct type.

### User direction: literals and established values

The following is a bounded design direction, not an implemented feature. The
declaration and `cast<T>` notation are illustrative; final distinct-type and
explicit-conversion syntax, operation semantics, and implementation are open.
The term `cast` here denotes explicit conversion intent, not a selected builtin,
unchecked reinterpretation, or promise that every conversion is allowed.

```text
UserID := distinct String;
ArticleDescription := distinct String;

raw := "hello";                         /* inferred String */
desc: ArticleDescription = "hello";     /* fresh literal takes destination shape */
id: UserID = "hello";                   /* fresh literal takes destination shape */
TeacherID := distinct String;
teacher: TeacherID = "hello";

id_from_raw: UserID = raw;              /* rejected: established String value */
id_from_desc: UserID = desc;            /* rejected: established distinct value */
id_from_teacher: UserID = teacher;       /* rejected: established distinct value */
text_from_id: String = id;              /* rejected: established UserID value */
id_from_raw := cast<UserID>(raw);        /* illustrative explicit conversion intent */
id_from_desc := cast<UserID>(desc);      /* illustrative explicit conversion intent */
text_from_id := cast<String>(id);        /* illustrative explicit conversion intent */
id_from_literal := cast<UserID>("hello"); /* illustrative explicit conversion intent */
```

The user describes a fresh `"..."` literal as string-like: it takes the shape
of its destination rather than first requiring a stored String value. The user
limits this direction to a type explicitly written at the literal's use site,
so code remains easy to reason about and issues are easier to catch. In
particular, the typed declaration `id: UserID = "hello"` qualifies; merely
knowing that a called function's parameter is UserID does not make
`find_user("hello")` valid under this rule. The complete set of explicit
type-bearing forms and their placement remains to be defined; do not extend
the rule to implicit return or aggregate contexts without a decision. An
uncontextualized `raw := "hello"` is treated as String in current examples;
complete literal typing and inference remain open. Once `raw` or `desc` has an
established type, a destination annotation alone is insufficient to cross into
`UserID`. The user clarifies that UserID is as distinct from String as from
TeacherID: the underlying representation gives String no special implicit
conversion privilege in either direction. This supersedes the earlier recommendation to treat that annotation
as a conversion request. It does not revise the separately selected tuple-label
conversion. Direct conversion eligibility between distinct types, validation,
failure behavior, and literal use with explicitly written types in other
contexts all remain to review. The examples show explicit conversion intent, not a decision that every
pair of distinct types must admit conversion or that conversion is infallible.

## 1.5 Unions and value operations

**Baseline:** Plain unions normalize order and duplicates; multi-member union zero is unresolved and explicit initialization or reservation is required in relevant local declarations.

**Initial assessment and probes:** Compare `Int | String` with `String | Int`; first-written-member zero would conflict with order-independent identity. Revisit equality, numeric operations, valid zero and distinct-type invariants together, without choosing a zero member now.

## Working judgment

Treat type identity, conversion, operations, and physical representation as separate decisions. The user's direction distinguishes contextual fresh literals from established typed values; a typed declaration does not itself authorize converting an established String or another distinct value into `UserID`.

## Expanded assessment

### Compiler evidence and boundaries

The generated TS verifier passes `num.widths`, `num.aliases`, `tuple.shape`, `array.fixed`, and `alias.transparent`. These are named finite scenarios: they establish neither arbitrary recursive types nor native representation. The direct `distinct` and `Int | String` probes reject. The historical probe containing `UserID(raw)` stops at `distinct`; it establishes nothing about the later expression's meaning or validity. [Baseline and exact probes](compiler-baseline.md).

### Benefits and cost model

- **1.1 Literals and primitives:** default inference keeps simple programs short; statically known constants can eliminate runtime work. Checked integer overflow and precise string encoding can add checks or conversion work. Constant folding must preserve overflow and fault timing on untaken paths. Exact widths, signedness, overflow, and Unicode behavior matter to native interoperability and vectorization.
- **1.2 Type identity:** a distinct UserID can prevent mixing identifiers at compile time, plausibly with identical native representation and no runtime discriminator. This is an implementation opportunity, not a selected ABI or a demonstrated zero-cost guarantee. A domain with validation creates a harder question: can every underlying String become an ID, and can all-zero storage be valid? If invalid values exist, unrestricted conversion and universal zero may conflict.
- **1.3 Aggregates:** tuple labels are static information in principle; ordered tuple positions, named record fields, and runtime array indexing expose different operations. Header-free fixed arrays have a selected inline layout, but union elements may still need per-element discrimination. Separate models cost language and compiler complexity; over-unification can make positional record access or runtime indexing semantically awkward.
- **1.4 Conversion:** The user rejects a typed declaration as sufficient to cross between an established String and UserID in either direction, or between UserID and another distinct type; an explicit conversion operation is needed. Fresh string-like literals may instead take the typed destination's shape. Compare arguments, return, generic contexts, eligibility, and validation failure; the precise explicit-conversion mechanism remains open.
- **1.5 Unions and values:** tagged inline payloads permit heterogeneous values without mandatory boxing, at the cost of tag storage, branch selection and layout; optimizations may remove a tag only when its observation is preserved. Order-independent union identity conflicts with simply picking the first written member for zero. Equality, copying and resource cleanup must use the active payload.

### Blockers and cross-feature cases

Compare `UserID | String` narrowing, a record field of that union, a `[UserID; 0]`, and a function that returns either type: identity, zero, widening, generic compatibility and matching all meet here. Decide conversions and valid zero before promising that constrained IDs are interchangeable with their storage. Defer cross-cutting copy/borrow and failure details to [2](02-bindings.md) and [8](08-failure-cleanup.md); decide the feature contract here before runtime layout in [7](07-collections.md).

## Cross-topic routing

Records (3), enums (4), collections (7), and generic constraints (10) depend on these choices. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [3](03-records.md), [4](04-enums.md), [7](07-collections.md), [10](10-generics-comptime.md).
