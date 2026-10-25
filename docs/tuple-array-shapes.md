# Tuple types, array tails, and fixed-size inference

Status: **selected design direction, 2026-10-24; no compiler, parser, runtime, or performance verification**. Type construction uses label overriding, callable and ordinary tuple schemas support homogeneous array tails, and statically sized fresh bracket literals infer fixed arrays. This supersedes the earlier unconditional growable-List literal default. Complete recursive syntax, ownership, runtime-array type spelling, and some routing details remain open.

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

The proof applies to the supplied argument composition; not every source needs a statically known element count. A runtime-sized array can feed the declared array tail without changing the tuple's fixed shape. Runtime tail length is not a runtime tuple arity or a source of new tuple fields. Exact tail representation and numeric access remain separate questions.

For an ordinary runtime-sized extra with no established sufficient-length proof, max(...extra) and max(1, ...extra) are rejected: the supplied arguments cannot be proven to cover both required fixed inputs. Both orders of the fixed/runtime spread examples are accepted because the complete composition proves coverage and compatible types. A runtime spread need not occur only after the fixed inputs have been filled. A known minimum total length alone does not admit incompatible possible slot types or permissions. A runtime arity check is not a substitute for the required compile-time proof. General length-refinement syntax, defaults interacting with spreads, and full mixed named/runtime-spread routing remain open.

The name rest is a signature declaration; myrest is an implementation-local collector and need not have the same spelling. Use a single trailing declared variadic segment in the forms shown here. Public named routing into a variadic segment, defaults interacting with it, and full mixed named/runtime-spread routing still need formalization.

T may be any valid input type, including a tuple. With ...rest: EachRestType, each additional input is one intact X/Y/Z tuple and the collected value is an array of those tuples. It is not a flat repetition of X, Y, and Z. Explicit spreading at a call site continues to expand the operand's components rather than implicitly preserving it as one input.

The spelling [T; ...] used during discussion was a placeholder, not selected syntax for a runtime-length array. The exact rest-array type notation, allocation, ABI, and complete ownership/lifetime machinery remain open, subject to the selected access and retention rules below. The selected [T] indexed-sequence capability does not by itself select a concrete runtime array owner either.

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

Both calls expose the same readable rest-array contract. Explicit extra arguments can populate temporary storage for the call. A compatible existing array may supply storage directly when the lifetime, access, and observable-value rules permit it. Multiple spreads may require gathering elements; no unconditional contiguous layout, zero-copy path, or allocation strategy is selected by these examples. Reusing source storage must not silently change observable aliasing or mutation behavior; their complete rules remain open.

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

### Rest-only tuples need no fixed components

```text
OnlyRest := type (...rest: Int);
named: OnlyRest = (...extra);

a := (...fixed);   /* five statically known unnamed Int components */
b := (...extra);   /* zero fixed components plus an Int array tail */
```

A tuple may have an empty fixed prefix and still contain its declared rest array. Therefore b := (...extra) is a valid inference direction once extra's element type is known; it is not rejected merely because the array length is runtime-sized or there is no expected destination. The statically known shape is a rest-only tuple, not a tuple with a runtime-selected number of fixed components. An empty extra produces an empty tail while preserving that same rest-only shape; this does not select identity with Unit or a bare array.

The discussion's (...(), ...rest) describes this empty-prefix-plus-tail decomposition. It does not add a second type-construction spelling or require a runtime prefix value. The selected default label for an unannotated inferred rest-only tail is rest: b has the inferred schema (...rest: Int), and b.rest accesses its array. This label is independent of the source expression's spelling, so (...read_numbers()) gets the same label. rest remains an ordinary member label, not a reserved keyword. An expected schema or explicit named-tail construction can choose another label. Existing label-sensitive tuple rules still apply; full tail compatibility, exact representation, and normalization/equivalence with a bare array remain open. Multiple rest segments remain a future discussion.

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

This supplies an Int tail contract for the empty value without choosing a global empty-literal default or a concrete owning-array representation. Empty/heterogeneous inference beyond such established constraints remains separate.

Both full and shorthand forms evaluate their source once and preserve existing access, lifetime, retention, and cleanup requirements; neither grants mutation nor promises allocation, cloning, or ownership transfer. Reserve ...identifier = at tuple-value entry level for this named-tail form, rather than using type/name lookup to decide whether it is an assignment expression to spread. This selection covers a single declared tail; general mixed-entry composition, collisions involving tail labels, multiple rest segments, and complete recursive grammar remain open. It does not select named variadic call supply or new pattern syntax.

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

Inference must be supported by the initializer or an established expected contract. A typed empty array still supplies its element type; an untyped empty source does not acquire one from this syntax alone. Unresolved or incompatible constraints require an explicit type or a diagnostic, not runtime element inspection or an implicit Any. General heterogeneous element inference, generic aliases, and unknown callable-input inference are not selected by this rule.

This is a scoped exception for declared rest segments. Ordinary name: components still require a following type, and their existing bare-name inference form is unchanged. (...rest) cannot serve as an inferred named rest declaration in type position because it retains tuple-type expansion meaning. The unannotated value expression (...extra) remains valid under the rest-only inference rule above; an explicit schema is optional for readability and naming.

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

For callable input schemas, arguments.rest uses the declared input-tail name; an implementation-local collector name does not rename the schema member. This named access does not select named call routing into a variadic segment, numeric tuple access to the tail, its exact numeric position/component-count model, or tail-only normalization. Multiple declared rest segments remain a future discussion. Array indexing syntax and behavior are outside this tuple-access clarification.

### Pattern remainders preserve the tail

A pattern rest capture preserves unselected fixed components and the existing tail in their order. It must not convert a remaining fixed field into an unrelated array element or manufacture tuple fields from the runtime tail's current length. In a callable implementation whose local header consumes all fixed inputs, its trailing collector receives the declared array tail, as myrest does above. General tail-only tuple normalization and whole-value/array identity are not selected merely by that collector behavior.

Ordinary fixed tuples keep their existing pattern-rest rule: zero fixed remaining components give Unit/(), one gives a singleton tuple, and heterogeneous remaining components preserve their individual types and labels. That pattern operation does not become a homogeneous array merely because it uses the same ellipsis marker. A declared ...rest: T array segment and a pattern ...remainder have distinct syntactic roles: one declares accepted input elements, the other collects the source's remainder.

Rest-only and mixed named/positional patterns preserve their existing source-once, no-duplicate-selection, and ownership requirements. Exact coverage without a rest collector remains required. Rest-only tuple schemas and runtime-array construction inference are selected above; tail-only normalization, nested tail composition, numeric access to a tail segment, and full header/type/pattern integration remain open. No runtime variable indexing of ordinary tuple components is added; the tail is accessed using its array contract.

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

Homogeneous tuples give a direct element type. Heterogeneous tuples can populate an explicitly compatible common element contract, including an explicitly chosen union where ordinary admission rules permit it. General heterogeneous-literal inference and numeric common-type selection remain open; no implicit Any or unchecked conversion is introduced.

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

An established expected concrete collection type may select a different constructor family, including List. Runtime-length spread literal inference, empty literals without an element-type source, heterogeneous literals, explicit adaptation, and allocation policy need separate rules. Do not infer a fixed extent merely from a runtime length observed once, or treat the unresolved cases as an automatic growable-List fallback.

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
