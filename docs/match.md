# Match and exhaustive selection

Status: **pattern-based explicit handling desired; surface grammar open**.

## Purpose

Select behavior based on variants and destructured data, especially for optional values and typed errors. Like `if`, a match should be usable for actions or values without a separate expression-only syntax.

## Semantic template

```text
match expression {
    pattern ARM_SEPARATOR { arm_body }
    pattern ARM_SEPARATOR { arm_body }
}
```

`ARM_SEPARATOR` is a placeholder, not a keyword. Early sketches used `case ... then` or `=>`; later syntax decisions require a fresh choice. Do not interpret this file as adding either arrow or a `then` separator to the grammar.

## Intended rules

- Evaluate the scrutinee once.
- Select an appropriate matching arm.
- Bind payload names only inside that arm.
- Require exhaustive coverage for value-producing closed variants.
- Let the selected arm's final expression provide the result.
- Check normally completing arms against a compatible result type.
- Treat early exits as exits to their explicit targets, not locally missing values.

## Already illustrated conditional subset

```text
if let Some(user) = find_user(id) {
    greet(user)
} else {
    print("Not found")
}
```

The same pattern concepts should be reused rather than introducing a second unrelated destructuring system for match arms.

## Notes and open questions

Arm delimiters, `case` spelling, any separate nonbinding wildcard syntax, guard syntax, ordering, overlap, binding ownership, union coverage, and non-exhaustive public variants remain open. `_` is a readable binding name, not the spelling of a nonbinding wildcard. A fully specified type system is needed before claiming coverage checks are sound.

## Related concepts and references

- [Tuples and patterns](tuples-and-patterns.md)
- [Option](option.md)
- [Result and errors](result-and-errors.md)
- [Receiver clauses](receiver-clauses.md)
- [Kotlin conditions and when](https://kotlinlang.org/docs/control-flow.html) and [Dart branches](https://dart.dev/language/branches) provide contrasting forms of pattern selection; neither surface syntax is selected here.
