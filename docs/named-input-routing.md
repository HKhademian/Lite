# Named input routing: concrete cases

Status: **core named call routing, validation, contextual tuple construction extended to fixed destination routing on 2026-10-23, ordered stored tuples with explicit reconstruction, and named/positional destructuring selected by the user, 2026-10-21; not an implemented parser/runtime**. Typed destructuring uses a tuple type after the colon. Tuple type components use name: Type, bare name for an inferred named component, or :Type for an unnamed typed component. The earlier name: form with no type is removed. Differently labeled stored tuples require explicit reconstruction, even when their positional types agree. Identical ordered labels and component types define the same structural tuple type wherever written. Complete recursive grammar, stored named/unnamed conversions, callable compatibility, and the explicitly marked extensions remain open. Mixed tuple inference and corresponding stored type layouts now permit named/unnamed interleaving. Tuple construction appends new components and replaces label collisions involving spread in their original slots; duplicate explicit labels are errors, and the surviving contribution determines the inferred field type. Calls now use their fixed declared input shape: next-unfilled positional routing, named replacement subject to explicit-label uniqueness, =name shorthand, and explicit tuple spread, selected 2026-10-23.

## Selected value shorthand and positional access

In tuple value context, (cake, tea) remains unnamed without an expected named destination. The selected (= cake, = tea) shorthand expands to (cake = cake, tea = tea); only identifiers qualify for this shorthand. Both tuple forms expose zero-based .0, .1, and subsequent fixed positions in stored order, with out-of-range positions rejected at compile time. Existing expected named tuples still accept positional initializers. See [entry forms, access, and remaining edge cases](tuple-entries-and-access.md).

## 1. Selected rule: written order is execution order

```text
pair: (l: Int, r: Int) = (r = op1(), l = op2());
```

Assume op1 and op2 complete with compatible Int values. Execute op1 for r first, then op2 for l. Each executed occurrence runs once. The initialized pair has the destination's l, r order: pair.l holds the second result and pair.r holds the first. Name routing does not run either producer again.

The examples illustrate the selected tuple construction and component forms; complete recursive grammar still needs formalization. Newlines, tabs, and spaces do not provide separators. Semicolons separate ordinary adjacent items; commas separate tuple components and arguments. A completed outer function or record body can end its item under the existing block-boundary rule.

For function calls, evaluate the callee first, supplied expressions in written order, and invoke only after successful argument preparation. If the first expression exits outward, do not evaluate later expressions or invoke the callee. A returned intact Result is an ordinary value when the receiving contract accepts it; it does not automatically exit or unwrap. An argument's own local recovery can finish normally and allow later arguments to run.

This contract does not choose copying, moving, borrowing, access activation, rollback, or destruction order. Those operations must preserve the selected observable expression order while obeying their own permission/lifetime rules.

## 2. Function calls: selected routing

```text
op := fn (a: Int, b: Int, c: Int): Int {
    a * 100 + b * 10 + c
}

op(1, 2, 3);
op(a = 1, b = 2, c = 3);
op(1, 2, c = 3);
```

Those three call shapes are selected. All supply a = 1, b = 2, c = 3, giving the mathematical result 123 for this illustrative body.

Named entries may appear in any permutation:

```text
op(c = 3, a = 1, b = 2);
op(1, c = 3, b = 2);
op(1, b = 2, c = 3);
```

These have the same input mapping. Their expression evaluation order follows their written entries. In particular:

```text
op(c = third(), a = first(), b = second());
```

Executes third(), first(), second(), then op. The producer names do not change that order.

### Historical prefix/suffix call shapes

With these three required inputs, no spread/defaults, and the fixed mapping a = 1, b = 2, c = 3, the former prefix/suffix rule admitted exactly ten positional-versus-named orderings:

```text
op(1, 2, 3);
op(1, 2, c = 3);
op(1, b = 2, c = 3);
op(1, c = 3, b = 2);
op(a = 1, b = 2, c = 3);
op(a = 1, c = 3, b = 2);
op(b = 2, a = 1, c = 3);
op(b = 2, c = 3, a = 1);
op(c = 3, a = 1, b = 2);
op(c = 3, b = 2, a = 1);
```

A positional prefix of length zero leaves six named permutations; length one leaves two; length two leaves one; length three leaves one. These were the ten complete routing shapes under the former restriction; the 2026-10-23 extension also allows interleaving, replacement, shorthand, and spread, so this is no longer a complete catalogue. Each evaluates its expressions in written order; several shapes have the same parameter-expression order.

### Call input shape, shorthand, and spread selected

Selected by the user, 2026-10-23: a function's declared parameters define a fixed, typed, positionally ordered input shape with public labels. Calls construct inputs for that shape using positional entries, named entries, same-name shorthand, and explicit tuple spread. This is a semantic input contract, not a requirement to allocate an intermediate tuple or change the calling convention.

```text
/* op has declared inputs p1: T1, p2: T2, p3: T3, p4: T4 */
op(p1, ...(p2, p3), p4);
/* same destinations as op(p1, p2, p3, p4) */
op(=p4, =p3, =p2, =p1);
/* expands to op(p4 = p4, p3 = p3, p2 = p2, p1 = p1) */

/* the three-input op defined above: */
op(c = 3, 1, 2);             /* c = 3; then a = 1, b = 2 */
op(1, ...(c = 3, b = 2));    /* a = 1; spread routes c and b by name */
op(a = 1, ...(a = 9, b = 2, c = 3)); /* spread replaces a; final a = 9 */
op(...(a = 1, b = 2, c = 3), a = 9); /* explicit a replaces spread a */
op(1, a = 9, b = 2, c = 3);     /* replace the earlier positional a */
```

A plain identifier argument remains positional; =name is explicitly named and expands to name = name. Only an ordinary identifier is accepted for shorthand, with normal lexical value lookup. Spread an operand once, in stored component order: labeled components become named inputs, while unnamed components become positional inputs. A named tuple's physical field order need not match the signature order because its labels select the destination slots. A component containing another tuple stays one input unless separately spread.

### Static routing algorithm

The following algorithm describes fixed declared slots. The 2026-10-24 [array-tail extension](tuple-array-shapes.md) adds a final variadic segment: further positional inputs feed its homogeneous element contract rather than creating new fixed slots. Known-size arrays expand into statically routable unnamed values; runtime arrays may feed the tail once fixed required inputs are established. Exact dynamic routing into missing fixed slots, named-tail supply, and failure/default behavior remain open. Earlier fixed-only excess-input rejection applies to signatures without a tail.

For a known public signature:

1. Require unambiguous public labels for parameters addressable by name. Explicit argument labels must be unique within the call, including labels from =name shorthand, even when an intervening spread supplies the same label. Labels contributed by spread do not count as explicit labels of the enclosing call; validate each operand independently. Start with all declared input slots unfilled; declared defaults do not prefill them.
2. Process supplied entries in written order. Expand shorthand and process each spread's statically known tuple components in stored order, preserving labels.
3. An unnamed input fills the next unfilled slot in declaration order, including after named entries. Reject it if no slot remains.
4. A named input selects its declared slot. Reject an unknown/ambiguous label. If that slot was already supplied, replace its pending value without moving or adding a slot, subject to explicit-label uniqueness above; the last admitted contribution for it wins. This permits spread collisions and retains the selected named replacement of an earlier positional contribution.
5. Type-check every supplied expression under its applicable expression rules, including values later replaced. After routing and replacement, check each surviving input against its fixed slot's declared type/access contract. A superseded contribution need not fit that destination contract. No extra input slot, implicit union widening, or permission is introduced by replacement.
6. Every slot still unfilled after supplied entries needs an applicable explicitly declared default compatible with that slot. Missing required inputs remain errors; no automatic zero argument is introduced.
7. Reject invalid mappings statically before executing the call. For admitted calls, evaluate the callee first, then each supplied expression once in written order, then invoke after successful input preparation. Defaults with effects retain their separate timing/scope question.

The signature fixes the input count and destination types. Positional inputs choose unfilled slots; named inputs select a unique declared slot and may replace a previous contribution. Explicit-label uniqueness was selected for calls after the tuple clarification on 2026-10-23: repeating an explicit label is an error even when both values have the same type or value. The earlier positional-prefix/named-suffix restriction and blanket duplicate-supplied-slot rejection remain superseded; a permitted spread collision or named replacement of a positional contribution is distinct from two explicit labels. Replacement does not erase evaluation of an earlier expression, and cleanup/ownership of superseded values remains a separate contract. Normal mut/var caller grants remain required; spreading ordinary tuple values cannot manufacture writable caller locations or missing access grants.

Labels are static selectors, not expressions. A local variable named b does not change what op(b = expression) selects. Parentheses/grouping must not cause the parser to guess between an argument label and ordinary assignment according to whether type checking succeeds. Complete assignment-expression grammar remains separate.

### Selected invalid call cases

Each line below is an independent rejected example for the same op signature; assume a visible a: Int for the shorthand example:

```text
op(1, 2);                         /* missing c: no default */
op(1, 2, 3, 4);                   /* too many positions */
op(a = 1, b = 2, d = 3);          /* unknown d, missing c */
op(a = "one", b = 2, c = 3);      /* incompatible a value */
op(a = 1, b = 2, c = ?);          /* reserved storage marker is not a value */
op(a = 3, a = 1, b = 2, c = 3);  /* duplicate explicit a, despite equal types */
op(a = 1, a = 1, b = 2, c = 3);  /* duplicate explicit a, despite equal values */
op(=a, a = 1, b = 2, c = 3);     /* shorthand also supplies an explicit label */
op(...(a = "one", b = 2, c = 3), a = "still wrong"); /* final a does not fit Int */
```

Unknown or ambiguous named inputs and incompatible surviving values must not fall back to positional matching. Repeated explicit labels are errors; collisions involving spread can replace a supplied value, with each final value checked against the fixed parameter contract. Every supplied expression must still be valid and evaluate in written order. Duplicate labels in the signature remain a different issue. Duplicate labels in a public signature cannot provide an unambiguous named-call contract. Whether to support separate positional-only declarations with repeated local names remains outside the selected routing core.

## 3. Omissions, defaults, and underscore

Assume a signature has inputs a, b, c and an applicable declared constant default of 20 for b. This assumption illustrates existing default semantics without selecting declaration syntax:

```text
op(a = 1, c = 3); /* supplied a and c; declared b default applies */
op(1, c = 3);     /* same input mapping */
```

Without the declared b default, both calls are rejected. A default on c alone cannot fill b. Unit, zeroable types, unnamed lambda inputs, and zero-initialized callables do not grant omission. Exact default-expression timing/scope and placement in signatures versus implementations remain explicitly open; no effect-order claim for effectful defaults is made here.

Underscore is an ordinary readable binding, not an omission marker. Passing _ supplies its bound value. A label _ selects an actual public parameter named _. Passing _ cannot mean skip this input, and does not bypass initialization or type checking.

## 4. Fresh tuple construction: selected reordering

A fresh literal under a known named tuple contract uses the destination's component order, independently of its entry evaluation order:

```text
pair: (l: Int, r: Int) = (r = 20, l = 10);
(left, right) := pair;
```

The initialized tuple has l = 10, r = 20 in that order. Ordinary positional tuple destructuring follows that stored order, so left is 10 and right is 20.

This also applies to a known tuple-valued function input. For a function with one input pair of type (l: Int, r: Int):

```text
take_pair((r = op1(), l = op2()));
```

There is one tuple-valued argument. Its known expected type supplies the destination schema. Evaluate the callee, then op1, then op2, then invoke take_pair. This does not supply two separate function arguments.

### Earlier four selected contextual construction forms

```text
pair: (l: Int, r: Int) = (10, 20);
pair: (l: Int, r: Int) = (l = 10, r = 20);
pair: (l: Int, r: Int) = (r = 20, l = 10);
pair: (l: Int, r: Int) = (10, r = 20);
```

All initialize the same l, r destination under the selected construction rule. These remain valid cases of the extended routing below. Tuple components have no newly introduced defaults; require every component to be supplied.

These were the four complete shapes under the earlier shared prefix/suffix rule. They are no longer a complete catalogue: the user selected the following unification with call routing on 2026-10-23.

### Fixed destination routing selected

A fresh tuple constructor under a known destination tuple type uses the same entry routing as a call, with complete component coverage rather than argument defaults:

1. Begin with the destination's fixed component order, labels, and types; all slots are unfilled. Do not append components outside that shape.
2. Require unique explicit labels within the constructor after expanding =name shorthand. Spread-contributed labels do not count as explicit labels of the enclosing constructor. Validate each operand independently.
3. Process entries in written order. Expand each explicit tuple spread in its operand's stored component order, preserving labels. Each unnamed contribution fills the next unfilled destination slot.
4. Each named contribution selects its declared destination slot and may replace an earlier contribution, subject to explicit-label uniqueness. Spread collisions and named replacement of an earlier positional contribution are permitted. A label not present in the destination is an error.
5. Type-check every expression under its applicable expression rules. After routing and replacement, check each surviving contribution against the destination slot's known type/access contract. A superseded contribution need not fit that destination contract. Replacement does not change a fixed component type or infer a wider union.
6. Require every destination slot to be filled; reject excess unnamed entries and missing components. No implicit zero, record default, or call-argument default fills an omitted tuple component.

For admitted construction, evaluate every entry/operand once in written order, including replaced contributors. Routing determines the final destination order without reordering observable effects. Superseded-value cleanup/ownership remains open.

```text
pair: (l: Int, r: Int) = (r = 20, 10);
/* l = 10, r = 20: unnamed 10 fills the next unfilled slot l */

pair: (l: Int, r: Int) = (...(r = 20,), l = 10);
/* l = 10, r = 20: explicit spread routes r by name */

pair: (l: Int, r: Int) = (l = 1, ...(l = 10, r = 20));
/* l = 10, r = 20: spread replaces l */

pair: (l: Int, r: Int) = (10, l = 20, 30);
/* l = 20, r = 30: named l replaces the positional contribution */

pair: (l: Int, r: Int) = (l = "old", ...(l = 10, r = 20));
/* valid: final l fits Int; the superseded String expression still evaluates */

/* rejected: (10, l = 20); r is still missing */
/* rejected: (l = 10, l = 20, r = 30); duplicate explicit l */
/* rejected: (...(l = 10, r = 20), l = "wrong"); final l does not fit Int */
/* rejected: (r = 20, 10, 30); no unfilled slot for 30 */
/* rejected: (...(unknown = 1,), l = 10, r = 20); unknown label */
/* rejected: (...()); both destination components are missing */
```

Each rejected initializer above assumes the same (l: Int, r: Int) destination. A stored tuple used as a plain initializer still follows stored-tuple compatibility; (...stored) is explicit reconstruction and routes its contributions into the new destination. This rule does not reorder or relabel the operand itself. Grouping, singleton, and tuple syntax remain independent of expected types. Omitted component types are inferred from the final surviving contributions as specified below; complete generic constraint solving remains separate.

Expected contracts still require known labels, compatible component types, and complete initialization:

```text
pair: (l: Int, r: Int) = (l = 10, unknown = 20); /* unknown label */
pair: (l: Int, r: Int) = (l = 10, r = "twenty"); /* incompatible r */
```

Under the selected extension, (r = 20, 10) fills r then l, while (10, l = 20) remains invalid because replacing l leaves r missing. Singleton value spelling is selected separately; the empty tuple is Unit, also spelled (). The selected construction forms do not define named tuple zero/default construction or relax the selected union initialization restrictions.

### Patching and inferred component types selected

Selected by the user, 2026-10-23: route contributions and apply permitted replacement before checking the completed tuple against its destination type. This supersedes the earlier requirement that every intermediate contribution fit that destination. The user explicitly extended final-value checking to function calls too; it is not implicit conversion or permission to skip evaluating overwritten expressions.

```text
x1: (s1: T1, s2: T2, s3: T3);
x2: (s1: T1, s2: T1, s3: T3) = (...x1, s2 = fixToT1);
```

Assume fixToT1 is a value expression of type T1. Even when T2 is incompatible with T1, the reconstructed x2 is valid because its surviving s2 comes from fixToT1. This constructs x2 under its own tuple contract rather than converting or retyping x1.s2 from T2 to T1. Whether source values remain usable after spreading depends on the eventual copy/move/borrow rules. Without that patch, the surviving s2 must itself fit the destination. Unknown labels, excess positions, missing components, duplicate explicit labels, and invalid expressions remain errors. Source access, ownership, and cleanup obligations still apply to all evaluated contributions.

A label-only or partial tuple annotation fixes the destination labels/order and any already known component types. Infer each remaining component type from its final surviving contribution, without combining superseded types into a union:

```text
x: (a,) = (a = "3", ...(a = 1,));
/* inferred type (a: Int) */

x: (a: Int) = (a = "3", ...(a = 1,));
/* valid: final a fits the explicitly fixed Int */

x: (a, b: Int) = (a = "old", ...(a = 1, b = 2));
/* inferred a: Int; final b checked against Int */

/* op has one declared input a: Int */
op(...(a = "old",), a = 1); /* valid: only final a must fit Int */
op(...(a = 1,), a = "wrong"); /* rejected: final a does not fit Int */
op(a = 3, a = 1); /* rejected: duplicate explicit label */
```

If another expected contract already determines an omitted component type, check the surviving value against that type instead of reinferring it. Missing inference evidence remains an error; this selection does not complete generic, overload, or recursive inference. For calls, omitted inputs retain their applicable declared-default requirement; tuple components still acquire no implicit defaults.

## 5. Inference and stored tuples: selected order boundary

Without an expected tuple contract, infer a fully named tuple in written component order:

```text
stored := (r = op1(), l = op2());
```

Its inferred order is r, l. Execution remains op1 then op2. This order belongs to the stored value's tuple contract; a later destination does not retroactively change it.

```text
pair: (l: Int, r: Int) = stored; /* rejected: stored order differs */
pair: (l: Int, r: Int) = (l = stored.l, r = stored.r); /* explicit reconstruction */
pair: (l: Int, r: Int) = (...stored); /* explicit spread routes fields by name */
```

Both explicit reconstructions use the already produced fields; neither invokes op1/op2 again. No implicit stored-tuple permutation is selected. This is the user-selected boundary, even when component types are identical.

A literal and a stored value are different syntactic inputs to construction. Merely writing a stored value where a literal was accepted does not enable contextual rerouting. More elaborate expected-type propagation through branches, generic calls, or overloads must not silently erase the stored-value boundary.

### Label compatibility — selected

Selected by the user, 2026-10-21: different component labels prevent direct stored-tuple compatibility, even when the component types agree. This applies to assignment and tuple-valued function inputs. Labels differing at a position require explicit reconstruction:

```text
size := (width = 640, height = 480);
point: (x: Int, y: Int) = size; /* rejected: names differ */
point := (x = size.width, y = size.height); /* explicit renaming */
```

The user emphasized that cake/tea and fruit/chocolate describe different roles. Naming those roles prevents accidental interchange of equally typed components. Positional destructuring remains valid and only chooses local binding names:

```text
(width, height) := size; /* valid: binds the stored positions */
```

Fresh positional literals can still populate a known named tuple contract, and fresh named literals can still route into its destination order. Those construction rules do not allow a differently labeled stored tuple to be silently renamed. Type aliases do not bypass the label check.

### Structural tuple identity — selected

Selected by the user, 2026-10-21: the same ordered component labels and resolved component types describe the same tuple type wherever written. Repeating a tuple type expression does not create a fresh nominal identity:

```text
first: (cake: Int, tea: Int) = (1, 2);
second: (cake: Int, tea: Int) = first; /* valid: same tuple type */
```

Different binding names do not change that identity. Transparent component type aliases resolve to their underlying types. A different component label, order, or resolved type describes a different tuple type; general assignability between different component types remains a separate type-system rule. The selected same-shape rule does not permit implicit stored-tuple relabeling or permutation. Separately declared records retain their selected nominal identities.

### Remaining conversion policy — recommendation

Stored unnamed-to-named and named-to-unnamed conversions remain open; recommend explicit reconstruction initially.

### Mixed tuple inference selected

Selected by the user, 2026-10-22: mixed := (10, r = 20) infers (:Int, r: Int), and mixed := (10, = r) supplies the same label structure when the visible r has type Int. The unnamed positional prefix stays unnamed without an expected destination schema. Both components have numeric access; only the named component additionally has .r access. The matching mixed tuple type components are selected. This replaces the earlier recommendation to reject standalone mixed tuples.

A known fully named destination still supplies names for positional entries: pair: (l: Int, r: Int) = (10, r = 20) constructs l, r order with both labels. This expected-schema construction differs from uncontextual mixed inference. Source-order evaluation applies in both cases. The earlier shared prefix/suffix limitation is superseded for inferred tuple construction; known destination tuple constructors now use the selected fixed destination routing. See [mixed tuple examples](tuple-entries-and-access.md#mixed-tuples-selected). Singleton value forms are selected separately. The empty tuple is Unit, also spelled (). Interleaved mixed stored type layouts are selected; mixed positional/named selectors are now selected separately with next-unselected source routing; complete recursive type/pattern integration remains separate.

## 6. Destructuring and the user's original form

The user also selected [singleton binding patterns](tuple-entries-and-access.md#singleton-binding-patterns-selected): (pattern) groups the entire source binding, (pattern,) extracts one positional component, and (local = label) extracts the named component. No-comma positional extraction is not selected. Existing coverage-without-rest, source evaluation, and ordinary irrefutability rules apply.

The user clarified the intended annotation as (l: Int, r: Int): a named tuple type. The colon after a binding pattern supplies the source/initializer tuple contract; it does not list source-field selectors.

Named tuple patterns use the selected destination-first field clause:

```text
pair: (l: Int, r: Int) = (r = 20, l = 10);
(left = l, right = r) := pair;
(right = r, left = l) := pair;
```

In either pattern, left receives 10 from l and right receives 20 from r. Pattern order does not rename or reorder the source tuple. Resolve/evaluate the whole source once before introducing pattern bindings. Source selectors on the right of = refer to fields in that source contract, not lexical variables of the same name.

By comparison, positional destructuring follows the stored tuple order:

```text
stored := (r = 20, l = 10);
(first, second) := stored; /* first = 20, second = 10 */
(left = l, right = r) := stored; /* left = 10, right = 20 */
```

Without rest, tuple patterns require exact component coverage: reject unknown or duplicate source selection and omitted components. Named selectors with one final ...rest remove their chosen fields and capture every unselected component in source order, preserving labels and types. Mixed positional/named selector patterns are also selected: process entries left to right, with a positional entry taking the next unselected source position and a named entry selecting its source field. Each source component can be selected once; there is no lookahead reservation or replacement. Selector order affects binding order, not remainder order; evaluate the source once. Numeric positions restart at zero within rest. A rest capture does not supply missing fields. Mixed source tuples may retain unnamed components in rest. See [mixed tuple patterns](tuple-spread-and-rest.md#mixed-positional-and-named-tuple-patterns-selected) and [named selectors with rest](tuple-spread-and-rest.md#named-selectors-with-rest-selected). This tuple-pattern rule does not decide record omission/rest rules.

### Same-name tuple pattern shorthand selected

Selected by the user, 2026-10-23: in a named tuple pattern, = identifier expands to identifier = identifier. The left identifier introduces the local binding; the right identifier selects the source field. Both explicit clauses and shorthand clauses are named selectors, so either may appear in any selector order.

```text
meal := (cake = 10, tea = 20, fruit = 30);
(=fruit, =tea, =cake) := meal;
/* equivalent: (fruit = fruit, tea = tea, cake = cake) := meal; */
/* fruit = 30; tea = 20; cake = 10 */

(=fruit, drink = tea, dessert = cake) := meal;
(=fruit, ...rest) := meal;
/* rest = (cake = 10, tea = 20) */
```

Evaluate the source once. The shorthand selects fields, not outer lexical values, and never means positional selection or equality comparison. It also establishes a named singleton pattern: (=fruit) := (fruit = 30). The existing == expression pattern remains the explicit value-comparison form.

Reject ambiguous or invalid mappings rather than guessing: expand shorthand before checking duplicate source selectors, reject unknown source labels, and require full coverage unless a final rest captures the remainder. A shorthand operand must be one identifier; =expression is not a general pattern production. For example, (=fruit, =fruit, ...rest) repeats a source field, (=coffee, ...rest) names an unknown field in meal, and (=meal.fruit) is not identifier shorthand. All are rejected.

This selects tuple pattern shorthand separately from tuple value shorthand; shorthand in other contexts is selected independently. Mixed positional/named tuple patterns are now selected, and shorthand remains a named selector within them. Complete parsing must establish syntactic roles without whitespace, capitalization, type lookup, or expected-type guesses. Existing ordered destination shadowing remains deterministic and is not rejected as an ambiguous source mapping.

Repeated destination bindings retain the already selected written-order shadowing rule:

```text
(value = l, value = r) := pair; /* final visible value binds r */
(_ = r, _ = l) := pair;         /* final readable _ binds l */
```

These select different source components, despite repeating a binding name. By contrast, (left = l, right = l) selects l twice and is rejected by the initial duplicate-source rule. Binding order must not silently duplicate ownership, authorize overlapping writes, or specify user-defined getter/destructor effects; those remain governed by the shared pattern/memory rules.

### The five declaration forms clarified

Assume epx is an initialized tuple whose contract is (l: Int, r: Int). The examples are independent declarations:

```text
(left, right): (l: Int, r: Int) = epx;
(left, right) := epx;
(left, right) := (l = 1, r = 2);
(left, right): (l: Int, r: Int) = (l = 1, r = 2);
(left = l, right = r): (l: Int, r: Int) = (l = 1, r = 2);
```

All are valid under the selected tuple direction. The first uses an explicit tuple type and positional binding; the second infers the stored tuple contract and binds by position. The third infers a fresh tuple in written l, r order. The fourth uses the annotated expected tuple type for construction. The fifth additionally selects fields by name in its binding pattern. In the last three examples, left is 1 and right is 2.

For a reversed fresh initializer, an explicit expected type establishes destination order:

```text
(left, right): (l: Int, r: Int) = (r = 2, l = 1);
```

Here left is 1 and right is 2. An unannotated fresh literal instead infers written component order:

```text
(left, right) := (r = 2, l = 1); /* left = 2, right = 1 */
```

Named binding can explicitly select either source order without converting the whole stored value. A whole-tuple type annotation still checks the source contract before the pattern is applied; a named pattern cannot bypass a stored tuple order mismatch.

### Named components with inferred types — selected

The latest user clarification replaces the earlier retained-colon omission form. Bare names are component labels in tuple type annotations; their types are inferred from the static initializer/expected contract:

```text
(left, right): (l, r) = (1, 2);
(left, right): (l, r) = (l = 1, r = 2);
(left, right): (l, r) = (r = 2, l = 1);
(left = l, right = r): (l, r) = (l = 1, r = 2);
```

Each annotated initializer establishes l, r order, with Int types inferred from the corresponding surviving contributions. All four examples bind left = 1 and right = 2. Partial annotations such as (l, r: Int) infer l from its final surviving contribution while checking final r against its explicit type. Labels are static names; inferred types do not depend on runtime values. See [patching and inferred component types](#patching-and-inferred-component-types-selected).

Omitting component types does not omit or default their values. For stored epx in l, r order, (left, right): (l, r) = epx infers component types and binds by position; a stored r, l tuple still requires explicit reconstruction. Missing inference evidence is an error, without assuming Int, Unit, Any, or a dynamic type. Bare label-only schemas are not complete standalone aliases/signatures unless an applicable static contract determines their missing types.

### Selected tuple type component grammar

Use exactly these three component forms:

```text
(l: Int, r: Int) /* named components, explicit types */
(l, r)          /* named components, inferred types */
(:Int, :Int)    /* unnamed components, explicit types */
```

A descriptive component production is:

```text
tuple_type_component := identifier ":" type
                      | identifier
                      | ":" type
```

The bare identifier production supplies a label, never a positional type selected by capitalization or name lookup. Thus (Int, Int) no longer spells a pair of unnamed Int types; bare entries would be labels and duplicate labels are rejected. Write (:Int, :Int). The former (l:, r:) spelling is removed: a written colon requires a following type. A component containing only : is likewise invalid. Ordinary identifier and tuple-shape rules still apply.

These declarations are now valid in the selected direction:

```text
pair: (:Int, :Int) = (1, 2);
(left, right): (:Int, :Int) = (1, 2);
NameAge := type (:String, :Int);
```

The entry forms follow the existing type-only : Type convention while retaining context-specific meaning. In a tuple type, :Int describes an unnamed component. In a pattern, :Int tests a component without binding. A named _: Int component is not an unnamed placeholder; underscore remains an ordinary identifier.

The enclosing syntactic context establishes the role of parentheses. In a type annotation, (l, r) is a named schema with inferred types. In a value expression, (l, r) constructs a tuple from lexical values. In a binding pattern, (l, r) introduces positional bindings. Type-name lookup and capitalization must not choose among these parses. A component uses either a variable binding or a nested pattern; no combined whole-value collector is selected. After colon, a tuple type constrains the variable binding and its labels do not introduce component locals. Complete recursive parsing remains open.

All three component forms may contain a nested tuple type where a type is written, for example (:Int, :(:Bool, :String)). Mixed tuple types with an unnamed prefix and named suffix, such as (:Int, tea: String), are selected. Singleton value construction is selected separately. The empty tuple is Unit, also spelled (). Named/unnamed components may interleave in stored tuple type layouts. The 2026-10-24 [array-tail extension](tuple-array-shapes.md) selects homogeneous variadic elements in callable and ordinary tuple schemas. Full recursive type/pattern integration remains open. Singleton types use (T) for grouping, (:T,) for an unnamed component, (label: T) for a named component, and (label,) for an inferred named component; (:T) is rejected. See the [singleton type boundary](tuple-entries-and-access.md#2-singleton-type-boundary-selected). The choice does not rename public function parameters or select unknown-input lambda inference.

## 7. Callables, nested inputs, and permissions

Recommend taking public call labels from the statically visible callable contract. Contextual lambda headers retain positional local naming:

```text
var difference: fn (l: Int, r: Int): Int;
difference = (x, y) { x - y }
difference(r = 2, l = 10); /* proposed public-label routing: result 8 */
```

The local x/y names do not become public argument labels. The same holds for empty/partial contextual lambda headers. Stored full-callable compatibility, public label renaming, overloads, unions of different callable contracts, and label-free function types remain separate choices; reject ambiguous routing rather than searching runtime values for names.

Nested expressions follow ordinary recursive evaluation. In op(c = outer_c(), a = nested(inner1(), inner2()), b = outer_b()), execution after evaluating op's callee is outer_c, nested's callee, inner1, inner2, nested's body, outer_b, then op's body, assuming normal completion throughout. Names at each call level route only that call's inputs.

Named inputs must preserve existing explicit caller grants. Recommend composing the label with the complete argument form:

```text
rename(user = mut mutable_user);
replace(target = var replaceable_user);
```

The actual signatures and source locations must already permit those grants. A named argument without mut/var cannot stand in for a required explicit grant. Var arguments select caller locations rather than snapshotting their payloads into substitute temporary values. Exact overlap and access-activation checks remain part of the shared memory design.

## 8. Spreading and remaining boundaries

Explicit tuple call spread is selected: op(...tuple_value) processes labeled components as named inputs and unnamed components through next-unfilled positional routing. In contrast, op(tuple_value) supplies one tuple-valued input. The signature still determines required fields, types, defaults, and permissions. The 2026-10-24 extension also selects fixed-array call spread and runtime-array supply into declared homogeneous variadic tails once required fixed inputs are established. List/set/other provider adaptation and runtime spread into missing fixed inputs remain open; see [array-backed variadics](tuple-array-shapes.md#a-declared-variadic-tail-collects-an-array). No intermediate tuple allocation, runtime label dictionary, or ABI change is required by this contract.

Aliases cannot hide a stored tuple assignment order mismatch; normalized tuple contracts decide it. Explicit call spread is a routing operation rather than direct stored-tuple assignment, so a differently ordered labeled source can supply inputs by name. Named-field selectors must be statically available and accessible on the source. Union-valued components retain their existing member/widening contracts; naming a field does not unwrap Result/Option or choose a union member. Generic expected-schema discovery and full source grammar remain open.

This case catalogue covers the structural success/failure classes for the selected routing and explicitly marked extensions: positional, fully named, mixed, reordered, missing, excess, unknown, duplicate, incompatible type/access, contextual versus stored, inferred versus expected, nested calls, shadowing, and outward exits. It is a design audit, not a claim that a LiteScript parser or runtime has executed these examples.

## Review evidence and limits

Historical evidence for the former routing algorithm: an independent finite model was evaluated on 2026-10-21. It enumerated 781 abstract call-entry shapes for three parameters, including positional entries, known labels, an unknown label, missing entries, excess entries, and duplicate selections. Its ten accepted complete shapes exactly match the ten listed above. Giving b an explicit default admits thirteen shapes. A corresponding two-component contextual tuple model enumerated 85 entry shapes and admitted the four listed construction forms.

The model checks static position/name routing only. Types, permissions, defaults with effects, pattern ownership, source parsing, and runtime execution were reviewed as contract boundaries, not executed as LiteScript. These counts describe the former prefix/suffix algorithm, do not validate the 2026-10-23 extension, and do not constitute compiler or runtime verification. No new model or language tests were run for the extension.

Related: [named arguments and tuples](named-arguments-and-tuples.md), [reference comparison](named-arguments-reference-comparison.md), [evaluation order](evaluation-order.md), [tuple patterns](tuples-and-patterns.md), [aggregate patterns](aggregate-patterns.md), [argument omission](union-parameter-defaults.md), and [caller grants](caller-mutation-grants.md).
