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
};
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
