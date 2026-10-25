# Tuple array segments and pattern rest: re-evaluation

Status: **review documented at the user's request, 2026-10-25; accepted segment/access/unpacking rules retained, pattern collection reopened**. This review retracts the assistant's inference that the latest examples had already selected universal array-producing pattern rest. It records the user's requested behavior without claiming that its full semantics are settled. There is no LiteScript parser/runtime verification.

## Keep the four operations distinct

A stored tuple schema describes ordinary components and named homogeneous array segments. Each segment occupies one stored position, regardless of its element count. Member access selects a stored component. Expression unpacking emits logical items. Destination construction routes those items and packs matching elements into declared segments. Pattern capture selects components and collects a remainder under its own rule; its meaning must be selected explicitly rather than borrowed automatically from expression spread.

```text
value: (head: Int, ...rest: Int; 3) = (10, 20, 30, 40);
/* stored grouping: (head = 10, ...rest = [20, 30, 40]) */
value.0;     /* same member as value.head: 10 */
value.1;     /* same array member as value.rest: [20, 30, 40] */
expanded := (...value);
/* (head = 10, 20, 30, 40) */
```

Two stored components can emit four items. A runtime-length array changes the emitted count without adding stored tuple positions. Current declarations remain tail-only; examples with middle segments below are future discussion.

## The user's destructuring examples reopen a real boundary

The user wants these two patterns over the trailing-segment value above to produce the same array result for the second binding:

```text
(h, direct) := value;
(h, ...captured) := value;
/* requested outcome: direct and captured both contain [20, 30, 40] */
```

An ordinary receiver selects the one stored array member. The currently documented structural pattern-rest rule instead preserves the remaining segment-bearing tuple, conceptually (...rest = [20, 30, 40]). That wrapper and its array member remain distinct types. Therefore the requested equality has not yet been reconciled with that rule; it must not be dismissed or presented as already satisfied.

The user's imaginary middle-segment case adds another constraint:

```text
/* future declaration, not admitted current syntax */
middle: (head: Int, ...parts: Int; 3, tail: Int) =
    (10, 20, 30, 40, 50);
/* grouping: (head = 10, ...parts = [20, 30, 40], tail = 50) */

(h, b, direct) := middle;
/* h = 10; b = [20, 30, 40]; direct = 50 */

(h, b, ...captured) := middle;
/* requested: this capture differs from direct */
/* structural candidate: captured = (tail = 50) */
/* array candidate: captured = [50] */
```

The distinction alone does not choose the last capture's type. In particular, it does not establish that every pattern rest creates a homogeneous array. The assistant's previous claim that it did is withdrawn.

## Candidate capture rules and their costs

The current structural rule preserves remaining labels, per-position types, stored order, and existing segment roles. It gives Unit for an exhausted ordinary tuple remainder and preserves ordinary singleton tuple shape. Keeping that rule unchanged does not satisfy the requested trailing-segment array equality.

One possible revision would return the array when the only remaining stored component is an existing declared segment, while preserving a structural tuple remainder in other cases. This would distinguish a segment from an ordinary array-valued field by its static role, not by current length or payload size. It could meet both user examples without homogenizing ordinary heterogeneous remainders. It remains a proposal: define the projection, its types, empty-segment behavior, named selectors, and callable alignment before adoption. It would not identify every rest-only tuple with its array member or introduce global singleton collapse.

Another possible revision is universal homogeneous array collection. Its candidate algorithm is:

1. Ordinary/named receivers select stored components under existing no-duplicate source rules.
2. The final rest receiver emits the unselected components in stored order, expanding declared segments only.
3. Collect those emitted values into an array, with a compatible expected element type or normalized-union inference.

Under that candidate, the middle example gives captured = [50]. Capturing after only h gives [20, 30, 40, 50]. An ordinary array-valued field stays one emitted value:

```text
ordinary := (head = 10, rest = [20, 30, 40]);
(h, ...captured) := ordinary;
/* universal-array candidate: [[20, 30, 40]] */
```

Tuple-valued segment elements likewise stay intact. Recursively flattening nested arrays/tuples would change the selected one-level emission rule. Universal array capture intentionally drops top-level remainder labels and per-position type distinctions; it is not a representation-neutral structural remainder.

```text
(first, ...remaining) := (1, tea = "green", fruit = 30);
/* current structural rule: (tea: String, fruit: Int) */
/* array candidate: [String | Int; 2] */
```

No candidate is adopted by this review. The current general structural rule remains documented, with the segmented-source behavior explicitly reopened. Do not claim the user's trailing equality is invalid, settled, or equivalent to selecting universal array capture.

## Empty capture needs element-type evidence

```text
(first, ...remaining) := (1,);
/* current structural rule: remaining is Unit */
/* array candidate: zero elements, but no remaining element-type evidence */
```

A zero extent does not determine an array's element type. The consumed prefix does not automatically supply that type. An annotation/context or a separately selected empty-array default would be needed; no implicit Any, public Never, or Unit element default is selected.

A remaining declared segment of type ...rest: Int; 0 already supplies Int even with no elements. That case is different from having no remaining components or segment schema at all. Existing (...rest:) infers an omitted element type; no new partial extent or pattern annotation syntax is adopted here.

## Segment roles and extents participate in identity

```text
Plain := type (head: Int, rest: [Int; 3]);
Segmented := type (head: Int, ...rest: Int; 3);
```

Both expose an Int member and an array member at the same positions, but unpack differently. Their structural contracts must retain the ordinary/segment role as well as ordered labels, resolved member types, and segment extent contracts. The older identity wording based only on labels and externally accessed member types is incomplete for segment-bearing tuples.

Role metadata belongs to the static type; no per-value tag is required. Label-only conversion may rename compatible positions while preserving their roles and extents. It does not turn an ordinary array field into a segment, repack elements, or change a fixed count to a general count. Any further role/extent adaptation needs its own rule. Type-spread construction also needs explicit treatment of roles/extents during label replacement; composing schemas cannot silently enable a currently forbidden middle segment.

## Extent guarantees, local facts, and API boundaries

...rest: T; C promises exactly the valid nonnegative compile-time count C and exposes [T; C]. ...rest: T promises no exact count. A general parameter's body must work for every count allowed by its declared contract. A particular caller's length does not change source validity; specialization may optimize while preserving it.

A named-tail construction can infer a fixed source extent when no expected general destination overrides it. A deliberately general destination remains authoritative, even when local construction supplies stronger proof facts. Runtime observation of a length does not establish a fixed-array type. Compatibility between fixed/general segment contracts, exact fact propagation through effects or APIs, partial inference, ownership, and physical adaptation retain their separate status.

Whole-composition matching still proves coverage, final surviving types/access, and segment counts. Existing named replacement can consume and later replace positional contributions without restoring them; summing lengths alone is not a complete proof. Exact-count segments reject unsupported missing/excess inputs without a runtime arity repair or synthesized values.

## Middle construction differs from reading stored groups

An already constructed middle-segment value has known component boundaries. Reading its positions or selecting them with ordinary receivers does not need a partition search. A candidate rest operation can emit the unselected groups using those known roles.

Constructing multiple unspecified-length segments from a flat stream is a different problem. For the hypothetical (:Int, ...mid: Int, :Int, ...rest: Int), five Int values admit four positional partitions. A fixed middle extent establishes its boundary; a single runtime middle with a fixed suffix has a possible suffix-reserving interpretation. Multiple unspecified lengths need explicit boundaries, a deterministic policy, or rejection when ambiguous. Named/default routing, multi-segment type construction, and pattern integration still need separate review. No middle or multiple stored segment declarations are enabled.

## Callable and contextual receiver consistency

A callable with an exact three-element segment, one with three ordinary inputs, and one taking a single three-element array may have related layouts or input streams while accepting different call forms or exposing different stored arguments shapes. Identity and safe adaptation cannot follow byte size, stored component count, or positional input count alone.

The selected .call/call-spread rules continue to consume logical inputs. A tuple-valued ordinary argument remains one value unless explicitly spread. Contextual lambda/implementation receivers need consistent alignment with stored components and declared collectors, including the existing special case of a collector aligned after fixed inputs. This review does not add new receiver patterns, omission/default behavior, unknown-input inference, callable conversion, or ABI rules.

## Representation, effects, and ownership

A fixed [T; C] member retains its selected inline layout without an array-specific runtime header or count field. A segment role adds no runtime dispatch merely to choose ordinary versus segment unpacking. Logical emission need not allocate an intermediate array or tuple.

Actual array collection can require copying or gathering elements. Collecting a heterogeneous tuple into a homogeneous union-typed array can change element stride and require member-identification information, increasing storage and later narrowing work. The selected fixed-array/homogeneous-unnamed-tuple layout equality does not equate such an array with the original heterogeneous tuple or promise free conversion.

Equal capture contents/types do not promise equal storage identity, aliases, or copy effects. Reusing backing storage must preserve ordinary value semantics, access, ownership, lifetime, initialization, source-once evaluation, written effects, and required cleanup. Runtime-array descriptor, allocation/failure policy, and complete copy/resource eligibility remain open. No benchmark or zero-copy/zero-allocation implementation claim follows.

Unit remains one value with zero value bytes. Fixed [Unit; C] arrays have C semantic positions and static counts; runtime-sized Unit containers still need available runtime counts. Empty declared segments keep their stored tuple positions. Explicit unpacking emits zero items for a known empty segment, while real Unit elements remain items. Neither capture candidate selects broad zero-size type collapse.

## Grammar and next decisions

The selected segment spelling remains ...name: T with optional ; C in type context; T describes one element even when it is itself an array or tuple. The extent suffix belongs to the type entry. Existing type spread, expression spread, declarations, and pattern capture retain distinct syntactic contexts. The standalone runtime-array spelling and combined omitted-element/fixed-extent forms remain open; no new syntax is selected by the capture discussion.

Keep the accepted storage/access/emission model. Before adopting a pattern revision, settle the capture's result kind, labels and per-position types, empty-element inference, named-selector behavior, and contextual callable consistency. Preserve segment roles in identity and label-only conversions. Keep middle construction and multi-segment partitioning deferred.

## Verification scope

The re-evaluation used nine external candidate-model reference cases: existing trailing segment, consumed/unconsumed middle segment, ordinary nested array field, heterogeneous named fields, no remaining type evidence, typed zero segment, five Unit elements, and a runtime contract whose current length is three. A separate enumeration found four partitions for the five-value/two-unspecified-segment example. These are expected-value/model checks, not LiteScript execution or parser/typechecker conformance. The reference calculation is not a compiler implementation and does not choose a capture rule.

Related: [array segments](tuple-array-segments.md), [structural pattern rest](tuple-spread-and-rest.md), [logical unpacking](tuple-unpacking.md), [array-tail schemas](tuple-array-shapes.md), [label-only conversion](tuple-label-conversions.md), and [Unit/storage boundaries](unit.md).
