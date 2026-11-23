# Type-attached operations

Status: **selected design direction, 2026-11-23; compiler implementation not started**. Uniform `TypeName.op := fn[<...>](...)` declarations, `self` versus `Self`, owned nominal types (including `distinct`), generic receiver support from the start, and current rejection of `alias`/foreign inherent attachments are selected. Explicit imported extensions remain a recorded future direction; call-site `mut` syntax on dot calls and zero-argument property boundaries remain open.

## Purpose

Provide `value.operation(...)` dot-call ergonomics for records, enums, `distinct` types, and generic built-in or user type families (such as `List<T>` and `Map<K, V>`) without introducing classes, inheritance, prototypes, or hidden runtime dispatch.

Every dot call lowers statically at compile time to an ordinary function call with identical runtime cost to `module.operation(value, ...)`.

## Declaration shape

Type-attached operations reuse LiteLang's uniform binding syntax (`:= fn`) and separate angle-bracket type parameters ([generic notation](lite://doc/generic-notation#separate-function-type-parameters)):

```text
[pub] TypeName.op := fn[<TypeParams>](receiver: [mut] Self[<...>], ...): ResultType {
    body
}
```

**Receiver type rule (selected for now):** the first parameter is the receiver and **may only have `Self` type** (`Self` or `mut Self`, parameterized as `Self<...>` for generic type families). Unrelated or non-`Self` receiver parameter types are rejected for now.

### Non-generic nominal types

```text
Vec2 := record {
    x: Float;
    y: Float;
}

pub Vec2.add := fn(a: Self, b: Self): Self {
    Vec2 { x = a.x + b.x, y = a.y + b.y }
}

pub Vec2.scaleBy := fn(v: mut Self, factor: Float): Unit {
    v.x *= factor;
    v.y *= factor;
}
```

### Generic type families and concrete specializations

All type parameters stay in `fn<...>`, with no angle brackets on the left-hand side of `:=`, and the receiver uses `Self<...>`:

```text
// Generic operation on a generic type family:
pub List.pushBack := fn<T>(items: mut Self<T>, value: T): Unit { ... }
pub Map.getOr := fn<K, V>(entries: Self<K, V>, key: K, fallback: V): V { ... }

// Receiver type parameter T plus operation-only type parameter U:
pub List.map := fn<T, U>(items: Self<T>, f: fn(T): U): Self<U> { ... }

// Operation restricted to one concrete instantiation:
pub List.sum := fn(items: Self<Int>): Int { ... }
pub List.join := fn(items: Self<String>, sep: String): String { ... }
```

Keeping `<...>` solely on `fn<...>` avoids ambiguity between fresh type variables (`T`) and concrete types (`Int`), keeps the right-hand side of `:=` a standalone function expression, and lets receiver-driven inference bind `T` from the receiver before checking callback arguments.

## `self` versus `Self`

LiteLang keeps two distinct roles so receiver typing and direct recursion never collide:

- **`self`** — value reference to the current function itself, preserving selected direct self-recursion `self(...)` ([functions](lite://doc/functions)).
- **`Self`** — type reference to the attached receiver type itself (required for the receiver parameter: `v: Self`, `v: mut Self`, or `items: Self<T>` / `items: mut Self<T>` / `items: Self<Int>`, and usable elsewhere in the signature and body such as `: Self` or `: Self<U>`).

Because the receiver binding is an ordinary named first parameter (`v`, `a`, `items`, `entries`), a recursive type-attached operation can reference both its receiver value and `self(...)` unambiguously. Requiring the receiver to be `Self` (or `mut Self`, parameterized as `Self<...>` for generic families) also ensures every attached operation visibly binds to its owning type rather than an unrelated first parameter.

## Unified call and value semantics

An attached operation is an ordinary function in `TypeName`'s namespace:

- **Dot call:** `p.add(q)` resolves statically to `Vec2.add(p, q)`.
- **Type-qualified call:** `Vec2.add(p, q)` calls the same symbol explicitly.
- **Unbound function value:** `Vec2.add` denotes an ordinary function value of type `fn(Vec2, Vec2): Vec2` with no hidden bound-method closure allocation.
- **No field shadowing:** declaring a type-attached operation with the same name as a field of that type is a compile-time error.
- **One symbol per `TypeName.op`:** each `TypeName.op` is a single unique binding in `TypeName`'s namespace; ad-hoc overloading by specialization on the same name is not selected. Polymorphism across multiple types belongs to future generic constraints and [interfaces](lite://doc/composition-and-interfaces).

## Ownership and visibility

### Owned nominal types only (selected for now)

Inherent type-attached operations may be declared **only in the module that owns the nominal type**:

- `record` declarations
- `enum` declarations
- `distinct` declarations (which introduce a fresh owned type identity; see [aliases and distinct types](lite://doc/type-aliases#declare-a-fresh-type))
- built-in nominal type families owned by their standard modules (`List<T>`, `Map<K, V>`, `Set<T>`, `String`, scalars)

Visibility follows LiteLang's file-block `pub` rule ([visibility](lite://doc/visibility)):

- `TypeName.helper` (without `pub`) is private to the defining module.
- `pub TypeName.op` travels with `TypeName`: any importer holding a value of type `TypeName` (directly or transitively) can invoke `value.op(...)` without separate operation imports and without cross-module conflict.

```text
// Owned distinct wrapper: operations travel with Scores to importers.
pub Scores := distinct List<Int>;
pub Scores.average := fn(s: Self): Float { ... }
```

### Aliased and foreign targets disallowed for now

In LiteLang, `alias` is a pure transparent **symbol/target alias** — it introduces no separate identity, storage, or namespace of its own ([aliases and distinct types](lite://doc/type-aliases)). Writing an aliased name behaves completely as if the user had written the targeted symbol or type expression directly (even where surface syntax would not allow writing the target inline).

Accordingly, attaching operations through an `alias` or to a foreign target is **disallowed for now**:

```text
myLib := import "./someLib";
pub myType := alias myLib.thatType;
pub Scores := alias List<Int>;

// Rejected for now: myType is a transparent alias for foreign symbol myLib.thatType.
pub myType.itsFn := fn(v: Self, arg1: Int): String { ... }

// Rejected for now: Scores is a transparent alias for List<Int>, not an owned type.
pub Scores.average := fn(s: Self): Float { ... }
```

Authors who need owned dot-operations on a wrapped type should either declare `distinct` (`pub myType := distinct myLib.thatType;`, `pub Scores := distinct List<Int>;`) or export an ordinary module function (`pub itsFn := fn(v: myType, ...)`).

## Future direction: explicit imported extensions (deferred)

Status: **recorded future direction, not yet selected or enabled**.

LiteLang intends to revisit **explicitly imported extension operations** on foreign and aliased types in a later design stage — inspired by the extendability of Kotlin and Swift, **without** implicit or ambient activation:

- An extension operation declared in module `B` for a type owned by module `A` would belong to **module `B`'s namespace**, never silently patching `A`'s type globally.
- A consumer `C` that does not import `B` would never see `B`'s extensions.
- In `C`, calling via module qualification (`ext.myType.itsFn(x, ...)`) would remain explicit; enabling dot-call syntax (`x.itsFn(...)`) would require an **explicit lexical opt-in** in `C` (to be designed alongside LiteLang's explicit member-introduction / `using` syntax in [modules and packages](lite://doc/modules-and-packages#distinct-script-and-module-files)).
- Extensions would remain statically resolved, could never override real fields or inherent operations of the owning type, and would report a compile-time ambiguity error if two opted-in extensions collide.

## Reference-language influences

Consulted selectively from the [project reference languages](lite://doc/references#project-reference-languages):

- **Zig and Rust:** zero-cost static method lowering, inherent operations traveling with the defining type, `Self` as receiver type, and coherence for separate compilation.
- **C3 and V:** external receiver functions outside data definitions with ordinary named first parameters (avoiding receiver-keyword collision with `self(...)`).
- **Kotlin, Swift, Scala 3, and Dart:** inspiration for future explicitly scoped extension operations and generic receiver specialization without adopting classes or implicit global patching.

## Open decisions

- **Call-site `mut` visibility on mutating dot calls:** whether `items.pushBack(42)` is checked solely against `mut items` and the parameter contract (like Rust/Swift/V/C3) or requires a visible call-site `mut` marker consistent with [caller mutation grants](lite://doc/caller-mutation-grants).
- **Zero-argument properties versus calls:** whether current compiler properties (`.length`, `.size`, `.isEmpty`) unify into explicit calls (`.length()`, `.size()`, `.isEmpty()`) or receive an explicit read-only property contract.
- **Receiverless type-associated helpers:** whether non-receiver functions such as constructors (`TypeName.from(...)`) may also live under `TypeName.*`, distinct from `Self`-receiver operations.
- **Explicit call-site type arguments:** syntax for supplying unbound method-only type parameters at dot calls (shared with [generic notation](lite://doc/generic-notation#pending-contract-cases)).
- **Explicit extension opt-in syntax:** exact `using`/import syntax, extension grouping, and interaction with future [interfaces](lite://doc/composition-and-interfaces).

## Compiler status

Not yet implemented in the self-hosted TS or C11 compiler. Today, member dot access supports `module.symbol`, tuple/record fields, enum `.value`, and compiler-handled `.length`, `.size`, and `.isEmpty` properties.

## Related concepts

- [Documentation index](lite://doc/overview)
- [Functions](lite://doc/functions)
- [Generic notation](lite://doc/generic-notation)
- [Records](lite://doc/records)
- [Aliases and distinct types](lite://doc/type-aliases)
- [Composition and interfaces](lite://doc/composition-and-interfaces)
- [Mutability](lite://doc/mutability) and [caller mutation grants](lite://doc/caller-mutation-grants)
- [Visibility](lite://doc/visibility) and [modules and packages](lite://doc/modules-and-packages)
- [Decision ledger](lite://doc/decisions-and-open-questions)
- [INV-030 investigation note](lite://repo/research/investigations/INV-030-method-declaration-syntax.md)
