# Tags and contexts

Status: **prefix position, explicit access, shadowing, and no-fallback current context established**.

## Purpose

Explicitly name a construct for metadata access and targeted exits, without injecting implicit ordinary variables or a global `loop` object.

## Templates

```text
@name loop source { body }
@name if condition { body } else { body }
value := @name { body }
```

Prefix tags replace the earlier suffix-header and `label: construct` sketches. A tag names the existing construct; it does not add a wrapper block or change its kind.

## Named metadata

```text
@users loop users as user {
    greet(user);
    print(@users.count)
}
```

A loop conceptually exposes item, count, and accumulator. Its field values correspond to receiver slots; leaving a receiver unnamed does not remove that field. Metadata is read-only. Source-level item aliases still follow whatever move/borrow rules are selected later.

## Current context

```text
@attempts loop .count < 10 {
    work()
}
```

is intended to agree with:

```text
@attempts loop @attempts.count < 10 {
    work()
}
```

`.field` refers to the current construct's context. It never searches outward for a context that happens to have that field.

Leading-dot enum cases are a selected [type-directed form](enums-and-variants.md#inferred-case-names). The disambiguation policy must define how an expected enum case and a current-context field are distinguished; selecting case shorthand does not silently replace the established metadata rule. Explicit `@name.field` remains the way to select named metadata.

```text
@users loop users as user {
    if eligible(user) {
        print(@users.count)
    }
}
```

Inside the conditional, `.count` is rejected; the current context is an `if`. The explicit `@users.count` reaches the loop. Body braces do not introduce a second wrapper context around their owning construct.

## Different construct interfaces

Loop tags can expose `.item`, `.count`, and `.acc`, and identify loop exits or continuation targets. Conditional tags can expose evaluated-condition or branch metadata and identify an exit target, but do not expose loop counters or allow continuation.

For a simple conditional, `.condition` denotes the already evaluated condition. It does not reevaluate a function call. Multi-branch condition metadata is still open.

## Scope and shadowing

- Tags are explicitly declared and lexically scoped.
- Nested tags may shadow outer tags, like ordinary lexical names.
- `@name` resolves to the nearest declaration.
- A header's tag covers the entire construct, including its source/condition.
- Leaving an inner scope reveals an outer tag again.
- Use distinct tags when both contexts must remain addressable.

The earlier prohibition on active tag shadowing is superseded.

## Availability and implementation

Count and accumulator state must exist before the first condition check. A current item is not available before successful advance. Result metadata cannot expose a result still being computed.

Additional fields require documented source capabilities and phase availability. An arbitrary iterator cannot promise reverse traversal, an exact remaining length, or last-item detection without additional work.

The intended tag interface is checked statically and can lower to ordinary local state. It does not require dynamic reflection or an allocated tag object. Storing tags, passing them as ordinary values, and escaping a context are not accepted features; ordinary metadata values may be copied or captured subject to ownership rules that remain open.

## Related concepts and references

- [Control-flow exits](control-flow.md)
- [Loop receivers](loop-receivers.md)
- [Conditionals](conditionals.md)
- The tag and leading-dot interface is an original design direction. [Rust labeled expressions](https://doc.rust-lang.org/reference/expressions/loop-expr.html) are a comparison for lexical exit targets, not this metadata mechanism.
