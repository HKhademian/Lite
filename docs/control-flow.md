# Control-flow exits

Status: **tagged returns run the named target's completion and skip exited inner completion; bare/value and explicitly targeted loop exits selected; failure transfer remains open**.

## Templates

```text
return;
return value;
return @tag;
return @tag value;
return @tag @other.value;
break;
break value;
break @loop;
break @loop value;
continue;
continue value;
continue @loop;
continue @loop value;
continue @loop (.value);
```

Semicolons separate ordinary items; a newline never decides whether an exit operand follows. An exit whose payload ends directly in an unparenthesized complete block construct ends at that construct, with an optional trailing semicolon.

## Target and payload boundaries

An optional target is exactly one `@` identifier; the payload, when present, starts at the next token. If a target is present and the next token is `.`, the exit is rejected as ambiguous: `continue @scan.value` could be a target plus `.value` or an untagged payload `@scan.value`. Whitespace and comments never choose. Write `continue @scan (.value)` for the target plus the current loop's `.value`, or `continue (@scan.value)` for an untagged payload. A context-reference payload is written explicitly after the target, as in `return @outer @inner.value`; because the payload starts with `@`, the reading is unambiguous. An untagged `continue .value` remains valid.

## Plain return

`return value` exits the nearest function or closure. `return;` returns `Unit`. Early returns are encouraged for guard cases. Ordinary blocks do not create an implicit plain-return boundary. [Early-exit narrowing](type-tests-and-narrowing.md#narrowing-after-early-exits-selected) retains supported type facts about stable existing bindings on all paths reaching a continuation. An exiting path contributes no normal continuation there; determine this from its actual target and completion behavior, not the exit keyword alone. This changes no binding scope or cleanup obligation. The selected built-in Int distinctness fact follows the same reaching-path rule: after if i == j { return; }, stable i and j may justify separate var element grants into the same initialized writable fixed array. An equal-index branch that continues cannot establish that fact; ordinary bounds checks and proof stability remain. See [element distinctness after an early exit](call-replacement-flow.md#element-distinctness-after-an-early-exit-selected).

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

The targeted return exits `@pricing`, not the enclosing function. Its payload supplies the target's pre-then value type `T`. For a loop, this commits the payload to `.value`; for a conditional, it supplies the conditional's tagged `.value`. If the target has an attached `then`, that target's `then` runs once and produces final type `R`. If the target has no `then`, `T` is the target's result type. A missing payload means `Unit` and is valid only when the target accepts `Unit` as its pre-then value.

Targets must be lexically enclosing. Control-flow transfers cannot jump across function or closure boundaries. Operation support is sparse:

- Loops accept `break`, `continue`, and tagged `return`.
- Tagged `if` and general result blocks accept `return`.
- Functions and closures accept plain `return`; tagged `return` does not currently target them. Whether a nested function or lambda can return to an enclosing function, and whether function declarations should carry tags for visibility or future metadata, are deferred to the nested-function review.
- `break` and `continue` cannot target an `if`, general block, or function. Unsupported operation–target pairs are invalid.

For a tagged `return`, the target's kind determines how its supplied `T` completes: a loop or conditional with `then` runs it once to produce `R`; a target without `then` returns `T` directly.

## Loop distinction

- `continue`: move to the next iteration without a contribution.
- `continue value`: contribute a value of iteration type `T`, then advance.
- `break`: stop iteration without contributing, preserving previous state and following loop completion processing.
- `break value`: commit a body value of type T, stop the nearest loop, and run then if present. No tag is required.
- `break @loop [value]`: the same stop-and-complete operation, targeting the explicitly named enclosing loop. Adding a tag to a loop does not require changing an untagged `break`; it still targets the nearest loop.
- `return @loop value`: commit a body value `T` to the named loop, stop it, and run that loop's `then` if present. Any inner constructs exited on the way skip their own `then` blocks.

```text
found: Option<User> = @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
}
```

On a match, the tagged exit supplies `Some(user)` as the loop's `T`; since this loop has no `then`, that is also its result. On a non-match, the conditional has no final `else`, so it returns its zero `Option<User>` (`.None`), which the loop commits as its body value. Exhaustion therefore yields `.None` without a `None` body or explicit `continue`. The explicit destination types both the loop result and the conditional fallback. `return @search;` supplies `Unit` and is valid only if the loop's `T` accepts `Unit`.

## Tagged return and completion

The tagged return reaches the named target's completion phase. Its payload has type T and becomes the target's pre-then value. If the target has an attached then, that target's then runs once to produce R. If the target has no then, T is the target's result. For a loop, the payload commits to .value; for a conditional, it becomes the conditional's tagged .value.

Constructs exited between the return site and its named target do not run their own then blocks. Only the named target receives the payload and runs its completion hook. Returning to an outer block likewise skips any inner loop or conditional then; an ordinary block with no then simply receives its final value. Applicable `finally` cleanup still runs as each exited scope is left. When a construct has both hooks on normal completion, `then` runs before `finally`; cleanup itself does not recover failures. Exact attachment scope remains open. If any failure is already pending, it remains primary and cleanup failures are retained as secondary; otherwise the first cleanup failure becomes primary and cancels normal completion. Aggregate representation and inspection remain open; see [failure aggregation](finally.md#failure-aggregation-and-open-design).

### The target's then runs

When T and R differ, the payload still satisfies T and the target's then performs the transformation:

```text
outcome: Int = @choose if use_choice {
    if early_exit {
        return @choose "early"
    }
    "normal"
} then {
    record_choice(@choose.value);
    @choose.value.length
}
```

Here the conditional's T is String and R is Int. The tagged return supplies "early" as T, then record_choice runs and the then produces its length.

### Returning through nested constructs to an outer target

```text
summary: String = @outer loop users as user {
    loop user.phones as phone {
        if should_stop(phone) {
            return @outer 1
        }
        0
    } then {
        log_phone_count(.count);
        .value
    }

    @outer.value + 1
} then {
    summarize(@outer.value)
}
```

The outer loop's body value T is Int, and its then produces String. If should_stop is true, return @outer 1 exits the nested if and inner loop. The inner loop's then is skipped; the target outer loop's then runs with @outer.value equal to 1. If the return instead targeted an inner construct, that construct's own then would run.

`then` remains result processing, not cleanup. A return to an outer function, propagated error, or unhandled panic does not supply T to an inner construct's `then`; applicable `finally` cleanup still runs as exited scopes are left. Error/panic handling and cleanup remain separate from this selected targeted-return rule.

### Locally recovered failure versus propagation

An operation-level handler inside a conditional branch can turn a returned error or matching typed panic into a fallback value. If the handler and the rest of the branch complete with `T`, the conditional has its ordinary branch result and its selected `then` processes that result. For example, a failed `read_text()` recovered locally to `""` still gives a string result for a following normalization `then`.

Postfix `!` forwards a returned error from the nearest function or closure; it is not a conditional fallback. That path does not provide a branch value or the missing-`else` zero for the conditional to transform. An unhandled panic also propagates on its separate channel and supplies no conditional `T`. Neither path runs the conditional's result-processing `then`; during panic propagation, applicable `finally` blocks in exited scopes run before an outer matching handler. A recovery tail attached outside the complete conditional is superseded; body-wide recovery sections remain deferred.

## Explicit loop targets

`continue @loop [value]` explicitly advances a named enclosing loop. With a payload, it commits a value of type `T` to that loop before advancing; without one, it preserves the loop's current `.value`. Any inner constructs exited to reach the target skip their own `then`; the target loop advances, so its `then` does not run. A target that is an `if` or ordinary block cannot continue. `break @loop [value]` explicitly stops a named enclosing loop; an untagged `break` keeps targeting the nearest loop whether or not it has a tag.

Break value commits its operand to .value, stops the nearest loop, and enters normal completion. Its operand has the body value type T, just like continue value; then may transform T into final result type R. Without then, the committed .value is the final result. Bare break performs the same stop/completion without replacing .value.

The earlier documentation incorrectly made break value bypass then; that behavior is removed. A tagged return runs the named target's then, while constructs exited on the way skip their own then. For a loop target, tagged `break` and tagged `return` both stop that loop and enter its completion; `break` is loop-specific, while `return` can target other supported constructs too.

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

When an applicable `finally` runs and completes normally, it preserves the pending normal result, control-flow exit, propagated recoverable error, or typed panic; it has no receiver for that outcome and does not transform it. If a typed panic matches a handler in the same scope that owns `finally`, recovery runs first and that scope's `finally` runs once as it exits. During language-managed panic propagation, exited inner scopes run their applicable `finally` blocks before an outer matching handler. Which scopes attach `finally` and hard-abort behavior remain open. Cleanup failure follows the primary/secondary rule in [finally](finally.md#pending-outcomes); the aggregate's type and handling behavior remain open.

Postfix `outcome!` supplies one Result layer's success payload or returns its recoverable error from the nearest function or closure. The escaping error must fit that function's declared error contract; it cannot cross a closure boundary to return directly from an outer function. This is structured error forwarding, not dynamic handler lookup or a panic assertion. See [Result and errors](result-and-errors.md) and [propagation and call chaining](propagation-and-chaining.md).

The [finally example](finally.md) records selected inner-to-outer cleanup during language-managed typed-panic propagation. The transfer implementation and hard-abort behavior remain open. Cleanup-failure precedence is selected, with aggregate representation and inspection still open. These rules do not require cleanup after a hard process abort.

## Notes

Exit payloads are checked against their target. An expression that exits does not need to supply a normal local value to surrounding expressions it never completes. An internal bottom/`Never` type can express that fact.

## Related concepts and references

- [Tags and contexts](tags-and-contexts.md)
- [Loop completion](loop-completion.md)
- [Functions](functions.md)
- [Rust loop exits](https://doc.rust-lang.org/reference/expressions/loop-expr.html) provide a comparison; LiteScript's generalized `return @tag` and accumulator-preserving bare `break` are separate design choices.
