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

**Confirmed in joint review:** Generics can be parameterized by types, compile-time values, or both. In `[T; N]`, `T` is the element type and `N` is a compile-time value. With `T` fixed to `Int`, extents `3` and `4` still produce distinct array types. The syntax for declaring such parameters, which value domains are admissible, and how value arguments participate in inference and identity remain open. [Fixed arrays](../../../docs/arrays.md)

**Initial assessment and probes:** Compare functions operating on `[Int; 3]` and `[Int; 4]` with one generic over N. Ask how N is checked, inferred, and represented in type identity.

## 10.3 Requirements and inference

**Baseline:** A selected local indexed-read inference direction retains the supplied provider’s element type; complete public contracts cannot be silently strengthened.

**Initial assessment and probes:** Compare a local sum requiring indexing with a public generic signature. Decide how required operations are expressed, inferred, checked, and reported when absent.

## 10.4 Compile-time execution

**Baseline:** General compile-time evaluation and known-input direction are selected; syntax, supported operations and complete execution contract remain in development.

**Initial assessment and probes:** Compare a pure function called with known literals and runtime input. Decide termination limits, diagnostics and whether compile-time and runtime calculations must agree.

## 10.5 Build-time effects

**Baseline:** The selected direction intends compile-time I/O, including files, input and network resources; permissions, dependencies, reproducibility and failure details remain open.

**Confirmed in joint review:** Explicit compile-time execution can perform actions available in the build environment, including file and network operations and standard input and output. These effects occur during the build. A compiled artifact can contain the resulting value. Ordinary constant folding must preserve the original staging of effects. Host permissions, dependency recording, caching and reproducibility remain separate design questions. Review a compile-time diagnostic written to stdout, an answer read from stdin that shapes a generated definition, and an ordinary runtime call with equivalent effects. [Compile-time evaluation](../../../docs/compile-time-evaluation.md)

**Initial assessment and probes:** A compile-time read of a configuration file can change output without source changes. Evaluate declared dependencies and controlled access against the selected effectful direction; check caching, offline builds and whether particular contexts need stricter limits. A general ban would revisit that direction.

## Working judgment

Favor ordinary functions usable across stages and requirements driven by actual operations. Explicit effects and dependency tracking could improve reproducibility, but their cost and ergonomics need concrete builds; do not remove intended compile-time I/O by assumption.

## Expanded assessment

### Compiler evidence and boundaries

The public compiler accepts the builtin `List<T>` slice but its parser explicitly restricts generic type names; the exact generic-function probe fails. The proposed `comptime` block probe also fails. Constant folding and known builtin types do not establish general compile-time evaluation, user generic inference, specialization, or compile-time I/O. [Baseline](compiler-baseline.md); [compile-time direction](../../../docs/compile-time-evaluation.md).

### Benefits, costs, and constraints

- **10.1 Type parameters:** specialization can produce direct calls and expose vectorization without boxing or runtime type dictionaries. Many instantiations can grow code and compile time; shared generic code can reduce size but introduce indirect operations or metadata. Compare per-type and shared strategies without changing semantic behavior.
- **10.2 Value parameters:** making `N` part of `[T; N]` supports fixed inline layout and static bounds proofs. Specializing every N may multiply code; erasing N from a generic implementation can require passing a length. Compile-time integers need value identity, range and evaluability rules.
- **10.3 Requirements:** inferred local capabilities keep algorithms concise and let one sum support arrays and views. Public signatures must expose sufficient contracts for separate checking; transitive requirements, method ambiguity and diagnostics can become a major compiler cost. No runtime interface table is inherent when concrete providers are statically known.
- **10.4 Evaluation:** ordinary functions at compile time can generate tables or validate data and remove runtime computation. The compiler needs bounded execution, diagnostics, target-aware layout and materializable value rules; expensive evaluation can increase build time or embed large data in the binary. Compile-time behavior must not silently differ from runtime numeric and fault semantics.
- **10.5 Effects:** the selected direction includes file, input and network effects during explicit compile-time execution. This enables generated assets but makes dependencies, reproducibility, credentials, host services, sandboxing, cache invalidation and offline builds consequential. Moving an effect between build and runtime changes observable behavior. Zero runtime cost is possible for work fully materialized at compile time, but embedded output still occupies binary/data space.

### Blockers and cross-feature cases

Compile a generic indexed sum over a fixed array and a borrowed view, then compare a runtime-selected provider; track generated code size, indirect calls, bounds proofs and allocation. For compile-time I/O, change an external file without changing source and verify cache invalidation. Generic identity [1](01-core-types.md), views/lifetime [2](02-bindings.md), modules [9](09-modules.md), and errors/limits [8](08-failure-cleanup.md) are required inputs.

## Cross-topic routing

Types (1), functions (5), modules (9), and failures (8) affect generic and compile-time contracts. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [1](01-core-types.md), [5](05-functions.md), [8](08-failure-cleanup.md), [9](09-modules.md).
