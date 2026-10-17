# Comments

Status: **nested and raw comment forms accepted; documentation-comment syntax open**.

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
- Newlines have no terminating effect. There is no default newline-terminated `//` comment form.

## Missing delimiters

An unterminated ordinary comment or raw fence is a compile-time error. The compiler reports the unmatched opener; it must not guess where executable code resumes.

## Open decisions

Documentation-comment markers and their tooling contract remain open. Neither ordinary nor raw comments imply a documentation attachment rule.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Strings](strings.md): comment-looking text inside a string remains string data.
- [Grammar sketch](grammar-sketch.md)
- These comment forms are LiteScript design choices recorded in the [decision ledger](decisions-and-open-questions.md).
