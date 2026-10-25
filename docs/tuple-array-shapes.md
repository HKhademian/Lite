# Tuple types, array tails, and fixed-size inference

Status: **selected design direction, 2026-10-24; no compiler, parser, runtime, or performance verification**. Type construction uses label overriding, callable and ordinary tuple schemas support homogeneous array tails, and statically sized fresh bracket literals infer fixed arrays. This supersedes the earlier unconditional growable-List literal default. The 2026-10-25 revision makes expression unpacking emit logical items, preserves fixed labels, and separates shape from the selected fixed-array/tuple storage equality. Complete recursive syntax, ownership, runtime-array type spelling, and some routing details remain open.

## Type spread constructs an input contract

```text
Params1 := type (:Int, score: String, :Int);
Params2 := type (:Int, score: Int);
EachRestType := type (:X, :Y, :Z);

exp : fn (...Params1, ...Params2, ...rest: EachRestType): Int =
    (a, score, b, c, ...myrest) {
        42
    }
```

X, Y, and Z stand for established types. The type position parses each ...Params operand as tuple-type construction, not runtime value unpacking. A spread operand must supply a tuple schema. Expand its fixed components in stored order, preserving labels and types. Unnamed components append; a later contribution with an existing label replaces that label's original slot without moving it. Existing explicit-label uniqueness rules remain: a spread does not authorize duplicate explicitly written labels inside one constructor.

The fixed portion above becomes:

```text
(:Int, score: Int, :Int, :Int)
```

Params2's score overrides String with Int at position one. Its unnamed Int appends at position three. The implementation's a, score, b, c bind those four positions; local receiver names do not select fields by name. Every additional input has type EachRestType. These decisions resolve spread-label overriding during type construction; do not describe this example as strict concatenation producing duplicate score fields.

Type construction fixes the callable contract before invocation. It does not dynamically change a stored function's accepted types, infer a runtime type object, or expose captured state as call inputs. A component containing another tuple stays one component unless explicitly spread.

## A declared variadic tail collects an array

```text
max := fn (val1: Int, val2: Int, ...rest: Int): Int {
    var best := if val1 > val2 { val1 } else { val2 }
    loop rest as value {
        if value > best { best = value }
    }
    best
}

max(1, 2, 3, 4, 5);       /* rest = [3, 4, 5] */
max(1, 2);                /* rest = [] */
max(1, 2, ...(3, 4, 5));   /* rest = [3, 4, 5] */

x : [Int; 5];
max(...x);                /* two fixed inputs and three tail elements */
```

In a signature, ...rest: T means zero or more additional inputs, each checked against T. The callee receives the collected tail as an array of T, including when there are no extra inputs. It is not a fixed tuple specialized to each call's argument count. The array length may be known at a particular call site or only at runtime; both call forms are valid in this model. No minimum tail length or automatic zero-valued T element is introduced.

```text
extra := read_numbers();
max(1, 2, ...extra);

fixed: [Int; 5] = [1, 2, 3, 4, 5];
max(...fixed, ...extra);   /* rest = [3, 4, 5, ...extra] */
max(...extra, ...fixed,);  /* also valid: combined length is at least five */
max(, ...extra, ...fixed,); /* same inputs; optional boundary commas */
```

Assume read_numbers returns a readable Int array of runtime-known length. Both required inputs are supplied in max(1, 2, ...extra), so an empty extra is valid. In max(...fixed, ...extra), fixed supplies the two required inputs and contributes its remaining three elements to rest; extra contributes all of its elements afterward. Rest has length 3 plus the runtime length of extra. Evaluate both spread operands once in written order; the retention and storage rules below still apply.

The reversed order max(...extra, ...fixed,) is valid too. Compose the positional input sequence in written order, then route its first two elements to val1/val2 and the remainder to rest. The known five-element contribution proves sufficient total length even though the leading contribution has runtime length. Every possible fixed-slot or tail element has type Int, so this proof covers types as well as count.

Selected future call syntax, clarified by the user: optional leading and trailing boundary commas have no argument meaning. max(, ...extra, ...fixed,) supplies exactly the same entries as max(...extra, ...fixed). These commas do not introduce Unit values, omitted argument slots, defaults, or extra tuple components. Interior commas still separate actual entries; this is not an omitted-argument feature. Empty-list boundary variants and complete recursive grammar remain open; no parser implementation is claimed.

For fixed = [1, 2, 3, 4, 5], the resulting inputs are:

- Empty extra: val1 = 1, val2 = 2, rest = [3, 4, 5].
- extra = [9]: val1 = 9, val2 = 1, rest = [2, 3, 4, 5].
- extra = [9, 8]: val1 = 9, val2 = 8, rest = [1, 2, 3, 4, 5].
- extra = [9, 8, 7]: val1 = 9, val2 = 8, rest = [7, 1, 2, 3, 4, 5].

Fixed-slot value origins may depend on a runtime length while the destination tuple shape and admissibility proof stay static. This does not require constructing an intermediate dynamic-shape tuple or a concatenated array. The compiler must preserve once-per-expression written evaluation order and the selected storage/lifetime contract.

Selected clarification, 2026-10-24: the guaranteed contract is the statically known input tuple shape. The compiler must prove that the composition of supplied arguments satisfies it. This includes coverage of required fixed slots, existing positional/named routing, final surviving slot types and access permissions, and the declared element type of every tail input. Known length alone is not sufficient if types, labels, or permissions are incompatible. Applicable explicitly declared defaults retain their existing role; this rule introduces no implicit argument values.

The proof applies to the supplied argument composition; not every source needs a statically known element count. A runtime-sized array can feed the declared array tail without changing the tuple's fixed shape. Runtime tail length is not a runtime tuple arity or a source of new tuple fields. Exact tail representation remains separate. The later selected stored-position rule gives each declared tail one numeric tuple position, selecting its array member rather than an element.

For an ordinary runtime-sized extra with no established sufficient-length proof, max(...extra) and max(1, ...extra) are rejected: the supplied arguments cannot be proven to cover both required fixed inputs. Both orders of the fixed/runtime spread examples are accepted because the complete composition proves coverage and compatible types. A runtime spread need not occur only after the fixed inputs have been filled. A known minimum total length alone does not admit incompatible possible slot types or permissions. A runtime arity check is not a substitute for the required compile-time proof. General length-refinement syntax, defaults interacting with spreads, and full mixed named/runtime-spread routing remain open.

The name rest is a signature declaration; myrest is an implementation-local collector and need not have the same spelling. Use a single trailing declared variadic segment in the forms shown here. Public named routing into a variadic segment, defaults interacting with it, and full mixed named/runtime-spread routing still need formalization.

T may be any valid input type, including a tuple. With ...rest: EachRestType, each additional input is one intact X/Y/Z tuple and the collected value is an array of those tuples. It is not a flat repetition of X, Y, and Z. Explicit spreading at a call site continues to expand the operand's components rather than implicitly preserving it as one input.

The spelling [T; ...] used during discussion was a placeholder, not selected syntax for a runtime-length array. Standalone runtime-array type spelling, allocation, ABI, and complete ownership/lifetime machinery remain open, subject to the selected access and retention rules below. The selected [T] indexed-sequence capability does not by itself select a concrete runtime array owner either.

## Array segments can declare their static extent

Selected clarification, 2026-10-25: the rest operator declares a named homogeneous array segment in a tuple, currently only at the tail. ...name: T permits a runtime-known count; ...name: T; C requires exactly the compile-time extent C and exposes [T; C]. The segment syntax supplies the array meaning without brackets around T; C. Rest describes grouping/collection; it does not require an unknown count. An uncontextual named-tail construction from a fixed [T; C] retains C in its inferred segment type; an explicit general destination remains authoritative. Each T may itself be a tuple or array and stays one element.

```text
fixed: [Int; 3] = [1, 2, 3];
pack := (...rest = fixed);
/* pack: (...rest: Int; 3) */
written: (...rest: Int; 3) = (...rest = fixed);
```

Known local counts, public extent guarantees, and storage remain distinct. A general ...rest: T contract does not promise a particular count merely because one caller supplies it. Fixed zero/Unit segments retain semantic grouping/count despite zero element bytes. Middle collectors remain future discussion: fixed extents can delimit a middle segment; multiple unspecified extents need a partition rule. Each declared segment now occupies one stored tuple position, with numeric and labeled access selecting the same array member. See [array-segment types and future middle collectors](tuple-array-segments.md).

## Rest access, storage, and retention

Selected in the follow-up discussion, 2026-10-24: a variadic rest array provides readable access by default. Its element type and length contract do not imply ownership, writable access, or heap allocation.

```text
inspect := fn (first: Int, ...rest: Int) {
    loop rest as value {
        print(value);
    }
}

inspect(1, 2, 3);

extra := read_numbers();
inspect(1, ...extra);
```

Both calls expose the same readable rest-array contract. Explicit extra arguments can populate temporary storage for the call. A compatible existing array may supply storage directly when the lifetime, access, and observable-value rules permit it. Multiple spreads may require gathering elements; no unconditional contiguous layout, zero-copy path, or allocation strategy is selected by these examples. Reusing source storage must preserve the general ordinary-value copy semantics and cannot introduce an implicit live source-location alias. Borrowed backing is a conditional representation option, not a reference-passing default or automatic ownership conversion. Type-specific eligibility and complete safety/lifetime rules remain deferred; see [the general copy default](parameter-values-and-slots.md#general-copy-default-selected).

The selected boundaries are:

- Borrowed backing storage must remain valid throughout every permitted use. A call-scoped temporary cannot become lasting storage just because rest has an array type.
- Keeping, returning, or otherwise using rest beyond the call requires valid lasting ownership or a proven backing-storage lifetime. Do not silently copy, clone, heap-promote, or extend a borrow to repair an otherwise invalid escape.
- Creating an independent owned array from borrowed or temporary rest storage requires an explicit copy/ownership operation. Its name, syntax, element copy/move eligibility, and allocation/failure behavior remain open. This does not imply a deep clone or grant ownership of resources referenced by elements.
- A valid longer-lived borrow is not an independently owned array. The selection does not add a general escaping-reference feature or choose a lifetime-annotation syntax.
- Writable rest access requires an explicit contract and caller permission. Ordinary ...source does not grant writes into source. Mutable-tail syntax, source overlap, and whether an admitted writable collector aliases or owns storage need separate rules; no detached-copy fallback may silently replace promised caller-data writes.

An ordinary tuple containing a borrowed array tail must also preserve backing-storage validity. Its tail declaration does not establish owning versus borrowed construction. This decision settles variadic default access and explicit retention costs without choosing general parameter transport, ordinary array ownership, or tuple-tail normalization. See [ordinary parameter passing](parameter-values-and-slots.md) and [memory and performance](memory-and-performance.md).

## Ordinary tuples may have the same array tail

```text
x : (q: Int, w: Int, e: Int, ...rest: Int);
(a, b, ...xrest) := x;
/* a receives q; b receives w */
/* xrest preserves e followed by the original Int array tail */
/* remainder schema: (e: Int, ...rest: Int) */
```

The array-tail capability is not limited to functions. The tuple's fixed component schema is statically described; runtime variability belongs to its declared homogeneous array tail. This does not introduce arbitrary runtime tuple fields, labels, or independently changing component types.

### Construction guarantees the destination type

```text
Args := type (first: Int, second: Int, ...rest: Int);
extra := read_numbers();
fixed: [Int; 5] = [1, 2, 3, 4, 5];

value: Args = (...extra, ...fixed);
```

Assume extra is a readable runtime-sized Int array. This construction is valid by the same whole-composition proof as the corresponding call: the supplied sequence guarantees enough compatible values for first/second, with the remaining values collected into the declared Int array tail. The resulting value has the statically guaranteed Args tuple type. Which source supplies a fixed slot's value may depend on the runtime length of extra; the slot's declared type and the tuple shape do not. value.rest accesses the named array tail.

Runtime-dependent source routing is not a lack of type/shape knowledge. The compiler must prove that every admitted routing satisfies the destination contract, including final-slot types, permissions, and required fixed coverage. Preserve written-order source evaluation and the selected storage/lifetime rules. Do not introduce implicit tuple defaults, dynamic tuple fields, or an allocation guarantee.

### Destination types take precedence over inferred shape

Selected in the follow-up discussion, 2026-10-25: an explicit or established expected tuple type is the reference contract for construction. Its fixed components, labels, and rest segment determine the destination shape. Infer only the information it leaves unspecified, such as the element type in (...rest:). Source-driven shape defaults apply only when no destination shape has been established; they never override an explicit one.

For the following inferred examples, assume left and right are readable runtime-sized Int arrays:

```text
a := (...left);
/* (...rest: Int); tail contains left's elements */

b := (...left, ...right);
/* (...rest: Int); tail contains left, then right */

c := (...left, 1, 2);
/* (...rest: Int); tail contains left, then 1, 2 */

d := (1, 2, ...right);
/* (:Int, :Int, ...rest: Int); fixed values 1, 2; tail contains right */

e := (...left, 1, 2, ...right);
/* (...rest: Int); tail contains left, then 1, 2, then right */
```

For these unnamed positional constructions, infer fixed components before the first runtime-sized array spread. That first spread opens one trailing array segment; subsequent positional values and array spreads contribute to the same segment in written order. Its inferred label is rest. Multiple array operands contribute values to one tail rather than declaring multiple named rest segments. Ordinary values after the first runtime spread do not become fixed suffix components.

The tail's element type is the normalized union of established contribution types entering that tail; fixed-prefix components retain their individual types. Evaluate each operand once in written order. Fixed-size array spreads expand their statically known components at their written position before applying this inference rule. If every contribution has a statically known count and no explicit tail declaration requests otherwise, infer a fully fixed tuple.

These defaults do not decide construction when a destination schema is given:

```text
strict: (:Int, :Int, ...rest: Int) = (...left, 1, 2);
only_tail: (...rest:) = (1, 2, ...right);
```

strict follows its two-fixed-input destination shape. The complete supplied sequence guarantees two Int values; its first two values fill those slots, and they need not be the literal 1 and 2. only_tail instead has no fixed components because its annotation explicitly requests a rest-only shape; infer Int for its omitted element type.

Every explicit construction still needs the whole-composition coverage, final-type, label-routing, and access proof. The explicit type does not authorize incompatible values, implicit conversions, or a runtime arity fallback. c/e's constructors guarantee at least two logical supplied values without inferring two fixed tuple slots; their rest-only schemas alone do not encode that minimum. General retention of runtime-tail lower-bound facts across bindings/effects remains separate. An explicit named-tail value entry retains its own selected declaration meaning. The simple named-slot discovery cases below are now selected; logical unpacking now merges supported singly-tailed source tuples; declarations storing multiple rest segments and their other composition rules remain open.

### Named slot discovery does not reserve a value

Selected in the follow-up discussion, 2026-10-25: when no destination tuple shape is supplied and a runtime array tail is needed, statically named fixed entries may establish fixed components even when written after a runtime-sized spread. Infer the destination schema first, with those fixed components before the final tail; then apply the existing written-order routing. Slot discovery does not mark a slot filled, reserve it for a later value, or evaluate that value early.

```text
/* Assume items is a readable runtime-sized Int array. */
value := (...items, score = 10);
/* inferred shape: (score: Int, ...rest: Int) */

first_named := (score = 10, ...items);
/* same inferred shape; contributions route in a different order */
```

If items contains [1, 2, 3], the first construction routes 1 into the unfilled score slot and 2/3 into rest, then replaces score with 10. Its result has score = 10 and rest = [2, 3]. first_named fills score before the array spread, so all three array elements enter its rest. With an empty items array, the later score = 10 still fills the slot and rest is empty; with [1], that 1 is consumed and replaced, leaving an empty tail. An overwritten positional contribution is never rerouted.

Retain the leading fixed components established by the existing positional rule. Additional statically named fixed entries establish their slots in first-declaration order before the final array tail. Normal explicit-label uniqueness and fixed-slot collision rules still apply. The inferred destination's slots start unfilled; route every contribution once in written order, filling the next unfilled fixed slot positionally or selecting a slot by name, and then collecting remaining positional inputs into the tail. Later positional values do not bypass an unfilled inferred fixed slot merely because a runtime spread occurred earlier.

These simple named-entry cases extend the earlier purely positional defaults; the five unnamed examples keep their selected outcomes. A named field does not become an unlabeled array element or a fixed suffix after the tail. Infer its final contract using the existing surviving-contribution rules; all expressions must remain valid, and final slot types/access and complete coverage must be proven for every admitted runtime routing. Logical unpacking also exposes known fixed labels from supported rest-bearing sources while emitting their tail elements anonymously. Multiple stored tails and complete constraint solving remain separate.

An explicit/established expected schema is still the reference contract. Adding the same inferred schema explicitly does not change routing:

```text
explicit_value: (score: Int, ...rest: Int) = (...items, score = 10);
```

This is tuple-value shape inference, not a change to explicit-destination routing or call matching. Existing fixed-slot rejections remain: a later named override does not release a consumed positional value, and a fixed tuple with any unfilled component is rejected. The selected default-rest collision rejection also applies when a discovered fixed field is named rest; no automatic renaming or field-to-tail overwrite is introduced.

### Fixed tuple spreads participate in slot discovery

Selected in the follow-up discussion, 2026-10-25: statically named components of a fully fixed tuple spread establish inferred fixed slots just as directly written named entries do. Discover their labels, stored order, and types from the source's established tuple contract; this does not evaluate the source or fill/reserve those slots early.

```text
/* Assume items is a readable runtime-sized Int array. */
base := (score = 10, rank = 20);

value := (...items, ...base);
/* inferred shape: (score: Int, rank: Int, ...rest: Int) */

first_fixed := (...base, ...items);
/* same inferred shape, with different written-order routing */
```

For items = [1, 2, 3], value first consumes 1 into score and 2 into rank, collecting 3 into rest. The later base spread replaces score with 10 and rank with 20, yielding rest = [3]. first_fixed fills both named slots from base first, so all three items enter its tail. Empty or one-element items are also compatible because base supplies both fixed slots before construction completes. The source expressions and their contributions retain normal written-order evaluation.

This is the statically expanded form of the existing named-entry rule. Fixed named components establish slots in their existing first-contribution order; fixed unnamed components follow ordinary positional routing at the spread's place in the source sequence. Infer final contracts under surviving-contribution rules and prove coverage/types/access. Names contributed by a spread retain their existing distinction from explicitly written labels of the enclosing constructor: validate each source's own labels, preserve explicit-label uniqueness, and apply established permitted replacement rules. The default rest-label collision check remains in force.

No labels are discovered by inspecting runtime array elements. A tuple-valued tail element remains one value unless separately spread. The revised logical unpacking rule also exposes statically known fixed labels from a supported rest-bearing source while discarding only its tail-container label. This merges logical input streams without selecting multiple stored rest declarations, anonymous segment syntax, or a new copy/ownership policy.

### Destination-guided repacking

Selected in the follow-up discussion, 2026-10-25: a fixed-prefix-plus-tail tuple and a rest-only tuple can supply the same ordered inputs without being the same tuple type. Their fixed guarantees and observable tail members differ.

```text
Prefix := type (:Int, :Int, ...rest: Int);
TailOnly := type (...rest: Int);

p: Prefix = (1, 2, ...rest = [3]);
q: TailOnly = (...rest = [1, 2, 3]);
/* p.rest contains [3]; q.rest contains [1, 2, 3] */

copy := p;                   /* ordinary copy preserves Prefix */
items := (...p);              /* reconstruct three fixed Int components here */
packed: TailOnly = (...p);    /* collect the fixed prefix and tail */
unpacked: Prefix = (...q);    /* requires proof of at least two inputs */
```

Ordinary copy := p retains the source organization under normal copy/compatibility rules. Expression (...p) instead emits logical items: fixed components retain labels, and the declared tail emits its elements without its container label. The destination reconstructs them. In this example the known count gives three fixed Int components when no expected shape requests a tail; packed explicitly collects them into TailOnly. Prove every destination requirement and infer only omitted information. See [logical tuple unpacking](tuple-unpacking.md).

Reconstructing Prefix from a rest-only source takes the first two supplied values for its fixed components and collects the remainder into its array tail. The compiler must prove coverage and compatible possible slot types/access. The TailOnly schema alone guarantees no minimum length; the unpacked line is admitted only when additional established static facts prove at least two elements. A runtime arity check or synthesized value does not replace that proof. Known-size local tail constructions retain their concrete extent as selected below; the complete policy for propagating those facts across effects and API boundaries remains open.

The supported example has compatible unnamed fixed components and the same explicit tail label. Label-only conversion of a whole stored tuple at an explicit typed receiving declaration is selected separately, with ordinary transfers remaining label-sensitive; it does not repack a prefix/tail partition. See [labels under an explicit destination type](tuple-label-conversions.md). Preserve existing named-component routing, label-sensitive compatibility, written-order single evaluation, and permissions; this does not select arbitrary value permutation, mixed-label collision rules, multiple stored tails, unchecked casts, zero copying, shared storage identity, or a new allocation policy. Tuple-valued elements stay intact unless separately spread. Call sites retain their established whole-composition proof and tail-forwarding rules.

### Rest-only tuples need no fixed components

```text
OnlyRest := type (...rest: Int);
named: OnlyRest = (...extra);

a := (...fixed);   /* five statically known unnamed Int components */
b := (...extra);   /* zero fixed components plus an Int array tail */
```

A tuple may have an empty fixed prefix and still contain its declared rest array. Therefore b := (...extra) is a valid inference direction once extra's element type is known; it is not rejected merely because the array length is runtime-sized or there is no expected destination. The statically known shape is a rest-only tuple, not a tuple with a runtime-selected number of fixed components. An empty extra produces an empty tail while preserving that same rest-only shape; it is not Unit. Bare-array identity/equivalence remains separate.

The discussion's (...(), ...rest) describes this empty-prefix-plus-tail decomposition. It does not add a second type-construction spelling or require a runtime prefix value. The selected default label for an unannotated inferred rest-only tail is rest: b has the inferred schema (...rest: Int), and b.rest accesses its array. This label is independent of the source expression's spelling, so (...read_numbers()) gets the same label. rest remains an ordinary member label, not a reserved keyword. An expected schema or explicit named-tail construction can choose another label. Existing label-sensitive tuple rules still apply; full tail compatibility, exact representation, and normalization/equivalence with a bare array remain open. Multiple rest segments remain a future discussion.

### Default tail-label collisions are rejected

Selected in the follow-up discussion, 2026-10-25: reject an inferred tuple schema when its default array-tail label rest conflicts with a fixed member already named rest. The compiler must not silently overwrite the fixed member, replace it with a rest segment, invent another label, or treat rest as a reserved keyword.

```text
items := read_numbers();
value := (rest = 10, ...items);
/* rejected: the inferred tail label rest conflicts with the fixed member */

value: (rest: Int, ...numbers: Int) = (rest = 10, ...items);
/* valid for a compatible Int array source */
/* value.rest is 10; value.numbers is the array tail */
```

The explicit destination is the reference contract. It names the fixed member rest and the array tail numbers, so no default tail label is generated and the collision is removed. Preserve the ordinary coverage, type, label-routing, permission, and source-evaluation requirements; an explicit schema does not bypass those checks.

This is a collision of member declarations during inference, not an ordinary contribution replacing a value in an established fixed slot. Existing fixed-component append-or-replace rules are unchanged. Compare member labels rather than lexical variable names: a positional value expression named rest does not itself declare a fixed member named rest. Likewise, rest remains usable as an ordinary label when no default-tail collision occurs. Other tail-label collision/merge cases and multiple declared rest segments remain separate.

### Storage equality does not erase shape

The selected [fixed-array layout](memory-and-performance.md#fixed-arrays-share-homogeneous-tuple-storage) equals the corresponding homogeneous unnamed fixed tuple, without an array-specific header, runtime length field, or indirection. This is a storage guarantee, not type identity, an ABI choice, or a promise of free repacking. Element representation and normal copy/access rules remain.

A Unit value is still one emitted item. [Unit; 5] has five static positions and zero element bytes, while (...rest: ()) can hold any count of Unit elements and (...rest: [Int; 0]) any count of empty-array elements. Those element types do not declare empty tails. Fixed counts belong to static types; runtime counts belong to their containers. See [zero storage and semantic shape](unit.md#zero-storage-does-not-erase-shape).

### Zero and singleton fixed expansion versus declared tails

Selected in the follow-up discussion, 2026-10-25: without a destination requesting a different shape, fixed-array spread enumerates its known fixed arity. An explicit named rest declaration instead preserves a tail-bearing tuple schema, including when the source array has zero or one element.

```text
arr0: [Int; 0] = [];
a0 := (...arr0);
/* Unit: zero fixed components and no declared tail */
b0 := (...rest = arr0);
/* (...rest: Int; 0): declared tail with zero elements */

arr1: [Int; 1] = [1];
a1 := (...arr1);
/* (:Int,): one fixed Int component; not the Int scalar */
b1 := (...rest = arr1);
/* (...rest: Int; 1): declared tail with one element */
```

The explicit spread marker identifies tuple construction, so (...arr1) needs no singleton comma in its expression; its resulting unnamed singleton type is still (:Int,). b1 instead exposes its stored array through .rest. Ordinary copies of b0/b1 keep those declared tails. Under the revised expression-unpacking rule, (...b0) emits zero items and reconstructs Unit, while (...b1) emits one Int item and reconstructs a fixed singleton. Uncontextual b0/b1 now infer (...rest: Int; 0) and (...rest: Int; 1); the general (...rest: Int) contract still encodes no exact count.

A stored or ordinarily copied declared tail does not disappear because its array is empty: b0 is not Unit, and b1 is not a fixed singleton or scalar. Explicit logical unpacking followed by reconstruction can remove that grouping when its extent is known. An unknown runtime extent instead yields the appropriate inferred tail; runtime emptiness does not change the inferred type. Bare-array type identity remains separate.

Under call expansion, a0/b0 each contribute zero inputs and a1/b1 each contribute one Int input. Ordinary required-input/type/access checks still apply. Without expansion, each tuple remains one supplied value of its own type. Empty tuple patterns retain their Unit-only contract and do not become tests for empty rest arrays. Preserve source-once evaluation even for zero-element expansion. This selects no new ownership, copy/move, allocation, or layout-equivalence rule.

An explicit or expected tuple schema remains authoritative over these inferred outcomes, under the existing checked reconstruction rules. The arr0 example obtains Int from its explicit array type; it does not select an element-type default for an otherwise unconstrained [].

### Named rest values and same-name shorthand

Selected in the follow-up discussion, 2026-10-25: a tuple value can explicitly name its array tail, with the same-name shorthand following the ordinary label convention.

```text
/* Assume extra is a readable runtime-sized Int array. */
b := (=...extra);
/* shorthand for b := (...extra = extra); */

c := (...extra = read_numbers());
d := (...extra = []);
e := (...extra = [1, 2, 3, 4]);
```

In a tuple value entry, ...name = expression declares an array-tail segment named name and initializes it from the compatible array expression. The name before = is a literal member label, not assignment to an existing variable; it need not already be bound. The shorthand =...name expands to ...name = name, reading the ordinary lexical value once and using the same identifier as the tail label. Like ordinary =name shorthand, it requires one identifier rather than a member access, call, or arbitrary expression.

Thus b and c expose their arrays as b.extra and c.extra. e also has zero fixed components and a tail named extra holding four Int elements: the explicit ellipsis declares a tail even though the source literal has a known fixed extent. Without that explicit tail declaration, spreading a fixed array continues to infer fixed tuple components. An ordinary name = array entry remains an ordinary array-valued component; it does not acquire the variadic construction contract merely from containing an array.

For d, the rest-only shape and label extra are explicit, but [] alone supplies no established element type under the current empty-literal rules. This spelling alone does not select a default element type. An expected element contract can supply the missing information:

```text
typed_empty: (...extra: Int) = (...extra = []);
```

This supplies an Int tail contract for the empty value without choosing a global empty-literal default or a concrete owning-array representation. Empty literals without element-type evidence remain separate; known-type heterogeneous construction follows the union inference rule below.

Both full and shorthand forms evaluate their source once and preserve existing access, lifetime, retention, and cleanup requirements; neither grants mutation nor promises allocation, cloning, or ownership transfer. Reserve ...identifier = at tuple-value entry level for this named-tail form, rather than using type/name lookup to decide whether it is an assignment expression to spread. This selection covers a single declared tail; general mixed named-entry composition, other collisions involving tail labels, multiple stored rest segments, and complete recursive grammar remain open. It does not select direct named variadic call supply or new pattern syntax; spreading a stored rest-bearing tuple into a call has the rule below.

### Spreading a rest-bearing tuple

Selected revised model, 2026-10-25: expression spread emits logical items in stored order. Fixed component labels and types survive. A declared tail emits its array elements as unnamed items; its container label is not emitted. The destination then constructs the result. This supersedes the earlier claim that inferred (...pack) preserves the declared tail schema.

```text
pack := (...numbers = [1, 2, 3]);
copy := pack;
/* retains the named numbers tail */

items := (...pack);
/* (1, 2, 3): known extent reconstructs three fixed components */

packed: (...rest: Int) = (...pack);
/* explicit reference schema recollects those items into rest */
```

Spreading two supported rest-bearing source tuples therefore merges their emitted items, not their container labels. Same-named tails do not replace one another. Real fixed labels still follow ordinary replacement/routing. Unknown extents remain represented by an inferred array tail, while known counts may reconstruct fixed components. Tuple-valued elements and ordinary array-valued fixed fields remain intact unless separately spread. Unit items count as items despite zero payload size.

Call spread and intrinsic .call use the same emitted sequence under the receiving contract. Keep static coverage/final-type/access proofs, source-once written evaluation, explicit destination precedence, and normal copy/effect rules. Type-level spread and pattern remainder capture retain their own roles. Anonymous ...= expression syntax, multiple stored rest declarations, and general runtime owner/ABI/lifetime details remain unselected. See [the full revised model and examples](tuple-unpacking.md).

### A colon distinguishes inferred rest declarations from type spread

Selected in the follow-up discussion, 2026-10-24/25: a declared rest segment may omit its element type after the required colon when static inference supplies it. No infer keyword is required or selected.

```text
Params := type (:Int, :Int);
expanded: (...Params) = (1, 2);

inferred: (...rest:) = (...extra);
collected: (...rest:) = (...fixed);
```

Assume extra is a readable runtime-sized Int array and fixed has a statically known number of Int elements. Both inferred and collected explicitly request a rest-only tuple whose tail is named rest and whose inferred element type is Int. In particular, the expected tail schema collects the fixed source into an array tail rather than inferring fixed tuple components. inferred.rest and collected.rest use the established named-array access rule.

In type position, (...Params) expands an existing tuple schema; (...rest: Int) declares a named rest segment with an explicit element type; (...rest:) declares that segment with an inferred element type. The colon distinguishes declaration from type expansion syntactically, without capitalization or name lookup choosing the parse. When its type is omitted, the next token ends the entry with a comma or closing parenthesis.

Inference must be supported by the initializer or an established expected contract. A typed empty array still supplies its element type; an untyped empty source does not acquire one from this syntax alone. Unresolved or incompatible constraints require an explicit type or a diagnostic, not runtime element inspection or an implicit Any. Heterogeneous contributions with established types use the normalized-union rule below; unresolved generic aliases and unknown callable-input inference remain separate.

This is a scoped exception for declared rest segments. Ordinary name: components still require a following type, and their existing bare-name inference form is unchanged. (...rest) cannot serve as an inferred named rest declaration in type position because it retains tuple-type expansion meaning. The unannotated value expression (...extra) remains valid under the rest-only inference rule above; an explicit schema is optional for readability and naming.

### Union element inference and known construction extents

Selected in the follow-up discussion, 2026-10-25: collecting established heterogeneous value types into an inferred rest array uses their normalized plain union as the common element type. A nonempty known-size bracket literal uses the same rule when no expected element contract selects another compatible type. Preserve existing union admission and normalization rules; no implicit Any, value-to-string conversion, or new numeric promotion is selected.

```text
values := (1, "tea", true);
pack: (...rest:) = (...values);

rest := [1, "tea", true];
named := (=...rest);
direct := (...rest = [1, "tea", true]);
/* named/direct infer (...rest: Int | String | Bool; 3) */
/* pack explicitly requests a general tail with inferred union element type */
/* all three constructions establish three elements locally */
```

All three constructions collect three elements with the common element type Int | String | Bool. Named/direct construction without an expected general destination now retains the fixed extent in the inferred segment type: (...rest: Int | String | Bool; 3). pack's explicit (...rest:) requests the general segment shape and infers its element type; its count three is a stronger local construction fact, not a new declared ; 3 contract. An explicitly written (...rest: T; C) now expresses the exact extent, while (...rest: T) still promises no exact count. A wider contract or permitted replacement/effect may hide or invalidate stronger local extent facts; complete propagation across API/ownership boundaries remains open. Runtime observation of a length does not make an arbitrary runtime-sized array compile-time-sized.

Each array position has the same union element type. The original values.0 has type Int, but the constructed rest array's fixed position has type Int | String | Bool unless a separate established narrowing proof applies. Re-expanding that fixed array into a tuple therefore supplies three union-typed components, not automatically the original heterogeneous per-position tuple types. Actual union members remain governed by ordinary admission; nested tuple-valued elements stay intact unless separately spread.

The retained extent also settles the original homogeneous forwarding example:

```text
ints := (...numbers = [1, 2, 3]);
/* concrete ints.numbers: [Int; 3] */
max(...ints); /* three known Int inputs cover max's two required inputs */
```

For a known-size nonempty construction with N contributed elements, infer [U; N], where U is the normalized union of established element contribution types, including types supplied by known-size tuple/array spreads. An explicit expected element contract remains a constraint: incompatible contributions are rejected rather than widening that contract. Unknown/overloaded element types still need resolution before this rule applies. Runtime-length literal provider selection, numeric conversions, and element ownership/layout remain separate.

Zero contributions do not provide an element type by themselves. A typed empty source or an established expected contract can supply it; an otherwise unconstrained [] still has no selected default element type. This rule does not introduce an empty-union or Never default.

The discussion's (...rest[1, "tea", true]) is treated as explanatory shorthand, not an adopted additional value syntax. The unambiguous named-tail construction is (...rest = [1, "tea", true]); ...rest[0] already has the expression role of spreading an indexed operand. Do not choose a new declaration parse using type/name lookup.

### Declared names access array tails

The declared rest segment already has a name. For the schema above, x.rest accesses its array tail through ordinary named tuple member access. No new tuple access syntax is needed. After that member access, x.rest[index] is an array-indexing expression: element access, bounds, failures, and permissions follow the array contract. The runtime array length does not introduce additional tuple positions.

```text
inspect := fn (first: Int, ...rest: Int) {
    tail := arguments.rest;
    loop tail as value {
        print(value);
    }
}
```

For callable input schemas, arguments.rest uses the declared input-tail name; an implementation-local collector name does not rename the schema member. A declared tail also occupies one stored numeric tuple position: arguments.rest and arguments at that numeric position select the same array member. Its element count does not add tuple positions. An expected schema automatically packs matching inputs into that member, while grouping examples must retain ...rest to distinguish its unpacking role from an ordinary array field. See [automatic packing and tuple positions](tuple-array-segments.md#automatic-packing-and-tuple-positions). This does not select named call routing into a variadic segment or bare-array normalization/equivalence. An empty declared tail remains distinct from Unit. Multiple declared rest segments remain a future discussion. Array indexing syntax and behavior are outside this tuple-access clarification.

### Pattern remainders preserve the tail

Review status, 2026-10-25: the [segment/pattern re-evaluation](tuple-segment-pattern-review.md) explicitly reopens the segmented-source case below. The user's requested trailing array equality does not follow from the current structural wrapper rule. Universal array-producing rest and projection of a sole remaining declared segment remain proposed alternatives; neither is selected by the examples. The structural remainder remains the documented baseline pending that decision.

A pattern rest capture preserves unselected fixed components and the existing tail in their order. It must not convert a remaining fixed field into an unrelated array element or manufacture tuple fields from the runtime tail's current length. In a callable implementation whose local header consumes all fixed inputs, its trailing collector receives the declared array tail, as myrest does above. General tail-only tuple normalization and whole-value/array identity are not selected merely by that collector behavior.

Ordinary fixed tuples keep their existing pattern-rest rule: zero fixed remaining components give Unit/(), one gives a singleton tuple, and heterogeneous remaining components preserve their individual types and labels. That pattern operation does not become a homogeneous array merely because it uses the same ellipsis marker. A declared ...rest: T array segment and a pattern ...remainder have distinct syntactic roles: one declares accepted input elements, the other collects the source's remainder.

Rest-only and mixed named/positional patterns preserve their existing source-once, no-duplicate-selection, and ownership requirements. Exact coverage without a rest collector remains required. Rest-only tuple schemas and runtime-array construction inference are selected above; bare-array normalization/equivalence, nested tail composition, and full header/type/pattern integration remain open. Numeric access to the declared segment now selects its one stored array member; it does not expand the elements. No runtime variable indexing of ordinary tuple components is added; the tail is accessed using its array contract.

## Known-size arrays and fixed tuples can construct each other

```text
x : [Int; 5];
y := (...x);
/* y: (:Int, :Int, :Int, :Int, :Int) */

z := [...y];
/* z: [Int; 5] */

w := [...x, ...y, ...z];
/* w: [Int; 15] */

u := (...x, ...y, ...z);
/* u: a fixed tuple with fifteen Int components */
```

The [T; N] spelling records the fixed-array form used in this discussion; N is a compile-time extent. Spreading such an array into a fixed tuple contributes exactly N unnamed components. Spreading a fixed tuple into an array supplies its values in stored order; each must fit the destination element type. Known lengths add when constructing combined spreads. A tuple-valued array element remains one component unless separately spread.

Homogeneous tuples give a direct element type. Heterogeneous tuples can populate an explicitly compatible common element contract, including an explicitly chosen union where ordinary admission rules permit it. Known-size nonempty heterogeneous literals now infer the normalized union of their established contribution types. Numeric conversions and unresolved element types remain separate; no implicit Any or unchecked conversion is introduced.

Evaluate each source expression once in written order. Type/length compatibility does not prove identical layout, zero copying, ownership transfer, alias safety, or no allocation. Construction and cleanup must obey the eventual memory rules. A runtime-length array can supply a declared array tail; it cannot determine a statically enumerated fixed tuple's component count without an additional proven extent.

## Known-size fresh literals infer fixed arrays

```text
x := [1, 2, 3];
/* [Int; 3], fixed binding, read-only access */

mut y := [1, 2, 3];
/* [Int; 3], fixed binding, writable elements */
y[0] = 9;

var z := [1, 2, 3];
/* [Int; 3], replaceable binding, read-only elements */
z = [4, 5, 6];
/* z = [4, 5]; rejected: incompatible fixed extent */
```

Without a more specific expected construction type, a fresh nonempty bracket literal with an established element type and statically known total length N infers [T; N]. This includes literals composed entirely from known-length fixed-array/fixed-tuple spreads. It supersedes the 2026-10-19 unconditional List default.

Readable access is implicit; writable access and binding replacement remain explicit through mut and var. Neither modifier changes the literal's collection family or extent, and later append operations do not retroactively select growable storage. Fixed arrays can permit element replacement without supporting growth. Explicitly request a growable List through an expected concrete type or constructor when growth is wanted; concrete constructor names and generic application syntax remain provisional.

The rule applies to fresh construction. Receiving an existing List/provider preserves its contract; read-only access does not freeze it, convert it into a fixed array, or establish a compile-time length. A read_numbers result whose size is known only at runtime remains runtime-sized. An abstract traversal/indexed capability supplies element/access requirements without inventing a concrete collection provider.

An established expected concrete collection type may select a different constructor family, including List. Known-type heterogeneous contributions infer their normalized union. Runtime-length spread literal provider inference, empty literals without an element-type source, unresolved element types, explicit adaptation, and allocation policy need separate rules. Do not infer a fixed extent merely from a runtime length observed once, or treat the unresolved cases as an automatic growable-List fallback.

## Header candidates that were not selected

The discussion considered fn args : Params : Return, fn args :: Return, and fn :: Return as a two-slot annotation model. Their repeated colons and empty slots were not adopted. Existing result-colon meaning remains in force.

It also considered typing a whole input pack with fn (...args: Params): Return. Under the selected variadic element rule, ...args: Params describes additional inputs each of type Params; it must not double as an annotation of the entire collected tuple. Establish a whole input contract at the destination instead:

```text
Params := type (:Int, :Int, score: Int);
exp : fn (...Params): Int = (...args) {
    args.0 + args.1 + args.score
}
```

Here the known fixed input tuple is collected with the existing rest-only receiver pattern; no variadic segment is declared in this signature. The input contract could also be implemented with explicit component receivers or the existing headerless fn/whole-pack forms. Requiring parentheses on every function literal or removing those existing forms was only an explored alternative, not a selected migration. The generic sketch Function<Result, Inputs> did not select generic punctuation, parameter order, or a new builtin Function type.

Write a space after fn in LiteScript examples, including before a parenthesized header. Omit unnecessary semicolons after completed block items at every nesting depth; preserve necessary ordinary-item separators and enclosing expression punctuation. These presentation rules do not make whitespace significant.

Related: [functions](functions.md), [callable input packs](callable-input-packs.md), [tuple spread/rest](tuple-spread-and-rest.md), [arrays](arrays.md), [lists](lists.md), [sequence families](sequence-types.md), and [ordinary parameter passing](parameter-values-and-slots.md).
