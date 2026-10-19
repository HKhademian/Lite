# Keep derived slot summaries implicit

Status: **scope clarified by the user, 2026-10-19**. Hide derived type-structure summaries such as A | slot B | C wherever possible. Explicit slot receivers in function signatures are retained. The proposed substitution of var parameters for caller replacement was based on an overbroad reading of this goal and is rejected.

## Goal

Keep writable-slot contracts precise without requiring users to write out the derived mathematics of field projections and access composition. Infer routine summaries such as readable A/B/C with accepted writes B rather than making users annotate every expression as A | slot B | C.

This goal does not hide the explicit slot receiver that asks for caller-location access. It concerns derived type structure and presentation, rather than eliminating the keyword from function headers. Hiding the mathematical notation must not discard the distinctions between readable values, accepted replacements, and mutable payloads.

## Already implicit in ordinary declarations

```text
var value: A | B = new_A();
value = new_B();
```

This binding already accepts both replacement types; users need not write slot (A | B) again. Its inferred slot summary describes the operations permitted by the declaration rather than adding another mandatory annotation.

Likewise, a field read through P | Q already derives its common contract from the two field declarations. Neither the parent union nor the field use needs a user-written slot keyword merely to compute that contract.

## Explicit slot receivers stay visible

The selected caller-location behavior remains expressible with an explicit slot parameter:

```text
replace := fn(target: slot (A | B)) {
    target = new_B()
}
```

The function explicitly requests a caller location that accepts A or B. The compiler can derive this contract's detailed access summary without requiring another annotation at every use.

The exact call-site syntax remains open. Retaining the receiver spelling does not silently select an unmarked call or another argument marker.

## Rejected receiver substitution

The previous version of this document proposed fn(var target: T) as a replacement for a slot receiver. The user clarified that the goal did not request this substitution. Do not treat var parameters as caller-location receivers or migrate slot headers to that form.

Ordinary var parameters may instead describe local rebinding if that feature is selected. This remains a separate proposal. The [parameter-permission review](parameter-permissions.md) explains local var, held-data mut, and caller-location slot without conflating them.

## Preserve restricted field writes

Suppose P.field accepts A | B while Q.field accepts C | B. The common projection can read A/B/C and accept only B. Users should receive a concrete diagnostic, such as:

```text
This field accepts B on every possible parent.
The operation may assign A or C, which some parents reject.
```

A parameter requiring slot (A | B | C) promises the callee permission to replace with any declared member. It cannot accept that restricted field merely because the derived slot summary is hidden. A function implementation that currently writes only B does not automatically narrow its published replacement contract.

The mathematical contract A | slot B | C describes the more precise requirement. Prefer inference or an accessible explanation for routine use. Whether advanced APIs can explicitly write such mixed contracts or name them through aliases remains open; retaining a simple slot receiver does not settle every advanced type expression.

## Tooling and teaching

Teach read-only defaults, var replacement, and mut data updates before the derived access model. Show ordinary errors in terms of the binding, field, and rejected replacement. Advanced diagnostics can expose readable and accepted-write sets on demand.

Hiding derived type-structure terminology must not hide observable mutation or caller replacement. Slot signatures and eventual call syntax still need a clear effect contract. No runtime cost or performance improvement follows merely from omitting a mathematical annotation.

## Recommendation and remaining decisions

Keep explicit slot receivers and infer derived access summaries. Decide the optional local-var parameter feature, combined payload/replacement permissions, call-site visibility, advanced partial-write annotations, complete compatibility, and alias/lifetime rules separately.

Related: [slot parameters](slot-parameters.md), [slot qualifier](slot-access-qualifier.md), [mut placement](mut-qualifier-placement.md), [mutability](mutability.md), [functions](functions.md), and [tooling](tooling-and-learning.md).
