# Named array segments in tuples

Status: **array-segment model and optional static extent selected in the 2026-10-25 discussion; current declarations remain tail-only**. Middle collectors and multiple stored segments are future discussion. This is design documentation, not parser/runtime verification.

## Element type and extent

The rest operator declares a named homogeneous array segment within a tuple. Its type entry uses ...name: T, with an optional ; C static extent. The surrounding tuple-entry syntax supplies the array meaning, so the element/extent portion needs no additional array brackets.

```text
General := type (...rest: Int);
Three := type (...rest: Int; 3);
```

...rest: T admits zero or more elements, each of type T, with no exact extent in that contract. ...rest: T; C requires exactly C elements and exposes an array member of type [T; C]. C must be a valid nonnegative compile-time extent under the fixed-array rules. It is an exact count, not a maximum, capacity, or runtime expression. There is currently one trailing declared segment; the label rest is ordinary and may be replaced by another name.

A runtime-known length does not imply growable storage. Count, readable/writable access, ownership, allocation, and lifetime are separate contracts. The exact standalone runtime-array spelling remains open; this decision does not adopt [T;] or the earlier placeholder [T; ...].

## Fixed rest is a grouped remainder

Rest describes grouping/collection, not an inherently unknown count. A general variadic signature accepts different counts across calls, while one particular construction or invocation can establish an exact count.

```text
fixed: [Int; 3] = [1, 2, 3];
y := (...rest = fixed);
/* inferred y: (...rest: Int; 3); y.rest: [Int; 3] */

runtime := read_numbers();
x := (...rest = runtime);
/* assuming a runtime-sized Int array: x: (...rest: Int) */

written: (...rest: Int; 3) = (...rest = fixed);
```

Without an expected destination overriding the result, named-tail construction retains an established fixed array extent in the inferred segment type. A runtime-sized source supplies the general segment contract. The source's current length being three does not by itself establish [Int; 3]. These inferred fixed/general segment types are distinct, and both can now be expressed in type declarations.

The existing explicit/expected type remains the reference contract. Writing (...rest: Int) requests a general segment; its missing count is not an instruction to infer a new ; C type from the literal. Stronger valid local construction facts may still support proofs or optimization without changing that declared contract. The existing (...rest:) form infers an omitted element type; this revision adds no new partial-extent or combined omitted-element/fixed-extent syntax. Full inference and compatibility across effects/API boundaries remain separate.

The type distinction is observable through the member contracts: a fixed segment exposes [T; C], including its selected literal numeric dot access; a general runtime-sized segment uses ordinary array brackets. No direct numeric tuple position for the segment is selected here. Passing through a general parameter guarantees only its declared contract; specialization must not make source validity depend on a particular caller's count.

## Grouping changes unpacking behavior

```text
ordinary := (rest = [2, 3, 4]);
grouped := (...rest = [2, 3, 4]);

one_item := (...ordinary);
/* one labeled array-valued component */

three_items := (...grouped);
/* three unnamed Int components */
```

An ordinary array-valued component stays one item when its containing tuple is unpacked. A declared segment emits each element as an unnamed item and omits the container label. Copying the tuple retains its stored grouping. A fixed extent therefore serves a real purpose even though it contributes no variable arity: named array access plus logical element emission. See [logical unpacking](tuple-unpacking.md).

The syntax always types each element, including tuple/array-valued elements:

```text
Arrays := type (...rest: [Int; 3]);
/* any count of elements, each a three-Int array */

TwoArrays := type (...rest: [Int; 3]; 2);
/* exactly two elements, each a three-Int array */
```

Neither form implicitly flattens the elements' nested arrays. Likewise, ...rest: EachRestType; C collects C intact EachRestType elements when that type is a tuple.

## Callable contracts expose the extent they guarantee

The segment model applies to callable input tuples as well as stored tuples. A general ...rest: Int accepts different counts; a written ...rest: Int; 3 requires exactly three Int inputs in that segment.

```text
sum_three := fn (...rest: Int; 3): Int {
    rest[0] + rest[1] + rest[2]
}

sum_three(1, 2, 3);     /* valid */
sum_three(1, 2);        /* rejected: too few elements */
sum_three(1, 2, 3, 4);  /* rejected: too many elements */
```

The full supplied composition must prove the exact extent as well as element types/access. A runtime arity check does not replace that proof. Defaults and direct named-tail supply keep their separately unresolved interactions; the suffix grants neither omission nor an implicit extra collector.

A parameter declared pack: (...rest: Int) exposes the general member contract, even when a caller supplies three elements. A parameter declared pack: (...rest: Int; 3) exposes [Int; 3] to its body. Compiler specialization may optimize either implementation but must preserve source validity under the declared contract. Passing through general interfaces does not promise preservation of stronger caller-local count facts.

## Storage and zero extents

A fixed segment's [T; C] member follows the selected inline fixed-array layout, with no array-specific runtime count field or header. A general runtime-length segment needs available count information; its exact descriptor, owner/view representation, allocation, and ABI remain open. Equal layout does not merge segment-bearing tuples with flat tuples or grant ownership, aliasing, free conversion, or zero-copy transport.

```text
empty: (...rest: Int; 0) = (...rest = []);
five_units: (...rest: Unit; 5) = (...rest = [(), (), (), (), ()]);
```

empty still has its declared rest member of type [Int; 0] and is not Unit. Explicit unpacking emits zero items. five_units has five semantic elements, zero element bytes, and a static count. Its explicit unpack emits five Unit items. By contrast, (...rest: Unit) accepts different counts whose runtime information belongs to the enclosing container. Zero size never erases grouping, count, evaluation, or required cleanup. See [Unit](unit.md#zero-storage-does-not-erase-shape) and [fixed-array layout](memory-and-performance.md#fixed-arrays-share-homogeneous-tuple-storage).

## Future middle collectors

The following is a **future extension example**, not an admitted current declaration:

```text
value: (:Int, ...mid: Int; 5, :Int, ...rest: Int) =
    (1, 2, 3, 4, 5, 6, 7, 8, 9);
/* first ordinary component = 1 */
/* value.mid = [2, 3, 4, 5, 6] */
/* second ordinary component = 7 */
/* value.rest = [8, 9] */
```

For positional inputs, five elements determine mid's boundary. Two ordinary components plus five middle elements require seven supplied values; the final general segment collects the remainder. Matching still needs the complete compile-time coverage/type/access proof. No runtime arity fallback is introduced. A middle fixed array has its normal fixed layout; this discussion adds no layout promise for future runtime-sized middle storage.

One runtime-sized middle collector followed only by a fixed suffix has a possible deterministic positional interpretation: reserve enough elements for the suffix and collect the intervening items into the middle array. This is a future matching direction, not a selected suffix-routing algorithm. Existing named replacement/routing, defaults, and pattern remainder rules are not extended by it.

Multiple runtime-sized collectors can leave boundaries underdetermined:

```text
/* future schema: (:Int, ...mid: Int, :Int, ...rest: Int) */
/* supplied values: (1, 2, 3, 4, 5) */

/* first = 1; mid = [];     second = 2; rest = [3, 4, 5] */
/* first = 1; mid = [2, 3]; second = 4; rest = [5] */
```

Both partitions satisfy the shown element types. A future design needs explicit boundaries, a deterministic policy, or rejection where the split is ambiguous. None is selected. Numeric tuple positions must also decide how segments participate in stored-component versus emitted-item numbering; value.mid[index] already has the clear named-array interpretation. General multi-segment type spread, collisions, construction, patterns, call routing, and grammar remain open.

The optional extent syntax therefore leaves middle collectors possible without enabling them now or selecting their partition/access rules.
