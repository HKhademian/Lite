# Comments

Status: **nested and raw comment forms accepted; ordinary/raw comment neutrality in code parsing confirmed 2026-10-25; comment-aware formatting and documentation-comment syntax open**.

## Purpose

Allow comments independently of line layout, with nesting for source code and a raw form for text containing unmatched comment delimiters.

## Templates

```text
/* ordinary comment */
/*# raw comment #*/
/*## raw comment with a longer fence ##*/
```

## Nested comments

Ordinary `/* ... */` comments nest. Every nested opener must have a corresponding closer before executable code resumes.

```text
/* Temporarily disabled:
    /* This comment already existed. */
    calculate();
*/
run();
```

Comment contents are not parsed as code. Unmatched parentheses, braces, quotes, and invalid source text are allowed. Only comment delimiters affect nesting; a quote does not protect `/*` or `*/` inside an ordinary comment.

## Raw comments

A raw comment starts with `/*` followed by one or more `#` characters. Its closing fence has the same number of `#` characters followed by `*/`. Raw comments do not nest and do not interpret quotes or ordinary comment delimiters.

```text
/*# Notes with unmatched delimiters:
    /* never closed
    */ stray ordinary closer
    "unfinished string and unmatched ( {
#*/
```

If the text contains the closing fence, choose a longer one:

```text
/*## The text may now contain #*/ without ending the comment. ##*/
```

The opening fence takes the entire consecutive run of `#` characters. A closing fence must contain exactly that many consecutive `#` characters before `*/`; a suffix of a longer run does not count as a match. Only the matching closing fence ends raw mode.

## Lexer interaction

- A raw opener is recognized before treating its `/*` prefix as an ordinary nested opener.
- A raw comment can occur inside an ordinary comment. Its contents do not change the surrounding nesting depth; after its closing fence, ordinary comment scanning resumes.
- Inside a raw comment, no opener starts another comment.
- Comments separate tokens as whitespace does. `first/* note */second` does not become the identifier `firstsecond`.
- Comments do not insert item separators. `first() /* note */ second()` still needs `;` between the calls.
- Newlines have no terminating effect. There is no newline-terminated `//` comment form; outside comments and strings, `//` and `//=` are integer-division operators. See [division](division.md).

## Neutrality in code and parsing

Confirmed 2026-10-25: well-formed ordinary and raw comments at admitted lexical boundaries are neutral trivia. Their contents are not code and do not supply expressions, operators, patterns, bindings, values, or item/list separators. After lexical scanning, the parser sees the remaining real tokens with the normal token boundaries. This is equivalent to appropriate separating whitespace, not concatenating tokens on either side of a removed comment. Existing token-attachment rules and missing-comment-delimiter errors remain in force.

For example, in Ali's initializer:

```text
ready :=
    /* and authenticated */
    and connected
;
```

Only connected is an operand. The active leading and is still valid for that singleton Bool expression. Deleting the comment, or restoring the earlier real condition, requires no repair of the first remaining line's punctuation. Commenting out the final real operand would still leave an invalid empty initializer. See [Ali's editing sequence](leading-separators.md#ali-removes-the-first-condition).

## Comments and formatting

Parser neutrality does not require a formatter to discard comment text, placement, or attachment. The formatter must preserve comments under its existing meaning-preservation requirement; how own-line comments constrain layout remains open. The comment's apparent code content is not parsed to infer a phantom operand or a hidden formatting command. Documentation-comment attachment and any explicit formatter-directive syntax require separate decisions. The [formatter investigation](comment-formatting-research.md) distinguishes verified behavior in other tools from possible LiteScript policies.

## Missing delimiters

An unterminated ordinary comment or raw fence is a compile-time error. The compiler reports the unmatched opener; it must not guess where executable code resumes.

## Open decisions

Documentation-comment markers and their tooling contract remain open. Neither ordinary nor raw comments imply a documentation attachment rule.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Strings](strings.md): comment-looking text inside a string remains string data.
- [Grammar sketch](grammar-sketch.md)
- These comment forms are LiteScript design choices recorded in the [decision ledger](decisions-and-open-questions.md).
