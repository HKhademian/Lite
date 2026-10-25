# Receiver clauses

Status: **historical hook-receiver exploration; hook receivers are retired, while Result recovery receivers and typed `else` filters are selected and mixed-channel receiver typing remains open**.

**Loop update, 2026-10-19:** the loop-completion receiver examples and action/result distinction below are historical. Current loop completion uses then { ... } with .count/.value from the owning context, including untagged loops, and ordinary tail-expression results. Then(result), then(done), and then(_) are retired for loops. Result recovery receivers remain unchanged; body-wide cleanup remains deferred. See [current loop completion](loop-completion.md).

## Purpose

Give completion blocks explicitly named input and make value transformation visible, while reusing ordinary conditionals and patterns.

## Templates

```text
then { action() }
then(value) { transformed_value }
then(_) { replacement_value }
```

Receivers for `else` and `finally` were considered historically. The user selected cleanup-only `finally` with no pending-outcome receiver or transformation; recovery receivers remain separate from completion metadata.

Result recovery has selected forms `operation() else(error) { fallback }` and `operation() else { fallback }`. When a Result-only handler includes a receiver, it receives the operation's statically typed recoverable error. Omitting the receiver introduces no implicit error binding. Both forms produce values: success type `T` and normal fallback type `D` form `T | D`. An explicitly exiting recovery branch adds no local alternative. This differs from the loop completion hooks below: omitting a Result recovery receiver does not select action-only behavior. The later shared else direction also supports typed panic capture. Typed receiver filters are selected; the combined mixed-channel receiver type, origin representation, and general dispatch chains remain open. See [recovery receiver types](recovery-receiver-types.md) and [Result and errors](result-and-errors.md).

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

This was the earlier receiver-based exploration for optional loop accumulators. Current loops use typed zero-initialized `.value` without an automatic `Option` wrapper or completion receiver. General Option values still represent explicit presence/absence; loop completion reads the owning loop context directly.

## Historical typed hook proposal

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

Current loop `then` has no receiver: it reads the owning context's `.value`, `.count`, and phase-valid item and positional-index metadata. A zero-entry loop exposes a typed zero `.item` and, for positional sources, `.index`, distinguished by `.count == 0`; a nonpositional source has no `.index`. Cleanup-only `finally` likewise has no receiver; it does not receive or transform the pending outcome. Cleanup-failure precedence is selected; attachment syntax and aggregate handling remain open.

## Related concepts and references

- [Option](option.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Loop completion](loop-completion.md)
- The hook forms on this page are historical. Result recovery receivers and typed `else` filters are selected. Existing language references in [references](references.md) do not establish the retired hook semantics.
