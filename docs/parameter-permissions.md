# Binding, payload, and var permissions in function headers

Status: **selected permissions, updated 2026-10-19**. Type-side mut, temporary caller-location var parameters, and explicit mut/var call grants are selected. Local-only var parameter headers are retired in favor of local declarations. Combined mut/var type grammar remains open.

## Three distinct targets

A header can describe permission to change the local parameter binding, permission to update held data, or permission to replace a caller-supplied location. These are different targets. Ordinary parameter copy/move/borrow semantics remain a separate question.

## Ordinary parameter

```text
inspect := fn(user: User): String {
    user.name
}
```

The parameter binding is fixed and its data access is read-only. It does not request replacement of the caller's binding. This alone does not choose copying versus borrowing or imply globally frozen data.

For ordinary Int inputs, evaluated-value behavior is selected on **2026-10-25**: read_original(var count, count) with count initially 10 supplies the ordinary input as 10. Replacing count with 20 through the var input leaves that ordinary Int value unchanged. The user's tmp := count form captures the same Int value without adding another write grant. This is an observable value rule, not a required physical copy or a general aggregate transport contract. See [ordinary Int evaluated values](parameter-values-and-slots.md#ordinary-int-evaluated-values-selected).

## Mut: update held data

```text
rename := fn(user: mut User, name: String) {
    user.name = name
}
```

Mut permits updates through supplied caller-data access, subject to visibility and ownership. The call requires rename(mut userVar, "Ali") and existing mutable access to userVar. Writes affect that supplied data; a silent detached copy is not allowed. The parameter binding stays fixed: user = another_user is not authorized merely by mut. Complete alias/lifetime rules remain open.

## Var: local working binding

```text
local_work := fn(value: Int): Int {
    var value := value;
    value = 5;
    value
}
```

The ordinary body declaration creates a new reassignable binding and shadows the input. It does not replace the caller's variable or grant payload mutation. Var value := 5 would start at 5 instead of preserving the input. See [local shadowing and copies](local-shadowing-and-copies.md).

The separate local-only var parameter feature is retired. A caller's own var declaration supplies whole-binding replacement authority for a caller-location operation; that is a different target from this local shadow.

## Var: replace caller storage

```text
replace := fn(target: var User) {
    target = make_user()
}
```

Target denotes one supplied caller location for the duration of replace(var userVar). Assigning through it replaces that location's content. A whole caller binding must already be var. No additional var is needed on the var parameter to repeat that replacement authority.

For writable inline record fields, parent mut access can supply var field parameters while the parent binding stays fixed. Distinct sibling fields are separate locations and may each supply one grant; repeated-field and overlapping whole-parent/field write grants are rejected. See [disjoint inline fields](call-replacement-flow.md#disjoint-inline-field-grants-selected).

The parameter's association with its caller location remains fixed. Assignment through target does not retarget a reference handle to some other location. No operation to reseat such a handle or create an escaping pointer/reference value has been selected.

The qualifier var User does not by itself permit target.age = 20. That changes the held payload, which requires mut access as well. Conversely, mut User permits held-data updates without implicitly authorizing replacement of the caller location.

A received var parameter may forward its existing source-location grant to one nested call with inner(var target). While the nested grant is active, the outer holder cannot independently use that same authority; normal return restores its access to the same location with the nested writes visible. This is a handoff, not grant duplication, extra local var storage, or an escaping reference. Ordinary compatibility/authority checks still apply; see [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected). After a recoverable failure, the same grant is restored before caller recovery starts, once nested access and applicable callee-side cleanup end; writes remain visible and old refinements are not automatically restored. See [caller recovery](call-replacement-flow.md#recovery-after-a-forwarded-call-selected).

## Future single-write-only and multi-write-only parameters

The user requests possible future parameter contracts for one write or repeated writes without requiring readable initialized input. Large uninitialized storage such as users: [User; 100000] = ? motivates direct caller-storage construction. These are future contracts: ordinary var remains read/write and cannot receive an uninitialized value. Parameter/call spelling, whether reads become permitted after writing, write allowance per whole destination versus element/region, required initialization on return, and partial-failure cleanup remain open. See [future write-only access](call-replacement-flow.md#future-write-only-access).

## Combining permissions

Inside a body, var mut value := source combines local binding replacement with a shallow mutable record copy. It does not write back to the caller. A direct mut parameter call instead grants access to the supplied caller data.

A var receiver that needs both caller replacement and payload mutation must require both capabilities. The form var (mut User) is a possible spelling: receive a location whose readable/replacement value contract provides writable User access. This combined qualifier grammar, its capabilities on inserted values, and ownership rules need confirmation; do not treat it as selected merely because the separate markers exist.

The supplied location association is fixed. If a future language feature supports retargetable access handles, that needs a distinct contract; the current temporary var does not provide one.

## Surface syntax versus derived mathematics

An explicit var receiver is intentional source syntax. A derived projection summary such as A | var B | C should normally remain inferred or explained in ordinary terms. The [var-ergonomics clarification](slot-ergonomics.md) concerns hiding that mathematical type structure, not removing var from function headers.

Related: [functions](functions.md), [mutability](mutability.md), [declarations](declarations-and-assignment.md), [var parameters](slot-parameters.md), [var qualifier](slot-access-qualifier.md), and [ordinary parameter passing](parameter-values-and-slots.md).
