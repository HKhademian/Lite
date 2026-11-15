# 6. Control flow and patterns — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Loops](../../../docs/loops.md)
- [Evaluation order](../../../docs/evaluation-order.md)
- [Conditionals](../../../docs/conditionals.md)
- [Match](../../../docs/match.md)
- [Tuples and patterns](../../../docs/tuples-and-patterns.md)
- [Finally](../../../docs/finally.md)
- Related investigation catalog areas: INV-012, INV-026, INV-034–036.

## 6.1 Blocks and execution order

**Baseline:** Executable block items follow serial order; lookup of deferred bodies has separate selected cases.

**Initial assessment and probes:** Trace a side effect before a later declaration and a deferred function called before initialization. Separate name resolution from when an expression executes.

## 6.2 Conditionals

**Baseline:** Conditions require Bool; a partial conditional has context-dependent behavior and a value-required context needs an else.

**Initial assessment and probes:** Compare a partial declaration initializer, a partial assignment, and a function argument. No-match can preserve a default or do no write in the first two, but not supply an argument value.

## 6.3 Matching and patterns

**Baseline:** Subject and subjectless matching have selected directions; tuple patterns and named record patterns are distinct and exhaustiveness details are incomplete.

**Initial assessment and probes:** Test nested destructuring, a type test, a guarded arm, and a missing alternative. All nested bindings should await whole-pattern success under the selected tuple rules.

## 6.4 Loops

**Baseline:** Lite selects one `loop` family and a single optional item name; body destructuring remains separate.

**Initial assessment and probes:** Compare an empty iterable, a single item, early exit, and a body that may not execute. Check loop results, index metadata, and initialization without assuming traversal always occurs.

## 6.5 Control transfers

**Baseline:** Return, break, continue, failures, and cleanup interact with enclosing constructs; tagged return behavior remains unresolved.

**Initial assessment and probes:** Trace nested loops where an inner break executes cleanup; compare return and panic. Do not invent semantics for `return @tag value;` while its contract is unresolved.

## Working judgment

Prefer rules that make execution and cleanup traceable in source order. Avoid adding a special pattern or control transfer until it solves a concrete case the existing constructs cannot; account for value-required versus action contexts.

## Expanded assessment

### Compiler evidence and boundaries

Generated TS passes `cond.partial`, `loop.sequence`, `loop.value`, `loop.metadata`, `match.subjectless`, and `finally.cleanup` for the recorded cases. The direct subject-based match probe rejects. A selected design rule or an older igniter claim must not be taken as proof of every combination on the current target. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **6.1 Blocks:** predictable source order permits low-level lowering without a mandatory runtime object per block. Defer name resolution and definite initialization can add compile-time analysis. Semantics constrain reordering if reads, side effects or faults differ.
- **6.2 Conditions:** one action/value model reduces concepts, but partial conditions have different consequences in declarations, assignments and value-required positions. Native lowering can use branches and join slots; semantic zero defaults may cause initialization work if not provably unnecessary.
- **6.3 Patterns:** compile-time exhaustiveness and destructuring reduce manual mistakes. Tests on union tags or data values can generate branches; access, copies and failed nested patterns need consistent ordering. Record names versus tuple positions are selected separately. Guarded patterns complicate coverage and can have side effects.
- **6.4 Loops:** one syntax can cover traversal and Boolean loops; statically known arrays offer bounds-check elimination or vectorization when proven safe. Generic traversal should not require allocating iterators, though specialization can increase binary size. Loop metadata and result semantics need concrete lowering, not an assumption of zero cost.
- **6.5 Transfers:** `break`, `continue`, `return`, target tags, panic and cleanup interact; each exit must execute exactly the required cleanup. Static cleanup paths can be emitted inline, but duplication increases code size; general dynamic unwinding may require support. `return @tag value;` semantics remain unresolved and should not be inferred from loop-break tests.

### Blockers and cross-feature cases

Trace an empty loop, loop with failing iterator operation, nested targeted break, and return inside a guarded match with resource cleanup. Compare runtime work and code size for inlined versus shared cleanup paths. Dependencies include initialization [2](02-bindings.md), enum/union coverage [4](04-enums.md), traversal [7](07-collections.md), and cleanup [8](08-failure-cleanup.md).

## Cross-topic routing

Bindings (2), enums (4), collections (7), and cleanup (8) supply important interaction cases. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [2](02-bindings.md), [4](04-enums.md), [7](07-collections.md), [8](08-failure-cleanup.md).
