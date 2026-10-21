# Zero values of plain unions

Status: **open review, 2026-10-21**. Universal valid all-zero initialization and order-independent plain-union identity are selected. The active value of a zero-initialized multi-member union is not selected.

## Concrete case

```text
value := if number_mode {
    7
} else if text_mode {
    "ready"
}
```

Selected branch inference gives T = Int | String, and the missing-else path supplies zero(T). Its exact active member remains unresolved when neither condition matches. An explicit final else can supply a known result now, but requiring one everywhere would not define zero for stored unions or zero-result callables.

## First boundary to choose

Recommendation: zero(A | B) should hold the zero value of exactly one listed member, preserving the ordinary tagged-union model. A match covering A and B remains exhaustive, including for a zero-initialized value. No additional empty, absent, invalid, or multi-active union state would be introduced. This boundary is a proposal, not a completed member-selection rule.

The alternative is a distinguished valid zero state outside the listed alternatives. This can simplify zero-filled representation, but then A and B no longer cover every value of A | B. Matching, narrowing, common field reads, equality, and cleanup would need rules for that state. Giving it another name would not remove that semantic cost. A shared zero that matches several members is another change to the tagged-union model; matching order and member identity would need a separate contract.

## Member-selection directions still to compare

If the listed-member boundary is selected, at least one further rule is required:

- Canonical selection from normalized type identities. Preserve A | B = B | A and choose the same member zero for equivalent unions. A complete rule must handle arbitrary nominal records, aliases, nesting, and generic instantiations. Compiler discovery/link order or an undocumented hash is not a language contract. A fixed priority such as Unit before Int before String would still need a complete ordering for all other types, and adding a new member could change the zero member.
- Explicit zero-member designation. Let a programmer declare the zero member for a union. A declaration-only mechanism does not cover automatically inferred or inline unions by itself. Conflicting designations through transparent aliases of the same union need resolution; treating the designated zero as part of identity or introducing a nominal wrapper would change the model. Ordinary declared defaults cannot silently replace the all-zero mapping, because zero initialization bypasses defaults.
- Source-ordered union identity/defaults. Pick the first member's zero, as in some reference languages. This is simple to explain but would require revisiting selected order-independent identity and normalization. The same semantic union cannot acquire different zero values merely because an alias writes its members in another order.

No member policy is recommended yet. First choose whether zero remains an existing member; then compare concrete policies. Rejecting zero construction for some unions would contradict selected universal zero initialization rather than solve its mapping.

## Constraints already selected

Every type has a valid all-zero value. Plain unions ignore order, flatten nested unions, and eliminate exact duplicates after alias resolution. Equivalent type identities must have one coherent zero mapping. Option and Result retain their own boundaries: zero(Option<T>) is .None, while zero(T ! E) is .ok(zero(T)). Neither mapping defines which member a plain A | B selects. This review does not change those decisions or introduce a nullable pointer feature.

## Modern reference languages

Checked 2026-10-21:

- [Odin unions](https://odin-lang.org/docs/overview/#unions) normally have nil as their zero value. Its #no_nil union uses the first variant as its default type; #shared_nil is a separately declared policy for variants with nil values. These are explicit design alternatives, not one universal union behavior.
- [Rust enum defaults](https://doc.rust-lang.org/stable/error_codes/E0665.html) require a designated unit variant for derived Default, or a manual implementation for a payload variant. Default is not a guarantee that arbitrary zero-filled storage is valid, and these nominal enums do not solve LiteScript's inferred order-independent unions directly.
- [C++ variant default construction](https://eel.is/c++draft/variant.ctor) value-initializes its first alternative when that alternative permits default construction. Its ordered alternatives and default-construction eligibility differ from LiteScript's selected rules.

Related: [universal zero](zero-initialization.md), [union normalization](union-normalization.md), and [branch-result inference](branch-result-inference.md).
