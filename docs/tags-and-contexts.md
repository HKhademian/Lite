# Tags and contexts

Status: **prefix position, explicit access, shadowing, no-fallback loop context, and explicit-tag conditional result access restricted to its attached `then` selected 2026-10-20; conditional condition metadata is not exposed**.

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

A loop exposes item, zero-based traversal index, entered-iteration count, and last committed value. There are no positional receiver slots; one optional item name denotes the same current element as .item. Metadata is read-only. Source-level item aliases still follow whatever move/borrow rules are selected later.

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

For loops, `.field` refers to the current loop context and never searches outward for another context with that field. Conditional contexts do not participate in leading-dot lookup, whether tagged or untagged; read a conditional result only as `@tag.value` in its attached `then`. Within a conditional nested in a loop, use the loop's explicit tag for loop metadata. Ambiguous leading-dot metadata access is rejected rather than resolved by shadowing or outward search.

Every loop has this context even without an explicit tag. Its attached then block uses the same owning loop context, so .count and .value work directly in both the loop body and then. A hidden context introduces no ordinary identifier and requires no allocated tag object. An explicit @name simply makes that context addressable from nested constructs; then does not require a separate receiver such as done.

Every `if` or `else if` chain also has one result context, whether tagged or untagged. Its result has type `T` and begins at zero before branch selection. If no branch matches and there is no final `else`, that zero is the conditional's normal result. An explicit `@name` names the context for targeted operations; it does not add a wrapper block.

The context exists for result construction even when it has no tag. Its read-only `.value` requires an explicit tag and is available only in its attached `then`, where it exposes the branch/zero result before the `then` result becomes final. It does not shadow an enclosing loop for leading-dot access. Inside a conditional nested in a loop, use an explicit loop tag for the outer context, and reject ambiguous leading-dot metadata reads rather than searching outward. A normally completing branch result flows out as the `if` expression's result when there is no `then`, so a final `if` in a loop body can supply the loop's next contribution. The [conditional and loop example](conditionals.md#interaction-with-loop-bodies) uses `@sum.value` explicitly for the outer accumulator.

Leading-dot enum cases are a selected [type-directed form](enums-and-variants.md#inferred-case-names). The disambiguation policy must define how an expected enum case and a current-context field are distinguished; selecting case shorthand does not silently replace the established metadata rule. Explicit `@name.field` remains the way to select named metadata.

```text
@users loop users as user {
    if eligible(user) {
        print(@users.count)
    }
}
```

The explicit `@users.count` addresses the loop from inside the conditional. Body braces do not introduce a second wrapper context around their owning construct. Conditional `.value` access requires its own explicit tag and is available only in the conditional's attached `then`.

## Different construct interfaces

Loop tags expose `.item`, `.index`, `.count`, and `.value`, and identify loop exits or continuation targets. Conditional tags identify the conditional context and can identify an exit target, but do not expose loop counters or allow continuation. A tagged conditional's read-only `.value` is available only inside its attached `then`; it is not available in conditions or branch bodies.

Conditional tags do not expose condition metadata. This applies to simple conditions and `else if` chains; `then` can read the selected result through `@tag.value` but cannot inspect or reevaluate the tests.

The conditional's branch/zero result has type `T`. An attached `then` receives that result and produces final type `R`; without `then`, the conditional returns `T`. Read-only `@tag.value` is available only within that conditional's `then`. A tagged return to the conditional supplies `T` and runs this `then`; a return to an outer target skips it. Propagated errors and unhandled panics supply no `T`, so they skip result processing. When attached, cleanup-only `finally` follows `then` on normal completion and runs during scope exit on abrupt paths; exact attachment scope and cleanup-failure behavior remain open.

## Scope and shadowing

- Tags are explicitly declared and lexically scoped.
- Nested tags may shadow outer tags, like ordinary lexical names.
- `@name` resolves to the nearest declaration.
- A header's tag covers the entire construct, including its source/condition.
- A loop tag remains in scope through its attached completion block, not just iteration. Its final count and typed value remain readable there; other fields require documented completion-phase availability. See [unified loop completion](unified-loop-completion.md#access-through-the-owning-loop-tag).
- Leaving an inner scope reveals an outer tag again.
- Use distinct tags when both contexts must remain addressable.

The earlier prohibition on active tag shadowing is superseded.

## Availability and implementation

Count and the typed zero-initialized loop value exist before the first condition check. A conditional's zero-initialized result likewise exists before its first condition is evaluated, but it is readable only in an attached `then` through explicit `@tag.value`. Conditional condition metadata is not exposed. Index is zero-based traversal position during an active entry, not an original source index/key; item/index can be read during an active iteration and as last-visited metadata in then. After zero entries, then exposes typed zero placeholders for item/index with count 0. Item/index are not available in source/condition evaluation before an entry. Loop count/value are also readable in conditions and then. Conditional `then` runs only when the conditional completes with a `T` result, including a tagged return to that conditional; outer-target returns, propagated errors, and unhandled panics skip it. Applicable `finally` cleanup runs as scopes exit; it does not recover failures.

At loop completion, the tag refers to the completed iteration state while the completion block computes the whole-loop result. Keeping the tag in scope does not by itself retain an item or iteration-local references, grant metadata writes, or allow a tag to escape its construct. Reading last-item metadata in then requires that used item to remain valid.

Last-visited .item/.index access in then uses [field-sensitive retention](loop-last-item.md): keep item state only when completion observes it. On empty input, then exposes zero placeholders for item/index and count is 0; there is no last item to retain. The optional source item name is not reintroduced in then.

Additional fields require documented source capabilities and phase availability. An arbitrary iterator cannot promise reverse traversal, an exact remaining length, or last-item detection without additional work.

The intended tag interface is checked statically and can lower to ordinary local state. It does not require dynamic reflection or an allocated tag object. Storing tags, passing them as ordinary values, and escaping a context are not accepted features; ordinary metadata values may be copied or captured subject to ownership rules that remain open.

## Related concepts and references

- [Control-flow exits](control-flow.md)
- [Loop receivers](loop-receivers.md)
- [Conditionals](conditionals.md)
- The tag and leading-dot interface is an original design direction. [Rust labeled expressions](https://doc.rust-lang.org/reference/expressions/loop-expr.html) are a comparison for lexical exit targets, not this metadata mechanism.
