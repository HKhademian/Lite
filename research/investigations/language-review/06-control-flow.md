# 6. Control flow and patterns — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

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

## Cross-topic routing

Bindings (2), enums (4), collections (7), and cleanup (8) supply important interaction cases. Record new decisions with their owning area; return to this review after the dependency is understood.
