# Failure-handling shortfalls

Status: **supporting review queue, 2026-10-27**. Selected capture, flat outcome types, munching, collectors, extraction, handler tags, manual failures, and eligible escaping-error inference are recorded in LP-0001–LP-0010 and LP-0012–LP-0015. This list tracks incomplete contracts; alternatives here are not selected rules. See the [proposal register](proposals/README.md).

## 1. Exits with an unmatched remainder

Plain function return is no longer open: [LP-0015 r1](proposals/LP-0015-early-return-recovery-paths.md) selects abandoning the unfinished captured recovery and returning the written success value. The residual type describes paths that complete the recovery declaration; another captured Error/Panic on the exiting path is neither implicitly forwarded nor grounds for additional handling rejection. Handler-local tagged return instead finishes only that body and leaves its remainder for later layers.

The narrower remaining question concerns other exit kinds:

```text
@outer {
    attempt
        else ...errs: ErrA { raise @outer ...errs }
        else :ErrB { recover_b() }
}
```

If ErrB also remains pending, the raise skips its inner handler. Whether that other category accompanies the explicitly supplied failures or the exit requires prior handling is still a proposal. Do not generalize the selected normal-return rule to raise, failure-directed !, or nonlocal tagged/loop exits without a decision. Owner: [LP-0005 r7](proposals/LP-0005-handler-execution-and-exits.md#exiting-with-a-remainder).

## 2. Supplied group provenance and typing

LP-0014 now selects raise ...errs and explicit raise @outer ...errs. Destination/spelling are no longer gaps; both Error and Panic use the same targeting rule. Finish exact retained occurrence identity/provenance representation, admissibility of ambiguous/overlapping failure operands, and sequence-provider/ownership integration. The selected contract preserves supplied channels and order; it does not expose a concrete metadata object or choose a transport ABI. Other unmatched categories belong to the separate exit policy above. Owner: [LP-0011 r4](proposals/LP-0011-explicit-failure-raising.md).

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
