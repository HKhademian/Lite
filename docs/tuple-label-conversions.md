# Tuple labels under an explicit destination type

Status: **selected 2026-10-25: explicit typed label conversion is allowed, while ordinary assignments/arguments/returns check labels; design-only, not compiler/runtime verification**.

## Ordinary transfers check labels

Selected on **2026-10-25**, clarified by the user: ordinary tuple/callable compatibility remains label-sensitive. A known expected type alone does not authorize relabeling. Plain assignment to an existing binding, argument passing, and returning an already constructed value must satisfy the destination's label contract as well as its ordinary type/access/omission requirements.

```text
size := (width = 640, height = 480);
var point := (x = 0, y = 0);

point = size; /* rejected: labels differ */

/* Explicitly written destination type permits positional relabeling */
renamed: (x: Int, y: Int) = size;
point = renamed; /* valid: labels now match */
```

The bypass is an explicitly written destination tuple or callable type on the receiving declaration, including a valid transparent type alias or an established partially inferred type schema. It must appear at the conversion site; a parameter/result annotation elsewhere, or the already known type of a mutable variable, is not that bypass. A new binding with := preserves source labels instead of renaming them.

For calls and returns, first create a compatible value through such an explicit typed declaration, then pass or return it normally. No inline cast syntax is selected by this rule. Fresh contextual constructors and implementation literals retain their existing rules: choosing labels while constructing a new value or defining a contextual callable is distinct from implicitly relabeling an existing value.

This narrows the earlier 2026-10-25 rule that also admitted relabeling through any already typed target, declared parameter, or expected return contract. Those ordinary transfers now check labels; explicit typed conversion remains allowed.

## Labels can change while positions stay fixed

The user clarifies that labels have no footprint in tuple storage. An explicit destination tuple type may give an already constructed value different labels when its positional shape, resolved component types, and applicable access/copy contracts match. Preserve every component's position and value; use the destination's labels for access through that binding.

```text
size := (width = 640, height = 480);
point: (x: Int, y: Int) = size;

point.x;     /* 640: destination position 0 */
point.y;     /* 480: destination position 1 */
size.width;  /* still 640; the source contract is unchanged */
```

Only an explicitly written destination type at the receiving declaration supplies the label-conversion bypass. Plain assignment to an already typed target, declared tuple-valued argument admission, and expected return types do not silently convert mismatched labels. Inference preserves source labels: inferred := size still exposes width/height. See the ordinary-transfer rule above.

This is a type-directed label conversion under a known destination, not byte-size-based reinterpretation. Equal byte counts do not justify Int/Float punning, scalar/singleton conversion, changed component types, a new shape, different permissions, or an invalid copy. Ordinary value transfers retain copy semantics; this does not select shared source storage or implicit references. Same ordered concrete component types retain their established size/alignment/offsets regardless of labels, without selecting a new ABI or measuring an implementation.

## Label conversion does not reorder components

```text
stored := (r = 20, l = 10);
by_position: (l: Int, r: Int) = stored;
/* by_position.l = 20; by_position.r = 10 */

by_name: (l: Int, r: Int) = (l = stored.l, r = stored.r);
/* by_name.l = 10; by_name.r = 20 */
```

The first assignment gives existing positions new names. The second explicitly reconstructs a different value order. Source expressions are not rerun, and the source value is not permuted or relabeled in place.

```text
mixed := (label = "tea", count = 2);
bad: (count: Int, label: String) = mixed;
/* rejected: position 0 is String, not Int; names do not reorder it */
```

Fresh tuple constructors retain their existing destination routing: written labels select destination slots, unnamed contributions fill next-unfilled slots, and spread retains its supplied labels. Thus whole stored-value admission and a fresh (...stored) constructor are different operations. Typed label conversion does not make an unknown constructor/call label valid or silently rename a supplied .call pack before routing.

## Named and unnamed destinations

Labels may be added, removed, or changed while matching positions/types stay fixed:

```text
plain: (:Int, :Int) = size;
renamed: (left: Int, top: Int) = plain;
/* plain.0 = renamed.left = 640; plain.1 = renamed.top = 480 */
```

The same explicit typed-conversion rule applies to mixed named/unnamed positions; ordinary transfers still require their label/absence contracts to match. It does not repack a fixed prefix or array tail, change extent/family, flatten a nested tuple, erase an actual member, or invent defaults. Any whole-composition proof already required for a shape remains required. Optional ordinary stored-tuple elements and their absence semantics remain separate.

## Callable public labels follow the destination

An explicit typed receiving declaration may likewise convert a stored callable's public input labels while preserving its ordered slots and otherwise compatible contracts. Plain reassignment, passing, and return do not perform that conversion implicitly. The implementation's local names and default definitions remain its own:

```text
source := fn(n: Int = 2): Int { n * 10 }
target: fn(amount?: Int): Int = source;

target(amount = 3);  /* 30 */
source(n = 3);       /* 30 */
target();            /* 20: source implementation still supplies its default */

target(n = 3);       /* rejected: target's public label is amount */
source(amount = 3);  /* rejected: source's public label is n */
```

The caller resolves amount to input position 0 using target's visible contract. The implementation still binds that position as n. Both contracts can coexist without runtime label strings or rewriting the implementation's names. After explicit conversion, the resulting callable can be passed, returned, or assigned where its new public label contract matches. A destination contract known only from ordinary passing/return/reassignment does not authorize conversion. No runtime lookup of implementation names or required physical wrapper is introduced.

Earlier-parameter defaults keep their implementation-local bindings too:

```text
source_pair := fn(start = 1, end = start + 1) { (start, end) }
renamed_pair: fn(first?: Int, last?: Int): (:Int, :Int) = source_pair;
renamed_pair(first = 10);  /* (10, 11): end still reads implementation-local start */
```

Names absent from the destination are unavailable to named callers; an unnamed destination input uses positional routing. This does not make an implementation-local name public.

Only label adaptation is selected here. Shape, component types, access, result/error contracts, and omission handling must still satisfy their established checks. Required public views continue to require arguments; omission-capable views need valid implementation handling, including the selected zero-callable behavior. No default expression is copied into the public type, changed, or executed merely by relabeling. The separate [safe callable value adaptation](callable-value-variance.md) rule now permits supported safe input/result type differences without a manually written wrapper. Unlike label-only conversion, that adaptation may change argument/result representation and must preserve source behavior. Basic var T callable input types now remain invariant under [var T callable invariance](callable-value-variance.md#var-parameters-keep-their-value-type); the public-label conversion bypass does not change their read/write value type or granted access. Other variance, unrelated callable/result conversions, captures, lifetime/ownership, and calling convention remain separate.

Intrinsic .call and ordinary named-call routing still use the visible callable's labels. A tuple-valued parameter is one payload whose labels must already match, or be explicitly converted before passing; that is distinct from applying a supplied-input pack whose components are routed as call arguments.

## Identity, inference, and remaining boundaries

Labels still participate in structural tuple identity: identical ordered labels and resolved component types describe the same type. Differently labeled types can be distinct while permitting this selected conversion. Inference and union normalization do not erase or arbitrarily choose labels just because layouts match. Separately declared records remain nominal; this rule does not create structural record compatibility.

Reference syntax, memory safety, alias enforcement, resource/copy eligibility, new ownership modes, general generic/overload inference, full recursive grammar, and optional stored-tuple semantics remain open or deferred under their existing contracts.

## Future in-place memory-compatible casts

Future discussion requested by the user on **2026-10-25**: explore explicit in-place type casting between memory-compatible layouts, including a nested pair plus Int and a flat triple of Int. The user's schematic shape example is retained here, not presented as validated cast/type grammar:

```text
((:Int, :Int), :Int)
(:Int, :Int, :Int)
```

This is a candidate relation for a future explicit cast, not a newly guaranteed layout equivalence. Today these nested/flat shapes remain distinct: current explicit label conversion preserves component shape/order/types and does not flatten nested tuples. Ordinary transfers remain label-sensitive.

The future discussion must define the cast spelling, what proves memory compatibility (including size, alignment, component offsets and representation), and what in-place casting means for the source value, access, lifetime/ownership, and ordinary copy semantics. No cast syntax, shared-storage view, permission upgrade, implicit flattening, scalar/tuple conversion, or changed callable arity/ABI is selected now. The user specifically requests this as future work; no implementation or conformance result is claimed.

## Related documents

- [Named routing and stored tuple order](named-input-routing.md#5-inference-and-stored-tuples-selected-order-boundary)
- [Named calls and tuples](named-arguments-and-tuples.md)
- [Tuple storage](memory-and-performance.md#tuple-labels-describe-positions-without-changing-storage)
- [Callable input packs](callable-input-packs.md)
- [Public omission and implementation defaults](callable-default-contracts.md)
