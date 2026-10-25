# Explicit caller grants

Status: **selected 2026-10-19**. Calls grant temporary writable data access with mut and caller-location replacement with var. Source capabilities must already exist. Ordinary read-only value inputs and results follow copy semantics with no implicit references; type-specific eligibility and complete alias/lifetime rules remain deferred. See [the general copy default](parameter-values-and-slots.md#general-copy-default-selected).

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

For fields and elements, apply their existing write requirements: writable parent access, a valid target, and compatibility with every possible target field type. The parent's binding itself need not be var to update a field. Selected disjoint inline sibling fields may each receive a separate var grant from that parent mut access, as in swap(var pair.left, var pair.right). They have distinct storage identities, while same-field and whole-parent/field grants overlap and are rejected. This derives field replacement permission without granting parent-binding reassignment; see [disjoint inline fields](call-replacement-flow.md#disjoint-inline-field-grants-selected).

Selected on **2026-10-25**: mut access to an initialized fixed array may supply var grants for known-valid distinct constant element positions. In swap(var values[0], var values[1]) for mut values := [10, 20], each Int slot has one active writer and the array binding stays fixed. Reject the same position twice. The selected stable built-in Int inequality guard can prove runtime positions disjoint; multiple element grants into the same fixed array without a supported proof are statically rejected, with ordinary bounds checks unchanged. Reference-target alias analysis and additional proof forms remain open; see [unproven overlap](call-replacement-flow.md#unproven-fixed-array-element-overlap-rejected). See [fixed-array element grants](call-replacement-flow.md#distinct-constant-fixed-array-element-grants-selected).

Var User alone does not permit modifying fields of the current payload. A call supplies the requested capability, not every capability the caller happens to possess.

## Signature and grant must agree

- A mut-qualified parameter requires a mut argument and existing writable data access.
- A var-qualified parameter requires a var argument and a writable, type-compatible location.
- Ordinary read-only parameters receive no write permission merely because the source was declared var or mut.
- A var mut source can supply either grant independently when a particular call requests it.

Combined mut/var contracts and argument syntax remain open. The two selected markers do not establish a combined modifier order.

Before an explicit var call, check current reads against the callee's read type and callee writes against declared caller replacements. Var String both reads and writes String, so an Int input is rejected even when the caller storage accepts String. A valid String-only call preserves String; a wide String | Int call may widen an Int refinement to that union. No output-only or mandatory-write meaning is implied. Write-only access is deferred; see [call replacement flow](call-replacement-flow.md).

## Evaluation and scope

Evaluate the callee first and arguments left to right, once each. Select/evaluate the marked data access or location under the existing evaluation-order rules. The required var input type must fit when the callee begins after reached supplied arguments and applicable default effects; missing defaults run after supplied entries in declared slot order under the selected [default timing](evaluation-order.md#default-argument-evaluation-selected); reject a call whose required input proof is unavailable then. For an initialized simple local, later arguments may establish that proof even if it was absent when the location was selected. A String assignment can prepare String | Int storage initially holding Int for a var String callee; caller writes remain String | Int while the callee receives only String read/write authority. See [established entry compatibility](call-replacement-flow.md#entry-compatibility-established-during-preparation-selected). No snapshot, reordering, or repeated location selection is implied; see [entry facts](call-replacement-flow.md#entry-facts-after-argument-evaluation-selected). Neither marker implicitly invokes a cloning operation. Selecting an initialized local does permit later argument reads that compute scalar values before invocation, as in add(var count, count + 1); see [later argument reads](call-replacement-flow.md#later-argument-reads-of-a-selected-local-allowed). Entry checks and the duplicate-write-grant restriction remain. Permitted direct local writes in later arguments also use the caller's preparation-time grant; it passes to the callee at invocation without overlapping holders. See [later argument writes](call-replacement-flow.md#later-argument-writes-to-a-selected-local-allowed). A later synchronous call may temporarily receive the same simple local grant and return it before outer invocation; the inline scalar example and its fresh-temporary form preserve the successive holders. See [nested preparation](call-replacement-flow.md#nested-granting-calls-during-argument-preparation-allowed).

Granted access lasts for the call. One source location supplies only one active write grant, so repeated explicit var arguments to the same local in one call are rejected. Equal stored values in distinct locals do not imply a duplicate location; see [single source write grant](call-replacement-flow.md#single-source-write-grant-selected). General overlap/exclusivity checks, callbacks, temporary arguments, alias validity, activation timing, and cleanup still require formalization. No automatic rollback or transactional commit is selected. Backend representation must preserve caller-visible writes rather than turn them into local-copy updates.

Received var access can be forwarded explicitly with inner(var target) as a temporary handoff of the same grant. The outer holder cannot independently use it while the nested grant is active; on normal return the same location and nested writes are available again. No extra write authority, detached copy, duplicate grant, or escaping access is created. General alias/reentrant enforcement and activation timing remain open; see [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected). After a recoverable failure, the same grant is restored before caller recovery starts, once nested access and applicable callee-side cleanup end; writes remain visible and old refinements are not automatically restored. See [caller recovery](call-replacement-flow.md#recovery-after-a-forwarded-call-selected).

## No extra parameter mode for local work

Use a local declaration or shadowing to create a working binding. A left-side fn(var target: T) header for local rebinding is retired. Type-side fn(target: var T) instead describes caller replacement and belongs in the public contract. See [the var qualifier](var-access-qualifier.md).

Ordinary read-only value/copy/move/borrow semantics remain open. They cannot become an unmarked route to mutate caller data.

Related: [functions](functions.md), [parameter permissions](parameter-permissions.md), [mutability](mutability.md), [var parameters](slot-parameters.md), and [evaluation order](evaluation-order.md).
