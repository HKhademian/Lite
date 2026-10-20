# Closures

Status: **function-value direction established; captures and lifetimes open**.

## Purpose and template

Use the ordinary function expression as a reusable value that may capture surrounding values.

```text
transform := fn(x: Int): Int {
    x * 2
}
```

Use `(x) { ... }` when a binding, method signature, or callback contract supplies parameter and result types. Full typed `fn` definitions remain independent of an expected type. Both forms use brace bodies and permit optional trailing item semicolons. The intermediate contextual `fn(x) { ... }` spelling is retired as redundant. Complete lambda parsing, standalone inference, and capture rules remain open; see [functions](functions.md#compact-implementations-under-review).

## Result behavior

The final expression supplies normal completion, exactly as in a named function. A plain `return` exits the nearest closure or function body.

```text
transform := fn(x: Int): Int {
    if x < 0 { return 0 }
    x * 2
}
```

## Capture sketch

```text
offset := 3;
transform := fn(x: Int): Int {
    x + offset
}
```

The intended meaning is that `offset` is available to the function. Whether that is a copy, move, borrow, or shared reference is not specified until the memory model is chosen.

## Tags and control-flow boundaries

A closure must not perform a targeted return or continuation into a construct in the function that created it. Tags are not ordinary escaping runtime handles. If code needs metadata inside a callback, explicitly capturing an ordinary metadata value is a useful safe shape:

```text
@users loop users {
    count := @users.count;
    callback := fn(): Int { count }
    use_callback(callback)
}
```

The callback and ownership details remain illustrative, but copying a value is distinct from capturing the ability to jump back into a loop.

## Open decisions

Capture inference and modifiers, mutable captures, escaping closures, allocation, callback effects, generic function values, calling conventions, and self-recursive closures.

## Related concepts and references

- [Functions](functions.md)
- [Control-flow exits](control-flow.md)
- [Memory and performance](memory-and-performance.md)
- [Kotlin functions](https://kotlinlang.org/docs/functions.html) and [Rust blocks/async boundaries](https://doc.rust-lang.org/reference/expressions/block-expr.html) are comparisons; no automatic adoption of their capture rules is implied.
