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

The parameter's association with its caller location remains fixed. Assignment through target does not retarget a reference handle to some other location. No operation to reseat such a handle or create an escaping pointer/reference value has been selected.

The qualifier var User does not by itself permit target.age = 20. That changes the held payload, which requires mut access as well. Conversely, mut User permits held-data updates without implicitly authorizing replacement of the caller location.

## Combining permissions

Inside a body, var mut value := source combines local binding replacement with a shallow mutable record copy. It does not write back to the caller. A direct mut parameter call instead grants access to the supplied caller data.

A var receiver that needs both caller replacement and payload mutation must require both capabilities. The form var (mut User) is a possible spelling: receive a location whose readable/replacement value contract provides writable User access. This combined qualifier grammar, its capabilities on inserted values, and ownership rules need confirmation; do not treat it as selected merely because the separate markers exist.

The supplied location association is fixed. If a future language feature supports retargetable access handles, that needs a distinct contract; the current temporary var does not provide one.

## Surface syntax versus derived mathematics

An explicit var receiver is intentional source syntax. A derived projection summary such as A | var B | C should normally remain inferred or explained in ordinary terms. The [var-ergonomics clarification](slot-ergonomics.md) concerns hiding that mathematical type structure, not removing var from function headers.

Related: [functions](functions.md), [mutability](mutability.md), [declarations](declarations-and-assignment.md), [var parameters](slot-parameters.md), [var qualifier](slot-access-qualifier.md), and [ordinary parameter passing](parameter-values-and-slots.md).
