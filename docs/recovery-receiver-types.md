# Types received by recovery handlers

Status: **typed filtering and ellipsis collectors selected; flat Error/Panic/Failure outcome categories selected 2026-10-27 in LP-0009**. The earlier receiver alternatives below are design history. Typed scalar first-match/discard is selected in LP-0013; untyped binding, origin-inspection syntax, and representation remain open; [capture and unwrapping](failure-capture-and-unwrapping.md) states the current contract.

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

This supplies String on success or a String fallback, without introducing an implicit failure name. It still needs operation fault attribution, block/chain integration, and complete cleanup/transport contracts. There is no additional argument-result unwrapping: Result-producing arguments retain their individual explicit handling requirement.

## Handler execution and expensive fallbacks

Status: **open review, 2026-10-26; [LP-0005 r7](proposals/LP-0005-handler-execution-and-exits.md) is a draft for remaining scalar-binding and exit questions; once-per-clause execution is selected in LP-0007**.

The user points out that `{ read_cached() } else { fallback_heavy_db_read() }` must be reviewed before adopting automatic per-occurrence handler execution: several pending failures could otherwise repeat an expensive fallback. Consuming a group is distinct from running its recovery expression. The assistant withdraws automatic repetition as a general default recommendation.

The revised candidate was selected in LP-0007: run each matching clause's body at most once per evaluation of its target and consume its matched group. A catch-all could then replace one failed cache computation with one database computation. Typed group binding still needs design; a scalar ErrA annotation exposes the first match and intentionally discards the other matching payloads under LP-0013. Running receiverless handlers once but named handlers per occurrence is a separate alternative with observable costs: adding a receiver name would change execution count. Those contrasting execution-count alternatives are unselected; the ellipsis collector below is selected.

The user also explores optional count/details inside ErrA when meaningful to its domain, such as a batch failure count, while ordinary errors need no such field. This separates error-value information from the count-free function signature and handler execution count. It does not yet define how independently produced same-type values combine or change the selected retention of secondary failures; see [type-owned repetition information](proposals/LP-0005-handler-execution-and-exits.md#type-owned-repetition-information).

A handler's own new failure does not re-enter that handler under the existing selected rule. LP-0015 resolves plain function return from captured recovery. Other nonlocal tagged/failure-directed exits with an unmatched remainder retain a separate unresolved control-flow question; it cannot be assumed to run the next clause or consume its remaining failures. See [the draft's exit example](proposals/LP-0005-handler-execution-and-exits.md#exiting-with-a-remainder).

## Typed collector capture selected

Selected 2026-10-26 in [LP-0007 r1](proposals/LP-0007-typed-recovery-collectors.md):

```text
{ read_cached() }
    else ...errs: Error {
        /* errs: [Error]; err: Error */
        loop errs as err { report_failure(err) }
    }
```

The ellipsis declares a collector; Error is its element/filter type. The binding errs has the readable [Error] indexed-sequence contract. The clause captures all matches, including one element for a singular error, and its body runs once. No match skips it. The explicit loop performs per-error work. Receiverless and ordinary typed catches retain [all-match consumption](expression-recovery.md#whole-match-consumption-selected), independently of whether the programmer asks to bind the collected values.

Each collector preserves occurrence order within its matched remainder. LP-0009 now selects ...errs: Error for returned errors, ...ps: Panic for panics, and ...fails: Failure for both, with [Error], [Panic], and [Failure] bindings. The earlier symbolOfAny placeholder is not source syntax. Several typed collectors preserve within-group order but process their groups in written else order.

The former `errs: [Error]` collector spelling is not selected. Ordinary sequence-valued error typing retains its existing context; LP-0013 now binds the first matching value and consumes/discards the other matches for typed scalar receivers. Collection capture promises [T] traversal, cheap count, and indexed reads without selecting a contiguous owner, allocation/copying, escaping lifetime, or origin-inspection API. A loop break does not revive caught failures; other failure-directed/tagged exit remainders remain under review; LP-0015 resolves plain function return.

## Typed scalar first-match binding

[LP-0013 r1](proposals/LP-0013-scalar-recovery-selection.md) selects err: Error to expose the first matching Error occurrence in occurrence order, consume every matching Error, and discard the other matched payloads. Other categories remain untouched. ...errs: Error consumes the same matches and exposes all of them as [Error]. Both bodies run once, and no match skips the clause. Typed scalar filters for ErrA/Panic/Failure follow the same rule; exact tuple group receivers retain their tuple binding. LP-0017 now defines .err first-occurrence/all-occurrence views; untyped broad recovery binding remains open. See [current scalar recovery](expression-recovery.md#typed-scalar-receivers-selected).

## Direct-union direction and scalar receiver history

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

## Historical alternative: public channel wrappers

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

Do not infer origin from capitalization, message contents, or a successful type test. Candidate B solves this with an explicit tag. Candidate A needs retained context metadata when origin matters, for example to resume the same panic rather than explicitly return a mapped .err. Metadata spelling and overlapping-payload typing remain open. LP-0010 now specifies that ! forwards stored occurrences with their retained origins; LP-0014 now selects directed scalar/group raise and explicit block targets; unmatched-remainder/provenance transport remains draft LP-0011. This review does not forbid overlapping error types or silently select a panic-rethrow operation.

## Selected typed receiver filtering

The user selects a typed filter that reuses binding/type-pattern syntax:

```text
/* A target can return ReadError and can raise BoundPanic. */
text := read_text(path) else(p: BoundPanic) {
    recover_bound_panic(p)
}!
```

This handles only the matching `BoundPanic`. For this uncaptured target, the suffix ! explicitly forwards a remaining returned ReadError while live unmatched panics propagate implicitly. LP-0010 additionally forwards stored panics when the target is an explicitly captured outcome. Any panic category that does not match `BoundPanic` continues outward implicitly. If the target has no returned `Result` error, this filter needs no `!` for panic propagation.

The type-only spellings distinguish matching from binding:

```text
target else (: BoundPanic) { recover_without_binding() }
target else (: Panic) { recover_any_panic() }
```

`: BoundPanic` matches that panic category without binding a name. `: Panic` matches the broad panic family and does not match returned errors. A bare identifier, including `BoundPanic`, instead binds every supported failure; capitalization and type-name lookup do not turn it into a filter. An analogous filter can handle one returned-error type:

```text
text := read_text(path) else(e: BoundError) {
    recover_bound_error(e)
}!
```

This handles `BoundError`; other returned errors remain subject to explicit handling or `!` propagation. An untyped handler matches all failure types supported by its target:

```text
target else { recover_without_binding() }
target else (_) { outputLine(_) ; recover() }
target else (failure) { outputLine(failure); recover() }
```

Receiverless `else` binds no failure. `_` is an ordinary readable binding, not a special nonbinding wildcard; it matches every supported failure and can be used or left unused without a warning. An untyped name also matches all and binds the broad failure value. If both channels are possible, its static receiver type and channel-origin representation remain open.

This is refutable receiver matching, not a converting annotation or an irrefutable parameter declaration. The filter handles only matching pending occurrences. Single, aggregated, and empty remainders follow [the munching model](expression-recovery.md#pending-occurrences-and-munching-selected); no pending occurrence means no failure match, and a nonmatch neither runs the body nor consumes anything. When typed filters chain on one target, they consume matching members in declaration order, and each later filter sees the remaining members. A live uncaptured panic propagates implicitly after the chain; a stored captured panic remains in its residual outcome until handled or explicitly forwarded. Unmatched returned errors do not: they must remain represented as a `Result`, be handled by another defined form, or be propagated explicitly. The bound aggregate's public type/operations and duplicate-member consumption rules remain open. See [member-wise handling](expression-recovery.md#match-all-failures-or-filter-by-type).

Each later filter wraps the preceding recovery expression, including its handler body. A matching failure raised by an earlier handler can be caught by that later recovery; the earlier handler does not catch its own failure. See the [sequential recovery example](expression-recovery.md#match-all-failures-or-filter-by-type) for the distinction between nested active recovery and separate eager assignments.

The filter does not distinguish a returned payload from a panic solely because their payload types overlap. Preserve channel origin in the eventual carrier/context where required; see the following section.

## Runtime and representation boundaries

A visible union or wrapper describes values and authority to inspect them. It does not select stack versus heap transport, a common object superclass, mandatory allocation, exception tables, or a per-operation Result return ABI. Those remain part of fault transport and the future generic/ownership design.

A public receiver contract must remain stable across inlining and separate compilation. Inferring that one current implementation happens never to panic must not silently remove a public Panic alternative from a combined handler contract. A precise operation-specific fault carrier is possible only under an explicit narrower contract.

## Reference comparisons

- Zig catch captures a value from an error union. This supports a direct typed returned-error receiver, without answering a combined panic-channel type. Source: [Zig 0.15.1 catch](https://ziglang.org/documentation/0.15.1/#catch).
- Rust catch_unwind returns a panic outcome whose error payload is boxed Any + Send. This is a separate carrier from an application's returned Result error. LiteScript's requested structured typed categories need their own design. Sources: [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html) and [panic Result alias](https://doc.rust-lang.org/std/thread/type.Result.html).
- Kotlin catches typed exceptions through its Throwable hierarchy and supports multiple typed handlers. That demonstrates selective capture; it does not require LiteScript to introduce exception inheritance or adopt Kotlin's unchecked model for returned Result errors. Source: [Kotlin exception handling](https://kotlinlang.org/docs/exceptions.html).

## Decisions remaining

- Flat E | Panic categories and Failure selection are now chosen in LP-0009; LP-0013 now selects typed scalar first-match/discard; LP-0017 now selects .err scalar/collector inspection; untyped broad recovery binding still needs its contract.
- The typed Panic carrier/category model and any failure-origin metadata API.
- The exact type relationships and coverage diagnostics for selected typed receiver patterns.
- Operation fault attribution, complete block/chain attachment, transfer mechanism, cleanup-failure aggregate matching/access, and any explicit resume operation; cleanup-failure precedence is selected, and language-managed propagation already runs applicable exited-scope `finally` blocks before an outer matching handler.

Related: [shared expression recovery](expression-recovery.md), [boundary comparison](recovery-boundaries.md), [typed panics](typed-panics.md), [Result errors](result-and-errors.md), [receiver clauses](receiver-clauses.md), and [union matching](union-patterns.md).


## Early-return follow-up

[LP-0015 r1](proposals/LP-0015-early-return-recovery-paths.md) resolves ordinary function return from a partial captured-outcome handler. A matching branch can return its written success value and abandon that unfinished recovery; other captured categories are not automatically forwarded or a reason for an extra handling rejection on this pattern. No recovery result is initialized on that path, so only continuing paths determine its residual type. Handler-local tagged return retains its separate continuation/remainder behavior. Other failure-directed/tagged exits and aggregate inspection remain open; cleanup and new failures retain their rules.
