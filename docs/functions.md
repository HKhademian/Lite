# Functions

Status: **binding syntax, colon result types, tail results, and early-return direction established**.

## Template

```text
name := fn(parameter: ParameterType): ResultType {
    body
};
```

Functions are definitions bound to names, not a separate category requiring a second named-definition syntax. `fn name(...)` occurred in early sketches; uniform binding syntax is the current direction.

## Example

```text
double := fn(x: Int): Int {
    2 * x
};
```

Use `:` for result annotations, matching other type annotations. The earlier `->` spelling is superseded.

## Result rules

The body's final expression supplies normal completion. A final declaration or assignment produces `Unit`. A trailing separator changes nothing.

```text
greet := fn(name: String): Unit {
    print("Hello, " + name)
};
```

## Early return

```text
validate := fn(value: Int): Result<Int, ValidationError> {
    if value < 0 {
        return Err(ValidationError.Negative)
    };

    value
};
```

Early returns are encouraged for guards and invalid cases. Explicit final `return` was recommended to remain legal, rather than adding a prohibition with little semantic benefit. Whether a formatter or linter expresses a preference is open.

`return` is control flow, never a parser's ambiguity-breaking hint.

## Closures

```text
double := fn(x: Int) {
    x * 2
};
```

The same body-result rule applies to anonymous functions. A plain `return` inside a closure exits that closure, not the function that created it. Capture modes and escaping lifetime rules depend on the memory model.

## Recursion and inference

The language needs a declaration-resolution rule allowing recursive definitions without making arbitrary initialization order implicit. Unannotated parameter inference, public signature requirements, generic constraints, and recursive result inference are still open.

## Tagged exits

`return @tag value` exits a lexically enclosing named construct. It cannot jump across a function or closure boundary. Whether function definitions themselves can carry tags, and how that would interact with ordinary `return`, is not yet specified.

## Related concepts and references

- [Blocks and results](blocks-and-results.md)
- [Types and inference](types-and-inference.md)
- [Result and errors](result-and-errors.md)
- [Control-flow exits](control-flow.md)
- [Rust blocks](https://doc.rust-lang.org/reference/expressions/block-expr.html) and [Kotlin functions](https://kotlinlang.org/docs/functions.html) provide comparisons. LiteScript's proposed rule is not a claim that all compared languages handle function bodies identically.
