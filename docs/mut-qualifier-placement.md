# Where mut belongs in typed declarations

Status: **`mut name: T` selected for variable definitions and `name: mut T` for access contracts, 2026-11-27.** Implemented on both TypeScript and C11 backends: prefix `mut name: T` and `var mut name: T` (alongside aligned `context` placement and contextual static calls) are shipped, and legacy `name: mut T` whole-variable definitions are rejected.

## Variable definitions

Put `mut` before the variable name, whether the type is written or inferred. `var` permits replacement of the binding, and `mut` grants writable access to its value. Spell the combined prefix `var mut`.

```text
user: User = make_user();         /* fixed binding, read-only access */
mut user: User = make_user();     /* fixed binding, writable data access */
var user: User = make_user();     /* reassignable binding, read-only access */
var mut user: User = make_user(); /* reassignable binding, writable data access */
```

The inferred alternatives use the same prefixes and `:=`.

```text
user := make_user();
mut user := make_user();
var user := make_user();
var mut user := make_user();
```

## Access contracts

A parameter declares writable access with `name: mut T`. The caller uses an explicit grant such as `rename(mut user, "Ali")`.

```text
rename := fn(user: mut User, name: String): Unit {
    user.name = name
}
```

Caller-storage replacement continues to use `fn(target: var T)`. See [type-side var](lite://doc/var-access-qualifier).

## Type composition benefits and obligations

Type-side mut gives a natural representation for a possible qualified alias or unnamed callable parameter contract. For example, the following remains a candidate for the broader type grammar:

```text
WritableUser := alias mut User;
```

Alias naming cannot manufacture writable access; a source must supply the required authority. This would not declare a new nominal record type or make User globally mutable. Full access-qualified alias legality is still open.

In a type contract, use a grouped operand to qualify a whole union, as in `fn(parent: mut (P | Q))`. In a variable definition, the prefix grants access to the whole value, as in `mut parent: P | Q = make_parent();`. Per-alternative `A | mut B`, further nesting, normalization, and flow rules still need separate contracts.

Crucially, A | mut B is not the replacement contract A | var B. Payload mutation and accepted replacements remain distinct. Neither form bypasses the source's permissions, visibility, ownership, or lifetime requirements.

The physical parameter passing strategy also remains separate. A type-position mut must not silently mean copy a value, borrow caller storage, replace caller bindings, or infer a pointer operation.

## Reference-language comparison

Rust uses mut x: T for a mutable local parameter binding, while a writable borrowed parameter can use x: &mut T. These positions describe different concepts, so borrowing Rust's name-prefix appearance alone would not give LiteScript's held-data mutability the same meaning. Source: [Rust mut keyword](https://doc.rust-lang.org/std/keyword.mut.html).

V uses mut before a parameter name for its mutable-argument contract. This supports the name-prefix spelling as a practical design, while V's passing and mutation restrictions remain different from LiteScript's independent binding, payload, and replacement rules. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

Swift places inout before the parameter type. This shows that a type-side modifier can be readable, but inout is a parameter-mode feature; its position alone does not establish that every such modifier is a freely reusable type constructor. Source: [official Swift book functions source](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Functions.md#in-out-parameters).

These examples compare syntax and semantics separately. None selects public pointers, a general reference system, or their respective ownership models for LiteScript.

## Planned variable-definition migration

The migration changes the spelling of annotated writable variable definitions. The examples below show the selected forms that the migration will enable.

```text
mut r := random.Rng.create(42);
mut seeded: random.Rng = random.Rng.create(42);
var mut replaceable: random.Rng = random.Rng.create(42);

advance := fn(r: mut random.Rng): Int {
    mut r.nextInt()
};
first := advance(mut r);
second := mut r.nextInt();
```

`mut` grants writable access to the held value. `var` permits replacing the binding. Use `var mut` in that order when both permissions are needed. A variable-definition prefix qualifies access to the whole value; access qualifiers inside a compound type retain their type-level scope wherever supported. Contextual static lookup such as `.create(42)` is a separate feature.

### Locations to review

- **Storage definitions.** Use the same prefix in `.lts` script bodies, function and block locals, and `.lt` module values wherever the existing storage and export rules already permit `mut`. Apply it to explicit initializers, omitted initializers, and `= ?` reserved storage wherever those forms are supported. A public writable definition uses `pub mut name: T = expression` where permitted. Existing visibility and initialization rules govern which definitions are allowed.
- **Access contracts.** Keep `r: mut Rng` in named parameters, including closures and interface signatures, and `r: mut Self` for method receivers. Keep `mut T` in unnamed parameter types and wherever a type position already supports qualified access. Record fields and tuple element types describe the shape of a value. They do not use the variable-definition prefix merely because a field has a default.
- **Patterns and loop binders.** This migration moves `mut` only in existing variable definitions. The compiler rejects `{ r: mut T = field } := source`, so there is no writable record-pattern spelling to migrate. Preserve the existing `match`, conditional, and loop binder grammar. After a successful match or within a loop body, an ordinary `mut` definition can initialize a writable local from the extracted payload or `.item`. It follows normal initialization and ownership rules and adds no write-through access to the source.
- **Context syntax.** The selected placement for future Contexts is `context(alloc: mut Allocator)` in the function contract, `pub context mut alloc: Allocator := defaultHeapAllocator` for an ambient provider definition, and `context (mut alloc = arena) { ... }` to supply writable access in a lexical override.
- **Call sites and type-side `var`.** Retain `advance(mut rng)`, `mut rng.nextInt()`, and writable field or index grants. Retain `fn(target: var T)` and the corresponding caller-replacement grant.

### Implementation and verification order

1. **Accept both variable-definition spellings.** Add `mut r: T` alongside `r: mut T` in the maintained Lite frontend. Audit the token parser and checker, block and top-level declaration paths, inference and declaration scans, and module export discovery. Map both spellings to the existing writable-access representation. Check for collisions with expression statements such as `mut rng.nextInt()`. Cover inferred and typed definitions, `var mut`, supported zero and reserved initialization, script and module scope, and grants to arguments and receivers. Verify matching behavior on TS and C11, then promote a seed and migrate repository definitions. Use syntax-aware matching to preserve parameter and compound-type qualifiers.
2. **Drop the former spelling immediately after source adoption.** Reject `r: mut T` as a whole-variable definition with a diagnostic that shows `mut r: T`. Retain type-side qualifiers in contracts and supported compound types. Cover reversed or repeated modifiers, mutation through a read-only binding, replacement through a fixed `mut` binding, and reads before first initialization. Update the grammar, references, handbook, examples, and affected tooling. Run the full dual-target tests, corpus parity, and bootstrap verification for the cutover.
3. **Add contextual static calls.** Specify and verify `mut rng: random.Rng = .create(42);` as an independent increment after the placement cutover. One established expected type supplies the owner of an accessible static operation, with the usual argument and result checks. Compare the shorthand with `random.Rng.create(42)` on TS and C11. Include a missing or ambiguous owner and a collision with leading-dot loop metadata. Require qualification when the owner is unresolved or the dot is ambiguous.

Related: [mutability](lite://doc/mutability), [declarations](lite://doc/declarations-and-assignment), [functions](lite://doc/functions), [caller-location keywords](lite://doc/caller-location-keywords), [type aliases](lite://doc/type-aliases), and [slot qualifier](lite://doc/slot-access-qualifier).
