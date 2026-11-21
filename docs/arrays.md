# Fixed-length owning arrays

Status: **fixed-array [T; N] source examples, known-size literal inference, and fixed-array/fixed-tuple spread construction selected in the 2026-10-24 discussion**. The 2026-10-25 storage contract selects header-free inline layout equal to the corresponding homogeneous unnamed tuple. Runtime-length arrays support variadic tails; their type spelling, ownership, allocation, ABI, and full construction grammar remain open. Array<T, N>/Array<T> remain schematic generic descriptions, not a second selected generic syntax. See [tuple and array shapes](lite://doc/tuple-array-shapes).

## Compile-time size

### Equal layout does not determine type identity

User clarification, 2026-11-17: the two-component fixed array `[Int64; 2]`
and the unnamed tuple `(:Int64, :Int64)` are **not the same type**, even though
their selected inline layouts agree. Equal size, layout or stored bits do not
establish type identity. Likewise, `UserID := distinct Int` declares a type
whose identity is separate from `Int`. See
[aliases and distinct type declarations](lite://doc/type-aliases).

This bounded decision settles the two-component identity example; it does not
select general array-to-tuple conversion, arbitrary reinterpretation, ABI
compatibility, runtime tag storage, or tail-only tuple normalization. The wider
family, including empty and singleton shapes, remains to be reviewed.

```text
numbers: [Int64; 2] = [10, 20];
pair: (:Int64, :Int64) = (10, 20);
/* Their corresponding elements agree; their types remain distinct. */
```

These are specification illustrations, not new compiler-support claims. A
transparent alias retains its target's identity; it does not change this
array/tuple distinction. Type identity and conversion compatibility are
separate questions.

Approved implementation coverage, **2026-10-31**: the experimental
[igniter](lite://repo/igniter/README.md#fixed-arrays-and-traversal) now runs nonempty
homogeneous fixed arrays of scalars or flat scalar tuples, dot/bracket reads,
explicit fixed-array function inputs/results and action traversal. Runtime
indices fault safely; invalid literal dot positions fail before execution.
Exact extents/types and ordinary value-copy behavior are preserved. Empty
construction, union-element inference, nested arrays, mutation/access grants,
growth, views and native layout remain unimplemented. See
[INV-054 evidence](lite://repo/research/investigations/INV-054-fvp-fixed-arrays.md).

The angle brackets in examples such as `Array<Float, 3>` are [temporary generic notation](lite://doc/generic-notation). Float names the intended element type; 3 names the intended static extent. Their joint spelling does not select a generic parameter mechanism or const-generic syntax. The fixed-array surface used here is [T; N]; runtime-array spelling remains open.

The selected representation of [T; N] has exactly N contiguous inline T positions and the same size, alignment, and corresponding offsets as an unnamed fixed tuple of N components of T. It adds no runtime length field, header, tag, wrapper, indirection, or allocation. N is part of the static type, so lengths 3 and 4 remain distinct array types. Ordinary nonzero-sized elements use their normal stride; zero-sized elements keep N semantic positions without element payload bytes. Element-owned metadata remains part of T. This layout contract does not select stack placement, universal copyability, arbitrary reinterpretation, or an identical ABI; the [two-component identity clarification](#equal-layout-does-not-determine-type-identity) is separate. See [fixed-array storage](lite://doc/memory-and-performance#fixed-arrays-share-homogeneous-tuple-storage).

```text
point: [Float; 3] = [1.0, 2.0, 3.0];
zeroed: [Int; 1024];
pending: [Int; 1024] = ?;
```

The first supplies all elements. The second applies the selected semantic-zero contract for the established extent. The third reserves the complete fixed layout without initialized elements; indexed first construction remains open. Each element receives its type's valid zero; no element type is excluded. Known-size literals infer this fixed family by default even without the annotation; var/mut affect permissions rather than N or collection family.

An array field contributes its inline elements to a containing record, consistent with nested record values. Permitted copies copy those inline values under their element contracts and preserve references inside elements without cloning reference targets. Noncopyable/resource elements require their eventual copy policy.

Known-size nonempty heterogeneous literals infer one homogeneous union element type: [1, "tea", true] has [Int | String | Bool; 3] without a more specific expected element contract. Each index has that union type, while the extent remains three. Collecting these values into a named rest segment without an overriding expected general schema retains the extent in its inferred type, now expressible as (...rest: T; N). The general (...rest: T) contract still states no exact length. See [named array segments](lite://doc/tuple-array-segments) and [union inference and tail extents](lite://doc/tuple-array-shapes#union-element-inference-and-known-construction-extents).

A known extent zero or one also determines tuple expansion: (...arr0) for [Int; 0] yields Unit, and (...arr1) for [Int; 1] yields a fixed singleton (:Int,). Explicit (...rest = arr0) and (...rest = arr1) instead retain a tail-bearing tuple with an empty or one-element array. Neither stored/copied declared tail collapses to Unit, a scalar, or the other tuple shape. Explicitly unpacking a known zero/one tail instead emits zero/one items and reconstructs under its destination. See [zero/singleton construction examples](lite://doc/tuple-array-shapes#zero-and-singleton-fixed-expansion-versus-declared-tails).

## Fixed-array values widen element by element

Selected 2026-10-26: an initialized fixed-array value [S; N] can be copied into [T; N] when ordinary value compatibility proves S can safely widen to T and the initialization, access, and element-copy contracts hold. Each destination index receives the corresponding widened source element. Preserve N, order, and values. This is the array counterpart of [component-wise tuple widening](lite://doc/types-and-inference#tuple-values-widen-component-by-component).

```text
source: [Int; 3] = [1, 2, 3];
wider: [Int | String; 3] = source;
```

The shown destination provides ordinary readable access and holds Int values 1, 2, and 3. Widening itself grants no write permission: it cannot authorize writing a String through the source's Int locations or acquire var/mut authority. Any replacement or element-mutation permission must be independently requested and satisfy the existing access rules. Source retains its [Int; 3] contract and values. Corresponding slots mean the same logical indices in the copied value, not shared source locations or a newly created reference.

Apply this value-compatibility proof to typed initialization, ordinary assignment, arguments, and returns when the destination requires the same extent. Inferred copy := source keeps the original array type. Nested fixed-array or tuple elements can widen recursively under their own established proofs. A stored callback or generic payload still needs its complete compatibility proof; element grouping cannot make an Int-only callback accept String.

Read each executed source expression once and preserve ordinary copy effects and initialized element values. Inline destination elements follow the destination element layout; union tags, element size/alignment, stride, and total storage size can differ from the source. Compiler representation adaptation needs no source-level loop or wrapper. Referenced targets inside copied elements retain their established copy/access contracts and are not implicitly deep-cloned.

This keeps the selected header-free layout for each fixed-array type; it does not require the source and destination layouts or ABIs to match. No source allocation policy, universal copyability, new alias, or in-place reinterpretation follows. [Unchecked reverse narrowing is rejected](lite://doc/types-and-inference#unchecked-narrowing-is-rejected) without justified narrower-value proofs.

This rule preserves the fixed extent and array family. It does not convert arrays into tuples, resize arrays, reinterpret slices, widen caller-location write grants, or select List/runtime-owner cloning, shared-view adaptation, and reference-safety policies. Those contracts remain separate. Empty literals' deferred exact element-type policy is unchanged; the rule above starts from established source and destination element contracts.

## Empty literals remain empty arrays

```text
x := [];
pack := (...rest = []);
```

[] constructs an empty array with known extent zero. An element annotation is not required merely for this value or the declared empty segment. The user deliberately leaves its exact unknown-element versus Unit-element default for later; no public Unknown type or implicit Any/Never default is selected. An expected [Int; 0] may optionally supply Int. Empty array, empty declared segment, and Unit retain their distinct structural meanings. Bare [] is a value spelling, not a newly selected complete type spelling. See [gradual remainder reasoning](lite://doc/tuple-remainder-gradual-reasoning#empty-means-empty-exact-element-defaults-can-wait).

## Zero-sized elements retain their count

[Unit; 5] has five valid positions and one possible initialized element sequence, while [(), (), ()] infers [Unit; 3]. Their element payload occupies zero bytes, and their counts are static type information rather than stored length fields. [Int; 0] likewise has no element payload but keeps its array contract; equal storage does not make it Unit. Iteration count, bounds, and expression effects remain observable. A runtime-sized Unit array still needs runtime count information in its container, with its exact representation open. See [zero storage and shape](lite://doc/unit#zero-storage-does-not-erase-shape).

## Literal numeric dot access selected

Selected on **2026-10-25**: a fixed array [T; N] supports literal numeric dot access to its statically known positions. arr.0 and arr[0] designate the same element/location and preserve its existing access permissions. For a valid position, the result has type T; positions outside 0 through N - 1 are compile-time errors.

```text
x := [1, 2, 3];
x.0;       /* same element as x[0] */
x.2;       /* valid Int element */
x.3;       /* rejected: outside the fixed extent */
```

This gives fixed arrays the same literal positional access as homogeneous fixed tuples, without selecting array/tuple type identity, implicit conversion, or identical ownership/ABI. A dot followed by an identifier still selects that literal member name: arr.ind does not substitute a variable or constant named ind. Computed indexing uses arr[ind] under array bounds rules. Numeric dot access is available only for compile-time-sized arrays [T; N]; runtime-sized arrays use bracket indexing. Additional extent-refinement contracts remain open.

The source is evaluated once per access expression. This spelling grants no new writes or caller-location authority; initialization, visibility, ownership, and existing access rules still apply. A permitted var grant through arr.0 refers to the same location as one through arr[0], so the two spellings cannot disguise duplicate access to that element. See [tuple positional access](lite://doc/tuple-entries-and-access#fixed-array-dot-positions).

## Constant-position write grants selected

Selected on **2026-10-25**: an initialized fixed array with writable mut access may supply separate var grants for known-valid distinct constant element positions. For mut values := [10, 20], swap(var values[0], var values[1]) is valid when swap requires two var Int parameters: positions 0 and 1 are distinct locations in [Int; 2]. The binding stays fixed while each element receives one replacement grant. Repeating position 0 is rejected. Preserve location validity, initialization, bounds, and ordinary compatibility; additional supported proof forms remain open. Multiple element grants into the same fixed array without a supported disjointness proof are statically rejected; see [unproven overlap](lite://doc/call-replacement-flow#unproven-fixed-array-element-overlap-rejected). An explicit built-in Int i =!= j guard also permits two element grants in its successful branch when the index locals and same fixed array stay stable; ordinary bounds checks remain. The same supported distinctness fact may remain after if i == j { return; } when every equal-index path exits before the call; a continuing equality branch supplies no such proof. See [early-exit distinctness](lite://doc/call-replacement-flow#element-distinctness-after-an-early-exit-selected), [guarded runtime indices](lite://doc/call-replacement-flow#guarded-runtime-index-grants-selected), and [fixed-array element grants](lite://doc/call-replacement-flow#distinct-constant-fixed-array-element-grants-selected).

## Ordinary fixed-array value inputs selected

Selected on **2026-10-25**: an ordinary input of copyable [T; N] preserves the evaluated fixed-array value under valid element copy contracts. In read_original(var values, values), initially [10, 11], a callee that replaces the var source with [20, 30] still reads 10 from the ordinary input's first element. The tmp := values expansion captures the same value. Fixed extent and element type remain unchanged; no whole-source or element write authority is granted by the ordinary input. Preserve initialized reads, source order, observable effects, and special rest access/retention contracts. Value semantics impose no physical-copy ABI, though preserving large inline values may require copying. Future reference-copy/borrowed-view syntax and memory safety remain deferred; see [fixed aggregate values](lite://doc/parameter-values-and-slots#copyable-fixed-tuple-and-array-values-selected).

## Runtime size fixed after construction

`Array<T>` is the candidate for an owner whose length is chosen at runtime and never changes afterward. Its size is not part of the static type. It owns its separately allocated element region; its descriptor can be stored inline in another record, while its runtime-sized elements cannot all contribute to that record's compile-time layout.

```text
samples: Array<Int> = generate_array(count, fn (i: Int): Int { i });
```

The generator name, generic inference, allocation/failure policy, and callback construction API are proposals. The aim is to allocate an appropriate region and directly construct each required element, with cleanup for a partially completed fill if needed. No preliminary zero pass is inherently required.

A runtime-length array needs available count information even when T is Unit and its elements occupy zero bytes. That count belongs to the array/container, not to T; the exact descriptor layout is not selected. Knowing the current count does not change a runtime representation into the fixed inline [T; N] representation.

Avoid calling a borrowed slice an owning runtime array merely because both have runtime lengths. Ownership determines who keeps storage alive and releases it.

A variadic collector's array contract does not require an owning allocation. Its selected [access and retention rules](lite://doc/tuple-array-shapes#rest-access-storage-and-retention) provide readable access by default, permit valid borrowed or call-temporary backing storage, and require explicit copy/ownership operations to create independent owned storage. Retention needs lasting ownership or a proven lifetime; array shape alone provides neither. General array ownership and runtime-array spelling remain open.

## Fixed length is independent of placement and mutability

Compile-time size does not force stack placement: an inline array can reside inside a heap-owned object or another valid region. Runtime allocation policy is also separate. No automatic large-stack allocation or heap fallback is selected.

Fixed length does not imply fixed elements. Mut array access could permit element updates while preserving length. Var on the array binding instead permits replacement with a compatible whole array; it does not make the existing elements writable. A whole replacement of `Array<T, N>` must retain the same N unless an explicit conversion creates a different type.

## Views and specialization

Both array forms should be able to lend a read-only slice of initialized elements without copying them. A writable view requires existing writable access and an explicit grant. Automatic function-argument coercion versus explicit slice formation is still open.

Consumer APIs should request the minimum [collection capability](lite://doc/collection-capabilities), rather than a particular array type or extent unless required. A traversal-only operation can accept other compatible providers too; an operation requiring contiguous storage can request that ability and obtain a slice. The array's N can remain available to specialization without appearing in the public consumer signature.

Known N can support exact destructuring, compile-time size checks, and specialization. A runtime length needs a checked proof before conversion to an exact-size contract. No unchecked reinterpretation of a runtime array as `Array<T, N>` is selected.

## Later library forms

A bounded-capacity list differs from an array: its length can vary up to a fixed maximum. A known-length slice differs too: it views N elements rather than owning N inline slots. Both are useful later facilities, not reasons to merge the core contracts.

Remaining choices include runtime-array type spelling, multidimensional layout, element defaults, equality, allocation/failure behavior, ownership, and complete array/generic grammar. The [T; N] form and known-size inference used here do not adopt [T; ...] for runtime arrays; that ellipsis was a discussion placeholder. Related: [sequence families](lite://doc/sequence-types), [lists](lite://doc/lists), [slices](lite://doc/slices), [record copies](lite://doc/local-shadowing-and-copies), and [initialization](lite://doc/first-initialization).
