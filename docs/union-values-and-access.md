# Union values and access contracts

Status: **historical design investigation dated 2026-10-18; the canonical replacement marker is now var**. Common field read/write safety is selected separately. Explicit access types, their spelling, and their first-class status remain proposals; slot is retired as a source keyword.

## The apparent discrepancy

A standalone variable declared C | D | E can accept each member. A field read through P | Q can also produce C | D | E while accepting only C on assignment:

```text
P := record { field: C | D; }
Q := record { field: C | E; }
```

The union of read results describes possible values. It does not describe all allowed writes into the selected underlying field. Treating the read type as the full storage contract loses information.

## Two compositions, one union operation

The following is mathematical explanatory notation, not selected LiteScript type syntax. Slot<T> means a storage location that can read and write T, subject to permissions:

```text
Slot<A | B>          /* one slot declared to accept either member */
Slot<A> | Slot<B>    /* a slot of A or a slot of B; target not known */
```

Both can produce A | B when read. Only the first generally accepts either A or B on a write. The second must preserve the selected slot's original restriction. There is no general equality between these two type expressions.

For the overlapping example:

```text
Slot<C | D> | Slot<C | E>

readable values:  C | D | E
writable values:  C
```

The names and notation explain static access, not pointer layout, allocation, or ownership. For exact disjoint alternatives, write acceptance corresponds to the common members of the target field types. No shared member means no ordinary value can be written without narrowing; a public never type is unnecessary to express that diagnostic.

## Proposed visible distinction

The selected [immutability-by-default goal](immutability-by-default.md) places readable access at the baseline and writable access behind an explicit capability. That direction is established; the public spelling of access contracts below remains a proposal.

Keep a value type and an access contract as separately describable concepts:

- **Value type:** what kind of value can be produced or stored in an independently declared slot.
- **Access contract:** what this particular place or view permits reading and writing, including permissions.

For example, an IDE could show the inferred contract for parent.field as:

```text
read:  C | D | E
write: C
```

This is diagnostic notation, not a declaration grammar. A standalone var value: C | D | E has the same value type for reads and whole-binding writes. An inferred projected place may have different contracts. A read-only view has no write permission; that is separate from whether any value type would satisfy a hypothetical write.

If explicit annotations are useful at API boundaries, they could name read and write types independently. An access value with such an annotation would need defined ownership, lifetime, and alias behavior. Whether this deserves a new keyword, a library abstraction, or only compiler/tooling presentation is still open.

## Why not introduce a second union operator immediately?

The difference comes from combining access with union, rather than two contradictory meanings of C | D | E. Keeping | as the union of value possibilities preserves normalization and ordinary assignments. Explicit read/write contracts can expose the additional information without changing that algebra.

An intersection of accepted value sets describes the all-target write requirement mathematically. A public intersection type operator would be a larger feature, involving nominal types, interfaces, refinements, and inhabitation. This investigation does not select it merely to spell the write check.

## Information and correlations

Reading parent.field into an independently declared variable gives that new slot its own declared storage type, under the eventual copy/move/borrow rules. It does not give a writable alias to the original field. Any alias-preserving operation must retain the source target's constraints.

The pair of read/write types alone does not retain the full relation between the active parent and its field. Consequently, reading a value then writing it back is not established solely by those two types. A future proof of a stable same target and unchanged value could justify more cases; it must not assume that arbitrary effects preserve the parent or target.

## Reference comparison

TypeScript exposes separate getter and setter types. Since 5.1, explicitly annotated accessor pairs may have unrelated read and write types. This demonstrates a visible split, although accessors may execute conversions or other code; LiteScript's direct-field projection introduces no setter or conversion. Source: [TypeScript unrelated getter/setter types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html#unrelated-types-for-getters-and-setters).

Kotlin distinguishes producers (out) from consumers (in) through variance and type projections. That is a generic compatibility mechanism, not direct syntax for LiteScript's inferred field contract. Source: [Kotlin generics and projections](https://kotlinlang.org/docs/generics.html).

Rust makes mutable references invariant in the referenced type, while shared references are covariant in that type. Its reference rules illustrate why widening readable values cannot automatically grant writes through the same storage. Rust's subtype relationships and ownership model are not selected for LiteScript by this analogy. Source: [Rust subtyping and variance](https://doc.rust-lang.org/reference/subtyping.html).

## Recommendation and remaining decisions

The subsequent [qualified access-summary proposal](access-union-qualifiers.md) explores A | mut B | C as a compact readable/writable contract. It distinguishes the merge of complete access paths from ordinary union flattening and keeps payload mutation separate from replacement permissions. The notation remains unselected.

The later [replacement qualifier and grouped distribution](slot-access-qualifier.md) use canonical var, replacing the intermediate slot spelling. A | var B | C accepts B; var (A | B) is equivalent to var A | var B within one complete contract. This marker describes accepted replacements and is not the abstract Slot<T> constructor used earlier to illustrate separate storage locations. A var binding of A | B accepts both replacements. Full contract declaration grammar and access-value permissions remain open; see [var access](var-access-qualifier.md).

Recommend one value-union operation plus separately visible access contracts. Start with precise diagnostics and inferred contracts; consider explicit API notation alongside references, properties, and parameter passing rather than selecting an isolated operator now.

Decide whether users can name/pass these access views, how read/write contracts appear in signatures, which correlations the compiler tracks, and how access qualifiers compose with var, mut, ownership, and methods. These choices remain open.

Related: [field reads](union-field-reads.md), [field writes](union-field-writes.md), [mutability](mutability.md), [record identity](record-type-identity.md), and [type inference](types-and-inference.md).
