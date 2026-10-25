# Tuple value entries and positional access

Status: **named-entry shorthand and zero-based positional access selected by the user, 2026-10-21; runtime variable indexing rejected, mixed named/unnamed tuples, singleton value/type forms, singleton binding/grouped patterns, the empty tuple pattern, and Unit/() empty tuple identity selected by the user, 2026-10-22. Design contract, not an implemented parser/runtime**.

## Selected value entry forms

```text
cake := 10;
tea := 20;

plain := (cake, tea);              /* unnamed components */
meal := (= cake, = tea);           /* named components */
meal := (cake = cake, tea = tea);  /* equivalent full spelling */
order := (dessert = cake, drink = tea);
```

In a tuple value, an ordinary expression supplies a positional component without inferring a label from its spelling. The shorthand = identifier uses that identifier both as the component label and as the lexical value expression. Thus = cake expands to cake = cake, not to an explicitly unnamed entry. The earlier proposal that bare identifiers infer labels was not selected.

A descriptive entry production is:

```text
tuple_value_entry := expression
                   | identifier "=" expression
                   | "=" identifier
                   | "..." expression
                   | "..." identifier "=" expression
                   | "=" "..." identifier
```

This outlines entries inside an established tuple value. Singleton value forms are selected below, and basic construction spread is now [selected](tuple-spread-and-rest.md#tuple-construction-spread-selected). Assignment and complete recursive expression grammar remain separate. This selection applies to tuple values; [tuple pattern shorthand](named-input-routing.md#same-name-tuple-pattern-shorthand-selected) was selected separately on 2026-10-23. Same-name call shorthand and explicit tuple call spread are now selected separately. This does not automatically extend to record or tuple type syntax.

The shorthand requires an ordinary identifier resolving to a value. It cannot derive a label from a call, member access, grouped operand, or arbitrary expression:

```text
meal := (cake = bake(), tea = brew()); /* explicit labels for expressions */
meal := (= bake(), = tea);            /* rejected: bake() is not an identifier */
```

Underscore remains an ordinary identifier; = _ refers to its visible binding and supplies the label _. Tuple construction now selects [append-or-replace](tuple-spread-and-rest.md#append-or-replace-by-label-selected): unnamed entries and new labels append, while label collisions involving spread replace their first slot without moving it. Explicit labels must be unique within each constructor, including labels supplied by =name shorthand; each nested spread operand is validated independently. The final surviving contribution determines the inferred component type. Named/unnamed components may interleave: (= cake, tea) is now valid, with tea remaining unnamed. This supersedes the earlier prefix/suffix restriction; duplicate explicit labels remain errors; calls now require unique explicit argument labels and use next-unfilled positional routing and permitted named replacement against a fixed signature, with =name shorthand and explicit tuple spread selected separately.

Evaluate each supplied value once in written order. Shorthand adds no extra lookup, evaluation, clone, allocation, or mutation permission beyond the equivalent full entry.

## Storage layout selected

The user selected identical component/singleton storage layouts, 2026-10-22: a singleton has exactly its component's size and alignment, with that component at offset zero and no wrapper metadata. Unit/() has zero payload bytes. Static type/shape distinctions remain; erased identical payloads cannot be distinguished at runtime without retained type information. Union alternatives still use their existing discriminator contract. See [layout rules and static versus runtime distinction](memory-and-performance.md#empty-and-singleton-tuple-layout). This storage guarantee does not by itself select parameter/return ABI, identity-erasing conversions, aliasing, or a runtime reflection mechanism.

The 2026-10-24 [type/array shape extension](tuple-array-shapes.md) selects tuple-type spread with label overriding, fixed-array/fixed-tuple spread construction, and ordinary fixed tuple prefixes with a declared homogeneous array tail. Runtime variability belongs to that array, not arbitrary new tuple fields. Fixed component access remains static; tail normalization and its exact numeric access exposure remain open.

Declared rest segments already have names: mytuple.rest uses ordinary named member access to obtain that array. A following mytuple.rest[index] is array access, whose bounds, failures, and permissions belong to the array contract rather than tuple-position access. This clarification adds no numeric slot/component-count rule for the tail and does not select multiple rest segments. See [declared tail names](tuple-array-shapes.md#declared-names-access-array-tails).

A rest-only tuple has zero fixed components and an array tail; this is a valid static shape. Spreading a runtime-sized array with an established element type into (...extra) can infer that shape without an expected destination, using the default label rest independently of the source expression's name. An expected tuple schema can also establish a fixed prefix plus tail when the supplied composition provably satisfies it, even if fixed-slot value origins depend on runtime lengths. Exact numeric exposure, full tail compatibility, and identity with a bare array remain open. See [rest-only construction](tuple-array-shapes.md#rest-only-tuples-need-no-fixed-components).

In tuple value construction, (...extra = expression) explicitly declares a tail named extra; (=...extra) is its same-name shorthand for (...extra = extra), reading the lexical source once. This distinguishes an explicitly named tail from the default rest label inferred by (...extra), and explicitly requests a tail even for a fixed-size array source. The label before = is not a variable assignment target. (...extra = []) establishes shape/name but still needs an element-type source; the syntax adds no global empty-literal default. General mixed entries, tail-label collisions, and multiple tails remain open. See [named rest values](tuple-array-shapes.md#named-rest-values-and-same-name-shorthand).

An explicit (...rest:) schema names the rest segment while inferring its element type from sufficient static initializer/expected-contract information. (...Params) in type position retains tuple-type expansion meaning; the colon disambiguates the declaration without type-name lookup. This scoped omission does not admit ordinary dangling name: fields or add an infer keyword. See [rest declaration inference](tuple-array-shapes.md#a-colon-distinguishes-inferred-rest-declarations-from-type-spread).

## Empty tuple and Unit selected

Selected by the user, 2026-10-22: Unit is the zero-component tuple, with () as an equivalent value/type spelling. This is identity, not a conversion or another union case. Unit | () normalizes to Unit. The singleton (Unit,) still contains one component and is a distinct product shape. Empty tuple access .0 is rejected at compile time. Call argument lists and lambda headers retain their own syntactic roles; f() passes zero arguments while f(()) explicitly passes one Unit value. A Unit parameter still needs an argument or applicable declared default. See [Unit](unit.md).

## Singleton values selected

The 2026-10-24 [callable input-header rule](callable-input-packs.md#input-signatures-and-the-singleton-boundary) is a separate syntactic context: `fn (Int): Ret` already denotes one input, and a one-position implementation header `(x) { ... }` needs no singleton comma. This does not change ordinary tuple values/types/patterns below. Intrinsic `.call` receives an ordinary tuple expression, so `f.call (4,)` supplies one Int while `f.call(4)` rejects a scalar operand; invocation sugar `f(4)` constructs one supplied input.

Selected by the user, 2026-10-22: an unnamed singleton needs a comma to distinguish it from grouping. An explicitly named entry already establishes a tuple, so its trailing comma is optional:

```text
cake := 10;
scalar := (cake);            /* grouping: Int */
one := (cake,);             /* unnamed one-component tuple */
meal := (= cake);           /* named one-component tuple */
meal := (cake = cake);      /* equivalent full entry */
meal := (= cake,);          /* optional trailing comma */
meal := (cake = cake,);     /* optional trailing comma */

one.0;     /* 10 */
meal.0;    /* 10 */
meal.cake; /* same component as meal.0 */
```

The comma in (cake,) establishes an unnamed tuple; removing it changes the value's type. It is not an optional separator on an otherwise recognized singleton. This syntactic distinction does not depend on an expected type: grouping (cake) does not become tuple construction merely because a destination expects a singleton. A singleton tuple remains a product containing one value, not the scalar itself; there is no implicit flattening.

The shorthand remains restricted to identifiers. Use (cake = bake()) to name an arbitrary expression. These value forms do not add assignment expressions: name = expression inside an established tuple entry supplies a label.

Call parentheses still delimit arguments. A trailing comma in a call does not create a tuple argument:

```text
take(cake,);   /* one scalar argument */
take((cake,)); /* one unnamed singleton tuple argument */
```

Singleton type annotations are selected in the [type boundary](#2-singleton-type-boundary-selected) below. Singleton binding and grouped patterns are now selected below, alongside value construction and ordinary expression grouping. Empty tuple identity and () as an equivalent Unit value/type spelling are selected. No special restriction on singleton component types is introduced beyond the ordinary value/access rules.

## Singleton binding patterns selected

Selected by the user, 2026-10-22: parentheses group a pattern without extracting a tuple component. A comma establishes a one-component positional tuple pattern; an explicit destination = sourceField clause establishes named tuple extraction:

```text
one := (42,);
whole := one;          /* whole is the singleton tuple */
(also_whole) := one;   /* grouping: also_whole is the singleton tuple */
(value,) := one;       /* extraction: value is Int */

meal := (cake = 42);
(local = cake) := meal; /* named extraction: local is Int */
```

The selected forms are (pattern) for grouping, (pattern,) for one positional component, and (local = label) for the named component. Named forms can retain the ordinary optional trailing comma. Positional extraction works on either named or unnamed singleton tuples; named extraction requires the stated source label and the existing coverage-without-rest and duplicate-selector rules. Tuple patterns now separately select = identifier as shorthand for identifier = identifier; it is an explicitly named selector, not a positional binding or equality test.

Evaluate the source once before introducing its bindings. Grouping preserves the complete input type and pattern behavior; it never unwraps based on the source or expected type. A singleton tuple pattern requires one component, not a scalar or a two-component tuple. For example, (value,) := 42 is rejected as a declaration shape mismatch. Typed components keep their existing meaning: (value: Int,) requires one Int component, while (value: Int) groups a typed binding for the whole input.

These are pattern semantics wherever the corresponding grouped/tuple pattern is supported. Ordinary declarations still require an irrefutable match; conditional/match patterns retain their selected mismatch behavior. This does not add tuple destructuring to loop headers or lambda parameter headers that do not already support it. Mixed named/positional tuple patterns are now selected separately with next-unselected source routing. Complete recursive type/pattern integration and rest ownership remain separate.

## Empty tuple pattern selected

Selected by the user, 2026-10-22: () is the zero-component tuple pattern. It matches only Unit and introduces no bindings. It is not a wildcard, discard pattern, or absence test.

```text
() := ();          /* valid: no names bound */
() := Unit;        /* same value and shape */
() := operation(); /* valid if its result contract is Unit */
/* rejected: () := 42; */
/* rejected: () := (Unit,); */
```

Ordinary declarations require an irrefutable match for the static source contract; a source that may also have a different type or shape is rejected there. In supported conditional or match pattern contexts, () succeeds only for Unit and other alternatives follow the existing mismatch/arm-selection rules. A singleton containing Unit still has one component, even though both values have zero payload bytes.

Evaluate the source once even though the pattern binds no names. Source effects, failures, and ordinary cleanup rules remain applicable. The pattern does not inspect uninitialized storage or turn a failed operation into Unit.

This completes the selected zero/one/many positional shape boundary: () matches zero components, (item,) matches one, and (a, b) matches two; (pattern) remains grouping. Empty call parentheses and contextual lambda headers retain their existing meanings. This selection does not add new pattern support to those headers or settle tuple rest semantics.

## Current scalar boundary and deferred equivalence

Selected by the user, 2026-10-22: keep ordinary grouping and singleton tuple construction distinct for now. In schematic discussion notation, (T) is the scalar/grouped T and (T,) is a singleton tuple containing T. Actual value examples are:

```text
scalar := (42);
one := (42,);
one.0;    /* 42 */
scalar.0; /* compile error: grouping does not add a tuple component */
```

Treating grouped T as a tuple, identifying T with its singleton, or automatically using the singleton as T is deferred for future discussion. No implicit scalar/singleton wrapping, unwrapping, or scalar .0 access follows from the selected equal-layout guarantee. The singleton retains its one-component shape, including when its component is itself a tuple. This decision settles the simple semantic boundary, not every remaining recursive type/pattern production. The selected named singleton forms and Unit/() identity continue to use their own explicit syntax.

## Mixed tuples selected

Initially selected 2026-10-22 for an unnamed prefix and named suffix; extended by the user 2026-10-23 to arbitrary interleaving in tuple values and their stored layouts. Without an expected destination type, append components in written order, infer labels only for explicit/shorthand entries, and replace permitted label collisions involving spread in their original slots:

```text
tea := "green";
mixed := (42, = tea); /* inferred type: (:Int, tea: String) */
mixed := (42, tea = "green"); /* equivalent explicit entry */
typed: (:Int, tea: String) = (42, = tea);

mixed.0;   /* Int: 42 */
mixed.1;   /* String: "green" */
mixed.tea; /* same component as mixed.1 */
```

The selected mixed type form combines :Type for an unnamed component with name: Type for a named component. No synthetic label is added to the unnamed position. The per-position label, or its absence, participates in the existing structural tuple identity together with the resolved component type. Fully unnamed, fully named, and mixed tuples all retain fixed numeric access; name access exists only for labeled components. A label gives an existing position semantic meaning without changing storage: the same ordered component types have the same size, alignment, and per-position offsets regardless of their labels. Labels add no per-value name metadata. Equal layout does not erase label-sensitive type identity or permit implicit relabeling. See [tuple labels and storage](memory-and-performance.md#tuple-labels-describe-positions-without-changing-storage).

Evaluate entries once from left to right, including entries later replaced. Interleaved types use the existing component forms in their stored order, for example (cake: Int, :Int, tea: String). No runtime representation change follows merely from interleaving. Spread collisions replace their original slot, with the surviving contribution determining its inferred type. Repeated explicit labels, duplicate labels in tuple type declarations, and duplicate source selectors in patterns still fail. Known tuple destinations now use [fixed destination routing](named-input-routing.md#fixed-destination-routing-selected), checking each surviving contribution against its slot type/access and requiring complete coverage. Cleanup/ownership remains separate. See [insertion rules](tuple-spread-and-rest.md#append-or-replace-by-label-selected).

Positional destructuring can bind the whole mixed tuple:

```text
(number, drink) := mixed;
```

Named patterns require complete coverage without rest, or may capture unselected fields with one final rest. Mixed positional/named tuple patterns are now [selected](tuple-spread-and-rest.md#mixed-positional-and-named-tuple-patterns-selected): positional entries take the next unselected source component, named entries select their field, and duplicate source selection is invalid. Numeric source selectors remain separate.

## Expected named types still accept positional entries

```text
meal: (cake: Int, tea: Int) = (10, 20);
meal: (cake: Int, tea: Int) = (cake, tea);
meal: (cake: Int, tea: Int) = (= tea, = cake);
```

All three construct cake, tea destination order. The last initializer evaluates tea before cake, while the resulting positions still follow the expected type. Without an expected type, (= tea, = cake) instead infers tea, cake order. Bare expressions do not become shorthand merely because their lexical names resemble destination labels.

Tuple type context retains its separate forms: (cake, tea) supplies inferred labels, (cake: Int, tea: Int) supplies explicit named types, and (:Int, :Int) supplies unnamed types. The = identifier shorthand does not apply there.

## Selected positional access

```text
meal := (= cake, = tea);
plain := (cake, tea);

meal.cake; /* 10 */
meal.tea;  /* 20 */
meal.0;    /* same component as meal.cake */
meal.1;    /* same component as meal.tea */
plain.0;   /* 10 */
plain.1;   /* 20 */
meal.2;    /* compile error: position outside this two-component tuple */
```

Both named and unnamed tuples expose zero-based numeric dot access in stored component order. Each position has its statically known component type; heterogeneous components need no dynamic lookup or union of all component types. The receiver is evaluated once for each access expression. Numeric access does not remove labels from the whole tuple's type and does not bypass its label-sensitive identity. Reading the same component by name or position grants the same existing access permissions.

### Runtime indexing rejected

Selected by the user, 2026-10-22: tuples do not support runtime variable indexing. This applies to named and unnamed tuples, including tuples whose component types happen to agree:

```text
pair := (42, "tea");
i := read_number();
pair[i]; /* compile error: runtime tuple indexing is unsupported */
pair.0;  /* Int */
pair.1;  /* String */
```

This rejection does not add a union result, a bounds panic, or a recoverable bounds error. Each supported fixed position already identifies one component and its static type. Use a suitable indexed collection when the computation needs a runtime position; tuples do not implicitly convert into one.

Dot followed by an identifier always selects that literal field name. It does not substitute a variable's value:

```text
i := 1;
meal := (i = "named field", cake = 10);
meal.i; /* "named field", not meal.1 */
```

Computed compile-time position syntax is not introduced by this decision. Writes through numeric access still need their own assignment/access contract; this selection does not grant mutation authority.

## Explicit reconstruction examples

```text
meal := (= cake, = tea);
plain := (meal.cake, meal.tea);
plain := (meal.0, meal.1);

meal: (cake: Int, tea: Int) = (plain.0, plain.1);
```

These construct a new tuple explicitly. Admission of an intact stored named tuple to an unnamed destination, or the reverse, remains a separate open conversion policy.

## Empty and singleton review across contexts

Status: **review requested by the user, 2026-10-22; Unit/empty identity and () spelling were subsequently selected; the remaining recommendations are open**. The selected singleton value forms above remain in force. This review does not claim parser, compiler, runtime, ABI, or performance verification.

### 1. Empty tuple identity and spelling are separate choices

An empty tuple has zero components and one possible value. That is compatible with the selected single-inhabitant Unit model, but equal cardinality alone does not make two types identical. The user subsequently selected Unit as the empty tuple and () as its equivalent value/type spelling. The alternatives below are retained for comparison.

- **Unit is the empty tuple, spelled only Unit in values/types (not chosen):** keeps the existing spelling and supports a zero-component product model without adding a general () value expression. Tuple rest and generic operations must present their zero-component result as Unit.
- **Unit is the empty tuple, with () as another value/type spelling (selected):** gives conventional tuple notation and adds a second spelling. Official prose can still prefer Unit for action-result annotations.
- **The empty tuple is distinct from Unit (not chosen):** preserves a separate product identity. Both could have one value and zero payload bytes; separate conversions, union cases, generic constraints, and diagnostics would be needed. Identical storage does not remove those language distinctions.
- **Exclude low arities or collapse singleton products:** reduces some source forms, but requires special cases for generic construction and rest results. Collapsing singletons would revisit the user's selected distinction between a tuple and its component.

An explicit constructor marker for every tuple arity could also separate tuples from grouping. A hypothetical tuple(value) form would need its own keyword/intrinsic, labeled-entry, type, and pattern rules. It is a larger syntax change, not a necessary consequence of empty tuples.

There is no grouped scalar inside (): grouping needs an expression. The empty form's issue is identity and surrounding grammar, rather than collision with a scalar expression.

### 2. Singleton type boundary selected

Selected by the user, 2026-10-22:

These are ordinary tuple-type rules. A callable type's dedicated input signature, such as `fn (Int): Ret`, has its own header delimiters and permits an unnamed singleton without the comma; see [callable input headers](callable-input-packs.md#input-signatures-and-the-singleton-boundary).

```text
(Int)        /* grouped scalar type Int */
(:Int,)      /* unnamed singleton tuple type */
(cake: Int)  /* named singleton tuple type */
(cake,)      /* inferred-label singleton schema, where type evidence exists */
```

Require the comma for an unnamed singleton type: (:Int) is rejected, even though its colon could distinguish it from grouping. This keeps the unnamed singleton comma consistent across values, types, and patterns. The comma establishes tuple shape and is not an optional trailing separator in this case.

Named explicit types already have a distinctive field clause: (cake: Int) and (cake: Int,) denote the same named singleton type. An inferred-label singleton requires (cake,), because (cake) groups a type. Neither capitalization, type lookup, nor an expected type chooses the parse. The bare cake component in type context is a label, not a type operand; its type must have static evidence. Missing evidence is an inference error rather than an implicit type default.

The empty type () remains equivalent to Unit. The following declarations illustrate the selected boundary without adding scalar/tuple conversions:

```text
scalar: (Int) = 42;
one: (:Int,) = (42,);
meal: (cake: Int) = (cake = 42);
inferred: (cake,) = (cake = 42);
/* rejected: bad: (:Int) = (42,); */
```

### 3. Pattern grouping and singleton extraction selected

The user subsequently selected (pattern) for grouping, (pattern,) for one positional component, and (local = label) for named extraction. Thus (local) := one binds the complete singleton tuple, while (local,) := one extracts its component. See [singleton binding patterns](#singleton-binding-patterns-selected). Keep destination = sourceField direction; tuple patterns now separately select = identifier as identifier = identifier shorthand. Recursive parser integration remains separate from these selected semantics.

The user also selected the [empty tuple pattern](#empty-tuple-pattern-selected): () matches only Unit and binds no names. It is not a wildcard, discard, or missing-value pattern. Ordinary declaration patterns must be irrefutable for their source contract; conditional/match patterns retain their existing mismatch behavior. Positional tuple rest now selects Unit/() for an empty remainder and a singleton for one remaining component; partial-pattern ownership remains separate.

### 4. Calls preserve argument count

Under the selected ()/Unit identity, these call shapes remain distinct:

```text
f();          /* zero arguments */
f(Unit);      /* one Unit argument */
f(());        /* one Unit argument */
f((Unit,));   /* one singleton-tuple argument containing Unit */
f(cake,);     /* one cake argument, with trailing call comma */
f((cake,));   /* one singleton-tuple argument */
f(cake = cake);   /* a named function argument */
f((cake = cake)); /* one argument: a named singleton tuple */
```

These are shape comparisons, not overload declarations guaranteeing one f accepts them all. A parameter of type Unit still requires an explicitly supplied argument or an applicable declared parameter default. Zero-sized storage does not make an argument optional, and a tuple result does not silently supply multiple arguments. Explicit tuple call spread and call-site = identifier shorthand are now selected. A signature supplies the fixed destination slots; op(tuple) still passes one value and only op(...tuple) expands it.

### 5. Arrow-free lambdas require a syntactic boundary

The already selected parameter-list-plus-body form must remain recognizable:

```text
action := () { Unit } /* callable: an empty local input header */
```

With () selected as a value, () { ... } must retain the lambda reading in the expression positions already reserved for it. It cannot be interpreted as a Unit value followed by a block according to expected type or line breaks. Separate items still need explicit separators where required. Construct headers such as if (condition) { ... } keep their own header/body grammar.

Without an expected callable, the empty lambda header declares zero inputs. With an expected callable, it leaves the expected inputs unnamed locally; that existing distinction does not depend on empty tuple identity. Singleton tuple parameters are still one input, not a new lambda-header binding convention.

### 6. Shape and type identity survive zero-sized storage

Under the selected ()/Unit identity:

```text
()          /* zero components: Unit */
(Unit,)     /* one component containing Unit */
((Unit,),)  /* one component containing a singleton tuple */
(done = Unit) /* named singleton */
```

These shapes remain distinct except that () and Unit are the same value/type. .0 is invalid on the zero-component shape, valid on a singleton, and does not recursively flatten nested products. Label-sensitive structural identity still applies. Separately declared empty records remain nominal types; sharing a zero-payload layout is not a conversion.

The later selected storage contract gives Unit/() zero payload size and a singleton the same size/alignment as its component at offset zero. These are design guarantees, not implementation measurements. Static shape, observable evaluations, and required cleanup remain. Addresses, ABI lowering, debugger representation, broader aggregate layout, and measured overhead remain unverified. In particular, mathematical product identities do not select implicit conversions between a two-component T/Unit product, T itself, and a singleton containing T.

### 7. Zero/default initialization and reserved storage

Unit already has the selected zero value Unit. Since the empty tuple is Unit, no additional zero-member choice is needed for that type. A singleton's zero initialization instead depends on its component's zero mapping, preserving its tuple shape and label. A tuple containing a multi-member union does not solve the existing undirected union initialization problem; the component still needs its own selected valid construction.

The reserved-storage marker = ? does not become a readable Unit or empty tuple merely because no payload bytes are needed. The ordinary no-read-before-initialization rule still applies: initialization state is a semantic contract independent of how many payload bytes are stored. Default construction, zero construction, and omitted function arguments retain their existing separate contracts.

### 8. Result, Option, unions, and control-flow results

Under the selected identity, Unit and () are duplicates in a plain union. A singleton containing Unit remains distinct, so a union containing that singleton type must not collapse into Unit. Unit also remains distinct from None and from a successfully wrapped Result payload. Option<Unit> still has present and absent cases; Unit ! E still has success and failure outcomes.

An empty executable block still produces Unit. The empty tuple spelling does not change tail-value rules, turn a trailing semicolon into discard, erase a real Unit branch from a union, or supply zero values for missing parameters. Loop/conditional Unit defaults and zero-callable Unit results keep their current behavior; singleton result contracts remain singleton contracts.

### 9. Spread and rest expose the low-arity choice

Selected basic tuple spread preserves statically known product shape and labels. With the selected Unit/empty identity, spreading Unit contributes zero components; spreading a singleton contributes one; explicitly including the tuple as an ordinary entry instead contributes the tuple itself as one component. Selected positional tuple rest has the empty tuple/Unit shape when exhausted, while a one-component rest remains a singleton. See [selected tuple rest](tuple-spread-and-rest.md#positional-tuple-rest-selected).

With Unit as the zero-component tuple, Unit-valued expressions are zero-component spread operands, including action results. An action's evaluation, failure propagation, and required cleanup must still happen even though it contributes no components. A fallible Result<Unit, E> is not an empty tuple and cannot be spread by silently unwrapping it.

For noncolliding inputs, spread-result arity is the sum of expanded shapes, not simply the number of written operands or commas. A lone spread yields zero, one, or multiple components and explicitly establishes tuple syntax: (...empty) gives Unit/(), (...one) stays a singleton tuple, and (...pair) retains both components. Preserve operand component labels and order. Permitted spread collisions replace their original slot without adding a component, so total written/expanded arity can exceed final tuple arity. Named/unnamed value components and corresponding stored layouts may interleave. Known tuple destinations now use the selected fixed-slot routing and final-slot type/access checks. Complete recursive grammar and access/ownership remain separate.

### 10. Diagnostics, formatting, and migration

The singleton comma must survive formatting: deleting it changes type. Diagnostics should explain "scalar supplied where singleton tuple expected" rather than silently wrapping or unwrapping. Expected types must not reinterpret (value) as a tuple. A constructor with one named entry is data construction, not a parenthesized assignment expression; ordinary assignment remains an item.

Tuple commas remain comma-list punctuation inside tuple syntax; this review does not select bare x, y tuple expressions outside parentheses. Numeric .0 access and ordinary field access keep their existing contracts, including runtime-index rejection. Zero-arity .0 is always out of range. A formatter/parser must preserve lambda headers, call argument lists, singleton type/pattern markers, and mandatory item separators regardless of whitespace.

### 11. Reference-language checks

Checked against primary documentation, 2026-10-22. These are comparisons, not LiteScript parser/runtime evidence.

- **Rust:** the empty tuple is unit; singleton tuple values and types require a comma, keeping them distinct from grouping. This supports a uniform zero/one/many product model. Sources: [tuple types](https://doc.rust-lang.org/reference/types/tuple.html), [tuple expressions](https://doc.rust-lang.org/reference/expressions/tuple-expr.html).
- **Zig:** tuple construction uses anonymous struct literals, with .{} for empty and .{value} for a singleton. The explicit .{...} marker separates product construction from parentheses. This does not establish empty-tuple/void identity for LiteScript. Source: [Zig 0.15.1 tuples](https://ziglang.org/documentation/0.15.1/#Tuples).
- **Odin:** the documented multiple-result lists can expand directly into call arguments. That is a different contract from LiteScript's one tuple-valued result and its no-implicit-call-spread boundary. The result-list syntax does not decide LiteScript's empty/singleton first-class values. Source: [multiple results](https://odin-lang.org/docs/overview/#multiple-results).
- **V:** the function documentation demonstrates multiple returned values with separate receiving bindings. That example is useful for result-list comparison, but does not specify LiteScript's general empty/singleton tuple syntax or Unit identity. Source: [returning multiple values](https://docs.vlang.io/functions.html#returning-multiple-values).
- **Swift:** Void aliases the empty tuple type (); the reference excludes singleton tuple types. Its parameter-pack design unwraps one-element substitutions and explicitly discusses the matching complication. It demonstrates the tradeoff of omitting singleton products. Sources: [tuple types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Types.md#tuple-type), [parameter packs](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0393-parameter-packs.md#single-element-pack-substitution).
- **Kotlin:** Unit is its own single-inhabitant type; the standard products highlighted by its docs are Pair and Triple. Named data classes provide other shapes. This offers no parenthesized singleton-tuple rule to copy. Sources: [Unit](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/-unit/), [standard data classes](https://kotlinlang.org/docs/data-classes.html#standard-data-classes).
- **Dart:** a record with one positional field requires a trailing comma; named fields have their own label syntax. Its record diagnostic rules separately cover empty records and reject a comma in a fieldless record literal. Sources: [records](https://dart.dev/language/records), [record diagnostics](https://dart.dev/tools/diagnostics).
- **C++:** std::tuple explicitly constructs product types, including zero and one component, rather than using grouped expression syntax. The tuple constructor rules handle the singleton case explicitly. This is a constructor-marker precedent, not automatic scalar/tuple equivalence. Source: [tuple library specification](https://eel.is/c++draft/tuple).
- **TypeScript:** tuple types describe arrays with known positional types and length, using bracket syntax such as [] or [number]. Those type annotations do not make arbitrary array literals infer tuple types, and they do not give empty tuples LiteScript's Unit identity. Source: [tuple types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types).
- **Python:** () constructs an empty tuple, (value,) constructs a singleton, and (value) groups. The comma determines the singleton distinction. Its iterable unpacking and runtime tuple model are separate from LiteScript's static product/ownership design. Source: [expression lists](https://docs.python.org/3/reference/expressions.html#expression-lists).
- **Lua:** multiple-result expressions are adjusted by context; parenthesizing one forces a single result. This contrasts with preserving an intact LiteScript tuple value. Zero results must not be mistaken for a first-class empty tuple. Source: [multiple results and adjustment](https://www.lua.org/manual/5.4/manual.html#3.4.12).
- **Scala 3:** its implementation defines a dedicated EmptyTuple and constructs a one-element tuple using Tuple1. These supply explicit low-arity product representations; they do not by themselves equate EmptyTuple with LiteScript Unit. Source: [Tuple implementation](https://github.com/scala/scala3/blob/main/library/src/scala/Tuple.scala).
- **C# (supplemental):** ordinary tuple syntax requires at least two elements, while the ValueTuple API has zero- and one-component construction. This separates library representation from language sugar. Sources: [tuple diagnostics](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/tuple-errors), [ValueTuple API](https://learn.microsoft.com/en-us/dotnet/api/system.valuetuple).

### 12. Recommended decisions to review separately

Unit is now selected as the zero-component tuple, with () accepted as equivalent value/type syntax. Keep selected singleton values and explicit extraction; reference prose can retain Unit as the clear action-result spelling. Singleton value/type forms and binding/grouped patterns are selected; the former singleton syntax recommendations are resolved above.

Basic tuple spread, append-or-replace construction, and positional rest's zero/one/many remainder shapes are selected. Known destination tuple routing and fixed-component compatibility are now selected. Next settle complete recursive type/pattern integration and ownership. Keep call arity, explicit defaults, Option/Result wrappers, nominal empty records, evaluation order, definite initialization, and access rules intact. No special runtime mechanism is needed merely to represent the distinctions, but zero physical overhead remains an implementation claim to measure.

## Follow-up proposals and scalar versus tuple examples

Status: **user proposals and requested reference comparison, 2026-10-22; ()/Unit identity, singleton type spellings, and the later singleton binding/grouping rule are selected**. The distinctions below are review material, not an automatic migration of type or pattern grammar.

### Ways to distinguish singleton construction

The selected value-level rule remains (value) for grouping and (value,) for an unnamed singleton. Alternatives for review include requiring an explicit tuple constructor/marker, constructing a named singleton such as (= value), or omitting singleton tuple syntax. An explicit type annotation can check intent, but must not change the parse of (value) into a tuple.

The reference languages use the following concrete distinctions. Names such as x denote scalar values in these examples; constructors and annotations remain in each language's native syntax:

- **Rust:** (x) groups, (x,) constructs a singleton, and () is unit. Types distinguish T from (T,); patterns also use the comma to distinguish grouping from a one-component product. Sources: [tuple types](https://doc.rust-lang.org/reference/types/tuple.html), [tuple expressions](https://doc.rust-lang.org/reference/expressions/tuple-expr.html), [tuple patterns](https://doc.rust-lang.org/reference/patterns.html#tuple-patterns).
- **Zig:** (x) groups; .{x} constructs a singleton tuple, .{} an empty tuple, and .{x, y} a pair. The literal's .{ opener identifies construction without needing a singleton comma. Source: [tuples](https://ziglang.org/documentation/0.15.1/#Tuples).
- **Odin:** the documented proc() -> (int, int) { return 1, 2 } produces multiple results, received as a, b := operation(). This list can expand into another call's arguments, unlike LiteScript's intact tuple. A stored product can instead use a struct; this return-list notation does not establish a first-class (x,) literal. Source: [multiple results](https://odin-lang.org/docs/overview/#multiple-results).
- **V:** fn operation() (int, int) { return 1, 2 } supplies two returned values, received as a, b := operation(). These documented result lists are not evidence for a general (x,) value constructor; stored structured data has its own construction syntax. Source: [returning multiple values](https://docs.vlang.io/functions.html#returning-multiple-values).
- **Swift:** (x) groups, (x, y) is a tuple, and () is the empty tuple. The documented tuple model has no singleton tuple type; Void aliases (). Source: [tuple types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Types.md#tuple-type).
- **C++:** (42) groups; std::tuple<int>{42} explicitly constructs a one-component product, and std::tuple<>{} an empty one. Construction names the library type instead of interpreting a comma as tuple punctuation. Source: [tuple specification](https://eel.is/c++draft/tuple).
- **Dart:** (x) groups; (x,) is a one-positional-field record; (label: x) is an already distinctive named record. Its singleton positional record type also requires a comma. Sources: [records](https://dart.dev/language/records), [singleton literal diagnostic](https://dart.dev/tools/diagnostics/record_literal_one_positional_no_trailing_comma), [singleton type diagnostic](https://dart.dev/tools/diagnostics/record_type_one_positional_no_trailing_comma).
- **Python:** (x) groups, (x,) constructs a singleton tuple, and () an empty tuple. Python also permits the bare expression list x, to construct a singleton, a convenience not selected for LiteScript. Source: [expression lists](https://docs.python.org/3/reference/expressions.html#expression-lists).
- **Scala 3:** explicit Tuple1(x), also constructed by Tuple(x), represents a singleton product; Tuple() constructs EmptyTuple. Source: [Tuple implementation](https://github.com/scala/scala3/blob/main/library/src/scala/Tuple.scala).
- **TypeScript:** (x) groups; const one: [number] = [x] explicitly types a one-element array as a tuple. The brackets separate it from grouping, and the annotation supplies the tuple contract rather than an ordinary number[] inference. Source: [tuple types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types).
- **Kotlin:** documented product values use Pair/Triple or named data class construction; grouping is not a tuple constructor. Its single-inhabitant Unit remains an explicit object/type. Sources: [standard data classes](https://kotlinlang.org/docs/data-classes.html#standard-data-classes), [Unit](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/-unit/).
- **Lua:** parentheses around a multiple-result call reduce it to one result; they do not construct a singleton product. Persistent grouped data uses a table value instead of preserving the multiple-result list. Source: [multiple results](https://www.lua.org/manual/5.4/manual.html#3.4.12).
- **C# (supplemental):** (x) groups and ordinary tuple syntax requires two or more elements. ValueTuple.Create(x) supplies a library-level singleton representation. Sources: [tuple diagnostics](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/compiler-messages/tuple-errors), [ValueTuple creation](https://learn.microsoft.com/en-us/dotnet/api/system.valuetuple).

### The user's proposed type distinctions

The user originally proposed (cake) as grouped value, (:Type) as an unnamed singleton type, (= cake) as cake = cake, and a whole annotation value: (Type) as grouped type. Although the colon could distinguish (:Type) from grouping, the user subsequently selected the required comma: (:Type,) is valid and (:Type) is rejected. A type marker does not become a zero-value constructor in expression context.

The selected label-only singleton schema uses (cake,) in type context to provide the inferred label cake, while (cake) remains grouped type. This preserves the selected multi-component inferred-label schemas without choosing meaning by capitalization or name lookup. See the [selected singleton type boundary](#2-singleton-type-boundary-selected).

The additional (cake=) sketch has no value expression. Recommend rejecting it rather than assigning a hidden default, using the same-named variable implicitly, or adding another shorthand for (= cake). No missing-value meaning is selected.

### The user's proposed singleton binding patterns

The user requests evaluating these three forms for a singleton source:

```text
(local) := singleTuple;
(local,) := singleTuple;
(local = label) := singleTuple;
```

A coherent alternative is to make parentheses in binding-pattern position a tuple destructuring list even with one entry. Then the first two extract the sole positional component, and the third selects the sole named label. The plain local := singleTuple instead binds the whole tuple. A scalar source would not fit the tuple pattern merely because there is one local name.

The user later selected consistent grouping instead of this alternative: (local) := singleTuple binds the whole tuple; (local,) := singleTuple extracts its component; (local = label) := singleTuple extracts the named component. The no-comma positional extraction interpretation is not selected. See [selected singleton binding patterns](#singleton-binding-patterns-selected).

## Remaining grammar and inference issues

- Empty tuple/Unit identity, () value/type spelling, and singleton value/grouping forms are selected above. Singleton type spellings and grouped/singleton binding patterns are selected; complete recursive type/pattern integration remains open.
- Interleaved named/unnamed tuple values and corresponding stored type layouts are selected. Mixed positional/named tuple patterns are selected separately with next-unselected source routing and duplicate-source rejection. Known destination tuple constructors now use the selected call-style routing, with unique explicit labels, final-slot type/access checks, complete coverage, and no implicit component defaults.
- Numeric member suffixes need a deliberate lexer/parser boundary. A standalone .5 is not a fractional literal; tuple.5 is a member access when that position exists. Nested access such as pair.0.1 must not accidentally tokenize 0.1 as a decimal literal. Exact scanning and numeric suffix spellings remain to be formalized without relying on whitespace or type checking to choose the parse.
- Runtime variable indexing is rejected. Union receivers without a common tuple shape, computed compile-time position syntax, and numeric access assignment rules remain separate type/access decisions.

Related: [named input routing](named-input-routing.md), [tuple patterns](tuples-and-patterns.md), [grammar sketch](grammar-sketch.md), and [lexical structure](lexical-structure.md).
