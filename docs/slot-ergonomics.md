# Keep derived var summaries implicit

Status: **ergonomics goal retained; spelling updated 2026-10-19**. Hide derived type-structure summaries such as A | var B | C wherever possible. Explicit type-side var receivers replace the former slot spelling; see [the var qualifier](var-access-qualifier.md). This later naming decision supersedes the earlier rejection of changing receiver spelling merely to hide mathematical notation.

## Goal

Keep writable-storage contracts precise without requiring users to write out the derived mathematics of field projections and access composition. Infer routine summaries such as readable A/B/C with accepted writes B rather than making users annotate every expression as A | var B | C.

This goal does not hide the explicit var receiver that asks for caller-location access. It concerns derived type structure and presentation, rather than eliminating the keyword from function headers. Hiding the mathematical notation must not discard the distinctions between readable values, accepted replacements, and mutable payloads.

## Already implicit in ordinary declarations

```text
var value: A | B = new_A();
value = new_B();
```

This binding already accepts both replacement types; users need not write var (A | B) again. Its inferred var summary describes the operations permitted by the declaration rather than adding another mandatory annotation.

Likewise, a field read through P | Q already derives its common contract from the two field declarations. Neither the parent union nor the field use needs a user-written var keyword merely to compute that contract.

## Explicit var receivers stay visible

The selected caller-location behavior remains expressible with an explicit var parameter:

```text
replace := fn(target: var (A | B)) {
    target = new_B()
}
```

The function explicitly requests a caller location that accepts A or B. The compiler can derive this contract's detailed access summary without requiring another annotation at every use.

Caller replacement requires an explicit grant such as replace(var value). The location must already permit replacement; see [caller grants](caller-mutation-grants.md).

## Local implementation versus caller contract

The earlier fn(var target: T) substitution was not selected. Local rebinding is an implementation detail: write var target := target inside the body instead. The subsequently selected fn(target: var T) describes caller replacement, which is observable and must remain in the signature. These two placements are not synonyms.

The later local-only var parameter proposal is also retired. Use ordinary declarations and sequential shadowing in the body. The [parameter-permission review](parameter-permissions.md) separates local rebinding, held-data mutation, and caller-location replacement.

## Preserve restricted field writes

Suppose P.field accepts A | B while Q.field accepts C | B. The common projection can read A/B/C and accept only B. Users should receive a concrete diagnostic, such as:

```text
This field accepts B on every possible parent.
The operation may assign A or C, which some parents reject.
```

A parameter requiring var (A | B | C) promises the callee permission to replace with any declared member. It cannot accept that restricted field merely because the derived var summary is hidden. A function implementation that currently writes only B does not automatically narrow its published replacement contract.

The mathematical contract A | var B | C describes the more precise requirement. Prefer inference or an accessible explanation for routine use. Whether advanced APIs can explicitly write such mixed contracts or name them through aliases remains open; retaining a simple var receiver does not settle every advanced type expression.

## Tooling and teaching

Teach read-only defaults, var replacement, and mut data updates before the derived access model. Show ordinary errors in terms of the binding, field, and rejected replacement. Advanced diagnostics can expose readable and accepted-write sets on demand.

Hiding derived type-structure terminology must not hide observable mutation or caller replacement. Var signatures and eventual call syntax still need a clear effect contract. No runtime cost or performance improvement follows merely from omitting a mathematical annotation.

## Recommendation and remaining decisions

Keep explicit caller-location receivers and infer derived access summaries. Explicit mut/var call grants are selected; local-only var parameter headers are retired. Combined payload/replacement permissions, advanced partial-write annotations, complete compatibility, and alias/lifetime rules remain open.

Related: [var parameters](slot-parameters.md), [var qualifier](slot-access-qualifier.md), [mut placement](mut-qualifier-placement.md), [mutability](mutability.md), [functions](functions.md), and [tooling](tooling-and-learning.md).
