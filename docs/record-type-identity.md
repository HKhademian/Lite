# Record type identity and assignment compatibility

Status: **distinct identity per record type declaration selected 2026-10-18, including named and unnamed inline declarations; equal fields do not permit implicit conversion, and conversion uses explicit reconstruction**. Alias syntax, inferred standalone literal types, additional conversion facilities, and the complete type-relation contract remain open. This review does not choose value/reference semantics, generated equality, layout, or inheritance.

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

The reviewed alternatives were:

- **Nominal, selected:** the final declaration is rejected because User and Student come from distinct type declarations. Equal fields are insufficient.
- **Structural, not selected for record declarations:** compatible fields could make the declaration valid despite the different type names. Exact versus extra-field compatibility, mutability, variance, visibility, and defaults would need precise rules.

Both approaches can be statically checked. Strong typing alone does not settle the choice. Nominal identity protects distinctions between domain concepts; structural compatibility reduces adaptation between independently defined data shapes.

## Selected named-record rule

Each separately declared named record creates a distinct type. Another name for the existing type is an alias, not a fresh record declaration. The exact alias declaration syntax and type-value binding rules remain open.

```text
/* Rejected: no implicit User-to-Student conversion. */
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

Under the selected nominal rule, User and Student remain separate alternatives of User | Student even if all their fields happen to match. A : User test selects User, rather than every record with the same fields. Aliases of User name the same alternative.

Headless field extraction cannot replace a deliberate nominal test. Existing conditional and-chains can first narrow a broader source, then extract from it. Exact type versus subtype/interface satisfaction, generic tests, union normalization, and missing-field behavior remain shared type-system decisions.

This is a semantic distinction, not a requirement for a reflection registry or heap object. A statically known source needs no runtime identity test; a union can use its eventual discriminator representation. No performance or layout implementation is implied.

## Inline and anonymous record declarations

The proposed inline form is:

```text
Profile := record {
    stats: {
        points: Int;
        level: Int = 1;
    };
}
```

It is an unnamed type declaration, not a contextual value initializer. The selected rule gives it its own identity, just like a named declaration. Another independently written stats declaration is a distinct type even when its fields and defaults match. The exact nested type shorthand remains a syntax proposal, independently of this confirmed identity rule.

Structural identity for unnamed shapes alongside nominal named records was considered and not selected. Omitting a type name does not request structural compatibility. Different defaults can belong to distinct declarations without requiring defaults to determine cross-declaration shape compatibility.

Reusing one named Stats record provides an explicit common type. Standalone inferred literals without an expected type, such as point := { x = 1, y = 2 }, remain a separate proposal; their type-producing and inference rules must be specified rather than silently introducing structural compatibility.

### Selected inline rule: identity per declaration

Apply one selected rule to named and unnamed record type declarations: each declaration defines a distinct type. Omitting its name or the redundant record keyword in a type position does not request structural compatibility.

```text
Player := record {
    stats: { points: Int; };
}

Team := record {
    stats: { points: Int; };
}

player: Player = { stats = { points = 10, }, };

/* Rejected: different inline type declarations. */
badTeam: Team = { stats = player.stats, };

/* Explicit reconstruction into Team's established stats type. */
team: Team = { stats = { points = player.stats.points, }, };
```

Type identity is checked independently of ownership and mutation permissions.

When a shared type is intended, declare it once:

```text
Stats := record { points: Int; }
Player := record { stats: Stats; }
Team := record { stats: Stats; }

player: Player = { stats = { points = 10, }, };
team: Team = { stats = player.stats, };
```

The last initializer is now type-compatible because both fields use the same Stats declaration; actual transfer still obeys the eventual copy/move/borrow rules. No structural conversion or automatic deep copy is implied.

An inline declaration inside Player defines Player's stats type once under the eventual compile-time type model. Constructing another Player value does not itself mint another type or require runtime type allocation. Generics, declaration instantiation, recursive types, and how an unnamed type can be referred to later still need formal rules.

The rejected structural alternative would reduce adaptation for temporary data but introduce a second identity policy and compatibility rules for defaults, field order, recursive shapes, access capabilities, and visibility. The selected per-declaration rule still keeps contextual data braces distinct from record type declarations and executable bodies.

## Reference-language comparison

- **Rust:** struct declarations define nominal types. Type aliases introduce names for existing types. This separates domain identity from naming and reuse. Sources: [structs](https://doc.rust-lang.org/reference/items/structs.html) and [aliases](https://doc.rust-lang.org/reference/items/type-aliases.html).
- **Odin:** the overview specifies that aggregate types are distinct. This is another example of keeping aggregate identity despite similar fields. Source: [Odin distinct types](https://odin-lang.org/docs/overview/#distinct-types).
- **Dart records:** record shape determines structural type identity, including field types and named-field names; a typedef does not make the shape nominal. These records are not the same facility as Dart classes. Source: [Dart record types](https://dart.dev/language/records#record-types).
- **TypeScript:** type compatibility is based on structural subtyping. This is more than an exact-field-set equality rule and has explicit exceptions and compatibility policies. Source: [TypeScript compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html).

Record declaration identity is now selected for named and unnamed inline types. Next resolve aliases, inferred standalone literal types, and any additional explicit conversions. Do not infer one from generated equality, byte layout, default values, or the ability to destructure fields.

Related: [records](records.md), [initialization](record-initialization.md), [pattern inference](pattern-binding-inference.md), [type tests](type-tests-and-narrowing.md), and [type categories](type-categories.md).
