# Receiver clauses

Status: **optional hook receivers requested; typed/pattern-dispatch chains exploratory**.

## Purpose

Give completion blocks explicitly named input and make value transformation visible, while reusing ordinary conditionals and patterns.

## Templates

```text
then { action() }
then(value) { transformed_value }
then(_) { replacement_value }
```

Related receiver forms for `else` and `finally` were requested as well. Their inputs differ by phase and cannot be assumed to be ordinary iteration values.

## Action versus result

The proposed hook rule is:

- No receiver: action behavior; require `Unit` or explicit discard and preserve the incoming construct result where one exists.
- Receiver: the block may produce a replacement result.
- `_`: explicitly ignore the input while opting into a result-producing block.

This convention does not change ordinary block-tail semantics. A function body does not need a receiver to return its final expression.

## Option handling without new dispatch syntax

```text
then(result) {
    if let Some(last) = result {
        process(last)
    } else {
        fallback()
    }
}
```

This is the preferred current exploration for optional loop accumulators. Presence/absence of one `T` is naturally an `Option<T>`, not an untyped mixture of unrelated runtime values.

## Typed clause proposal

The discussion also considered:

```text
expression
then(value: Int) { process_integer(value) }
then(value: String) { process_string(value) }
then { action_fallback() }
```

This is not accepted grammar. If adopted, it would require decisions about:

- One selected matching arm versus a pipeline of transformations.
- Static union types and generic specialization, rather than implicit dynamic typing.
- Ordering, overlap, unreachable clauses, and exhaustiveness.
- How an action-only fallback preserves a value while other arms transform result types.
- Whether ordinary patterns such as `Some(value)` use the same mechanism.

## Phase-specific inputs

A loop `then` can receive `Option<T>` accumulator state. An empty `else` cannot receive a nonexistent `T`. A `finally` handling early returns and errors needs completion information, not just optional successful data. Defining those input types is required before making typed receiver clauses a general feature.

## Related concepts and references

- [Option](option.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Loop completion](loop-completion.md)
- These hook and dispatch forms are design proposals. Existing language references in [references](references.md) do not establish their semantics.
