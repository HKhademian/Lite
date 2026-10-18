# Match keyword placement

Status: **comparison reviewed 2026-10-18; recommend retaining the current prefix form; subject-first syntax is an alternative under review, not a selected alias**.

## Two forms

Current LiteScript form:

```text
label := match person {
    : User { person.display_name() }
    : Guest { person.display_name() }
}
```

Alternative under review:

```text
label := person match {
    : User { person.display_name() }
    : Guest { person.display_name() }
}
```

Both can describe the same operation: evaluate one subject once, select the first successful arm, and use that arm's result. Keyword order does not inherently change the pattern vocabulary, typing, ownership, or generated runtime work.

## Why retain match before the subject

- It matches the existing keyword-first structure of if and loop. A reader sees the selection construct before reading its subject.
- It makes a control-flow operation visible at the beginning of a standalone item or immediately after an initializer's :=.
- Calls and member chains already fit directly in the subject, such as `match load_person(id)! { ... }`; moving match after that source is not required to support a computed input.
- It keeps the current surface and avoids adding a second spelling for the same selection operation.

These are consistency and readability judgments. No beginner study establishes that this ordering is universally easier.

## Why put the subject first

- It reads as taking a value and applying matching to it, which can fit a source-to-transformation reading style.
- A long producer chain appears before the selection operation, preserving the visual order in which the data is obtained and then inspected.
- The match keyword explicitly ends the subject expression before its arm table begins.

This is a coherent language design, not an intrinsically ambiguous or invalid one. It becomes particularly attractive if the language deliberately supports a broader family of subject-first transformations and relaxed chaining of block results. LiteScript has not selected that overall direction.

## Parsing and block boundaries

Both forms need complete expression and arm-boundary grammar. Prefix match is not free from brace issues: a future record literal, trailing closure, or block subject can need grouping or restrictions. Rust's prefix-match grammar, for example, excludes an unparenthesized struct expression as its subject.

Subject-first matching needs an explicit binding-power rule for expressions such as:

```text
left + right match { ... }
```

A grammar can choose the whole sum as the subject; it must not leave the choice between that and `left + (right match { ... })` to whitespace or indentation. A matching operator with low precedence is a plausible rule, not a selected production.

It also interacts with LiteScript's established block-item boundary. A completed unparenthesized block construct ends its item; a following operator or suffix cannot continue that value. Subject-first matching of a block result would therefore need grouping, or an explicit revision of that rule. Do not silently grant a new exception just because Scala supports chained matches.

Moving match after its input also does not by itself remove grouping around the output. Continuing a complete match result with member access still needs the current grouped form:

```text
label := (match person {
    : User { person.display_name() }
    : Guest { person.display_name() }
}).trim();
```

The alternative ordering would face the same output boundary unless that separate rule changed.

## Reference comparison

Rust and V place match before the subject; Kotlin's when also precedes its subject. Their differences in patterns and arm punctuation are separate from keyword placement. [Rust match grammar](https://doc.rust-lang.org/reference/expressions/match-expr.html), [V match](https://docs.vlang.io/statements-%26-expressions.html#match), [Kotlin when](https://kotlinlang.org/docs/control-flow.html#when-expressions-and-statements).

Scala demonstrates the valid subject-first alternative with `value match { ... }`. Scala 3 also documents chained matches and a dot form for matching after method chains. Those conveniences come with Scala's own grammar; they do not automatically transfer to LiteScript's stricter block-result continuation rule. [Scala match expressions](https://docs.scala-lang.org/scala3/book/control-structures.html#match-expressions).

## Recommendation

Retain `match value { ... }` as the sole current form. It fits LiteScript's existing control-flow shape and strict block boundaries. Reconsider subject-first syntax only as an explicit language-wide expression/chaining choice, rather than adding an interchangeable match alias.

The alternative remains documented for review. No parser, benchmark, or beginner-usability result follows from this recommendation.

Related: [match](match.md), [grammar sketch](grammar-sketch.md), [lexical block boundaries](lexical-structure.md), and [blocks and results](blocks-and-results.md).
