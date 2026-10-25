# Tuple unpacking emits logical items

Status: **selected revised model, 2026-10-25; design documentation, not compiler/runtime verification**. This supersedes the earlier shape-preserving interpretation of expression spread on rest-bearing tuples. Ordinary copy retains the structured value; unpacking emits items; the destination constructs their result.

## Copy and reconstruction

```text
x: (a: Int, b: Int, c: Int, ...rest: Int) =
    (1, 2, 3, 4, 5, 6, 7);

z := x;
/* same fixed-prefix/rest organization; z.rest holds [4, 5, 6, 7] */

y := (...x);
/* (a = 1, b = 2, c = 3, 4, 5, 6, 7) */
/* seven fixed components; y.3 is 4; y has no rest member */
```

The example's concrete tail extent is statically known from construction. The selected ...rest: T; C syntax can now state an exact extent in the tuple type; a general ...rest: T schema still guarantees no exact count. See [array-segment types](tuple-array-segments.md). Ordinary copy keeps the source organization and follows the current copy/eligibility rules; an explicit destination conversion retains its separately selected compatibility rules. Copy does not mean a reference alias or a guaranteed physical copy instruction.

## What unpacking emits

Evaluate the operand once. Emit its ordinary fixed components in stored order, preserving their labels and types. For a declared array-tail segment, emit each array element as an unnamed item in array order. The tail container's label is not itself emitted as a labeled array-valued item.

This is one-level expansion. An ordinary array-valued fixed field remains one labeled item; a tuple-valued tail element remains one item with its own nested shape. A Unit element remains one Unit item. Unpacking does not recursively discard zero-sized values or expand nested arrays/tuples without another explicit spread.

Type-level ...Params and pattern ...receiver keep their selected type-construction and remainder-capture roles. This revised item-emission rule applies to expression/call unpacking, not every syntactic use of ellipsis.

## The destination defines the resulting shape

An explicit or established expected tuple schema is the reference contract. Route emitted contributions in written order, with slots initially unfilled, normal named replacement, and no positional backtracking. Prove required coverage and final type/access compatibility. Infer only omitted information.

```text
repacked: (a: Int, b: Int, c: Int, :Int, ...remaining: Int) = (...x);
/* the unnamed fixed component is 4; remaining holds [5, 6, 7] */
```

Without a destination shape, use existing inference on the emitted items. Known counts yield fixed components, subject to normal label replacement. A runtime-sized portion is collected into a newly inferred tail under the selected positional/named-slot rules. No arbitrary runtime tuple fields are introduced.

```text
source := (a = 1, ...numbers = read_numbers());
copy := source;
/* copy retains the declared numbers segment */

unpacked := (...source);
/* inferred shape: (a: Int, ...rest: Int), assuming runtime-sized Int output */
```

The fixed label a survives. The old container label numbers does not: rest is the destination's newly inferred tail label. Runtime emptiness does not change that statically inferred shape. A length known only by runtime observation does not become a compile-time fixed extent.

## Merging existing rest-bearing sources

```text
left := (...rest = [1, 2]);
right := (...rest = [3, 4]);

merged := (...left, ...right);
/* (1, 2, 3, 4): four fixed components */

packed: (...rest:) = (...left, ...right);
/* one Int tail containing [1, 2, 3, 4] */
```

The two stored rest labels are not emitted, so they neither collide nor replace one another. With runtime-sized arrays, the same construction can infer one new tail rather than four fixed slots. This merges singly-tailed source tuples without introducing storage for multiple declared rest segments.

Ordinary fixed labels still participate in the existing append-or-replace/routing rules:

```text
left := (score = 10, ...rest = [1, 2]);
right := (score = 20, ...rest = [3, 4]);
merged := (...left, ...right);
/* (score = 20, 1, 2, 3, 4) */
```

Source labels contributed through spread retain their existing distinction from explicit labels of the enclosing constructor. Default inferred rest-name collisions with real fixed fields remain rejected unless a reference schema resolves them.

Call spread and intrinsic .call consume the same emitted inputs under the callee's contract. They do not convert a tail container label into a named argument. Matching input sequences does not promise identical copy effects, allocation, or alias behavior across arbitrary refactorings.

## Zero and singleton boundaries

```text
arr0: [Int; 0] = [];
empty := (...rest = arr0);
empty_copy := empty;
empty_items := (...empty);
/* empty_copy keeps its declared tail; empty_items is Unit */

single := (...rest = [9]);
single_copy := single;
single_items := (...single);
/* single_copy keeps its declared tail; single_items is (9,), type (:Int,) */
```

The stored values do not normalize away merely because of their extent. Explicit unpacking and reconstruction do change shape when that extent is known. Unit-containing items remain present:

```text
units := (...rest = [(), ()]);
items := (...units);
/* ((), ()): two Unit components, not Unit */
```

Even zero-item expansion evaluates its source once and preserves required effects. Incompatible destinations still fail their normal proof checks.

## Not selected by this revision

The explored ...= expression anonymous-segment spelling and multiple stored rest declarations remain unselected. Earlier suggestions to append anonymous segments or replace same-named tail containers during tuple merging are superseded by logical item emission. Runtime-array owner spelling, general extent propagation through effects/API boundaries, copy eligibility, memory safety, and complete recursive grammar retain their separate status.

Related: [tuple/array contracts](tuple-array-shapes.md), [spread and pattern rest](tuple-spread-and-rest.md), [array representation](arrays.md), [Unit](unit.md), and [memory and performance](memory-and-performance.md).
