# Loop receivers

Status: **optional positional slots and ordered receiver shadowing established; separator and seeded form open**.

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

Trailing slots may be omitted. `_` can name an otherwise unused intervening slot, but remains readable. Names are programmer-chosen. Naming the second slot `index` does not change its meaning from iteration count to collection index.

## Repeated receiver names

Receiver slots introduce bindings from left to right. A later receiver shadows an earlier one with the same name, including `_`:

```text
loop items as _ { inspect(_) }          /* item */
loop items as _, _ { inspect(_) }       /* count */
loop items as _, _, _ { inspect(_) }    /* previous accumulator */
```

The third form exposes `Option<T>` through `_`. The hidden item and count remain accessible through the construct's context fields; they have not been discarded or combined into a tuple. Distinct explicit receiver names are clearer when several slots are needed.

This is ordered lexical shadowing, not reassignment or a requirement that repeated receivers have equal values or types. Within the header and body, lookup selects the last receiver binding with that name. Existing phase restrictions still apply: an item receiver is unavailable before body entry, while count and accumulator state are initialized before the first condition.

This rule applies to receiver names generally, not only `_`. It does not settle duplicate bindings inside one tuple pattern or permit arbitrary duplicate declarations in a single ordinary block scope.

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

Refutable receiver patterns do not yet have a mismatch policy. The [pattern context review](pattern-contexts.md#4-loop-receiver-slots) recommends requiring irrefutable slot bindings initially; receiver syntax must not silently filter items, end iteration, or introduce an error. The same question applies to destructuring an optional accumulator. Use explicit if/match in the body until a different behavior is selected.

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
