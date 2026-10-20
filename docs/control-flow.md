# Control-flow exits

Status: **tagged returns run the named target's completion and skip exited inner completion; bare/value and explicitly targeted loop exits selected; failure transfer remains open**.

## Templates

```text
return;
return value;
return @tag;
return @tag value;
break;
break value;
break @loop;
break @loop value;
continue;
continue value;
continue @loop;
continue @loop value;
```

Semicolons separate ordinary items; a newline never decides whether an exit operand follows. An exit whose payload ends directly in an unparenthesized complete block construct ends at that construct, with an optional trailing semicolon.

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

The targeted return exits `@pricing`, not the enclosing function. Its payload supplies the target's pre-then value type `T`. For a loop, this commits the payload to `.value`; for a conditional, it supplies the conditional's tagged `.value`. If the target has an attached `then`, that target's `then` runs once and produces final type `R`. If the target has no `then`, `T` is the target's result type. A missing payload means `Unit` and is valid only when the target accepts `Unit` as its pre-then value.

Targets must be lexically enclosing. Control-flow transfers cannot jump across function or closure boundaries. Operation support is sparse:

- Loops accept `break`, `continue`, and tagged `return`.
- Tagged `if` and general result blocks accept `return`.
- Functions accept plain `return` to the nearest function, and tagged `return` when explicitly targeted.
- `break` and `continue` cannot target an `if`, general block, or function. Unsupported operation–target pairs are invalid.

For a tagged `return`, the target's kind determines how its supplied `T` completes: a target with `then` runs it once to produce `R`; a function target returns its function result to its caller.

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

Constructs exited between the return site and its named target do not run their own then blocks. Only the named target receives the payload and runs its completion hook. Returning to an outer block likewise skips any inner loop or conditional then; an ordinary block with no then simply receives its final value. This is distinct from finally, whose cleanup role and failure rules remain in the deferred lifecycle review.

### The target's then runs

When T and R differ, the payload still satisfies T and the target's then performs the transformation:

```text
outcome: Int = @choose if use_choice {
    if early_exit {
        return @choose "early"
    }
    "normal"
} then {
    record_choice(@choose.value)
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
        log_phone_count(.count)
        .value
    }

    @outer.value + 1
} then {
    summarize(@outer.value)
}
```

The outer loop's body value T is Int, and its then produces String. If should_stop is true, return @outer 1 exits the nested if and inner loop. The inner loop's then is skipped; the target outer loop's then runs with @outer.value equal to 1. If the return instead targeted an inner construct, that construct's own then would run.

then remains result processing, not an all-exit cleanup guarantee. A return to an outer function, propagated error, or unhandled panic does not supply T to an inner construct's then. Error/panic handling and cleanup remain separate from this selected targeted-return rule.

### Locally recovered failure versus propagation

An operation-level handler inside a conditional branch can turn a returned error or matching typed panic into a fallback value. If the handler and the rest of the branch complete with `T`, the conditional has its ordinary branch result and its selected `then` processes that result. For example, a failed `read_text()` recovered locally to `""` still gives a string result for a following normalization `then`.

Postfix `!` forwards a returned error from the nearest function or closure; it is not a conditional fallback. That path does not provide a branch value or the missing-`else` zero for the conditional to transform. An unhandled panic also propagates on its separate channel and supplies no conditional `T`. These cases distinguish `then` result processing from cleanup, but do not settle transfer and cleanup behavior: panic unwinding and `finally` execution on failure remain open. A recovery tail attached outside the complete conditional is superseded; body-wide recovery sections remain deferred.

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
