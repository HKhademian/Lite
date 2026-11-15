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

## Cross-topic routing

Types (1), bindings (2), patterns (6), and modules (9) own related boundaries. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [2](02-bindings.md), [6](06-control-flow.md), [9](09-modules.md).
