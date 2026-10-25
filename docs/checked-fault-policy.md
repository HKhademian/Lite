# Bounds, arithmetic, and checked fault policy

Status: **policy history with selected sequence and arithmetic directions, 2026-10-20**. Ordinary sequence access/removal uses typed faults with attached local recovery. Basic arithmetic faults use typed panics, not returned `Result` errors; target-level `else` filters support local recovery of matching types. The [shared recovery document](expression-recovery.md) records the recovery surface. Alternatives below preserve the earlier review rather than competing current meanings.

## Keep two design questions separate

Which collection supports an operation is a static contract question. What happens when a supported operation receives an invalid index is a failure-policy question. Making indexing more convenient does not require bundling traversal, indexing, size, and contiguity in every parameter type.

Only declared recoverable errors escape through T ! E, T!, and the proposed throw shorthand. The separate panic/fault channel is selected for basic arithmetic faults. The earlier alternatives below are retained to show the tradeoffs, not as current arithmetic choices.

## Alternative A: recoverable outcomes by default

```text
value := users[index] else { fallback_user() }
value := users[index]!;
```

Here ordinary checked indexing produces User ! BoundsError. Handling, propagation, or retaining the Result is explicit. This follows the existing [checked-indexing proposal](checked-collection-operations.md).

The model is uniform and works well when a bad index is an expected input condition. It also adds source-level handling wherever the operation's error cannot be discharged under a language-defined proof rule. Applying the same default to all checked arithmetic creates a larger annotation/propagation burden. Compiler optimization can remove checks but does not independently erase source-level Result contracts or declared errors.

An error result does not inherently allocate memory or imply a large runtime. Successful access can still need the same bounds comparison under either policy; return representation and propagation are separate costs. Do not claim one default is faster without comparing equivalent checks and compiled code.

## Alternative B: asserting operations plus checked operations

Ordinary indexing would mean that the programmer requires this position to be valid:

```text
value := users[index]; /* proposed alternative: value or bounds fault */
```

Under a corresponding arithmetic policy, ordinary bounded arithmetic would require a representable result. Detect violations before invalid memory access or invalid value use, and report a safe fault with useful source information. This review does not adopt unchecked memory access, undefined behavior, wrapping arithmetic, or build-mode-dependent removal of safety guarantees.

An explicitly checked operation instead returns a typed outcome for expected recovery. A short checked context is one possible surface; the following spelling is deliberately unselected:

```text
outcome := checked {
    users[index]
}

value := outcome else {
    fallback_user()
}
```

An earlier extension of this candidate applied the checked boundary to `a + b`, branching to a returned failure result. That arithmetic proposal is superseded: basic arithmetic faults use typed panics, not returned `Result` errors. Local arithmetic-panic recovery is still required, but no spelling or conversion into a Result is selected.

Such a boundary must be a defined language form: an ordinary function receiving users[index] as an argument would evaluate that argument before entering the callee. Its supported checks, typed error payloads, evaluation order, result construction, cleanup, and exact scope need specification.

It must not automatically capture arbitrary panics inside called functions. Calls with declared Result errors retain their explicit handling rules. A limited lexical checked transformation can be defined before optimization so inlining does not change which failures it captures. Transforming failure behavior across calls would require additional explicit effect/implementation contracts; it is not supplied by this sketch.

Custom index providers also need a coherent contract, potentially a checked primitive and an asserting adapter. Do not silently unwrap every Result-returning function as an assertion or let operator mode guess at a provider's undeclared effects.

## Ordinary algorithm code must remain direct

The user objects to expecting beginners to write values[i]! > values[j]! and separately handle each indexed assignment while implementing a sort. That source burden is a reason to favor the asserting default for ordinary positional access, rather than regard per-access Result syntax as the beginner baseline.

Under alternative B and the candidate complete indexed-sequence shorthand:

```text
swap_if_out_of_order := fn(values: mut [Int], i: Int, j: Int) {
    if values[i] > values[j] {
        temporary := values[i];
        values[i] = values[j];
        values[j] = temporary;
    }
}
```

This is a sorting step, not a complete sorting algorithm. Reads and writes use ordinary syntax without a Result marker on every access. Its public input visibly requests writable indexed-sequence access; the final conditional's normally completing assignment produces Unit, and a no-match path performs no write while the statement still produces Unit. The [Int] indexed-sequence direction is now accepted, and mut [Int] needs an actual writable indexed refinement supplied by the provider, not a fabricated setter. It does not require growth, contiguous storage, or one concrete List type.

Invalid i or j triggers the proposed safe bounds fault before invalid memory use. This is not a recoverable failure returned from this routine, so an ordinary successful Unit result needs no error annotation. A nonfallible result contract promises no escaping recoverable Result error; it is not a universal guarantee that the routine cannot fault. Language-managed typed panics unwind exited scopes and run applicable finally blocks before outer matching handlers; exact capture boundaries, hard aborts, and cleanup-failure aggregation/inspection remain open. Cleanup-failure precedence is selected in [finally](finally.md#pending-outcomes).

Algorithm invariants and range-based traversal can make indexes valid; a compiler can eliminate checks when proved safe. The source does not gain or lose ! markers depending on optimization success. Expected invalid positions, such as user-supplied requests that a program intends to recover from, should use the separately explicit checked operation. The later shared-recovery direction chooses attached else for local recovery, while its scope and transfer mechanism remain open. Result ! is unchanged.

## Consistency with removal

The user points out that default Option-returning pop would require unpacking unlike the proposed direct indexed reads/writes. The revised [end-operation review](sequence-end-operations.md) recommends aligning ordinary pop with whichever ordinary index policy is selected: direct T or Unit with a safe fault under alternative B, or typed Result under alternative A. Empty removal and invalid position can have distinct typed failures while following the same handling mode.

The later user request accepts the direct sequence-operation direction and selects attached else recovery for typed faults. A separate capture-as-Result form and optional lookup/removal API remain open. The requested syntax does not by itself settle whether arbitrary argument/callee panics are included. Empty removal must not change the sequence, without implying rollback of earlier effects.

## Interaction with the existing short forms

If ordinary users[index] produces a plain User under alternative B, users[index]! cannot retain its earlier meaning without a distinct explicitly selected capture rule. Postfix ! is already Result extraction/propagation; it is not a general panic-capture operator.

The later request selects users[index] else { fallback } as a language recovery form even when ordinary indexing produces a plain User. This revises the earlier syntax-open review. It is not ordinary inspection of User data: the compiler establishes a recovery boundary during evaluation. Whether that boundary is operation-specific or includes argument/callee panics remains pending. See [shared expression recovery](expression-recovery.md).

The current recoverable-failure throw proposal remains shorthand for return .err(error). It does not trigger or capture a panic. A checked outcome propagated with ! still requires its enclosing function's declared error contract.

## General panic capture is a larger commitment

Catching a panic through arbitrary calls needs an implementation transfer mechanism and an invariant policy. The selected language behavior unwinds entered scopes and runs applicable finally blocks before an outer matching handler. Implementations could use return-like faults, native stack unwinding, or generated effect propagation; each has real consequences. Recovery does not roll back mutations already performed.

Rust separates direct indexing's possible panic from get returning Option. Its catch_unwind documentation discourages general try/catch use and states that aborting panics cannot be caught by that mechanism. Sources: [Rust Index](https://doc.rust-lang.org/std/ops/trait.Index.html), [slice get](https://doc.rust-lang.org/std/primitive.slice.html#method.get), and [catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html).

Zig 0.15.1 demonstrates bounds safety failures separately from typed error unions; its build-mode safety behavior is not adopted here. Source: [Zig bounds failures](https://ziglang.org/documentation/0.15.1/#Index-out-of-Bounds).

These comparisons show separate asserting and checked operations as a viable design pattern. They do not establish that arbitrary faults are always catchable or inexpensive. LiteScript should define local typed capture and broad panic observation as separate features.

## Historical recommendation

The earlier recommendation was to evaluate ordinary safety-checked assertions for bounds and arithmetic, together with an explicit concise typed checked form for recoverable use. The user has since selected the typed panic channel for basic arithmetic and target-level typed `else` filters for local recovery. Keep genuinely recoverable API failures declared and explicit. Preserve a single safe semantic policy across normal build modes and discharge checks when proved unnecessary.

Alternative A remains a coherent historical comparison but is superseded for basic arithmetic faults. Do not adopt both meanings for an undecorated operation or promise a universally capturable panic as a shortcut. The sequence decision selects direct access/removal plus attached else; arithmetic uses typed panics and target-level typed filters. Confirm the remaining evaluation scope before migrating unrelated examples.

Related: [panics](panics.md), [Result](result-and-errors.md), [operation contracts](collection-operation-contracts.md), [division](division.md), and [signature ergonomics](collection-signature-ergonomics.md).
