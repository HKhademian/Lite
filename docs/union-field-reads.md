# Reading fields through a plain union

Status: **selected 2026-10-18: a field read is valid when every possible alternative exposes that readable field; its result type is the normalized union of those field types**. [All-target field writes](union-field-writes.md) are selected separately. Method calls, property/getter semantics, ownership, and explicit access notation remain open.

## Rule and template

For a receiver of type A | B, reading receiver.field requires a readable field on both A and B at that program location. First establish that every alternative supports the read. Only then combine the field types and apply ordinary [union normalization](union-normalization.md).

```text
receiver: A | B = choose_value();
value := receiver.field;
```

If A.field has type X and B.field has type Y, value has type X | Y. Duplicate resolved identities disappear, order does not matter, and nested plain unions flatten. No explicit conversion syntax is required merely because the field types differ; the compiler must construct a valid result representation when member admission changes the layout.

The runtime read selects the field belonging to the active alternative. It does not evaluate the fields of inactive alternatives. Evaluate the receiver expression once under the ordinary evaluation rules.

## Same field type

```text
User := record { name: String; age: Int; }
Guest := record { name: String; }

person: User | Guest = choose_person();
name := person.name; /* String | String simplifies to String */
```

These records retain distinct nominal identities. Shared field access does not permit assigning a Guest to a User or reconstructing either record implicitly.

## Different field types

```text
NumericEntry := record { value: Int; }
TextEntry := record { value: String; }

entry: NumericEntry | TextEntry = choose_entry();
value := entry.value; /* Int | String */

match value {
    : Int { show_number(value) }
    : String { show_text(value) }
}
```

For field types X | Y and Y | Z, the read produces X | Y | Z. Transparent aliases do not add alternatives; separately declared record field types remain distinct even if their shapes match.

## Field reads construct the result representation

Clarified 2026-10-27: the union of readable field types is a produced value contract, not a claim that the original field already occupies a union slot. For established distinct record alternatives:

```text
P := record { value: Int; }
Q := record { value: String; }

parent: P | Q = choose_parent();
copied := parent.value; /* Int | String */
```

For this stable local parent, the read has the following conceptual expansion:

```text
copied := if parent: P {
    parent.value /* Int, implicitly admitted into the result union */
} else {
    parent.value /* Q.value: String, implicitly admitted into the result union */
}
```

The complete if/else infers Int | String under the selected [branch-result rule](branch-result-inference.md). Each executed branch supplies its field value and constructs the destination's corresponding active member. The compiler knows the parent-to-result member mapping; it does not inspect naked payload bytes to guess their type. In abstract memory notation:

```ini
parent P case = [P][7]
copied result = [Int][7]

parent Q case = [Q]["hello"]
copied result = [String]["hello"]
```

The source parent tag and the produced field-result tag have different roles. Preserve the active field value, its ordinary copy effects, and any necessary destination representation adaptation. The original field keeps its declared Int or String storage and is not silently replaced by a tagged Int | String field. Its copied result adds no write authority or reference back to the source.

This expansion describes value/effect semantics, not mandatory extra intermediate copies or generated branches. Evaluate an arbitrary receiver expression once, dispatch on that evaluated receiver, and read only the selected field; do not repeat a call/getter or manufacture a snapshot to justify the expansion. If a valid proof already determines the active parent alternative, the dispatch/tag choice can be fixed. Physical copy/store counts, tag encodings, and ABI remain separate.

In particular, a produced Int | String read does not justify passing the original Int-or-String field as var (Int | String). Such a whole-union grant could write a String tag/payload into an Int field. The existing [all-target write rules](union-field-writes.md) still apply; after a valid parent refinement, an appropriately authorized member-only grant follows its original field contract. This adds no general reference syntax or conversion between record identities.

## A missing or inaccessible field rejects the read

```text
person: User | Guest = choose_person();
age := person.age; /* rejected: Guest has no age field */

if person: User {
    age := person.age; /* Int: the receiver has been narrowed */
    show_age(age)
}
```

A field hidden by visibility or lacking read permission also makes the direct read invalid. The compiler must identify the alternatives that prevent access. It must not silently discard those alternatives, invent None/Unit, return a Result, or postpone a known missing field to a runtime failure.

The check uses alternatives still possible under a valid existing refinement. It does not independently introduce new flow proofs or bypass the [refinement stability rules](type-tests-and-narrowing.md).

## Missing fields are not bottom types

The user's intended equations are captured as two separate operations:

- Availability: every possible receiver alternative must provide the readable field. One missing field makes the projection invalid.
- Result combination, after availability succeeds: X | X becomes X; X | Y equals Y | X.

Do not encode a missing field as an ordinary bottom/never member of a union. Conventionally, bottom has no values, so X union bottom is X: it cannot represent the requirement that a read fail when one live receiver alternative lacks the field. An invalid projection is a type-checking failure, not a value type that can be normalized away.

This distinction does not select a public Never spelling, a new error type, or a complete bottom-type contract for LiteScript.

## Nested reads and preserved correlations

Apply the same rule at each field read. If receiver.contact yields EmailContact | PhoneContact, the following .address read is valid only when both projected alternatives provide it.

The original receiver still has its original nominal union type. Reading fields separately does not manufacture a record with independently interchangeable fields or erase correlations inside its alternatives. Inferring a parent type from a later field test remains part of the separate flow-analysis review.

## Boundaries

- Reading a common field does not grant write access. [Writes must fit every possible target field](union-field-writes.md); membership in the projected read union alone is insufficient. [Value types and access contracts](union-values-and-access.md) explain the distinction and investigate making it visible.
- A function-valued field can be read under this rule, but invocation compatibility and method dispatch need their own contracts.
- No shared base class or interface is required for this field read. This does not select structural assignment for whole records.
- No particular offset, layout, allocation strategy, or zero-cost dispatch is guaranteed. A compiler may need to select the appropriate offset and result representation for the active alternative.
- Copying, moving, borrowing, lifetimes, and permission preservation still govern how the read can be used. Projection cannot grant capabilities the source does not possess.

## References

TypeScript permits access to members present on every union constituent. This supports the availability rule; its structural assignment model and method rules are separate from LiteScript's selected nominal records and field-read contract. Source: [TypeScript common fields](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#unions-with-common-fields).

Scala's detailed union specification uses members of the union's join. Its example rejects a same-named hello method on unrelated traits without a shared declared member, while accepting it through a common trait. Therefore plain union syntax alone does not imply LiteScript's common-field policy. Source: [Scala union members](https://docs.scala-lang.org/scala3/reference/new-types/union-types-spec.html#members).

TypeScript uses never for a state with no remaining possibilities after narrowing. That is different from a live object lacking a requested field. Source: [TypeScript never and exhaustiveness](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#the-never-type).

Related: [union membership](union-membership.md), [union widening](union-widening.md), [record identity](record-type-identity.md), [pattern inference](pattern-binding-inference.md), and [types and inference](types-and-inference.md).
