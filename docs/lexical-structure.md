# Lexical structure

Status: **established direction; complete lexer grammar remains open**.

## Purpose

Make program structure independent of visual layout. Explicit tokens determine grouping and separation.

## Template

```text
{ item; item; final_item }
```

Whitespace can separate tokens. It does not insert separators or choose block boundaries. This does not mean that `else if` and `elseif` must be the same token, or that whitespace inside a string is discarded.

## Separators

- `;` separates consecutive items in blocks and modules.
- A trailing separator before `}` or end of file is optional.
- Repeated separators are ignored rather than becoming value-producing empty statements.
- There is no automatic semicolon insertion.
- A semicolon does not suppress the preceding expression's result.
- An attached `else`, `then`, or `finally` belongs to the same construct; it is not separated from that construct by `;`.

## Equivalent examples

```text
{ prepare(); act(); finish() }
```

```text
{
    prepare();
    act();
    finish()
}
```

```text
{ prepare();;;; act(); finish();;;;; }
```

All three have the same item sequence and final result.

## Compound items

```text
if ready {
    run()
} else {
    wait()
};

finish();
```

The separator follows the complete conditional. A separator before `else` would end the conditional instead of attaching the branch.

## Comments

Comments are explicitly delimited:

```text
/* An ordinary comment /* may nest */ here. */
/*# Raw text may contain unmatched /* and */ delimiters. #*/
/*## Use a longer fence when the text contains #*/. ##*/
```

Ordinary comments nest; raw comments end only at the matching fence and do not nest. Neither form parses its contents as source code. Comments separate tokens but do not insert item separators. Missing closing delimiters are errors, without guessing where code resumes. See [comments](comments.md) for fence matching and interactions between the forms.

Newline-terminated comments such as `//` were not retained as the strict whitespace-independent default. Documentation-comment markers remain open.

## Return boundaries

```text
return;
return value;
return @target;
return @target value;
```

A newline after `return` does not decide whether an operand follows.

## Open lexical decisions

Identifier Unicode rules, reserved words, numeric literals, escape sequences, and the full longest-token rules are not specified. Prefix `@name` and leading-dot context access must be distinguished from ordinary identifiers and member access without using whitespace as a semantic signal.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Comments](comments.md)
- [Strings](strings.md)
- [Grammar sketch](grammar-sketch.md)
- External languages are comparisons, not normative lexer definitions; see [references](references.md).
