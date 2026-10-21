# Zero values of plain unions

Status: **metadata plus overlapping payload model clarified by the user, 2026-10-21; zero must be a listed member, exact member choice remains open**. The full value includes member-identification metadata alongside a C-style payload union. Max-member size describes payload capacity, not the total wrapper. Zero initialization clears metadata and payload; zero metadata must identify one listed member, but which member it selects remains unresolved. Exact metadata format, alignment, ABI, and optimizations are not selected.

## Current storage model

The user's latest sketch is conceptual C-style pseudocode:

```text
struct AB {
    metadata;
    union {
        A a;
        B b;
    }
}
```

Metadata carries the information needed to identify the active member. The payload members overlap. Thus payload capacity is max(size(A), size(B)); total storage also accounts for metadata, alignment, and padding. This is compatible with selected active-member identity and checked narrowing. It does not require boxing or a separately allocated metadata table.

All-zero initialization clears the complete value, including metadata. The metadata's zero pattern must identify one listed member; which member is not yet decided. Member numbering, metadata width/position, ownership/drop support, and union-zero selection remain open. This is a conceptual representation direction, not a fixed foreign ABI or a prohibition on equivalent optimized layouts.

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

The earlier shorthand was size(A | B) = max(size(A), size(B)), with every byte zeroed. The later metadata-wrapper sketch above resolves the payload-versus-total ambiguity: max size applies to the overlapping payload, while metadata is part of the full value. The earlier concern about fitting arbitrary active identity into only the payload bytes no longer applies to this clarified model.

For historical context, two distinct one-byte member types with 256 valid values each require 512 distinguishable typed values. A one-byte payload alone cannot encode that distinction; the user's wrapper provides the missing member information. Exact total layout remains a separate design task.

## Clarification: the user means C union storage

The user clarifies the intended mental model with:

```c
union AB {
    A a;
    B b;
};
```

This describes overlapping, untagged storage: the members share their starting address, and writing a member overwrites the shared region. The object must be large and aligned enough for every member; alignment/padding means the C standard does not universally guarantee the exact max-size equation. No separate runtime discriminator is automatically stored by a C union.

The member access `u.a` names the interpretation; it is not a test proving that A was last stored. C does not provide a general runtime question equivalent to LiteScript's selected `if value: A` for such a union. Access through another member has C-specific representation and validity rules; it must not be described as generally safe typed narrowing. Zeroing the shared bytes likewise does not record which member was written. C initialization rules and LiteScript's universal valid all-zero rule are separate contracts.

This untagged example was followed by the metadata-wrapper sketch above. The wrapper reconciles overlapping payload storage with LiteScript's selected active-member identity, checked narrowing, and exhaustive type matching.

The current direction is metadata plus overlapping payload. Earlier suggestions to drop type tests or add a separate raw-union feature are unselected alternatives. The user has not selected unsafe reads, a fixed tag encoding, or external metadata allocation.

Sources checked 2026-10-21: [Microsoft's C union storage documentation](https://learn.microsoft.com/en-us/cpp/c-language/storage-of-unions?view=msvc-170) describes shared addresses and overwritten storage. Its [x64 union layout specification](https://learn.microsoft.com/en-us/cpp/build/x64-software-conventions?view=msvc-170#x64-aggregate-and-union-layout) explicitly accounts for alignment padding. The [C working draft N3550](https://www.open-std.org/JTC1/SC22/WG14/www/docs/n3550.pdf), section 6.7.3.2, specifies storage sufficient for the largest member rather than a runtime discriminator.

## Selected membership of union zero

The user rules out a zero value outside the listed alternatives. For distinct normalized member types A and B:

```text
x := zeroOf(A | B)
/* Static type: A | B; active member: exactly one of A or B. */
```

The zeroOf spelling illustrates the user's question; it does not select a new standard-library function or override existing zero-initializer syntax.

Zero metadata must identify a valid listed member, with its zero payload. A match covering A and B therefore remains exhaustive, including for a zero-initialized union. A hidden none/empty state, invalid tag, or state matching several active member identities is rejected. An explicitly listed optional type or Unit remains an ordinary allowed member; this rule introduces no additional absence alternative.

This selects the membership boundary, not the chosen member. It is not yet correct to claim that zero(A | B) is specifically A or specifically B. A language-defined choice must make the complete all-zero representation valid while remaining consistent across equivalent order-independent union types. A runtime panic on reading zero would not satisfy that requirement.

The earlier proposal for a distinguished zero state outside the alternatives is not chosen. Clearing bytes alone is insufficient until the metadata's zero pattern is assigned a listed member.

## Member-selection directions still to compare

With the listed-member boundary selected, a member-selection rule is still required:

- Canonical selection from normalized type identities. Preserve A | B = B | A and choose the same member zero for equivalent unions. A complete rule must handle arbitrary nominal records, aliases, nesting, and generic instantiations. Compiler discovery/link order or an undocumented hash is not a language contract. A fixed priority such as Unit before Int before String would still need a complete ordering for all other types, and adding a new member could change the zero member.
- Explicit zero-member designation. Let a programmer declare the zero member for a union. A declaration-only mechanism does not cover automatically inferred or inline unions by itself. Conflicting designations through transparent aliases of the same union need resolution; treating the designated zero as part of identity or introducing a nominal wrapper would change the model. Ordinary declared defaults cannot silently replace the all-zero mapping, because zero initialization bypasses defaults.
- Source-ordered union identity/defaults. Pick the first member's zero, as in some reference languages. This is simple to explain but would require revisiting selected order-independent identity and normalization. The same semantic union cannot acquire different zero values merely because an alias writes its members in another order.

No specific member-selection policy is selected yet. Compare concrete policies for which listed member zero metadata identifies. Rejecting zero construction for some unions would contradict selected universal zero initialization rather than solve its mapping.

## Constraints already selected

Every type has a valid all-zero value. Plain unions ignore order, flatten nested unions, and eliminate exact duplicates after alias resolution. Equivalent type identities must have one coherent zero mapping. Option and Result retain their own boundaries: zero(Option<T>) is .None, while zero(T ! E) is .ok(zero(T)). Neither mapping defines which member a plain A | B selects. This review does not change those decisions or introduce a nullable pointer feature.

The expanded [modern-language storage comparison](union-storage-reference-comparison.md) covers Rust, Zig, Odin, V, and C++, including raw versus tagged constructs, layout guarantees, and zero/default differences.

## Modern reference languages

Checked 2026-10-21:

- [Odin unions](https://odin-lang.org/docs/overview/#unions) normally have nil as their zero value. Its #no_nil union uses the first variant as its default type; #shared_nil is a separately declared policy for variants with nil values. These are explicit design alternatives, not one universal union behavior.
- [Rust enum defaults](https://doc.rust-lang.org/stable/error_codes/E0665.html) require a designated unit variant for derived Default, or a manual implementation for a payload variant. Default is not a guarantee that arbitrary zero-filled storage is valid, and these nominal enums do not solve LiteScript's inferred order-independent unions directly.
- [C++ variant default construction](https://eel.is/c++draft/variant.ctor) value-initializes its first alternative when that alternative permits default construction. Its ordered alternatives and default-construction eligibility differ from LiteScript's selected rules.

Related: [universal zero](zero-initialization.md), [union normalization](union-normalization.md), and [branch-result inference](branch-result-inference.md).
