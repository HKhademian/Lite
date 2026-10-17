# Declarations and assignment

Status: **established direction; full declaration grammar remains open**.

## Templates

```text
name := initializer;
name: Type = initializer;
mut name := initializer;
mut name: Type = initializer;
var name := initializer;
var name: Type = initializer;
var mut name := initializer;
var mut name: Type = initializer;
name = replacement;
```

## Rules

- `:=` declares a binding and infers its type.
- `: Type =` declares a binding with an explicit type.
- Bindings are fixed and provide read-only access by default.
- `var` opts into binding reassignment, without granting writable access to held data.
- `mut` opts into writable access to held data, without granting binding reassignment.
- `var mut` opts into both capabilities, in that order.
- Either capability leaves the binding's static value type fixed.
- `=` assigns an existing writable target; it does not declare one. A binding target requires `var`; a field or element target through a binding requires `mut`, permitted field/element access, and a compatible ownership contract.
- `:=` never means "declare if absent, otherwise update."
- Declarations and assignments are statements producing `Unit`.
- Assignment cannot be embedded in a condition or chained as a value-producing expression.

The modifiers name two independent capabilities. For `x := make_user()`, `x.age = 13` is rejected because the binding does not provide writable access. `mut x := make_user()` permits that update when the field and ownership rules permit it, but still rejects `x = another_user`. These rules concern access through the binding, not a promise of deep global immutability; see [mutability, access, and operations](mutability.md).

The declaration prefixes are `mut`, `var`, or `var mut`; `mut var` and repeated modifiers are not alternate spellings. Affected function parameters also use a `mut` prefix, as in `fn(mut user: User) { ... }`. Mutation contracts belong to receiver/parameter bindings, without an additional function-level marker; see [functions](functions.md).

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

## Held-data updates versus binding updates

```text
mut user := make_user();
user.age = 13;              /* permitted if the field is accessible and writable */
user = make_another_user(); /* rejected: no var */
```

```text
var user := make_user();
user = make_another_user(); /* permitted with a compatible type and ownership contract */
user.age = 13;             /* rejected: no mut */
```

```text
var mut user := make_user();
user.age = 13;
user = make_another_user();
```

These examples assume fresh owned construction and an accessible writable `age` field. `mut` does not create write permission through an existing read-only borrowed view or override field privacy.

`count += 1` with `var count := 0` remains valid: it computes a result and assigns the `count` binding. Conversely, `user.age += 1` updates a field and requires writable access through `user`. Compound updates follow the permission of their assignment target.

Select an assignment target once before evaluating the right-hand side. A compound update reads the selected target's current value before evaluating its right operand, then applies the operation and writes the result. The ownership contract must make target retention valid; it cannot silently change this order or reevaluate an index. See [evaluation order](evaluation-order.md).

## Uniform definitions

Functions and types can be bound through the same declaration form:

```text
double := fn(x: Int): Int {
    x * 2
}

Student := type {
    name: String;
    age: Int
}
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
