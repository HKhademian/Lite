# Loop receivers

Status: **optional positional slots, ordered receiver shadowing, and irrefutable slot patterns established; separator and seeded form open**.

## Purpose

Allow ordinary examples to bind the item directly while advanced code can explicitly name iteration count and previous contribution. Avoid implicit `it`, `count`, or `acc` variables that might shadow ordinary names.

## Working template

```text
loop source as item_pattern [, count_pattern [, accumulator_pattern]] {
    body
}
```

The fixed slot order is **item, count, accumulator**. These are separate receiver bindings, not a tuple implicitly substituted for the source item.

## Examples

```text
loop users { record_visit() }
loop users as user { greet(user) }
loop users as user, count { greet(user, count) }
loop users as user, _, sumAge { sumAge.value_or(0) + user.age }
loop users as _, count { print(count) }
```

Trailing slots may be omitted. An explicit `_` binds that slot normally and allows it to be unused. Names are programmer-chosen. Naming the second slot `index` does not change its meaning from iteration count to collection index.

## Repeated receiver names

Receiver slots introduce bindings from left to right. A later receiver shadows an earlier one with the same name. `_` is an ordinary readable receiver name with unused-name permission:

```text
loop items as item { inspect(item) }       /* item */
loop items as _, count { inspect(count) }  /* count */
loop items as _, _, acc { inspect(acc) }   /* previous accumulator */
```

The third form exposes `Option<T>` through acc. Its two underscore receivers bind item and count, leaving the count visible as `_`. `as _, _, _` is valid and leaves the accumulator visible as `_`. Underlying state remains accessible through permitted context fields.

This is ordered lexical shadowing, not reassignment or a requirement that repeated receivers have equal values or types. Within the header and body, lookup selects the last receiver binding with that name. Existing phase restrictions still apply: an item receiver is unavailable before body entry, while count and accumulator state are initialized before the first condition.

For example, `as value, value, value` leaves value naming the accumulator slot, just as `as _, _, _` does for `_`. Within a slot, nested pattern bindings also shadow in recursive written order. This does not permit arbitrary duplicate declarations in an ordinary block. See [pattern binding and shadowing](pattern-shadowing.md).

## Destructuring within a slot

```text
loop pairs as pair {
    process(pair)
}

loop pairs as (left, right), count {
    process(left, right, count)
}
```

A name and a destructuring pattern operate on the same first-slot item. Parenthesized tuple patterns do not receive a different hidden value.

Each receiver pattern must be irrefutable for its slot's input contract. Reject a pattern that can fail; receiver syntax must not filter items, end iteration, panic, or introduce an error. This is selected for the item, count, and accumulator slots in iterable, Boolean, and unconditional modes. An optional accumulator must be inspected explicitly rather than assuming its Some case in a receiver.

```text
loop optional_users as candidate {
    if .Some(user) := candidate {
        greet(user)
    }
}
```

Here optional_users remains the source collection and candidate names one Option item. Selection belongs inside the body. Irrefutable tuple destructuring remains allowed. See the [pattern context rule](pattern-contexts.md#4-loop-receiver-slots) and [deferred alternatives](loop-pattern-alternatives.md) for filtering headers, adapters, termination, per-item alternatives, and failure-based designs.

## Conditional and unconditional modes

```text
loop count < 10 as _, count {
    print(count)
}

loop as _, count {
    work();
    if count >= 10 { break }
}
```

Count and accumulator bindings cover the entire loop header and body. Their initialization occurs before evaluating the first condition even though the names are written after it. The current item is not available until a successful advance enters the body.

## Separator status

Both of these were explored:

```text
loop users as user, count { body }
loop users: user, count { body }
```

`as` reads naturally for iterable items but less naturally for Boolean and unconditional loops. `:` was explicitly considered as a neutral separator, then later examples returned to `as` while designing metadata access. No final separator was explicitly frozen after that discussion. Examples here use `as` as working notation; it is not a commitment to accept both spellings.

Bare trailing parentheses were rejected as the simple replacement because they resemble a call to the source expression. Earlier accumulator-only parenthesized headers are not a settled current syntax either.

## Explicit context access

```text
@users loop users as user {
    greet(user);
    print(@users.count)
}
```

Leaving a slot unnamed does not remove its underlying state. Tags and leading-dot context access provide explicit access without predeclared variables.

## Related concepts and references

- [Tuples and patterns](tuples-and-patterns.md)
- [Tags and contexts](tags-and-contexts.md)
- [Loop accumulator](loop-accumulator.md)
- [Odin grammar](https://odin-lang.org/spec/grammar/) and [Zig grammar](https://ziglang.org/documentation/master/#Grammar) informed delimiter discussions. The receiver list itself is a LiteScript proposal.
