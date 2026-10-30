# Local shadowing and mutable record copies

Status: **selected direction, 2026-10-19**. Sequential local declarations may shadow earlier bindings. Mut-declaring a copy of an existing record produces a mutable shallow record copy: inline data is copied; referenced targets are not cloned. Noncopyable resources and complete ownership/representation contracts remain open.

## New bindings rather than permission upgrades

```text
x := make_user();
var x := x;
mut x := x;
```

Each line declares a new binding. Resolve its initializer using the previously visible x, then make the new x visible to subsequent code. The second line creates a reassignable binding; it does not add mutable held-data access. The third creates a mutable record copy with a fixed binding. Use inferred var mut if both replacement and held-data mutation are needed.

Earlier bindings and their existing aliases retain their own permissions and ownership obligations. Shadowing does not retroactively modify those bindings or upgrade any alias. Exact cleanup and captures remain subject to their eventual contracts; recursive function initialization is not settled by this ordinary initializer rule.

The typed equivalents place mut after the colon, as in x: mut User = source. The selected copy behavior concerns copying an existing record into the new mutable declaration, rather than upgrading a read-only access to the original object in place.

The later [deferred function-body direction](functions.md#deferred-body-lookup)
permits references to lower declarations without executing the body or moving
initialization. For permitted surrounding references, a body
[retains an already-visible binding across later shadowing](functions.md#existing-bindings-survive-later-shadowing);
this lookup rule does not itself grant implicit local capture.
When no earlier binding exists, the [same-block forward rule](functions.md#first-later-binding-in-the-defining-block)
selects the first subsequent same-name ordinary binding. A
[direct self-reference](functions.md#direct-self-reference-without-an-earlier-target)
may select the function's own binding when no earlier same-name binding exists.
An [explicit self call](functions.md#explicit-current-function-self-calls) targets
the implementation currently executing; ordinary named calls keep ordinary
binding lookup. Mutual recursion and nested-scope search
remain open; initial static enforcement has its own rule.

## Copy inline values; preserve reference fields

Copy the upper record and all inline value fields. A nested record stored inline occupies part of that record's value storage, so its inline contents are copied too. A reference-valued field copies the reference representation and retains its existing target and access permissions. Do not traverse the reference and clone the target.

For an outer record containing inline records containing further inline records, nesting does not create separately allocated objects. Their fields all occupy the outer record's value layout, possibly with alignment padding. Copying that value copies every nested inline field, however deep the nesting:

```text
Position := record { x: Int; y: Int; z: Int; }
Inner := record { position: Position; w: Int; }
Middle := record { inner: Inner; q: Int; }
Outer := record { middle: Middle; u: Int; }

original: Outer = {}
mut copied := original;
copied.middle.inner.position.x = 10;
```

Here x, y, z, w, q, and u are all part of the copied Outer value. The original's inline x remains unchanged. This concerns value layout and observable fields; it does not require a particular physical copy instruction or a byte-for-byte padding guarantee. A field explicitly represented as a reference instead points to separate storage, and that target is not part of the inline copy.

A named record field is still inline value storage. Its type being User rather than Int does not silently make it a reference:

```text
User := record { name: String; age: Int; }
P := record { nested: Middle; u: Int; }
Q := record { nested: Middle; u: User; }

originalQ: Q = {}
mut copiedQ := originalQ;
copiedQ.u.age = 18;
```

Both P.u and Q.u are copied with their containing records. In Q, the entire inline User value is included; originalQ.u.age is unchanged by the shown edit. If User itself contains references, copy those references without cloning their targets. A backend's decision to use an indirect physical representation must preserve these value-copy semantics.

Conceptually:

```text
inline scalar field       -> copied value
inline nested record      -> copied inline contents
reference field           -> copied reference, same target
mutable reference field   -> copied reference, same target and permission
```

Thus mut copy := original makes edits to the copy's own inline fields independent of the original record. If a copied field already provides a mutable reference to separate data, writes through that reference may affect the same referenced data as other authorized aliases. Read-only reference fields do not become mutable merely because the containing record was copied into a mut declaration.

This is a shallow record/value copy, not a recursive graph clone. It does not promise that every path reachable from the new record is independent of the old graph.

## Scope of the copying rule

The conceptual model is copying inline storage, including representations of reference fields. This does not select a universal unchecked byte-copy instruction for all types. Padding, managed/reference-bearing fields, ownership bookkeeping, cleanup, opaque resources, and copy eligibility need contracts consistent with those semantics.

No general reference or pointer syntax is introduced by describing reference fields here. A future exclusivity model must account for which reference capabilities are actually copyable; the Rust mutable-reference analogy does not silently impose or remove such restrictions.

A type without a valid copy contract cannot gain a fabricated copy merely through mut. The diagnostic and exact resource policy remain open. Fresh initialization need not perform a redundant copy when it already supplies a new owned value, and optimization may remove work only when observable semantics are preserved.

## Fixed temporary values for copyable inline-Int records

Selected on **2026-10-25**: for a record with a valid copy contract and inline Int fields, a simple tmp := counter binding preserves the evaluated record value when counter is replaced. Thus the temporary form of read_original(var counter, counter) keeps tmp.value at 10 while the var call installs a new counter with value 20. This fixed temporary and the ordinary record parameter have value semantics for the selected record class; no mut declaration is required to preserve its readable value. It grants neither caller replacement nor mutable access to tmp. Physical copies may be elided only when behavior is preserved. General reference-bearing/noncopyable record initializer and ownership rules remain open; see [ordinary record values](parameter-values-and-slots.md#copyable-records-with-inline-int-fields-selected).

## Fixed temporary values with already-copyable reference fields

Selected on **2026-10-25**: the simple fixed temporary and ordinary-parameter value rule also uses the established shallow mapping for a record and reference fields with valid copy contracts. In tmp := profile, inline values are preserved and copied references keep their original targets and permitted access; replacing profile does not retarget tmp's fields. Referenced targets are shared, and observations of separately authorized changes remain subject to their eventual lifetime/alias rules. Read-only access is not upgraded and no graph clone is implied. The user explicitly defers reference syntax, memory safety, ownership/lifetimes, alias enforcement, and resource handling; this mapping does not decide capability copyability or make the reference model implementation-ready. See [copyable reference-bearing record values](parameter-values-and-slots.md#copyable-reference-bearing-record-values-selected).

## Var shadowing does not demand a deep copy

Var x := x creates a new binding that can receive another compatible value. It does not itself request mutable payload access or a recursive clone of the data. The initializer follows the general copy default: the new binding receives the evaluated value, not an implicit reference, borrow, shared source location, or move. Type-specific copy eligibility and resource/reference safety remain deferred; see [the general copy default](parameter-values-and-slots.md#general-copy-default-selected). The new binding cannot assign into the caller's original binding merely because it shadows the name.

## Local parameter work needs no var parameter mode

```text
local_work := fn(count: Int): Int {
    var count := count;
    count += 1;
    count
}
```

This retains the input as the initial value of a new local working binding. Var count := 5 instead starts that local binding at 5 and ignores the old input value. Both use ordinary shadowing, without a separate header modifier.

For local record mutation without changing the supplied record's own inline fields:

```text
local_rename := fn(user: User): User {
    mut user := user;
    user.name = "Ali";
    user
}
```

The mutable shallow copy is distinct from rename(mut userVar), which explicitly grants access to caller data and must modify that supplied data rather than a detached copy.

## Declaration lists keep separate rules

Sequential local value declarations are not the same as duplicate entries in one parameter list, record field list, or public module namespace. This rule does not automatically permit those duplicates. Ordered repeated names within one pattern retain their already selected binding-order rules.

Related: [declarations](declarations-and-assignment.md), [pattern shadowing](pattern-shadowing.md), [functions](functions.md), [mutability](mutability.md), and [memory and performance](memory-and-performance.md).
