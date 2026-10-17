# Control-flow exits

Status: **targeted-return syntax established; some loop shorthand decisions remain open**.

## Templates

```text
return;
return value;
return @tag;
return @tag value;
break;
continue;
continue value;
continue @loop;
```

Semicolons separate items; a newline never decides whether an exit operand follows. Optional operand forms need a complete grammar, including any future labeled continuation contribution.

## Plain return

`return value` exits the nearest function or closure. `return;` returns `Unit`. Early returns are encouraged for guard cases. Ordinary blocks do not create an implicit plain-return boundary.

## Targeted return

```text
price := @pricing {
    if invalid {
        return @pricing 0
    };

    calculate_price()
};

use(price);
```

The targeted return exits `@pricing`, not the enclosing function. Its payload must satisfy the target construct's result type. A missing value means `Unit`, not an inferred accumulator or arbitrary fallback.

Targets must be lexically enclosing. Control-flow transfers cannot jump across function or closure boundaries. A target's kind controls which operations are permitted.

## Loop distinction

- `continue`: move to the next iteration without a contribution.
- `continue value`: contribute a value of iteration type `T`, then advance.
- `break`: stop iteration without contributing, preserving previous state and following loop completion processing.
- `return @loop value`: finish the loop directly with final result type `R`, bypassing ordinary `then`/`else` processing.

```text
found := @search loop users as user {
    if matches(user) {
        return @search Some(user)
    }
};
```

The intended exhaustion result is `None`. `return @search;` would instead explicitly supply `Unit` and conflict with an `Option<User>` result.

## Labeled continuation and break shorthand

`continue @loop` was retained for explicitly advancing an enclosing loop. A target that is an `if` or ordinary block cannot continue.

`break value` was previously proposed as an explicit final result for the nearest loop. After introducing general targeted returns, its retention needs confirmation. The named form `break @tag value` was recommended to be removed in favor of `return @tag value`; accepting both is not established current grammar.

## Cleanup

Structured exits run applicable `finally` blocks while unwinding. The intended order is from exited inner constructs toward the target. Detailed interactions with cleanup errors, receiving `finally` transformations, and control-flow attempts from inside cleanup remain open. Cleanup must not silently override a pending early return or propagated error.

## Notes

Exit payloads are checked against their target. An expression that exits does not need to supply a normal local value to surrounding expressions it never completes. An internal bottom/`Never` type can express that fact.

## Related concepts and references

- [Tags and contexts](tags-and-contexts.md)
- [Loop completion](loop-completion.md)
- [Functions](functions.md)
- [Rust loop exits](https://doc.rust-lang.org/reference/expressions/loop-expr.html) provide a comparison; LiteScript's generalized `return @tag` and accumulator-preserving bare `break` are separate design choices.
