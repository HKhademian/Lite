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

## Final-item rule

- A final expression supplies the block's value.
- A final declaration or assignment produces `Unit`.
- An empty block produces `Unit`.
- Separators are ignored when locating the final item.
- The compiler does not search backward past a final declaration or assignment for an earlier expression.
- An explicit exit transfers control instead of completing the block normally.

## Examples

```text
price := {
    discounted := calculate_discount(base);
    discounted + shipping
};
```

```text
{ 2 * x }
```

```text
{ 2 * x;;;;;;;;;; }
```

The last two blocks produce the same value. Semicolons are separators, not result-discard operators.

```text
{ x = 3 }       /* Unit */
{ x += 3 }      /* Unit */
{ x := 3 }      /* Unit */
{ x := 3; x }   /* Int */
{ ;;;;; }       /* Unit */
```

The assignment examples assume an existing mutable `x` where needed.

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

The second block produces `Unit` because its final item is a declaration. `_` remains a readable binding inside that block; it is not a special discard target. `_ = calculate()` instead means assignment and requires an existing mutable `_` binding.

Exactly which unused results require explicit handling, particularly `Result` values, and whether a separate discard operation is needed remain open. Binding a value to `_` must not silently exempt it from that future policy.

## Block value versus return

```text
answer := {
    42
};

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
