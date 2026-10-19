# Where mut belongs in typed declarations

Status: **user-requested syntax review, 2026-10-19; no migration selected**. Existing typed declarations and parameters use a mut prefix on the name. This review recommends reconsidering typed forms as name: mut T because access contracts are becoming explicit type expressions. Inferred declarations and selected var/mut/slot semantics remain unchanged pending a decision.

## The two forms

```text
fn(mut target: T)
fn(target: mut T)
```

Both are syntactically feasible. Placement alone does not decide borrowing, copying, caller replacement, or performance. The meaningful choice is whether mut is only a modifier of a named binding/parameter, or is also an access qualifier usable inside type expressions.

## Prefix on the name

The established form fn(mut target: T) matches existing local declarations:

```text
mut user := make_user();
mut user: User = make_user();
```

It is consistent with the current declaration-prefix rule and keeps the access requirement visible before the name. It also works when the type is inferred and no type expression is written.

If writable access is only a contract on each named parameter, this is a coherent choice. First-class qualified types, anonymous callable parameter types, nested access contracts, and qualified aliases would then need their own consistent representation; the prefix does not inherently prohibit them.

## Qualifier after the colon

The alternative fn(target: mut T) groups the name separately from the required access-qualified type. It aligns with the existing type-position slot marker and gives the type grammar a natural place for future composite access contracts.

Under this proposal, the four explicit declaration alternatives would be:

```text
user: User = make_user();         /* fixed binding, read-only access */
user: mut User = make_user();     /* fixed binding, writable data access */
var user: User = make_user();     /* reassignable binding, read-only access */
var user: mut User = make_user(); /* reassignable binding, writable data access */
```

These are separate alternatives, not duplicate declarations in one scope. The proposal places var with binding reassignment and mut with the held-data access requirement.

An operation would retain the same mutation contract, expressed as:

```text
rename := fn(user: mut User, name: String): Unit {
    user.name = name
}
```

This is proposed syntax. It would supersede fn(mut user: User) if selected; the two should not become interchangeable typed parameter spellings by default.

## Inference can retain its existing forms

There is no type operand after a colon in an inferred declaration. Retain the existing concise forms:

```text
user := make_user();
mut user := make_user();
var user := make_user();
var mut user := make_user();
```

In the proposed model, inferred mut user requests the writable-access-qualified version of the inferred value contract. A typed declaration writes that requirement after the colon. This is a deliberate relationship between inferred and annotated forms, comparable to the existing distinction between name := expression and name: T = expression.

The cost is losing the exact same modifier placement between inferred and annotated declarations. If identical placement is the higher priority, retain the current name prefix instead.

## Type composition benefits and obligations

If mut is made an access-type qualifier, it could be represented in an alias or an unnamed callable parameter contract without requiring an extra named binding. For example, the following would become candidates for the type grammar:

```text
WritableUser := type mut User;
```

Alias naming cannot manufacture writable access; a source must supply the required authority. This would not declare a new nominal record type or make User globally mutable. Full access-qualified alias legality is still open.

Scoped forms such as mut (A | B) and A | mut B would need defined meanings. The former could request writable data access for whichever alternative is active; the latter could preserve writable payload access only for B. This review does not select their grammar, normalization, or flow rules merely by moving mut after the colon.

Crucially, A | mut B is not the replacement contract A | slot B. Payload mutation and accepted replacements remain distinct. Neither form bypasses the source's permissions, visibility, ownership, or lifetime requirements.

The physical parameter passing strategy also remains separate. A type-position mut must not silently mean copy a value, borrow caller storage, replace caller bindings, or infer a pointer operation.

## Reference-language comparison

Rust uses mut x: T for a mutable local parameter binding, while a writable borrowed parameter can use x: &mut T. These positions describe different concepts, so borrowing Rust's name-prefix appearance alone would not give LiteScript's held-data mutability the same meaning. Source: [Rust mut keyword](https://doc.rust-lang.org/std/keyword.mut.html).

V uses mut before a parameter name for its mutable-argument contract. This supports the name-prefix spelling as a practical design, while V's passing and mutation restrictions remain different from LiteScript's independent binding, payload, and replacement rules. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

Swift places inout before the parameter type. This shows that a type-side modifier can be readable, but inout is a parameter-mode feature; its position alone does not establish that every such modifier is a freely reusable type constructor. Source: [official Swift book functions source](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Functions.md#in-out-parameters).

These examples compare syntax and semantics separately. None selects public pointers, a general reference system, or their respective ownership models for LiteScript.

## Recommendation and migration boundary

Given the move toward explicit slot/access contracts, recommend name: mut T for annotated parameters and declarations, while keeping var on the binding and the existing inferred declaration prefixes. This is a recommendation to revise the earlier rule, not a claim that the existing prefix is inconsistent or unimplementable.

If accepted, update all canonical typed examples, declaration templates, function/method parameter rules, and the grammar together. Do not retain both typed forms or change runtime semantics merely to ease the syntax migration. Keep inference, read-only defaults, var/mut independence, and slot replacement contracts intact.

Until that decision, the established prefix remains canonical in the rest of the documentation. Additional qualified aliases, union scoping, and callable-type grammar still need separate contracts.

Related: [mutability](mutability.md), [declarations](declarations-and-assignment.md), [functions](functions.md), [caller-location keywords](caller-location-keywords.md), [type aliases](type-aliases.md), and [slot qualifier](slot-access-qualifier.md).
