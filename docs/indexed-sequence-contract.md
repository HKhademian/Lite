# A short complete indexed-sequence contract

Status: **next-step proposal, 2026-10-19; no bracket grammar selected**. This defines the behavior a convenient [T] signature could promise after the user's requirement that library capabilities remain visible in source. It is a candidate contract, not an implementation, owner representation, or revision of generic syntax.

## Indexable alone is not the whole sequence

A general lookup operation can accept a key such as a String or an enum value. Its successful result and failure policy belong to that lookup contract. Merely supporting brackets does not imply integer positions, traversal, a count, insertion order, or contiguous storage.

The proposed ordinary sequence combines a useful subset into one visible standard contract. Beginners can use its shorthand without separately listing each underlying interface. More general library contracts remain available when the complete bundle is unnecessary.

## Proposed readable [T]

A complete readable indexed-sequence contract would guarantee:

- Elements with read value type T and the access/lifetime rules of the supplied provider.
- A finite exact current element count, available without enumerating the elements.
- Zero-based logical positions from zero up to, excluding, that count.
- Traversal following the same positional order, retaining repeated occurrences.
- Supported positional reads under the selected bounds-failure policy.

The proposed contract includes a cheap count and constant-time positional reads; the precise complexity law and index/count integer representation need confirmation. It would admit ordinary array/list/slice providers and other implementations satisfying those guarantees. It need not admit linked structures whose indexing requires traversal; weaker traversal contracts can still accept them.

It would not promise contiguous storage, growth, ownership, sorted values, uniqueness, deep copying, or an immutable snapshot against independently permitted external changes. The eventual borrow/stability rules must preserve the validity of a read or traversal during its allowed use.

```text
/* Proposed public contract; length spelling is illustrative. */
first := fn(values: [Int]): Int {
    values[0]
}

show := fn(values: [Int]) {
    loop values as value { print(value); }
}
```

Both headers expose the same complete input requirement. This intentionally restricts show more than a traversal-only implementation needs; a general library version should use the separately named Iterable contract instead. The compiler must not silently weaken the annotated requirement merely because show does not index.

The first example assumes the currently recommended asserting bounds policy. Empty input would cause a safe bounds fault; it does not create an undeclared returned Result. Both that default and the explicit checked operation remain under review.

## Writable refinement

The candidate mut [T] contract additionally requests permitted replacement of existing positional elements from a provider that actually supplies writable indexed access. The caller grants existing mut access explicitly. Mut does not fabricate a setter for a computed/read-only provider, and it does not grant growth or arbitrary structural changes.

Thus a sort could visibly require mut [T], while append would require a separate growth contract. Var on a local binding still permits whole replacement; received type-side var still follows the existing caller-location contract. Those permissions do not determine storage ownership or erase access compatibility checks.

## Size spellings to review separately

The user's [T; count] candidate could express a statically known extent, or could select an inline fixed-array storage type. Those are different guarantees and must not be silently interchanged. An extent-only contract could be supplied by a suitably proven view as well as an owner; inline storage determines layout and copying. Review those cases before assigning the spelling.

The [T;] candidate also needs a distinct semantic job before adoption. An omitted static extent does not automatically mean a slice, fixed runtime-sized owner, or growable list. Recommend leaving this form unassigned until that storage review is complete rather than adding punctuation that does not state an additional guarantee.

## Function contracts versus storage

For this proposal, [T] in a generic input describes what the function requires. It must not automatically mean a heap-boxed interface object. The static provider can retain its own representation under the proposed generic model.

Using the same contract in a record field, reassignable location, stored callback, or return still needs a representation rule. A capability set alone does not determine byte layout or justify copying an owner. The [function-signature review](collection-function-signatures.md) separates concrete, static-abstract, and explicit runtime-varying output models. Do not infer one of those representations merely from bracket appearance.

## Next decision

Review whether this complete indexed bundle is the desired beginner default, including its count and positional-access cost guarantees. Then choose whether [T; count] is an extent refinement or an owning inline array, and determine storage forms alongside the deferred generic/interface design.

Related: [capabilities](collection-capabilities.md), [signature ergonomics](collection-signature-ergonomics.md), [sequence families](sequence-types.md), [arrays](arrays.md), [slices](slices.md), and [bounds policy](checked-fault-policy.md).
