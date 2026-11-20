# 3. Records — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Records](../../../docs/records.md)
- [Record type identity](../../../docs/record-type-identity.md)
- [Record initialization](../../../docs/record-initialization.md)
- [Aggregate patterns](../../../docs/aggregate-patterns.md)
- [Local shadowing and copies](../../../docs/local-shadowing-and-copies.md)
- Related investigation catalog areas: INV-023, INV-041, INV-049–050.

## 3.1 Declaration and identity

**Baseline:** Each record declaration creates a distinct nominal type; aliasing an existing record does not create another identity.

**Initial assessment and probes:** Two declarations with `name: String` remain distinct. Examine whether general distinct types complement records without collapsing either concept.

## 3.2 Fields and visibility

**Baseline:** Record fields use names for construction, access, and deconstruction; numeric tuple positions do not expose fields. Visibility syntax remains open.

**Initial assessment and probes:** Compare access to a public versus private field from another module, including construction and patterns. Decide whether defaults or getters can cross the same boundary.

## 3.3 Construction

**Baseline:** Known record destinations permit contextual field construction; named fields route to their declared destinations.

**Initial assessment and probes:** Compare explicit `User { name = "Ali", age = 10 }` and a contextual initializer. Determine missing, unknown, duplicate, and reordered field behavior without assuming full grammar.

## 3.4 Defaults and zero

**Baseline:** Where admitted, omitted typed initialization or `= 0` uses semantic zero; `= {}` selects declared-default construction. Full field-default rules remain open.

**Initial assessment and probes:** For a field with default 10 and zero 0, trace both paths and a missing required field. Check distinct invariants and unresolved union zero before deciding validity.

## 3.5 Value behavior

**Baseline:** Selected record copies include inline record values; reference-valued fields preserve their targets. Equality and resource-copy eligibility remain open.

**Initial assessment and probes:** Compare independently changing a copied inline field with following a copied reference. Evaluate equality, visibility, and cleanup without presuming deep cloning.

## Working judgment

Keep field-oriented records as their own concept while reusing consistent field syntax and value rules where possible. Name-only access protects abstraction but makes positional interoperability less convenient; explicit reconstruction is the baseline for distinct record types.

## Expanded assessment

### Compiler evidence and boundaries

The exact `User := record { ... }` probe is rejected as unsupported by public generated TS. Flat named tuples pass `tuple.shape`, but that does not implement nominal record declarations, record defaults or field visibility. The selected record rules are design evidence, not generated record support. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **3.1 Identity:** separate declarations prevent accidental substitution of same-shaped domain values. Identity can be checked and erased statically; separate compiled layouts or runtime tags are not inherent. General distinct wrappers and record identity need compatible yet separate rules.
- **3.2 Fields:** names support readable APIs and access control. Private fields can preserve invariants and permit representation changes; constructor, pattern and reflection access must not bypass visibility. Field order as a source-level access rule is separate from ABI ordering and padding; a promised stable ABI can limit reordering optimization.
- **3.3 Construction:** field names prevent accidental swaps; reordering named expressions must preserve written evaluation order. Duplicate/missing fields, early failure, partial construction and defaults need precise cases. Contextual construction can avoid repeating a type without identifying a record by field shape.
- **3.4 Zero and defaults:** semantic zero and declared defaults are separate selected mechanisms. A record whose field has a domain invariant or unresolved union zero exposes a potential conflict with a universal valid all-zero representation. Decide whether the field has a valid zero, the type has a representable sentinel, or the current rule must be revisited; do not silently weaken an invariant.
- **3.5 Values:** inline aggregate layout can be compact and fast and allow scalar replacement; large copies may cost memory bandwidth. Reference fields can preserve aliases while inline fields copy independently. Resource-owning fields require copy eligibility, move/clone, partial cleanup, and explicit cost, all unresolved beyond current bounded selections.

### Blockers and cross-feature cases

Review a `User` containing an owning list and `UserID`, a default whose expression fails, a private required field, and construction across a module boundary. Each forces identity/conversion [1](01-core-types.md), access/lifetime [2](02-bindings.md), failure cleanup [8](08-failure-cleanup.md), and public API [9](09-modules.md) to agree. Choose a minimal record core before adding derived equality, reflection, implicit accessors or methods; each needs its own value and footprint contract.

## Cross-topic routing

Types (1), bindings (2), patterns (6), and modules (9) own related boundaries. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [2](02-bindings.md), [6](06-control-flow.md), [9](09-modules.md).

## Joint review: labels, evaluation order, and overrides

Field labels route supplied values to their fields regardless of written order. Explicit expressions execute in written order. The same distinction applies to labeled arguments: evaluation follows the call, and the signature determines which parameter receives each result.

Repeating a direct field label is rejected. The user wants explicit spread and deconstruction to allow intentional overriding in written order. A later supplied value can replace an earlier one in that setting. Exact spread syntax and the boundary between direct labels, overrides and deconstruction stay open. Test a spread before and after an explicit field, duplicate direct fields, and side effects on both sides of an override.

An omitted field uses its own default, which is zero when none is declared. A nested field declared with `= {}` explicitly asks for the nested record's defaults. [Nested defaults and zero](../../../docs/record-initialization.md#nested-default-versus-zero)
