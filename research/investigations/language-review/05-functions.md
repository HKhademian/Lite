# 5. Functions and calls — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Functions](../../../docs/functions.md)
- [Callable input packs](../../../docs/callable-input-packs.md)
- [Callable value variance](../../../docs/callable-value-variance.md)
- [Parameter values and slots](../../../docs/parameter-values-and-slots.md)
- Related investigation catalog areas: INV-030–033, INV-041–046.

## 5.1 Definitions and signatures

**Baseline:** `fn` function types and ordinary named parameters are selected; input packs and result inference have bounded rules, not a completed grammar.

**Initial assessment and probes:** Compare a named definition, local lambda, and stored function type. Identify which parameter labels, results, and failure information belong to a public contract.

## 5.2 Calls and arguments

**Baseline:** Supplied call expressions evaluate in source order; missing applicable defaults are evaluated in declared slot order.

**Initial assessment and probes:** Use two arguments with visible effects and a default referencing earlier state. Test omitted, reordered named, duplicate, and invalid inputs, including an early failure.

## 5.3 Function values

**Baseline:** Functions are values; selected examples copy a stateful function with independent owned state. Copy eligibility and representation remain open.

**Initial assessment and probes:** A counter copy and its original should progress independently under the selected example. Check copying a function containing a resource or an external reference separately.

## 5.4 Surrounding state

**Baseline:** Selected escaping counter examples retain state, but capture eligibility, lifetime, costs and general access rules are open.

**Initial assessment and probes:** Revisit `run_twice(operation: fn (): Int)` with copied and requested no-copy callbacks. The user questions requiring callback mutability in the signature; compare inference, specialization and explicit access without claiming a selected answer.

## 5.5 Callable compatibility

**Baseline:** Selected safe callable adaptation includes certain input/output and fallible-result widening; `var` parameter value types remain invariant.

**Initial assessment and probes:** A function accepting only Int cannot safely stand in for one promising to accept Int or String. Check defaults, labels, effects, state access and error channels individually.

## Cross-topic routing

Bindings (2), errors (8), and generics (10) affect calls and callback contracts. Record new decisions with their owning area; return to this review after the dependency is understood.
