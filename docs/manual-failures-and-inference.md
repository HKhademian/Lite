# Manual failures and escaping-error inference

Status: **selected, 2026-10-27; unreleased design**, [LP-0012 r1](proposals/LP-0012-manual-failures-and-error-inference.md) for custom failures/inference and [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md) for current raise targeting. Untagged raise targets the nearest function/closure for both Error and Panic; an explicit block tag selects a local boundary. LP-0014 supersedes LP-0012's earlier local interception of bare Panic raise. Category syntax/overlap, general recursive/public inference, and unmatched-remainder exit policy remain open.

Normative for manual raise and the extension to ordinary [function result inference](functions.md#independent-lambda-result-inference). [Result and errors](result-and-errors.md) owns outcomes, [capture and unwrapping](failure-capture-and-unwrapping.md) owns ?/!, and [expression recovery](expression-recovery.md) owns ordered consumption. The [shortfalls list](failure-handling-shortfalls.md) separates selected behavior from unfinished decisions.

## Custom categories and explicit raising

Programs may define recoverable Error categories and implicit-failure Panic categories with typed payloads. A failure's classification must be explicit in its declaration/conformance contract; capitalization or a name ending in Error/Panic cannot establish membership. The concrete declaration syntax is not selected here. Examples assume InvalidUser and DisabledUser belong to Error, CorruptedAuthState belongs to Panic, and their illustrated fields are established.

`raise expression` evaluates its required operand once, then completes the nearest function/closure with the supplied failure. Error values use the returned-error channel; Panic values resume the panic channel outside that activation. Neither category changes the default target. `raise ...failures` forwards the supplied sequence in occurrence order; `raise @outer failure` and `raise @outer ...failures` instead target an explicit enclosing executable block. Preserve supplied payloads and retained origins. Applicable cleanup runs, and the path supplies no normal local value. Merely constructing/storing a failure does not raise it. See [directed boundaries](#directed-raise-boundaries).

```text
authenticateUser := fn(user: User) {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" }
    }

    createSession(user)
}
```

Assume isUserValid returns Bool and createSession returns Session. The inferred callable type is fn(user: User): Session ! InvalidUser. InvalidUser is an outward error, not a normal success alternative or Unit contribution.

## Infer all escaping returned-error paths

Within the existing nonrecursive callable body-inference boundary, input types must already be established. If no explicit or expected result contract supplies the output, infer the normal successful type and the normalized union of escaping returned-error categories.

```text
authenticateUser := fn(user: User) {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" }
    }

    if isUserDisabled(user) {
        raise DisabledUser { userId = user.id }
    }

    createSession(user)
}
/* fn(user: User): Session ! (InvalidUser | DisabledUser) */
```

The inference accounts for escaping Error raises, explicit return .err(error) paths, errors forwarded by !, and outward fallible tail outcomes under the existing outcome-boundary rules. It follows supported completion paths and declared callee contracts; it does not execute the program or enumerate dynamic occurrence counts. Multiple normal success types use existing normalized-union inference. Fully handled errors, including Error raises to tagged blocks recovered locally, and stored local Results that do not escape do not enter the inferred outward error set. Classify the actual target and outward outcome before adding a raised error to the function's E. A nested function's body belongs to that function; its errors enter the outer function only through an outward use of its outcome, such as a call followed by !.

Assuming readUser has outward User ! ReadError:

```text
loadSession := fn(id: Int) {
    user := readUser(id)!;
    authenticateUser(user)
}
/* fn(id: Int): Session ! (ReadError | InvalidUser | DisabledUser) */
```

ReadError escapes through !; the authentication errors escape through the outward tail Result. This does not recursively extract a Result deliberately retained inside a success payload, and ordinary fallible calls still return stored outcome data until explicitly handled or used as an outward result.

Recursive or mutually recursive inference must not invent an error set from an incomplete cycle. Supply an explicit result contract where the local inference boundary cannot establish one; a general recursive inference algorithm, public/exported signature policy, and the success type of a body with no normal completion remain open.

## Panics stay outside ordinary inferred E

```text
authenticateUser := fn(user: User) {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" }
    }

    if isAuthStateCorrupted() {
        raise CorruptedAuthState {}
    }

    createSession(user)
}
/* fn(user: User): Session ! InvalidUser */
```

CorruptedAuthState uses the implicit panic channel and is excluded from the returned-error union. Calls and explicit capture retain their selected meanings:

```text
attempt := authenticateUser(user);   /* Session ! InvalidUser */
captured := authenticateUser(user)?; /* Session ! (InvalidUser | Panic) */
```

The ordinary call may panic before assigning attempt. Capture stores supported panics under the broad Panic family, including a manually raised CorruptedAuthState. Neither inference nor ordinary function annotation requires enumerating all panic categories.

## Explicit and expected contracts constrain the body

```text
authenticateUser := fn(user: User): Session ! InvalidUser {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" }
    }

    createSession(user)
}
```

A DisabledUser error may not escape this declared contract unless explicitly mapped/handled under defined rules. A declared plain Session result permits no escaping returned errors. Established expected callable output contracts impose the same check, even when the literal omits its annotation. The implementation cannot widen an existing contract because its body changes. Omitted output inference establishes a contract when none is supplied; it does not weaken a supplied one. All escaping returned errors still need coverage in that established contract, whether inferred or explicit.

## Directed raise boundaries

Selected [LP-0014 r1](proposals/LP-0014-directed-failure-exits.md): the same destination convention applies to normal values and failures:

```text
return value;             /* nearest function/closure, normal completion */
raise failure;            /* nearest function/closure, failure completion */
raise ...failures;
return @outer value;      /* named enclosing block, normal completion */
raise @outer failure;     /* named enclosing block, failure completion */
raise @outer ...failures;
```

The target is a construct to complete, not the name of a handler to invoke. A tag must name a lexically enclosing executable block; neither plain nor tagged raise may cross a function/closure boundary. Untagged raise never defaults to the nearest ordinary block. Other tagged construct kinds need their own support rule. Functions/closures are not newly taggable.

After operand evaluation, the directed transfer skips intervening recovery/capture boundaries inside its target. The transfer itself does not provide a new local failure for the skipped else clauses to intercept. Applicable finally cleanup still runs; cleanup retention and unmatched-remainder obligations are not erased. Failures occurring while the operand is evaluated follow ordinary evaluation boundaries before any directed transfer begins.

```text
value := @outer {
    attempt := read_cached()?;
    attempt
        else ...errs: BoundPanic {
            raise @outer ...errs;
        }
        else { local_default }
}
else ...panics: Panic {
    outer_default
}
```

Assume compatible normal/fallback values, failure-free handlers, and no unmatched categories on the illustrated raise path. The transfer skips local_default, completes @outer with those panics, and makes recovery outside @outer eligible. It does not run normal result-processing then as though a value had been returned. At a block boundary, Error failures remain in its outward outcome; Panic failures retain their panic channel unless captured. A bare raise newPanic instead leaves the nearest function, and caller-side recovery/capture can receive it. This revises LP-0012's earlier bare-panic local-interception direction; generated/live operation panics keep their ordinary implicit propagation.

A protected-block tag does not enclose attached handlers. Write an explicit tagged wrapper around the chain if its handlers need to jump around that chain. A handler-local tag can instead be completed alone, preserving subsequent layers:

```text
tmp1 := operation()?;
tmp2 := tmp1 else :ErrA @handler {
    return @handler fallback_value
}
tmp3 := tmp2 else :ErrB { recover_b() }
```

This trace already explains local handler completion and the retained ErrB remainder. A temporary binding itself does not unwrap anything. These are expression/outcome layers, not a general eager-statement lowering for live panics. LP-0015 now settles plain function return: it skips later layers and abandons the unfinished captured recovery, without forwarding its unmatched categories. The residual type describes only paths reaching the next declaration. Failure-directed raise/! and other nonlocal tagged exits retain the narrower [remainder question](failure-handling-shortfalls.md#1-exits-with-an-unmatched-remainder).

Local manual failure handling uses an explicit block target:

```text
value := @validation {
    if not isUserValid(user) {
        raise @validation InvalidUser { reason = "Invalid credentials" }
    }
    createSession(user)
}
else :InvalidUser { default_session }
```

The failure exits @validation, and recovery surrounding that block handles it. Omit @validation and raise exits the function instead. A local `({ raise newPanic })?` therefore does not intercept that function-directed transfer; capture the call or surround an explicitly targeted block to handle it locally. The same boundary rule applies to Error raises.

## Handler-local raise changes the stored outcome

Assume op has outward T and may panic, and err2 is an Error value of type Err2:

```text
tmp1 := op()?;
/* tmp1: T ! Panic */

tmp2 := tmp1 else @bl2 {
    raise @bl2 err2;
}
/* tmp2: T ! Err2 */

tmp3 := tmp2!;
/* tmp3: T on paths that continue */
```

The receiverless catch consumes every original captured panic before its body executes. raise @bl2 fails only that handler block with err2; it does not exit the function. The same handler cannot catch its own failure. Normal op success skips the handler and remains T. Therefore the outer recovery layer can finish as T ! Err2, replacing the original possible Panic with Err2 under these assumed failure-free operand/cleanup contracts.

A later else on tmp2 may handle Err2. The shown ! instead extracts T on success or forwards Err2 from the nearest function/closure. Err2 must fit that function's explicit/expected or eligible inferred error contract. On the ! failure path tmp3 is not initialized. Unlike plain return from the handler, handler-local raise completes its block with a failure outcome and allows the surrounding recovery declaration to finish. This example consumes the full original group, so it does not require a policy for unmatched remainders in other exit cases.

## Raising and outward forwarding are different

Raise forwards explicitly supplied failures, scalar or spread, to its chosen boundary. outcome! extracts one complete stored outcome's success or forwards all its retained failures to the nearest function/closure. Existing caught values and new Error/Panic values use the same raise target rules. A typed scalar catch exposes the first match and discards other matches under [LP-0013](proposals/LP-0013-scalar-recovery-selection.md); raising that one value cannot revive discarded matches. Use ...errs to retain and raise every match.

Supplying a group is now selected syntax, not a separate future forwarding operator. The remaining [LP-0011 r4](proposals/LP-0011-explicit-failure-raising.md) issue is other unmatched failures during failure-directed or other nonlocal tagged exits, plus provenance/transport details. LP-0015 separately settles plain return from captured recovery as abandonment, with no extra forwarding or rejection. Carrying those remainders alongside supplied failures is the reviewed recommendation; the alternative of rejecting an exit until its remainder is handled is not yet ruled out. No remainder may silently vanish. Custom classification of ambiguous/overlapping operands and concrete origin metadata remain open.

## Runtime boundary

Function-directed Error raise can use typed outcome returns; tagged block raise can use a directed local transfer. Panic delivery at the selected boundary retains typed panic transport. Inference is compile-time work. No separate runtime service is required solely for the keyword, but cleanup, dynamic category identity, retained multiple payloads, ownership, and cross-call/mixed-channel transport still need implementation and cost policies. There is no parser/compiler/runtime implementation or measured performance result here.
