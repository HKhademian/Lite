# Union entry and narrowing across reference languages

Status: **primary-source comparison dated 2026-10-18**. LiteScript's member-entry and checked-narrowing rule is selected. Reference facilities are not all the same kind of union, and this review does not import their runtime, casts, inheritance, or null policies. Zig examples use the 0.15.1 reference; other sources include current unversioned documentation. Examples are illustrative, not compiled checks.

## LiteScript baseline

```text
Person := type User | Guest;
person: Person = user;

if person: User {
    greet_user(person)
}
```

A listed member enters the union automatically, preserving its nominal identity. An arbitrary union value needs checked narrowing before use as a particular member. A plain union is distinct from an enum with named cases. No inherited root type, explicit case construction, nullable zero state, or panic-producing assertion is introduced by this rule.

## Closest source-level models

### Scala 3: direct type union

```scala
type Person = User | Guest
val person: Person = user

person match {
  case u: User => greetUser(u)
  case g: Guest => greetGuest(g)
}
```

Scala specifies that A is a subtype of A | B. Thus a member needs no case wrapper. Type patterns distinguish alternatives, and coverage of all union parts supports exhaustive matching. Explicit union annotations matter because inference can choose a common supertype instead. This is a close semantic comparison for admission; generic erasure and Scala's full subtype/inference rules remain different contracts. Sources: [union types](https://docs.scala-lang.org/scala3/reference/new-types/union-types.html) and [detailed union rules](https://docs.scala-lang.org/scala3/reference/new-types/union-types-spec.html).

### TypeScript: direct union plus flow narrowing

```typescript
type Person = User | Guest;
let person: Person = user;

if (person.kind === "user") {
    greetUser(person);
}
```

This assumes User and Guest expose suitable literal discriminants. TypeScript accepts admitted members and narrows through runtime guards. Its structural compatibility differs from LiteScript's nominal records. Declaring a union does not generate a runtime case wrapper. Type assertions such as as User are not checked at runtime; LiteScript has not selected such a bypass. Sources: [assignment narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#assignments), [discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions), and [assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions).

### Odin: discriminated union with direct member assignment

```odin
Person :: union #no_nil {User, Guest}
person: Person = user
```

Odin admits a member value directly. A type switch gives access to its active member; a two-result assertion reports success explicitly, while a single-result assertion can panic. This is close to LiteScript's entry ergonomics. However, ordinary Odin unions have nil as zero, and #no_nil makes the first member the default. LiteScript adopts neither default: its plain unions are order independent and do not gain an absent state. Source: [Odin unions and tags](https://odin-lang.org/docs/overview/#unions).

### V: sum types, member assignment, and smart casts

```v
type Person = User | Guest
mut person := Person(user)
person = guest

if mut person is User {
    greet_user(person)
}
```

V's documented examples establish the sum type with an explicit named construction, then assign member values directly to an already typed sum. is checks and match branches smart cast to a variant; mutable sources have additional rules. An as assertion can panic on a mismatch. The admission/narrowing style is close, but V's named sum/alias semantics do not establish LiteScript's transparent aliases or normalization laws. Source: [V sum types, casts, and matching](https://docs.vlang.io/type-declarations.html#sum-types).

## Explicit named case construction

### Rust: enum constructor selects the case

```rust
enum Person {
    User(User),
    Guest(Guest),
}

let person = Person::User(user);
if let Person::User(u) = person {
    greet_user(u);
}
```

The enum defines case constructors. The payload is placed in a chosen case, then matched through that case; its type alone is not the selected case name. This naturally permits several cases containing the same payload type. It is the relevant comparison for LiteScript enums, rather than its plain A | B admission rule. Source: [Rust enumerations](https://doc.rust-lang.org/reference/items/enumerations.html).

### Zig: tagged union field selects the case

```zig
const Person = union(enum) {
    user: User,
    guest: Guest,
};
const person: Person = .{ .user = user };
```

A named union field selects the payload case; switch captures the selected payload. This carries meaningful case identity even when two fields have identical payload types. It does not correspond to implicitly choosing a case solely from a raw payload's type. LiteScript keeps that responsibility in enum construction. Source: [Zig tagged unions](https://ziglang.org/documentation/0.15.1/#Tagged-union).

### Swift: associated-value enum case

```swift
enum Person {
    case user(User)
    case guest(Guest)
}
let person: Person = .user(user)
if case .user(let u) = person {
    greetUser(u)
}
```

The case is selected explicitly, and switch or if case extracts its associated values. An existing payload value does not itself specify which enum case to construct. Source: [Swift associated values and matching](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/).

## Common-root subtype models

### Kotlin: sealed hierarchy and smart casts

```kotlin
sealed interface Person
data class User(val name: String) : Person
data class Guest(val name: String) : Person

val person: Person = user
if (person is User) {
    greetUser(person)
}
```

The member enters through its declared Person relationship. is enables smart casts when stability permits, and sealed hierarchies support exhaustive when handling. Unlike LiteScript's union of existing types, the participants must belong to the common hierarchy. An open indirect subtype can still change what is known about the complete set of leaves. Sources: [sealed hierarchies](https://kotlinlang.org/docs/sealed-classes.html) and [smart casts](https://kotlinlang.org/docs/typecasts.html).

### Dart: sealed hierarchy and promotion

```dart
sealed class Person {}
class User extends Person {}
class Guest extends Person {}

Person person = user;
if (person is User) {
    greetUser(person);
}
```

This counterpart uses subtype admission and type promotion/object patterns. Sealing restricts direct subtypes to the same library, enabling exhaustive switching. It requires the hierarchy relationship; the example is not a general alias of independently declared User | Guest types. Dart's structural records are another facility and should not be equated with nominal subclasses. Sources: [sealed class modifiers](https://dart.dev/language/class-modifiers#sealed) and [patterns](https://dart.dev/language/pattern-types#object).

## C++: variant converting constructor

```cpp
using Person = std::variant<User, Guest>;
Person person = user;
if (auto* u = std::get_if<User>(&person)) {
    greet_user(*u);
}
```

The converting constructor chooses a viable alternative through specified overload rules; ambiguity can reject construction, and these rules are broader than exact identity membership. get_if returns a pointer or nullptr; get can throw on a wrong active alternative. Repeated alternative types are retained and type-based access requires one occurrence, unlike LiteScript's A | A normalization. This shows that automatic entry can coexist with native variant storage, without selecting the same conversion or failure APIs. Sources: [variant constructors](https://eel.is/c++draft/variant.ctor) and [value access](https://eel.is/c++draft/variant.get).

## Dynamic-language comparisons

### Python: annotated unions with optional static checking

```python
Person = User | Guest
person: Person = user
if isinstance(person, User):
    greet_user(person)
```

Annotations describe the accepted types for external checkers; Python itself does not enforce variable/function annotations. isinstance is a runtime class test. A union annotation does not add a case wrapper around the assigned object. Current typing documentation also preserves some lazy type-alias boundaries in runtime union-object equality; that differs from LiteScript's selected semantic alias resolution before normalization. Source: [Python typing, annotations, and unions](https://docs.python.org/3/library/typing.html).

### Lua: dynamic values, no declared static union

Native Lua variables can hold values of different types without an A | B declaration. type reports a dynamic kind; application tags or metatable conventions can distinguish domain objects. There is no native compile-time union admission, narrowing, or exhaustiveness contract comparable to LiteScript's rule. This describes Lua, not a separately typed dialect. Source: [Lua values and types](https://www.lua.org/manual/5.4/manual.html#2.1).

## Conclusions for LiteScript

1. **Keep the accepted entry rule.** Scala, TypeScript, Odin, V, and C++ demonstrate versions of automatic admission. LiteScript can retain the concise source form while requiring exact admitted type identity initially.
2. **Keep plain unions separate from enums.** Rust, Zig, and Swift show why a named case carries information beyond the payload's type. Two cases with User payloads must not collapse to User | User.
3. **Do not require an inherited root for plain unions.** Kotlin/Dart sealed families are useful comparisons for closed selection, but union composition should continue to accept existing declared member types without modifying them.
4. **Keep narrowing checked.** Type tests and exhaustive match already provide safe access. Panicking assertions, unchecked assertions, throwing extraction, and nullable-pointer access are distinct policies, not consequences of union support.
5. **Do not copy default-state policies.** No implicit nil member and no declaration-order default. Existing Option and contextual-zero contracts remain separate.
6. **Specify representation later.** A possible native implementation uses a discriminator plus payload storage. Automatic source admission can still write a tag or transfer data. This is a feasible design direction, not an implementation, a heap-allocation guarantee, or a C-performance benchmark.

[Exact-member union-to-union widening](union-widening.md) is now selected: every source alternative must be covered by the destination. Overlapping interface alternatives, common-member access, ABI, and mutation/ownership remain contracts to settle. These reference languages take different approaches; similarity of A | B syntax does not settle them.

Related: [selected union membership](union-membership.md), [normalization](union-normalization.md), [record identity](record-type-identity.md), [type categories across references](type-categories-comparison.md), and [memory/performance](memory-and-performance.md).
