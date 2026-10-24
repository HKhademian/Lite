# Var: writable storage access

Status: **selected direction, 2026-10-19**. Use type-side var for the caller-location replacement contract formerly spelled slot. Local-only header modifiers are omitted: local working bindings belong in the body. The corresponding explicit call grant is var. The old slot spelling is retired, rather than retained as a synonym. General type inference and advanced access grammar remain incomplete.

## One permission, different storage owners

Var means permission to replace the content of a location. A local declaration creates that location; a var-qualified parameter receives temporary access to a location supplied by the caller.

```text
var user := make_user(); /* create a reassignable local binding */

replace := fn(user: var User) {
    user = make_another_user()
}

replace(var user); /* assignment inside replace updates this caller binding */
```

The parameter does not own an independent local working copy. Its association with the supplied location is fixed for the call. Assignment changes that location's content, not which location the parameter designates. No general pointer/reference value or escaping access handle is introduced.

## Reservation and first-write access

With x: Int = ?, ordinary reads are rejected until the first whole-value x = 74. That write initializes fixed x; afterward reads are allowed and replacement is rejected. Var y: Int = ? has the same initial read prohibition, then permits both reads and later replacement after initialization. This initialization permission applies to union storage too, without adding a readable unknown/Unit alternative or selecting write-only parameters. See [initialization access examples](first-initialization.md#writable-before-initialization-readable-afterward).

## Zero initialization does not change the access contract

```text
x: User;      /* implicit semantic zero; read-only User */
var x: User;  /* same zero; writable storage contract var User */
x: User = 0;  /* explicit semantic zero */
x: User = {} /* declared-default record construction */
```

The omitted initializer and = 0 have the same valid-zero requirement and bypass declared defaults. Each declaration completes initialization immediately. The var declaration exposes var User as its storage access contract: reads produce User and permitted writes accept User. Reading x does not transfer a writable alias or wrap its value in a runtime reference object. Var does not make fields inside User mutable. See [zero initialization](zero-initialization.md).

## Declared writes and current reads

Selected on **2026-10-24**: a tracked direct local assignment may narrow the currently readable value without narrowing the declared accepted replacements. For var x: String | Int = ? followed by x = 42, the current read type is Int and the writable storage contract remains var (String | Int). A later String assignment is valid. This does not turn the location into a var Int contract or grant writable access through an ordinary value read; general access/call compatibility remains separate. See [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected) for path joins, successful first initialization, and alias/effect invalidation.

## Read types after caller replacement

Selected on **2026-10-24**: caller-location calls check current readable possibilities against the parameter's read type and its possible replacements against the source's declared writes. Var String reads and writes String. For String | Int storage reading Int, a wide replacement call can leave String | Int, an Int-only call is valid and leaves Int, and a String-only call is rejected. No write is required to preserve a valid single-member input; the qualifier is not output-only. Write-only access is future work, not selected now; see [call replacement flow](call-replacement-flow.md).

One source location cannot duplicate its active write grant into two var parameters. Repeated explicit var arguments to the same local in one call are rejected even when their parameter types are identical or a particular body does not write. This selects the known same-local case; broader alias/overlap enforcement and activation timing remain open. See [single source write grant](call-replacement-flow.md#single-source-write-grant-selected).

A var-qualified parameter may forward its existing grant to a nested call using the same explicit var marker. During the nested active grant, the outer holder's access through that authority is suspended; normal return restores it for the same source location with writes visible. Nested forwarding cannot broaden the received contract, duplicate the grant, or create longer-lived access. See [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected); activation and callback/reentrant rules remain open. After a recoverable failure, the same grant is restored before caller recovery starts, once nested access and applicable callee-side cleanup end; writes remain visible and old refinements are not automatically restored. See [caller recovery](call-replacement-flow.md#recovery-after-a-forwarded-call-selected).

## Local implementation details stay in the body

```text
local_work := fn(param: User) {
    var param := param;
    param = make_another_user()
}
```

Resolve the initializer against the input parameter, then introduce a new local binding. Reassigning that binding does not replace the caller's binding. This needs no fn(var param: User) mode, no caller grant, and no public signature change.

In contrast:

```text
caller_work := fn(param: var User) {
    param = make_another_user()
}
```

Caller replacement is observable API behavior and must appear in both the parameter contract and the explicit caller grant. A declaration var param := param inside caller_work would shadow the received location with a new local binding; subsequent assignments would then affect that local binding only.

The user's abbreviated fn(param) and fn(param: var) forms express the same contrast. Accept omitted value types only where the eventual inference rules can determine them, for example from a known callable type. The var marker does not mean Any or remove the requirement for a statically known value type. General unannotated parameter inference remains open; the fully typed forms above do not depend on it.

## Var and mut remain independent

```text
rename := fn(user: mut User) {
    user.name = "Ali"
}

replace := fn(user: var User) {
    user = make_user()
}

mut editable := make_user();
rename(mut editable);

var replaceable := make_user();
replace(var replaceable);
```

Mut allows permitted changes inside supplied data. Var allows replacement of supplied storage. Neither alone grants the other. A fixed mut binding cannot satisfy whole-binding var replacement. A plain var binding does not permit updates to its payload's fields. Combined replacement/payload qualifier and call-marker order remain open.

For a field argument, var parent.field requires existing write authority through the parent plus compatible accepted replacement types. The parent binding itself need not be var; an accessible field through mut parent can be a writable location. Literals and detached temporaries do not silently become caller storage.

## Preserve readable and writable alternatives

Within one complete access contract:

```text
A | var B | C

read:  A | B | C
write: B
```

The compiler retains the same information as the former A | slot B | C. The readable value type is A | B | C. Var marks accepted replacements, not a new kind of B object, and does not make B's fields mutable.

Var qualifies the following type operand and binds more tightly than the surrounding union. Within one contract, var (A | B) is equivalent to var A | var B. A transparent alias preserves its full denotation as that operand. A local var value: A | B already derives this full replacement contract; users need not annotate it again.

Advanced mixed annotations and their exact grammar still need formalization. Routine field access should infer these summaries and show readable/accepted-write types only when useful.

## Combining possible locations is still different from flattening a value union

```text
P := record { field: A | B; }
Q := record { field: C | B; }
parent: mut (P | Q) = choose_parent();
```

The common field access reads A/B/C and accepts B. Its summary is A | var B | C: reads combine by union; accepted writes are those permitted by every possible target. Renaming slot to var does not change that calculation.

Do not flatten two separate complete access contracts as though they were one value union. Combining a path that accepts A/B with one that accepts C/B must preserve their boundary and shared write guarantee. Parentheses alone do not identify such a boundary in the incomplete public type grammar. A common summary also does not preserve every correlation needed for later narrowing.

## Compatibility and cost

The callee must handle every possible source read, and every replacement the callee may perform must be accepted by the source location. A source reading A/B/C and accepting only B cannot supply var (A | B | C), even though its readable type matches: the callee could write A or C. Checking the readable union alone is insufficient.

The rename adds no runtime representation or conversion. Basic explicit-var-call read/write compatibility and refinement invalidation are selected in [call replacement flow](call-replacement-flow.md); write-only access remains future work. Actual copying, borrowing, cleanup, exclusivity, callbacks, and complete alias/effect invalidation still require their own contracts. Explicit local mutable record copies retain their selected shallow-copy behavior; explicit caller grants must not silently detach into copies.

## Migration and remaining decisions

Canonical caller-replacement signatures, call grants, and access summaries use var. Slot remains a useful descriptive word for storage and in historical document paths, but is not a second source keyword. Historical keyword comparisons retain their original examples with a status note.

Complete qualifier grammar, mixed contracts, combined mut/var access, inferred parameter value types, alias/lifetime checks, and public first-class access types remain open. No local-only var function-header mode is added.

Related: [parameter permissions](parameter-permissions.md), [caller grants](caller-mutation-grants.md), [caller-location parameters](slot-parameters.md), [access summaries](slot-access-qualifier.md), [local shadowing and copies](local-shadowing-and-copies.md), and [union values versus access](union-values-and-access.md).
