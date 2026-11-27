# Composition and interfaces

Status: **Phase 9 shipped — explicit nominal interfaces (`interface`), conformance (`impl`), monomorphized generic bounds (`Type<Iface>`), borrowed dynamic dispatch (`dyn Interface` / `mut dyn Interface`), and [core/interface](lite://module/core/interface) implemented across TS and C11; associated types, default method bodies, and delegation remain open.**

## Purpose

Build reusable programs around owned data and explicitly supplied behavior, with interfaces and composition as the primary alternative to class inheritance.

## Record template

```text
Student := record {
    name: String;
    grade: Int;
}
```

The record keyword and typed-field surface are selected; see [records](lite://doc/records). Constructor syntax, accessors, and field visibility grammar are not finalized.

## Intended rules

- Prefer composed fields over superclass state.
- Interfaces describe required behavior.
- [Operation sugar](lite://doc/collection-operation-contracts) can resolve loops and bracket access through statically available contract implementations. The [function-signature proposal](lite://doc/collection-function-signatures) separately handles input requirements, output guarantees, generic type relationships, and runtime representation; a contract name alone does not select an interface object.
- Collection consumers request minimal behavioral capabilities; standard/user collection types provide them without a required superclass representation, primitive-wrapper family, or conversion to one concrete container. Protocol names and complete conformance/dispatch rules remain open; see [collection abstractions](lite://doc/collection-abstractions).
- Implementation should be explicit.
- Generic constraints should allow static dispatch where possible.
- Dynamic interface dispatch should be an explicit capability or value representation.
- Fields and declarations should expose less by default; visibility is expanded deliberately.
- Mutation through parameters should require an explicit contract.

## Interface and implementation sketch

Earlier sketches used `interface Named { ... }` and `impl Named for Student { ... }`. The later uniform-binding direction means their exact forms must be reconsidered rather than copied as final grammar.

An interface conceptually requires a name-producing function; a `Student` implementation satisfies it using its own data. Whether receiver syntax is `self`, a named parameter, or another form remains open.

[Mutability](lite://doc/mutability) treats a read operation and a mutating operation as requiring different receiver capabilities. Read access is the default; mutation requires a mut-qualified type on affected typed receivers/parameters, without an additional function-level mutation marker. Full method notation and ownership rules remain open. Var stays before a binding name; mut goes after the colon in annotated declarations, while inferred declarations retain their mut/var mut prefixes. Interface requirements must preserve those contracts rather than allowing an implementation to demand more write access than its declared requirement supplies.

## Reuse mechanisms

Composed fields, interface default behavior, and explicit delegation were recommended as initial mechanisms. Unrestricted mixins were deferred because they need rules for conflicting methods, hidden state, and initialization order.

Modifiers may express visibility, mutation, effects, or dispatch, but their actual set and spelling are not selected.

## Classes

Uniform bindings could support `Name := class { ... }` if classes are introduced. This is not a decision to add inheritance or classes to the initial language. A class or identity-bearing reference type must justify semantics not already covered by records, interfaces, and explicit ownership.

An ordinary interface does not define a closed set of implementers. A union of listed types, an enum's named cases, and a sealed subtype family have different closure and identity contracts. Likewise, generated data operations do not establish value copying, deep immutability, or reference identity. See [type categories](lite://doc/type-categories) and the [enum design proposal](lite://doc/enums-and-variants#design-direction-after-the-category-review).

## Next-stage planning note: generic protocol/trait constraints vs. closed union constraints

Status: **recorded for a future planning session (not yet designed or implemented)**.

Current generic functions can constrain type parameters only via closed type-union aliases (such as `Numeric := alias Int | Int8 | Int16 | Int32 | Float | Float32` or `Equatable := alias OrderedScalar | String | Bool` checked via `T: Type<Constraint>`). Closed unions intentionally enumerate fixed built-in sets and cannot express open abstractions over arbitrary user-defined types:

- **Limitation of closed unions:** library operations like `List.sort`, `List.indexOf`, `List.dedup`, `Grid`, `Lru`, or `PriorityQueue` cannot yet accept user-defined records with custom equality, hashing, or ordering (`Point`, `Uuid`, etc.), nor express shared open contracts such as `Ordered`, `Equatable`, `Hashable`, `Collection`, `Numeric`, `Readable`, `Writable`, or `Drawable` across unrelated containers like `Array<T, N>` and `List<T>`.
- **Planned future exploration (interfaces / traits vs. structural protocol constraints):**
  - Compare **explicit nominal interfaces / traits** (explicit opt-in conformance / coherence across separate compilation, avoiding accidental structural matches) against **structural protocol constraints** (matching required static/instance operations by signature), and clarify how both interact with LiteLang's zero-inheritance record model.
  - Keep **static monomorphization as the default** for bounded generic parameters, while treating any future dynamic trait-object dispatch as an explicit capability/type form.
  - Specify how `Self` receiver capabilities (`Self` vs. `mut Self`), associated types (`Element`), and operator/collection hooks (`$getIndex`, `$setIndex`, iteration) participate in interface requirements and generic constraints.

## Open decisions

Nominal identity, structural conformance, interface coherence, orphan-style implementation rules, associated types, delegation syntax, default method conflicts, field privacy, construction, and reference identity remain open.

## Related concepts and references

- [Declarations and assignment](lite://doc/declarations-and-assignment)
- [Type-attached operations](lite://doc/type-operations)
- [Types and inference](lite://doc/types-and-inference)
- [Memory and performance](lite://doc/memory-and-performance)
- [Swift value and reference types](https://www.swift.org/documentation/articles/value-and-reference-types.html) is a useful comparison for local reasoning and composed values, not an adopted ARC or class model.
