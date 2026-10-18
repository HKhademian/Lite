# Type categories across the reference languages

Status: **primary-documentation review dated 2026-10-18; comparison, not selected LiteScript semantics**.

## Scope and reading rule

This review covers Rust, Zig, Odin, V, Swift, Kotlin, Dart, C++, TypeScript, Python, Lua, and Scala 3, which has also been used as a match-syntax reference. Sources include development documentation, especially Zig/V and evolving Scala pages; a documented feature is not a promise about every installed compiler release. No examples were compiled.

Read each language along three independent axes: choice/enum model, product or data-record model, and distinct-wrapper/value semantics. See the [category vocabulary](type-categories.md) before equating different uses of the word value.

## Rust

- **Choices:** one nominal enum supports unit, tuple-like, and struct-like variants. Variants are selected by tag and payload patterns, not arbitrary subclass tests. A variant's constructor name is not usable as a standalone type annotation. [Enumerations](https://doc.rust-lang.org/reference/items/enumerations.html).
- **Products:** named-field, tuple, and unit structs provide product/domain types. A one-field tuple struct is a common newtype shape; a type alias instead names the existing type. [Structs](https://doc.rust-lang.org/reference/items/structs.html), [type aliases](https://doc.rust-lang.org/reference/items/type-aliases.html).
- **Semantics:** owned structs/enums do not become implicitly Copy just because they are data; Copy is a separate trait. Representation attributes and layout guarantees are separate from syntax. [Copy](https://doc.rust-lang.org/reference/special-types-and-traits.html#copy), [layout](https://doc.rust-lang.org/reference/type-layout.html#representations).

## Zig

- **Choices:** enum supplies named tag values; a union with an enum tag carries alternative payloads, often written `union(enum)`. Bare unions are a different, untagged facility. Tag names are not a family of class subtypes.
- **Products/wrappers:** struct supplies fields and namespaced methods; wrapping a field in a fresh struct can create domain identity. There is no need to introduce class inheritance for that purpose.
- **Representation:** integer tag types, packed/extern forms, and tagged-union representation are explicit design tools. An alias of an existing type is distinct from defining a fresh aggregate. [Zig language reference](https://ziglang.org/documentation/master/#enum), [tagged unions](https://ziglang.org/documentation/master/#Tagged-union), [structs](https://ziglang.org/documentation/master/#struct).

## Odin

- **Choices:** enum is a distinct integer-backed type. A union is a discriminated choice of listed types, so its alternatives may already be distinct struct types. Union type switches test the active alternative type.
- **Products/wrappers:** struct is the product form. `distinct T` creates a new type with the underlying semantics; a plain alias does not.
- **Important difference:** ordinary unions have a nil zero state; `#no_nil` changes that contract. LiteScript must not import that default when borrowing the sum-type idea. [Odin enums](https://odin-lang.org/docs/overview/#enumerations), [unions](https://odin-lang.org/docs/overview/#unions), [distinct types](https://odin-lang.org/docs/overview/#distinct-types).

## V

- **Choices:** enum supplies named integer constants. Sum types separately support listed alternatives such as `A | B`. Current documentation also describes named payload variants, including two differently named variants carrying the same payload type; describing V as supporting only unions of existing types would miss that form.
- **Products/wrappers:** structs supply field aggregates. Documentation calls `type Name = ExistingType` a type alias and a special sum-type case; do not equate that wording with another language's alias identity rules without checking its contract. [V type declarations](https://docs.vlang.io/type-declarations.html#sum-types).
- **Semantics:** struct values and explicit references are distinct forms; a data aggregate is not automatically a class hierarchy. [V structs](https://docs.vlang.io/structs.html).

## Swift

- **Choices:** a single enum concept supports payload-free cases, raw-valued enums, and associated-value cases. Raw values are fixed case mappings; associated values vary per constructed value. Cases construct enum values, not independent case-class subtypes. Methods and protocol conformance do not turn them into classes. [Enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md).
- **Products/semantics:** structs, enums, and tuples are value types; classes are reference types. A wrapper struct can give a domain value a nominal identity. Composition and the semantics of nested reference-valued members still matter. [Value and reference types](https://www.swift.org/documentation/articles/value-and-reference-types.html).

## Kotlin

- **Choices:** enum entries are fixed singleton-like values of their enum class, possibly with properties and custom behavior. An entry is not itself usable as a type annotation. Different per-instance payload alternatives normally use a sealed class/interface family with separately declared types instead. [Enums](https://kotlinlang.org/docs/enum-classes.html), [sealed families](https://kotlinlang.org/docs/sealed-classes.html).
- **Data records:** data class generates equality, hashing, printing, component functions, and copy from primary-constructor properties. Properties may be val or var; copy is shallow. Data class is not a synonym for immutable flattened value. [Data classes](https://kotlinlang.org/docs/data-classes.html).
- **Wrappers:** an inline value class wraps one primary-constructor property with distinct type identity; representation may be boxed in generic/interface and other contexts. [Value classes](https://kotlinlang.org/docs/inline-classes.html).

## Dart

- **Choices:** enums are a special class with fixed constant instances. Enhanced enums add final fields, methods, and constant construction, rather than arbitrary fresh payload-bearing cases. Sealed classes support controlled subtype alternatives. [Enums](https://dart.dev/language/enums), [sealed classes](https://dart.dev/language/class-modifiers#sealed).
- **Products:** records are anonymous, structurally typed, immutable aggregates with field-based equality. Naming a record shape with a typedef does not make a new nominal record type. Referenced field objects are not thereby deeply frozen. [Records](https://dart.dev/language/records).
- **Wrappers:** extension types provide a static interface over an existing representation and are erased; they are not a runtime wrapper class with preserved new runtime identity. [Extension types](https://dart.dev/language/extension-types).

## C++

- **Choices:** enum and enum class define distinct enumeration types with integral underlying representation; enum class is scoped, not a class inheritance family. Fixed-underlying enums can have unnamed values, so named enumerators alone do not guarantee a closed valid-value set. [Enumeration rules](https://eel.is/c++draft/dcl.enum).
- **Payload choices:** `std::variant<A, B>` holds an alternative as a contained object; A and B are independently usable types. It also has a specified possible valueless state. This is separate from enum and from virtual inheritance. [Variant](https://eel.is/c++draft/variant.variant).
- **Products/wrappers:** struct and class are class types with different default access; either can model records, wrappers, or identity-bearing objects according to their members and operations. Neither spelling alone determines deep copying or heap storage. [Class rules](https://eel.is/c++draft/class.pre).

## TypeScript

- **Choices:** ordinary numeric/string enums introduce named values and generally emit a runtime object. Const enums are normally erased with member references inlined; preserveConstEnums can retain emission. This is an emission choice, not a payload/subclass model. Enum members can also participate in enum-member types. [Enums](https://www.typescriptlang.org/docs/handbook/enums.html).
- **Payload choices:** discriminated unions combine object shapes with a common literal-valued discriminant. Type narrowing is based on that property; it does not require the objects to inherit an empty common class/interface. [Discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions).
- **Products/wrappers:** object/interface compatibility is structural; a plain alias does not promise a fresh nominal identity. Classes or explicit domain-wrapper/branding designs address other identity needs. [Type compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html).

## Python

- **Choices:** Enum creates named member objects, each with a name and associated value. IntEnum and StrEnum also behave as the corresponding primitive subclasses; Flag/IntFlag support combinations. Members are not independently declared payload classes for arbitrary fresh event data. [Enum](https://docs.python.org/3/library/enum.html).
- **Data records:** dataclass generates class operations such as initialization, equality, representation, and pattern metadata according to options. frozen emulates read-only fields; it is not a guarantee of deeply immutable referenced data. [Dataclasses](https://docs.python.org/3/library/dataclasses.html).
- **Wrappers:** NewType gives type-checker-visible distinction while returning the same argument at runtime. It is not a newly allocated wrapper instance or a new runtime class of that value. [NewType](https://docs.python.org/3/library/typing.html#newtype).

## Lua

- **Choices/products:** the language has no user type declarations or built-in enum, data-class, or sealed-family declaration. Tables, tagged tables, constants, metatables, and userdata can implement conventions or library abstractions.
- **Semantics:** values carry dynamic types; table/function/userdata assignments manipulate references rather than copy their objects. Calling a table-based convention a class does not add static exhaustiveness or a nominal enum type. [Lua values and types](https://www.lua.org/manual/5.4/manual.html#2.1).

## Scala 3

- **Choices:** enum defines a sealed class family. Parameterized cases are shorthand for case classes extending the enum, so this closely matches the user's class-family model. Payload-free cases are enum values; do not assume every case must be a separately declared class. [Enums](https://docs.scala-lang.org/scala3/reference/enums/enums.html), [enum ADTs](https://docs.scala-lang.org/scala3/reference/enums/adts.html).
- **Data records:** case classes generate construction/extraction, equality/hash, printing, and copy operations. That convenience is distinct from selecting a low-level value representation. [Domain modeling](https://docs.scala-lang.org/scala3/book/domain-modeling-tools.html).
- **Wrappers:** AnyVal value classes have context-dependent allocation; opaque types offer a separate abstraction over a representation. Do not generalize either into a universal no-boxing guarantee for all contexts. [Value classes](https://docs.scala-lang.org/overviews/core/value-classes.html), [opaque types](https://docs.scala-lang.org/scala3/book/types-opaque-types.html).

## Synthesis for LiteScript

The reference languages do not establish a universal meaning for enum or value class. Useful independent concepts are products, named sums, explicit unions of existing types, domain wrappers, generated data operations, and identity/reference capabilities. Plain enum values, singleton objects, and per-instance payload cases are different ways of constructing values.

The simplest candidate for LiteScript is to keep those distinctions explicit while sharing matching and uniform binding syntax. See [enums and variants](enums-and-variants.md). No recommendation here selects inheritance, generated equality, a GC, boxing, or an ABI by default.

The [focused union-entry comparison](union-membership-comparison.md) follows up on the now-selected rule that existing member values enter a plain union automatically and require checked narrowing to recover a particular member. It compares that specific behavior across these reference languages, including nil/default and case-wrapper differences.
