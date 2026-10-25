# Tuple array segments and pattern rest: re-evaluation

Status: **review and subsequent gradual-change outcome documented at the user's request, 2026-10-25**. The accepted result preserves structural tuple remainders, including a sole empty segment, without automatic array projection or universal array capture. The user clarified that the examples were progressive edge probes. Empty [] is an empty array; its exact unknown-versus-Unit element default is deferred rather than a gate for these examples. There is no LiteScript parser/runtime verification. See [gradual reasoning](tuple-remainder-gradual-reasoning.md).

## Keep the four operations distinct

A stored tuple schema describes ordinary components and named homogeneous array segments. Each segment occupies one stored position, regardless of its element count. Member access selects a stored component. Expression unpacking emits logical items. Destination construction routes those items and packs matching elements into declared segments. Pattern capture selects stored components and preserves the remaining tuple structure, including declared segment markers. It does not borrow the logical item-emission rule from expression spread.

```text
value: (head: Int, ...rest: Int; 3) = (10, 20, 30, 40);
/* stored grouping: (head = 10, ...rest = [20, 30, 40]) */
value.0;     /* same member as value.head: 10 */
value.1;     /* same array member as value.rest: [20, 30, 40] */
expanded := (...value);
/* (head = 10, 20, 30, 40) */
```

Two stored components can emit four items. A runtime-length array changes the emitted count without adding stored tuple positions. Current declarations remain tail-only; examples with middle segments below are future discussion.

## The user's examples were gradual edge probes

The user progressively carved a full tuple down through fewer ordinary fields, shorter segments, an empty segment, and finally no remaining components. The assistant initially read paired examples as a demand for direct/rest array equality; the user clarified that the purpose was to probe boundaries, not to finalize that interpretation.

```text
value := (10, ...rest = [20, 30, 40]);
(h, direct) := value;
/* direct = [20, 30, 40] */
(h, ...captured) := value;
/* captured = (...rest = [20, 30, 40]) */
```

The distinct capture operators have explicit meanings: direct selects an array member, while captured preserves a remainder tuple. Their value families need not be identical. The subsequent gradient comparison keeps the wrapper when only a segment remains, including at extent zero.

The imaginary middle-segment example remains future syntax, with structural outcomes:

```text
/* future declaration, not admitted current syntax */
middle: (head: Int, ...parts: Int; 3, tail: Int) =
    (10, 20, 30, 40, 50);
/* grouping: (head = 10, ...parts = [20, 30, 40], tail = 50) */
(h, b, direct) := middle;
/* h = 10; b = [20, 30, 40]; direct = 50 */
(h, b, ...captured) := middle;
/* captured = (tail = 50): named singleton tuple */
```

This does not enable middle declarations or make a scalar suffix into an array. See [the full gradual sequence](tuple-remainder-gradual-reasoning.md#carve-down-the-source-one-property-at-a-time).

## Candidate capture rules and their costs

The selected structural rule preserves remaining labels, per-position types, stored order, and segment roles. It gives Unit only when no stored components remain. A sole ordinary component remains a singleton tuple; a sole declared segment remains a segment-bearing tuple.

Projection of a sole remaining segment was explored and is not selected. Removing the last ordinary field would also erase the unrelated tuple wrapper, segment label, and role. Under the accepted locality criterion, that is an extra semantic jump. There is no automatic projection based on current length, zero payload size, or the presence of only one segment.

Universal homogeneous array capture was also explored and is not selected for tuple pattern rest. Its candidate algorithm emitted unselected components and gathered them into an array. It would preserve nested array/tuple elements as items but discard top-level labels and individual positional types:

```text
(first, ...remaining) := (1, tea = "green", fruit = 30);
/* selected: remaining = (tea = "green", fruit = 30) */
/* unselected array alternative: [String | Int; 2] */
```

An explicit homogeneous collection/conversion could be discussed separately. This outcome adds no new syntax, recursive flattening, global singleton collapse, or array/tuple identity.

## Empty arrays and empty remainders

The user explicitly asks to keep the empty case simple:

```text
x := [];
value := (10, ...rest = []);
(h, ...remaining) := value;
/* remaining = (...rest = []) */

(first, ...none) := (1,);
/* none = Unit: there is no remaining stored component */
```

[] is an empty array, and its extent is zero. No element annotation is required merely to construct it or reason about the segment's presence. Its exact unknown-element versus Unit-element default remains deferred; do not invent a public Unknown/Any/Never type or reject the shape example pending that decision. An expected [Int; 0] may still supply Int when wanted.

An empty declared segment is one remaining stored component. No remaining components gives Unit. Unknown or deferred element information never authorizes erasing the segment. The previous demand to retain Int as an annotation throughout the zero-length gradient is superseded. See [empty-array clarification](tuple-remainder-gradual-reasoning.md#empty-means-empty-exact-element-defaults-can-wait).

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

An already constructed middle-segment value has known component boundaries. Reading its positions or selecting them with ordinary receivers does not need a partition search. Structural capture preserves the unselected groups and their known roles; a later explicit expression spread may emit their logical items.

Constructing multiple unspecified-length segments from a flat stream is a different problem. For the hypothetical (:Int, ...mid: Int, :Int, ...rest: Int), five Int values admit four positional partitions. A fixed middle extent establishes its boundary; a single runtime middle with a fixed suffix has a possible suffix-reserving interpretation. Multiple unspecified lengths need explicit boundaries, a deterministic policy, or rejection when ambiguous. Named/default routing, multi-segment type construction, and pattern integration still need separate review. No middle or multiple stored segment declarations are enabled.

## Callable and contextual receiver consistency

A callable with an exact three-element segment, one with three ordinary inputs, and one taking a single three-element array may have related layouts or input streams while accepting different call forms or exposing different stored arguments shapes. Identity and safe adaptation cannot follow byte size, stored component count, or positional input count alone.

The selected .call/call-spread rules continue to consume logical inputs. A tuple-valued ordinary argument remains one value unless explicitly spread. Contextual lambda/implementation receivers need consistent alignment with stored components and declared collectors, including the existing special case of a collector aligned after fixed inputs. This review does not add new receiver patterns, omission/default behavior, unknown-input inference, callable conversion, or ABI rules.

## Representation, effects, and ownership

A fixed [T; C] member retains its selected inline layout without an array-specific runtime header or count field. A segment role adds no runtime dispatch merely to choose ordinary versus segment unpacking. Logical emission need not allocate an intermediate array or tuple.

Actual array collection can require copying or gathering elements. Collecting a heterogeneous tuple into a homogeneous union-typed array can change element stride and require member-identification information, increasing storage and later narrowing work. The selected fixed-array/homogeneous-unnamed-tuple layout equality does not equate such an array with the original heterogeneous tuple or promise free conversion.

Equal capture contents/types do not promise equal storage identity, aliases, or copy effects. Reusing backing storage must preserve ordinary value semantics, access, ownership, lifetime, initialization, source-once evaluation, written effects, and required cleanup. Runtime-array descriptor, allocation/failure policy, and complete copy/resource eligibility remain open. No benchmark or zero-copy/zero-allocation implementation claim follows.

Unit remains one value with zero value bytes. Fixed [Unit; C] arrays have C semantic positions and static counts; runtime-sized Unit containers still need available runtime counts. Empty declared segments keep their stored tuple positions. Explicit unpacking emits zero items for a known empty segment, while real Unit elements remain items. Structural capture selects no broad zero-size type collapse.

## Grammar and next decisions

The selected segment spelling remains ...name: T with optional ; C in type context; T describes one element even when it is itself an array or tuple. The extent suffix belongs to the type entry. Existing type spread, expression spread, declarations, and pattern capture retain distinct syntactic contexts. The standalone runtime-array spelling and combined omitted-element/fixed-extent forms remain open; no new syntax is selected by the capture discussion.

Keep the accepted storage/access/emission model and structural pattern capture. The gradual reasoning settles the wrapper boundary without special projection or universal array capture. Existing named-selector coverage and label/type preservation remain. Exact empty-array element defaults, further contextual callable integration, middle construction, and multi-segment partitioning remain separate. Preserve segment roles in identity and label-only conversions.

## Verification scope

The re-evaluation used nine external candidate-model reference cases: existing trailing segment, consumed/unconsumed middle segment, ordinary nested array field, heterogeneous named fields, no remaining type evidence, typed zero segment, five Unit elements, and a runtime contract whose current length is three. A separate enumeration found four partitions for the five-value/two-unspecified-segment example. These are expected-value/model checks, not LiteScript execution or parser/typechecker conformance. The reference calculation is not a compiler implementation; the later user-approved gradual reasoning records the structural outcome and supersedes the earlier reopened status. The empty literal itself remains valid while its exact default element-type policy waits.

Related: [array segments](tuple-array-segments.md), [structural pattern rest](tuple-spread-and-rest.md), [logical unpacking](tuple-unpacking.md), [array-tail schemas](tuple-array-shapes.md), [label-only conversion](tuple-label-conversions.md), and [Unit/storage boundaries](unit.md).
