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

- `;` separates ordinary items in blocks and modules.
- A complete block construct ends its item without `;`; a following semicolon is rejected.
- A trailing separator after an ordinary item, before `}` or end of file, is optional.
- Repeated separators are ignored where separators are allowed, rather than becoming value-producing empty statements. This does not permit a separator after a complete block construct.
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
}

finish();
```

The complete conditional ends at its final branch without a separator. Writing a semicolon after that branch, or between the branches, is rejected. Attached `then` and `finally` clauses follow the same ownership rule.

```text
if ready { run() } else { wait() } finish();
```

This has the same structure as the multiline example. The block boundary, not a newline, separates the conditional from `finish()`.

The rule also covers standalone or tagged blocks, loop constructs, and function/type definitions. A declaration, assignment, or exit whose outer expression ends directly in an unparenthesized block construct ends at that construct as well:

```text
answer := { calculate() }
double := fn(x: Int): Int { x * 2 }
print(double(answer));
```

It does not apply merely because a token happens to be `}`. Braces delimiting an import list are not a block. A block nested inside a call, grouping, or other enclosing expression does not end the outer item.

## Continuing a block value

Parenthesize a complete block construct before continuing its value with an operator, call, member access, or indexing:

```text
answer := ({ calculate() }) + 1;
doubled := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
first := ({ make_items() })[0];
```

The grouping makes these ordinary expression items, so they use ordinary separators. An operator or call suffix never attaches across an unparenthesized block-item boundary. Tokens after that boundary belong to the next item and must form a valid item on their own, irrespective of line layout.

See [blocks and results](blocks-and-results.md) for how these boundaries interact with tail results.

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

## Identifiers

Unicode identifiers are supported. The working profile uses `XID_Start` or `_` initially, followed by `XID_Continue` characters, with case-sensitive lookup. The exact profile, normalization policy, and Unicode version remain open; see [identifiers](identifiers.md).

## Open lexical decisions

The complete Unicode identifier profile, reserved words, numeric literals, escape sequences, and full longest-token rules are not specified. Prefix `@name` and leading-dot context access must be distinguished from ordinary identifiers and member access without using whitespace as a semantic signal.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Comments](comments.md)
- [Identifiers](identifiers.md)
- [Strings](strings.md)
- [Grammar sketch](grammar-sketch.md)
- External languages are comparisons, not normative lexer definitions; see [references](references.md).
