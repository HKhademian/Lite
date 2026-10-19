# Shared expression recovery with else

Status: **user-selected surface direction, 2026-10-19; scope and implementation contracts pending**. Ordinary indexed reads/writes and pops should remain direct, with implicit faults on invalid use. An attached else can recover from a typed panic as well as a returned Result error. No additional pop_front_or function is required merely to expose the recoverable form.

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

The [receiver-type review](recovery-receiver-types.md) compares a direct E | Panic receiver with a tagged Failure<E> wrapper, and proposes optional typed receiver filtering. These remain proposals; a combined handler cannot be assumed to receive only E.

For returned-error handling alone, the receiver retains the operation's declared E. A known intrinsic fault can have a precise fault category. If arbitrary called code can panic without public panic-effect declarations, a general boundary needs a defined typed panic carrier or another explicit typing mechanism; it cannot claim to know a finite precise union merely by looking at T ! E.

When one boundary handles both channels, preserve their origin if payload types overlap. A discriminated returned-error versus panic representation is one candidate; flattening both into an untagged payload union loses that distinction. Carrier variants, receiver-pattern syntax, payload ownership, category extensibility, and representation remain proposals. Receiverless else avoids binding a payload but does not settle the missing type contract.

Handling a panic does not require listing it in every function's Result error declaration. Explicitly converting it into return .err(mapped_error) does require that returned error to fit the enclosing function's declared contract. No implicit catch-and-convert or broadening of E is introduced.

## State, cleanup, and runtime

An invalid index or empty pop must be detected before that operation performs invalid access or changes the collection. Recovery does not roll back earlier successful mutations or argument effects. General cross-call recovery must define cleanup, partially constructed values, mutable access after failure, and the policy for a second fault during cleanup.

This is expression-scoped exception handling for panics, even though its source syntax reuses else. Its implementation might use exception-style unwinding or explicit compiler/runtime fault transport; that mechanism and its ABI must be designed. A local intrinsic handler can often compile to a check and branch. That does not establish the costs of arbitrary cross-call capture or prove C-level performance. No mechanism, cost-free unwinding, or absence of runtime support is claimed.

The capture promise concerns language-defined faults with valid transfer/cleanup behavior. Arbitrary foreign crashes, process termination, or corrupted machine state are not automatically made safely recoverable by attaching else.

## Grammar still to specify

- Which exact expression an attached else protects, including argument evaluation and postfix chains.
- Distinguishing recovery else from a conditional branch or loop completion clause without whitespace-dependent parsing.
- Handler precedence and grouping under the selected block-item continuation rule.
- Indexed assignment recovery: assignment is an item, not a general value expression. In values[index] = replacement else { ... }, attachment to the write versus its RHS cannot be guessed. No production for that spelling is selected here.
- The typed receiver contract when both returned errors and panics can reach one boundary.
- Any first-class capture-as-Result operation without a fallback; a second helper family is not required by the examples above.

Related: [Result and errors](result-and-errors.md), [panics](panics.md), [typed panics](typed-panics.md), [fault-policy history](checked-fault-policy.md), [sequence end operations](sequence-end-operations.md), and [evaluation order](evaluation-order.md).
