# Lexical structure

Status: **established direction; complete lexer grammar remains open**.

## Purpose

Make program structure independent of visual layout. Explicit tokens determine grouping and separation.

## Template

```text
{ item; item; final_item }
```

Whitespace can separate tokens. It does not insert separators or choose block boundaries. This does not mean that `else if` and `elseif` must be the same token, or that whitespace inside a string is discarded.

Fallible-type shorthand has a selected attachment rule: T! requires ! to touch the end of its type, while spaces around a following initializer = are optional. User!=load() in a type annotation separates User!, =, and load(); User !=load() cannot be reattached into that shorthand. Explicit T ! E remains the binary type form. This is a source-spelling/token-boundary constraint, not permission for whitespace to regroup already recognized expressions. If generic source syntax uses angle brackets, type-context recognition must preserve the selected > then attached ! then optional initializer = boundary. See [fallible-type shorthand attachment](fallible-types-and-error-composition.md#fallible-type-shorthand-attachment-selected).

## Separators

- `;` separates ordinary items in blocks and modules.
- A complete block construct ends its item without requiring `;`; a trailing semicolon is optional and allowed.
- A trailing separator after an ordinary item, before `}` or end of file, is optional.
- Repeated separators are ignored rather than becoming value-producing empty statements, including after a complete block construct.
- There is no automatic semicolon insertion.
- A semicolon does not suppress the preceding expression's result.
- A trailing comma before the closing delimiter of a comma-separated list is optional and allowed. A trailing semicolon before a block close, end of file, or after a complete block item is likewise optional and allowed.
- An attached `else`, `then`, or `finally` belongs to the same construct; it is not separated from that construct by `;`. When both `then` and `finally` are attached, `then` comes first and `finally` is cleanup after completion.

These trailing-separator rules do not make interior separators optional: commas between list elements and semicolons between ordinary adjacent items still separate them. Line breaks do not supply missing separators. This rule does not interchange comma and semicolon contexts. In the selected singleton value forms, the comma in (value,) establishes a tuple rather than grouping and is therefore required. Named singleton entries such as (= value) are already unambiguous and allow an optional trailing comma. See [singleton values](tuple-entries-and-access.md#singleton-values-selected).

## Optional leading chain separators selected

Selected 2026-10-24: a complete ordinary Boolean expression or condition may start with one optional `and` or `or`, including initializers, Boolean loop sources, subjectless match Boolean headers, if/else-if conditions, subject-based guards, and explicitly grouped expressions/conditions. Parentheses are not required around an already delimited initializer or loop source: ready := and a and b; and loop and a and b { body } use existing item/header boundaries. A complete initial match-arm or supported nested constructor-payload/tuple-component pattern-alternative list may start with one optional or and retains one shared continuation. A plain-union chain in type context may start with one optional |. Removing that first token preserves the valid expression/condition/type meaning, including ordinary precedence, evaluation, and binding flow. A prefixed value expression must type-check as Bool. Require at least one real operand, pattern, or member; stacked leaders, interior extra leaders, and trailing operators are invalid. Whitespace and line breaks have no structural role; a semicolon may occupy its own line without becoming a newline rule. This does not add unary operators or general punctuation repetition. Leading & remains conditional on future intersection-type selection; see [optional leading separators](leading-separators.md).

## Formatter presentation of chains

The selected [chain formatter policy](leading-separators.md#formatter-presentation-selected), 2026-10-25, omits optional leaders from compact multi-entry chains and supplies them on multiline chains. This normalizes presentation, not syntax: both spellings remain legal, line breaks still create no boundaries, and required semicolons/commas retain their roles. Multiline bodies alone do not make their headers multiline chains; singleton leaders are not automatically invented.

## Semicolon style after closing braces

Omit the semicolon after a complete block item at every nesting depth. This applies to function/lambda definitions, standalone blocks, complete if/match/loop constructs, record/type definitions, and declarations or assignments ending directly in those constructs. Their closing body already ends the item; a following item needs no extra separator, even on the same line. The grammar still permits an optional trailing semicolon, but documentation examples and formatter output should omit it.

```text
var operation := fn(x: Int) { x * 3 }
operation = fn(x: Int) { x * 4 }

outer := fn {
    inner := fn { 42 }
    inner()
}

profile := Profile {}
```

The rule concerns a complete item, not the last brace character encountered. Preserve punctuation when it serves a required role:

- Ordinary adjacent items still use `;`, as in `first(); second();`.
- A block nested inside a call or grouping does not close the outer item. In `accept(fn { 42 }); next();`, the semicolon after the call separates ordinary items.
- Supplied tuple/record/list components keep their required commas, including after a nested braced value.
- Braces grouping imported names are not a block body: `import school.students.{Student, find_student};` keeps its ordinary separator before a following item.
- Attached else/then/finally clauses remain part of their complete construct; do not insert a separator between the owner and its clauses.

This does not introduce automatic semicolon insertion, make newlines significant, or change a block's result. Foreign-language reference examples retain their own punctuation rules. A separately proposed explicit hook delimiter is not a general block-ending requirement; see [body recovery](body-recovery.md#proposed-explicit-separator-rule).

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

The rule also covers standalone or tagged blocks, match expressions, loop constructs, and function/type definitions. A declaration, assignment, or exit whose outer expression ends directly in an unparenthesized block construct or record construction ends at that construct as well:

```text
answer := { calculate() }
double := fn(x: Int): Int { x * 2 }
print(double(answer));

x: User = {}
y := User {}
/* Requested inferred-record form; literal disambiguation is pending. */
z := { a = 1, b = 2 }
```

The same boundary applies to a record field declaration whose default initializer ends in a complete record construction. It does not remove commas between supplied record-value fields: Outer { first = {}, second = {} } remains a comma-separated initializer.

It does not apply merely because a token happens to be `}`. Braces delimiting an import list are neither a block nor record construction. A block or record construction nested inside a call, grouping, or other enclosing expression does not end the outer item.

## Continuing a block value

Parenthesize a complete block construct or record construction before continuing its value with an operator, call, member access, or indexing:

```text
answer := ({ calculate() }) + 1;
doubled := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
first := ({ make_items() })[0];
name := (User { name = "Ali", }).name;
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

Fractional literals require a leading digit: `0.5` is valid spelling and standalone `.5` is rejected as a numeric literal. Leading-dot forms such as `.count` retain their context-access role. The selected tuple member access `tuple.5` is a fixed position, not a leading-dot literal. Complete numeric-suffix scanning, including nested `pair.0.1`, remains to be formalized; see [tuple entries and access](tuple-entries-and-access.md). See [numbers and ranges](numbers.md).

## Open lexical decisions

The complete Unicode identifier profile, reserved words, remaining numeric-literal rules, escape sequences, and full longest-token rules are not specified. Prefix `@name` and leading-dot context access must be distinguished from ordinary identifiers and member access without using whitespace as a semantic signal.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Comments](comments.md)
- [Identifiers](identifiers.md)
- [Strings](strings.md)
- [Grammar sketch](grammar-sketch.md)
- External languages are comparisons, not normative lexer definitions; see [references](references.md).
