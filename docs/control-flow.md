# Control-flow exits

Status: **targeted returns and bare/value loop exits selected; labeled contribution syntax remains open**.

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
- `return @loop value`: finish the loop directly with final result type `R`, bypassing ordinary then completion processing.

```text
found := @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
}
```

The intended exhaustion result is `None`. `return @search;` would instead explicitly supply `Unit` and conflict with an `Option<User>` result.

## Labeled continuation and break shorthand

`continue @loop` was retained for explicitly advancing an enclosing loop. A target that is an `if` or ordinary block cannot continue.

Break value commits its operand to .value, stops the nearest loop, and enters normal completion. Its operand has the body value type T, just like continue value; then may transform T into final result type R. Without then, the committed .value is the final result. Bare break performs the same stop/completion without replacing .value.

The earlier documentation incorrectly made break value bypass then. That behavior is removed. Return @tag value remains the direct tagged result exit that bypasses then. The named break @tag value and contribution-bearing continue @tag value forms remain unselected.

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
