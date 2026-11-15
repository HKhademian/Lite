# 2. Bindings, mutation, and lifetime — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Evaluation order](../../../docs/evaluation-order.md)
- [Mutability](../../../docs/mutability.md)
- [First initialization](../../../docs/first-initialization.md)
- [Local shadowing and copies](../../../docs/local-shadowing-and-copies.md)
- [Functions](../../../docs/functions.md)
- Related investigation catalog areas: INV-010, INV-011, INV-041–046, INV-049.

## 2.1 Scope and symbols

**Baseline:** Ordinary shadowing is sequential; deferred bodies have selected lookup cases, but complete collisions and initialization safety remain open.

**Initial assessment and probes:** Trace a closure defined before a later shadow and called before and after initialization. Preserve binding identity separately from the value observed.

## 2.2 Bindings and assignment

**Baseline:** Bindings are fixed by default; `var` permits whole-binding replacement. Assignment chooses the target and evaluates the right side before writing.

**Initial assessment and probes:** Compare `var x := 1; x = 2` with shadowing `x := 2`. Test effects in a target expression and on the right side so order is observable.

## 2.3 var and mut

**Baseline:** `var` grants replacement; `mut` grants writable access to held data, and each can be independent.

**Initial assessment and probes:** For a record, compare replacing a whole `var` value and changing a field through `mut`; neither permission implies the other. Check nested fields and caller grants.

## 2.4 Initialization

**Baseline:** Typed locals can zero-initialize, or use `= ?` for reserved storage; reads need initialization on all reaching paths. Multi-member union zero has a specified restriction.

**Initial assessment and probes:** Trace initialization in both arms, one arm, and a loop that may not execute. Partial field initialization and cleanup of partially built values remain open.

## 2.5 Copies, references, and lifetimes

**Baseline:** Selected value-copy cases preserve independent observable state; ownership, general borrowing and escape rules remain open.

**Initial assessment and probes:** For a 2 GB list, distinguish a value copy that an optimizer may remove from a requested no-copy read-only access. Writable access is a separate question; revisit the user’s `run_twice` callback and escaping counter without choosing `ref` syntax.

## Working judgment

Keep replacement and writable held-data access independent. Give a no-copy request a semantic contract separate from optimizable value passing; the practical cost is lifetime and alias analysis, which should be justified with real large-value and callback cases.

## Cross-topic routing

Functions (5), collections (7), and cleanup (8) share the copy, access, and lifetime boundaries. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [5](05-functions.md), [7](07-collections.md), [8](08-failure-cleanup.md).
