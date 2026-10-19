# Binding, payload, and slot permissions in function headers

Status: **clarification and proposal, 2026-10-19**. Type-side mut and temporary caller-location slot parameters are selected. Replacing slot receivers with var parameters is rejected. Local-only var parameters and combined mut/slot type grammar remain proposals.

## Three distinct targets

A header can describe permission to change the local parameter binding, permission to update held data, or permission to replace a caller-supplied location. These are different targets. Ordinary parameter copy/move/borrow semantics remain a separate question.

## Ordinary parameter

```text
inspect := fn(user: User): String {
    user.name
}
```

The parameter binding is fixed and its data access is read-only. It does not request replacement of the caller's binding. This alone does not choose copying versus borrowing or imply globally frozen data.

## Mut: update held data

```text
rename := fn(user: mut User, name: String) {
    user.name = name
}
```

Mut permits updates through the supplied writable data access, subject to visibility and ownership. The parameter binding stays fixed: user = another_user is not authorized merely by mut. Whether the supplied data is owned, transferred, or shared with the caller depends on the eventual passing contract; mut itself does not choose that contract.

## Var: proposed local parameter rebinding

```text
local_work := fn(var value: Int): Int {
    value = 5;
    value
}
```

If ordinary var parameters are admitted, recommend that var permit replacement of the local parameter binding only. It would not replace the caller's variable, grant data-mutation access, or imply an extra clone. Input transfer remains subject to the chosen passing/ownership rules.

This local-only behavior is a recommendation, not selected grammar. The rejected alternative was to use var as a substitute for a caller-location slot receiver. A caller can still use var on its own variable to supply the replacement authority required by a slot operation; that is a different declaration site.

## Slot: replace caller storage

```text
replace := fn(target: slot User) {
    target = make_user()
}
```

Target denotes one supplied caller location for the duration of the call. Assigning through it replaces that location's content. No additional var is needed on the parameter to repeat that replacement authority.

The parameter's association with its caller location remains fixed. Assignment through target does not retarget a reference handle to some other location. No operation to reseat such a handle or create an escaping pointer/reference value has been selected.

Slot User does not by itself permit target.age = 20. That changes the held payload, which requires mut access as well. Conversely, mut User permits held-data updates without implicitly authorizing replacement of the caller location.

## Combining permissions

For ordinary parameters, var value: mut User would combine local binding replacement with writable data access if local var parameters are selected. The local replacement would still not be caller writeback.

A slot receiver that needs both caller replacement and payload mutation must require both capabilities. Slot (mut User) is a possible spelling: receive a location whose readable/replacement value contract provides writable User access. This combined qualifier grammar, its capabilities on inserted values, and ownership rules need confirmation; do not treat it as selected merely because the separate markers exist.

Recommend against adding var to a slot parameter as a second way to request caller writes. If a future language feature supports retargetable access handles, that needs a distinct contract; the current temporary slot does not provide one.

## Surface syntax versus derived mathematics

An explicit slot receiver is intentional source syntax. A derived projection summary such as A | slot B | C should normally remain inferred or explained in ordinary terms. The [slot-ergonomics clarification](slot-ergonomics.md) concerns hiding that mathematical type structure, not removing slot from function headers.

Related: [functions](functions.md), [mutability](mutability.md), [declarations](declarations-and-assignment.md), [slot parameters](slot-parameters.md), [slot qualifier](slot-access-qualifier.md), and [ordinary parameter passing](parameter-values-and-slots.md).
