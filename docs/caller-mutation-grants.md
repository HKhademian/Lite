# Explicit caller grants

Status: **selected 2026-10-19**. Calls grant temporary writable data access with mut and caller-location replacement with slot. Source capabilities must already exist. Ordinary read-only input transfer and complete alias/lifetime rules remain open.

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
replace := fn(target: slot User) {
    target = make_user()
}

var userVar := make_user();
replace(slot userVar);
```

The caller variable receives the replacement. Var authority is required for replacement of a whole variable; its held data need not be mutable. A fixed mut binding supplies writable data, not whole-binding replacement authority.

```text
replace(userVar); /* rejected: missing explicit slot grant */

mut fixedUser := make_user();
replace(slot fixedUser); /* rejected: caller binding is fixed */
```

For fields and elements, apply their existing write requirements: writable parent access, a valid target, and compatibility with every possible target field type. The parent's binding itself need not be var to update a field.

Slot User alone does not permit modifying fields of the current payload. A call supplies the requested capability, not every capability the caller happens to possess.

## Signature and grant must agree

- A mut-qualified parameter requires a mut argument and existing writable data access.
- A slot-qualified parameter requires a slot argument and a writable, type-compatible location.
- Ordinary read-only parameters receive no write permission merely because the source was declared var or mut.
- A var mut source can supply either grant independently when a particular call requests it.

Combined mut/slot contracts and argument syntax remain open. The two selected markers do not establish a combined modifier order.

## Evaluation and scope

Evaluate the callee first and arguments left to right, once each. Select/evaluate the marked data access or location under the existing evaluation-order rules. Neither marker implicitly invokes a cloning operation.

Granted access lasts for the call. Exact overlap/exclusivity checks, callbacks, temporary arguments, alias validity, and cleanup still require formalization. No automatic rollback or transactional commit is selected. Backend representation must preserve caller-visible writes rather than turn them into local-copy updates.

## No extra parameter mode for local work

Use a local declaration or shadowing to create a working binding. The proposed var parameter mode is retired from the current design. Local declarations preserve the distinction between rebinding a local name and receiving authority over caller storage.

Ordinary read-only value/copy/move/borrow semantics remain open. They cannot become an unmarked route to mutate caller data.

Related: [functions](functions.md), [parameter permissions](parameter-permissions.md), [mutability](mutability.md), [slot parameters](slot-parameters.md), and [evaluation order](evaluation-order.md).
