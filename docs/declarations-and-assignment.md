# Declarations and assignment

Status: **established direction; full declaration grammar remains open**.

## Templates

```text
name := initializer;
name: Type = initializer;
var name := initializer;
var name: Type = initializer;
name = replacement;
```

## Rules

- `:=` declares a binding and infers its type.
- `: Type =` declares a binding with an explicit type.
- Bindings are immutable by default.
- `var` opts into reassignment.
- A mutable binding still has a fixed static type.
- `=` updates an existing mutable binding; it does not declare one.
- `:=` never means "declare if absent, otherwise update."
- Declarations and assignments are statements producing `Unit`.
- Assignment cannot be embedded in a condition or chained as a value-producing expression.

## Examples

```text
age := 12;
limit: Int = 18;
var attempts := 0;

attempts += 1;
```

```text
var score := 10;
score = 20;       /* accepted */
score = "twenty"; /* rejected: incompatible type */
```

```text
score := 10;
score = 20;       /* rejected: immutable binding */
```

The second example isolates type safety; the third isolates immutability.

## Uniform definitions

Functions and types can be bound through the same declaration form:

```text
double := fn(x: Int): Int {
    x * 2
};

Student := type {
    name: String;
    age: Int
};
```

The `type` record notation is a working sketch. Uniform binding syntax does not imply that a type can be dynamically replaced at runtime.

## Scope

Reject duplicate declarations in the same ordinary block scope. Nested shadowing is an ordinary lexical mechanism. A loop receiver list introduces bindings in slot order, permitting a later receiver to shadow an earlier one; this is separate from ordinary block redeclarations. `_` is a readable name and follows the same rules. Tag shadowing follows its own explicit `@name` namespace and the same nearest-enclosing lookup principle. Exact rules for local recursion, hoisting, duplicate names within one destructuring pattern, and shadowing diagnostics remain to be formalized.

## Rejected forms

```text
if attempts = 3 { ... }
```

```text
a = b = 3;
```

Neither is a value-producing assignment expression in this design.

## Related concepts and references

- [Operators](operators.md)
- [Identifiers](identifiers.md)
- [Loop receivers](loop-receivers.md)
- [Functions](functions.md)
- [Types and inference](types-and-inference.md)
- [Odin declarations](https://odin-lang.org/docs/overview/) informed the discussion; LiteScript's immutable default is its own choice.
