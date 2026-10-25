# Safe callable input and result adaptation

Status: **selected 2026-10-25 for ordinary value callables, including the required-input plain-union case below; design-only, not compiler/runtime verification**.

## Direct assignment is valid

The user accepts this direct callable assignment; a manually written wrapper is not required:

```text
wide := fn(value: Int | String): Int { 0 }
view: fn(value: Int): Int | String = wide;

view(7);       /* 0 as an Int member of the public Int | String result */
wide("tea");  /* valid: the implementation accepts String too */
view("tea");  /* rejected: view publicly accepts only Int */
```

The visible view admits only Int arguments, all of which wide can accept. Wide promises an Int result, which the view may expose as Int | String. The implementation retains its own input/result contracts; adapting the callable does not retype its body or infer a new implementation signature from calls.

## Compatibility directions

For a fixed matching input shape, use existing ordinary value admission to check each supported parameter position and the result:

- Every value the destination view allows a caller to supply must fit the implementation's corresponding input. The implementation may accept more values than that view exposes. This is contravariant input checking.
- Every result the implementation promises must fit the destination view's result contract. The implementation may return a narrower type than that view exposes. This is covariant result checking.

Int is admitted into Int | String under the existing plain-union rules. This selection uses that existing relation; it does not invent numeric coercions, structural record compatibility, generic variance, or unchecked casts. For equal types, the usual compatibility checks still apply.

The safe relation can be used at typed binding initialization, ordinary callable reassignment, argument passing, and returning callable values when the other contracts match. It is ordinary safe callable compatibility, not permission to implicitly relabel tuple/callable contracts.

## Reverse directions are rejected

```text
only_int := fn(value: Int): Int { value }
bad_input: fn(value: Int | String): Int = only_int;
/* rejected: this public view would allow String, which only_int cannot accept */

mixed_result := fn(value: Int): Int | String { value }
bad_result: fn(value: Int): Int = mixed_result;
/* rejected: the implementation's declared result permits String */
```

Use the established callable contract, not guesses from its current body or currently observed results. A particular implementation returning Int today does not erase its declared Int | String result contract.

## Compiler adaptation, not a required source wrapper

The following is a valid explicit technique, but is unnecessary for the accepted direct assignment:

```text
manual_view := fn(value: Int): Int | String {
    wide(value)
}
```

The compiler is responsible for preserving the same required argument/result admission behavior for a direct callable adaptation. It may need union representation changes or an internal adapter; it must not reinterpret incompatible input/result bytes merely because both sides are callable types. This is distinct from the layout-preserving label-only conversion and from the deferred in-place memory-compatible casts.

No particular adapter object, closure layout, allocation, ABI, or performance cost is selected. Direct ABI-compatible lowering, an adapter, or another implementation is acceptable only if it preserves the language's observable values, effects, and ordinary copy contracts. The programmer need not manually write a forwarding function for a statically valid adaptation.

Evaluate the source callable expression once at the adaptation site and retain the obtained callable value under its valid copy contract. Do not implement adaptation by silently rereading a later replacement of a mutable source binding. On invocation, preserve caller expression order/single evaluation and the selected implementation's effects, copies, failures, and cleanup; do not execute the source body while adapting its value.

## Zero callables preserve their source behavior

```text
empty: fn(value: Int | String): Int = 0;
adapted_empty: fn(value: Int): Int | String = empty;
adapted_empty(7);  /* Int zero admitted into Int | String */
```

Adaptation invokes the obtained source callable's semantics. Here the source zero callable returns zero(Int), which is then admitted as an Int result member. This is not fresh zero construction of the destination function type, and it does not choose zero(Int | String) or settle the pending general union-zero mapping. A compiler cannot discard necessary adaptation just because the source is zero.

## Labels, defaults, and access remain separate

Normal callable transfers still check public labels. An explicitly typed receiving declaration can bypass label mismatch under the selected [explicit label-conversion rule](tuple-label-conversions.md#ordinary-transfers-check-labels). That label permission may be composed with a valid safe value adaptation; it cannot reverse the input/result compatibility directions or justify byte reinterpretation. Implementation-local receiver names remain independent of caller-visible labels.

Type-changing input adaptation is selected here for required ordinary destination inputs. An implementation may itself have a default that is hidden by that required view under the existing omission rule. For an omission-capable destination input, changing the input type at the same time is a separate interaction still to settle; this selection does not guess how such a default should relate to the narrowed view. Unchanged input types retain all selected public-omission/implementation-default behavior. Ordinary result widening remains possible when the other contracts are already compatible.

No new type widening/narrowing is authorized through var/mut grants by this ordinary-value rule. Their existing read/write, initialization, caller-location, and permission compatibility checks remain necessary. Variance for writable inputs, changing error/effect contracts, Result type composition, variadics/overloads, generic constraints, unrelated callable shape changes, and recursive inference remain separate. No implicit returned-error extraction or new escaping recoverable-error contract is introduced.

Captures, reference syntax, memory safety, ownership/lifetimes, alias enforcement, resource/copy eligibility, and concrete calling convention remain deferred. This selection is a static semantic rule, not an implemented compiler feature or a claim of zero overhead.

## Reference context

Official TypeScript documentation checks function parameter positions contravariantly with strictFunctionTypes (with method/constructor exceptions), and describes covariant result compatibility. Those are supporting precedents, not adoption of TypeScript's other optional/rest, label, or unsound compatibility rules. Sources checked 2026-10-25: [strict function types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types), [comparing function results](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#comparing-two-functions).

## Related documents

- [Functions](functions.md#function-types-literals-and-reassignment)
- [Types and inference](types-and-inference.md)
- [Callable input packs](callable-input-packs.md)
- [Explicit label conversion](tuple-label-conversions.md)
- [Public omission and implementation defaults](callable-default-contracts.md)
- [Ordinary value copies](parameter-values-and-slots.md)
