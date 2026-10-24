# Flow types after caller-location replacement

Status: **read/write entry compatibility and basic read-flow invalidation after explicit var calls selected 2026-10-24; write-only access is future work, not a current mode; complete alias/effect rules remain open**.

## Declared storage and current reads

A local binding keeps its declared accepted replacements even when its current read type is narrower. A var T parameter has both read and write access to T. The callee may read T immediately; it need not assign before reading or returning. Var is not output-only access or a mandatory-write promise.

For the supported simple local cases, check both directions at the call:

- Every currently justified readable alternative fits the parameter's readable type.
- Every replacement permitted by the parameter fits the caller location's declared accepted writes.

The current read type and the declared write contract are separate inputs to this check. A String | Int location currently reading Int can supply var Int, but cannot supply var String. Its storage accepts String writes, yet the callee could immediately read an Int as String. Merely fitting the callee's possible writes is insufficient.

These checks require valid entry refinements and compatible location access throughout the call. They do not select general access variance, shared-alias concurrency, or a complete subtype/ownership model.

## Entry facts after argument evaluation selected

Selected on **2026-10-24**: the readable type required by each var argument must remain justified when the callee begins, after evaluation of all reached supplied arguments. A fact established when an earlier argument location was selected is insufficient if a later argument can invalidate it:

```text
var x: String | Int = ?;
x = "ready";

use_text(var x, ({
    x = 42;
    0
}));
/* Rejected: x reads as Int before use_text begins. */
```

Assume use_text requires a read/write String location and an Int value, and returns Unit. According to the selected evaluation order, the first argument selects x while it reads as String; the later block expression would assign Int and produce 0 before invocation. That assignment fits x's declared String | Int storage, but the resulting Int cannot satisfy the callee's readable String input. Reject the call statically; an initial successful check of the first argument does not authorize it.

Preserve ordinary callee-first, argument-left-to-right evaluation and select each supplied location once. A var grant designates the location, not a snapshot of the payload it held at selection. Do not reorder the write, silently copy the old String into detached storage, or reevaluate the location to make the call fit. This rule is a static entry obligation, not a selected runtime type check or recovery path.

Require a supported proof that entry reads fit after intervening argument effects; invalidate earlier facts where those effects may change the location unless preservation is justified. Continue checking the callee's permitted writes against the caller's declared accepted replacements. Calls whose argument evaluation exits do not reach invocation and retain ordinary failure/exit behavior; no post-call fact is established merely by selecting an argument.

This selects a necessary type-safety condition at invocation. The same-local duplicate var-grant case is separately rejected below. Grant/borrow activation, an exclusivity implementation, and broader overlapping/callback/alias checks remain open. Satisfying the entry-type condition alone does not approve every such pattern. Independent earlier rejection by a future ownership rule is compatible with this obligation. Access validity and required invariants during the call retain their separate obligations.

## Single source write grant selected

Selected on **2026-10-24**: one underlying source location supplies only one active write grant. A call cannot duplicate that grant into two var parameters. In particular, reject two explicit var arguments identifying the same local binding in one call:

```text
change := fn(a: var String, b: var (String | Int)): Unit {
    b = 42;
    print_text(a);
}

var x: String | Int = ?;
x = "ready";
change(var x, var x); /* Rejected: the same source would supply two write grants. */
```

Assume print_text accepts String and returns Unit, and the named types are distinct. Both arguments satisfy their separate entry-type and accepted-write checks initially. But if they received the same location, writing Int through b would invalidate a's promised readable String. A single-source write grant cannot be duplicated to create those simultaneous parameter accesses.

Reject the repeated grant even when both parameter value types are identical or the current function body happens not to write. The rule concerns source-location write authority, not just finding a conflicting assignment in a particular body. Compare local binding/location identity, not equal stored values or only textual names. Two distinct local locations can each supply their own grant; this restriction alone does not reject them, though all ordinary compatibility rules still apply.

Do not silently clone/detach a value, create independent copy-back parameters, arbitrate write-back order, or add a runtime alias check to make the rejected call work. Preserve caller-location replacement semantics and existing evaluation order. A rejected call establishes no post-call read fact.

The mandatory selected check is the obvious same-local duplicate in one call, under the single-source grant principle. General alias detection through different names/paths, field/index overlap, parent/child storage, mut payload aliases, callbacks/reentrancy, exclusivity implementation, and exact grant/borrow activation timing remain open. This does not decide read-only argument passing or infer that equal object payloads imply identical local storage.

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

The same-local duplicate var grant in one call is rejected under the selected single-source rule. Captured writes, shared state, general alias detection/enforcement, callbacks, failure-path facts, and complete exclusivity/effect analysis remain open. This selection concerns explicit caller-location grants, not arbitrary getters or automatic invalidation after every read-only call.

## Future write-only access

The user requests possible write-only access in a future review, not now. Keep its spelling, readable-before-write behavior, required-write/normal-return guarantees, reservation/initialization interactions, failure paths, and access compatibility open. No new output mode, keyword, or final-state-guarantee syntax is selected. Var T retains its current read/write T meaning.

A future contract accepting an incoming Int while promising final String would need an explicitly different input/output or write-only model. It must not be inferred from var String today. Explore that separately from permission to write, which alone does not require a write to occur.

## Related documents

- [Assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) and [var access](var-access-qualifier.md).
- [Caller mutation grants](caller-mutation-grants.md), [caller-location parameters](slot-parameters.md), and [parameter permissions](parameter-permissions.md).
- [Evaluation order](evaluation-order.md), [mutability](mutability.md), and [types and inference](types-and-inference.md).
