# Where mut belongs in typed declarations

Status: **name: mut T selected for annotated declarations and parameters, 2026-10-19**. Inferred declarations retain mut name := expression and var mut name := expression; var stays before the name in typed declarations. The earlier typed name-prefix form is superseded. Access permissions, argument passing, and slot semantics are unchanged by this migration.

Subsequent naming decision: [type-side var](var-access-qualifier.md) replaces the slot keyword for caller-storage access. This does not change selected mut placement. Historical references to slot below explain the earlier placement discussion; canonical replacement signatures now use fn(target: var T), with local-only var declarations inside the body.

## The two forms

```text
fn(mut target: T) /* superseded: rejected in current LiteScript */
fn(target: mut T) /* selected */
```

Both are syntactically feasible. Placement alone does not decide borrowing, copying, caller replacement, or performance. The meaningful choice is whether mut is only a modifier of a named binding/parameter, or is also an access qualifier usable inside type expressions.

## Earlier prefix on the name

The earlier form fn(mut target: T) matched the inferred declaration prefix:

```text
mut user := make_user();
mut user: User = make_user(); /* superseded typed form */
```

It kept the access requirement visible before the name and used the same placement with or without a written type. This was a valid reason to consider it, but the typed version is no longer canonical. Inferred mut user := expression remains selected.

If writable access is only a contract on each named parameter, this is a coherent choice. First-class qualified types, anonymous callable parameter types, nested access contracts, and qualified aliases would then need their own consistent representation; the prefix does not inherently prohibit them.

## Qualifier after the colon

The selected fn(target: mut T) groups the name separately from the required access-qualified type. It aligns with the existing type-position slot marker and gives the type grammar a natural place for future composite access contracts.

The four explicit declaration alternatives are:

```text
user: User = make_user();         /* fixed binding, read-only access */
user: mut User = make_user();     /* fixed binding, writable data access */
var user: User = make_user();     /* reassignable binding, read-only access */
var user: mut User = make_user(); /* reassignable binding, writable data access */
```

These are separate alternatives, not duplicate declarations in one scope. The selected rule places var with binding reassignment and mut with the held-data access requirement.

An operation retains the same mutation contract, expressed as:

```text
rename := fn(user: mut User, name: String): Unit {
    user.name = name
}
```

This supersedes fn(mut user: User). The old typed-prefix form is rejected, not retained as an interchangeable spelling.

## Inference retains its existing forms

There is no type operand after a colon in an inferred declaration. Retain the existing concise forms:

```text
user := make_user();
mut user := make_user();
var user := make_user();
var mut user := make_user();
```

Inferred mut user requests the writable-access-qualified version of the inferred value contract. A typed declaration writes that requirement after the colon. This is a deliberate relationship between inferred and annotated forms, comparable to the existing distinction between name := expression and name: T = expression.

The accepted tradeoff is differing modifier placement between inferred and annotated declarations. Do not reintroduce typed name prefixes merely to remove that difference.

## Type composition benefits and obligations

Type-side mut gives a natural representation for a possible qualified alias or unnamed callable parameter contract. For example, the following remains a candidate for the broader type grammar:

```text
WritableUser := type mut User;
```

Alias naming cannot manufacture writable access; a source must supply the required authority. This would not declare a new nominal record type or make User globally mutable. Full access-qualified alias legality is still open.

Use a grouped operand when qualifying a whole union, as in parent: mut (P | Q): the existing writable access applies to whichever parent alternative is active. This migration preserves the former prefix declaration's full-value access. Per-alternative A | mut B, further nesting, normalization, and flow rules still need separate contracts; they are not selected merely by moving mut after the colon.

Crucially, A | mut B is not the replacement contract A | slot B. Payload mutation and accepted replacements remain distinct. Neither form bypasses the source's permissions, visibility, ownership, or lifetime requirements.

The physical parameter passing strategy also remains separate. A type-position mut must not silently mean copy a value, borrow caller storage, replace caller bindings, or infer a pointer operation.

## Reference-language comparison

Rust uses mut x: T for a mutable local parameter binding, while a writable borrowed parameter can use x: &mut T. These positions describe different concepts, so borrowing Rust's name-prefix appearance alone would not give LiteScript's held-data mutability the same meaning. Source: [Rust mut keyword](https://doc.rust-lang.org/std/keyword.mut.html).

V uses mut before a parameter name for its mutable-argument contract. This supports the name-prefix spelling as a practical design, while V's passing and mutation restrictions remain different from LiteScript's independent binding, payload, and replacement rules. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

Swift places inout before the parameter type. This shows that a type-side modifier can be readable, but inout is a parameter-mode feature; its position alone does not establish that every such modifier is a freely reusable type constructor. Source: [official Swift book functions source](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Functions.md#in-out-parameters).

These examples compare syntax and semantics separately. None selects public pointers, a general reference system, or their respective ownership models for LiteScript.

## Selected rule and migration boundary

Use name: mut T for annotated parameters and declarations, while keeping var on the binding and the existing inferred declaration prefixes. This revises the earlier placement rule because of the direction toward explicit slot/access contracts.

Canonical typed examples, declaration templates, function/receiver parameter rules, and the grammar have been migrated together. Historical and foreign-language examples are labeled separately. Do not retain both typed forms or change runtime semantics to ease the syntax migration. Keep inference, read-only defaults, var/mut independence, and slot replacement contracts intact.

Additional qualified aliases, per-alternative union capabilities, and complete callable-type grammar still need separate contracts. This selection does not adopt ref, public pointers, or a borrowing model.

Related: [mutability](mutability.md), [declarations](declarations-and-assignment.md), [functions](functions.md), [caller-location keywords](caller-location-keywords.md), [type aliases](type-aliases.md), and [slot qualifier](slot-access-qualifier.md).
