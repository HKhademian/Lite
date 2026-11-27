# Record creation: zero initialization and declared defaults

Status: **updated 2026-11-27 (Phase 13): declared defaults, written-order supplied field evaluation followed by declaration-order omitted/dependent defaults (`end: Int = start + 10`), forward/self field rejection in defaults, zero initialization (`= 0`), and `= {}` / `User {}` implemented on TS and C11**. Detailed spread/cycle scheduling and anonymous records remain open design items.

The user's later [union-construction review](lite://doc/union-initialization-policy#selected-rejection-and-explicit-member-choice) proposes A{0} as a compact expression that names a member and zeroes the entire A, bypassing defaults. The sole-zero marker remains proposed grammar; it is not a selected positional-field literal. Existing A{} and contextual = {} keep their declared-default meaning where record construction is valid.

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
zeroed: User = 0;   /* contextual zero; ignore field defaults */
configured: User = {} /* apply declared defaults, then zero-fill other fields */
```

The selected surface direction reserved: User = ?; requests storage without either initialization mode. It remains unavailable as an ordinary User until initialization completes; first-write operations, allocation policy, and complete state/cleanup rules remain open. The earlier reserve() spelling is not a selected synonym. See [reserved storage](lite://doc/reserved-storage).

For zeroed, name and address.city are empty Strings, age and address.postalCode are 0, and active is false. For configured, active is true and address.city is empty: the address field declares no default and therefore uses zero of Address. Both values are fully initialized when their declarations complete. Every field type must map zero storage to a valid value; zero initialization never falls back to declared defaults.

The empty contextual record initializer is selected: its established initializer position and expected record type give it record-construction meaning. Empty executable bodies still produce Unit. The full grammar must express these distinct roles without using trial type-checking to choose a parse.

Omitting the initializer of a simple typed binding selects all-zero storage and bypasses declared field defaults. A contextual literal 0 can request a zeroed record when there is no distinct viable interpretation; an explicit zero-value expression also remains under design. Every type has a valid all-zero value; this does not implicitly cast an arbitrary integer to a record. See [zero initialization](lite://doc/zero-initialization).

```text
user := User {}
```

Under the proposed default-resolution rule, this initializes every field:

- name is the empty String.
- age is 0.
- active is true, from the User declaration.
- address is a zero-initialized Address, with empty city and postalCode 0; address itself has no declared default.

Default construction uses each field's own declared default, or zero when the field has none. It is not an uninitialized allocation.

### Nested default versus zero

```text
Address := record { city: String = "Unknown"; }
User := record { address: Address; }
Guess := record { address: Address = {}; }

u: User = {};     /* u.address.city is empty: field default is zero */
g: Guess = {};    /* g.address.city is "Unknown": field default is Address defaults */
a: Address = 0;   /* a.city is empty: zero bypasses defaults */
z: Guess = 0;     /* z.address.city is empty: zero bypasses defaults */
```

These are specification cases, not claims of compiler support. A field default of `{}` explicitly constructs the field type using that type's defaults; omitting a field default gives that field the zero value of its type. Actual default-expression evaluation and complete grammar remain separate.

### Per-field resolution

1. Use the explicitly supplied field value, if present.
2. Otherwise use the field's declared default, if present.
3. Otherwise use the all-zero value of that field's type, including when it is a nested record. Do not implicitly apply the nested record's declared field defaults. A field explicitly declared with `= {}` requests its record type's defaults.

Explicit false, 0, or an empty String overrides a declared nonzero/nonempty default. Duplicate field initializers should be rejected rather than silently taking the last value. Unknown and inaccessible fields must not be accepted. These diagnostic policies are recommendations alongside the proposed default contract.

This resolution applies only to record-initializer construction, such as User {} or user: User = { ... }. A bare user: User; instead recursively zero-initializes all fields, bypassing declared defaults at every depth.

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

Nested initializer notation alone does not request a graph clone or a particular allocation/ABI. The selected record-value rule stores ordinary nested record fields inline in their containing value: a named User field is still copied with that value. Reference fields preserve their targets rather than cloning them. Exact physical representation must preserve these semantics; see [local shadowing and copies](lite://doc/local-shadowing-and-copies). Ownership, reference syntax, resource copy eligibility, and ABI details remain separate contracts.

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

The field's colon already starts a type position, so the recommended shorthand omits a redundant record keyword before its type braces. This declares an unnamed field type, then uses its known field contract for construction. It is an inline type declaration, not a shared default object. If the proposed inline type is admitted, omitted stats has no declared field default and therefore initializes to all-zero: points 0 and level 0:

```text
profile: Profile = {}
```

This is distinct from a bare-brace top-level type declaration: Profile := still starts an expression position, so this proposal retains its record keyword. Whether the longer nested stats: record { ... } spelling remains as an alias is a separate syntax choice; recommending the shorter form does not select two interchangeable spellings.

Independently declared unnamed record types have distinct identity, even with identical fields. How such a type can be named later or appear in public signatures remains open. The inline shorthand's full grammar is still a syntax proposal; its declaration identity is now selected.

The [inline identity rule](lite://doc/record-type-identity#selected-inline-rule-identity-per-declaration) selects distinct types per inline declaration, matching named records. Reuse one named Stats declaration when different outer records should share that field type.

## Established construction forms

```text
x: User = {}
y := User {}
```

Each complete record initializer closes its declaration item. Omit the optional trailing semicolon, both at top level and in nested declarations. Newlines are irrelevant: x: User = {} y := User {} is the same pair of declarations. An assignment or explicit exit ending in the same outer construction follows the same boundary rule. The grammar still permits an optional semicolon; see the [shared style and required exceptions](lite://doc/lexical-structure#semicolon-style-after-closing-braces).

This applies to field declarations with record defaults as well:

```text
Registration := record {
    student: Student = {}
    contact: Contact = {}
}
```

These are field declarations, whose full default grammar is still being formalized. In a construction expression, supplied fields are comma-separated instead:

```text
registration := Registration {
    student = {},
    contact = {},
}
```

The inner braces do not remove the comma separating student from contact. Similarly, braces inside a call or grouping do not end the enclosing expression. To continue the value of a complete outer record construction, group it:

```text
name := (User { name = "Ali", }).name;
```

## Contextual record literals

Design draft **2026-11-26**. Compiler support for the call-argument and assignment forms is pending.

A contextual record literal omits the type name from ordinary
record construction. In expression position, bare `{ ... }` infers that name
from a single known, constructible expected type. A named literal such as
`User { ... }` supplies the type directly. Constructs with their own body
headers, such as `fn`, `if`, and `loop`, retain their brace bodies.

```text
user: User = { name = "Ali" };
saveUser({ name = "Ali" });
p = { x = 1 };
```

When `moveTo` expects `Point`, `moveTo({ x = 1 })` resolves to
`moveTo(Point { x = 1 })`. Both forms construct the same nominal type and
use the same field checks, defaults, and construction permissions.

The parameter supplies `User` and the assignment target supplies `Point`
for `p`. The assignment constructs a fresh `Point`, fills omitted fields
from the type's defaults, and replaces `p`.

**Nested construction is required in the first version.** For example:

```text
saveUser({
    name = "Ali",
    address = {
        city = "Berlin",
        country = { code = "DE" },
    },
});
```

The parameter supplies `User`, the `address` field supplies `Address`,
and `country` supplies `Country`. Each level validates fields and applies
defaults for its own type. If a literal has no unique constructible record
type, point to those braces and require an explicit type there. Until
anonymous record identity is settled, `p := { x = 1 }` requires a type.

Pending TS and C11 cases include typed initializers, call arguments,
replacement of a previously nondefault field, nested defaults, ambiguous
or missing expected types. See [standalone executable blocks](lite://doc/blocks-and-results#standalone-executable-blocks) for the companion `do` draft.

## 7. Standalone inferred record literal: requested direction, grammar pending

```text
point := { x = 1, y = 2, }
```

The user requests this inline form without an expected record type. Completing it requires anonymous-record inference and a grammar distinct from executable blocks; see [record literal boundaries](lite://doc/record-literal-boundaries). The optional-semicolon boundary is selected independently of that grammar. It must not guess a named type by searching for matching field names. In particular, empty point := {} cannot simultaneously mean a new empty record and the existing Unit-valued empty block.

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

A zero-initialized function is callable and returns zero of its declared result type without user-body work. Ordinary argument evaluation and required cleanup still apply. References, enums, unions, resource wrappers, and constrained domains still require concrete zero mappings; no particular first enum/union alternative is silently chosen here. See [universal zero initialization](lite://doc/zero-initialization).

Declared-default construction is separate: = {} uses field defaults, whereas omitted initialization and = 0 bypass them. Required-field syntax, cross-field validation, and default evaluation remain separate contracts; they must respect the universal zero rule rather than introduce types with no zero representation.

## 10. Evaluation, mutability, and implementation cost

- An earlier recommendation was to start with compile-time field defaults. The accepted example below allows a default to depend on an earlier field. An explicit factory remains a way to make effectful or recoverably fallible setup visible. Exact restrictions on default expressions remain open.
- The joint review accepts this case of an omitted field's default reading an earlier field of the same record:

  ```text
  Range := record {
      start: Int;
      end: Int = start + 10;
  }

  r: Range = { start = 5 };
  ```

  The default uses the supplied `start`, so `r.end` is `15`. An explicit `end` overrides that default. This design example allows the dependency on the earlier field. General dependency resolution, forward references, cycles, and the treatment of effectful defaults remain open.
- The joint review uses two phases. First, evaluate the supplied initializer expressions once, left to right in the order written at the construction site, and route their results by label. Then fill only omitted fields in record declaration order, evaluating each declared default or using zero if none is declared. A supplied field skips its declared default. For `r: Range = { end = 50, start = 5 }`, the supplied `end` precedes `start` in the first phase and neither uses a default. For an empty `Range` initializer, `start` takes zero first and `end` then uses it to produce `10`.
- Under the proposed record spread syntax, `updated: Range = { ...base, start = 20 };` evaluates the spread and override in written order. A field supplied by the spread also skips its default. If `base` has `start = 5` and `end = 15`, the result has `start = 20` and `end = 15`. In `fresh: Range = { start = 20 };`, the omitted `end` instead defaults to `30`. Thinking of this as combining base fields, defaults, and overrides is useful for precedence: defaults only fill gaps after all explicit and spread contributions have been routed. They never replace supplied fields or run before a later override is evaluated.
- Consider the declaration order `size: Int = end - start; end: Int = start + 10; start: Int;`. If only `start = 5` is supplied, declaration-order filling reaches `size` while `end` is still uninitialized. That read fails the initialization check. A future dependency-order rule might prove a valid sequence and initialize `end` before `size`, with a defined policy for observable effects and cycles. Such a rule would change which initializers are valid, so it is a separate language decision. Forward-reference eligibility, including when later fields are explicitly supplied, remains open.
- A proposed fallback would try declaration order first. Only if an omitted default would read an uninitialized field could the compiler attempt a dependency schedule, before evaluating any default. An acyclic schedule could make the example succeed. Whether the compiler should use that schedule automatically or suggest reordering the declarations in a diagnostic remains open. An automatic fallback would need deterministic ordering among ready fields and a rule for effectful defaults.
- For dependency analysis, use the user's module-visit analogy. A field whose dependencies have been resolved is reused without revisiting its default. Reaching an omitted field that is still being resolved identifies a cycle. For example, with `x` defaulting from `y` and `y` defaulting from `x`, omitting both leaves no first field to initialize and produces a compile-time diagnostic. Supplying `x` removes its default from this construction and breaks that cycle. Two defaults sharing an already resolved dependency can both use it. This rule describes analysis of the defaults required for a particular construction. Whether dependency scheduling is automatic remains open.
- Each construction establishes its own logical default values. Do not introduce accidental shared writable collections through a declaration default. Ownership/copy rules must establish whether any noncopyable default can be reused.
- `mut user := User {}` grants writable held-data access; `var user := User {}` permits replacing the binding; `var mut` permits both. Default initialization does not change those permissions.
- No mandated preliminary zero-fill followed by overwrites is implied. A compiler may construct the final valid representation directly and remove redundant stores. This does not establish C-level performance before implementation and measurement.
- In var x: User; x = make_user();, zero initialization remains the source meaning, but its physical stores may be omitted if they have no observable effect. Reads, aliases, callbacks, exits before replacement, and any required cleanup must retain that meaning. See [semantic initialization versus physical writes](lite://doc/memory-and-performance#semantic-initialization-versus-physical-writes).

## References

Odin explicitly initializes variables to zero by default. Zig supports declaration-level field defaults and documents why per-field defaults can violate cross-field invariants. Rust's Default trait describes a valid type-provided default, with derived implementations using each field type's default. These are comparison points, not identical contracts to import wholesale:

- [Odin variable declarations](https://odin-lang.org/docs/overview/#variable-declarations).
- [Zig default field values](https://ziglang.org/documentation/0.15.1/#Default-Field-Values) and [faulty defaults](https://ziglang.org/documentation/0.15.1/#Faulty-Default-Field-Values).
- [Rust Default](https://doc.rust-lang.org/core/default/trait.Default.html).

Related: [records](lite://doc/records), [construction and pattern examples](lite://doc/pattern-examples), [mutability](lite://doc/mutability), [types and inference](lite://doc/types-and-inference), and [memory/performance](lite://doc/memory-and-performance).
