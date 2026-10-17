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

Explicitly delimited comments were proposed:

```text
/* A comment ends at its delimiter. */
```

Newline-terminated comments such as `//` were not retained as the strict whitespace-independent default. Whether block comments nest, and how documentation comments are marked, remains open.

## Return boundaries

```text
return;
return value;
return @target;
return @target value;
```

A newline after `return` does not decide whether an operand follows.

## Open lexical decisions

Identifier Unicode rules, reserved words, numeric literals, escape sequences, comment nesting, and the full longest-token rules are not specified. Prefix `@name` and leading-dot context access must be distinguished from ordinary identifiers and member access without using whitespace as a semantic signal.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Strings](strings.md)
- [Grammar sketch](grammar-sketch.md)
- External languages are comparisons, not normative lexer definitions; see [references](references.md).
