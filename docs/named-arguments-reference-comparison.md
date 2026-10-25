# Named arguments and tuples across the reference languages

Status: **primary documentation checked 2026-10-21; design comparison, not compiler execution**.

## Scope

Cover the twelve languages used by the existing [type-category review](type-categories-comparison.md): Rust, Zig, Odin, V, Swift, Kotlin, Dart, C++, TypeScript, Python, Lua, and Scala 3. Include C# as a supplemental named-tuple comparison. Current development documentation describes its own version; no examples here were compiled.

The user's selected LiteScript call surface is:

```text
op(1, 2, 3);
op(a = 1, b = 2, c = 3);
op(1, 2, c = 3);
```

All three supply the same three inputs. LiteScript now additionally selects positional/named interleaving, next-unfilled positional routing, named replacement subject to explicit-label uniqueness, =name shorthand, explicit tuple call spread, static invalid-input checks, fresh named initializer reordering, ordered stored tuples with explicit reconstruction, and positional/named destructuring. Its type components use name: Type, bare inferred labels, or :Type. Different stored tuple labels permit explicit typed-declaration conversion when positions/types/access agree, while ordinary transfers check labels; identical ordered labels and component types define the same structural tuple type. Other shape/type conversions and callable compatibility beyond destination input-label adaptation, superseded-value cleanup, collection call spread, and unknown-input type inference remain open. The LiteScript extension was selected 2026-10-23; reference-language research below retains its 2026-10-21 scope. Reference-language examples below retain their native syntax; see the [current LiteScript rules](named-input-routing.md).

## Odin

Native calls support op(1, 2, 3), op(a=1, b=2, c=3), and op(1, 2, c=3). Named inputs may be reordered; positional inputs precede named ones. This closely matches the requested call surface. Odin separately has multiple results and named result variables; those are not a general named-tuple value contract. Struct fields provide ordinary named product data. Sources: [named arguments](https://odin-lang.org/docs/overview/#named-arguments), [multiple results](https://odin-lang.org/docs/overview/#multiple-results), [named results](https://odin-lang.org/docs/overview/#named-results).

## Zig

Ordinary calls are positional. A function can instead receive a named struct value, for example op(.{ .a = 1, .b = 2, .c = 3 }); that is one argument. Anonymous tuples use .{1, 2, 3}, with numbered fields. Named anonymous structs and positional tuples are distinct forms. Zig also explicitly supports tuple-to-call application through @call; this is separate from ordinary named arguments. Sources: [functions](https://ziglang.org/documentation/master/#Functions), [anonymous struct literals](https://ziglang.org/documentation/master/#Anonymous-Struct-Literals), [tuples](https://ziglang.org/documentation/master/#Tuples), [@call](https://ziglang.org/documentation/master/#call).

## V

The docs explicitly state that native named/default function arguments are absent. A trailing struct-literal argument can look like op(a: 1, b: 2, c: 3), but the names initialize fields of the final struct parameter. It does not relabel three ordinary scalar parameters. Documented multiple return values use positional return/deconstruction; named data uses structs. Sources: [trailing struct literal arguments](https://docs.vlang.io/structs.html#trailing-struct-literal-arguments), [multiple return values](https://docs.vlang.io/functions.html#returning-multiple-values).

## Rust

Ordinary calls supply argument expressions by position. Named fields are supported in a struct value, such as op(Inputs { a: 1, b: 2, c: 3 }), which is one argument. Tuples are structural positional types, accessed by numbered fields such as pair.0. A tuple struct adds a nominal type name but its components remain positional. Parameter bindings do not create native call-site labels. Sources: [call grammar](https://doc.rust-lang.org/reference/expressions/call-expr.html), [struct expressions](https://doc.rust-lang.org/reference/expressions/struct-expr.html), [tuple types](https://doc.rust-lang.org/reference/types/tuple.html).

## C++

Ordinary calls map arguments to parameters by position. Writing a=1 as an argument can be an assignment expression; it does not select the parameter named a. Aggregate designated initialization can supply one object: op(Inputs{ .a = 1, .b = 2, .c = 3 }). Designators follow member declaration order; see the [list-initialization ordering rule](https://eel.is/c++draft/dcl.init.list). std::tuple offers positional element access rather than user-chosen field names; use an aggregate for domain field names. Sources: [calls](https://eel.is/c++draft/expr.call), [aggregate initialization](https://eel.is/c++draft/dcl.init.aggr), [tuple access](https://eel.is/c++draft/tuple.elem).

## Kotlin

Native functions allow all three requested forms with equals labels. Named arguments can be reordered. Defaults permit omission; after skipping an input, subsequent arguments must be named. Function-type parameter names can document inputs, which must not be confused with a general guarantee of named invocation through arbitrary stored function values. For product data Kotlin provides Pair/Triple and recommends named data classes for meaningful property names. Sources: [named arguments](https://kotlinlang.org/docs/functions.html#named-arguments), [function types](https://kotlinlang.org/docs/lambdas.html#function-types), [standard data classes](https://kotlinlang.org/docs/data-classes.html#standard-data-classes).

## Swift

Argument labels use colon, as in op(a: 1, b: 2, c: 3). A declaration can separate a public label from its local parameter name, or suppress a label with _. Declared labels are required and supplied arguments retain parameter order; a single fixed signature does not freely alternate between all three LiteScript forms. Labels are not part of the stored function type. Sources: [functions and labels](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Functions.md), [function types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Types.md#function-type).

Swift supports named tuples, for example (width: 640, height: 480), and named tuple types (width: Int, height: Int). Names participate in the type: explicitly differently labeled tuples are not directly interchangeable. Unlabeled values can acquire expected labels. This is more specific than treating all labels as documentation. Source: [tuple types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Types.md#tuple-type).

## Dart

Named call inputs use colon and must be declared as named parameters. Required positional parameters and required named parameters are different contracts. Thus one unchanged declaration does not offer arbitrary positional-or-named choice for each input. Named input names are retained in function types. Sources: [named parameters](https://dart.dev/language/functions#named-parameters), [function types](https://dart.dev/language/functions#function-types).

Dart records provide positional and named fields. Example: (width: 640, height: 480), with type ({int width, int height}). Named field names affect structural identity, while their written order does not. Positional fields can have documentation labels that do not affect identity. These records are structural products, unlike LiteScript's selected nominal record declarations. Source: [records](https://dart.dev/language/records).

## Scala 3

Native calls use equals and support all three requested forms. Named arguments can be reordered; its mixing rules are more permissive than a blanket ban on positional arguments after named ones. Source: [named arguments](https://docs.scala-lang.org/tour/named-arguments.html).

Since Scala 3.7, named tuples use (width = 640, height = 480), with type (width: Int, height: Int), and field selection such as size.width. Names and their order matter for compatibility. Mixing named and unnamed components and duplicate names is rejected. Expected named tuple types can accept ordinary positional tuples; conversion back can forget names. Names are erased at runtime and the representation is the ordinary tuple representation. Its value spelling matches LiteScript named construction. LiteScript now has its own selected component syntax, contextual reordering, and stored-order boundary; Scala conversions do not establish LiteScript conversion rules. Source: [named tuples](https://docs.scala-lang.org/scala3/reference/other-new-features/named-tuples.html).

## TypeScript / JavaScript call convention

Calls use positional arguments. An object argument supports named data, such as op({ a: 1, b: 2, c: 3 }); parameter destructuring binds its fields. This is one object argument rather than three native keyword arguments. Writing a=1 in an ordinary argument position is assignment, not parameter selection. Source: [parameter destructuring](https://www.typescriptlang.org/docs/handbook/2/functions.html#parameter-destructuring).

TypeScript supports labeled tuple types such as [width: number, height: number]. These names document positions and improve tooling. They do not create size.width access; the runtime value remains an array with positional entries. This differs from C#'s named member access, even though both have labels that do not protect field-name identity. Source: [labeled tuple elements](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements).

## Python

Ordinary positional-or-keyword parameters support all three requested forms using equals. Keyword inputs may be reordered; ordinary positional inputs precede keywords, and supplying one input twice is an error. Python also explicitly distinguishes positional-only and keyword-only parameters and supports mapping expansion with **. These extra mechanisms are not selected for LiteScript. Source: [keyword arguments and parameter categories](https://docs.python.org/3/tutorial/controlflow.html#keyword-arguments).

collections.namedtuple creates a tuple subclass with named attribute access and positional indexing/unpacking. A type is created first, then values can be constructed with positional or keyword arguments. It is not an anonymous named tuple literal. typing.NamedTuple provides typed declaration syntax. Runtime tuple behavior must not be confused with a static type-compatibility policy. Source: [namedtuple](https://docs.python.org/3/library/collections.html#collections.namedtuple).

## Lua

Native calls use positional expression lists. A table constructor can be the single argument without call parentheses: op { a = 1, b = 2, c = 3 }. Those names are table keys. Lua's multiple return values are also distinct from a first-class typed named tuple. Tables provide named data, with runtime semantics substantially different from the proposed static tuple contract. Sources: [calls](https://www.lua.org/manual/5.4/manual.html#3.4.10), [table constructors](https://www.lua.org/manual/5.4/manual.html#3.4.9), [multiple results](https://www.lua.org/manual/5.4/manual.html#3.4.12).

## C# — supplemental comparison

Native named arguments use colon, for example Op(a: 1, b: 2, c: 3). Positional calls and positional prefixes followed by named inputs are supported. Supplied expressions evaluate in written argument order. Source: [named and optional arguments](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/named-and-optional-arguments).

Named tuple values use (width: 640, height: 480), with dot access such as size.width. Assignments match by position and compatible types; field names are ignored for tuple assignment and equality. A destination can expose different names for the same positions. This is an access-label precedent, rather than name-sensitive compatibility. Source: [tuple field names](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples#tuple-field-names).

## Focused comparison: width/height assigned to x/y

This answers the user's follow-up about named-tuple compatibility directly. The snippets use each reference language's own syntax. They are documentation-based examples, not executed compiler checks.

### C#: accepted, destination names replace access labels

```csharp
(int width, int height) size = (640, 480);
(int x, int y) point = size;
```

Assignment matches positions and compatible component types, ignoring field names. point.x denotes the first value, 640. Source: [tuple assignment](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/builtin-types/value-tuples#tuple-assignment-and-deconstruction).

### TypeScript: accepted, labels document positions

```typescript
const size: [width: number, height: number] = [640, 480];
const point: [x: number, y: number] = size;
```

The labels do not affect type checking or introduce dot-access properties. Read point[0], not point.x. Source: [labeled tuple elements](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements).

### Swift: differently labeled assignment rejected

```swift
let size = (width: 640, height: 480)
let point: (x: Int, y: Int) = size // rejected: names differ
```

Tuple names belong to the type. Explicitly reconstructing (x: size.width, y: size.height) expresses the renaming. An unlabeled literal (640, 480) can acquire labels from an expected named type; that does not permit direct assignment of incompatible explicit labels. Source: [tuple types](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/ReferenceManual/Types.md#tuple-type).

### Scala 3: differently named assignment rejected

```scala
val size = (width = 640, height = 480)
val point: (x: Int, y: Int) = size // rejected: names differ
```

Named tuples retain names and positions in their type contract. Ordinary tuples can fit an expected named type, and .toTuple can forget names. Those conversion rules are distinct from direct compatibility between differently named tuples. Source: [conformance and convertibility](https://docs.scala-lang.org/scala3/reference/other-new-features/named-tuples.html#conformance-and-convertibility).

### Dart: differently named fields rejected, reordered named fields compatible

```dart
var size = (width: 640, height: 480);
({int x, int y}) point = size; // rejected: names differ
({int height, int width}) reordered = size; // compatible named shape
```

Named fields are part of structural identity, while their written order is not. Dart also permits documentary names on positional fields; those are a separate case. Source: [record syntax and types](https://dart.dev/language/records).

### Python: a named tuple is a class instance

```python
from collections import namedtuple
Size = namedtuple("Size", "width height")
Point = namedtuple("Point", "x y")
size = Size(640, 480)
point = Point(*size)
```

Constructing Point gives the positions new field names. Plain point = size would retain the Size object and its width/height attributes; assignment does not rename fields. Runtime rebinding is not a static compatibility check. The typing specification separately defines typed NamedTuple classes and their tuple behavior. Sources: [namedtuple classes](https://docs.python.org/3/library/collections.html#collections.namedtuple), [NamedTuple typing](https://typing.python.org/en/latest/spec/namedtuples.html).

LiteScript has since selected its component forms, contextual named initializer reordering, and the stored-order boundary. The later 2026-10-25 decision supersedes the earlier width/height-to-x/y rejection: explicit typed receiving declarations may relabel stored positions without moving values, including named/unnamed conversion; ordinary assignments/arguments/returns still check labels. See [labels under an explicit destination type](tuple-label-conversions.md). Fresh positional literals still initialize a known named tuple contract.

## Consequences for the LiteScript review

The references support several independent choices:

- Odin, Kotlin, Scala, and Python provide direct precedents for the user's three equals-based call forms.
- Swift explicitly separates external labels from implementation-local parameter names. Its stored function types also show why function declarations and callable values need separate review.
- V, Zig, Rust, C++, TypeScript/JavaScript, and Lua show named data being passed as an object, struct, or table, which differs from relabeling several function inputs.
- Named tuples do not have one shared meaning: TypeScript labels document positions; C# also provides named member access; Swift and Scala give labels type-level meaning; Dart's named record fields participate in an unordered structural shape; Python constructs a named tuple class.
- Static label resolution and name-sensitive types do not inherently require runtime lookup by name. Scala explicitly erases named-tuple labels. This does not establish any LiteScript ABI, allocation, or performance result.

The current LiteScript reference selects interleaving, next-unfilled positional routing, repeated-name replacement, =name shorthand, explicit tuple call spread, unknown/ambiguous/missing/excess/type diagnostics, fixed destination tuple construction with complete coverage and no implicit component defaults, and positional/named destructuring. Stored tuple order remains fixed and changes require explicit reconstruction. Component annotations use name: Type, bare inferred labels, or :Type. Different stored tuple labels permit explicit typed-declaration conversion when positions/types/access agree, while ordinary transfers check labels; identical ordered labels and component types define the same structural tuple type. Remaining choices include other shape/type conversions, callable compatibility beyond destination label adaptation, full recursive grammar, superseded-value cleanup, and collection call spread. Every omitted function argument still requires an applicable explicitly declared default. See the [concrete routing reference](named-input-routing.md).

Related: [named arguments and tuples](named-arguments-and-tuples.md), [functions](functions.md), [records](records.md), and [tuples and patterns](tuples-and-patterns.md).
