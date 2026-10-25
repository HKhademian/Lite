# Default parameters and omitted-type inference across modern languages

Status: **primary references checked 2026-10-25; reference research; the LiteScript recommendation below was subsequently selected on 2026-10-25, without compiler verification**.

## Question and scope

Should a parameter with a default establish its input type when the annotation is omitted? This is separate from when the default expression executes. Review V, Rust, Zig, Odin, Dart, and TypeScript, with Kotlin as an additional comparison because its evaluation order closely matches LiteScript's selected rule.

The findings below concern ordinary function/procedure declarations. Closure contextual inference, generics, struct-field defaults, and configuration-object APIs are different mechanisms. Living documentation was checked on the date above. Zig's grammar is pinned to 0.17.0; the linked Kotlin specification identifies itself as 1.9-rfc+0.1, supplemented by the current functions guide. Other pages are unversioned references, not claims about an installed compiler version. No examples were compiled or executed for this comparison.

## TypeScript: inference from the default

```typescript
function make(count = 3, label = "item") {
    return { count, label };
}
```

The parameter types are inferred as `number` and `string`. The defaults do not restrict callers to the literal values `3` and `"item"`. The handbook explicitly includes parameter defaults among inference sites. An annotation can instead establish a broader contract. JavaScript default activation also includes an explicitly supplied `undefined`; that is a separate language behavior, not part of the selected LiteScript rule. Sources: [type inference](https://www.typescriptlang.org/docs/handbook/type-inference.html), [default-initialized parameters](https://www.typescriptlang.org/docs/handbook/functions.html#optional-and-default-parameters).

## Odin: inferred defaults, with a constant restriction

Odin documents parameters such as `x := 0`, `width := 854`, and `height := 480`, alongside explicitly typed defaults such as `monitor: ^Monitor = nil`. The inferred form is a direct precedent for omitting a parameter's annotation when its default supplies the type. Defaults must be known at compile time. This does not establish support for arbitrary runtime helper calls as defaults. Source: [default values](https://odin-lang.org/docs/overview/#default-values).

## Dart: defaults do not infer ordinary declared parameter types

```dart
void make({int count = 3, String label = "item"}) {}
```

Dart supports optional positional and named defaults, but Effective Dart explicitly says that an optional parameter's type is not inferred from its default value. Removing `int` here does not infer `int` from `3` for an ordinary standalone declaration. Callback context and initializing formals have separate inference rules. Defaults must be compile-time constants. Sources: [parameter annotation guidance](https://dart.dev/effective-dart/design#do-annotate-parameter-types-on-function-declarations), [named parameters and defaults](https://dart.dev/language/functions#named-parameters).

## V: no native default function arguments

V explicitly documents that it has neither default function arguments nor named arguments. Its trailing struct-literal argument syntax offers a configuration-record alternative; defaults belong to struct fields. It is not evidence for default-based inference on ordinary function parameters. Source: [trailing struct literal arguments](https://docs.vlang.io/structs.html#trailing-struct-literal-arguments).

## Rust: no native default value parameters

The reference's ordinary parameter grammar requires a pattern and type and has no default-expression clause. Thus `fn make(count: i32 = 3)` is not an ordinary Rust function declaration. Generic parameter defaults, closure inference, macros, and configuration values do not supply this feature. This absence follows from the normative grammar, rather than merely from finding no example in a tutorial. Source: [function parameters and grammar](https://doc.rust-lang.org/reference/items/functions.html#function-parameters).

## Zig: no native default value parameters; anytype is different

The Zig 0.17.0 grammar gives a parameter a type expression or `anytype`, with no default-expression clause. Its `anytype` mechanism infers parameter types from calls; it does not infer one fixed parameter type from a default. Struct-field defaults are likewise a different mechanism. Sources: [parameter grammar](https://ziglang.org/documentation/0.17.0/#Grammar), [function parameter type inference](https://ziglang.org/documentation/0.17.0/#Function-Parameter-Type-Inference).

## Kotlin: explicit types, matching runtime order

```kotlin
fun make(count: Int = 3, label: String = "item") {}
```

Kotlin's functions guide requires explicit parameter types. Its default may be an expression, checked against the declared parameter type. Its specification orders supplied arguments by their written call order, followed by only missing defaults in parameter declaration order, followed by invocation. Used defaults are reevaluated per call; overridden defaults do not execute. This is a close precedent for LiteScript's already selected timing, independently of whether types are inferred. Sources: [function parameters](https://kotlinlang.org/docs/functions.html#parameters), [default compatibility](https://kotlinlang.org/spec/declarations.html#function-declaration), [call evaluation order](https://kotlinlang.org/spec/expressions.html#function-calls-and-property-access).

## LiteScript rule selected after this comparison

There is no universal rule across these languages. TypeScript and Odin support default-based parameter inference; Dart deliberately does not. V, Rust, and Zig do not directly answer the inference question because they lack native default value parameters. Kotlin demonstrates that type annotations and runtime default evaluation are independent choices.

The user accepted this inference rule for ordinary value parameters after the comparison. The canonical [parameter-default inference](parameter-default-inference.md) records the selected rule with these boundaries:

1. An explicit annotation or already established expected callable input contract constrains the parameter and its default. A default does not narrow that public contract or override it.
2. Without that information, use ordinary declaration-style static inference on the default. Literal defaults use the language's normal inferred types, rather than inventing singleton-value restrictions.
3. Establish one parameter type before checking independent calls. A supplied argument cannot widen it, and the function body does not retroactively infer arbitrary inputs under this rule.
4. Inspect the default expression's static type; do not execute it to discover a type. A helper with a known `Int | Float` result would establish that union, even if its current implementation happens to return an `Int`.
5. If the existing inference rules cannot establish a valid type, require an annotation or an established context. Do not invent an implicit dynamic type or resolve cycles by executing code. Expected-type handling for empty literals remains governed by its existing rules.
6. Statically validate a declared default even if a particular call supplies that parameter. Skipping its runtime evaluation does not make an invalid declaration valid.

Under the selected rule, the simple ordinary header behaves as follows:

```text
make := fn(count = 3, label = "item") {
    (count, label)
}

make(count = 5);       /* valid: count is Int */
make(count = "five");  /* rejected: String does not fit Int */
```

Simple ordinary default receivers and their omitted-type inference are now selected. Ordinary [earlier-parameter defaults](parameter-default-inference.md#defaults-may-read-earlier-parameters) were subsequently selected too: earlier ordinary inputs are visible, while self/later references are rejected independently of call arguments. This does not complete default-header grammar, general lexical/helper lookup or captures, access-aware dependencies, or permission-bearing defaults. The subsequent [public omission contracts and implementation defaults](callable-default-contracts.md) decision exposes omission permission in the public contract and keeps compatible default expressions with implementations; omission-marker syntax remains open.

Keep the [selected default evaluation order](evaluation-order.md#default-argument-evaluation-selected): evaluate the callee, supplied arguments in written order, then missing defaults in declaration order before invocation. Keep runtime-expression defaults such as `default_b()`; Odin/Dart's constant restriction is a comparison point, not a reason to change that choice. Reference syntax, ownership, memory safety, and resources remain deferred.

## Related documents

- [Functions and omitted arguments](functions.md#omitted-value-arguments)
- [Types and inference](types-and-inference.md)
- [Named calls across reference languages](named-arguments-reference-comparison.md)
- [Default omission and union types](union-parameter-defaults.md)
