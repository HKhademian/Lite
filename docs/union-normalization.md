# Plain union normalization

Status: **selected 2026-10-18: plain unions ignore member order, flatten nested plain unions, and remove duplicate type identities after transparent-alias resolution**. Distinct record declarations and enum cases retain identity. Automatic member admission and checked narrowing are selected separately. Subtype absorption, broader assignability, recursive alias legality, representation, and ABI remain separate contracts.

Direct [union-target type tests](type-tests-and-narrowing.md#union-targets-in-type-tests-selected) use this normalization on input and target members. For closed distinct types, success keeps shared members and failure the input remainder; target-only members never widen the input.

## One type despite spelling differences

Assume A, B, and C name existing distinct types:

```text
First := type A | B;
Reordered := type B | A;
Repeated := type A | B | A;

Flat := type A | B | C;
Nested := type A | (B | C);
```

First, Reordered, and Repeated denote the same union type. Flat and Nested also denote the same union type. These are transparent aliases, not declarations of fresh nominal record types.

### Selected rules

1. **Order does not affect identity.** A | B and B | A are the same plain union type.
2. **Nested plain unions flatten.** A | (B | C) and (A | B) | C normalize to A | B | C.
3. **Exact duplicate identities disappear.** A | A is A; A | B | A is A | B.
4. **Transparent aliases do not add alternatives.** Resolve alias identity before duplicate removal. Preserve useful source alias names for diagnostics without treating them as runtime tags.

The right side's type context is established by the selected type prefix. These equations describe semantic type identity, not new equality operators or runtime type-value comparisons.

## Aliases and nominal records

```text
Member := type User;
Person := type User | Guest;
SamePerson := type Member | Person | Guest;
```

SamePerson denotes User | Guest. Member contributes User again, and Person contributes its existing plain union members. Neither contributes a new wrapper.

By contrast, separately declared User and Student record types remain distinct even if they have identical fields and defaults. User | Student retains both alternatives. Normalization compares resolved type identities, not type-name spelling, field shape, byte layout, or the equality of currently stored values.

Alias resolution must obey the eventual scope/cycle contract; this rule does not authorize endlessly expanding a cyclic alias. It does not unfold a nominal record into its fields to establish identity.

## Success and error unions

```text
ReadErrors := type ReadError | SharedError;
LoadError := type ReadErrors | ParseError | SharedError;
Outcome := type User ! LoadError;
```

LoadError normalizes to ReadError | SharedError | ParseError, independent of presentation order. The outcome retains its success/failure distinction. Error propagation still needs to fit the declared error contract; duplicate removal does not declare coverage for an unrelated error.

The same normalization applies separately inside success or error operands. This does not settle implicit error conversions, subtype membership, or the general Error contract.

## Recovery result types simplify too

The selected recovery rule forms T | D from the normal success type T and normal fallback type D. If both are User, that becomes User rather than a redundant User | User. If D is already User | Guest, the result normalizes to User | Guest.

This is a type simplification, not permission to remove runtime handler behavior. A fallback still executes only when recovery is needed, and its effects remain observable under the ordinary evaluation rules.

## Preserve every meaningful boundary

Only adjacent plain union composition flattens. Do not discard or redistribute unrelated structure:

- An Option's .Some/.None distinction remains. A nested Option is not flattened merely because its payload contains an Option or union.
- A Result's .ok/.err distinction remains, even when its success and failure payload types are identical. T ! T is not T.
- A union of two Result types is not automatically rewritten into one Result with unioned success/error operands. Such a conversion could erase which source outcome contract applied.
- Enum cases retain their distinct names/tags even when payload types coincide. A plain T | T cannot express two separately named cases; an enum can.
- A union of complete tuple or record alternatives retains those alternatives. Do not replace correlated components with independent per-field unions. Tuple component forms and core construction/binding rules are selected separately; different stored tuple labels require explicit reconstruction. Identical ordered labels and resolved component types describe the same structural tuple type and are subject to the existing duplicate-removal rule. Complete recursive grammar and stored named/unnamed conversions remain open. See [tuple component grammar](named-input-routing.md#selected-tuple-type-component-grammar).
- Unit remains a real alternative when combined with a distinct type. It is not absent data and must not be erased like a duplicate.

These preserve already selected pattern inference and explicit Option/Result handling. Normalization introduces no None, null, automatic unwrap, or generated conversion.

## Ordering, coverage, and initialization

Union member order does not change source-order match-arm selection. Earlier fully successful arms still win; guards can reject an arm. A later arm using a transparent alias cannot distinguish it from the original type. Exact unreachable-pattern diagnostic severity remains open.

Exhaustiveness is checked against normalized alternatives under the eventual coverage algorithm. Adding a truly new nominal alternative can make an explicitly enumerated match incomplete; adding a duplicate alias cannot create a new case.

There is no first union member to use as an implicit default. Contextual 0 cannot arbitrarily select one of several possible zeroable alternatives. Expected-type and literal rules must reject unresolved ambiguity or use an independently defined valid zero contract.

The selected [union-zero membership rule](union-zero.md#selected-membership-of-union-zero) requires zero to hold the zero value of one listed member, with no hidden none/invalid state. Which listed member is chosen remains open. Source order cannot choose the zero member under the current identity rule.

The user clarifies [metadata plus overlapping payload](union-zero.md#current-storage-model): max-member size applies to payload capacity, while full storage includes metadata and alignment. This supports distinguishable active member identities. The zero metadata interpretation must remain coherent across order-independent equivalent union types; exact tag encoding and ABI remain open.

Equivalent semantic types do not make source declaration order a stable runtime tag-number or ABI contract. The compiler's eventual representation and public compatibility rules remain separate.

## Boundaries still to settle

- Member admission and [exact-member union widening](union-widening.md) are selected. Subtype membership and capability/ownership compatibility remain open.
- Subtyping/interface overlap and absorption. Exact identity duplicate removal is selected; a rule such as reducing Subtype | Interface to Interface needs the actual type-relation contract.
- Precedence with other type constructors and associativity of repeated fallible type operators. Union `|` binds more tightly than binary type `!`; ungrouped code is valid, while official reference documentation prefers explicitly grouped union operands on both sides. See [type grouping](fallible-types-and-error-composition.md#grouping).
- Generic normalization, recursive aliases, and legal recursive nominal boundaries.
- Internal Never reads for exhausted conditional branches are selected in [unreachable flow](never-and-unreachable-flow.md). Public bottom/top types and their general algebra remain open. The user specifically requests future exploration of Never | T and Never & T; no public intersection syntax or general simplification law is selected here. Do not select public Never or Any by example.
- [Common field reads](union-field-reads.md) use normalized unions after confirming availability on every alternative. [Field writes](union-field-writes.md) must fit every possible target's field type, rather than merely the projected read union. Methods, explicit access notation, ownership/capability combination, runtime layout, ABI, and complete diagnostics remain open.

The value-level example person: Person = user for Person := type User | Guest is now selected. Automatic member inclusion avoids a cast, while recovering User from an arbitrary Person requires narrowing. See [union membership](union-membership.md).

## References

Scala 3 explicitly specifies that plain union | is commutative, so changing member order does not change the type. Its broader type/subtyping model is not imported by this decision. Source: [Scala union types](https://docs.scala-lang.org/scala3/reference/new-types/union-types.html).

TypeScript describes unions of existing member types and transparent aliases for them. Its structural compatibility and broader simplification rules are not automatically LiteScript's nominal-record contract. Source: [TypeScript unions and aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types).

Related: [type aliases](type-aliases.md), [record identity](record-type-identity.md), [union patterns](union-patterns.md), [pattern inference](pattern-binding-inference.md), and [fallible composition](fallible-types-and-error-composition.md).
