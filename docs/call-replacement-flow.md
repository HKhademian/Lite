# Flow types after caller-location replacement

Status: **basic invalidation after explicit var calls and use of guaranteed normal-return stored types selected 2026-10-24; source notation, verification/inference of guarantees, and the complete alias/effect model remain open**.

## Declared storage and current reads

A local binding keeps its declared accepted replacements even when its current read type is narrower. Granting a call var access lets that call replace the supplied location within its access contract. Invalidate facts that depended on the old value unless preservation or a final stored-type guarantee is justified.

For a location declared String | Int, a call that may leave either member cannot preserve an incoming Int-only read fact merely because the value was Int before the call. After normal return, use the justified remaining possibilities from the call contract. Without a supported stronger fact, the full String | Int declared contract is the conservative read type.

## Selected sequence and callable obligations

The following is the user's selected expected-flow sequence. It uses existing call syntax and the abstract callable obligations listed below; it does not define new signature syntax:

```text
var x: String | Int = ?;

x = 42;
/* x reads as Int. */

replace(var x);
/* x reads as String | Int. */

replaceStr(var x);
/* x reads as String. */

x = 42;
/* x reads as Int. */

replaceStr(var x);
/* x reads as String. */

replaceInt(var x);
/* x reads as Int. */

x = "42";
/* x reads as String. */
```

Assume 42 is Int. The three callables accept the incoming String | Int value and receive compatible caller-location replacement authority. `replace` permits either final member, with no narrower supported guarantee. `replaceStr` guarantees that the location holds String on every normal return; `replaceInt` guarantees Int. These names describe their intended contracts here and do not themselves cause type inference. Their ordinary call results are Unit, independently of the stored values.

Every replacement still has to fit x's declared String | Int storage and its var permission. A final read guarantee changes static knowledge at the continuation, not the declared accepted replacements; Bool remains an invalid replacement. The existing reservation/definite-initialization rules apply to = ?, and direct assignments keep their selected flow behavior.

## Permission is not a final-state guarantee

Var permits replacement; it does not promise that a write occurs. A callable can return without assigning. If the incoming value is Int and the callable is merely allowed to write String, a no-write path can still leave Int. Its permission alone therefore cannot establish String on return.

The stronger obligation concerns the final stored type on every normal-return path, not necessarily an unconditional assignment. A function may preserve an already-String value or replace an Int and still fulfill a String guarantee. A conditional write that can leave an incompatible old value does not fulfill it.

Do not interpret a simple var String parameter as an output-only promise. Its ordinary read contract also requires an incoming String and does not by itself accept the current Int shown above. Accepting String | Int on entry while guaranteeing String on return needs that input/final-state distinction in the callable contract. The exact public spelling, inference, and verification of these guarantees are open; no new out, ensures, or effect syntax is selected.

A caller may use a final stored-type guarantee only when it is supported by the callable contract/proof available at that call. Do not guess from a function name, one observed run, tests that happened to write, or an unstated implementation assumption. Complete body-effect inference and guarantee validation remain future work.

## Return paths, stability, and identity

Establish the final read fact only at a normal-return continuation covered by the guarantee. A failure, panic, or explicit transfer keeps its ordinary behavior and does not establish that normal-return fact on a recovered path. The call may already have changed the location before failing; do not silently restore the incoming value or its old refinement.

A grant designates the supplied location under existing evaluation/lifetime rules. Preserve callee and argument evaluation order, source authority, cleanup obligations, and normal var/mut distinctions. This does not infer new writable aliases, detach a copy instead of updating the caller, or change call result types.

Discard stale value-dependent relationships involving a possibly replaced value; retain only independently valid or supported preserved facts. A new String/Int guarantee remains usable only while that location stays stable. Captured writes, shared state, multiple aliased parameters, callbacks, failure-path guarantees, and complete effect/exclusivity rules remain open. This selection concerns explicit caller-location replacement through var, not arbitrary getters or blanket invalidation after every read-only call.

## Related documents

- [Assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) and [var access](var-access-qualifier.md).
- [Caller mutation grants](caller-mutation-grants.md), [caller-location parameters](slot-parameters.md), and [parameter permissions](parameter-permissions.md).
- [Evaluation order](evaluation-order.md), [mutability](mutability.md), and [types and inference](types-and-inference.md).
