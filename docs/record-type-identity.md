# Record type identity and assignment compatibility

Status: **design review dated 2026-10-18; distinct named record declarations recommended, not yet selected**. Anonymous/inline record identity, aliases, conversions, and the complete type-relation contract remain open. This review does not choose value/reference semantics, generated equality, layout, or inheritance.

## The decision

```text
User := record {
    name: String;
    age: Int;
}

Student := record {
    name: String;
    age: Int;
}

user := User { name = "Ali", age = 10, };
student: Student = user;
```

Two possible contracts:

- **Nominal:** the final declaration is rejected because User and Student come from distinct type declarations. Equal fields are insufficient.
- **Structural:** compatible fields can make the declaration valid despite the different type names. Exact versus extra-field compatibility, mutability, variance, visibility, and defaults would need precise rules.

Both approaches can be statically checked. Strong typing alone does not settle the choice. Nominal identity protects distinctions between domain concepts; structural compatibility reduces adaptation between independently defined data shapes.

## Recommended named-record rule

Each separately declared named record creates a distinct type. Another name for the existing type is an alias, not a fresh record declaration. The exact alias declaration syntax and type-value binding rules remain open.

```text
/* Rejected under the recommendation: no implicit User-to-Student conversion. */
student: Student = user;

/* Explicitly construct the destination using the source fields. */
student: Student = {
    name = user.name,
    age = user.age,
};
```

The second form uses the already selected contextual-construction syntax. It must obey visibility and the eventual copy/move/borrow contract; reconstruction does not silently clone noncopyable data. A future conversion API can encapsulate the mapping without making all equal-shaped records interchangeable.

The identity belongs to the declared type, not the spelling of a local name. An alias, import rename, or shadowing of an ordinary identifier must not produce a new identity by itself. Generic identity needs its own contract; this review does not decide whether repeated type-producing computations create fresh types.

## Construction and extraction remain concise

```text
user: User = { name = "Ali", age = 10, };
{ userName = name, years = age, } := user;
```

The first brace group constructs an already known User type. It does not create an anonymous value and then implicitly convert it to User. The second extracts fields from its source; it does not convert User into another nominal type. Neither operation needs a repeated record-type head.

The same headless record pattern can be used independently with a Student source if that source exposes the required fields. This is a shared pattern capability, not proof of assignment compatibility or a universal runtime structural interface.

## Type tests and unions

Under the nominal recommendation, User and Student remain separate alternatives of User | Student even if all their fields happen to match. A : User test selects User, rather than every record with the same fields. Aliases of User name the same alternative.

Headless field extraction cannot replace a deliberate nominal test. Existing conditional and-chains can first narrow a broader source, then extract from it. Exact type versus subtype/interface satisfaction, generic tests, union normalization, and missing-field behavior remain shared type-system decisions.

This is a semantic distinction, not a requirement for a reflection registry or heap object. A statically known source needs no runtime identity test; a union can use its eventual discriminator representation. No performance or layout implementation is implied.

## Inline and anonymous types: next dependent decision

The proposed inline form is:

```text
Profile := record {
    stats: {
        points: Int;
        level: Int = 1;
    };
}
```

It is an unnamed type declaration, not a contextual value initializer. Deciding named records alone does not yet decide whether another independently written stats type is compatible with it.

Two further options are per-declaration identity for unnamed record types as well, or structural identity for unnamed record shapes alongside nominal named records. The latter is a deliberate hybrid, not a consequence of merely omitting a name. Field defaults complicate structural identity: two equal field-type shapes can supply different construction defaults. Specify where those defaults belong before claiming complete equivalence.

Reusing one named Stats record provides an explicit common type under either option. Standalone inferred literals without an expected type, such as point := { x = 1, y = 2 }, also remain proposals; they must not automatically select either identity model.

## Reference-language comparison

- **Rust:** struct declarations define nominal types. Type aliases introduce names for existing types. This separates domain identity from naming and reuse. Sources: [structs](https://doc.rust-lang.org/reference/items/structs.html) and [aliases](https://doc.rust-lang.org/reference/items/type-aliases.html).
- **Odin:** the overview specifies that aggregate types are distinct. This is another example of keeping aggregate identity despite similar fields. Source: [Odin distinct types](https://odin-lang.org/docs/overview/#distinct-types).
- **Dart records:** record shape determines structural type identity, including field types and named-field names; a typedef does not make the shape nominal. These records are not the same facility as Dart classes. Source: [Dart record types](https://dart.dev/language/records#record-types).
- **TypeScript:** type compatibility is based on structural subtyping. This is more than an exact-field-set equality rule and has explicit exceptions and compatibility policies. Source: [TypeScript compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html).

Recommendation: start by selecting the identity of named record declarations. Then resolve inline/anonymous types, aliases, and explicit conversions. Do not infer one from generated equality, byte layout, default values, or the ability to destructure fields.

Related: [records](records.md), [initialization](record-initialization.md), [pattern inference](pattern-binding-inference.md), [type tests](type-tests-and-narrowing.md), and [type categories](type-categories.md).
