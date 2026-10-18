# Blocks and results

Status: **established direction**.

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

A complete block construct ends its item without requiring ;. A trailing semicolon is optional and allowed, including after a declaration initialized by a block, function, conditional, match, or loop. The entire construct includes its attached else/then/finally clauses; punctuation must not split those clauses from their owner.

```text
answer := {
    42
}
use(answer);
```

Both items can also appear on the same line. Whitespace never determines the boundary.

```text
answer := { 42 };
use(answer);
```

The optional trailing semicolon does not change the block's value. The earlier ban on this spelling is superseded.

To continue a block's value with an operator, call, member access, or indexing, parenthesize the construct:

```text
answer := ({ calculate() }) + 1;
result := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
```

These outer items are ordinary expressions or declarations and use ordinary separators. A closing brace inside a call argument or other enclosing expression does not terminate that enclosing item. See [lexical structure](lexical-structure.md) for the complete separator direction.

## Final-item rule

- A final expression supplies the block's value.
- A final declaration or assignment produces `Unit`.
- An empty block produces `Unit`.
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

## Declaration bodies

A record, interface, enum, module, or implementation body contains declarations. Its last declaration does not become an executable block result merely because the syntax uses braces.

## Notes

The final expression is a syntactic final item, not simply the last value computed on any execution path. In particular, adding logging after a calculation can change an inferred block result to `Unit`; result annotations at public boundaries help detect that change.

## Related concepts and references

- [Unit](unit.md)
- [Functions](functions.md)
- [Control-flow exits](control-flow.md)
- [Rust block expressions](https://doc.rust-lang.org/reference/expressions/block-expr.html) are a comparison. LiteScript deliberately does not copy Rust's trailing-semicolon result suppression.
