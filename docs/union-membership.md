# Union membership and checked narrowing

Status: **selected 2026-10-18: an existing member value is admitted to a plain union automatically; using an arbitrary union value as one particular member requires checked narrowing**. Exact-member union-to-union widening is also selected in [union widening](union-widening.md). Interface/subtype membership and runtime representation remain open.

## Selected example

```text
Person := type User | Guest;
user: User = { name = "Ali", age = 10, }
person: Person = user;
```

Person admits User, so the last declaration needs no cast, explicit union wrapper, or enum-case constructor. The active value retains User's nominal identity and data. This is a union-membership rule, not an implicit User-to-Guest conversion.

The destination union must already be established. person := user infers User under the ordinary inference rule; it does not search all declared unions or aliases and pick a broader type. The rule introduces no new Person(user) conversion-call syntax.

Type compatibility alone does not settle copying, moving, borrowing, lifetime, allocation, or permissions. A union representation may require a tag and payload storage even though source code needs no wrapper syntax.

The user subsequently clarified [metadata plus C-style overlapping payload](union-zero.md#current-storage-model). Metadata identifies the active member while the payload stores one alternative, supporting the checked narrowing selected here. Max-member size applies to payload capacity; the full value also accounts for metadata and alignment. Exact encoding, ABI, and zero-tag meaning remain open.

## Identity checks

Resolve transparent aliases and normalize the target union before checking exact membership. Member := type User denotes User again; it is not another alternative. A separately declared Student record is not User merely because its fields match.

```text
Person := type User | Guest;
student: Student = { name = "Ali", age = 10, }
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

## Checked payload reads and ordinary arguments

Clarified 2026-10-26: a successful, still-valid member refinement changes the binding's readable type without changing its declared union storage contract. The compiler keeps track of that storage's actual representation and accesses the proven active payload. It must not interpret the complete tag-plus-payload representation as the naked member value.

Assume choose_value returns Int | String and use_int/use_string accept ordinary Int/String values without invalidating the relevant local facts:

```text
var x: Int | String = choose_value();

if x: Int {
    use_int(x); /* ordinary Int argument: supply the checked payload */
    x = 42;    /* storage still permits Int; active tag stays Int */
    use_int(x);
    x = "hello"; /* whole-union replacement: active tag becomes String */
    use_string(x); /* x now reads as String; the old Int fact is gone */
}
```

No manual extraction is required when an ordinary parameter expects the proven member type. The call follows the [ordinary value-copy rule](parameter-values-and-slots.md#general-copy-default-selected): supply the member value in the callee's required representation, not the whole union wrapper or an implicit reference to the caller's slot. The type test itself introduces no copy, storage shrink, freeze, or write permission. If the parameter expects a compatible union instead, supply a valid value in that union representation, preserving the active member.

The following is abstract memory notation, not a byte layout or source grammar:

```ini
x before               = [Int][7]
argument to use_int     =      [7]
x after x = 42          = [Int][42]
x after x = "hello"     = [String]["hello"]
```

Writes require existing authority. A valid same-member payload write can retain the tag, while replacing the original union binding with another admitted member updates its active tag and payload and establishes the replacement's read facts. The narrowed read type never becomes a permanent restriction on the binding's declared accepted replacements. Exact physical store counts, tag encoding, atomicity, and concurrency rules are not selected by this model.

Refinement must remain valid at the point of use; replacement or other invalidating effects cannot leave a stale member interpretation active. Explicit var/mut grants retain their separate admission and write contracts. These rules concern plain-union members and do not introduce implicit Option/Result extraction, unchecked casts, or general escaping payload-reference syntax.

## Payload writes versus whole-union replacement

[Union write grants](call-replacement-flow.md#union-payload-grants-and-whole-union-grants) distinguish access to a proven member payload from replacing the tagged union. An Int-proven union may supply var Int access to its original payload; Int writes retain the Int tag. Reject a payload-only write with no valid member proof. A var (Int | String) parameter still may replace the whole union without such narrowing: p = "hello" establishes [String]["hello"], not merely the payload. Existing initialization, authority, accepted-write, and entry checks remain. No general reference syntax or raw payload reinterpretation follows.

## Preserve named case boundaries

Plain-union entry does not automatically construct an enum case or unwrap a payload. Option still needs its selected case constructors/patterns. Result keeps .ok/.err identity and the independently selected implicit-success construction rule; union membership must not swallow errors or recursively unwrap outcomes.

Likewise, two named enum cases carrying User remain distinct cases. User | User cannot encode that extra case identity and normalizes to User instead.

## Remaining contracts

- Exact-member union-to-union widening is selected separately: every normalized source alternative must be an exact target member. See [union widening](union-widening.md) for examples and boundaries.
- Interface/subtype overlap, numeric subtyping if introduced, and ambiguity between several compatible alternatives.
- Capabilities, ownership, lifetime, generic constraints, and function argument/return integration.
- [Common field reads](union-field-reads.md) and [all-target field writes](union-field-writes.md) are selected separately. Stable existing-binding refinement after early exits is selected in [type tests](type-tests-and-narrowing.md#narrowing-after-early-exits-selected). Method calls and broader negative flow remain open.
- Layout, tag representation, ABI, allocation choices, and optimization. Automatic source admission does not promise a representation-free operation.

Related: [union-entry reference comparison](union-membership-comparison.md), [type-category comparison](type-categories-comparison.md), [normalization](union-normalization.md), [union patterns](union-patterns.md), [record identity](record-type-identity.md), and [type tests](type-tests-and-narrowing.md).
