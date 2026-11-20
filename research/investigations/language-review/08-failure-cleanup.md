# 8. Errors, panics, and cleanup — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Result and errors](../../../docs/result-and-errors.md)
- [Expression recovery](../../../docs/expression-recovery.md)
- [Finally](../../../docs/finally.md)
- [Manual failures and inference](../../../docs/manual-failures-and-inference.md)
- Related investigation catalog areas: INV-037–040.

## 8.1 Failure categories

**Baseline:** Recoverable returned errors and panics have distinct channels; explicitly captured failures preserve their origin on forwarding.

**Confirmed in joint review:** A `Panic` propagates implicitly through enclosing calls until a matching catcher handles it. An `Error` belongs to a visible returned-error contract (`T ! E`). The caller explicitly handles it or explicitly propagates it. Keep these two paths as the baseline for subsequent review. [Result and errors](../../../docs/result-and-errors.md) · [Panics](../../../docs/panics.md)

**Ordinary operations:** Indexing and basic arithmetic yield ordinary values on success. Their runtime faults use the Panic path. For design verification, test an in-range `items[i]` yielding the element, an out-of-range runtime `i` raising a typed Panic, and an arithmetic fault such as division by zero under a defined division rule. An explicit lookup can offer an absence value where it is expected. [Checked fault policy](../../../docs/checked-fault-policy.md)

**Initial assessment and probes:** Compare a missing file reported as a returned error with an indexing fault. Decide recovery requirements from the operation contract rather than assuming all failures are interchangeable.

## 8.2 Function contracts

**Baseline:** Fallible results use `T ! E`, with shorthand and inference governed by separate rules.

**Initial assessment and probes:** Compare a declared failure set with a locally handled error and an escaping panic. Check when inference can expose failures at a public boundary.

## 8.3 Propagation

**Baseline:** Postfix `!` forwards retained failures; selected cleanup applies on relevant exits.

**Joint review:** Read `config := readConfig(path)!` as taking the successful value or catching the returned error and immediately raising it. The sketch `readConfig(path) else/catch err { raise err; }` expresses that control flow for an outcome with one error. `else/catch err` is illustrative notation. Like untagged `return`, untagged `raise` targets the innermost enclosing function, even from inside a nested block. The function's error contract must admit the forwarded error.

For outcomes with multiple retained failures, postfix `!` forwards the entire group and preserves its channels, order, payloads, and origins. A handler that binds and raises only one occurrence does not reproduce that behavior. Verify normal extraction, one-error forwarding from inside a nested block, and forwarding of a retained group through applicable cleanup separately. [Extraction and forwarding](../../../docs/failure-capture-and-unwrapping.md) · [Directed raise](../../../docs/manual-failures-and-inference.md#directed-raise-boundaries)

**Initial assessment and probes:** Trace a fallible call followed by a side effect: on failure, the later effect does not run and applicable cleanup still does. Separate error forwarding from panic handling.

## 8.4 Handling and recovery

**Baseline:** An operation handler and an explicit block handler have selected distinct panic coverage.

**Initial assessment and probes:** Compare `operation(argument()) else { ... }` with `{ operation(argument()) } else { ... }`: a fault in argument evaluation belongs to the block boundary, not the operation-only handler.

## 8.5 Cleanup

**Baseline:** Selected `finally` is cleanup-only; an existing failure stays primary when cleanup fails, and later failures are retained.

**Initial assessment and probes:** Trace normal return, returned error and panic through nested cleanup, then a cleanup failure. Resource lifetime, hard abort and full attachment grammar remain open.

## Working judgment

Keep recoverable errors and panics distinguishable while making ordinary propagation and cleanup predictable. Compare handler boundaries with failures during argument evaluation; simple syntax should not obscure which effects have already happened.

## Expanded assessment

### Compiler evidence and boundaries

`finally.cleanup` passes a finite generated TS scenario including normal and return paths. This does not prove retained secondary failures, typed recovery or a native unwinder. The tested `Int ! String` function signature rejects before execution. [Baseline](compiler-baseline.md); [selected recovery rules](../../../docs/spec/README.md#ls-008--errors-recovery-and-cleanup).

### Benefits, costs, and constraints

- **8.1 Categories:** separate returned errors and panics express whether failure is part of a function result or an implicit fault. Static knowledge can specialize common cases, but a runtime branch or tag may remain when success is not known. Avoid conflating process termination in a prototype with selected recovery semantics.
- **8.2 Contracts:** an explicit failure type enables callers to handle errors without a universal exception hierarchy. Inferred contracts reduce annotation but need public API stability and transitive analysis. Result payload and metadata size can affect arrays and hot returns; specialized encodings may help when valid and observable behavior is preserved.
- **8.3 Propagation:** `!` and cleanup must preserve order, origin and failure channel. Inlining error branches can make the success path small but duplicate code; shared paths can reduce size but introduce branches or calls. Both must be compared under identical semantics.
- **8.4 Recovery:** operation-level and block-level handlers catch different fault boundaries. Static typing may remove unnecessary tests; dynamically retaining, filtering and propagating multiple occurrences requires representation and possibly storage. A broad handler must not accidentally catch an argument failure outside its selected boundary.
- **8.5 Cleanup:** deterministic cleanup works without a tracing GC, but every applicable exit must execute it. The selected policy retains secondary cleanup failures rather than discarding them. Arbitrarily many retained occurrences with payloads cannot be guaranteed in a fixed bounded buffer without another limit or storage policy; OOM, recursion, hard abort and transport need explicit decisions. This is a real tension with absolute no runtime footprint, not proof of a mandatory heap or unwinder.

### Blockers and cross-feature cases

Trace nested cleanups that each fail after a primary error; a panic during argument evaluation; and a partially initialized record containing a list. Decide storage, no-allocation modes, truncation versus exact retention only through explicit design review. These cases connect resource lifetimes [2](02-bindings.md), payload identity [4](04-enums.md), control transfers [6](06-control-flow.md), and compile-time failures [10](10-generics-comptime.md).

## Cross-topic routing

Control flow (6), resource lifetimes (2), and compile-time execution (10) share failure paths. Record new decisions with their owning area; return to this review after the dependency is understood.

Related preliminary notes: [2](02-bindings.md), [6](06-control-flow.md), [10](10-generics-comptime.md).
