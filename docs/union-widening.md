# Widening between plain unions

Status: **selected 2026-10-18: a source plain union widens automatically to a destination plain union when every normalized source alternative is an exact destination member**. Subtype/interface conversions, container variance, ownership, and representation remain separate contracts.

## Description and template

```text
Source := type A | B;
Destination := type A | B | C;

source: Source = choose_source();
destination: Destination = source;
```

No cast or named case wrapper is needed. The destination permits more alternatives, while this assignment preserves the source's active member type and payload. It does not manufacture a C value or change an A into B.

The destination type must be established by context. destination := source keeps the source's inferred type; it does not choose a larger union automatically. Apply the same compatibility rule wherever a destination plain union is already required, subject to the eventual ownership and capability rules.

## Exact membership after normalization

Resolve transparent aliases, flatten nested plain unions, and remove duplicate identities before comparing the alternatives. Widening succeeds exactly when the normalized source alternatives are a subset of the destination alternatives. A single-member source follows the already selected [member admission rule](union-membership.md).

```text
Member := type User;
Person := type User | Guest;
Account := type Guest | Admin | Member;

person: Person = choose_person();
account: Account = person; /* accepted: User and Guest are covered */
same: Person = account;   /* rejected: Account also permits Admin */
```

Reordering or repeating an alias cannot make a missing type covered. A separately declared Student record is not User even when their fields have identical types. Numeric conversions, structural record conversion, and interface implementation are not performed to make this subset check succeed.

## Narrowing needs evidence

An arbitrary Account cannot be assigned to Person because Admin remains possible. Use checked selection to handle every alternative, or establish the active member through the selected type-test syntax:

```text
match account {
    : User { greet_user(account) }
    : Guest { greet_guest(account) }
    : Admin { greet_admin(account) }
}

if account: User {
    user: User = account;
    greet_user(user)
}
```

Every match remains exhaustive. A stable flow refinement may prove a narrower active type; the full refinement-validity rules are still tracked separately. Widening itself introduces no unchecked downcast.

## Preserve other type constructors

This rule relates plain unions. It does not recursively grant conversions through Option, Result, lists, mutable containers, or function types. In particular, it does not establish automatic conversion from User ! E to (User | Guest) ! (E | F), nor merge a union of Results into one Result. Those need their own compatibility rules.

Named enum alternatives retain their case identity. Neither widening nor normalization constructs or removes a case wrapper.

## Runtime and permission notes

Automatic source syntax does not guarantee identical memory layouts or a free runtime operation. A compiler may need to remap a discriminant or transfer payload storage between union representations. Allocation, ABI, copying, moving, borrowing, and lifetime rules remain undecided.

Widening must not grant writable access or other capabilities absent from the source. Exact type coverage is necessary; it does not override eventual permission and ownership checks.

## Reference comparison

Scala specifies both member inclusion A <: A | B and the rule that if A and B are subtypes of C, then A | B is a subtype of C. Exact-member subset widening follows within that broader model. LiteScript selects the exact-member rule without importing Scala's other subtype relations. Source: [Scala union type specification](https://docs.scala-lang.org/scala3/reference/new-types/union-types-spec.html).

TypeScript describes unions as values drawn from their member types, with operations requiring validity for every possible member. Its broader structural compatibility is a different contract from LiteScript's distinct record identities. Source: [TypeScript union types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types).

See the [reference-language comparison](union-membership-comparison.md) for the distinction between plain unions, named enum cases, discriminated sums, and sealed hierarchies.

## Remaining decisions

- [Common field reads](union-field-reads.md) are selected separately. Writes, method calls, and other operations without narrowing remain open.
- Interface overlap, subtype admission, and absorption if introduced.
- Compatibility through generic constructors, containers, functions, and fallible types.
- Mutation, ownership, lifetime, ABI, and public type-evolution contracts.

Related: [normalization](union-normalization.md), [membership](union-membership.md), [type tests](type-tests-and-narrowing.md), [record identity](record-type-identity.md), and [fallible composition](fallible-types-and-error-composition.md).
