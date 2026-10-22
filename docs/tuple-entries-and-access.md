# Tuple value entries and positional access

Status: **named-entry shorthand and zero-based positional access selected by the user, 2026-10-21; runtime variable indexing rejected, mixed named/unnamed tuples, singleton value forms, singleton binding/grouped patterns, and Unit/() empty tuple identity selected by the user, 2026-10-22. Design contract, not an implemented parser/runtime**.

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
```

This outlines entries inside an established tuple value; singleton value forms are selected below, while spread, assignment, and complete recursive expression grammar remain separate. The shorthand applies to tuple values, not automatically to function arguments, records, patterns, or tuple types.

The shorthand requires an ordinary identifier resolving to a value. It cannot derive a label from a call, member access, grouped operand, or arbitrary expression:

```text
meal := (cake = bake(), tea = brew()); /* explicit labels for expressions */
meal := (= bake(), = tea);            /* rejected: bake() is not an identifier */
```

Underscore remains an ordinary identifier; = _ refers to its visible binding and supplies the label _. Duplicate labels are rejected, including duplicates introduced by shorthand. Existing positional-prefix/named-suffix rules still apply: (= cake, tea) places a positional entry after a named one and is rejected. Standalone inference of a partially named tuple such as (cake, = tea) is selected: the first component stays unnamed and the second is labeled tea.

Evaluate each supplied value once in written order. Shorthand adds no extra lookup, evaluation, clone, allocation, or mutation permission beyond the equivalent full entry.

## Storage layout selected

The user selected identical component/singleton storage layouts, 2026-10-22: a singleton has exactly its component's size and alignment, with that component at offset zero and no wrapper metadata. Unit/() has zero payload bytes. Static type/shape distinctions remain; erased identical payloads cannot be distinguished at runtime without retained type information. Union alternatives still use their existing discriminator contract. See [layout rules and static versus runtime distinction](memory-and-performance.md#empty-and-singleton-tuple-layout). This storage guarantee does not by itself select parameter/return ABI, identity-erasing conversions, aliasing, or a runtime reflection mechanism.

## Empty tuple and Unit selected

Selected by the user, 2026-10-22: Unit is the zero-component tuple, with () as an equivalent value/type spelling. This is identity, not a conversion or another union case. Unit | () normalizes to Unit. The singleton (Unit,) still contains one component and is a distinct product shape. Empty tuple access .0 is rejected at compile time. Call argument lists and lambda headers retain their own syntactic roles; f() passes zero arguments while f(()) explicitly passes one Unit value. A Unit parameter still needs an argument or applicable declared default. See [Unit](unit.md).

## Singleton values selected

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

Singleton type annotations remain separate. Singleton binding and grouped patterns are now selected below, alongside value construction and ordinary expression grouping. Empty tuple identity and () as an equivalent Unit value/type spelling are selected. No special restriction on singleton component types is introduced beyond the ordinary value/access rules.

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

The selected forms are (pattern) for grouping, (pattern,) for one positional component, and (local = label) for the named component. Named forms can retain the ordinary optional trailing comma. Positional extraction works on either named or unnamed singleton tuples; named extraction requires the stated source label and the existing exact-coverage/duplicate rules. The value-entry = identifier shorthand is not a pattern shorthand.

Evaluate the source once before introducing its bindings. Grouping preserves the complete input type and pattern behavior; it never unwraps based on the source or expected type. A singleton tuple pattern requires one component, not a scalar or a two-component tuple. For example, (value,) := 42 is rejected as a declaration shape mismatch. Typed components keep their existing meaning: (value: Int,) requires one Int component, while (value: Int) groups a typed binding for the whole input.

These are pattern semantics wherever the corresponding grouped/tuple pattern is supported. Ordinary declarations still require an irrefutable match; conditional/match patterns retain their selected mismatch behavior. This does not add tuple destructuring to loop headers or lambda parameter headers that do not already support it. Complete recursive type/pattern integration, empty tuple patterns, rest ownership, and mixed named/positional pattern extensions remain separate.

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

Selected by the user, 2026-10-22: tuple values may combine an unnamed positional prefix with a named suffix. Without an expected destination type, preserve the written order and infer a label only for an explicitly named or shorthand entry:

```text
tea := "green";
mixed := (42, = tea); /* inferred type: (:Int, tea: String) */
mixed := (42, tea = "green"); /* equivalent explicit entry */
typed: (:Int, tea: String) = (42, = tea);

mixed.0;   /* Int: 42 */
mixed.1;   /* String: "green" */
mixed.tea; /* same component as mixed.1 */
```

The selected mixed type form combines :Type for an unnamed component with name: Type for a named component. No synthetic label is added to the unnamed position. The per-position label, or its absence, participates in the existing structural tuple identity together with the resolved component type. Fully unnamed, fully named, and mixed tuples all retain fixed numeric access; name access exists only for labeled components.

Evaluate entries once from left to right. A positional entry after a named one remains rejected, and duplicate named labels remain rejected. Mixing the full and shorthand named entry spellings does not change these rules. Interleaved named/unnamed type layouts and construction into those layouts are not selected by this prefix/suffix example.

Positional destructuring can bind the whole mixed tuple:

```text
(number, drink) := mixed;
```

The existing initial exact-coverage named pattern does not acquire numeric source selectors or mixed positional/named pattern clauses through this decision. Those pattern extensions remain separate.

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

### 2. Type syntax needs its own singleton boundary

Proposed completion, not selected:

```text
(Int)        /* grouped type Int */
(:Int,)     /* unnamed singleton tuple type */
(cake: Int) /* named singleton tuple type */
(cake,)     /* inferred-label singleton schema, where type evidence exists */
```

The final case is significant: bare labels are selected tuple type components, but (cake) alone cannot simultaneously be ordinary type grouping and a singleton label schema. Recommend requiring a comma for the inferred-label singleton, leaving (T) as type grouping. Neither capitalization, type lookup, nor an expected type should decide which grammar was used.

The unnamed explicit type could instead permit (:Int) without a comma because its colon is already distinctive. That is an open convenience choice; it is not needed to infer singleton values. Named explicit singleton types could allow trailing commas just like their value forms. The empty type () is selected as equivalent to Unit.

### 3. Pattern grouping and singleton extraction selected

The user subsequently selected (pattern) for grouping, (pattern,) for one positional component, and (local = label) for named extraction. Thus (local) := one binds the complete singleton tuple, while (local,) := one extracts its component. See [singleton binding patterns](#singleton-binding-patterns-selected). Keep destination = sourceField direction; = identifier value shorthand is not a pattern shorthand. Recursive parser integration remains separate from these selected semantics.

With the selected ()/Unit identity, a proposed empty tuple pattern would match only that shape/Unit. It must not become a wildcard, discard, or missing-value pattern. Ordinary declaration patterns still need to be irrefutable for their source contract; conditional/match patterns retain their existing mismatch behavior. Empty-rest and partial-pattern ownership remain separate.

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

These are shape comparisons, not overload declarations guaranteeing one f accepts them all. A parameter of type Unit still requires an explicitly supplied argument or an applicable declared parameter default. Zero-sized storage does not make an argument optional, and a tuple result does not silently supply multiple arguments. Call spread and call-site = identifier shorthand remain separate proposals.

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

The existing spread/rest proposal preserves statically known product shape. Under the existing spread proposal and selected Unit/empty identity, spreading Unit would contribute zero components; spreading a singleton contributes one; explicitly including the tuple as an ordinary entry instead contributes the tuple itself as one component. An exhausted tuple rest would have the empty tuple/Unit shape, while a one-component rest remains a singleton.

This introduces a real choice: with Unit as the zero-component tuple, the spread proposal would make all Unit-valued expressions potential zero-component spread operands, including action results. An action's evaluation, failure propagation, and required cleanup must still happen even though it contributes no components. A fallible Result<Unit, E> is not an empty tuple and cannot be spread by silently unwrapping it.

Spread-result arity is the sum of expanded shapes, not simply the number of written operands or commas. A lone spread may yield zero, one, or multiple components. Its expression syntax and interaction with grouping need a production of their own; the selected (value,) rule alone does not settle them. Named/mixed spread routing, duplicates, and access/ownership remain open.

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

Unit is now selected as the zero-component tuple, with () accepted as equivalent value/type syntax. Keep selected singleton values and explicit extraction; reference prose can retain Unit as the clear action-result spelling. Singleton binding/grouped patterns are now selected; the remaining singleton type recommendations are not adopted.

Next settle singleton type forms, the inferred-label singleton/type-grouping boundary, complete recursive pattern integration, and spread/rest's zero-arity behavior. Keep call arity, explicit defaults, Option/Result wrappers, nominal empty records, evaluation order, definite initialization, and access rules intact. No special runtime mechanism is needed merely to represent the distinctions, but zero physical overhead remains an implementation claim to measure.

## Follow-up proposals and scalar versus tuple examples

Status: **user proposals and requested reference comparison, 2026-10-22; ()/Unit identity and the later singleton binding/grouping rule are selected; remaining type recommendations are separate**. The distinctions below are review material, not an automatic migration of type or pattern grammar.

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

The user proposes (cake) as grouped value, (:Type) as an unnamed singleton type, (= cake) as cake = cake, and a whole annotation value: (Type) as grouped type. This is coherent if syntactic type/value context establishes the role; a type marker does not become a zero-value constructor in expression context. The colon in (:Type) already distinguishes it from grouped (Type), so a mandatory comma there is not needed for parsing.

The label-only singleton schema still needs a marker: (cake,) in type context can provide the inferred label cake, while (cake) remains grouped type. This preserves the selected multi-component inferred-label schemas without choosing meaning by capitalization or name lookup. These singleton type completions remain proposals until confirmed.

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

- Empty tuple/Unit identity, () value/type spelling, and singleton value/grouping forms are selected above. Singleton type spellings and complete recursive pattern integration remain open; grouped and singleton binding patterns are selected.
- General interleaved named/unnamed type layouts and mixed pattern extensions remain separate from the selected prefix/suffix value and type forms. Known fully named destinations retain their selected contextual routing rules.
- Numeric member suffixes need a deliberate lexer/parser boundary. A standalone .5 is not a fractional literal; tuple.5 is a member access when that position exists. Nested access such as pair.0.1 must not accidentally tokenize 0.1 as a decimal literal. Exact scanning and numeric suffix spellings remain to be formalized without relying on whitespace or type checking to choose the parse.
- Runtime variable indexing is rejected. Union receivers without a common tuple shape, computed compile-time position syntax, and numeric access assignment rules remain separate type/access decisions.

Related: [named input routing](named-input-routing.md), [tuple patterns](tuples-and-patterns.md), [grammar sketch](grammar-sketch.md), and [lexical structure](lexical-structure.md).
