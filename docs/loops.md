# Loops

Status: **one loop keyword and three source modes established; protocol and inference details open**.

## Template

```text
[@tag] loop [source] [receiver_clause] {
    body
} [completion_clauses]
```

Brackets above are optional grammar notation, not literal source characters. Current examples use `as` for receivers; `:` is another candidate. See [loop receivers](loop-receivers.md).

## Source modes

### Iterable

```text
loop users as user {
    greet(user)
}
```

Evaluate the iterable source once, obtain an iterator, and advance it for successive values.

### Boolean condition

```text
var remaining := 3;

loop remaining > 0 {
    remaining -= 1
}
```

The compiler recognizes a Boolean source expression and reevaluates it before each body entry. A function returning `Bool` is therefore called before each attempted iteration; a function producing an iterable is called once to obtain that iterable.

This evaluation policy is selected from static types. A union of Boolean and iterable sources does not yet have a specified loop meaning.

### Unconditional

```text
loop {
    work();
    if finished() {
        break
    }
}
```

An omitted source behaves like an always-true guard. Explicit inner control flow exits the loop.

## Superseded modes

`while`, a required `loop if` header, and trailing/post-tested loop conditions are not current syntax. Checks that should occur after work belong inside the body. In particular, do not implement `loop { body } if condition` as an accepted form from this documentation snapshot.

## State

Loop receiver patterns must match every value admitted by their slot's input contract. Put refutable selection in if/match inside the body; a receiver must not silently filter items or terminate iteration. Tuple destructuring remains valid when its shape is guaranteed. See [loop receivers](loop-receivers.md) and the [deferred alternatives](loop-pattern-alternatives.md).

Every loop conceptually carries an item, iteration count, and accumulator. Naming a subset is optional. Untagged loops introduce no implicit variable names.

The proposed counter starts at zero before the first condition check and increments on every body entry. Body counts begin at one. A skipped contribution still counts as an entered iteration. This is not an index into a collection.

Boolean and unconditional modes were proposed to use `Unit` for their item payload. This is a working choice, not a full loop-source protocol definition.

## Direction and step

Direction and stride belong in source values or adapters:

```text
loop 1..=10 as number { process(number) }
loop 10..=1 as number { process(number) }
loop (1..=10).step(2) as number { process(number) }
loop users.reverse() as user { greet(user) }
loop users.reverse().step(2) as user { greet(user) }
loop directory.keys() as key { process(key) }
loop directory.items() as (key, value) { process(key, value) }
```

The requested direction is a descending inclusive range such as `10..=1`. A positive stride magnitude follows the range's direction. Range syntax, `.step`, `.reverse`, `.keys`, and `.items` are working library/API proposals. Zero stride must have a defined rejection mechanism.

Reversing an arbitrary stream may require storage; do not silently promise reverse traversal without source capability or explicit buffering.

## Notes

The body follows the final-expression rule. A calculation followed by a final assignment or action does not secretly contribute the earlier calculation. See the accumulator document before interpreting a loop's result type.

## Related concepts and references

- [Receivers](loop-receivers.md), [Accumulator](loop-accumulator.md), [Completion](loop-completion.md), and [Tags](tags-and-contexts.md).
- [Rust loops](https://doc.rust-lang.org/reference/expressions/loop-expr.html), [Odin control flow](https://odin-lang.org/docs/overview/), and [V loops](https://docs.vlang.io/statements-&-expressions.html#for-loop) are comparisons. Their loop result rules are not the proposed LiteScript rules.
