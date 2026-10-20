# Control-flow exits

Status: **targeted return targets and bare/value loop exits selected; targeted-return completion interactions and labeled contribution syntax remain open**.

## Templates

```text
return;
return value;
return @tag;
return @tag value;
break;
break value;
continue;
continue value;
continue @loop;
```

Semicolons separate ordinary items; a newline never decides whether an exit operand follows. An exit whose payload ends directly in an unparenthesized complete block construct ends at that construct, with an optional trailing semicolon. Optional operand forms need a complete grammar, including any future labeled continuation contribution.

## Plain return

`return value` exits the nearest function or closure. `return;` returns `Unit`. Early returns are encouraged for guard cases. Ordinary blocks do not create an implicit plain-return boundary.

The [error-return shorthand proposal](error-return-sugar.md) would add throw error with the exact semantics of return .err(error), requiring the nearest function/closure's declared fallible result contract. It shares that return boundary and cleanup rules; bare throw and tagged throw are not proposed. Its spelling remains unselected.

## Targeted return

```text
price := @pricing {
    if invalid {
        return @pricing 0
    }

    calculate_price()
}

use(price);
```

The targeted return exits `@pricing`, not the enclosing function. Its payload must satisfy the target construct's result type. A missing value means `Unit`, not an inferred accumulator or arbitrary fallback.

Targets must be lexically enclosing. Control-flow transfers cannot jump across function or closure boundaries. A target's kind controls which operations are permitted.

## Loop distinction

- `continue`: move to the next iteration without a contribution.
- `continue value`: contribute a value of iteration type `T`, then advance.
- `break`: stop iteration without contributing, preserving previous state and following loop completion processing.
- `break value`: commit a body value of type T, stop the nearest loop, and run then if present. No tag is required.
- `return @loop value`: exit the named loop; whether its then block executes is explicitly unresolved (see the note below).

```text
found: Option<User> = @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
}
```

On a match, the tagged exit supplies `Some(user)`. On a non-match, the conditional has no final `else`, so it returns its zero `Option<User>` (`.None`), which the loop commits as its body value. Exhaustion therefore yields `.None` without a `None` body or explicit `continue`. The explicit destination types both the loop result and the conditional fallback. With no `then`, direct-result and completion-directed tagged-return candidates have the same result type and value here; this example does not settle their behavior when `then` is present. `return @search;` would supply `Unit` and conflict with an `Option<User>` result.

## Tagged return and completion: unresolved

The user is not convinced that return @tag value should bypass then (2026-10-19). Keep the target syntax and lexical targeting, but do not treat bypass or execution of then as selected. Revisit how the exit payload relates to body type T and completion result R before choosing. This uncertainty does not reopen the selected break/break value behavior: both reach then, with only break value replacing .value.

The user asks to keep this open and compare more cases. These sketches isolate where the candidate meanings differ:

1. **No `then`:** a direct target result of type T and a contribution of type T both produce the same loop value. The observable difference is small, so this case alone does not settle the rule.
2. **Same-type `then` with an effect:** if `then` logs `.count` and returns `.value`, a direct tagged return skips that log; a completion-directed exit runs it. The result value can match while execution differs.
3. **`then` transforms T into R:** if the body contributes `User` and `then` returns `String`, a direct exit must supply the loop's final `String` result (or the language must define another result-composition rule). A completion-directed exit supplies a `User` contribution and lets `then` produce `String`.
4. **Return to an outer loop from a nested loop:** both models leave the inner loop early. It remains to specify whether the target outer loop runs its `then`, and confirm that the abandoned inner loop does not run ordinary completion merely because it is being exited. Cleanup on this path belongs to the deferred lifecycle review.
5. **Return to a non-loop block:** targeted return already supplies that target's result directly. A rule that commits T and runs `then` would therefore be loop-specific, because ordinary blocks have no loop completion hook.

```text
summary := @search loop users as user {
    if matches(user) {
        return @search user
    }
    .value
} then {
    log(.count);
    describe(.value)
}
```

Here the body state has type T = `User`, while `then` produces R = `String`. Under the direct-result candidate, the early payload must satisfy R and `then` is skipped. Under the completion-directed candidate, the early payload satisfies T, replaces `.value`, and `then` produces R. Whether `describe` or the payload should be optional or wrapped is a separate type-design question; this sketch compares control flow only.

### Candidate models, not selections

- **Direct target result:** the payload has the target's final result type R and bypasses its `then`. This matches targeted return for ordinary blocks, but early and normal loop paths must agree on R; completion effects are skipped.
- **Commit and complete:** the payload has body type T, replaces the target loop's `.value`, stops that loop, and runs its `then` to produce R. This lets the completion block observe an early exit, but makes `return @loop value` behave like a labeled contribution-bearing break. Intermediate exited loops and other tagged targets need explicit rules.
- **Separate the spellings:** preserve `return @tag value` as a direct target result and consider a labeled `break @loop value` for commit-and-complete. That adds syntax; the labeled break form is not selected.

Do not use `then` as a cleanup guarantee in any model. Loop `then` processes loop completion; conditional `then` processes the branch/zero result. Whether targeted returns, propagated errors, or panics enter or bypass those clauses remains open. Cleanup belongs to the separate `finally`/lifecycle review.

### Return to a conditional with `then`

The selected conditional contract now gives a tagged `if` a post-selection `then`: the branch or missing-`else` zero produces `T`, and `then` may produce final result `R`. A tagged return to that conditional creates the same unresolved direct-versus-completion distinction:

- **Direct target result:** the return payload satisfies `R` and supplies the conditional's final result; its `then` is skipped.
- **T input followed by completion:** the payload satisfies `T`, becomes the conditional result read as `@tag.value`, and the attached `then` runs to produce `R`.

When `T = R`, the result can be identical while the effect differs:

```text
outcome := @choose if use_choice {
    if early_exit {
        return @choose "early"
    }
    "normal"
} then {
    record_choice(@choose.value)
    @choose.value
}
```

The direct-result model returns `"early"` without calling `record_choice`; the T-input model passes `"early"` through `then` and calls it. Both can return the same string.

When `T` and `R` differ, the payload type separates the models. For example, branches may produce `String` and `then` may return its length as `Int`. The direct-result model requires an `Int` payload and skips the conversion; the T-input model accepts a `String` payload and converts it in `then`. The language has not selected either contract.

This comparison concerns a tagged return to the conditional that owns the `then`. Returning to an outer conditional from inside a loop also leaves the loop; whether the abandoned loop runs its own `then` is a separate open transfer rule. Error propagation and panic transfer remain separate from this value-payload comparison. No parser or interpreter implementation is present in this checkout, so these are candidate semantics, not verified runtime behavior.

### Locally recovered failure versus propagation

An operation-level handler inside a conditional branch can turn a returned error or matching typed panic into a fallback value. If the handler and the rest of the branch complete with `T`, the conditional has its ordinary branch result and its selected `then` processes that result. For example, a failed `read_text()` recovered locally to `""` still gives a string result for a following normalization `then`.

Postfix `!` forwards a returned error from the nearest function or closure; it is not a conditional fallback. That path does not provide a branch value or the missing-`else` zero for the conditional to transform. An unhandled panic also propagates on its separate channel and supplies no conditional `T`. These cases distinguish `then` result processing from cleanup, but do not settle transfer and cleanup behavior: panic unwinding and `finally` execution on failure remain open. A recovery tail attached outside the complete conditional is superseded; body-wide recovery sections remain deferred.

## Labeled continuation and break shorthand

`continue @loop` was retained for explicitly advancing an enclosing loop. A target that is an `if` or ordinary block cannot continue.

Break value commits its operand to .value, stops the nearest loop, and enters normal completion. Its operand has the body value type T, just like continue value; then may transform T into final result type R. Without then, the committed .value is the final result. Bare break performs the same stop/completion without replacing .value.

The earlier documentation incorrectly made break value bypass then. That behavior is removed. Whether return @tag value should bypass then is now explicitly uncertain; the previous bypass rule is only a candidate. The named break @tag value and contribution-bearing continue @tag value forms remain unselected.

```text
status := loop numbers as number {
    if number < 0 { break 0; }
    .value + number
} then {
    format_total(.value)
}
```

Assume format_total maps Int to String. A negative item commits Int zero, stops, and still executes format_total(0). The body value is Int while the final completion result is String.

## Cleanup

Structured exits run applicable `finally` blocks while unwinding. The intended order is from exited inner constructs toward the target. Detailed interactions with cleanup errors, receiving `finally` transformations, and control-flow attempts from inside cleanup remain open. Cleanup must not silently override a pending early return or propagated error.

Postfix `outcome!` supplies one Result layer's success payload or returns its recoverable error from the nearest function or closure. The escaping error must fit that function's declared error contract; it cannot cross a closure boundary to return directly from an outer function. This is structured error forwarding, not dynamic handler lookup or a panic assertion. See [Result and errors](result-and-errors.md) and [propagation and call chaining](propagation-and-chaining.md).

The [finally example](finally.md) proposes integrating cleanup with typed panic transfer while retaining inner-to-outer structured-exit cleanup. That extension and cleanup-failure precedence remain unselected. These structured-exit rules do not establish cleanup behavior during a panic. The separate [panic path](panics.md) still needs termination versus unwinding and cleanup guarantees.

## Notes

Exit payloads are checked against their target. An expression that exits does not need to supply a normal local value to surrounding expressions it never completes. An internal bottom/`Never` type can express that fact.

## Related concepts and references

- [Tags and contexts](tags-and-contexts.md)
- [Loop completion](loop-completion.md)
- [Functions](functions.md)
- [Rust loop exits](https://doc.rust-lang.org/reference/expressions/loop-expr.html) provide a comparison; LiteScript's generalized `return @tag` and accumulator-preserving bare `break` are separate design choices.
