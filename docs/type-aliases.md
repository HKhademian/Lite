# Type aliases: concise binding versus explicit type context

Status: **comparison dated 2026-10-18; both spellings evaluated, neither selected; explicit type prefix recommended across named aliases after considering composite types**. Record declaration identity is already selected separately. Tuple, generic, and function-type examples below are candidate grammar, not additional selected syntax.

## Two candidate spellings

### A. Bind a type directly

```text
Member := User;
Person := User | Guest;
LoadError := ReadError | ParseError;
Outcome := (User | Guest) ! LoadError;
AnyOutcome := User!;
NameAge := (String, Int);
Users := List<User>;
Formatter := fn(Int): String;
```

This follows the uniform binding idea most closely: the right-hand side can denote a type, just as another initializer can denote a function or ordinary value. It is shortest for simple names and unions. It requires a defined compile-time type-expression model and rules for operators on type-denoting operands; it does not inherently require runtime type objects or reflection.

### B. Explicitly introduce a type expression

```text
Member := type User;
Person := type User | Guest;
LoadError := type ReadError | ParseError;
Outcome := type (User | Guest) ! LoadError;
AnyOutcome := type User!;
NameAge := type (String, Int);
Users := type List<User>;
Formatter := type fn(Int): String;
```

The type keyword gives the complete right-hand side a type-expression context through the declaration boundary. It does not mean only the first union member, a cast, or a fresh nominal wrapper. All operands of the union/fallible composition are type operands. Ordinary semicolon and completed-item boundaries still apply; whitespace and newlines never set the keyword's scope.

Both blocks illustrate alternative language designs. They do not recommend accepting both as interchangeable spellings. List<User>, tuple type notation, and fn(Int): String still require their full type grammar regardless of the alias choice.

## What changes as types become more complex

- **Existing named type:** Member := User is concise and readily resolvable when User denotes a type. The explicit form advertises the declaration's role before the reader resolves User.
- **Union:** both are compact. The explicit form fixes | in type context. The short form can also be unambiguous through defined operand-kind rules; it is not inherently unparsable. Any value-level bitwise meaning of | would need a separate operator contract, not silent guessing.
- **Fallible type:** User! is the selected shorthand for User ! Error in type context, while outcome! extracts or propagates in value context. The explicit prefix establishes which grammar applies. The short form must resolve whether its operand denotes a type or an outcome value.
- **Tuple type:** (String, Int) needs a rule distinguishing a tuple type from a possible compile-time tuple containing type values. The explicit form permits type grammar to answer directly; the short form needs an explicit kind/composition policy. No type-value tuple feature is selected by this comparison.
- **Generic application:** List<User> needs a type-application grammar; < and > cannot depend on whitespace or capitalized naming conventions to separate them from comparison expressions. An explicit type context helps reuse annotation grammar. The short form remains feasible with proper type-expression rules.
- **Function type:** type fn(Int): String clearly asks for a callable type. Without the prefix, the grammar must distinguish that from a function literal requiring parameters and a body. Both designs still need rules for parameter names, mut capabilities, fallibility, and closures.

These are readability and grammar-design tradeoffs, not claims that one spelling can be implemented and the other cannot. A compiler need not add runtime work for either alias form.

## Transparent meaning under either design

Assuming the explicit candidate:

```text
Member := type User;
user: User = { name = "Ali", age = 10, };
member: Member = user;
```

User and Member denote the same type. No structural conversion, reconstruction, runtime allocation, or new data wrapper is introduced by the alias. Actual value transfer still follows the eventual ownership/copy/move rules.

The alias preserves the target's fields, construction defaults, valid-zero contract, and access permissions. It cannot grant visibility or mutation capabilities. A : Member test denotes the same type test as : User; alias names must not become separate union cases merely because their spellings differ. General union canonicalization remains its own contract.

Similarly:

```text
LoadError := type ReadError | ParseError;
ReadOutcome := type String ! LoadError;
```

The error alias preserves its existing alternatives rather than declaring a new error family. The outcome alias does not unwrap a Result. Successful returns remain implicit, failures explicit, and propagation must fit the declared error coverage. Naming a union does not make it a tagged enum with fresh .ReadError or .ParseError case constructors.

## Alias versus new declaration

```text
/* Proposed transparent alias: reuse User's identity. */
Member := type User;

/* Selected record declaration form: create a distinct type. */
Student := record {
    name: String;
    age: Int;
}
```

The type prefix must not quietly mean distinct. A separate nominal domain wrapper can already be expressed with a fresh record declaration; scalar newtype syntax remains open. Renaming a type must not implicitly grant inheritance or import all fields into another declared record.

An explicit prefix raises an additional boundary: should Name := type { ... } be allowed to define an inline record type, and would that replace Name := record { ... }? That is a separate declaration-grammar choice. Do not silently add a second interchangeable record declaration syntax during the alias decision. The existing record form and the proposed field-type shorthand after colon retain their current statuses.

## Recommendation

Prefer one spelling for all named aliases:

```text
Alias := type TypeExpression;
```

This retains uniform Name := ... definitions while making the initializer's role explicit, much as record, enum, and fn already do for their declarations. It is longer for a single existing name, but gives unions, fallible types, tuples, generic applications, and function types a consistent type context. Type annotations already have that context after colon, so they need no extra keyword:

```text
person: User | Guest = user;
outcome: User ! LoadError = load_user(id);
```

The recommendation changes after considering composite types; the earlier preference for the shortest simple alias is not a selected rule. Do not require type only for complex aliases while omitting it for simple aliases unless that split is deliberately chosen. Optional type prefixes would add synonyms and should be evaluated as a third policy rather than assumed.

Remaining contracts: exact alias production and type boundaries; use in local/module scopes; public visibility and API evolution; generic alias parameters; alias cycles and recursive nominal boundaries; namespace/shadowing rules; function and tuple type syntax; and whether types can participate in other compile-time expressions. Aliases alone do not select mutable or runtime first-class type values.

## Reference-language comparison

- Rust uses explicit type Name = ExistingType aliases, which introduce names for existing types. Its nominal enum facility should not be confused with general User | Guest union syntax. Source: [Rust aliases](https://doc.rust-lang.org/reference/items/type-aliases.html).
- Odin aliases a named type through its ordinary constant-definition form, as in My_Int :: int; distinct types are a separate operation. This supports the shorter-binding direction. Source: [Odin type aliases](https://odin-lang.org/docs/overview/#type-alias).
- TypeScript uses an explicit type declaration for simple aliases and unions, including type ID = number | string. Naming the union does not introduce a distinct version of the type. Source: [TypeScript aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases).
- Kotlin uses typealias for existing, generic, function, and nested types; aliases do not introduce new types. This supports explicit intent for composite aliases without determining LiteScript's punctuation or scope rules. Source: [Kotlin aliases](https://kotlinlang.org/docs/type-aliases.html).

Related: [record identity](record-type-identity.md), [fallible compositions](fallible-types-and-error-composition.md), [types and inference](types-and-inference.md), and [grammar sketch](grammar-sketch.md).
