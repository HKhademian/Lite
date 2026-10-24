# Explicit caller grants

Status: **selected 2026-10-19**. Calls grant temporary writable data access with mut and caller-location replacement with var. Source capabilities must already exist. Ordinary read-only input transfer and complete alias/lifetime rules remain open.

## Change data in a supplied value

```text
rename := fn(user: mut User) {
    user.name = "Ali"
}

mut userVar := make_user();
rename(mut userVar);
```

The update affects the caller-supplied data. The call must not silently operate on a detached copy. This is temporary writable access to the supplied data, without a public pointer or general escaping-reference feature. The parameter binding stays fixed: mut alone does not allow user = another_user.

```text
rename(userVar); /* rejected: missing explicit mut grant */

user := make_user();
rename(mut user); /* rejected: source lacks writable data access */
```

The call marker grants existing authority; it cannot upgrade read-only access or copy an immutable source to pretend the mutation was granted. A separately declared mutable copy is a different source and can be passed explicitly.

## Replace a supplied location's content

```text
replace := fn(target: var User) {
    target = make_user()
}

var userVar := make_user();
replace(var userVar);
```

The caller variable receives the replacement. Var authority is required for replacement of a whole variable; its held data need not be mutable. A fixed mut binding supplies writable data, not whole-binding replacement authority.

```text
replace(userVar); /* rejected: missing explicit var grant */

mut fixedUser := make_user();
replace(var fixedUser); /* rejected: caller binding is fixed */
```

For fields and elements, apply their existing write requirements: writable parent access, a valid target, and compatibility with every possible target field type. The parent's binding itself need not be var to update a field.

Var User alone does not permit modifying fields of the current payload. A call supplies the requested capability, not every capability the caller happens to possess.

## Signature and grant must agree

- A mut-qualified parameter requires a mut argument and existing writable data access.
- A var-qualified parameter requires a var argument and a writable, type-compatible location.
- Ordinary read-only parameters receive no write permission merely because the source was declared var or mut.
- A var mut source can supply either grant independently when a particular call requests it.

Combined mut/var contracts and argument syntax remain open. The two selected markers do not establish a combined modifier order.

Before an explicit var call, check current reads against the callee's read type and callee writes against declared caller replacements. Var String both reads and writes String, so an Int input is rejected even when the caller storage accepts String. A valid String-only call preserves String; a wide String | Int call may widen an Int refinement to that union. No output-only or mandatory-write meaning is implied. Write-only access is deferred; see [call replacement flow](call-replacement-flow.md).

## Evaluation and scope

Evaluate the callee first and arguments left to right, once each. Select/evaluate the marked data access or location under the existing evaluation-order rules. Neither marker implicitly invokes a cloning operation.

Granted access lasts for the call. Exact overlap/exclusivity checks, callbacks, temporary arguments, alias validity, and cleanup still require formalization. No automatic rollback or transactional commit is selected. Backend representation must preserve caller-visible writes rather than turn them into local-copy updates.

## No extra parameter mode for local work

Use a local declaration or shadowing to create a working binding. A left-side fn(var target: T) header for local rebinding is retired. Type-side fn(target: var T) instead describes caller replacement and belongs in the public contract. See [the var qualifier](var-access-qualifier.md).

Ordinary read-only value/copy/move/borrow semantics remain open. They cannot become an unmarked route to mutate caller data.

Related: [functions](functions.md), [parameter permissions](parameter-permissions.md), [mutability](mutability.md), [var parameters](slot-parameters.md), and [evaluation order](evaluation-order.md).
