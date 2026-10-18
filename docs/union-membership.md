# Union membership and checked narrowing

Status: **selected 2026-10-18: an existing member value is admitted to a plain union automatically; using an arbitrary union value as one particular member requires checked narrowing**. Exact-member union-to-union widening is also selected in [union widening](union-widening.md). Interface/subtype membership and runtime representation remain open.

## Selected example

```text
Person := type User | Guest;
user: User = { name = "Ali", age = 10, };
person: Person = user;
```

Person admits User, so the last declaration needs no cast, explicit union wrapper, or enum-case constructor. The active value retains User's nominal identity and data. This is a union-membership rule, not an implicit User-to-Guest conversion.

The destination union must already be established. person := user infers User under the ordinary inference rule; it does not search all declared unions or aliases and pick a broader type. The rule introduces no new Person(user) conversion-call syntax.

Type compatibility alone does not settle copying, moving, borrowing, lifetime, allocation, or permissions. A union representation may require a tag and payload storage even though source code needs no wrapper syntax.

## Identity checks

Resolve transparent aliases and normalize the target union before checking exact membership. Member := type User denotes User again; it is not another alternative. A separately declared Student record is not User merely because its fields match.

```text
Person := type User | Guest;
student: Student = { name = "Ali", age = 10, };
bad: Person = student; /* rejected: Student is not a listed member */
```

This rule does not authorize string-to-number conversion, numeric narrowing/widening, reconstruction into an equal-shaped record, interface implementation, or selection of the first convertible alternative. Any additional conversion contract needs its own explicit rule.

## Checked narrowing back to a member

An arbitrary Person cannot be treated as User without establishing that it contains User. Use the selected type-test form:

```text
person: Person = choose_person();

if person: User {
    greet_user(person)
}
```

The test refines the existing binding for its successful branch. It does not construct another User or alter the binding's declared type. Stability under mutation, captures, and aliases still follows the eventual flow/ownership contract.

Match can handle the complete closed union:

```text
match person {
    : User { greet_user(person) }
    : Guest { greet_guest(person) }
}
```

The subject is evaluated once and arm selection remains source ordered. Exhaustiveness and the ordinary branch-result contract both apply. No unchecked assertion or panic-producing extraction syntax is introduced by this decision.

## Preserve named case boundaries

Plain-union entry does not automatically construct an enum case or unwrap a payload. Option still needs its selected case constructors/patterns. Result keeps .ok/.err identity and the independently selected implicit-success construction rule; union membership must not swallow errors or recursively unwrap outcomes.

Likewise, two named enum cases carrying User remain distinct cases. User | User cannot encode that extra case identity and normalizes to User instead.

## Remaining contracts

- Exact-member union-to-union widening is selected separately: every normalized source alternative must be an exact target member. See [union widening](union-widening.md) for examples and boundaries.
- Interface/subtype overlap, numeric subtyping if introduced, and ambiguity between several compatible alternatives.
- Capabilities, ownership, lifetime, generic constraints, and function argument/return integration.
- [Common field reads](union-field-reads.md) are selected separately. Writes, method calls, negative flow, and refinement after early exits remain open.
- Layout, tag representation, ABI, allocation choices, and optimization. Automatic source admission does not promise a representation-free operation.

Related: [union-entry reference comparison](union-membership-comparison.md), [type-category comparison](type-categories-comparison.md), [normalization](union-normalization.md), [union patterns](union-patterns.md), [record identity](record-type-identity.md), and [type tests](type-tests-and-narrowing.md).
