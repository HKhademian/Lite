# Aliases and distinct type declarations

The selected design uses `alias` to give a type or an existing symbol another
name. The `distinct` declaration creates a fresh type identity from a type
expression. Record and enum declarations create their own nominal types.

**Compiler status.** Transparent type aliases (`Name := alias TypeExpression`, including generic `Name := alias<...> TypeExpression`), distinct nominal types (`Name := distinct TypeExpression`, including generic `Name := distinct<...> TypeExpression` with explicit `cast<T>(expr)` and context-inferred `cast(expr)`), lexically scoped symbol/module/function aliases (`xalias := alias x1`, `points := alias pointLib`, `f := alias g`, including `pub` re-exports), and specialized or partially specialized generic function aliases (`ivec2 := alias vecN<Int, 2>`, `splat2 := alias<T: Type<Numeric>> splat<T, 2>`) are implemented across both TS and C11 backends; legacy `:= type` declarations have been migrated to `:= alias`.

## Name a structural type or an existing type

```text
Point0 := alias (x: Int, y: Int);
Point1 := alias [Int; 5];
Point5 := alias Point1;

x1: Point1;
x5: Point5 = x1;
```

`Point0` names the structural named-tuple type. `Point1`, `Point5`, and
`[Int; 5]` all denote the same structural array type. `x5` is a separate
variable initialized from the value of `x1` under ordinary value-transfer rules.

A type alias accepts a complete type expression, including a tuple, array,
union, fallible type, generic application, or function signature. Each form
retains its existing type grammar and precedence. For example,
`Value := alias | String | Int` and `Value := alias String | Int` name the same
union. Type aliases can be declared at file scope and inside blocks. A type
annotation can refer to a later type alias under the applicable forward
type-lookup rules.

## Give an existing symbol another name

```text
xalias := alias x1;

pointLib := import "./points";
points := alias pointLib;
```

`xalias` and `x1` name the same variable and share its storage. A read through
either name observes the same value. A write through either name is visible
through the other when the corresponding reassignment or held-data mutation
permission allows it. Declaring an alias creates no storage and grants no
additional access.

A reference to a function can likewise acquire a second name while preserving
the callable it denotes. `import` introduces the local module name `pointLib`
directly. `points` resolves to that same module with its existing visibility
rules.

Resolve alias operands in the ordinary lexical namespace. A name can denote a
type, variable, function, or module. In particular, a local value binding that
shadows a type name still resolves to a value, so using it as a type annotation
is a type error. Capitalization plays no role. Resolution must respect scope,
visibility, and initialization. Chaining aliases preserves the original target
and cycles are errors.

The initial symbol-alias contract covers existing names and type expressions.
Computed expressions such as `alias (a + b)` have no alias meaning in this
contract. Aliases of fields or indexed places remain open, including when a
receiver or index would be evaluated and how long the resulting place remains
valid.

### Transparent `alias` propagation for static type operations

While declaring *new* operations on an `alias` remains disallowed ([type-attached operations](lite://doc/type-operations)), any static or instance operation owned by the underlying nominal type is automatically available through transparent concrete or generic aliases with pre-bound compile-time arguments:

```text
pub Vec  := record<T: Type<math.Numeric>, N: Int> { data: [T; N]; }
pub Vec2 := alias<T: Type<math.Numeric>> Vec<T, 2>;
pub IVec2 := alias Vec<Int, 2>;

pub Vec.zeroed := fn<T: Type<math.Numeric>, N: Int>(): Self<T, N> { res: Self<T, N>; res };
pub Vec.splat  := fn<T: Type<math.Numeric>, N: Int>(val: T): Self<T, N> { ... };

z := IVec2.zeroed();      // pre-binds T = Int, N = 2
s := Vec2.splat(3.5);     // pre-binds N = 2, infers T = Float
```

### Specializing standalone generic functions with `alias`

Implemented in Phase 17 on both TS and C11 backends:

```text
pub IVec2 := alias Vec<Int, 2>;
pub ivec2 := alias vecN<Int, 2>;
pub zeroIVec2 := alias zeroVec<Int, 2>;
pub splat2 := alias<T: Type<math.Numeric>> splat<T, 2>;
```

- **Uniform symmetry:** Uses the exact same `alias` and `alias<...>` syntax
  already implemented for generic type aliases (`alias Vec<Int, 2>`,
  `alias<T> Vec<T, 2>`).
- **Zero wrapper overhead:** Resolves directly to the specialized target
  callable at compile time across both TS and C11, emitting no runtime
  forwarding function.
- **Signature preservation:** Specializing compile-time parameters preserves the
  target function's runtime parameter list. For example, `vecN<Int, 2>` keeps
  `(data: [Int; 2]): Vec<Int, 2>` rather than turning into a positional scalar
  helper `(x: Int, y: Int): IVec2`; targets such as `zeroVec<Int, 2>` and
  `splat<T, 2>` match 1-to-1.

## Declare a fresh type

```text
Point2 := record { x: Int, y: Int }
Point3 := enum { x, y }
Point4 := distinct Point1;
```

Each declaration introduces its own type identity. Because `Point1` resolves
to `[Int; 5]`, writing `Point4 := distinct [Int; 5];` in place of the last
line has the same meaning. Each separate `distinct` declaration creates its
own identity even when several declarations use the same underlying type.
An alias of `Point4` preserves `Point4`'s identity.

A distinct type shares its underlying representation subject to the target's
layout and ABI contract. An established `[Int; 5]` value cannot be assigned
implicitly to `Point4`, and an established `Point4` value cannot be assigned
implicitly to `[Int; 5]`. Existing rules for contextual fresh literals are a
separate contract. The earlier design review also specifies default same-type
equality and compatible hash reuse where the backing type supports them.
Backing representation alone does not grant mixed-type equality or arithmetic.
Array indexing and destructuring on distinct types, aggregate literal admission,
explicit conversion syntax, custom operations, and precise target ABI details
remain open. See [the core type review](lite://repo/research/investigations/language-review/01-core-types.md#12-identity-and-distinct-types).

## Example outcomes

- `x5: Point5 = x1` is accepted with ordinary array value transfer.
- With `x1` declared as `mut x1: Point1;`, writing `xalias[0] = 9` is
  observable as `x1[0] == 9`. The same write is rejected without writable
  access to `x1`.
- `Other := distinct [Int; 5]` declares a different type from `Point4`.
  Passing an established `Other` value to a parameter of type `Point4` is
  rejected without an explicit conversion.
- A module member accessible through `pointLib` is accessible through
  `points` under the same visibility rules. Private members stay private.

See [record type identity](lite://doc/record-type-identity),
[enums and variants](lite://doc/enums-and-variants),
[type-attached operations](lite://doc/type-operations),
[mutability](lite://doc/mutability), and [grammar sketch](lite://doc/grammar-sketch).
