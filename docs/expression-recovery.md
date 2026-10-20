# Shared expression recovery with else

Status: **target-level `else` recovery and typed filtering selected, 2026-10-20; evaluation boundary, mixed receiver type, and implementation contracts pending**. A recovery target can be an operation or a block expression. Ordinary indexed reads/writes and pops remain direct, with typed faults on invalid use. An attached else can recover from a typed panic as well as a returned Result error. No additional pop_front_or function is required merely to expose the recoverable form.

## Direct use and local recovery

```text
value := values[index];
values[index] = replacement;
first := pop_front(mut values);
last := pop_back(mut values);
```

Successful reads and removals produce T; an indexed replacement produces Unit. Invalid positional access or empty removal follows the typed fault path. This selects the sequence-operation direction, not every arithmetic or allocation failure policy.

```text
first := pop_front(mut values) else {
    fallback_value()
}

value := values[index] else(fault) {
    report(fault);
    fallback_value()
}
```

With else attached, the requested operation can recover locally rather than leave the fault unhandled. The handler receiver remains optional. This is a language recovery construct: an ordinary library function receiving an already evaluated value cannot retroactively catch a fault that occurred while producing its argument.

The same source form already handles returned errors:

```text
user := load_user(id) else(error) {
    report(error);
    guest_user()
}
```

Ordinary fallible calls still return Result values unless explicitly inspected, recovered, or propagated. Using shared recovery syntax does not make every call implicitly unwrap, or turn every panic into a returned .err. Postfix ! remains Result extraction and declared-error propagation; it does not capture panics.

The user selected typed panics, not returned `Result` errors, for basic arithmetic faults and requires individual-operation recovery. The existing target-level `else` applies to operation targets; typed filters let the handler recover only a matching panic. The exact arithmetic fault type and the evaluation boundary around operands/calls remain open. See [arithmetic fault boundaries](arithmetic-faults.md).

## Match all failures or filter by type

An operation or block target can use receiverless or untyped `else` to match every failure supported by that recovery target:

```text
target else { recover_any_failure() }
target else (_) { report(_); fallback() }
target else (failure) { report(failure); fallback() }
```

Omitting the receiver catches without binding. An untyped name matches all supported failures and binds a broad failure value. `_` also matches all and is an ordinary readable binding, so it can be used in the handler or left unused without a warning; it is not a special nonbinding wildcard. When both returned errors and panics can reach the target, the exact static type and origin representation of that broad value remain open.

A typed pattern filters the failures by type:

```text
target else (p: BoundPanic) { recover_bound_panic(p) }
target else (BoundPanic) { recover_without_binding() }
target else (Panic) { recover_any_panic() }
```

The first two forms match only `BoundPanic`; the binding form exposes the narrowed value, while the type-only form does not bind it. `Panic` is the broad panic type and matches panic categories, not returned `Result` errors. A specific returned-error type can be handled with the same typed-filter rule.

If a typed filter does not match, its body does not run. An unmatched panic follows the default implicit propagation rule. An unmatched returned error remains subject to explicit handling: keep it as a `Result` when the target is used as outcome data, handle it with another defined form, or propagate it with postfix `!`. For example:

```text
target else (p: BoundPanic) { recover_bound_panic(p) }!
```

Here `!` explicitly propagates any remaining returned `Result` error; it does not catch or propagate panics. A nonmatching panic still propagates implicitly. This filtered form must not silently discard either channel.

## Shared syntax, distinct failure channels

A declared T ! E returns success or an E error. A language panic transfers control through the separate fault path. Whether a fault trigger is written explicitly is not what determines its channel: an explicit panic is still a panic, and a compiler-forwarded .err is still a returned error.

Else can offer one recovery surface for both without merging their contracts. On a normal non-Result value it supplies that value. On a Result success it extracts one successful payload, following the existing recovery rule. On a handled failure it runs the fallback. Success T and normally completing fallback D produce T | D; a nonlocal exit contributes no local fallback value.

A stored Result remains ordinary data until this recovery operation is explicitly requested. A handler does not search inside records, nested Result payloads, or intermediate calls for unhandled .err values. Returned errors inside a callee must still be handled or explicitly forwarded by that callee. Normal return, tagged return, break, and continue are control-flow exits, not failures for else to intercept.

## Argument Result handling is independent of panic scope

The user explicitly requires each Result-producing argument to be handled or extracted before it is used as an ordinary parameter value. If exp1 returns A ! E1 and op expects A, op(exp1()) else { fallback_result() } is rejected. The outer handler does not implicitly extract the argument, observe its .err as a panic, or supply an A fallback for it.

Use exp1() else { fallback_arg() } locally, or exp1()! for explicit outward Result propagation. The latter returns from the enclosing function on .err; the outer else does not catch that return. Passing an intact Result remains valid when the parameter deliberately accepts Result data. See [argument recovery examples](recovery-boundaries.md#result-arguments-require-their-own-handling).

The user prefers the local-fallback form for the indexed multiply example too. That preference and mandatory Result handling do not select the scope of implicit panic capture; these are separate rules.

## Implicit panic propagation

The user explicitly confirms that an unhandled panic propagates outward automatically. It requires neither a postfix ! nor a T ! E declaration at each call. A matching active recovery boundary can intercept it; otherwise the unhandled-fault policy applies. This specifies control flow, not the transfer ABI or a promise that all faults leave recoverable state.

Returned Result errors remain explicit: producing .err does not itself cause an implicit nonlocal transfer. Shared else syntax must not erase this distinction.

## Boundary question still pending

Two materially different meanings remain under review:

- Whole-evaluation boundary: catch supported typed panics raised while evaluating the selected expression, including executed arguments and called functions. The syntactic expression determines the boundary; its precise precedence/grouping rules must be specified. Cross-call behavior must remain the same before and after inlining.
- Operation-specific checked behavior: capture only faults specified by the selected operation, potentially lowered directly to a checked implementation. Arbitrary panics in arguments or callees are not automatically included. Custom providers need explicit contracts; method spelling alone cannot create capture support.

The first is the recommended interpretation for general panic recovery because its evaluation boundary is stable and understandable. It requires a real cross-call fault-transfer mechanism. The second is a narrower checked-operation facility and must not be advertised as general panic catch. The user requests investigation of the two forms rather than selecting a scope. The [outcome comparison](recovery-boundaries.md) traces whole-call and argument-level fallbacks; neither scope is adopted by this document.

The handler itself is outside its own recovery boundary. Its failure must go to an enclosing applicable boundary or remain unhandled; do not retry the failing operation or recursively re-enter the same fallback. Evaluate executed operands once in the selected left-to-right order.

## Typed handler inputs

Typed receiver filtering is selected: a filter handles only its matching type. The [receiver-type review](recovery-receiver-types.md) still compares a direct `E | Panic` receiver with a tagged `Failure<E>` wrapper for untyped handlers. A combined handler cannot be assumed to receive only E.

For returned-error handling alone, the receiver retains the operation's declared E. A known intrinsic fault can have a precise fault category. If arbitrary called code can panic without public panic-effect declarations, a general boundary needs a defined typed panic carrier or another explicit typing mechanism; it cannot claim to know a finite precise union merely by looking at T ! E.

When one boundary handles both channels, preserve their origin if payload types overlap. A discriminated returned-error versus panic representation is one candidate; flattening both into an untagged payload union loses that distinction. Carrier variants, receiver-pattern syntax, payload ownership, category extensibility, and representation remain proposals. Receiverless else avoids binding a payload but does not settle the missing type contract.

Handling a panic does not require listing it in every function's Result error declaration. Explicitly converting it into return .err(mapped_error) does require that returned error to fit the enclosing function's declared contract. No implicit catch-and-convert or broadening of E is introduced.

## State, cleanup, and runtime

An invalid index or empty pop must be detected before that operation performs invalid access or changes the collection. Recovery does not roll back earlier successful mutations or argument effects. General cross-call recovery must define cleanup, partially constructed values, and mutable access after failure. Cleanup-failure precedence is selected, while aggregate representation and typed-handler inspection remain open.

This is expression-scoped exception handling for panics, even though its source syntax reuses else. Its implementation might use exception-style unwinding or explicit compiler/runtime fault transport; that mechanism and its ABI must be designed. A local intrinsic handler can often compile to a check and branch. That does not establish the costs of arbitrary cross-call capture or prove C-level performance. No mechanism, cost-free unwinding, or absence of runtime support is claimed.

The capture promise concerns language-defined faults with valid transfer/cleanup behavior. Arbitrary foreign crashes, process termination, or corrupted machine state are not automatically made safely recoverable by attaching else.

## Body-local construct ownership

The user retires the proposed external if/loop/match recovery tails. These constructs own recovery inside their bodies, analogously to fn. Operation() else { ... } remains valid inside those bodies. Body-wide special sections, including delimiter and scope design, are explicitly deferred for the joint cleanup/resource review; see [body-owned recovery](body-recovery.md). The earlier grouped construct workarounds are not current recommendations. Construct-level `then`-before-`finally` order is selected separately; body-wide cleanup placement, ! propagation targets, and returned-Result handling are not implicitly changed.

## Grammar still to specify

- Which exact expression an attached else protects, including argument evaluation and postfix chains.
- Distinguishing recovery else from a conditional branch or loop completion clause without whitespace-dependent parsing.
- Handler precedence and grouping under the selected block-item continuation rule.
- Indexed assignment recovery: assignment is an item, not a general value expression. In values[index] = replacement else { ... }, attachment to the write versus its RHS cannot be guessed. No production for that spelling is selected here.
- The broad receiver contract and origin information when returned errors and panics can reach one untyped handler.
- Whether multiple typed filters can chain on one target, plus coverage and ordering rules.
- Any first-class capture-as-Result operation without a fallback; a second helper family is not required by the examples above.

Related: [Result and errors](result-and-errors.md), [panics](panics.md), [typed panics](typed-panics.md), [fault-policy history](checked-fault-policy.md), [sequence end operations](sequence-end-operations.md), and [evaluation order](evaluation-order.md).
