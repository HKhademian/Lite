# Gradual changes to tuple remainders

Status: **structural capture and the gradual-change reasoning accepted in the 2026-10-25 discussion**. Pattern rest preserves the remaining tuple, including a sole empty declared segment. There is no special projection to an array. Empty [] is an empty array without a mandatory element annotation for these examples; its exact unknown-element versus Unit-element default is deliberately deferred. This is design documentation, not LiteScript execution.

## Reasoning method

Treat smoothness as locality over discrete syntax and schemas: change one property at a time, observe the corresponding result, and preserve untouched labels, types, ordinary/segment roles, and nesting. An explicit operator, type-contract, constructor, or required-component change can justify a larger semantic transition. This is a design criterion rather than mathematical differentiation or a measured semantic-distance score.

Keep (h, ...remaining) := value as the operation while removing ordinary fields, shortening a segment, and finally removing the segment declaration. The examples are independent cases; changing a fixed extent changes that source type. A var binding does not acquire new fixed extents through replacement. Under a general runtime-length contract, changing the array's current length leaves that contract unchanged.

## Carve down the source one property at a time

```text
v0 := (10, tea = "green", fruit = 30, ...rest = [1, 2]);
(h, ...r0) := v0;
/* r0 = (tea = "green", fruit = 30, ...rest = [1, 2]) */

v1 := (10, tea = "green", ...rest = [1, 2]);
(h, ...r1) := v1;
/* r1 = (tea = "green", ...rest = [1, 2]) */

v2 := (10, ...rest = [1, 2]);
(h, ...r2) := v2;
/* r2 = (...rest = [1, 2]) */

v3 := (10, ...rest = [1]);
(h, ...r3) := v3;
/* r3 = (...rest = [1]) */

v4 := (10, ...rest = []);
(h, ...r4) := v4;
/* r4 = (...rest = []) */

v5 := (10,);
(h, ...r5) := v5;
/* r5 = (), also spelled Unit */
```

Removing fruit removes that component. Removing tea removes that component without also erasing the tuple around rest. Shortening the array changes its contents/extent without removing its segment. Emptying it still leaves one stored segment member. Only removing that declaration leaves no remaining components and produces Unit.

Keep the ellipsis visible in every illustration of stored segment grouping. A plain rest = array field has different expression-unpacking behavior.

## Empty means empty; exact element defaults can wait

```text
x := [];
pack := (...rest = []);
value := (10, ...rest = []);
(h, ...remaining) := value;
/* remaining = (...rest = []) */
```

These construct empty arrays and declared empty segments. [] has known extent zero. No annotation is required merely to establish that it is an empty array or to reason about the segment's continued presence. For now its element type may be described as unknown or Unit; choosing that exact default and later element-type-dependent behavior is separate work. This adds no public Unknown type, implicit Any/Never default, or runtime type discovery.

An expected type can still supply a concrete element contract, such as [Int; 0]. It is optional context for this construction, not a prerequisite for using the empty example. Bare [] remains a value spelling; this does not introduce it as a complete type spelling.

The earlier demand to keep Int established throughout the zero-length example is superseded. The reasoning tracks shape, grouping, and segment presence without forcing that element-type decision now. In particular, an empty segment does not become Unit merely because its element type is not yet specified.

## Why a sole-segment projection adds a jump

```text
/* before removing tea */
(tea = "green", ...rest = [1, 2])

/* structural remainder after removing tea */
(...rest = [1, 2])

/* rejected automatic normalization for pattern rest */
[1, 2]
```

The last alternative makes deletion of tea also discard the enclosing tuple, the rest label, and its segment role. Those extra changes do not follow from modifying the segment itself. Keep structural capture instead. This is an operational locality argument; it does not claim that all conceivable type-level functions must be continuous.

Universal array-producing capture is also not the selected tuple-pattern operation. It can be count-stable within its own array contract but intentionally discards top-level labels and per-position types. A separate explicit collection/conversion could be discussed later; this reasoning introduces no new syntax for one.

## Other axes and their explicit boundaries

A general ...rest: Int segment can be runtime-empty or nonempty without changing the remainder's tuple shape or static contract. remaining.rest and remaining.0 continue to select the array member. Element bounds follow its actual array length. Tuple member access does not become runtime tuple indexing.

Fixed [Unit; 2], [Unit; 1], and [Unit; 0] elements all have zero element payload bytes while preserving their different static counts. The declared segment stays one stored tuple member at every extent. Storage size never triggers tuple collapse; runtime count information belongs to the enclosing array when needed.

Changing an explicit segment marker is a different input operation:

```text
segmented := (...rest = [1, 2]);
ordinary := (rest = [1, 2]);
(...a) := segmented;
(...b) := ordinary;
/* a = (...rest = [1, 2]); b = (rest = [1, 2]) */

items := (...a); /* (1, 2) */
field := (...b); /* (rest = [1, 2]) */
```

Capture preserves the supplied role; subsequent expression unpacking observes the explicit marker difference. Likewise, changing (h, member) to (h, ...remaining) explicitly changes selection into remainder capture:

```text
value := (10, ...rest = [1, 2]);
(h, member) := value;       /* member = [1, 2] */
(h, ...remaining) := value; /* remaining = (...rest = [1, 2]) */
```

There is no requirement that different capture operators return the same type. The user's earlier sequence was a gradual edge-case probe, not a final demand for equality between these results.

A singleton source needs its comma: (10,) is a tuple, while (10) groups a scalar. With (h, ...remaining), deleting the required h component from the source makes coverage fail; changing the constructor to a scalar makes tuple destructuring fail. Both have explicit source-structure causes. No implicit Unit value fills a missing required component.

An already stored middle segment would have known boundaries for access/capture. Its future construction from flat items, especially with multiple unspecified extents, remains a separate partitioning problem. This outcome enables no middle declarations, multiple collectors, or new callable-header patterns.

## Useful structural laws

Capturing the entire tuple preserves its value/schema under normal copy rules: (...remaining) := value captures the whole tuple, including its segment marker. This promises neither source-location aliasing nor a physical copy instruction.

Removing an unselected field before capture yields the same remainder structure as capturing and removing that same field afterward. The deletion does not additionally unwrap another component. Each untouched label/type/role survives; numeric positions restart in the remainder under existing stored-order rules.

A sole ordinary component remains an ordinary singleton tuple. A sole declared segment remains a segment-bearing tuple. No remaining stored components yields Unit. Explicit expression spread can still emit zero, one, or many items and reconstruct a different shape; it is a different operation from pattern rest.

## Verification scope

External reference-model checks exercised field deletion, whole-source capture, static and runtime length changes, typed empty segments, Unit distinctions, ordinary-array roles, heterogeneous preservation, and required-source rejection. The model found the extra tuple-layer loss in sole-segment projection. The user's later empty-literal clarification removes element annotation as a gate for the shape reasoning. None of these calculations is LiteScript parser/runtime or performance verification.

Related: [review and alternatives](tuple-segment-pattern-review.md), [pattern rest](tuple-spread-and-rest.md#positional-tuple-rest-selected), [array segments](tuple-array-segments.md), [logical unpacking](tuple-unpacking.md), and [Unit](unit.md).
