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

The [public omission contracts and implementation defaults](callable-default-contracts.md) rule now selects omission behavior for this expected-input example: the required fn(Int | String): Int contract hides omission, so handler() is rejected even though its implementation declares a default. The implementation still owns and validates that default. A public contract allowing omission needs a compatible implementation default; the exact omission-marker syntax and general callable compatibility remain open.

## Static types do not require evaluating defaults

Infer from a default expression's static type under existing expression rules. A helper's established result type is sufficient; the helper does not execute at definition time to discover a type.

```text
default_count := fn(): Int | Float { 3 }
make_count := fn(count = default_count()) { count }
```

The input type of count is Int | Float, from the helper's declared result contract. Its current implementation returning 3 does not specialize the caller's parameter to Int. This inference decision does not choose new numeric conversions or bypass ordinary value compatibility.

Keep the [selected evaluation order](evaluation-order.md#default-argument-evaluation-selected). Each reached call evaluates the callee, supplied inputs once in written order, then only still-missing applicable defaults once in declared slot order, then invokes. Supplying a parameter skips its default's runtime effects, not its declaration's static validation. A wrong-typed default remains invalid even if all currently visible calls supply that parameter.

Defaults may use otherwise valid runtime expressions such as default_count(); this rule adds no compile-time-constant restriction. Existing expression, failure, access, and initialization obligations still apply. Static type discovery adds no implicit unwrap or recoverable-error inference.

## Defaults may read earlier parameters

Selected on **2026-10-25**: an ordinary value parameter's default may read earlier ordinary parameters in declaration order, using their final prepared values. An earlier parameter can have been supplied by the call or filled by its own default. This applies equally with and without fn and permits static omitted-type inference from the established earlier input types.

```text
make_range := fn(
    start = 0,
    count = 3,
    end = start + count,
) {
    (start, end)
}

make_range();                       /* (0, 3) */
make_range(start = 10);             /* (10, 13) */
make_range(count = 5, start = 10);  /* (10, 15) */
make_range(start = 10, end = 99);   /* (10, 99); end's default is skipped */
```

These are designed outcomes, not executed LiteScript tests. Here all three parameter types are Int. Supplied expressions still evaluate in written order before missing defaults run in declared slot order. In the third call, count is supplied before start; the later end default nevertheless reads start = 10 and count = 5. No supplied expression or earlier default is reevaluated when its parameter is read.

Finish permitted supplied-input routing and replacement before evaluating defaults:

```text
make_range(...(start = 1, count = 2), start = 10);
/* (10, 12): end reads the surviving start = 10 and count = 2 */
```

Earlier ordinary inputs keep the selected copy semantics. A default reads its prepared parameter value, not a live alias to the caller's original variable:

```text
var seed: Int = 10;
make_range(start = seed, count = ({
    seed = 20;
    3
}));
/* result (10, 13); caller seed is now 20 */
```

The copied start remains 10 while preparing count changes seed. This example introduces no reference mode or additional caller access grant. Reads and copies retain their ordinary observable effects; conceptual prepared slots do not mandate physical temporary allocation.

### Self and later references are rejected

```text
bad_forward := fn(a: Int = b, b = 1) { a }
/* rejected: b is declared after a */

bad_self := fn(a: Int = a) { a }
/* rejected: a cannot read itself as its default */
```

These are declaration errors even when a particular call supplies b or supplies a and skips its invalid default. Later supplied slots being available during call preparation does not grant them visibility in an earlier default. Parameter names referring to self or a later parameter do not silently fall back to an enclosing same-named binding. This keeps validity independent of the chosen call arguments and prevents cyclic default dependencies.

The selected visibility is for earlier ordinary value inputs. It does not expose function-body locals, introduce lookup in the caller's local scope, or decide enclosing captures. Broader lexical/helper lookup, access-aware dependencies involving var/mut inputs, defaults on patterns or variadics, and public omission-marker syntax/general callable integration remain separate. The public contract now controls omission while the implementation owns the default expression. Existing failure, initialization, final-input compatibility, and permission obligations still apply; missing inputs without an applicable declared default remain errors.

Kotlin provides a matching precedent for the declaration-order dependency restriction: its functions guide requires a parameter using another parameter's value to be declared later. Source checked 2026-10-25: [non-constant defaults](https://kotlinlang.org/docs/functions.html#non-constant-expressions-as-default-values). This reference supports the comparison; LiteScript's examples remain design-only.

## Insufficient information and boundaries

If neither an annotation, an established expected input contract, nor valid default-expression inference establishes the omitted type, require more type information. Do not infer an implicit dynamic type, execute code to discover a type, or choose an arbitrary type to break a cycle. Empty literals retain their existing expected-type/inference requirements; this rule does not invent an element type.

A parameter without such evidence remains unresolved:

```text
unresolved := fn(value) { value * 2 }
/* body operations alone do not establish an arbitrary reusable input contract */
```

This selects simple ordinary default receivers of the form name = expression or name: Type = expression in the existing parenthesized callable header. It does not complete recursive header parsing or add defaults to every receiver/type form. In particular, permission-bearing defaults, inferred omitted var/mut value types, variadic defaults, parameter-pattern defaults, general lexical/helper lookup and enclosing captures, access-aware var/mut dependencies, recursive/generic inference, public omission-marker syntax, and remaining stored-callable compatibility beyond omission remain separate. Public omission permission and implementation-owned defaults are selected in [public omission contracts and implementation defaults](callable-default-contracts.md). No absent argument is synthesized without an applicable explicitly declared default.

Reference syntax, memory safety, ownership/lifetimes, aliases, and resource rules remain deferred. Ordinary value copies and explicit access grants keep their existing contracts.

## Related documents

- [Functions](functions.md#omitted-value-arguments)
- [Types and inference](types-and-inference.md#inferred-functions)
- [Callable input packs](callable-input-packs.md)
- [Provisional grammar](grammar-sketch.md#declarations)
- [Modern-language comparison](default-parameter-inference-comparison.md)
- [Argument omission](union-parameter-defaults.md)
