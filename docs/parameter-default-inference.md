# Parameter types inferred from defaults

Status: **selected 2026-10-25 for ordinary value parameters; language design, not parser/type-checker/runtime verification**.

## Selected rule

A declared default can establish an ordinary parameter's omitted type. This applies equally to parenthesized callable literals with and without `fn`.

```text
make := fn(count = 3, label = "item") {
    (count, label)
}

make(count = 5);       /* valid: count is Int */
make(count = "five");  /* rejected: String does not fit Int */
```

Here count has input type Int and label has input type String. Ordinary declaration inference applies: these defaults do not invent singleton types restricted to 3 and "item". With the inputs established, the existing local body-result inference rules apply.

```text
scale := (count = 3) { count * 2 }
scale(4);  /* valid: Int input and inferred Int result */
```

The default is optional input supply, not a generic specialization mechanism. Establish the callable's input contract statically before checking its independent calls. Later supplied arguments do not widen it. Ordinary final-input routing/type checks still apply to every call.

## Annotations and expected contracts constrain inference

An explicit parameter annotation or already established expected callable input type constrains the parameter and its default. Infer only omitted information; reject incompatible constraints rather than replacing a contract with the default's narrower type.

```text
flexible := fn(value: Int | String = 3) {
    value
}

flexible(value = "ready");  /* valid: declared input is Int | String */

handler: fn (Int | String): Int = fn(value = 3) { 0 }
/* expected input remains Int | String; the default does not narrow it to Int */

bad := fn(count: Int = "three") { count }
/* rejected: the default does not fit the declared Int input */
```

The expected-input example establishes typing only. Whether a default on an implementation is available through a separately typed callable remains part of signature-versus-implementation/default-placement design; this example does not select callable conversion or omission compatibility.

## Static types do not require evaluating defaults

Infer from a default expression's static type under existing expression rules. A helper's established result type is sufficient; the helper does not execute at definition time to discover a type.

```text
default_count := fn(): Int | Float { 3 }
make_count := fn(count = default_count()) { count }
```

The input type of count is Int | Float, from the helper's declared result contract. Its current implementation returning 3 does not specialize the caller's parameter to Int. This inference decision does not choose new numeric conversions or bypass ordinary value compatibility.

Keep the [selected evaluation order](evaluation-order.md#default-argument-evaluation-selected). Each reached call evaluates the callee, supplied inputs once in written order, then only still-missing applicable defaults once in declared slot order, then invokes. Supplying a parameter skips its default's runtime effects, not its declaration's static validation. A wrong-typed default remains invalid even if all currently visible calls supply that parameter.

Defaults may use otherwise valid runtime expressions such as default_count(); this rule adds no compile-time-constant restriction. Existing expression, failure, access, and initialization obligations still apply. Static type discovery adds no implicit unwrap or recoverable-error inference.

## Insufficient information and boundaries

If neither an annotation, an established expected input contract, nor valid default-expression inference establishes the omitted type, require more type information. Do not infer an implicit dynamic type, execute code to discover a type, or choose an arbitrary type to break a cycle. Empty literals retain their existing expected-type/inference requirements; this rule does not invent an element type.

A parameter without such evidence remains unresolved:

```text
unresolved := fn(value) { value * 2 }
/* body operations alone do not establish an arbitrary reusable input contract */
```

This selects simple ordinary default receivers of the form name = expression or name: Type = expression in the existing parenthesized callable header. It does not complete recursive header parsing or add defaults to every receiver/type form. In particular, permission-bearing defaults, inferred omitted var/mut value types, variadic defaults, parameter-pattern defaults, lookup scope and references to other parameters, recursive/generic inference, default placement in signatures versus implementations, and stored-callable omission compatibility remain separate. No absent argument is synthesized without an applicable explicitly declared default.

Reference syntax, memory safety, ownership/lifetimes, aliases, and resource rules remain deferred. Ordinary value copies and explicit access grants keep their existing contracts.

## Related documents

- [Functions](functions.md#omitted-value-arguments)
- [Types and inference](types-and-inference.md#inferred-functions)
- [Callable input packs](callable-input-packs.md)
- [Provisional grammar](grammar-sketch.md#declarations)
- [Modern-language comparison](default-parameter-inference-comparison.md)
- [Argument omission](union-parameter-defaults.md)
