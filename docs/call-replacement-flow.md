# Flow types after caller-location replacement

Status: **read/write entry compatibility and basic read-flow invalidation, nested forwarding, and caller recovery after explicit var calls selected 2026-10-24; write-only access is future work, not a current mode; complete alias/effect rules remain open**.

## Declared storage and current reads

A local binding keeps its declared accepted replacements even when its current read type is narrower. A var T parameter has both read and write access to T. The callee may read T immediately; it need not assign before reading or returning. Var is not output-only access or a mandatory-write promise.

For the supported simple local cases, check both directions at callee entry, after argument preparation:

- Every currently justified readable alternative fits the parameter's readable type.
- Every replacement permitted by the parameter fits the caller location's declared accepted writes.

The current read type and the declared write contract are separate inputs to this check. A String | Int location still reading Int at invocation can supply var Int, but cannot supply var String. Its storage accepts String writes, yet the callee could immediately read an Int as String. Merely fitting the callee's possible writes is insufficient.

These checks require valid entry refinements and compatible location access throughout the call. They do not select general access variance, shared-alias concurrency, or a complete subtype/ownership model.

## Entry facts after argument evaluation selected

Selected on **2026-10-24**: the readable type required by each var argument must be justified when the callee begins, after evaluation of all reached supplied arguments. A fact established when an earlier argument location was selected is insufficient if a later argument can invalidate it:

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

This selects a necessary type-safety condition at invocation. The same-local duplicate var-grant case is separately rejected below. The later-argument read and direct-write cases are separately allowed below; general grant/borrow activation, an exclusivity implementation, and broader overlapping/callback/alias checks remain open. Satisfying the entry-type condition alone does not approve every such pattern. Independent earlier rejection by a future ownership rule is compatible with this obligation. Access validity and required invariants during the call retain their separate obligations.

## Entry compatibility established during preparation selected

Selected on **2026-10-24**: later arguments may establish the required entry read type for an earlier selected initialized local. The local need not already have that read type when its location is selected; the caller retains its existing authority during preparation, and the callee receives the grant only at invocation.

Assume use_text takes read/write String access, an Int value, and returns Unit:

```text
var value: String | Int = ?;
value = 42;

use_text(var value, ({
    value = "ready";
    0
}));
```

Select value's location while its current read type is Int. Under the caller's grant, the later argument installs String and produces 0. At invocation, String satisfies the callee's readable input, and its permitted String writes fit the caller's declared String | Int storage. Accept this call; do not reject it merely because the local held Int at the earlier selection point. The String-to-Int example above remains rejected because it leaves the wrong type at invocation.

From the same initial value, the user's temporary form has the same effects and grant handoff for this stable callable name and simple local:

```text
var value: String | Int = ?;
value = 42;

tmp := {
    value = "ready";
    0
}
/* value reads as String; declared writes still accept String | Int. */
use_text(var value, tmp);
```

These are alternative fragments. The temporary has type Int. Before use_text starts, value reads as String and permits a String write; its declared caller replacement contract still also permits Int. During the call, the callee receives only the read/write String authority requested by its parameter. Normal return leaves a String read type under that contract, without changing the caller's declared String | Int writes or promising particular String contents.

Require a supported String read proof on every path reaching invocation; a later expression that may leave Int does not suffice. A plain use_text(var value, 0) with value still reading Int remains rejected. Keep single location selection, ordinary callee-first/source-argument evaluation, permitted writes, location/lifetime validity, and duplicate-grant rejection. The temporary equivalence does not authorize reordering effects from an earlier callee or argument expression. This selects entry-type establishment for initialized simple locals; it adds no uninitialized-input parameter mode, write-only contract, runtime type check, or broader alias/effect inference.

## Later argument reads of a selected local allowed

Selected on **2026-10-24**: selecting an initialized local for an earlier var argument does not prohibit later supplied argument expressions from reading that local to compute scalar values before invocation:

```text
add := fn(target: var Int, amount: Int): Unit {
    target = target + amount;
}

var count: Int = 10;
add(var count, count + 1);
/* After normal return, count is 21. */
```

Evaluate the callee first. Select count's location once for the first argument, then evaluate count + 1 from its current readable Int value, producing 11. Only after the supplied inputs are prepared does add begin using its granted caller-location access. Its assignment reads 10 through target, adds the supplied 11, and writes 21 to the same count location. The call result is Unit. The computed scalar argument is an ordinary expression result; it does not supply a second write grant or a retained location alias.

This permits the illustrated read while preparing arguments; selecting var count does not begin the callee's body or block that read. Preserve source evaluation order and ordinary expression effects, failures, and exits. If argument evaluation exits, the callee is not invoked. Selecting the location neither freezes its payload nor authorizes reordering or reevaluating that location.

Entry compatibility still holds after all reached argument effects: current reads must fit the var parameter, and its permitted writes must fit the declared caller storage. The earlier String-to-Int invalidation example remains rejected. The same-local duplicate var arguments in one call remain rejected. Reads still require initialized storage and a valid current read proof; reservation alone is insufficient.

This selection covers simple initialized locals and computed scalar arguments. Direct local writes during preparation are separately selected below. Field/index overlap, retained read aliases, aggregate input copying/borrowing, callbacks/reentrancy, and a complete grant-activation model remain open. Once the callee's grant is active, the existing single-holder and nested-forwarding suspension rules still apply.

## Later argument writes to a selected local allowed

Selected on **2026-10-24**: a later supplied argument may perform a permitted direct write to an earlier selected initialized local before invocation. The caller holds the location's write grant during argument preparation; selecting that location for the pending var argument does not also activate a callee holder. At invocation, the caller hands the grant to the callee. Only one holder has active write authority at each stage.

```text
add := fn(target: var Int, amount: Int): Unit {
    target = target + amount;
}

var count: Int = 10;
add(var count, ({
    count = 20;
    count + 1
}));
/* After normal return, count is 41. */
```

Evaluate the callee first and select count's location once. Then evaluate the grouped argument block under the caller's existing authority: write 20 to count and compute the scalar argument 21. Invoke add with the same location now holding 20; its assignment adds 21 and writes 41. The call result remains Unit. The parenthesized block ({ ... }) makes the argument expression boundary explicit; retain that grouping in this example.

There is no overlap between the caller's preparation-time grant and the callee's invocation-time grant. Neither location selection nor the computed scalar duplicates write authority. Preserve ordinary source order, initialized reads, declared accepted writes, location validity, and the callee's required entry read type after all reached argument effects. A later String-to-Int write still prevents invocation of a var String parameter; two same-local var arguments in the same call remain rejected.

If argument evaluation fails or exits, do not invoke the callee. Prior writes retain their ordinary effects; no rollback or pre-selection payload snapshot is introduced. Simple nested granting calls in later arguments are separately selected below; retained aliases, overlapping fields/indices, callbacks/reentrancy, complete cleanup rules, and aggregate copying/borrowing remain open. Once invoked, ordinary single-holder, nested-forwarding, and recovery rules continue to apply.

## Nested granting calls during argument preparation allowed

Selected on **2026-10-24**: a later argument may temporarily grant the same initialized simple local to another synchronous call that completes before the pending outer invocation. Selecting the outer var location does not activate another holder. Using add from the preceding example:

```text
prepare := fn(target: var Int): Int {
    target = 20;
    target + 1
}

var count: Int = 10;
add(var count, prepare(var count));
/* After normal return, count is 41. */
```

The active grant passes from caller to prepare, back to caller, then to add, and back to caller. Prepare writes 20 and returns 21 before add begins. Add receives the same location holding 20 and adds the supplied 21. Only one holder has active write authority at each stage; this does not duplicate the grant into two parameters of one invocation.

For these stable callable names and the simple count local, evaluating the scalar preparation into a fresh temporary gives the same call effects and result. From the same initial count value, the inline call above corresponds to:

```text
tmp := prepare(var count);
add(var count, tmp);
```

The preceding direct-write argument example likewise corresponds to the user's executable block initializer:

```text
tmp := {
    count = 20;
    count + 1
}
add(var count, tmp);
```

The block's assignment produces Unit, and its final count + 1 supplies the Int result 21. Each inline or temporary form evaluates its preparation once, leaves count holding 20 before add starts, and ends with count holding 41. The temporary examples are alternative fragments, not additional calls to execute after the inline form. Retain ({ ... }) around the inline argument block so its expression boundary is explicit; the standalone block initializer uses its ordinary declaration boundary.

This equivalence describes the effects, values, and grant handoffs of these examples. It is not a general instruction to move a later argument ahead of an effectful callee expression or earlier arguments. Ordinary calls still evaluate the callee first, then supplied arguments left to right, selecting each location once. A general transformation must preserve those evaluations, selected-location identity, lexical scope, and lifetimes; computed field/index locations and aggregate transport retain their separate open contracts.

After prepare ends, require the outer callee's entry read type still to fit the current local and its permitted writes still to fit the caller's declared storage. Preserve the inner call's own compatibility, single-holder, lifetime, cleanup, and recovery obligations. If argument evaluation fails or exits without producing the required input, do not invoke add; prior writes are not rolled back. Recovered argument evaluation may continue only with a valid result and restored authority. The known duplicate-grant rejection within one invocation remains unchanged. Retained aliases, overlapping paths, callbacks/reentrancy, and a complete activation/effect model remain open.

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

## Nested forwarding of a write grant selected

Selected on **2026-10-24**: a var-qualified parameter may explicitly forward its existing caller-location grant to one nested call. This is a temporary handoff of the same write authority, not a second active grant or new local storage:

```text
inner := fn(value: var Int): Unit {
    value = 42;
}

outer := fn(value: var Int): Unit {
    inner(var value);
    value = 7;
}
```

Inner receives the original supplied location. While its grant is active, outer's independent access through that handed-off grant is suspended. On normal return, outer regains its grant for the same location, observes the effects of inner's writes under the ordinary read-flow rules, and can assign 7. An enclosing caller supplying that location observes the replacements; the parameters do not become detached working copies. Both call expressions still have their ordinary Unit result.

No second local var declaration is needed to forward a received var parameter. The nested call uses the existing explicit var argument marker and must satisfy ordinary current-read, accepted-write, location-validity, and authority checks. It cannot obtain more replacement authority than outer received, even if the original caller's hidden storage contract was broader. Selecting an earlier var argument still does not freeze its payload; the required read proof must hold at nested-callee entry after later argument effects.

Forwarding can nest along a synchronous call chain, with only one active holder for this source grant at a time and access returning to the immediate suspended caller on normal return. A call such as two_targets(var value, var value), assuming two otherwise compatible var parameters, still violates the same-local duplicate rule; forwarding does not split the authority into two parameters. It does not transfer ownership of the payload, retarget the supplied location, or create an escaping reference.

The nested access cannot outlive the received caller-location access. Do not return, store globally, or capture this temporary grant for later use. Preserve ordinary callee/argument evaluation, side effects, cleanup, and ownership obligations without copying, implicit copy-back, rollback, or a new pointer/runtime representation.

The suspension described here concerns the nested call's active grant; it does not select the exact activation moment during argument evaluation. Callback/reentrancy rules, general alias detection, overlapping fields/indices, and complete borrow/lifetime/exclusivity implementation remain open. Caller recovery after the nested access and applicable callee-side cleanup end is selected [below](#recovery-after-a-forwarded-call-selected). Other failure/exit paths do not establish normal continuation facts; ordinary failure/transfer/cleanup contracts continue to apply, and earlier writes are not silently undone.

## Recovery after a forwarded call selected

Selected on **2026-10-24**: when a forwarded call ends through a recoverable failure, restore the immediate caller's same-location grant after the nested access and applicable callee-side cleanup end, before the caller's recovery handler starts. The handler can then read and write through that restored grant:

```text
outer := fn(value: var Int): Unit {
    inner(var value) else {
        value = 0;
    }

    value = 7;
}
```

Assume inner accepts read/write Int access and has a fallible Unit result covered by this handler. It may write before failing. The handler's assignment is valid because outer has regained its original grant; if the handler completes normally, execution continues to the assignment of 7. An enclosing caller observes the writes to the original location. If recovery instead fails or transfers control outward, that path does not execute the following assignment.

Restoring authority does not restore old contents or old refinements. Earlier writes remain visible; there is no rollback, detached working copy, or implicit copy-back. In this Int-only example, the received contract still justifies Int reads. If a nested call may replace String | Int storage, recovery cannot assume the pre-call String-only fact merely because the call failed. Use only read facts justified after possible writes and cleanup; general failure-path effect inference remains open.

A returned Result failure reaches caller recovery after the callee has returned and ended its access. For a typed panic crossing the call boundary, applicable exited-scope [finally blocks](finally.md) run before the caller's handler, with the grant restored after nested access and callee-side cleanup end. A handler inside inner that recovers while inner continues does not return the grant to outer early. In a deeper forwarding chain, restore each immediate suspended holder only as its child access ends; never reactivate several holders at once.

This selects access at the caller recovery boundary, preserving ordinary recovery, cleanup, result typing, and control transfers. It does not define hard-abort recovery, callback/reentrancy access, exact activation during argument evaluation, general alias enforcement, or a complete unwind/cleanup access model. It creates no write-only mode or final-state guarantee.

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

The same-local duplicate var grant in one call is rejected under the selected single-source rule. Captured writes, shared state, general alias detection/enforcement, callbacks, general failure-path facts beyond the selected caller recovery boundary, and complete exclusivity/effect analysis remain open. This selection concerns explicit caller-location grants, not arbitrary getters or automatic invalidation after every read-only call.

## Future write-only access

Future direction clarified on **2026-10-24**: a function parameter could request single-write-only or multi-write-only access, including access to uninitialized caller storage. The write allowance and permission to read are separate parts of that future contract. The selected local single-write/multi-write examples become readable after a successful write; they do not yet define write-only parameter behavior. Var T retains its current read/write T meaning and requires initialized readable input.

The motivating large-buffer example is:

```text
users: [User; 100000] = ?;
```

This reserves the fixed array's complete storage without constructing readable User elements. A future initializer parameter could request access to populate that supplied storage directly, avoiding a preliminary zero/default construction pass. The declaration uses the existing fixed-array and reservation forms; no initializer parameter/call syntax or indexed first-construction syntax is selected here. Stack/heap placement and allocation policy remain separate.

Review single-write and multi-write permissions explicitly: a single-write destination would allow one initialization write on a path; a multi-write destination could allow repeated writes under its eventual contract. For an array-building API, specify whether the write allowance applies to the whole array, each element, or a designated region. Constructing 100000 different elements is not automatically 100000 replacements of the same destination.

Keep these obligations open before selecting the feature: whether write-only access remains unreadable inside the callee after a write or supports a later explicit/state-based transition; which supplied initialization states are admitted; whether successful return guarantees complete initialization; how the caller learns which values or regions are readable; and how partial writes, replacement cleanup, failures, grant forwarding, and lifetime/access checks work. Permission to write alone does not prove that all required elements were initialized. Untouched elements cannot be read, and cleanup must account for which elements actually became valid under the eventual policy. Preserve the existing union compatibility and flow obligations where applicable; uninitialized storage adds no readable Unit or unknown union member.

This is recorded future work, not a current parameter mode. No new keyword, qualifier, output mode, or final-state-guarantee syntax is selected.

A future contract accepting an incoming Int while promising final String would need an explicitly different input/output or write-only model. It must not be inferred from var String today. Explore that separately from permission to write, which alone does not require a write to occur.

## Related documents

- [Assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) and [var access](var-access-qualifier.md).
- [Caller mutation grants](caller-mutation-grants.md), [caller-location parameters](slot-parameters.md), and [parameter permissions](parameter-permissions.md).
- [Evaluation order](evaluation-order.md), [mutability](mutability.md), and [types and inference](types-and-inference.md).
