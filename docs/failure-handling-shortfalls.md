# Failure-handling shortfalls

Status: **supporting review queue, 2026-10-27**. Selected capture, flat outcome types, munching, collectors, extraction, handler tags, manual failures, and eligible escaping-error inference are recorded in LP-0001–LP-0010 and LP-0012. This list tracks incomplete contracts; alternatives here are not selected rules. See the [proposal register](proposals/README.md).

## 1. Exits with an unmatched remainder

```text
attempt
    else :ErrA { return fallback_value }
    else :ErrB { recover_b() }
```

When both errors are pending, ErrB survives the first catch. A return, outward ! inside that handler, or Error raise must not silently discard it. Decide whether the remainder forwards despite the requested exit or the exit is rejected until it is handled. Handler-local tagged returns already complete only that body and preserve the remainder for later clauses. Ordinary target validity and cleanup ordering alone do not settle a true nonlocal exit. Owner: [LP-0005 r5](proposals/LP-0005-handler-execution-and-exits.md#exiting-with-a-remainder).

## 2. Explicit forwarding from a catch

Manual Panic raise now emits through ordinary panic propagation; a later eligible else can catch it. The requested operation that forwards caught occurrences past local handlers still needs spelling/target and remainder rules. outcome! forwards its complete operand; a partially consuming catch also has an implicit unmatched remainder. Do not conflate these situations. raise ...ps is historical proposed syntax, not selected manual raise. Scalar p: Panic also needs its multi-match rule. Owner: [LP-0011 r2](proposals/LP-0011-explicit-failure-raising.md).

## 3. Public access to several failures

...errs: Error is selected and binds [Error]; ...fails: Failure binds [Failure]. But a scalar recovery binding and match .err(error) need defined behavior when the same flat outcome holds several occurrences. Neither can choose an arbitrary first occurrence or silently lose payloads. Decide aggregate .err payload inspection and construction without requiring the caller to know how the value was produced. Owner: [flat outcomes](failure-capture-and-unwrapping.md#flat-type-retained-occurrences).

## 4. Custom category declarations and overlap

User-defined Error/Panic categories and manual raise are selected. Finish declaration/conformance syntax, admissible types, mixed/overlapping classifications, and retained origin inspection. Payload names do not determine channels. An open Panic family needs enough identity to support typed matching across separate compilation. Exact provenance when raising a previously caught payload still needs a rule. Owner: [manual failure categories](manual-failures-and-inference.md#custom-categories-and-explicit-raising).

## 5. Repeated capture and inference boundaries

exp? normalizes one outward Result layer; deliberately nested successful Results remain data. Define capture of already panic-bearing outcomes, precise repeated-capture behavior, and full postfix/recovery precedence. Eligible nonrecursive inference now includes escaping returned errors only; complete recursive/public-signature rules and success typing for bodies that never complete normally remain open. Owners: [capture](failure-capture-and-unwrapping.md#capture-normalizes-one-outward-outcome-layer) and [error inference](manual-failures-and-inference.md#infer-all-escaping-returned-error-paths).

## 6. Storage, cleanup extent, and transport

Retain repeated occurrences, order, origins, and primary/secondary cleanup provenance while defining ownership/lifetimes, filtered [T] providers, failure during retention, mixed-channel forwarding, and operation fault attribution. Finish finally attachment and supported foreign/host boundaries. Flat types and compile-time inference do not imply zero storage or an allocation-free panic mechanism. Owner: [implementation boundaries](failure-capture-and-unwrapping.md#implementation-and-remaining-decisions), [cleanup](finally.md), and [runtime costs](memory-and-performance.md).

## Review method and verification

For each issue, first untangle the example into temporary expression/outcome layers, identify lexical exit targets, then track matches, retained occurrences, and new failures. A temporary binding itself does not unwrap an outcome; !, inspection, or complete recovery does. Eager statements cannot retroactively protect prior panic evaluation. Vary one property at a time and keep proposals distinct from accepted rules. Documentation/link checks establish document consistency; parser, typechecker, and runtime validation require an implementation that this design-only repository does not supply.
