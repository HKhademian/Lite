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

**Baseline (updated 2026-11-15):** Root file blocks and inner braced blocks use the **same surrounding-access model**: symbols in block `X` share parallel compile-time visibility ("circuit wiring") and uniform late read/write/type/call access along the **execution trace**, rejecting only uninitialized reads (`x: Int = ?;` or early pre-init calls). Selected escaping counter examples retain state across calls; capture eligibility, lifetime, costs, and general Slice 4b/4c access rules remain open.

**Initial assessment and probes:** Revisit `run_twice(operation: fn (): Int)` with copied and requested no-copy callbacks under the uniform root/inner rule. Note that root file storage has program-wide lifetime (no parent frame) whereas inner block state needs Slice 4b/4c escape/lifetime handling; compare inference, specialization, and explicit access without claiming a selected answer.

## 5.5 Callable compatibility

**Baseline:** Selected safe callable adaptation includes certain input/output and fallible-result widening; `var` parameter value types remain invariant.

**Initial assessment and probes:** A function accepting only Int cannot safely stand in for one promising to accept Int or String. Check defaults, labels, effects, state access and error channels individually.

## Working judgment

Preserve simple function signatures where sound; compare inference and specialization before exposing callback state requirements everywhere. Any approach must still explain whether calls mutate independent copied state or the caller’s retained state and how separate compilation checks it.

## Expanded assessment

### Compiler evidence and boundaries

`function.recursion` passes on generated TS. The maintained compiler documents named argument routing, and the verifier executes named-argument consumers. The local capture declaration in the baseline is accepted, while the tested returned function type fails. Neither demonstrates closure lifetime, copyable counters, general callable variance, defaults or user-defined generics. Public output remains TS/Node. [Baseline](compiler-baseline.md).

### Benefits, costs, and constraints

- **5.1 Signatures:** concise inferred local signatures help usability; explicit public contracts support separate checking. Representing labels or types as compile-time information can avoid runtime metadata, but exported ABI, type inference complexity and recursive signatures need specification.
- **5.2 Calls:** source-order argument evaluation and subsequent default handling preserve effects, but can require temporary values when named arguments are reordered. Do not reorder or omit overwritten expression effects merely to optimize. Fixed arguments can be passed in registers where the target ABI permits; no ABI is yet selected.
- **5.3 Function values:** direct known calls can be inlined and specialized; an unknown function value generally needs a code address and, if it retains state, an environment or equivalent representation. No allocation is inherent for a statically known nonescaping environment, but arbitrary escape and copying need lifetime and storage contracts.
- **5.4 Surrounding state:** preserving the selected independent copy of a stateful counter may require copying its environment; reference-like caller state has different lifetime and mutation obligations. The user's `run_twice(operation: fn (): Int)` asks whether the function author can avoid mutability annotations. Inference, specialization and an erased callable contract differ in code size, checkability and dynamic dispatch; none is automatically selected.
- **5.5 Compatibility:** safe callable widening must account for inputs contravariantly, results covariantly, failure channels, omission/default contracts and writable permissions. Representation adapters can add indirect calls or copies; prove when they disappear rather than assuming every type conversion is free.

### Blockers and cross-feature cases

For `run_twice`, compare a stateless callback, independent copied counter, read-only borrowed callback and writable borrowed callback; observe original state after both calls and after escape. Contrast one compilation of an erased public function with specialization per callback and account for binary growth. Resolve access [2](02-bindings.md), failures [8](08-failure-cleanup.md), and generics [10](10-generics-comptime.md) before promising one mechanism.

## Cross-topic routing

Bindings (2), errors (8), and generics (10) affect calls and callback contracts. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [2](02-bindings.md), [8](08-failure-cleanup.md), [10](10-generics-comptime.md).

## Joint review: callable contracts and grants

A function type describes the callable contract. A function value supplies an implementation. A type alias can name the contract. The current review covers captureless function values. Capture rules are undecided, including returning a function that retains writable access granted by an earlier call.

Argument omission belongs to the public function type. The default expression belongs to the implementation. The discussion used `fn(value: Int, factor: Int?): Int` as the public type and `(v, f = 2) { v * f }` as the implementation. Public labels route supplied values, and receiver names are local. A combined declaration with `factor: Int = 2` expresses both concepts. The placement of the omission marker in these sketches needs reconciliation with the earlier grammar.

The user corrected the review's writable-parameter example: `var` applies inside the function body, and `mut` is declared in the function header. A call that grants writable access must express consent explicitly and already possess the access being granted. Grant syntax remains open. The correction needs reconciliation with existing documents describing caller-slot `var` parameters.

A zero-initialized callable returns all-zero of its declared result type after ordinary evaluation of supplied arguments. The zero implementation does not evaluate omitted defaults. Where there is no declared result type, the body can determine it unambiguously. The final expression supplies a block's value. Untagged return and failure transfers target the innermost enclosing function, subject to their respective rules.

### Dependency fallback for omitted defaults

Supplied argument expressions evaluate once in the caller's written order. Routing establishes the supplied parameter values, and the implementation fills omitted defaults in parameter declaration order. A supplied argument skips its default. The joint review proposes the same fallback considered for [record defaults](../../../docs/record-initialization.md#10-evaluation-mutability-and-implementation-cost): if declaration order would leave a dependency uninitialized, the compiler could look for a valid dependency order among the omitted defaults before evaluating any of them. The supplied values are already available to that dependency analysis. A cycle among omitted defaults has no valid starting value and requires a diagnostic. Supplying an argument can remove its default from the dependency graph.

This proposal would revisit the current restriction to earlier-parameter reads. Automatic scheduling, deterministic ordering for independent defaults, and the effect rules for reordered defaults remain open. Test an ordinary call with no reorder needed, a forward dependency that the fallback could resolve, and a cycle with and without an explicitly supplied argument. [Current callable default contract](../../../docs/callable-default-contracts.md)
