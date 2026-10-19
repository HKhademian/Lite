# Types received by recovery handlers

Status: **next-step proposal, 2026-10-19**. Shared else recovery is selected, but its combined Result/panic receiver type is not. This review assumes a boundary that can receive both channels; it does not choose the remaining panic-evaluation scope. Panic, Failure, and generic notation below are explanatory names, not final declarations or ABI.

## The question

```text
text := read_text(path) else(failure) {
    cached_text()
}
```

Suppose read_text returns String ! ReadError. Its returned failure is a ReadError. If the same clause can catch a panic from evaluating that call, failure cannot always have type ReadError: it must also represent a panic.

Omitting the receiver remains the simplest fallback:

```text
text := read_text(path) else {
    cached_text()
}
```

This supplies String on success or a String fallback, without introducing an implicit failure name. It still needs a defined capture scope and cleanup contract. There is no additional argument-result unwrapping: Result-producing arguments retain their individual explicit handling requirement.

## Candidate A: direct union of the handled values

Recommend the direct receiver type E | Panic when a boundary handles a T ! E outcome and typed panics. A panic-only boundary receives Panic; a Result-only inspection receives E. Which channels a boundary covers is part of its source contract, not a type change introduced by an optimizer.

Panic here is a dedicated strongly typed carrier for fault events, with categories and structured payloads to design. It is not an untyped string, an arbitrary Any value, a returned Result tag, or a requirement for user record inheritance. The final category set, extensibility, payload storage, and pattern API remain open.

```text
/* Proposed combined receiver: ReadError | Panic. */
text := read_text(path) else(failure) {
    match failure {
        : ReadError { recover_read(failure) }
        : Panic { recover_panic(failure) }
    }
}
```

Assume both recovery helpers return String. The type patterns reuse existing narrowing, and the match covers the two illustrative alternatives. No wrapper must be deconstructed around the ordinary returned ReadError. Real overlap, generic contracts, and exhaustive coverage must still follow the eventual type rules.

This changes an important expectation: on a general call with combined capture, else(error) does not necessarily bind only the declared E. Code passing that receiver to a function requiring E must narrow it or use an explicitly Result-only handling form. We must not silently preserve an E-only example while also claiming that all panics reach that same receiver.

A stored Result can still be matched with .err(error) to obtain exactly its declared E. The separate call that produced that stored value has already completed; its earlier panic cannot be caught retroactively by matching the stored outcome.

## Candidate B: tag both failure channels

A uniform wrapper could instead expose an illustrative Failure<E> with returned-error and panic variants:

```text
/* Alternative only: illustrative wrapper/variant names. */
text := read_text(path) else(failure) {
    match failure {
        .returned(error) { recover_read(error) }
        .panicked(panic) { recover_panic(panic) }
    }
}
```

The channel stays explicit even if both payloads can have the same type. However, every handler that wants an ordinary returned error must first unpack another layer. That adds routine work to the existing else(error) shape. The wrapper's generic notation and variant names are not selected by this example.

Recommendation: prefer candidate A for ordinary receiver access, while retaining failure-origin information in the internal event/context model. Do not expose a mandatory wrapper merely to preserve internal transport information. The source API for accessing origin, if needed, remains a decision rather than an invented metadata field in these examples.

## Overlapping types cannot identify origin

If the eventual error-type rules permit returning a Panic carrier as an ordinary .err payload, E | Panic can normalize to Panic. The receiver's type alone then cannot tell whether the value was returned or raised as a panic.

Do not infer origin from capitalization, message contents, or a successful type test. Candidate B solves this with an explicit tag. Candidate A needs retained context metadata when origin matters, for example to resume the same panic rather than explicitly return a mapped .err. Metadata spelling, context scope, and resume syntax remain open. This review does not forbid overlapping error types or silently select a panic-rethrow operation.

## Optional typed receiver filtering

A further proposal reuses a typed binding pattern:

```text
/* Proposed filter; read_text declares exactly ReadError. */
text := read_text(path) else(error: ReadError) {
    recover_read(error)
}
```

Under this proposed rule, the pattern selects matching failures. It handles the declared ReadError and supplies a String fallback; a nonmatching panic continues outward implicitly. A bare receiver or omitted receiver would remain unfiltered over the boundary's supported channels.

This is refutable receiver matching, not a converting annotation or an irrefutable parameter declaration. It requires explicitly extending the existing receiver policy; it is not already selected grammar. It also does not distinguish a returned payload from a panic merely because their types overlap.

Most importantly, unmatched returned errors cannot acquire implicit propagation. If read_text instead declares ReadError | DecodeError, handling only ReadError is insufficient to supply a plain String. Recommend rejecting that incomplete plain-value recovery unless the programmer handles the remaining Result errors through another explicit, defined form. A match inside an unfiltered handler can already cover both. This proposal adds neither residual-Result inference nor automatic forwarding of DecodeError.

A panic-only filter on an operation with unhandled Result errors has the same obligation: it cannot make the returned error disappear. Chained selective else clauses, guards, general payload patterns, and their coverage algorithm remain separate proposals.

## Runtime and representation boundaries

A visible union or wrapper describes values and authority to inspect them. It does not select stack versus heap transport, a common object superclass, mandatory allocation, exception tables, or a per-operation Result return ABI. Those remain part of fault transport and the future generic/ownership design.

A public receiver contract must remain stable across inlining and separate compilation. Inferring that one current implementation happens never to panic must not silently remove a public Panic alternative from a combined handler contract. A precise operation-specific fault carrier is possible only under an explicit narrower contract.

## Reference comparisons

- Zig catch captures a value from an error union. This supports a direct typed returned-error receiver, without answering a combined panic-channel type. Source: [Zig 0.15.1 catch](https://ziglang.org/documentation/0.15.1/#catch).
- Rust catch_unwind returns a panic outcome whose error payload is boxed Any + Send. This is a separate carrier from an application's returned Result error. LiteScript's requested structured typed categories need their own design. Sources: [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html) and [panic Result alias](https://doc.rust-lang.org/std/thread/type.Result.html).
- Kotlin catches typed exceptions through its Throwable hierarchy and supports multiple typed handlers. That demonstrates selective capture; it does not require LiteScript to introduce exception inheritance or adopt Kotlin's unchecked model for returned Result errors. Source: [Kotlin exception handling](https://kotlinlang.org/docs/exceptions.html).

## Decisions remaining

- Direct E | Panic versus a tagged Failure<E> wrapper as the public receiver.
- The typed Panic carrier/category model and any failure-origin metadata API.
- Whether typed receiver patterns filter failures, with explicit coverage of returned errors.
- Panic boundary scope, cleanup, transfer mechanism, and any explicit resume operation.

Related: [shared expression recovery](expression-recovery.md), [boundary comparison](recovery-boundaries.md), [typed panics](typed-panics.md), [Result errors](result-and-errors.md), [receiver clauses](receiver-clauses.md), and [union matching](union-patterns.md).
