# Whole-call and argument-level recovery

Status: **operation-specific and explicit whole-block recovery selected 2026-10-26**. Panics propagate implicitly without ! or a Result declaration, and language-managed propagation unwinds exited scopes through applicable `finally` blocks before an outer matching handler. The current operation boundary is [selected in LP-0001 r1](proposals/LP-0001-operation-specific-panic-recovery.md): argument panics bypass the outer operation handler. Whole-evaluation recovery requires the explicit block selected in [LP-0002 r1](proposals/LP-0002-explicit-block-panic-recovery.md); the earlier unbraced broad-call alternative is retained as history. The user explicitly requires Result-producing arguments to have their own handling/extraction before being passed as ordinary values, and prefers the nested local-fallback example.

Supporting analysis: current recovery rules are owned by [expression recovery](expression-recovery.md), [result and errors](result-and-errors.md), and [checked fault policy](checked-fault-policy.md). If this supporting analysis conflicts with those pages, they win.

## Selected operation-specific outcomes

For `multiply(values[0], values[1]) else { 0 }`, a missing position panics during argument evaluation and bypasses the multiply handler. With an empty sequence, the first access fails; the second access, multiply, and outer fallback never run. With only [5], the second access fails after the first succeeds; multiply and its fallback still never run. With [5, 7], ordinary successful multiplication produces 35. Only faults defined by multiply's operation contract are eligible for its attached handler.

With the local argument fallbacks shown below, empty values instead supplies 2 and 3 and produces 6; [5] produces 15. These are distinct outcomes, preserving the user's local-fallback preference. A typed outer filter does not change argument coverage. Operation fault attribution, complete attachment, and recovery-chain integration remain open; see [the normative boundary](expression-recovery.md#operation-specific-panic-boundary-selected).

## Selected explicit block outcomes

```text
answer := { multiply(values[0], values[1]) } else { 0 }
```

The block boundary is active before its first item. With empty values or [5], a missing position panics and the block handler produces 0 without invoking multiply. With [5, 7], ordinary successful multiplication produces 35. A supported panic in multiply or synchronous code it calls can also reach this boundary. Earlier effects remain and applicable inner cleanup runs before recovery; the interrupted call is not resumed.

An inner operation handler does not hide excluded argument panics from an explicit outer block:

```text
answer := {
    multiply(values[0], values[1]) else { 1 }
} else { 0 }
```

An empty sequence produces 0 through the block handler. An eligible multiply fault handled by the inner clause produces 1. Normal successful multiplication supplies its result. Exact fault categories and operation attribution remain open. See [the normative block boundary](expression-recovery.md#explicit-whole-block-panic-boundary-selected).

## Result arguments require their own handling

This rule comes before the panic-scope comparison. Suppose exp1 returns A ! E1, exp2 returns B ! E2, and op expects ordinary A and B arguments. The following does not type-check:

```text
/* Rejected: an outer handler cannot supply plain A/B arguments. */
result := op(exp1(), exp2()) else {
    fallback_result()
}
```

Each Result argument needs its own explicit inspection/recovery or postfix ! extraction before the invocation. A fallback around the outer call cannot satisfy that requirement, even if it can catch panics raised during argument evaluation.

The preferred explicit local-recovery form is:

```text
result := op(
    exp1() else { fallback_arg1() },
    exp2() else { fallback_arg2() },
) else {
    fallback_result()
}
```

Each inner else handles that argument's Result and supplies a value acceptable to the corresponding parameter. If op itself returns R ! Eop, its outer else handles Eop and supplies the overall fallback. The outer handler does not also receive E1 or E2 merely because those outcomes were produced somewhere inside the call expression.

An explicit propagation alternative is:

```text
result := op(exp1()!, exp2()!) else {
    fallback_result()
}
```

On an argument's .err, its ! exits the nearest enclosing function/closure under that function's declared compatible error contract. It does not hand the returned error to the outer call's else. Normal return is not a panic. A function intentionally accepting Result data can instead receive an intact Result argument; the extraction requirement applies when the parameter needs its plain payload.

## Historical unbraced whole-call comparison



Assume exp1 produces an A, exp2 produces a B, and op accepts those values and produces an R. Both argument results are plain values in this comparison. They do not return Result. This explicit assumption is essential: the first form below is rejected for unhandled Result arguments when op needs their plain payloads.

### One outer fallback

```text
result := op(exp1(), exp2()) else {
    fallback_result()
}
```

Under the unselected whole-evaluation interpretation for this unbraced call:

1. Establish the outer recovery boundary before evaluating the call expression, including the callee/receiver expression and its executed arguments.
2. Evaluate exp1, then exp2, following the selected left-to-right evaluation order.
3. Invoke op only after both arguments have completed successfully.
4. A supported typed panic in an argument or anywhere in the invoked call chain leaves the failing computation and selects the applicable outer handler.
5. The handler supplies a replacement result for the entire call. It does not supply a missing argument or resume op.

If exp1 panics, exp2 and op never run. If exp2 panics, exp1 has already run but op never runs. If op panics, both arguments have already run. In all three cases the fallback replaces the overall result. Earlier effects are not rolled back.

### Preferred local argument fallbacks plus an outer fallback

```text
result := op(
    exp1() else { fallback_arg1() },
    exp2() else { fallback_arg2() },
) else {
    fallback_result()
}
```

In this historical broad-call interpretation, the outer evaluation contains both inner recovery expressions. The nearest applicable active handler gets the panic first:

- If exp1 panics, its local fallback supplies argument one. When that fallback completes normally, evaluate exp2 next.
- If exp2 panics, its local fallback supplies argument two. When that fallback completes normally, invoke op with the computed/replacement arguments.
- If op panics, the outer fallback supplies the whole call's result.
- If fallback_arg1 or fallback_arg2 itself panics, its own handler does not catch that new panic. The outer handler can catch it because the local fallback is still being evaluated inside the outer expression.
- If fallback_result panics, it propagates farther outward; it does not re-enter itself.

A handler that explicitly returns, breaks, or performs another nonlocal exit does not provide a replacement value and resume the call. Those control-flow exits are not panic events for outer else to intercept. No failing expression is retried automatically.

## Concrete positional-access example

Assume multiply accepts two Int values and succeeds for the small values illustrated. This example does not classify all arithmetic faults.

The user prefers explicit recovery at each argument:

```text
/* Missing positions: substitute arguments, then calculate. */
answer := multiply(
    values[0] else { 2 },
    values[1] else { 3 },
) else { 0 }
```

With an empty values sequence, local recovery supplies 2 and 3 and multiply produces 6. With values containing only 5, it produces 15. With [5, 7], it produces 35. The outer fallback remains available for faults defined by multiply's operation contract; arbitrary callee panics are not automatically included.

For comparison, the earlier broader-boundary candidate was:

```text
/* Panic-scope alternative: positional reads return plain Int values. */
answer := multiply(values[0], values[1]) else { 0 }
```

Under whole-evaluation panic capture, this yields 0 without calling multiply if either position is missing. It does not establish the legality of analogous calls with unhandled Result arguments. The user's later 2026-10-26 choice rejects this whole-evaluation behavior for an operation target.

Thus local recovery and whole-call recovery are useful simultaneously. Supporting the broader outer boundary does not make argument-level handlers redundant: their fallback values serve different positions in the computation.

## Selected operation-specific capture

Under the selected operation-specific boundary, the outer else does not cover arbitrary panics while computing arguments. In the first form, an exp1 or exp2 panic skips the visible outer fallback and propagates to some enclosing eligible handler or the unhandled-fault policy. In the second form, each local handler could still recover its argument's specified operation fault, permitting op to run.

A call's operation-specific faults would need a compiler/provider contract. They cannot be defined by inspecting which machine instruction happened to fail, or by whether a helper was inlined. This alternative can support a checked intrinsic such as positional access, but is harder to explain as general panic recovery for an ordinary library call.

The earlier recommendation favored whole-evaluation capture. The user instead selected operation-specific recovery for a bare operation and an explicit block for broad recovery on 2026-10-26. Keep the historical unbraced comparison above to explain the tradeoff. Operation attribution and explicit block coverage must remain stable across helpers and inlining.

## Result errors do not propagate like panics

An unhandled panic leaves the computation automatically. A returned .err is ordinary Result data until explicitly inspected, recovered, or forwarded. The outer call's else handles its subject's Result outcome; it does not recursively extract Result arguments or discarded outcomes in called functions.

If exp1 returns A ! E but op expects A, the first form is a type error unless argument success extraction is explicit. The inner exp1() else { fallback_arg1() } in the second form can perform that extraction and supply a replacement A on .err. If op intentionally accepts a Result argument, passing that value is legal and the outer handler does not inspect the argument's tag.

Using exp1()! instead follows the existing rule: a returned error exits the nearest enclosing function/closure with its declared Result error. An outer else is not a handler for that return exit. Panics occurring during exp1 evaluation still follow their separately selected recovery boundary.

## Types and state

A local fallback must produce a value that fits the corresponding op parameter. If its normal result differs, the argument type becomes A | FallbackA; the call must accept that union or the program must narrow it first. The outer result similarly becomes R | FallbackR. Identical alternatives collapse. An expected type does not erase incompatible alternatives.

Evaluate each executed operation once. After a panic, skip the unfinished remainder of its protected expression. Prior side effects remain. The language still needs cleanup, partially constructed value, and mutable-state validity rules for cross-call recovery; fallback syntax alone does not establish safe resumption of arbitrary corrupted state.

## Implementation consequences and references

The selected explicit block boundary needs a consistent active-handler/cleanup model across ordinary calls, callbacks executed within the expression, and compiler inlining. Work scheduled to execute later is outside the expression's active evaluation; asynchronous propagation requires its own future design.

A local intrinsic can lower directly to a bounds check and branch. General cross-call panic recovery additionally needs fault transport and cleanup. LLVM documents table-based exception handling for keeping speculative handler code out of the normal instruction path; that still involves metadata and an unwind mechanism. It is an implementation option, not a LiteScript performance guarantee. Source: [LLVM exception handling](https://llvm.org/docs/ExceptionHandling.html).

Kotlin's try expression evaluates its body and selects a matching catch when evaluation throws; the selected body/catch supplies the expression value. This is a useful scope/value analogy. LiteScript retains its separate Result semantics rather than importing Kotlin's exception channel for returned errors. Source: [Kotlin try expressions](https://kotlinlang.org/spec/expressions.html#try-expressions).

Rust catch_unwind establishes capture around an executed closure and returns the closure result or an unwinding-panic payload; aborting panics are outside that mechanism, and unwind safety matters. This demonstrates why a catch boundary needs a defined transfer/safety policy beyond its syntax. Source: [Rust catch_unwind](https://doc.rust-lang.org/std/panic/fn.catch_unwind.html).

Related: [shared expression recovery](expression-recovery.md), [panics](panics.md), [Result handling](result-and-errors.md), [evaluation order](evaluation-order.md), and [typed faults](typed-panics.md).
