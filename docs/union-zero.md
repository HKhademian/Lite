# Zero values of plain unions

Status: **metadata plus overlapping payload model clarified by the user, 2026-10-21; zero must be a listed member, exact member choice remains open**. The full value includes member-identification metadata alongside a C-style payload union. Max-member size describes payload capacity, not the total wrapper. Zero initialization clears metadata and payload; zero metadata must identify one listed member, but which member it selects remains unresolved. Exact metadata format, alignment, ABI, and optimizations are not selected.

## Latest initialization-policy alternatives

The user now compares [leftmost-member construction, explicit initialization, and default-uninitialized union locals](union-initialization-policy.md). These remain open. An ordinary parameter can preserve a supplied active member. Leftmost source-directed construction can preserve order-independent type identity if separated from the complete all-zero representation; earlier claims that it must always change type identity were too broad. Default-uninitialized storage forbids even type tests until initialization; it is distinct from a readable tag-zero empty state. Declaration policy alone does not define universal union zero at other creation sites.

## Latest alternative under review

The user now proposes [empty union zero](union-empty-zero-proposal.md): tag zero means no active member, and both A/B type tests fail. This would replace the selected member-only zero boundary and remove the need to rank members for union zero. It remains an exploratory alternative; compare coverage, direct operations, Unit/Option/Result distinctions, and single-member normalization before adopting it. The selected rule below is retained pending that decision.

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

## Member-selection possibilities (open review)

All candidates must map the metadata's all-zero pattern to the chosen member and leave its payload zeroed. Selection can happen when the compiler forms the union type; no runtime search for a zero member is needed. The user selected canonical ordering as the direction to explore; the concrete ordering and complete member-selection contract remain open.

### 1. First written member

```text
zeroOf(A | B)  /* zero A */
zeroOf(B | A)  /* zero B */
```

This is easy to explain and gives authors control through ordering. It resembles C++ variant default construction and Odin's no-nil union default, although their default contracts are not LiteScript's universal bytewise zero.

As a type-defined complete all-zero mapping, this requires revisiting order-independent identity or defining an order-sensitive representation contract. As a source-directed construction/default rule, it can create different values of the same type if the compiler writes the chosen member tag; see the [construction-policy distinction](union-initialization-policy.md#leftmost-member-as-a-construction-rule). The same shared all-zero representation still cannot have different active-member meanings through reordered transparent aliases. Flattening nested unions, duplicates, and branch-result inference would need an ordered policy too; moving an arm could otherwise change a default. Do not quietly introduce declaration or compiler discovery order as a substitute.

### 2. Canonical order of normalized type identities

Define a language-specified order and choose the earliest member in that order. For illustration only, assume A ranks before B:

```text
zeroOf(A | B)  /* zero A */
zeroOf(B | A)  /* zero A */
```

This preserves order-independent identity, aliases, flattening, duplicate removal, and automatic inference without extra annotations. A compiler can assign the selected member the zero metadata encoding.

The choice can feel arbitrary to the author. A complete order must cover primitives, nominal types from different modules, anonymous/local type identities, and generic instantiations. Sorting short display names, using an undocumented hash, or relying on linking order is not a complete policy. Renaming/moving a nominal definition or adding a new earlier-ranked member may change the zero choice under the eventual key; stability boundaries need documentation. No concrete ordering algorithm is selected.

A preferred-category rule, such as Unit when explicitly present, then a fixed primitive ordering, is an extension of this option. It still needs a canonical fallback for arbitrary nominal members and must never add Unit to a union that did not list it. Size-based priority is another possible order, but needs tie-breaking and can make zero-member identity target-dependent; it is not recommended as the semantic foundation.

### 3. Explicit zero-member designation

A union contract declares which listed member is zero. Schematic example, with no syntax selected: AB admits A | B and designates A. Metadata zero then means A, and the payload is zero(A). This is visible and lets domain authors choose meaningful defaults.

Two declarations admitting the same A | B but choosing different zero members cannot remain interchangeable transparent aliases with one identical all-zero mapping. The designation must participate in a distinct contract/type identity, use a nominal wrapper, or be governed by one coherent shared policy. Required per-union declarations also fail to cover inline and automatically inferred unions without an additional fallback rule. Ordinary field/parameter default expressions cannot solve this, since bytewise zero bypasses declared defaults.

This option is useful for explicitly designed domain types, but is not a complete replacement for plain inferred-union zero selection by itself. Rust's named-enum Default selection is a precedent for author choice, not a direct solution to an order-independent inferred union or a promise of all-zero payloads.

## Unit priority (open review)

The first concrete canonical-order question is whether Unit ranks before every other member when it is explicitly present in the normalized union.

```text
zeroOf(Int | Unit)          /* Proposed: Unit */
zeroOf(Unit | Int)          /* Proposed: Unit */
zeroOf(String | Int | Unit) /* Proposed: Unit */
zeroOf(Int | String)        /* Still needs a different ordering rule */
```

Recommendation: prefer Unit when it is a listed member. It has one inhabitant and no payload information to choose, so all-zero metadata can identify that member while the payload storage stays zeroed. This introduces no runtime selection or new allocation. Exact layout and ABI remain separate.

Normalize transparent aliases and nested plain unions first. A transparent alias of Unit counts as Unit; an independently declared nominal empty record or an Option containing a None case does not become Unit. Unit priority never adds Unit to a union that did not list it, unwraps another type, or changes an explicitly stored Int zero into Unit.

Adding Unit to the set of allowed alternatives would make the expanded type's own zero Unit under this proposal. Membership and widening still preserve the source's active value; widening an Int zero to Int | Unit remains Int. Missing conditional else continues to use zero(T), and an explicit empty branch contributes Unit through the separately selected inference rule.

The alternative gives Unit no special priority and uses the future general ordering for every member. That avoids a dedicated preference but can select a payload-bearing member even when Unit is explicitly available. Neither choice settles Int versus String, arbitrary nominal-type keys, or other primitive priorities. No choice is selected yet.

Reference comparison checked 2026-10-21: C++ permits [monostate](https://eel.is/c++draft/variant.monostate) as a first alternative to make a variant default-constructible, and its [default constructor](https://eel.is/c++draft/variant.ctor) selects the first alternative. Unlike this LiteScript proposal, C++ does not promote monostate regardless of position. Rust's [derived enum Default](https://doc.rust-lang.org/std/default/trait.Default.html#enums) requires explicitly marking a unit variant; it does not automatically prefer one or guarantee an all-zero representation.

### More Unit-priority cases, requested by the user

The user keeps Unit priority open and requests more cases. The following compares Unit-first with a candidate order in which the indicated payload type ranks before Unit. The payload-first outcomes are illustrative competing policies, not the behavior of every order without Unit priority.

#### Explicit zero initialization versus an existing numeric zero

```text
empty: (Int | Unit)
explicit_zero: (Int | Unit) = 0
number := 0
present: (Int | Unit) = number
```

The first two select zero of the union under the existing typed-declaration initialization rules. Unit-first would make both Unit; ranking Int before Unit would make both Int(0), described here as a typed value rather than selected constructor syntax. Inferred number is Int, so present contains Int zero under either policy. That is ordinary member admission, not destination-type zero construction. This distinction follows from literal 0's contextual-zero meaning and should be visible in the decision.

#### Conditional fallback with a real Unit contributor

```text
value := if ready {
    7
} else if intentionally_empty {
    Unit
}
```

The inferred type is Int | Unit. On the unmatched path, Unit-first returns Unit; an Int-first ordering returns an Int zero. The ready branch remains Int(7) and the intentionally_empty branch remains Unit under both policies. No priority changes a value that an actual branch produced.

Contrast the already selected `if ready { 7 }`, which infers Int and returns zero(Int) when unmatched, with `if ready { 7 } else {}`, which infers Int | Unit and explicitly returns Unit when false. Their false outcomes are fixed by their branches/types, independently of how the union's own zero is chosen.

#### Unit alongside an explicit optional value

For Unit | Option<User>, Unit-first selects Unit. A policy placing Option<User> first selects that member's zero, .None inside Option<User>. Both are valid listed members, but their active types differ: a Unit match catches the former, and an Option<User> match catches the latter. Do not merge the states or infer that Option<User> is Unit. Generic angle-bracket notation remains explanatory under the existing generic-notation policy.

Likewise, Unit | (Int ! E) can distinguish Unit from an ordinary Result success containing Int zero. The selected zero-success mapping applies only after the Result member is selected; Unit priority would not enter that member or fabricate an error.

#### Adding Unit to an inferred result

Changing a String-only set of completion results to String | Unit by adding an empty branch changes the inferred type. Unit-first also changes the expanded type's own zero from empty String to Unit. Preferring String preserves empty String as that expanded union's zero, while retaining Unit as a possible explicit branch result. Both retain existing String values during widening. An explicit expected String result rejects the newly added Unit branch under either policy.

#### Transparent aliases and nominal empty records

A transparent alias of Unit remains Unit after normalization. A separately declared Empty record remains a nominal type even if it has no fields or ends up with no payload bytes. Unit-first would choose Unit for Empty | Unit; the rule alone says nothing about Empty | Int. A zero-sized-layout heuristic would be a different policy, with its own ties, target/layout dependencies, and identity questions.

#### What these cases establish

Unit-first makes union zero use the explicitly admitted no-payload alternative, but an explicit contextual 0 initializer may then contain Unit rather than a numeric zero. Payload-first retains a typed payload zero in those examples but needs the general order to select it. Neither is more valid, and neither is a physical zeroing shortcut: both can assign their chosen member the metadata zero pattern with the same conceptual storage shape. The decision is about observable default-member meaning. The recommendation to explore Unit-first remains provisional; the user has selected neither priority.

## Widening preserves values, not zero encoding

The selected widening rule retains the active member and payload. Suppose a canonical rule selects A for A | B. Widening zero(B) into A | B must still produce a B value, even though the destination's own zero is A. The widened B may therefore have nonzero metadata. If the source is itself a union, its discriminant may need remapping during widening.

Consequently, zero(source) widened to destination is not generally zero(destination). Demanding that equation for every source member would force both A and B to be the same active zero member, contradicting their preserved identities. This is not a new conversion exception: it follows from the already selected value-preserving membership/widening rules. See [union widening](union-widening.md).

## Chosen review direction and boundaries

The user selected exploring canonical ordering for plain inferred unions on 2026-10-21. Preserve the current order-independent identity and annotation-free inferred unions while comparing concrete member orders. This chooses the investigation direction, not a complete ordering algorithm. No primitive priority, Unit preference, alphabetic key, size priority, hash, or nominal-type tie-break is selected. Explicitly designed nominal types remain a possible separate mechanism for domain-chosen zero alternatives.

First-written-member and explicit designation remain comparison history rather than the current investigation direction; revisiting them would require their identity and inferred-union contracts. An extra none/invalid state, several active members at once, or rejection of zero construction is outside the selected contract.

## Constraints already selected

Every type has a valid all-zero value. Plain unions ignore order, flatten nested unions, and eliminate exact duplicates after alias resolution. Equivalent type identities must have one coherent zero mapping. Option and Result retain their own boundaries: zero(Option<T>) is .None, while zero(T ! E) is .ok(zero(T)). Neither mapping defines which member a plain A | B selects. This review does not change those decisions or introduce a nullable pointer feature.

The expanded [modern-language storage comparison](union-storage-reference-comparison.md) covers Rust, Zig, Odin, V, and C++, including raw versus tagged constructs, layout guarantees, and zero/default differences.

## Modern reference languages

Checked 2026-10-21:

- [Odin unions](https://odin-lang.org/docs/overview/#unions) normally have nil as their zero value. Its #no_nil union uses the first variant as its default type; #shared_nil is a separately declared policy for variants with nil values. These are explicit design alternatives, not one universal union behavior.
- [Rust enum defaults](https://doc.rust-lang.org/stable/error_codes/E0665.html) require a designated unit variant for derived Default, or a manual implementation for a payload variant. Default is not a guarantee that arbitrary zero-filled storage is valid, and these nominal enums do not solve LiteScript's inferred order-independent unions directly.
- [C++ variant default construction](https://eel.is/c++draft/variant.ctor) value-initializes its first alternative when that alternative permits default construction. Its ordered alternatives and default-construction eligibility differ from LiteScript's selected rules.

Related: [universal zero](zero-initialization.md), [union normalization](union-normalization.md), and [branch-result inference](branch-result-inference.md).
