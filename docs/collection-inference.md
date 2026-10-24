# Collection syntax for beginners

Status: **beginner ergonomics goal selected by the user, 2026-10-19; inference mechanisms and shorthand remain proposals**. Students should be able to create, pass, traverse, and write simple functions over collections before learning names such as Iterable or Collection.

## Start with values

```text
numbers := [1, 2, 3];

loop numbers as number {
    print(number);
}
```

The growable List default is already selected. Neither example needs a generic annotation or a traversal-interface name. Expected types can supply information at construction boundaries, just as they do for records. Existing collection values keep their provider type; inference must not silently collect a set, slice, or producer into a List.

## Carry expected types through nested literals

Proposed contextual construction:

```text
Icon := record {
    name: String;
}

Toolbar := record {
    icons: List<Icon>;
}

toolbar: Toolbar = {
    icons = [
        { name = "Home" },
        { name = "Search" },
    ],
}
```

`List<Icon>` is temporary explanatory notation, pending generic syntax. Toolbar supplies the field's collection type; that supplies each element's Icon type. Repeating List and Icon names throughout the initializer should be unnecessary. This extends the selected contextual-record direction across a collection boundary; its complete inference rules still need confirmation.

At a call with an established element requirement, the same proposal would allow:

```text
render_icons([
    { name = "Home" },
    { name = "Search" },
]);
```

Assume render_icons has an established requirement to traverse Icon values. A traversal requirement supplies an element type but does not choose a concrete provider, so this literal would retain the usual List default. A concrete expected array type could instead select its array construction contract. Do not infer a Set or an arbitrary user provider merely because it also supports traversal; provider construction needs an unambiguous rule.

When no expected element type is available, an explicit Icon constructor can supply it. Standalone anonymous record identity, empty literals, heterogeneous literals, overloaded calls, and conflicting expected types remain separate inference decisions.

## Let simple functions omit machinery

Candidate syntax, reusing the existing inferred-function proposal:

```text
render_icons := fn(icons) {
    loop icons as icon {
        render(icon);
    }
}
```

Assume render is a known read-only operation accepting Icon and returning Unit. The body supplies a traversal requirement and an element constraint without spelling an interface name. Compatible lists, arrays, sets, slices, and custom sources should then be usable under the eventual traversal/access contract.

For this to deliver provider independence, the inferred function must generalize the provider requirement. Merely inferring List from one call would lock the function to that implementation. The proposal is to infer a reusable static requirement, with valid calls checked by the compiler. It is not yet a selected generic inference algorithm.

Inference must respect explicit provider conformance, access, and lifetime rules. A field name alone must not cause a search for an arbitrary nominal record type. Calling a known typed operation, receiving an expected callable signature, or adding an annotation can resolve missing information. Difficult definitions may need annotations, especially recursion, overloads, captures, and functions returned or stored as values.

Mutating caller data still requires declared mut access and an explicit caller grant; replacing caller storage still requires var. All escaping recoverable errors still need a declared error contract and explicit propagation. Traversing an existing one-shot cursor must obey its consumption contract. Parameter omission grants none of these effects automatically.

## Inferred indexing for small scripts

The user's beginner goal also applies to indexed operations. Names such as Indexed, Iterable, or Contiguous are design vocabulary and possible advanced contracts, not prerequisites for authoring an ordinary script.

```text
third_or_zero := fn(values) {
    values[2] else {
        0
    }
}

third_or_zero([10, 20, 30]); /* 30 */
third_or_zero([10]);         /* 0 */
```

Under the proposed generic requirement inference, values[2] establishes that this input needs supported positional indexing. The else handles the proposed recoverable bounds failure locally, so this function needs no escaping error declaration. For the illustrated Int inputs the result is Int. More generally, recovery retains the selected union of the element success type and fallback type; an omitted annotation does not force every provider's elements to become Int merely because the fallback is 0.

A propagating version can declare only its result contract while leaving the input requirement inferred:

```text
third_required := fn(values): Int! {
    values[2]!
}
```

Here the declared success type additionally constrains the returned element to Int, and the declared general Error contract must cover the indexing error. Parameter omission does not infer an undeclared escaping error. The ordinary explicit grant rules still apply to any caller mutation or replacement.

Compatible arrays, lists, slices, and custom indexable providers can satisfy the inferred input requirement. A traversal-only set or generator is rejected at the call with a concrete diagnostic such as "This argument does not support positional indexing." Do not silently enumerate, sort, buffer, or copy it to make indexing available. No particular index complexity follows from hiding a requirement name; cost laws still need their contract.

The earlier conversation's Indexed<Int> example expressed the semantic requirement, not a mandatory beginner annotation. A body that only loops infers a weaker traversal requirement and can still accept suitable sets. The required operations are derived from the definition and checked at each call, rather than inferred as one concrete List type from its first caller.

This proposal does not silently strengthen an explicitly complete public traversal-only contract when its implementation adds indexing. Inferred generic functions, expected callable types, explicit complete constraints, and public-signature stability still require a generalization policy. The [T] shorthand's meaning also remains open; this example requires no new indexable keyword or capability punctuation.

The later [signature review](collection-function-signatures.md) recommends distinguishing inferred input requirements from complete published contracts and separating inferred concrete results, static abstract results, and explicit runtime-varying representations. It preserves input/output type and lifetime relationships rather than treating every contract as a boxed value type.

The subsequent [source-visibility correction](collection-signature-ergonomics.md#revised-recommendation-complete-visible-annotations) requires a written library contract to reveal indexing requirements. Inferring omitted parameters remains a candidate convenience; silently supplementing a complete-looking collection annotation is no longer recommended. The short [T] meaning remains open, with indexed-sequence shorthand now another recommended candidate for beginner ergonomics.

## Could a short collection annotation help?

An element-oriented annotation is a useful alternative to evaluate:

```text
render_icons := fn(icons: [Icon]) {
    loop icons as icon {
        render(icon);
    }
}
```

This is **unselected syntax**. Two possible meanings need a deliberate choice:

- A concrete growable container of Icon. Easy to teach, but would constrain provider choice if used as the input requirement.
- A traversal contract over Icon. Fits the consumer goal, but says nothing by itself about indexing, growth, storage, or runtime representation.

It must not silently switch between those meanings in parameters, fields, and return types. If it is a constraint-only form, that restriction must be explicit; if it is a general type, stored and returned values need a representation and lifetime contract. A bracket literal can still construct a concrete List even when an annotation denotes an abstraction, provided that distinction is consistent and documented.

Do not finalize this shorthand as a side effect of choosing generic punctuation. Its meaning needs review first.

## Bracket spelling and the slice distinction

The user identified two candidate families:

```text
Icon[]          /* element type followed by brackets */
Icon[10]        /* element type followed by an extent */

[Icon]          /* brackets around the element type */
[Icon; 10]      /* brackets around element type and extent */
```

Both are source-spelling candidates; no ownership or representation is selected by their appearance. The working recommendation is the bracket-enclosed family: it visually groups the collection type and composes as [[Icon; 4]; 3]. If fixed-array meaning is chosen, that nested example would describe three arrays of four Icons.

The resemblance to slices is real. Rust writes its dynamically sized slice type as [T], usually accessed through a borrowed &[T] or &mut [T]; [T; N] is a fixed-size array type. Zig and Odin use []T for slices and [N]T for fixed arrays. Sources: [Rust slices](https://doc.rust-lang.org/reference/types/slice.html), [Rust arrays](https://doc.rust-lang.org/reference/types/array.html), [Zig 0.15.1 slices](https://ziglang.org/documentation/0.15.1/#Slices), and [Odin slices](https://odin-lang.org/docs/overview/#slices).

A contiguous slice can give an array or list a shared input representation without copying elements. An arbitrary set, chunked source, or generator cannot generally provide that same representation without materialization. Consequently, choosing slice semantics for fn(icons: [Icon]) would narrow the earlier provider-independent traversal goal.

For that consumer goal, the working recommendation is to evaluate [Icon] as a concise read-only traversal requirement and retain an explicit slice concept when contiguity is required. The [Icon; 10] candidate needs its own decision: inline fixed-array storage, an exact-length view, or a requirement with a statically known extent. Length and ownership are separate properties. A lazy or one-shot source must not be counted or materialized implicitly to establish the extent.

This recommendation does not select those meanings. A final choice must also cover fields, results, stored abstract values, expected literal construction, and mutation. The provider-independent form must not become a contiguous slice solely because it appears in a parameter.

The later [order and shared-traversal review](collection-order-and-traversal.md) clarifies that compatible ordinary sets can satisfy a minimal element-source input. Traversal yields values in the provider's order without promising stable positions, sorting, uniqueness for every provider, or indexed storage. The user's ordinary sequence examples preserve supplied positions and duplicates without requiring value comparison.

## Recommendation and teaching progression

Teach literal values, named loop receivers, and ordinary calls first. Extend contextual construction through known collection element types. Evaluate inferred generic requirements for simple functions, while keeping an explicit contract form available for libraries and advanced code.

An editor can show a plain explanation such as "accepts a source of Icon values; traversed once" and offer to insert an explicit annotation. Beginners should not need a protocol vocabulary to understand a rejected call: "This operation needs Icon values; this source provides String values" is a useful first diagnostic.

The public-signature policy, inference/generalization boundary, and any bracket shorthand remain open. Inference does not itself require boxing or runtime dispatch, and it does not establish a performance result.

## References and related concepts

- [Rust, Zig, and V comparison](collection-ergonomics-comparison.md).
- [Consumer requirements](collection-abstractions.md) and [capability vocabulary](collection-capabilities.md).
- [Inferred functions](types-and-inference.md#inferred-functions) and [functions](functions.md).
- [Contextual record construction](records.md) and [temporary generic notation](generic-notation.md).
- [Learning and tooling](tooling-and-learning.md) and [generic performance](generic-collection-performance.md).
