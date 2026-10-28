# Blocks and results

Status: **established direction; source-file body selected 2026-10-28**.

## Purpose and template

An executable block groups items, introduces lexical scope, and produces its final item's result when execution reaches the end.

```text
{
    declaration_or_statement;
    expression
}
```

Bodies always use braces. Optional single-statement bodies and earlier `do/end` or `then/endif` block systems are superseded.

## Item boundaries

A complete block construct ends its item without requiring `;`. Write it without a trailing semicolon, at top level and inside other blocks. This includes declarations initialized directly by blocks, functions/lambdas, conditionals, matches, loops, or record constructions. The grammar still allows an optional trailing semicolon. The entire construct includes its attached else/then/finally clauses; punctuation must not split those clauses from their owner. See the [semicolon style and required exceptions](lexical-structure.md#semicolon-style-after-closing-braces).

```text
answer := {
    42
}
use(answer);
```

Both items can also appear on the same line. Whitespace never determines the boundary.

```text
answer := { 42 } use(answer);
```

The closing body separates the declaration from use(answer), even on the same line. An optional semicolon would not change the block's value; omitting it is the documentation/formatter style, not a syntax ban.

Record construction also ends an outer initializer item: `x: User = {}` and `x := User {}` need no trailing semicolon. Its braces construct data rather than execute a block; sharing a boundary rule does not give it block-result semantics. See [record literal boundaries](record-literal-boundaries.md) for the requested inferred form and remaining disambiguation.

To continue a block's or record construction's value with an operator, call, member access, or indexing, parenthesize the construct:

```text
answer := ({ calculate() }) + 1;
result := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
```

These outer items are ordinary expressions or declarations and use ordinary separators. A closing brace inside a call argument or other enclosing expression does not terminate that enclosing item. See [lexical structure](lexical-structure.md) for the complete separator direction.

## Explicit failure capture

Selected [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md): `({ work() })?` captures supported failures during block execution into a flat outcome. The boundary is active before the first item and includes executed synchronous calls. A final outward T ! E becomes T ! (E | Panic); deliberately nested success payloads remain data. Postfix ? also applies to other expressions. Existing grouping for continuation after a complete braced construct remains required. Normal exits and function-targeted ! are not captured. See [failure capture and unwrapping](failure-capture-and-unwrapping.md).

## Final-item rule

- A final expression supplies the block's value.
- A final declaration or assignment produces `Unit`.
- An empty executable block produces `Unit`. Contextual record initializer braces such as `user: User = {}` are data construction, not executable blocks, and apply the record's defaults instead.
- An empty match-arm body therefore produces Unit too: `_ {}` and `_ { Unit }` have the same result.
- Separators are ignored when locating the final item.
- The compiler does not search backward past a final declaration or assignment for an earlier expression.
- An explicit exit transfers control instead of completing the block normally.

## Examples

```text
price := {
    discounted := calculate_discount(base);
    discounted + shipping
}
```

```text
{ 2 * x }
```

```text
{ 2 * x;;;;;;;;;; }
```

The last two blocks produce the same value. Semicolons inside a block may follow its final ordinary item without changing its result. They may also follow a completed block item, including a nested block, without changing its result. An empty block may contain extra separators. Semicolons are separators, not result-discard operators.

```text
{ x = 3 }       /* Unit */
{ x += 3 }      /* Unit */
{ x := 3 }      /* Unit */
{ x := 3; x }   /* Int */
{ ;;;;; }       /* Unit */
```

The whole-binding assignment examples assume an existing `var x` where needed. `mut` alone does not permit assigning the whole binding.

## Explicit Unit and unused values

```text
{
    perform_action();
    Unit
}
```

```text
{ _ := calculate(); }
```

The second block produces Unit because its final item is a declaration. calculate still runs and its value is bound to the readable name `_`, with permission to be unused. `_ = calculate()` would instead assign an existing var binding; it is not discard syntax.

Exactly which unused results require explicit handling, particularly Result values, and whether a separate discard operation is needed remain open. Naming a value `_` must not silently exempt it from that future policy; see [underscore bindings and skips](wildcards-and-skips.md).

## Block value versus return

```text
answer := {
    42
}

use(answer);
```

The block's final expression does not exit the surrounding function. `return` does. A prefix tag can identify a block as an explicit return target.

## Source file body

Selected **2026-10-28**: a source file that is run as a program is the outermost
implicit executable block. The file boundary supplies the braces that explicit
block constructs require, so "bodies always use braces" still governs every
written `{ ... }` body; the source unit needs no written brace pair of its own.

Its items execute in written order under the ordinary block rules, including the
final-item rule. The final item's result is computed and then not observed: a
trailing expression is evaluated for its effects, and its value is discarded
rather than reported as an error. The file body completes with `Unit` whether it
is empty, ends in a declaration or assignment, or ends in an expression.

Because there is no enclosing function, loop, or tagged block at this boundary, a
top-level `return`, `break`, or `continue` has no valid target. Exact diagnostics
and any future top-level exit spelling remain open.

This section selects the execution model only. Duplicate top-level names and
their module-declaration counterparts, imported-file behavior and module
initialization, recursive initialization of a named function literal, process
exit status, and observable effects remain with their owning contracts. Contrast
[declaration bodies](#declaration-bodies) below, which contain declarations and
never supply an executable result.

## Declaration bodies

A record, interface, enum, module, or implementation body contains declarations. Its last declaration does not become an executable block result merely because the syntax uses braces.

## Notes

The final expression is a syntactic final item, not simply the last value computed on any execution path. In particular, adding logging after a calculation can change an inferred block result to `Unit`; result annotations at public boundaries help detect that change.

## Related concepts and references

- [Unit](unit.md)
- [Functions](functions.md)
- [Control-flow exits](control-flow.md)
- [Rust block expressions](https://doc.rust-lang.org/reference/expressions/block-expr.html) are a comparison. LiteScript deliberately does not copy Rust's trailing-semicolon result suppression.
