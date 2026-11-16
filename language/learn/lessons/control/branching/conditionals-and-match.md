# Conditionals, Chained Comparisons & Subjectless Match

Combine value-returning conditionals, single-evaluation comparison chains, and ordered Boolean `match` blocks cleanly.

## Walkthrough

1. `inPassBand := 60 <= score < 90;` evaluates `score` once and short-circuits if the first comparison fails.
2. `status := if ... else if ... else ...;` produces a value directly; all value branches must agree in type.
3. `match { ... _ { ... } }` evaluates Boolean arms top-to-bottom and requires a trailing `_` fallback arm.
4. `match` also works cleanly in statement position when performing actions (`io.outputLine`).

> [!TIP]
> You can use optional leading `and` / `or` separators on multiline Boolean chains when formatting complex conditions.

## Try Modifying This

1. Change `score` to `95`, `84`, `72`, and `50` and re-run to trace both `if` and `match`.
2. Try removing the `_` arm from `match` to see the exhaustiveness error.

See [Handbook: Conditionals, Match & Loops](../../../handbook/control/conditionals-match-and-loops.md) and [Match](../../../../../docs/match.md).
