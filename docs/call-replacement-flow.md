# Flow types after caller-location replacement

Status: **read/write entry compatibility and basic read-flow invalidation after explicit var calls selected 2026-10-24; write-only access is future work, not a current mode; complete alias/effect rules remain open**.

## Declared storage and current reads

A local binding keeps its declared accepted replacements even when its current read type is narrower. A var T parameter has both read and write access to T. The callee may read T immediately; it need not assign before reading or returning. Var is not output-only access or a mandatory-write promise.

For the supported simple local cases, check both directions at the call:

- Every currently justified readable alternative fits the parameter's readable type.
- Every replacement permitted by the parameter fits the caller location's declared accepted writes.

The current read type and the declared write contract are separate inputs to this check. A String | Int location currently reading Int can supply var Int, but cannot supply var String. Its storage accepts String writes, yet the callee could immediately read an Int as String. Merely fitting the callee's possible writes is insufficient.

These checks require valid entry refinements and compatible location access throughout the call. They do not select general access variance, shared-alias concurrency, or a complete subtype/ownership model.

## Helper contracts

The imaginary helper signatures describe these single-parameter access contracts; their ordinary call results are Unit:

- replace takes var String | var Int, equivalent within one complete access contract to var (String | Int): it reads String | Int and may write either member.
- replaceStr takes var String: it reads String and may write String.
- replaceInt takes var Int: it reads Int and may write Int.

The first contract is not an overload choice that promises one particular final member. The single-member helpers do not accept other incoming members merely because their names suggest replacement.

## Valid flow sequence

```text
var x: String | Int = ?;

x = 42;
/* x reads as Int. */
replaceInt(var x);
/* Valid: x reads as Int. */

replace(var x);
/* Valid: x reads as String | Int. */

x = "42";
/* x reads as String. */
replaceStr(var x);
/* Valid: x reads as String. */

x = 42;
replaceInt(var x);
/* Valid: x reads as Int. */
```

Assume 42 is Int and the helpers have the contracts above. The simple single-member call preserves its member because the incoming value already fits that member and every permitted write also fits it. A no-write path preserves the same valid member. No separate final-state guarantee or required assignment is needed.

A wider var (String | Int) call can discard the incoming Int-only refinement because it may write String. After normal return, use String | Int as the conservative read type unless a separately supported preservation fact exists. Do not infer a narrower type from a helper name, an observed execution, or tests that happened to write one member. General body-effect inference remains open.

All calls keep x's declared String | Int accepted replacements; Bool remains an invalid replacement. The calls themselves return Unit, independently of the location's contents. The existing = ? definite-initialization rules and direct-assignment flow rules are unchanged.

## Rejected cross-member calls

These are independent rejected fragments for the same declared String | Int storage:

```text
x = 42;
replaceStr(var x); /* Rejected: current Int cannot satisfy readable String. */
```

```text
x = "42";
replaceInt(var x); /* Rejected: current String cannot satisfy readable Int. */
```

```text
replace(var x);
replaceStr(var x); /* Rejected: the current String | Int may still be Int. */
```

A rejected call establishes no successful post-call read fact. In particular, the first fragment does not make x read as String. The same input-compatibility rule applies even if the particular function body assigns before reading: a plain var String signature is a read/write String contract, not an output-only special case inferred from its body.

## Return paths, stability, and identity

Preserve justified facts only while the location stays stable. A possibly replacing call invalidates old value-dependent tests/relationships unless preservation is supported. The supported post-call facts above apply to normal return; failures, panics, cleanup, and transfers keep their ordinary behavior. A call may already have written before failing, so do not silently restore the pre-call value or refinement on a recovered path.

The grant designates the supplied location under existing evaluation/lifetime rules. Preserve callee/argument evaluation, caller authority, initialization, var/mut distinctions, cleanup, and ownership obligations. A narrowed read does not change declared accepted writes or grant a new writable alias. Internal Never read compatibility does not bypass these write/access checks.

Captured writes, shared state, multiple aliased parameters, callbacks, failure-path facts, and complete exclusivity/effect analysis remain open. This selection concerns explicit caller-location grants, not arbitrary getters or automatic invalidation after every read-only call.

## Future write-only access

The user requests possible write-only access in a future review, not now. Keep its spelling, readable-before-write behavior, required-write/normal-return guarantees, reservation/initialization interactions, failure paths, and access compatibility open. No new output mode, keyword, or final-state-guarantee syntax is selected. Var T retains its current read/write T meaning.

A future contract accepting an incoming Int while promising final String would need an explicitly different input/output or write-only model. It must not be inferred from var String today. Explore that separately from permission to write, which alone does not require a write to occur.

## Related documents

- [Assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) and [var access](var-access-qualifier.md).
- [Caller mutation grants](caller-mutation-grants.md), [caller-location parameters](slot-parameters.md), and [parameter permissions](parameter-permissions.md).
- [Evaluation order](evaluation-order.md), [mutability](mutability.md), and [types and inference](types-and-inference.md).
