# Failure-handling shortfalls

Status: **supporting review queue, 2026-10-27**. Selected capture, flat outcome types, munching, collectors, extraction, handler tags, manual failures, and eligible escaping-error inference are recorded in LP-0001–LP-0010 and LP-0012–LP-0014. This list tracks incomplete contracts; alternatives here are not selected rules. See the [proposal register](proposals/README.md).

## 1. Exits with an unmatched remainder

```text
attempt
    else :ErrA { return fallback_value }
    else :ErrB { recover_b() }
```

When both errors are pending, ErrB survives the first catch. A true nonlocal return, raise, or ! inside that handler must not silently discard it. LP-0014 now specifies the destination and skipped handlers; carrying the remainder too in preserved order is the reviewed recommendation, while rejection until handled remains an alternative. Handler-local tagged return is already settled by tmp* composition: finish that handler and pass ErrB to the next layer. Do not treat ordinary local completion as an open issue. Owner: [LP-0005 r6](proposals/LP-0005-handler-execution-and-exits.md#exiting-with-a-remainder).

## 2. Supplied group provenance and typing

LP-0014 now selects raise ...errs and explicit raise @outer ...errs. Destination/spelling are no longer gaps; both Error and Panic use the same targeting rule. Finish exact retained occurrence identity/provenance representation, admissibility of ambiguous/overlapping failure operands, and sequence-provider/ownership integration. The selected contract preserves supplied channels and order; it does not expose a concrete metadata object or choose a transport ABI. Other unmatched categories belong to the separate exit policy above. Owner: [LP-0011 r3](proposals/LP-0011-explicit-failure-raising.md).

## 3. Public access to several failures

Typed scalar binding is now solved by LP-0013: expose the first match and intentionally discard the other matching payloads, leaving other categories untouched. ...errs: Error exposes all matches as [Error]. Untyped broad receiver binding and match .err(error) still need a complete aggregate payload/inspection contract. This API must work from the flat type without knowing capture provenance. Owner: [flat outcomes](failure-capture-and-unwrapping.md#flat-type-retained-occurrences).

## 4. Custom category declarations and overlap

User-defined Error/Panic categories and manual raise are selected. Finish declaration/conformance syntax, admissible types, mixed/overlapping classifications, and retained origin inspection. Payload names do not determine channels. An open Panic family needs enough identity to support typed matching across separate compilation. Exact provenance when raising a previously caught payload still needs a rule. Owner: [manual failure categories](manual-failures-and-inference.md#custom-categories-and-explicit-raising).

## 5. Repeated capture and inference boundaries

exp? normalizes one outward Result layer; deliberately nested successful Results remain data. Define capture of already panic-bearing outcomes, precise repeated-capture behavior, and full postfix/recovery precedence. Eligible nonrecursive inference now includes escaping returned errors only; complete recursive/public-signature rules and success typing for bodies that never complete normally remain open. Owners: [capture](failure-capture-and-unwrapping.md#capture-normalizes-one-outward-outcome-layer) and [error inference](manual-failures-and-inference.md#infer-all-escaping-returned-error-paths).

## 6. Storage, cleanup extent, and transport

Retain repeated occurrences, order, origins, and primary/secondary cleanup provenance while defining ownership/lifetimes, filtered [T] providers, failure during retention, mixed-channel forwarding, and operation fault attribution. Finish finally attachment and supported foreign/host boundaries. Flat types and compile-time inference do not imply zero storage or an allocation-free panic mechanism. Owner: [implementation boundaries](failure-capture-and-unwrapping.md#implementation-and-remaining-decisions), [cleanup](finally.md), and [runtime costs](memory-and-performance.md).

## Review method and verification

For each issue, first untangle the example into temporary expression/outcome layers, identify lexical exit targets, then track matches, retained occurrences, and new failures. A temporary binding itself does not unwrap an outcome; !, inspection, or complete recovery does. Eager statements cannot retroactively protect prior panic evaluation. Vary one property at a time and keep proposals distinct from accepted rules. Documentation/link checks establish document consistency; parser, typechecker, and runtime validation require an implementation that this design-only repository does not supply.
