# Record creation and default initialization

Status: **overview dated 2026-10-18; zero/default initialization requested as the normal behavior; detailed default resolution, field-default syntax, initializer omission, and unnamed-type forms below are proposals**. Named record declarations, contextual nested construction, and headless named-record patterns retain their selected contracts. This is design documentation, not implemented compiler behavior.

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

The proposed field-default spelling is `field: Type = expression`. A field without an explicit default uses its type's valid default when one exists. Field declarations use semicolon separators; construction lists use commas. Final separators are optional and allowed. Record type names remain explicit in these declarations through record; the earlier bare-brace type declaration is still a separate proposal.

## 2. Default construction

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
3. Otherwise use the field type's valid default, if available.
4. Otherwise reject construction with a diagnostic identifying the missing field.

Explicit false, 0, or an empty String overrides a declared nonzero/nonempty default. Duplicate field initializers should be rejected rather than silently taking the last value. Unknown and inaccessible fields must not be accepted. These diagnostic policies are recommendations alongside the proposed default contract.

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

The additional empty contextual form `user: User = {};` is proposed subject to an explicit grammar boundary. `User {}` is the unambiguous default-construction form. An executable empty block still produces Unit; a function/if/loop body never turns into record data because a record result is expected.

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

Inline source notation does not promise physical in-place storage, heap allocation, deep copying, or a particular ABI. Ownership, references, and layout have separate contracts.

## 6. Unnamed record type inside a record: proposal

```text
Profile := record {
    name: String;
    stats: record {
        points: Int;
        level: Int = 1;
    };
}

profile := Profile {
    name = "Ali",
    stats = { points = 20, },
};
```

This reuses record to declare an unnamed field type, then uses its known field contract for construction. It is an inline type declaration, not a shared default object. Under the proposal, omitted stats would recursively initialize points to 0 and level to 1.

Whether independently declared identical unnamed records share type identity, can be named later, or can appear in public signatures remains open. This proposal must not silently settle nominal versus structural typing.

## 7. Standalone inferred record literal: separate proposal

```text
point := { x = 1, y = 2, };
```

There is no expected record type here. Adopting this form would require anonymous-record inference and a grammar distinct from executable blocks. It must not guess a named type by searching for matching field names. In particular, empty point := {} cannot simultaneously mean a new empty record and the existing Unit-valued empty block.

For now, use a named record type or an established expected record type. Same-name construction entries such as User { name, age } also need a separate decision; proposed deconstruction shorthand does not automatically select construction shorthand.

## 8. Typed declaration without an initializer: proposal

```text
user: User;
var count: Int;
```

If adopted, these are initialized immediately: user receives its full default User value and count is 0. They are not late-initialized bindings. A subsequent count assignment is allowed by var; a default-initialized immutable binding is already initialized and cannot be assigned later as a special first write.

Only a simple typed binding is illustrated. Pattern declarations without an explicit source are not introduced. Inferred `user :=` without a value is rejected because no type or source is supplied. The selected declaration grammar still requires an initializer until this extension is confirmed.

## 9. What a type default means

Recommended defaults are semantic values, not a guarantee about zeroed bytes:

- Int: 0; Float: 0.0; Bool: false; String: empty text; Unit: Unit.
- Option: its explicit .None case. This is typed absence, not a null state admitted by every type.
- Standard growable collections: empty, subject to their eventual allocator/capacity and collection contracts.
- Tuples and fixed-size arrays: recursively default each component/element when all are defaultable; fixed-size arrays do not become empty arrays.
- Records: recursively apply declared field defaults and type defaults.
- Enums: no invented first case and no unnamed numeric-zero case. A default case/value needs an explicit contract, or the field must be supplied.
- General unions, functions, nonoptional references, resource handles, and validated domain types: no fabricated default. Supply a valid value unless the type explicitly provides a valid default.
- Result: do not automatically invent success, failure, or an arbitrary error. Initialize the outcome explicitly unless an explicit type/default contract is defined later.

A record can therefore be declared even when some fields are not defaultable; construction must supply those fields or valid field defaults. Recursive default construction must terminate. Generics need an eventual defaultability constraint rather than assuming every type parameter has a zero value.

Zero/default validity is not the same as satisfying a business rule. A plain String permits empty text. A required nonempty name or valid age needs validation or an appropriate domain type; a syntax for marking an otherwise-defaultable field required is still open. Cross-field invariants also cannot be guaranteed by filling each field independently.

## 10. Evaluation, mutability, and implementation cost

- Recommend initially restricting declared field defaults to compile-time values. Effectful or recoverably fallible runtime setup belongs in an explicitly called factory, preserving visible failure handling. Exact constant-expression grammar remains open.
- Evaluate explicit initializer expressions once, left to right in written order, under the selected ordinary evaluation-order rule. Do not evaluate a superseded field default for side effects.
- Each construction establishes its own logical default values. Do not introduce accidental shared writable collections through a declaration default. Ownership/copy rules must establish whether any noncopyable default can be reused.
- `mut user := User {};` grants writable held-data access; `var user := User {};` permits replacing the binding; `var mut` permits both. Default initialization does not change those permissions.
- No mandated preliminary zero-fill followed by overwrites is implied. A compiler may construct the final valid representation directly and remove redundant stores. This does not establish C-level performance before implementation and measurement.

## References

Odin explicitly initializes variables to zero by default. Zig supports declaration-level field defaults and documents why per-field defaults can violate cross-field invariants. Rust's Default trait describes a valid type-provided default, with derived implementations using each field type's default. These are comparison points, not identical contracts to import wholesale:

- [Odin variable declarations](https://odin-lang.org/docs/overview/#variable-declarations).
- [Zig default field values](https://ziglang.org/documentation/0.15.1/#Default-Field-Values) and [faulty defaults](https://ziglang.org/documentation/0.15.1/#Faulty-Default-Field-Values).
- [Rust Default](https://doc.rust-lang.org/core/default/trait.Default.html).

Related: [records](records.md), [construction and pattern examples](pattern-examples.md), [mutability](mutability.md), [types and inference](types-and-inference.md), and [memory/performance](memory-and-performance.md).
