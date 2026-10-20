# Types received by recovery handlers

Status: **typed failure filtering selected, 2026-10-20; broad mixed-channel receiver representation remains open**. Shared else can match all failures or filter for one type. This review assumes a boundary that can receive both channels; it does not choose the remaining panic-evaluation scope. Panic, Failure, and generic notation below are explanatory names, not final declarations or ABI.

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

## Selected typed receiver filtering

The user selects a typed filter that reuses binding/type-pattern syntax:

```text
/* A target can return ReadError and can raise BoundPanic. */
text := read_text(path) else(p: BoundPanic) {
    recover_bound_panic(p)
}!
```

This handles only the matching `BoundPanic`. The suffix `!` explicitly forwards a remaining returned `ReadError`; it does not alter panic handling. Any panic category that does not match `BoundPanic` continues outward implicitly. If the target has no returned `Result` error, this filter needs no `!` for panic propagation.

The type-only spellings distinguish matching from binding:

```text
target else (BoundPanic) { recover_without_binding() }
target else (Panic) { recover_any_panic() }
```

`BoundPanic` matches that panic category without binding a name. `Panic` matches the broad panic family and does not match returned errors. An analogous filter can handle one returned-error type:

```text
text := read_text(path) else(e: BoundError) {
    recover_bound_error(e)
}!
```

This handles `BoundError`; other returned errors remain subject to explicit handling or `!` propagation. An untyped handler matches all failure types supported by its target:

```text
target else { recover_without_binding() }
target else (_) { report(_) ; recover() }
target else (failure) { report(failure); recover() }
```

Receiverless `else` binds no failure. `_` is an ordinary readable binding, not a special nonbinding wildcard; it matches every supported failure and can be used or left unused without a warning. An untyped name also matches all and binds the broad failure value. If both channels are possible, its static receiver type and channel-origin representation remain open.

This is refutable receiver matching, not a converting annotation or an irrefutable parameter declaration. The filter handles its matching failure and only that failure. Unmatched panics propagate implicitly. Unmatched returned errors do not: they must remain represented as a `Result`, be handled by another defined form, or be propagated explicitly. Chaining multiple typed filters on one target and their coverage/ordering rules remain open.

The filter does not distinguish a returned payload from a panic solely because their payload types overlap. Preserve channel origin in the eventual carrier/context where required; see the following section.

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
- The exact type relationships and coverage diagnostics for selected typed receiver patterns.
- Panic boundary scope, transfer mechanism, cleanup-failure aggregate matching/access, and any explicit resume operation; cleanup-failure precedence is selected, and language-managed propagation already runs applicable exited-scope `finally` blocks before an outer matching handler.

Related: [shared expression recovery](expression-recovery.md), [boundary comparison](recovery-boundaries.md), [typed panics](typed-panics.md), [Result errors](result-and-errors.md), [receiver clauses](receiver-clauses.md), and [union matching](union-patterns.md).
