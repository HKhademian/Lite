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

**Baseline (updated 2026-11-15):** Every LiteLang file is an invisible-brace root code block with **no parent block** and `pub` as its sole extra capability, matching inner `{ ... }` blocks in scope and access rules. Within any block, symbol visibility is **parallel at compile time** ("circuit wiring") while values propagate top to bottom along the **execution trace**; deferred read/write/type/call access is uniform across root and inner blocks, rejecting only uninitialized reads (`x: Int = ?;` or pre-init reads). **Same-block redeclaration shadowing is postponed completely** (no two declarations of the same symbol in one block, even of different kinds, for now), while flow-sensitive narrowing without redeclaration and nested inner-block shadowing remain distinct. Side-effect-free dead code in any block may be eliminated by DCE.

**Initial assessment and probes:** Trace forward references, reserved storage (`x: Int = ?;`), nested `{ ... }` outer shadowing, and deferred bodies defining and calling before/after initialization along the execution trace. Keep binding identity and initialization proof separate from value flow and nested captures.

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

## Expanded assessment

### Compiler evidence and boundaries

Generated TS passes `scope.locals`, `scope.assignment`, `mut.inferred`, `init.zero`, and `init.reserved`; consult those sources for exact programs. A plain `var` capture declaration passes `check`, but no call, escape, or copy was tested by that probe. The tested function-returning-function declaration fails type recognition. The proposed `ref` parameter fails; this does not establish that no other reference mechanism is possible. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **2.1 Scope:** lexical lookup enables static resolution and avoids runtime name lookup. The deferred-body and source-order rules can require flow-sensitive initialization analysis; compiler effort grows without necessarily increasing runtime footprint. Preserve deterministic shadowing and distinguish definition from invocation.
- **2.2 Assignment:** target-once, RHS-then-write semantics avoid re-evaluating effectful indexes. A native compiler may use temporaries or registers; assignment order constrains when it may reorder faults and side effects. Test aliasing target and RHS with a throwing RHS.
- **2.3 Permissions:** `var` replacement and `mut` access carry useful static facts; an implementation can erase permissions after checking. They do not themselves prove exclusive references or absence of aliasing. Multiple disjoint element grants require sound proof; dynamically indexed paths can need rejection or a justified runtime check.
- **2.4 Initialization:** definite initialization can avoid a mandatory zero pass for reserved storage, while preventing reads of uninitialized bytes. Partial initialization requires per-field or flow tracking and cleanup of already constructed resources; a compiler proof can remove runtime flags in simple cases but branching and escaping may require state or restrictions.
- **2.5 Copies and lifetimes:** value semantics make independently copied state predictable, but copying large arrays or owned containers can be costly. Optimizing a copy away is not a promise of no copy. Explicit read-only noncopying access, writable access, and reference escape are independent dimensions. A no-GC design needs a lifetime, ownership or comparable safety rule and a destruction strategy; no particular borrow syntax or ownership model is selected.

### Blockers and cross-feature cases

Trace a 2 GB list passed read-only while an alias mutates or reallocates it; a counter copied then invoked twice; and a reference returned after its owner exits. A static-only rule may reject useful patterns; shared ownership or runtime checking can add state and cost. Decide whether the user demands a semantic no-copy guarantee, how long it applies, and which sources can outlive it. These decisions gate list views [7](07-collections.md), closure state [5](05-functions.md), and cleanup [8](08-failure-cleanup.md). Compiler acceptance of a local capture is not evidence for any of them.

## Cross-topic routing

Functions (5), collections (7), and cleanup (8) share the copy, access, and lifetime boundaries. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [5](05-functions.md), [7](07-collections.md), [8](08-failure-cleanup.md).

## Joint review: binding, writes, and scope

The review confirmed that `var` is required to overwrite an initialized binding. `mut` separately permits writable access to contents where the provider and access rules allow it. Plain initialization and assignment copy the value under its applicable copy contract. A physical copy can be elided when the same behavior is preserved.

Storage declared with `= ?` has no readable value until a first write. Every path reaching a read must establish initialization. Arbitrary bytes from reserved storage never become an initialized Lite value. An optimizer can remove an unobservable write while preserving evaluation effects, failure and cleanup.

Nested scopes can shadow an outer name with a separate binding or assign to the existing outer binding under its permissions. Same-block redeclaration remains postponed. Scope governs where a name resolves. Lifetime governs where access to the underlying storage remains valid. After successful assignment, a known active union member can refine reads without narrowing what the declared slot accepts on later writes.
