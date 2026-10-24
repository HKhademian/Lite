# Record creation: zero initialization and declared defaults

Status: **overview updated 2026-10-19; omitted typed initializers and = 0 select zero initialization; = {} selects declared-default record construction; executable empty bodies still produce Unit**. Detailed field-default syntax, defaultability, and unnamed-type forms still need formalization. Named record declarations, contextual nested construction, and headless named-record patterns retain their selected contracts. This is design documentation, not implemented compiler behavior.

The user's later [union-construction review](union-initialization-policy.md#selected-rejection-and-explicit-member-choice) proposes A{0} as a compact expression that names a member and zeroes the entire A, bypassing defaults. The sole-zero marker remains proposed grammar; it is not a selected positional-field literal. Existing A{} and contextual = {} keep their declared-default meaning where record construction is valid.

## 1. Declare a record and its defaults

```text
Address := record {
    city: String = "Unknown";
    postalCode: Int;
}

User := record {
    name: String;
    age: Int;
    active: Bool = true;
    address: Address;
}
```

The proposed field-default spelling is `field: Type = expression`. Record-initializer construction uses these defaults for omitted fields; explicit zero construction bypasses them. Field declarations use semicolon separators; construction lists use commas. Final separators are optional and allowed. Top-level record type bindings retain record; omission in explicit nested type positions is proposed separately below.

## 2. Two initialization modes

There are two selected core initialization modes, with a semantic difference:

```text
implicit: User;     /* implicit zero; ignore field defaults */
zeroed: User = 0;   /* explicit contextual zero; ignore field defaults */
configured: User = {} /* apply declared defaults, then zero-fill other fields */
```

The selected surface direction reserved: User = ?; requests storage without either initialization mode. It remains unavailable as an ordinary User until initialization completes; first-write operations, allocation policy, and complete state/cleanup rules remain open. The earlier reserve() spelling is not a selected synonym. See [reserved storage](reserved-storage.md).

For zeroed, name and address.city are empty Strings, age and address.postalCode are 0, and active is false. For configured, active is true and address.city is "Unknown". Both values are fully initialized when their declarations complete. Every field type must map zero storage to a valid value; zero initialization never falls back to declared defaults.

The empty contextual record initializer is selected: its established initializer position and expected record type give it record-construction meaning. Empty executable bodies still produce Unit. The full grammar must express these distinct roles without using trial type-checking to choose a parse.

Omitting the initializer of a simple typed binding selects the same semantic zero as explicit = 0; neither uses declared field defaults. Every type has a valid all-zero value; this does not implicitly cast an arbitrary integer to a record. See [zero initialization](zero-initialization.md).

```text
user := User {}
```

Under the proposed default-resolution rule, this initializes every field:

- name is the empty String.
- age is 0.
- active is true, from the User declaration.
- address is a fully initialized Address, with city "Unknown" and postalCode 0.

Default construction includes declared field defaults. It is not a request to overwrite active with false or city with an empty String, and is not an uninitialized allocation.

### Per-field resolution

1. Use the explicitly supplied field value, if present.
2. Otherwise use the field's declared default, if present.
3. Otherwise recursively apply defaults for a nested record, or use the leaf type's language-defined zero value.
4. Otherwise reject construction with a diagnostic identifying the missing field.

Explicit false, 0, or an empty String overrides a declared nonzero/nonempty default. Duplicate field initializers should be rejected rather than silently taking the last value. Unknown and inaccessible fields must not be accepted. These diagnostic policies are recommendations alongside the proposed default contract.

This resolution applies only to record-initializer construction, such as User {} or user: User = { ... }. Both user: User; and user: User = 0 instead recursively zero-initialize all fields, bypassing declared defaults at every depth.

## 3. Override selected fields

```text
user := User {
    name = "Ali",
    age = 10,
}

inactive := User { name = "Sam", active = false, }
```

Unspecified fields still follow the same resolution rule. Explicit initialization does not require mut: construction establishes the initial value rather than updating an existing one.

An annotated binding can omit the construction type because it supplies the expected record type:

```text
user: User = { name = "Ali", age = 10, }
```

The empty contextual form `user: User = {}` is selected as record construction, just like the already established nonempty contextual form. `User {}` remains allowed. An executable empty block still produces Unit; a function/if/loop/match body never turns into record data because a record result is expected.

```text
user: User = {}   /* record initializer: apply field defaults */

do_nothing := fn() {} /* executable function body: Unit */

match status {
    _ {}             /* executable arm body: Unit */
}
```

No record type is inferred from an empty body. A User-returning function with an empty executable body cannot satisfy that contract merely because User has defaults; it needs an actual record construction as its result.

## 4. Nested construction

```text
user := User {
    name = "Ali",
    address = {
        city = "Shiraz",
    },
}
```

The address field already supplies Address, so repeating its type is optional. postalCode defaults to 0. The explicit spelling `address = Address { city = "Shiraz", }` remains allowed. The same contextual rule applies at every established record-field level, including Registration.student and Registration.contact.

### Explicit nested values replace the field default

Defaults should not introduce a hidden recursive merge:

```text
Office := record {
    address: Address = { city = "Munich", postalCode = 80331, }
}

first := Office {}
second := Office { address = { postalCode = 1000, }, }
```

The proposed result is first.address.city "Munich", but second.address.city "Unknown". The second initializer supplies a new Address, whose omitted city uses Address's own default. It replaces Office's address default as a whole. A patch/update/merge operation would need its own explicit contract.

## 5. Inline construction in expressions

No temporary binding is necessary:

```text
show_user(User { name = "Ali", age = 10, });

make_user := fn(name: String): User {
    User { name = name }
}
```

The explicit type head makes these ordinary construction expressions. The factory's outer braces are an executable body; its final User construction supplies its result. Omitting a construction head at arbitrary call arguments or function tail positions requires the broader expected-type/brace grammar, which is not selected merely by these examples.

Nested initializer notation alone does not request a graph clone or a particular allocation/ABI. The selected record-value rule stores ordinary nested record fields inline in their containing value: a named User field is still copied with that value. Reference fields preserve their targets rather than cloning them. Exact physical representation must preserve these semantics; see [local shadowing and copies](local-shadowing-and-copies.md). Ownership, reference syntax, resource copy eligibility, and ABI details remain separate contracts.

## 6. Unnamed record type inside a record: proposal

```text
Profile := record {
    name: String;
    stats: {
        points: Int;
        level: Int = 1;
    }
}

profile := Profile {
    name = "Ali",
    stats = { points = 20, },
}
```

The field's colon already starts a type position, so the recommended shorthand omits a redundant record keyword before its type braces. This declares an unnamed field type, then uses its known field contract for construction. It is an inline type declaration, not a shared default object. Under the proposal, omitted stats in record-initializer mode would recursively initialize points to 0 and level to 1:

```text
profile: Profile = {}
```

This is distinct from a bare-brace top-level type declaration: Profile := still starts an expression position, so this proposal retains its record keyword. Whether the longer nested stats: record { ... } spelling remains as an alias is a separate syntax choice; recommending the shorter form does not select two interchangeable spellings.

Independently declared unnamed record types have distinct identity, even with identical fields. How such a type can be named later or appear in public signatures remains open. The inline shorthand's full grammar is still a syntax proposal; its declaration identity is now selected.

The [inline identity rule](record-type-identity.md#selected-inline-rule-identity-per-declaration) selects distinct types per inline declaration, matching named records. Reuse one named Stats declaration when different outer records should share that field type.

## 7. Standalone inferred record literal: requested direction, grammar pending

```text
point := { x = 1, y = 2, }
```

The user requests this inline form without an expected record type. Completing it requires anonymous-record inference and a grammar distinct from executable blocks; see [record literal boundaries](record-literal-boundaries.md). The optional-semicolon boundary is selected independently of that grammar. It must not guess a named type by searching for matching field names. In particular, empty point := {} cannot simultaneously mean a new empty record and the existing Unit-valued empty block.

Named and established expected-type constructions remain the fully established examples; the inferred form above records the requested direction rather than a complete parser rule. Same-name construction entries such as User { name, age } also need a separate decision; proposed deconstruction shorthand does not automatically select construction shorthand.

## 8. Typed declaration without an initializer: implicit zero

```text
user: User;
var count: Int;
```

These declarations immediately initialize their bindings: user receives a recursively zero-initialized User, ignoring declared defaults, and count is 0. They are not late-initialized bindings. A subsequent count assignment is allowed by var; the fixed user binding is already initialized and cannot be assigned later as a special first write. In particular, user.active is false and user.address.city empty even though the record declarations provide different defaults.

This omitted-initializer form is selected and equivalent to explicitly supplying = 0. The separate = {} form applies declared defaults. Neither omission nor var changes the declared value type: the writable storage contract of var user: User is var User, while reading it produces User. Var alone does not grant mutable access to User fields.

Omission is supported for simple typed bindings and uses the same universally valid all-zero representation as = 0. Pattern declarations without an explicit source are not introduced. Inferred user := without a value is rejected because no type or source is supplied. Function parameters and record-field lists keep their own contracts.

## 9. Valid zero values versus declared defaults

All-zero storage must represent a valid value of every type. This replaces the earlier zero-eligibility restriction. Numeric zero, false, empty String, Unit, recursively zeroed fields, and empty collection states require representations consistent with that rule. Option's zero is its explicit .None state.

A zero-initialized function is callable and returns zero of its declared result type without user-body work. Ordinary argument evaluation and required cleanup still apply. References, enums, unions, resource wrappers, and constrained domains still require concrete zero mappings; no particular first enum/union alternative is silently chosen here. See [universal zero initialization](zero-initialization.md).

Declared-default construction is separate: = {} uses field defaults, whereas omitted initialization and = 0 bypass them. Required-field syntax, cross-field validation, and default evaluation remain separate contracts; they must respect the universal zero rule rather than introduce types with no zero representation.

## 10. Evaluation, mutability, and implementation cost

- Recommend initially restricting declared field defaults to compile-time values. Effectful or recoverably fallible runtime setup belongs in an explicitly called factory, preserving visible failure handling. Exact constant-expression grammar remains open.
- Evaluate explicit initializer expressions once, left to right in written order, under the selected ordinary evaluation-order rule. Do not evaluate a superseded field default for side effects.
- Each construction establishes its own logical default values. Do not introduce accidental shared writable collections through a declaration default. Ownership/copy rules must establish whether any noncopyable default can be reused.
- `mut user := User {}` grants writable held-data access; `var user := User {}` permits replacing the binding; `var mut` permits both. Default initialization does not change those permissions.
- No mandated preliminary zero-fill followed by overwrites is implied. A compiler may construct the final valid representation directly and remove redundant stores. This does not establish C-level performance before implementation and measurement.
- In var x: User; x = make_user();, zero initialization remains the source meaning, but its physical stores may be omitted if they have no observable effect. Reads, aliases, callbacks, exits before replacement, and any required cleanup must retain that meaning. See [semantic initialization versus physical writes](memory-and-performance.md#semantic-initialization-versus-physical-writes).

## References

Odin explicitly initializes variables to zero by default. Zig supports declaration-level field defaults and documents why per-field defaults can violate cross-field invariants. Rust's Default trait describes a valid type-provided default, with derived implementations using each field type's default. These are comparison points, not identical contracts to import wholesale:

- [Odin variable declarations](https://odin-lang.org/docs/overview/#variable-declarations).
- [Zig default field values](https://ziglang.org/documentation/0.15.1/#Default-Field-Values) and [faulty defaults](https://ziglang.org/documentation/0.15.1/#Faulty-Default-Field-Values).
- [Rust Default](https://doc.rust-lang.org/core/default/trait.Default.html).

Related: [records](records.md), [construction and pattern examples](pattern-examples.md), [mutability](mutability.md), [types and inference](types-and-inference.md), and [memory/performance](memory-and-performance.md).
