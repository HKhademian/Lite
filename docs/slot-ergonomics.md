# Keep slot contracts out of ordinary code

Status: **minimizing user-visible slot syntax selected as an ergonomics goal, 2026-10-19**. Inferred field access and existing var/mut declarations remain established. Using var parameters for caller replacement is a new proposal; it is not yet selected over the earlier local-rebinding interpretation.

## Goal

Keep writable-slot contracts precise while avoiding a requirement that beginners or ordinary application code learn or repeat slot annotations. Infer routine access contracts and express common permissions through familiar declarations. Expose advanced replacement annotations when they provide useful precision at an API boundary.

The internal concept remains important to type checking. Hiding its name must not discard the distinctions between readable values, accepted replacements, and mutable payloads.

## Already implicit in ordinary declarations

```text
var value: A | B = new_A();
value = new_B();
```

This binding already accepts both replacement types; users need not write slot (A | B) again. Its inferred slot summary describes the operations permitted by the declaration rather than adding another mandatory annotation.

Likewise, a field read through P | Q already derives its common contract from the two field declarations. Neither the parent union nor the field use needs a user-written slot keyword merely to compute that contract.

## Proposed common parameter forms

Use the same distinction between name replacement and held-data mutation in signatures:

```text
fn(value: T)           /* read-only input; ordinary passing still open */
fn(value: mut T)       /* writable held-data access */
fn(var value: T)       /* proposed: replace caller location */
fn(var value: mut T)   /* proposed: caller replacement and data mutation */
```

The last two parameter forms would request temporary caller-location access with full replacement compatibility for the declared value type. Slot is then a derived contract rather than required surface syntax for the common case.

```text
replace := fn(var target: A | B) {
    target = new_B()
}
```

In this proposal, target denotes the supplied caller location and assignment writes back. This preserves the already selected temporary received-slot behavior while offering a different public spelling. It introduces no public pointers or escaping reference values.

The exact call-site syntax remains open. This proposal does not silently select an unmarked call or substitute another keyword at the call site.

## One meaning for a var parameter

The earlier [slot parameter review](slot-parameters.md) considered var parameters as locally reassignable value bindings. The new proposal gives that same parameter syntax caller-location semantics instead. Both cannot be accepted as context-dependent readings of the same declaration.

If caller-location semantics is chosen, code needing a local reassignable working value would declare a separate var local from its input, subject to the eventual copy/move rules. Ordinary value passing, copying/moving, and mutable-data passing remain separate contracts. No automatic expensive copy or clone is selected.

## Preserve restricted field writes

Suppose P.field accepts A | B while Q.field accepts C | B. The common projection can read A/B/C and accept only B. Users should receive a concrete diagnostic, such as:

```text
This field accepts B on every possible parent.
The operation may assign A or C, which some parents reject.
```

A proposed var target: A | B | C parameter promises the callee permission to replace with any declared member. It cannot accept that restricted field merely because ordinary slot terminology is hidden. A function implementation that currently writes only B does not automatically narrow its published replacement contract.

An advanced contract such as A | slot B | C can express the more precise requirement if the eventual public type grammar admits it. Named access contracts or other concise forms remain alternatives. Whether to retain the literal slot keyword in user-written signatures, limit it to advanced annotations, or show it only in tooling remains open.

## Tooling and teaching

Teach read-only defaults, var replacement, and mut data updates before the derived access model. Show ordinary errors in terms of the binding, field, and rejected replacement. Advanced diagnostics can expose readable and accepted-write sets on demand.

Hiding implementation terminology must not hide observable mutation or caller replacement. Signatures and eventual call syntax still need a clear effect contract. No runtime cost or performance improvement follows merely from omitting a keyword.

## Recommendation and remaining decisions

Recommend the four common parameter forms above as the next proposal, with slot contracts inferred underneath. Decide caller-location versus local-value var parameters explicitly before migrating signatures. Then decide call-site visibility, rare restricted-write annotations, complete compatibility, and alias/lifetime rules.

Related: [slot parameters](slot-parameters.md), [slot qualifier](slot-access-qualifier.md), [mut placement](mut-qualifier-placement.md), [mutability](mutability.md), [functions](functions.md), and [tooling](tooling-and-learning.md).
