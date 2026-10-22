# A short complete indexed-sequence contract

Status: **[T] indexed-sequence direction accepted, 2026-10-19; full generic and protocol grammar deferred**. The shorthand exposes a complete indexed and iterable contract. Writable operations require mut access and an actual writable implementation. It does not select an owner representation.

## Indexable alone is not the whole sequence

A general lookup operation can accept a key such as a String or an enum value. Its successful result and failure policy belong to that lookup contract. Merely supporting brackets does not imply integer positions, traversal, a count, insertion order, or contiguous storage.

The accepted ordinary sequence combines a useful subset into one visible standard contract. Beginners can use its shorthand without separately listing each underlying interface. More general library contracts remain available when the complete bundle is unnecessary.

## Readable [T]

The complete readable indexed-sequence contract guarantees:

- Elements with read value type T and the access/lifetime rules of the supplied provider.
- A finite exact current element count, available without enumerating the elements.
- Zero-based logical positions from zero up to, excluding, that count.
- Traversal following the same positional order, retaining repeated occurrences.
- Supported positional reads under the selected bounds-failure policy.

The accepted bundle includes a cheap exact count and constant-time positional reads. The precise complexity law and index/count integer representation still need formalization. Ordinary array/list/slice providers can satisfy it; linked structures whose indexing requires traversal need a weaker traversal contract instead.

It would not promise contiguous storage, growth, ownership, sorted values, uniqueness, deep copying, or an immutable snapshot against independently permitted external changes. The eventual borrow/stability rules must preserve the validity of a read or traversal during its allowed use.

```text
/* Accepted input-contract direction; generic grammar is deferred. */
first := fn(values: [Int]): Int {
    values[0]
}

show := fn(values: [Int]) {
    loop values as value { print(value); }
}
```

Both headers expose the same complete input requirement. This intentionally restricts show more than a traversal-only implementation needs; a general library version should use the separately named Iterable contract instead. The compiler must not silently weaken the annotated requirement merely because show does not index.

The user accepts direct ordinary positional access: empty input faults safely instead of creating an undeclared Result. The later [shared recovery direction](expression-recovery.md) uses values[index] else { ... } for local typed-fault recovery. Full scope, fault typing, and transfer/cleanup still need specification.

## Contract versus storage layout

User clarification, 2026-10-22: this collection type describes a promise/API, not a concrete backing class or owner representation. Therefore the [T] contract alone has no single concrete storage layout. That does not mean its size is zero; a layout query requires a concrete provider or a separately specified erased-value representation.

A statically known provider retains its own layout under the proposed generic model. A future runtime-erased provider value would need its own explicit storage/dispatch contract; [T] does not silently select one. The contract declaration itself does not require a runtime object, container descriptor, or metadata dictionary.

Keep three questions separate: the collection capability type, the concrete value/provider implementing it, and a bracket literal constructing that value. An empty value or zero-element payload does not assign a layout to the abstract contract. Bare [] as a complete element-less type spelling is not selected by this clarification; the existing [T] direction still specifies the element contract. See [memory and performance](memory-and-performance.md#collection-contracts-do-not-select-a-layout).

## Writable refinement

The mut [T] refinement additionally requests permitted replacement of existing positional elements from a provider that actually supplies writable indexed access. The caller grants existing mut access explicitly. Mut does not fabricate a setter for a computed/read-only provider, and it does not grant growth or arbitrary structural changes.

Thus a sort could visibly require mut [T], while append would require a separate growth contract. Var on a local binding still permits whole replacement; received type-side var still follows the existing caller-location contract. Those permissions do not determine storage ownership or erase access compatibility checks.

## Underlying operation hooks

The user identifies get_index, set_index, and iterable as the underlying operation hooks:

- values[index] requests get_index for positional reads.
- values[index] = replacement requests set_index, requiring mut access and a provider that supports element replacement.
- loop values requests iterable and its traversal protocol.

These names describe the intended hooks; complete interface declarations, associated types, receiver signatures, and implementation syntax remain deferred. Merely defining a similarly named method does not establish conformance. Immutable [T] does not expose a writable operation just because the provider has one.

A setter must preserve the sequence's current length and positional structure. Push/pop are separate structural capabilities; see [end operations](sequence-end-operations.md). The exact count still needs its own query contract; get_index, set_index, and iterable alone do not imply cheap exact size.

General Indexable can use nonpositional keys and need not be iterable. The common hook vocabulary does not grant it all [T] laws or require every lookup to return the same failure channel. Bounds behavior remains independently under review.

## Size spellings to review separately

The user's [T; count] candidate could express a statically known extent, or could select an inline fixed-array storage type. Those are different guarantees and must not be silently interchanged. An extent-only contract could be supplied by a suitably proven view as well as an owner; inline storage determines layout and copying. Review those cases before assigning the spelling.

The [T;] candidate also needs a distinct semantic job before adoption. An omitted static extent does not automatically mean a slice, fixed runtime-sized owner, or growable list. Recommend leaving this form unassigned until that storage review is complete rather than adding punctuation that does not state an additional guarantee.

## Function contracts versus storage

In the accepted direction, [T] in a generic input describes what the function requires. It must not automatically mean a heap-boxed interface object. The static provider can retain its own representation under the proposed generic model.

Using the same contract in a record field, reassignable location, stored callback, or return still needs a representation rule. A capability set alone does not determine byte layout or justify copying an owner. The [function-signature review](collection-function-signatures.md) separates concrete, static-abstract, and explicit runtime-varying output models. Do not infer one of those representations merely from bracket appearance.

## Next decision

The indexed bundle is accepted. Next review growth/removal capabilities, then choose whether [T; count] is an extent refinement or an owning inline array. Storage forms, complete hook signatures, and generic/interface grammar remain separate decisions.

Related: [capabilities](collection-capabilities.md), [signature ergonomics](collection-signature-ergonomics.md), [sequence families](sequence-types.md), [arrays](arrays.md), [slices](slices.md), and [bounds policy](checked-fault-policy.md).
