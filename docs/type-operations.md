# Type-attached operations

Status: **selected design direction, 2026-11-23; compiler implementation not started**. Uniform `TypeName.op := fn[<...>](...)` declarations, `self` versus `Self`, strictly required explicit `Self`/`Self<...>` receivers, owned nominal types (including `distinct`), generic receiver support from the start, static `mut`-checked dot calls (`xs.pushBack(42)`), explicit calls for computed reads (`xs.length()`, `m.size()`, `s.isEmpty()`), and current rejection of `alias`/foreign inherent attachments are selected. Explicit imported extensions and `get`/`set` backing properties are recorded future directions.

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

**Receiver type rule (selected for now):** a receiver first parameter with the matching `Self` type is **strictly required** (`Self` or `mut Self`, parameterized as `Self<...>` for generic type families). Missing/receiverless signatures, omitted receiver types, bare `Self` on a generic type family, and unrelated/non-`Self` receiver parameter types are rejected for now. `Self` refers directly to the attached `TypeName`, obeying the same explicit parameterization and `name: mut Type` placement rules as ordinary type names ([mut qualifier placement](lite://doc/mut-qualifier-placement)).

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

// Nested generic receiver:
pub List.flatten := fn<T>(items: Self<Self<T>>): Self<T> { ... }

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

- **Dot call:** `p.add(q)` resolves statically to `Vec2.add(p, q)` only when `p`'s type satisfies the receiver's `Self` / `Self<...>` contract (for example, calling `names.sum()` on `List<String>` when `List.sum` requires `Self<Int>` is a compile-time error).
- **Mutating dot call (provisional selection, 2026-11-23):** when the receiver parameter is `mut Self` / `mut Self<...>`, the dot call is written directly as `xs.pushBack(42)` or `player.takeDamage(10)` with **no extra call-site `mut` marker** for now (Rust/Swift/V/C3 style). The compiler statically requires the receiver binding to hold writable `mut` access and preserves record value/copy-on-write semantics identically to local field updates (`snapshot := player; player.takeDamage(10);` leaves `snapshot` unchanged). *(Recorded tension & future revisit: unlike `player.hp -= 10`, `player.takeDamage(10)` hides mutation at the call site; forms such as `(mut player).takeDamage(10)` were rejected as unappealing, so unmarked mutating dot calls are admitted for now while explicitly reserving a future design pass for a cleaner explicit call-site mutation indicator. Ordinary and type-qualified calls such as `List.pushBack(mut xs, 42)` retain explicit caller `mut` grants per [caller mutation grants](lite://doc/caller-mutation-grants).)*
- **Type-qualified call:** `Vec2.add(p, q)` calls the same symbol explicitly.
- **Unbound function value:** `Vec2.add` denotes an ordinary function value of type `fn(Vec2, Vec2): Vec2` with no hidden bound-method closure allocation.
- **No field shadowing:** declaring a type-attached operation with the same name as a field of that type is a compile-time error.
- **Explicit calls for computed reads (selected 2026-11-23):** computed operations such as `.length()`, `.size()`, and `.isEmpty()` are ordinary `fn` type operations called with `(...)`, keeping a sharp visual boundary where `value.field` denotes stored data and `value.op(...)` invokes code. Existing compiler-hardcoded `.length`, `.size`, and `.isEmpty` properties will migrate to explicit calls under [the migration plan](lite://doc/compiler/type-operations-migration-plan); `get`/`set` backing properties are deferred for future design once field privacy and ownership rules exist.
- **No overloading yet (one symbol per `TypeName.op`):** LiteLang has no function or operation overloading yet. Each `TypeName.op` is a single unique binding in `TypeName`'s namespace — declaring two operations with the same name on the same type family (such as `List.sum` for `Self<Int>` and `List.sum` for `Self<Float>`) is rejected. Future overloading, generic constraints, and [interfaces](lite://doc/composition-and-interfaces) remain separate later design decisions.

## Provisional operator hooks (`$getIndex`, `$setIndex`)

Status: **provisional temporary bridge selected 2026-11-23; final operator/interface syntax deferred**.

Until LiteLang settles its long-term operator and [interface](lite://doc/composition-and-interfaces) syntax, owned nominal types may define bracket-indexing behavior using a closed, compiler-reserved `$`-prefixed hook pair on `TypeName.$...` — one unified pair for both positional indexing (`List<T>`, `Array`) and keyed lookup (`Map<K, V>`, user types), rather than splitting `[]` into separate `At` versus `Key` operators:

```text
// Hard builtins in lib/core/list.lts and lib/core/map.lts:
pub List.$getIndex := fn<T>(items: Self<T>, index: Int): T;
pub List.$setIndex := fn<T>(items: mut Self<T>, index: Int, value: T): Unit;

pub Map.$getIndex := fn<K, V>(entries: Self<K, V>, key: K): V;
pub Map.$setIndex := fn<K, V>(entries: mut Self<K, V>, key: K, value: V): Unit;

// Pure-Lite hook on a user nominal record:
pub Grid.$getIndex := fn(g: Self, pos: Int): Int { ... }
pub Grid.$setIndex := fn(g: mut Self, pos: Int, value: Int): Unit { ... }
```

Rules for provisional `$` hooks:

- **Bracket lowering:** `x[k]` lowers statically to `TypeName.$getIndex(x, k)`. `x[k] = v` lowers to `TypeName.$setIndex(x, k, v)` and statically requires writable `mut` access on `x` and `mut Self` / `mut Self<...>` on `$setIndex`. Compound updates (`x[k] += v`) evaluate `k` once before invoking `$getIndex` and `$setIndex`.
- **Read-only indexing:** a type that defines only `$getIndex` admits `x[k]` reads and rejects `x[k] = v` writes at compile time.
- **Closed compiler allowlist:** `$` is reserved strictly for compiler-recognized hook names (`$getIndex`, `$setIndex`, and any later explicitly approved hooks such as `$getSlice`). Arbitrary user-invented `$foo` declarations are compile-time errors.
- **Hook-only invocation:** `$getIndex` and `$setIndex` are invoked through bracket syntax (`x[k]`, `x[k] = v`), not exposed as ordinary `x.$getIndex(k)` dot calls.
- **Migration safety:** because `$` is unused in ordinary LiteLang identifiers, migrating to final operator/interface syntax later is mechanical and unambiguous. Positional `[T]` versus keyed `Indexable<K, V>` remains a semantic contract distinction ([indexed sequence contract](lite://doc/indexed-sequence-contract)).

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

- **Future explicit mutating-dot syntax:** while `player.takeDamage(10)` is allowed for now (checked against `mut player` and `mut Self`), revisit a concise, visually explicit call-site mutation indicator in the future so mutating dot calls remain as locally obvious as `player.hp -= 10`.
- **Deferred `get`/`set` backing properties:** whether LiteLang later introduces computed property getters/setters after field privacy, backing storage, compound assignment, and `var`-grant rules are established.
- **Receiverless type-associated helpers:** whether non-receiver functions such as constructors (`TypeName.from(...)`) may also live under `TypeName.*`, distinct from `Self`-receiver operations.
- **Explicit call-site type arguments:** syntax for supplying unbound method-only type parameters at dot calls (shared with [generic notation](lite://doc/generic-notation#pending-contract-cases)).
- **Deferred operator/interface syntax:** replacing the provisional `$getIndex`/`$setIndex` compiler hooks with LiteLang's final operator and [collection operation contract](lite://doc/collection-operation-contracts) syntax (including range slicing and iterators).
- **Explicit extension opt-in syntax:** exact `using`/import syntax, extension grouping, and interaction with future [interfaces](lite://doc/composition-and-interfaces).

## Compiler status

Not yet implemented in the self-hosted TS or C11 compiler. Today, member dot access supports `module.symbol`, tuple/record fields, enum `.value`, and compiler-handled `.length`, `.size`, and `.isEmpty` properties. See [the type-operations and builtin dot-access migration plan](lite://doc/compiler/type-operations-migration-plan) for the phased roadmap to migrate hardcoded dot access into hard/soft/pure declarations in `lib/core/*.lts`.

## Related concepts

- [Documentation index](lite://doc/overview)
- [Type-operations migration plan](lite://doc/compiler/type-operations-migration-plan)
- [Functions](lite://doc/functions)
- [Generic notation](lite://doc/generic-notation)
- [Records](lite://doc/records)
- [Aliases and distinct types](lite://doc/type-aliases)
- [Composition and interfaces](lite://doc/composition-and-interfaces)
- [Mutability](lite://doc/mutability) and [caller mutation grants](lite://doc/caller-mutation-grants)
- [Visibility](lite://doc/visibility) and [modules and packages](lite://doc/modules-and-packages)
- [Decision ledger](lite://doc/decisions-and-open-questions)
- [INV-030 investigation note](lite://repo/research/investigations/INV-030-method-declaration-syntax.md)
