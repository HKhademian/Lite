# Manual failures and escaping-error inference

Status: **selected, 2026-10-27; unreleased design**, [LP-0012 r1](proposals/LP-0012-manual-failures-and-error-inference.md). Custom error and panic categories can be raised manually. Eligible unannotated callable bodies infer escaping returned errors; explicit/expected contracts remain constraints. Custom category declaration/conformance syntax, overlapping classifications, recursive/public inference policy, and partial-handler exit obligations still need contracts.

Normative for manual raise and the extension to ordinary [function result inference](functions.md#independent-lambda-result-inference). [Result and errors](result-and-errors.md) owns outcomes, [capture and unwrapping](failure-capture-and-unwrapping.md) owns ?/!, and [expression recovery](expression-recovery.md) owns ordered consumption. The [shortfalls list](failure-handling-shortfalls.md) separates selected behavior from unfinished decisions.

## Custom categories and explicit raising

Programs may define recoverable Error categories and implicit-failure Panic categories with typed payloads. A failure's classification must be explicit in its declaration/conformance contract; capitalization or a name ending in Error/Panic cannot establish membership. The concrete declaration syntax is not selected here. Examples assume InvalidUser and DisabledUser belong to Error, CorruptedAuthState belongs to Panic, and their illustrated fields are established.

`raise expression` evaluates its required operand once. For an established Error-category operand, it exits the nearest function/closure with a returned failure, like return .err(expression). For an established Panic-category operand, it initiates ordinary typed-panic propagation toward an eligible active boundary. Both obey the existing cleanup and failure-retention rules. The raising path supplies no normal local value. An error/panic object can still be constructed, stored, or passed as ordinary data without raising it.

```text
authenticateUser := fn(user: User) {
    if not isUserValid(user) {
        raise InvalidUser { reason = "Invalid credentials" };
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
        raise InvalidUser { reason = "Invalid credentials" };
    }

    if isUserDisabled(user) {
        raise DisabledUser { userId = user.id };
    }

    createSession(user)
}
/* fn(user: User): Session ! (InvalidUser | DisabledUser) */
```

The inference accounts for Error raises, explicit return .err(error) paths, errors forwarded by !, and outward fallible tail outcomes under the existing outcome-boundary rules. It follows supported completion paths and declared callee contracts; it does not execute the program or enumerate dynamic occurrence counts. Multiple normal success types use existing normalized-union inference. Fully handled errors and stored local Results that do not escape do not enter the inferred outward error set. A nested function's body belongs to that function; its errors enter the outer function only through an outward use of its outcome, such as a call followed by !.

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
        raise InvalidUser { reason = "Invalid credentials" };
    }

    if isAuthStateCorrupted() {
        raise CorruptedAuthState {};
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
        raise InvalidUser { reason = "Invalid credentials" };
    }

    createSession(user)
}
```

A DisabledUser error may not escape this declared contract unless explicitly mapped/handled under defined rules. A declared plain Session result permits no escaping returned errors. Established expected callable output contracts impose the same check, even when the literal omits its annotation. The implementation cannot widen an existing contract because its body changes. Omitted output inference establishes a contract when none is supplied; it does not weaken a supplied one. All escaping returned errors still need coverage in that established contract, whether inferred or explicit.

## Raising and outward forwarding are different

The effect of raise is determined by the operand's established failure category, not whether the value was freshly constructed or previously caught. A manually raised panic follows ordinary local recovery scope:

```text
attempt := ({ raise CorruptedAuthState {} })?;
```

This illustrates local panic capture; its success type requires an annotation or the future no-normal-completion rule. It does not demonstrate inferred Unit success.

A panic raised by an earlier handler can reach a later eligible else because that later clause encloses the earlier handler. The earlier handler never catches its own new failure. Error raise remains a nearest-function/closure return-like exit and is not intercepted by that following else. This category difference reflects the returned-error versus implicit-panic channels, not origin-sensitive syntax.

By contrast, outcome! explicitly forwards the complete stored outcome through LP-0010's directed exit rules. The earlier request for a handler-local raise that bypasses following clauses is not the meaning of manual Panic raise. Exact forwarding syntax for an already-caught group, preservation of re-emitted occurrence provenance, scalar multi-match binding, and any unmatched remainder remain under review in [LP-0011 r2](proposals/LP-0011-explicit-failure-raising.md). No selected raise ...collector or bare rethrow form follows from raise expression.

Error raise is return-like. A local `({ raise InvalidUser { reason = "Invalid credentials" } })?` does not intercept that exit from the enclosing function, just as it does not intercept return .err or function-targeted !. By contrast, `authenticateUser(user)?` captures the returned outcome of the called function. Manual Panic raise follows ordinary active panic boundaries and can be captured inside its own function. A true nonlocal Error raise inside a partial catch still needs the [unmatched-remainder policy](failure-handling-shortfalls.md#1-exits-with-an-unmatched-remainder); no remainder may silently disappear.

## Runtime boundary

Error raise can use the existing typed outcome-return mechanism. Panic raise uses the same supported panic transport as generated faults. Inference is a compile-time responsibility. None requires an independent runtime service just for the raise keyword, but cleanup, dynamic panic identity, retained multiple payloads, ownership, and cross-call transport still have implementation costs and unresolved policies. These documents contain no parser/compiler/runtime implementation or performance result.
