# Tuples and patterns

Status: **same-value binding/destructuring invariant established; complete pattern syntax open**.

## Purpose

Give names to an entire value or destructure that same value without making the binding pattern change what a producer supplies.

## Templates

```text
pair := (first, second);
(left, right) := pair;
```

## Same-value invariant

```text
loop pairs as pair {
    process(pair)
};
```

```text
loop pairs as (left, right) {
    process(left, right)
};
```

Both receive each source element. If the element is not a compatible tuple, the destructuring form is rejected. A simple name must not secretly receive an item while a tuple pattern receives unrelated loop metadata.

## Receiver lists are not tuples

Loop receivers currently have separate semantic positions: item, count, accumulator.

```text
loop pairs as (left, right), count {
    process(left, right, count)
};
```

The grouped pattern destructures the first slot. The ungrouped comma introduces the second receiver slot.

```text
as (a, b)  /* one tuple pattern for the item */
as a, b    /* item receiver followed by count receiver */
```

The receiver separator is still open; this distinction holds whether its final spelling is `as` or `:`.

## Refutable and irrefutable patterns

A declaration such as `(left, right) := pair` should use an irrefutable pattern for the known input type. Variant patterns such as `Some(value)` can fail and belong in a conditional or match construct unless a separate failure rule is introduced.

```text
if let Some(user) = find_user(id) {
    greet(user)
};
```

The bound user exists only in the successful branch.

## Wildcards

`_` explicitly ignores a value or receiver slot. It is not an implicit binding that can later be read.

## Notes and open decisions

Tuple type syntax, singleton tuples, tuple indexing, named fields, record patterns, nested patterns, guards, alternatives, and typed patterns need formal specification. Destructuring need not imply heap allocation, but its move/borrow behavior depends on the memory model.

## Related concepts and references

- [Loop receivers](loop-receivers.md)
- [Conditionals](conditionals.md)
- [Receiver clauses](receiver-clauses.md)
- [Rust tuple types](https://doc.rust-lang.org/reference/types/tuple.html) are a comparison for tuple values and `Unit`, not a complete LiteScript tuple contract.
