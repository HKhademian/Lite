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

Result recovery has selected forms `operation() else(error) { fallback }` and `operation() else { fallback }`. When a Result-only handler includes a receiver, it receives the operation's statically typed recoverable error. Omitting the receiver introduces no implicit error binding. Both forms produce values: success type `T` and normal fallback type `D` form `T | D`. An explicitly exiting recovery branch adds no local alternative. This differs from the loop completion hooks below: omitting a Result recovery receiver does not select action-only behavior. The later shared else direction also supports typed panic capture. Its combined receiver type and selective typed patterns remain proposals in [recovery receiver types](recovery-receiver-types.md); general dispatch chains remain separate. See [Result and errors](result-and-errors.md).

## Action versus result

The proposed hook rule is:

- No receiver: action behavior; require a `Unit` body result and preserve the incoming construct result where one exists.
- Receiver: the block may produce a replacement result.
- `_`: an ordinary readable receiver name with permission to be unused; like any present receiver, it permits the proposed result-producing behavior.

This convention does not change ordinary block-tail semantics. A function body does not need a receiver to return its final expression.

```text
then(value) { process(value) }
then(_) { "Replacement" }
```

Both forms are supplied the same input and bind it normally. The second names it `_` and leaves it unused, which is explicitly permitted; `then(_) { process(_) }` could instead read it. The hook proposal distinguishes receiver presence from omission. An action hook can explicitly finish with Unit or a declaration when an intermediate calculation produces a value; trailing semicolons do not discard a result.

## Option handling without new dispatch syntax

```text
then(result) {
    if .Some(last) := result {
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

The [pattern context review](pattern-contexts.md#7-completion-hook-receivers) recommends ordinary receivers bind irrefutably. A selective hook or Result error pattern needs an explicit unmatched-input policy; one pattern-bearing clause must not silently swallow an error or omit required cleanup. This recommendation does not select the explored typed dispatch chains.

A loop `then` can receive `Option<T>` accumulator state. An empty `else` cannot receive a nonexistent `T`. A `finally` handling early returns and errors needs completion information, not just optional successful data. Defining those input types is required before making typed receiver clauses a general feature.

## Related concepts and references

- [Option](option.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Loop completion](loop-completion.md)
- These hook and dispatch forms are design proposals. Existing language references in [references](references.md) do not establish their semantics.
