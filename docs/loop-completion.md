# Loop completion

Status: **intent established; clause ordering and full exit/type contracts open**.

## Purpose and template

Handle the final contribution, absence of contributions, and cleanup without wrapping loops in functions solely to obtain a result.

```text
loop source as item {
    body
} then(result) {
    completion_body
} else(_) {
    no_contribution_body
} finally {
    cleanup()
}
```

This template lists candidate clauses. It does not settle how `then` and a separate `else` compose; see the explicit open issue below.

## Current optional-accumulator direction

A receiving `then` gets the optional accumulated result and can handle both states itself:

```text
message := loop items as item {
    if not eligible(item) { continue }
    score(item)
} then(result) {
    if Some(last) := result {
        format_score(last)
    } else {
        "No eligible items"
    }
}
```

The processing occurs once, not once per iteration. It uses an already computed contribution rather than reevaluating the body expression.

Earlier rules in which `then` ran only after physically nonempty normal completion were revised during the discussion. The optional-state proposal lets it handle `None` as well.

## Empty versus no contribution

`else` evolved from "zero entered iterations" to "no contributing iterations." Those differ when all entries execute plain `continue`. The latest direction treats skipped entries as no contribution.

A separate `else` should be a convenience for handling the no-contribution state, not a second block that handles the same `None` a second time. Whether it takes priority over `then`, or is specified as syntax sugar for optional matching, is still open.

The exact receiver payload for a standalone `else` is not fixed. It cannot be a fabricated previous `T`; a unit/empty-completion marker was suggested.

## Exits

- Normal source exhaustion reaches completion processing.
- Bare `break` stops iteration without contributing; the latest proposal also routes the preserved state through completion processing.
- `continue` does not finish the construct.
- `return @loop value` supplies the final construct result directly, bypassing `then` and `else`.
- Unqualified `return` exits the nearest function or closure.
- Structured exits run applicable `finally` blocks.

`break value` was retained as a possible concise nearest-loop final result, distinct from bare `break`. Its final spelling/retention after general targeted returns should be explicitly confirmed.

## Receiving versus nonreceiving hooks

```text
then { print("Finished") }
then(last) { transform(last) }
then(_) { "Replacement" }
```

A receiver was proposed as the explicit opt-in to a value-producing hook. A nonreceiving hook performs an action and preserves incoming result state. A receiving hook may transform its input. This applies to attached hooks, not ordinary function or conditional bodies.

`_` in `then(_)`, `else(_)`, or `finally(_)` is an ordinary readable receiver binding whose nonuse is allowed. For example, `then(_) { process(_) }` may read the input. Receiver presence retains the proposed opt-in to a value-producing hook; its spelling does not change the phase-specific payload. Those payload contracts remain open where described above and below.

## Finally

`finally` is intended to run once on structured completion or exit, after a normal result or exit payload is determined. It must not silently suppress a pending early return or propagated error.

Receiving `finally` blocks that transform an ordinary result were requested. Their input must represent completion state rather than assume a successful value always exists. The exact descriptor type, allowed transformations, cleanup failure handling, and prohibitions on escaping control flow remain open.

This is not a promise to run cleanup after forced process termination or an implementation-level abort.

## Related concepts and references

- [Receiver clauses](receiver-clauses.md)
- [Loop accumulator](loop-accumulator.md)
- [Control-flow exits](control-flow.md)
- [Python loop completion](https://docs.python.org/3/tutorial/controlflow.html#break-and-continue-statements) is a useful contrast: its loop `else` is associated with completion without `break`, not specifically the absence of contributions proposed here.
