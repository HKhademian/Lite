# Safe callable input and result adaptation

Status: **selected 2026-10-25 for ordinary value adaptation and basic var T invariance, including required and omission-capable ordinary input views; design-only, not compiler/runtime verification**.

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

## Omission remains an implementation promise

Selected on **2026-10-25**, clarified by the user: a default is an implementation promise. A signature can record omission permission or expose a required view, but cannot define, replace, convert, or otherwise alter the implementation's default definition/handling. This also applies when safe input variance narrows the public type of caller-supplied values.

```text
wide_default := fn(value: Int | String = "auto"): Int {
    if value: String { 1 }
    else { value }
}

view_default: fn(value?: Int): Int = wide_default;

view_default(7);       /* 7 */
view_default();        /* 1: implementation uses its own String default */
view_default("auto");  /* rejected: supplied values must fit the public Int input */
```

The public Int constrains values the caller supplies. The ? separately permits supplying no value. The implementation's String default fits its own Int | String input; it need not become an Int merely because a narrower view is used. The body retains its implementation input type and local bindings. Its Int result still fits the view's result contract.

For a compatible view, every supplied destination input must fit the implementation input, and every implementation result must fit the destination result. In addition, every omission that the destination permits must be promised by the source callable contract. This extends the earlier required-view variance case to omission-capable ordinary value inputs; it does not introduce a public missing value.

```text
no_default := fn(value: Int | String): Int { 0 }
bad_optional: fn(value?: Int): Int = no_default;
/* rejected: this source contract does not promise omission */
```

A signature cannot manufacture a default because Int supports zero. A required source view also cannot regain hidden omission capability merely by changing its signature; the existing required-view rule remains. Constructing a fresh zero callable uses its separately selected built-in omission handling rather than discovering a hidden default on an arbitrary required source value.

### Compiler adapters must preserve omission

When a caller supplies an Int, the adapter admits that value into the implementation's Int | String input. When the caller omits it, the adapter preserves omission for the selected implementation's handler. It must not insert zero(Int), synthesize a public default, copy a default into the signature, or attempt to convert "auto" into Int. The source callable value selected during adaptation retains its own handling.

Evaluate reached supplied expressions in their ordinary written order. For an ordinary user implementation, run only its missing defaults once in its declared slot order before the body. Public relabeling does not rename default-expression locals or change dependencies between earlier implementation parameters. Required views still require their inputs and do not run hidden defaults for supplied slots. Zero implementations retain no-body/no-default execution and their original zero-result semantics before any supported result adaptation.

This defines observable behavior without selecting an internal absent-input sentinel, parameter-slot layout, or ABI. A possible non-public unvalued representation remains a future discussion; no public undefined, Unit alternative, nullable input, or uninitialized value is introduced.

## Var parameters keep their value type

Selected on **2026-10-25**: when converting callable signatures, a basic var T parameter keeps the same resolved value type T and the same read/write caller-location contract. Ordinary value-input contravariance does not apply through that grant. Because var T permits both reads and writes, both directions of compatibility are required; the result is invariance in T.

```text
replace_any := fn(target: var (Int | String)): Unit {
    target = "ready";
}

int_view: fn(target: var Int): Unit = replace_any;
/* rejected: the implementation could write String through an Int-only contract */
```

The opposite direction also fails:

```text
replace_int := fn(target: var Int): Unit {
    target = 1;
}

union_view: fn(target: var (Int | String)): Unit = replace_int;
/* rejected: this view could admit a String read, but the implementation requires Int */
```

An implementation's current body being write-only does not erase its declared read contract. Output-only access and future single/multi-write parameter modes remain separate; do not infer them from the body.

Equal resolved types are sufficient for this dimension, including transparent aliases and normalized unions written in different orders. This is not a requirement for identical spelling. Public labels remain independently checked or explicitly converted:

```text
int_view: fn(target: var Int): Unit = replace_int; /* valid */
renamed: fn(item: var Int): Unit = replace_int;   /* explicit label conversion */

var count: Int = 0;
renamed(item = var count);
/* count is 1; the implementation still names its caller-location parameter target */
```

The written destination type can rename the public slot, but cannot change its read/write value type T or the granted permissions. It does not supply a var grant: callers still provide an initialized compatible caller location with the explicit var argument form. Do not repair an incompatible grant by copying into a differently typed temporary, discarding writes, writing back later, or introducing an undeclared runtime failure. Ordinary value adapters are not caller-location replacement adapters.

### Individual argument flow checks remain unchanged

```text
var value: Int | String = 7;
replace_int(var value);
/* valid: value currently reads as Int, and its declared storage accepts Int writes */
```

This is argument admission under the existing entry-time flow/access checks, not conversion from a callable requiring var (Int | String) into one requiring var Int. The caller location's declared write type may be broader than the parameter's accepted read/write type when those existing checks justify it. Callable type invariance does not require the caller storage declaration itself to be exactly Int, and does not discard current read refinements or declared write capacity.

For mixed signatures, this rule applies to each basic var T position. Ordinary value positions and ordinary results retain their separately selected safe adaptation rules, with label/omission/error contracts still enforced. No new variance is selected for mut or more general split read/write access contracts, reference syntax, lifetimes, or alias enforcement.

Rust likewise lists &'a mut T as invariant in T, providing a related read/write precedent. Source checked 2026-10-25: [variance of built-in types](https://doc.rust-lang.org/reference/subtyping.html#variance). This comparison does not select Rust-style references, lifetime syntax, or ownership rules for this language.

## Labels, defaults, and access remain separate

Normal callable transfers still check public labels. An explicitly typed receiving declaration can bypass label mismatch under the selected [explicit label-conversion rule](tuple-label-conversions.md#ordinary-transfers-check-labels). That label permission may be composed with a valid safe value adaptation; it cannot reverse the input/result compatibility directions or justify byte reinterpretation. Implementation-local receiver names remain independent of caller-visible labels.

Safe ordinary input adaptation now applies to required and omission-capable views under the implementation-promise rule above. Supplied inputs are checked contravariantly; allowed omission must be promised by the source contract and must reach its selected implementation unchanged. A narrower public input type does not revalidate an already established implementation default against that narrower type. Required views can still hide omission, and ordinary result widening retains its selected rule.

No new type widening/narrowing is authorized through var/mut grants by this ordinary-value rule. Their existing read/write, initialization, caller-location, and permission compatibility checks remain necessary. Basic var T callable parameters are now invariant as specified above, while individual argument-flow checks remain unchanged. Variance for mut or more general split access contracts, changing error/effect contracts, Result type composition, variadics/overloads, generic constraints, unrelated callable shape changes, and recursive inference remain separate. No implicit returned-error extraction or new escaping recoverable-error contract is introduced.

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
