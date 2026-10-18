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
- A complete block construct ends its item without requiring `;`; a trailing semicolon is optional and allowed.
- A trailing separator after an ordinary item, before `}` or end of file, is optional.
- Repeated separators are ignored rather than becoming value-producing empty statements, including after a complete block construct.
- There is no automatic semicolon insertion.
- A semicolon does not suppress the preceding expression's result.
- A trailing comma before the closing delimiter of a comma-separated list is optional and allowed. A trailing semicolon before a block close, end of file, or after a complete block item is likewise optional and allowed.
- An attached `else`, `then`, or `finally` belongs to the same construct; it is not separated from that construct by `;`.

Only the trailing separator is optional: commas between list elements and semicolons between ordinary adjacent items still separate them. Line breaks do not supply missing separators. This rule does not interchange comma and semicolon contexts or settle the separate singleton-tuple/grouping grammar.

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

The complete conditional ends at its final branch with an optional trailing semicolon. Do not insert a separator between a branch and its attached else clause: trailing means after the complete construct. Attached then/finally clauses follow the same ownership rule.

```text
if ready { run() } else { wait() } finish();
```

This has the same structure as the multiline example. The block boundary, not a newline, separates the conditional from `finish()`.

The rule also covers standalone or tagged blocks, match expressions, loop constructs, and function/type definitions. A declaration, assignment, or exit whose outer expression ends directly in an unparenthesized block construct ends at that construct as well:

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

Newline-terminated comments were not retained as the strict whitespace-independent default. Outside comments and strings, `//` is the integer-division operator and `//=` is its compound-update token. Recognize the longest valid slash operator token. Documentation-comment markers remain open.

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

## Numeric literals

Fractional literals require a leading digit: `0.5` is valid spelling and `.5` is rejected. Leading-dot forms such as `.count` retain their context-access role. See [numbers and ranges](numbers.md).

## Open lexical decisions

The complete Unicode identifier profile, reserved words, remaining numeric-literal rules, escape sequences, and full longest-token rules are not specified. Prefix `@name` and leading-dot context access must be distinguished from ordinary identifiers and member access without using whitespace as a semantic signal.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Comments](comments.md)
- [Identifiers](identifiers.md)
- [Strings](strings.md)
- [Grammar sketch](grammar-sketch.md)
- External languages are comparisons, not normative lexer definitions; see [references](references.md).
