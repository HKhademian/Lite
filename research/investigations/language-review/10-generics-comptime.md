# 10. Generics and compile-time evaluation — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Generic notation](../../../docs/generic-notation.md)
- [Compile time evaluation](../../../docs/compile-time-evaluation.md)
- [Collection function signatures](../../../docs/collection-function-signatures.md)
- Related investigation catalog areas: INV-027–028, INV-062–063, INV-071.

## 10.1 Type parameters

**Baseline:** A separate function type-parameter list is selected as a direction; complete grammar, inference and implementation remain incomplete.

**Initial assessment and probes:** Compare an identity function instantiated with Int and String, and a generic over a tuple. Check identity, specialization, recursion, and diagnostics without committing to a full generics syntax.

## 10.2 Compile-time value parameters

**Baseline:** Fixed array extents are compile-time type information; a general const-parameter mechanism is still open.

**Initial assessment and probes:** Compare functions operating on `[Int; 3]` and `[Int; 4]` with one generic over N. Ask how N is checked, inferred, and represented in type identity.

## 10.3 Requirements and inference

**Baseline:** A selected local indexed-read inference direction retains the supplied provider’s element type; complete public contracts cannot be silently strengthened.

**Initial assessment and probes:** Compare a local sum requiring indexing with a public generic signature. Decide how required operations are expressed, inferred, checked, and reported when absent.

## 10.4 Compile-time execution

**Baseline:** General compile-time evaluation and known-input direction are selected; syntax, supported operations and complete execution contract remain in development.

**Initial assessment and probes:** Compare a pure function called with known literals and runtime input. Decide termination limits, diagnostics and whether compile-time and runtime calculations must agree.

## 10.5 Build-time effects

**Baseline:** File, network, environment and other effects require a contract for dependencies, reproducibility and failures.

**Initial assessment and probes:** A compile-time read of a configuration file can change output without source changes. Compare rejecting effects, declaring dependencies, and allowing controlled effects; check caching and offline builds.

## Cross-topic routing

Types (1), functions (5), modules (9), and failures (8) affect generic and compile-time contracts. Record new decisions with their owning area; return to this review after the dependency is understood.
