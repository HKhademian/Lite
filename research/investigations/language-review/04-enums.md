# 4. Enums and variants — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Enums and variants](../../../docs/enums-and-variants.md)
- [Union normalization](../../../docs/union-normalization.md)
- [Match](../../../docs/match.md)
- [Zero initialization](../../../docs/zero-initialization.md)
- Related investigation catalog areas: INV-024, INV-025, INV-026.

## 4.1 Definition and identity

**Baseline:** Plain and payload-case matching, contextual case shorthand, backing-type headers, and assigned case values are selected. An enum case is not implicitly its backing value; complete declaration and identity details remain open.

**Initial assessment and probes:** Compare two enums each having a `Ready` case and a plain union of their payloads. Determine what identifies a case across aliases and modules.

## 4.2 Cases and payloads

**Baseline:** A case may need no data or associated data; constructor and schema details are not fully settled.

**Initial assessment and probes:** Compare a no-payload `Ready` with a `Message` carrying text and a case carrying two values. Decide whether field labels and nesting follow tuple or record rules.

## 4.3 Construction and access

**Baseline:** Case construction and payload extraction must preserve which case is active; exact constructor grammar remains under review.

**Initial assessment and probes:** Ask whether constructing and reading a payload require explicit case selection and what happens when a caller attempts to access the wrong case.

## 4.4 Matching and coverage

**Baseline:** Subject matching is selected, while complete enum schemas and the exhaustiveness algorithm remain open.

**Initial assessment and probes:** For two cases, compare a complete match, a missing case, and a guarded case: a guard may fail even if its case was named. Check whether a fallback remains necessary.

## 4.5 Value behavior and zero

**Baseline:** Every type has a semantic-zero goal, but enum zero mapping remains open. Copy, equality, representation, and associated resources need separate rules.

**Initial assessment and probes:** Compare declaration-order zero, an explicitly designated case, and a constrained enum with no obvious default. Consider case evolution, stable identity, and cleanup of payloads.

## Working judgment

Keep case identity separate from backing values and payload types. Exhaustive matching should be assessed with guarded arms and enum evolution; a designated zero may be more understandable than arbitrary ordering, but may constrain future case changes.

## Expanded assessment

### Compiler evidence and boundaries

The exact `Status := enum { Ready; Busy; }` probe fails name resolution on `enum`. The passing `match.subjectless` case tests Boolean selection, not subject-based case matching or enum exhaustiveness. No native enum layout or enum-zero behavior is established by these probes. [Baseline](compiler-baseline.md); [selected enum direction](../../../docs/enums-and-variants.md).

### Benefits, costs, and constraints

- **4.1 Identity:** named enum types and case identities model domain alternatives and avoid ambiguous plain integers. Exhaustive checks can happen entirely at compile time. Public case additions can break exhaustive clients; that is an API evolution choice, not a runtime cost.
- **4.2 Payloads:** payload variants unify data and alternatives, potentially with an inline tag and max-sized payload. Large or rare payloads may inflate every element in an array; explicit indirection can trade memory locality for allocation and pointer cost. Neither boxed storage nor automatic allocation is required by the idea alone.
- **4.3 Construction:** contextual `.Ready` reduces repetition only when the expected enum is unambiguous. Assigned backing values do not make arbitrary underlying values valid enum cases. Check invalid numeric conversion, duplicate backing values and whether payload cases also have backing values.
- **4.4 Matching:** compile-time coverage avoids missing cases; guarding a case does not automatically cover the unguarded remainder. Runtime dispatch may compile to a branch, jump table or be eliminated when known. Pattern extraction must avoid copying expensive/resource payloads without an agreed access mode.
- **4.5 Zero and value behavior:** zero must identify a valid semantic case if the universal all-zero goal is retained. Source order, explicit designation and an added empty case have different evolution and footprint tradeoffs. Distinguish copying active payloads, equality and cleanup from simply copying raw bytes.

### Blockers and cross-feature cases

An `Option<UserID>`, an enum of owning-list versus empty, and an enum with explicit backing `0` should be traced through construction, matching, zero, copy and cleanup. They connect zero and identity [1](01-core-types.md), record/resource ownership [3](03-records.md), patterns [6](06-control-flow.md), and Result/error representation [8](08-failure-cleanup.md). Do not assume a user enum and the specialized outcome representation must have identical ABI.

## Cross-topic routing

Types (1), patterns (6), and failure outcomes (8) interact with case identity and payloads. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [6](06-control-flow.md), [8](08-failure-cleanup.md).

## Joint review: value and carrier enums

All enums have unique option names. Value and carrier are two models. Combining them is deferred until there is a concrete use case that justifies it.

- **Value enums:** bare-only cases choose the value model. An explicit backing value signals value-enum intent. The implicit backing type is `Int` when the declared values provide no evidence for another type. `Int` aliases `Int64`. An explicit backing type is possible, and a supplied value can inform inference through its X-Like category or established type. Backings may involve other compile-time value types, including unions. Automatic numeric assignment starts at zero and continues after the previous value, including an explicit value. Any backing without defined compile-time progression requires explicit values for every option. This leaves room for future nonnumeric progression. Overflow, exact eligibility, and inference across conflicting contributions need rules.
- **Duplicate backing values:** distinct option names may denote the same backing value. In an ordered match, a repeated value arm is unreachable once an earlier arm handles it completely. An earlier guarded arm can leave a path to the later arm. Diagnostic policy for duplicate-value arms is open.
- **Identity and casts:** an enum and its backing type have distinct identities in both directions. Explicit readable conversion can extract a backing value or construct an enum value from one, including an outlier. Cast syntax remains illustrative.
- **Carrier enums:** cases are enum-scoped virtual types with their own nonzero type references. A payload-free case is a single-value type. A case with data has values determined by its payload contract. If parenthesized carrier declarations are chosen, even an empty `created()` signals carrier intent for the enum. Bare sibling cases then have no payload. Explicitly assigned backing values belong to the value model. Case grammar and payload syntax are open.

An outlier is a backing value or Kind that selects no declared option. The union Kind can follow the value-enum model with each case explicitly valued at its member's type reference. This preserves the required mapping independently of source order. A carrier or union Kind of zero selects no type. A nonzero Kind outside the allowed set likewise selects no case. A value enum may have no possible outlier if its declared backing values cover its entire valid domain, for example both values of Bool. Zeroed storage then selects the declared zero-valued case.

The later match discussion restated that ordinary `_` covers remaining declared alternatives. An unhandled outlier would reach an implicit panic guard. Explicit outlier-handler spelling remains open. A provably unreachable explicit handler should be permitted with a suppressible warning. These notes record the latest review direction. They do not select precise diagnostics, an ABI, or compiler support.
