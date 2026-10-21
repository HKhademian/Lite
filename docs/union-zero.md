# Zero values of plain unions

Status: **open review, 2026-10-21**. Universal valid all-zero initialization and order-independent plain-union identity are selected. The user explicitly confirms zeroing all union storage bytes and requests size(A | B) = max(size(A), size(B)). That exact total-size requirement conflicts with general active-member identity unless another representation or semantic rule supplies the missing information. Total versus payload size and zero-member meaning remain unresolved.

## Concrete case

```text
value := if number_mode {
    7
} else if text_mode {
    "ready"
}
```

Selected branch inference gives T = Int | String, and the missing-else path supplies zero(T). Its exact active member remains unresolved when neither condition matches. An explicit final else can supply a known result now, but requiring one everywhere would not define zero for stored unions or zero-result callables.

## User's storage rule and the remaining conflict

The user specifies:

```text
size(A | B) = max(size(A), size(B))
zero(A | B) = zero every byte of that storage
```

Zeroing every byte is confirmed and agrees with universal zero initialization. It does not by itself select the active member, or decide whether a zero state is one member or a separate state. The preceding question about that semantic boundary therefore remains unanswered.

The size formula is recorded as requested. Do not silently reinterpret size as payload size, promise a complete implementation, or add an unmentioned tag allocation. Under the total inline-size reading, it cannot hold for every union while preserving all member values and their active nominal identities.

For a concrete capacity argument, suppose A and B each occupy one byte and each admits all 256 bit patterns. Their identities remain distinct, so A | B must distinguish 512 values: A's 256 and B's 256. One byte has only 256 states. At least nine bits of information are needed; an independently stored byte-addressed value needs more than one byte unless information lives elsewhere. Zero(A) and zero(B) having the same payload bytes is one collision, not the entire issue.

Possible directions to clarify:

- If max size describes only the overlapping payload region, preserve it as the payload goal and separately account for active-member information, alignment, and padding. Exact total storage is not generally payload size plus one byte; it depends on the layout contract.
- If max size is a strict total-size guarantee, some other guarantee must change or additional information must live elsewhere. An untagged interpretation cannot generally recover the stored member from overlapping bit patterns. External metadata has storage, copying, aliasing, and cleanup costs and is not selected by the formula.
- Spare bit patterns can encode the member for some unions; static knowledge can eliminate member information in some uses. Neither technique proves a universal max-size representation for arbitrary independently stored unions. Conditional provenance cannot recover an unknown member after arbitrary storage and transfer unless it is preserved as information.

No direction is selected. All-zero bytes remain a valid value, but the interpretation of those bytes and the complete union representation still need a contract.

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
