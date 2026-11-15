# 8. Errors, panics, and cleanup — initial review

Status: **preliminary, 2026-11-15; awaiting joint review**. All recommendations below are working hypotheses, not selected design or proof of compiler support. Recheck sources before a decision.

## Baseline and sources

- [Expression recovery](../../../docs/expression-recovery.md)
- [Finally](../../../docs/finally.md)
- [Manual failures and inference](../../../docs/manual-failures-and-inference.md)
- Related investigation catalog areas: INV-037–040.

## 8.1 Failure categories

**Baseline:** Recoverable returned errors and panics have distinct channels; explicitly captured failures preserve their origin on forwarding.

**Initial assessment and probes:** Compare a missing file reported as a returned error with an indexing fault. Decide recovery requirements from the operation contract rather than assuming all failures are interchangeable.

## 8.2 Function contracts

**Baseline:** Fallible results use `T ! E`, with shorthand and inference governed by separate rules.

**Initial assessment and probes:** Compare a declared failure set with a locally handled error and an escaping panic. Check when inference can expose failures at a public boundary.

## 8.3 Propagation

**Baseline:** Postfix `!` forwards retained failures; selected cleanup applies on relevant exits.

**Initial assessment and probes:** Trace a fallible call followed by a side effect: on failure, the later effect does not run and applicable cleanup still does. Separate error forwarding from panic handling.

## 8.4 Handling and recovery

**Baseline:** An operation handler and an explicit block handler have selected distinct panic coverage.

**Initial assessment and probes:** Compare `operation(argument()) else { ... }` with `{ operation(argument()) } else { ... }`: a fault in argument evaluation belongs to the block boundary, not the operation-only handler.

## 8.5 Cleanup

**Baseline:** Selected `finally` is cleanup-only; an existing failure stays primary when cleanup fails, and later failures are retained.

**Initial assessment and probes:** Trace normal return, returned error and panic through nested cleanup, then a cleanup failure. Resource lifetime, hard abort and full attachment grammar remain open.

## Cross-topic routing

Control flow (6), resource lifetimes (2), and compile-time execution (10) share failure paths. Record new decisions with their owning area; return to this review after the dependency is understood.
