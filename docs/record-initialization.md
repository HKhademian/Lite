# Record creation: zero initialization and declared defaults

Status: **overview updated 2026-10-19; omitted typed initializers and = 0 select zero initialization; = {} selects declared-default record construction; executable empty bodies still produce Unit**. Detailed field-default syntax, defaultability, and unnamed-type forms still need formalization. Named record declarations, contextual nested construction, and headless named-record patterns retain their selected contracts. This is design documentation, not implemented compiler behavior.

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
configured: User = {}; /* apply declared defaults, then zero-fill other fields */
```

The selected surface direction reserved: User = ?; requests storage without either initialization mode. It remains unavailable as an ordinary User until initialization completes; first-write operations, allocation policy, and complete state/cleanup rules remain open. The earlier reserve() spelling is not a selected synonym. See [reserved storage](reserved-storage.md).

For zeroed, name and address.city are empty Strings, age and address.postalCode are 0, and active is false. For configured, active is true and address.city is "Unknown". Both values are fully initialized when their declarations complete. Zero initialization must not secretly fall back to field defaults for a type with no valid zero value.

The empty contextual record initializer is selected: its established initializer position and expected record type give it record-construction meaning. Empty executable bodies still produce Unit. The full grammar must express these distinct roles without using trial type-checking to choose a parse.

Omitting the initializer of a simple typed binding selects the same semantic zero as explicit = 0; neither uses declared field defaults. Semantic zero must exist for the type; the integer value zero is not implicitly cast to arbitrary record types. See [zero initialization](zero-initialization.md).

```text
user := User {};
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
3. Otherwise recursively apply defaults for a nested record, or use the leaf type's valid zero value, if available.
4. Otherwise reject construction with a diagnostic identifying the missing field.

Explicit false, 0, or an empty String overrides a declared nonzero/nonempty default. Duplicate field initializers should be rejected rather than silently taking the last value. Unknown and inaccessible fields must not be accepted. These diagnostic policies are recommendations alongside the proposed default contract.

This resolution applies only to record-initializer construction, such as User {} or user: User = { ... }. Both user: User; and user: User = 0 instead recursively zero-initialize all fields, bypassing declared defaults at every depth.

## 3. Override selected fields

```text
user := User {
    name = "Ali",
    age = 10,
};

inactive := User { name = "Sam", active = false, };
```

Unspecified fields still follow the same resolution rule. Explicit initialization does not require mut: construction establishes the initial value rather than updating an existing one.

An annotated binding can omit the construction type because it supplies the expected record type:

```text
user: User = { name = "Ali", age = 10, };
```

The empty contextual form `user: User = {};` is selected as record construction, just like the already established nonempty contextual form. `User {}` remains allowed. An executable empty block still produces Unit; a function/if/loop/match body never turns into record data because a record result is expected.

```text
user: User = {};   /* record initializer: apply field defaults */

do_nothing := fn() {}; /* executable function body: Unit */

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
};
```

The address field already supplies Address, so repeating its type is optional. postalCode defaults to 0. The explicit spelling `address = Address { city = "Shiraz", }` remains allowed. The same contextual rule applies at every established record-field level, including Registration.student and Registration.contact.

### Explicit nested values replace the field default

Defaults should not introduce a hidden recursive merge:

```text
Office := record {
    address: Address = { city = "Munich", postalCode = 80331, };
}

first := Office {};
second := Office { address = { postalCode = 1000, }, };
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
    };
}

profile := Profile {
    name = "Ali",
    stats = { points = 20, },
};
```

The field's colon already starts a type position, so the recommended shorthand omits a redundant record keyword before its type braces. This declares an unnamed field type, then uses its known field contract for construction. It is an inline type declaration, not a shared default object. Under the proposal, omitted stats in record-initializer mode would recursively initialize points to 0 and level to 1:

```text
profile: Profile = {};
```

This is distinct from a bare-brace top-level type declaration: Profile := still starts an expression position, so this proposal retains its record keyword. Whether the longer nested stats: record { ... } spelling remains as an alias is a separate syntax choice; recommending the shorter form does not select two interchangeable spellings.

Independently declared unnamed record types have distinct identity, even with identical fields. How such a type can be named later or appear in public signatures remains open. The inline shorthand's full grammar is still a syntax proposal; its declaration identity is now selected.

The [inline identity rule](record-type-identity.md#selected-inline-rule-identity-per-declaration) selects distinct types per inline declaration, matching named records. Reuse one named Stats declaration when different outer records should share that field type.

## 7. Standalone inferred record literal: separate proposal

```text
point := { x = 1, y = 2, };
```

There is no expected record type here. Adopting this form would require anonymous-record inference and a grammar distinct from executable blocks. It must not guess a named type by searching for matching field names. In particular, empty point := {} cannot simultaneously mean a new empty record and the existing Unit-valued empty block.

For now, use a named record type or an established expected record type. Same-name construction entries such as User { name, age } also need a separate decision; proposed deconstruction shorthand does not automatically select construction shorthand.

## 8. Typed declaration without an initializer: implicit zero

```text
user: User;
var count: Int;
```

These declarations immediately initialize their bindings: user receives a recursively zero-initialized User, ignoring declared defaults, and count is 0. They are not late-initialized bindings. A subsequent count assignment is allowed by var; the fixed user binding is already initialized and cannot be assigned later as a special first write. In particular, user.active is false and user.address.city empty even though the record declarations provide different defaults.

This omitted-initializer form is selected and equivalent to explicitly supplying = 0. The separate = {} form applies declared defaults. Neither omission nor var changes the declared value type: the writable storage contract of var user: User is var User, while reading it produces User. Var alone does not grant mutable access to User fields.

Omission is supported for simple typed bindings and obeys the same valid-zero requirement as = 0. Pattern declarations without an explicit source are not introduced. Inferred user := without a value is rejected because no type or source is supplied. Function parameters and record-field lists keep their own contracts.

## 9. Valid zero values versus declared defaults

Recommended zero values are semantic values, not a guarantee about zeroed bytes. Default construction can replace them through declared field defaults:

- Int: 0; Float: 0.0; Bool: false; String: empty text; Unit: Unit.
- Option: its explicit .None case. This is typed absence, not a null state admitted by every type.
- Standard growable collections: empty, subject to their eventual allocator/capacity and collection contracts.
- Tuples and fixed-size arrays: recursively default each component/element when all are defaultable; fixed-size arrays do not become empty arrays.
- Records: zero mode recursively ignores all declared field defaults; initializer mode recursively applies declared defaults to omitted fields.
- Enums: no invented first case and no unnamed numeric-zero case. A default case/value needs an explicit contract, or the field must be supplied.
- General unions, functions, nonoptional references, resource handles, and validated domain types: no fabricated default. Supply a valid value unless the type explicitly provides a valid default.
- Result: do not automatically invent success, failure, or an arbitrary error. Initialize the outcome explicitly unless an explicit type/default contract is defined later.

A record can therefore be declared even when some fields have no valid zero value. Zero construction must then be rejected, even if such a field has a declared default; record-initializer construction can instead supply the field or use that valid declared default. Neither mode can fabricate an invalid value. Recursive construction must terminate. Generics need eventual zeroability/defaultability constraints rather than assuming every type parameter admits both modes. Contract names and syntax for those capabilities remain open.

Zero/default validity is not the same as satisfying a business rule. A plain String permits empty text. A required nonempty name or valid age needs validation or an appropriate domain type; a syntax for marking an otherwise-defaultable field required is still open. Cross-field invariants also cannot be guaranteed by filling each field independently. A validated domain type with no valid zero must reject zero construction rather than bypass its invariant.

## 10. Evaluation, mutability, and implementation cost

- Recommend initially restricting declared field defaults to compile-time values. Effectful or recoverably fallible runtime setup belongs in an explicitly called factory, preserving visible failure handling. Exact constant-expression grammar remains open.
- Evaluate explicit initializer expressions once, left to right in written order, under the selected ordinary evaluation-order rule. Do not evaluate a superseded field default for side effects.
- Each construction establishes its own logical default values. Do not introduce accidental shared writable collections through a declaration default. Ownership/copy rules must establish whether any noncopyable default can be reused.
- `mut user := User {};` grants writable held-data access; `var user := User {};` permits replacing the binding; `var mut` permits both. Default initialization does not change those permissions.
- No mandated preliminary zero-fill followed by overwrites is implied. A compiler may construct the final valid representation directly and remove redundant stores. This does not establish C-level performance before implementation and measurement.
- In var x: User; x = make_user();, zero initialization remains the source meaning, but its physical stores may be omitted if they have no observable effect. Reads, aliases, callbacks, exits before replacement, and any required cleanup must retain that meaning. See [semantic initialization versus physical writes](memory-and-performance.md#semantic-initialization-versus-physical-writes).

## References

Odin explicitly initializes variables to zero by default. Zig supports declaration-level field defaults and documents why per-field defaults can violate cross-field invariants. Rust's Default trait describes a valid type-provided default, with derived implementations using each field type's default. These are comparison points, not identical contracts to import wholesale:

- [Odin variable declarations](https://odin-lang.org/docs/overview/#variable-declarations).
- [Zig default field values](https://ziglang.org/documentation/0.15.1/#Default-Field-Values) and [faulty defaults](https://ziglang.org/documentation/0.15.1/#Faulty-Default-Field-Values).
- [Rust Default](https://doc.rust-lang.org/core/default/trait.Default.html).

Related: [records](records.md), [construction and pattern examples](pattern-examples.md), [mutability](mutability.md), [types and inference](types-and-inference.md), and [memory/performance](memory-and-performance.md).
