# Named arguments and named tuples

Status: **named call permutations and validation, contextual tuple construction extended to fixed destination routing on 2026-10-23, ordered stored tuples with explicit reconstruction, and typed/inferred positional and named tuple destructuring selected by the user, 2026-10-21. Tuple label compatibility and structural identity are also selected: differently labeled stored tuples require explicit reconstruction; identical ordered labels and component types describe the same tuple type. Complete recursive grammar, stored named/unnamed conversions, callable label compatibility, and explicitly marked extensions remain open**.

The [concrete routing case catalogue](named-input-routing.md) records the selected mapping algorithm and construction/storage boundary with valid and rejected examples. Remaining recommendations are explicitly marked.

## Selected basic call forms

```text
op := fn (a: Int, b: Int, c: Int): Int { a + b + c }

op(1, 2, 3);
op(a = 1, b = 2, c = 3);
op(1, 2, c = 3);
```

These forms supply the same three inputs to the same callable. Naming an argument does not turn the call into a single record or tuple argument. No extra named-parameter declaration marker is required for these simple identifier parameters. The user's abbreviated fn (a,b,c) sketch describes the call shape; it does not select independent inference of unknown function input types. Omission still requires an applicable explicitly declared default.

The comparison of all twelve established reference languages, plus supplemental C#, is in [named calls and tuples across the reference languages](named-arguments-reference-comparison.md).

## Construction spelling

Use colon for a type and equals for a supplied value, following existing record construction:

```text
resize := fn (width: Int, height: Int): Int {
    width * height
}

area := resize(width = 640, height = 480);
size := (width = 640, height = 480);
typed_size: (width: Int, height: Int) = (width = 640, height = 480);
```

The call supplies two inputs; the tuple expression illustrates one value with two components. The user selected fresh named initializers routing into a known destination order and explicit reconstruction for a differently ordered stored tuple. Core component, construction, access, and binding forms are selected. Labels now affect compatibility. Complete recursive grammar and stored named/unnamed conversion policy remain open. Existing record declarations remain nominal; this review does not give record types structural compatibility.

For calls, the user selected equals; colon-value call syntax is not the selected form. Equals reuses the selected field-value convention and leaves colon for types and type tests. The complete parser must distinguish a named entry from assignment expressions by syntactic context; it must not choose whichever interpretation type-checks.

## Selected named call routing

```text
resize(640, 480);
resize(width = 640, height = 480);
resize(height = 480, width = 640);
resize(640, height = 480);
```

Selected extension, 2026-10-23: calls construct the fixed typed input shape declared by the signature. Positional and named inputs may interleave. A positional input fills the next unfilled declared slot; a named input selects its declared slot and replaces an earlier supplied value for that slot. Thus resize(640, width = 800, height = 480) supplies final width = 800, and resize(height = 480, 640) fills width with 640. Explicit labels must be unique within a call, including =name shorthand; repeated explicit labels are errors even when their values have the same type. Spread collisions may replace a supplied value, and a unique named entry may still replace an earlier positional contribution. Reject unknown/ambiguous labels, excess positional inputs, missing required inputs, and incompatible types/access. All supplied expressions still evaluate once in written order, including replaced contributors.

The selected omission rule still applies: every unfilled input needs an applicable explicitly declared default. Named calls let a programmer supply a later input while omitting an earlier defaulted one. They do not add automatic zero arguments. Default timing is selected: evaluate supplied expressions in source order, then only missing defaults once in declared slot order before invocation. Complete declaration grammar/type establishment, lookup scope, and where defaults belong remain separate; see [default evaluation](evaluation-order.md#default-argument-evaluation-selected).

Evaluate the callee first, then supplied argument expressions once each in written order, consistent with the existing evaluation contract. In resize(height = read_height(), width = read_width()), read_height runs first even though width is the first parameter. Mapping names to input positions must not reorder side effects. Transfer and permission activation remain subject to the shared memory contract.

The user's [op1/op2 evaluation case](evaluation-order.md#named-inputs-and-destination-order) makes that distinction explicit: in (r = op1(), l = op2()), op1 executes first even when the destination lists l before r. Fresh contextual named initializers may route by destination names; differently ordered stored tuples require explicit reconstruction. The user clarified the annotated binding as (left, right): (l: Int, r: Int), with a tuple type after the colon. Core call mapping and named tuple patterns are now selected; complete recursive grammar and callable compatibility remain open. See the [concrete cases](named-input-routing.md).

Names can be resolved statically. This feature need not require a runtime name dictionary, reflection, or heap allocation. Exact passing and ABI remain separate.

## Public names and implementation-local names

```text
var area: fn (width: Int, height: Int): Int;
area = (w, h) { w * h }
result := area(width = 640, height = 480);
```

Recommend obtaining public labels from the caller-visible callable contract. A contextual lambda binds local inputs by position, as already selected; w and h should not rename the public labels width and height. Empty or partial lambda headers likewise leave those public inputs present.

A full definition such as fn (width: Int, height: Int): Int { ... } supplies the identifier labels used by its selected named calls. Public-label compatibility across stored callable assignment remains open, as do broader parameter-pattern and repeated-name declaration rules. Underscore is an ordinary readable identifier in LiteScript; this review must not silently turn it into an unnamed-input marker.

Two policies for stored callable compatibility remain open:

- Require public labels to agree when assigning callables. This protects named calls but makes a public rename a compatibility change.
- Permit positional compatibility between differently labeled signatures, with the destination contract defining labels for calls through that binding. This is easier to adapt, but the same callable can be exposed with different names.

Do not make implementation-local lambda names part of the public contract under either policy. Additional separate external/local label syntax is not proposed yet. Whether a callable with no public labels supports only positional calls also needs a decision.

## Selected shorthand and numeric access

```text
plain := (cake, tea);              /* unnamed */
meal := (= cake, = tea);           /* named */
meal := (cake = cake, tea = tea);  /* equivalent full form */
meal.0; /* same component as meal.cake */
plain.0;
```

The shorthand = identifier supplies the same identifier as label and value. Bare identifiers do not infer labels in tuple value context. Both named and unnamed tuples support fixed zero-based numeric dot access in stored order; reject out-of-range positions at compile time. Expected named destinations still accept positional initializers. See [tuple entries and access](tuple-entries-and-access.md) for examples, scope, and unresolved grammar edges.

## What should a named tuple mean?

Start with the common example:

```text
size := (width = 640, height = 480);
w := size.width;
(a, b) := size;
```

There are materially different contracts behind that spelling.

### A. Positional tuples with access labels

Names provide readable access, while assignment follows component positions and types. A width/height tuple could be assigned to a left/top tuple with the same positional types; the destination would expose its own names. This is convenient for temporary products and keeps tuples ordered. It provides no extra type protection against exchanging two equally typed components.

Label propagation through inference, branches, unions, generic APIs, and tuple spread would need rules. Conflicting names must not be chosen arbitrarily. Removing labels would not change the underlying positional type under this option.

### B. Names participate in the tuple contract

A width/height tuple would not automatically fit a left/top tuple, even when both contain two Int values. Explicit reconstruction could rename components. This protects meaning conveyed by labels but introduces additional compatibility rules alongside nominal record declarations.

The initial comparison offered ordered tuple contracts and unordered named shapes. The user now selected explicit reconstruction for a stored tuple whose component order differs from the destination. Fresh named initializers may still list entries in any written order and route into the known destination order. The user also selected rejection of different labels, even when positional types agree.

### Selected: names affect compatibility

Selected by the user, 2026-10-21: component labels carry meaning and affect compatibility. Clarified 2026-10-23: labels give existing positions semantic roles without changing storage; identical ordered component types retain identical size, alignment, and component offsets. There is no per-value label payload and no representation reason for names to occur only at the end. Equal positional types still do not permit implicit relabeling:

```text
size := (width = 640, height = 480);
point: (x: Int, y: Int) = size; /* rejected: labels differ */
```

The assignment is rejected because width/height do not match x/y. Explicit reconstruction expresses the intended renaming:

```text
point := (x = size.width, y = size.height);
```

The user emphasized that cake/tea and fruit/chocolate express different roles, even when their component types agree. Check labels statically for stored tuple assignments and parameter passing. The user subsequently selected structural tuple identity: the same ordered labels and component types describe the same tuple type wherever written. Separate record declarations retain nominal identities.

The user requested the reference-language behavior before choosing. The [focused width/height-to-x/y comparison](named-arguments-reference-comparison.md#focused-comparison-widthheight-assigned-to-xy) shows acceptance by C# and TypeScript, rejection of differently named tuples by Swift and Scala, Dart's name-sensitive but order-independent named fields, and Python's class-based construction. The subsequent user confirmation selects name-sensitive compatibility for LiteScript.

Stored component order is now selected as a compatibility boundary; fresh initializer reordering is permitted. Positional destructuring of named tuples is selected and follows stored component order. Stored unlabeled-tuple admission and explicit name removal remain open. The [concrete routing reference](named-input-routing.md) separates those remaining recommendations from selected binding rules. Existing positional lambda parameter bindings are unaffected: local implementation names do not select signature positions.

### C. Keep tuples positional and use records for named values

Named calls are already selected independently. A Size record already supports named fields, contextual construction, and named extraction. This avoids another named product category but needs a record declaration for reusable named data. Inferred standalone record types are not selected by this alternative.

```text
Size := record {
    width: Int;
    height: Int
}
size := Size { width = 640, height = 480 }
```

Record field declarations require a semicolon between adjacent ordinary fields. Newlines, tabs, and spaces do not supply separators. The final field separator is optional; the complete record declaration ends its outer item without requiring a semicolon. The equivalent compact declaration is Size := record { width: Int; height: Int }. Supplied record-value fields instead use commas. See [lexical structure](lexical-structure.md#separators).

These initial alternatives are retained for comparison. The later selected fresh-initializer/stored-order distinction now constrains the review; stored named/unnamed conversions, complete recursive grammar, and the specifically marked pattern extensions remain open. Named argument support remains a separate capability.

## A tuple argument versus spreading arguments

The subsequent [array-tail extension](tuple-array-shapes.md#a-declared-variadic-tail-collects-an-array) accepts fixed-array and runtime-array call spread in written evaluation order. Arrays supply unnamed values; fixed tuple labels retain their selected routing. A final declared ...rest: T collects additional positional inputs as an array; without it, excess inputs remain errors. A runtime-array spread after all fixed required inputs are supplied may be empty. Exact runtime routing into missing fixed slots, failure/default behavior, and named-tail supply remain open. No required value is silently manufactured.

Selected by the user, 2026-10-23:

```text
resize(size);     /* one tuple-valued argument; not this two-input resize */
resize(...size);  /* tuple components routed into declared inputs */
resize(=height, =width); /* height = height, width = width */
```

The last form uses identifier-only same-name shorthand. In a spread, labeled components route by public parameter name and unnamed components fill the next unfilled declared slot. The signature fixes available positions and types; unknown labels and excess positional inputs cannot append more parameters. A spread operand evaluates once; components are processed in stored order, and all call entries preserve written evaluation order. Repeated labels contributed through spread may replace the earlier supplied value in the same destination slot; repeated explicit labels, including shorthand, are errors. Only the final surviving input must fit that slot's declared type/access. Superseded expressions must still be valid and evaluate, but need not fit the destination; this permits patching before invocation.

A function taking one tuple remains distinct from a function taking multiple parameters: in ordinary call argument lists, only explicit spread expands components. No intermediate tuple allocation or runtime label dictionary is required. Ordinary permission, default, and cleanup contracts remain applicable. Callable public-label compatibility, superseded-value cleanup, collection call spread, and full recursive grammar remain separate. Named tuple return values remain ordinary single results.

The 2026-10-24 [intrinsic application](callable-input-packs.md#application-with-an-existing-pack) also permits `resize.call size` and `resize.call(size)` to apply a supplied-input tuple with the same routing as `resize(...size)`. Parentheses after intrinsic `.call` group its operand; ordinary `resize(size)` remains one tuple-valued input. This is explicit pack application, not implicit expansion in ordinary call argument lists. Bare `.call` supplies Unit, with the same declared-default-only omission checks. Full operand precedence and member/chaining integration remain open.

## Other grammar and type questions

The selected component forms are name: Type, bare name with an inferred type, and :Type without a name. Thus (l, r) is an inferred named schema in type context and (:Int, :Int) is an unnamed typed tuple. Bare (Int, Int) is no longer an unnamed type spelling; the earlier dangling-colon (l:, r:) form is removed. Ordinary tuple value expressions and binding patterns retain their existing roles. See [component annotation cases](named-input-routing.md#selected-tuple-type-component-grammar).

- Singleton values are selected: (value) groups, (value,) constructs an unnamed singleton, and (= value) or (label = expression) constructs a named singleton with an optional trailing comma. See [singleton values](tuple-entries-and-access.md#singleton-values-selected).
- The empty tuple is Unit, with () as an equivalent value/type spelling. Singleton types are selected: (T) groups, (:T,) is unnamed, (label: T) is named, and (label,) infers the named component type; (:T) is rejected. Pattern grouping and singleton extraction are selected: (pattern) groups, (pattern,) extracts one positional component, and (local = label) extracts by name.
- The earlier contextual construction cases retain their selected mappings; the 2026-10-23 extension now uses call-style routing for fresh constructors under known tuple destinations, with unique explicit labels, next-unfilled positional routing, permitted replacement, final-slot type/access checks, complete coverage, and no implicit component defaults. Standalone mixed tuple inference now allows named/unnamed interleaving and replaces spread collisions in their earlier slots, with the surviving contribution determining the inferred field type; duplicate explicit construction labels are errors; (42, = tea) infers (:Int, tea: String) when tea is String. Corresponding mixed type components and interleaved stored layouts are selected. Complete recursive grammar, complete generic/overload inference, and stored named/unnamed conversion policy remain open. Function calls now permit interleaving, next-unfilled positional routing, and named replacement against fixed declared slots, with explicit argument labels required to be unique. Fixed numeric dot access is selected; runtime variable tuple indexing is rejected. Complete numeric-suffix scanning and computed compile-time position syntax remain separate. Named destructuring uses destination = sourceField; the separately selected = identifier pattern shorthand expands to identifier = identifier. Require complete coverage unless one final ...rest captures all unselected components. Named selector rest preserves source order, labels, and types; reject unknown/duplicate source selectors. See [named rest](tuple-spread-and-rest.md#named-selectors-with-rest-selected).
- Existing destination-from-source record patterns must not be reversed when named tuple extraction is specified.
- Naming a component does not add mutation permission, automatic cloning, reference semantics, default initialization, or a nullable state.

## Reference languages

- **Odin:** native named arguments use name=value; named arguments can be reordered, with positional arguments before named ones. Named results are a separate procedure facility. This is a close precedent for the selected call surface. Sources: [named arguments](https://odin-lang.org/docs/overview/#named-arguments), [named results](https://odin-lang.org/docs/overview/#named-results).
- **Zig:** anonymous struct literals supply named fields, while tuples are anonymous structs with numbered fields. Its examples distinguish named data from positional tuple data. These are useful product representations without implying LiteScript should turn a call into a single anonymous-struct input. Sources: [anonymous struct literals](https://ziglang.org/documentation/master/#Anonymous-Struct-Literals), [tuples](https://ziglang.org/documentation/master/#Tuples).
- **V:** its docs explicitly use trailing struct-literal syntax as the alternative to native named/default arguments. A call that looks named can be construction of the final struct argument. Source: [trailing struct literal arguments](https://docs.vlang.io/structs.html#trailing-struct-literal-arguments).
- **Rust:** ordinary call grammar lists argument expressions, and tuple fields are positional, numbered from zero. These contracts keep call inputs and tuple values distinct. Sources: [call expressions](https://doc.rust-lang.org/reference/expressions/call-expr.html), [tuple types](https://doc.rust-lang.org/reference/types/tuple.html).
- **C++:** ordinary function calls use argument initializer clauses corresponding to parameters. Designated initialization belongs to aggregate construction; it is a way to label fields of an argument object, not a public function-parameter-label mechanism. Sources: [function calls](https://eel.is/c++draft/expr.call), [aggregate initialization](https://eel.is/c++draft/dcl.init.aggr).
- **C#:** tuple assignment and equality ignore field names. Friendly field names are replaced with the corresponding default member names at compile time. This is a concrete precedent for option A. Source: [tuple field names](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples#tuple-field-names).
- **Dart:** its records can contain positional and named fields. Named field names participate in structural shape; their written order does not. Positional field labels are documentation only. This is a concrete precedent for option B's unordered named portion, rather than a reason to change LiteScript's selected nominal record identity. Source: [records](https://dart.dev/language/records).

Related: [functions](functions.md), [argument omission](union-parameter-defaults.md), [tuples and patterns](tuples-and-patterns.md), [tuple spread and rest](tuple-spread-and-rest.md), [records](records.md), and [evaluation order](evaluation-order.md#function-calls).
