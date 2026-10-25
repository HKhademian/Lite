# Mutability, access, and operations

Status: **independent `var`/`mut` declarations and explicit mutation parameters established; ownership and full method syntax open**.

The selected [mut placement](mut-qualifier-placement.md) is name: mut T for annotated declarations and parameters. Inferred declarations retain mut name := expression, and var remains a binding modifier. The former typed-prefix spelling is superseded.

## Purpose

Separate changing a binding, changing the data accessible through it, and declaring what an operation may change. An immutable binding alone cannot settle all three questions.

[Immutability by default](immutability-by-default.md) is an explicit language design goal. Writable access adds authority to the readable baseline; mutation remains a practical, supported operation. This does not equate read-only access with frozen data or pure operations, or grant a conversion from arbitrary read-only access to writable access.

## 1. Binding reassignment

This part is established:

```text
user := make_user();
user = make_another_user(); /* rejected: immutable binding */
```

```text
var user := make_user();
user = make_another_user(); /* permitted if the types and ownership contract agree */
```

`var` grants reassignment of the binding. It does not change the declared value contract or grant writable access to held data. That second permission requires `mut`. A successful direct local assignment may establish a narrower current read type: String | Int storage assigned 42 reads as Int while still accepting String or Int replacements. This applies in ordinary code blocks, not only after type tests; see [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected).

For a binding explicitly reserved with x: User = ?, the first whole-value x = make_user() initializes rather than replaces a value and does not require var. It is allowed once per execution path; every path reaching ordinary use must have initialized x. The next whole-value write requires var. This does not change the already-initialized examples above or select partial field/element construction. See [first initialization](first-initialization.md).

## 2. Access to held data

For an owned value, reference, handle, or view, distinguish access permissions:

- Read access: inspect the data through that access path.
- Write access: modify permitted data through that access path.

A fixed binding may provide write access. `var` alone provides whole-binding reassignment with read-only access; adding `mut` provides writable access. The selected declarations express the four combinations:

```text
x := make_user();         /* fixed binding; read-only access */
mut x := make_user();     /* fixed binding; writable access */
var x := make_user();     /* reassignable binding; read-only access */
var mut x := make_user(); /* reassignable binding; writable access */
```

These lines show four inferred alternatives for comparison. Sequential declarations may also shadow a name in one block. Explicitly typed forms place mut after the colon: x: mut User = make_user() or var x: mut User = make_user(). Inferred combined modifiers have the order var mut; mut var and repeated modifiers are rejected. A typed mut prefix before the name is not an alternate spelling.

Updating a field or collection element requires `mut`, an accessible writable target, and an ownership/aliasing state permitting the operation. Assigning the whole binding through `x = replacement` requires `var`. Neither modifier bypasses type safety, field privacy, or aliasing restrictions.

Selected on **2026-10-25**: mut parent access may supply var replacement grants for accessible inline fields. In swap(var pair.left, var pair.right), distinct inline Int fields have separate storage and one active write holder each; parent-binding reassignment remains unavailable for fixed mut pair. Reject repeated-field and overlapping whole-parent/field write grants. This projects existing field authority, without granting write access to unrelated payloads or deciding reference-target aliasing. See [disjoint inline fields](call-replacement-flow.md#disjoint-inline-field-grants-selected).

Selected on **2026-10-25**: mut access to an initialized fixed array may supply var grants for known-valid distinct constant element positions. In swap(var values[0], var values[1]) for mut values := [10, 20], each Int slot has one active writer and the array binding stays fixed. Reject the same position twice; runtime-index distinctness and reference-target aliases remain open. See [fixed-array element grants](call-replacement-flow.md#distinct-constant-fixed-array-element-grants-selected).

Fresh construction can supply writable access without a redundant copy. A mutable declaration initialized from an existing copyable record, such as mut x := x, explicitly creates a mutable shallow copy: all inline nested records are copied, while reference fields preserve their targets and permissions. It does not upgrade access to the original or recursively clone referenced data. General transfer, resource copy eligibility, and ownership rules remain open; see [local shadowing and copies](local-shadowing-and-copies.md).

### Read-only access versus frozen data

Read-only access means this path cannot perform the write. It does not, by itself, promise that another authorized alias cannot change the data. Borrowing rules might prohibit that alias from writing while the view is active; that would be an additional contract.

A frozen value would have a stronger guarantee: its protected state cannot change through any alias. Whether that extends through nested references, shared objects, caches, or external resources requires a separate definition. Do not silently equate read-only access with deep immutability.

## 3. Operation receiver requirements

Operations receive read access by default. Affected receiver and parameter bindings explicitly carry `mut` when the operation needs writable access. Those bindings describe the mutation contract; the function needs no additional mutation marker. Required capabilities must be checked against the caller's available capabilities.

For typed parameters, mut qualifies the type after the colon. Calling such a parameter requires an explicit grant, as in rename(mut userVar, "Ali"), and mutable source access must already exist. Writes affect the supplied data rather than a detached copy. The examples use an explicit self parameter to illustrate receiver access. Full method declaration syntax, ordinary read-only parameter transfer, and complete ownership/alias rules remain open. Assume the fields are accessible in the implementation context.

```text
name_of := fn(self: User): String {
    self.name
}

rename := fn(self: mut User, name: String): Unit {
    self.name = name
}
```

- Read access permits operations requiring read access.
- Write access can be restricted to read access for an operation, subject to the chosen borrowing rules.
- An operation requiring write access cannot be called using only read access.
- Each writable receiver or parameter must be marked separately; marking one does not grant write access through another.
- A read operation cannot directly assign receiver fields, derive writable access to protected fields, or call another operation requiring writable access to that receiver.
- Restricting access does not copy, freeze, or permanently revoke the owner's write capability.

This makes operation mutability a requirement on its receiver, rather than an independent third state of the object. The same principle should cover ordinary parameters, interfaces, callbacks, and closures where they expose mutation capabilities.

A declaration such as `mut operation := fn(...) { ... }` qualifies access to the held function value; the declaration prefix alone does not declare which receivers, parameters, or captured objects the function body may mutate. There is no extra `mut fn` requirement for an operation whose affected receivers/parameters already declare `mut`.

Captured state and other nonparameter capabilities still need their own contracts. Omitting a function-level marker does not grant mutation of globals or captures and does not establish a purity guarantee.

### Receiver read-only does not mean pure

A receiver contract alone does not prohibit output, reading time, or modifying unrelated state supplied through other explicit capabilities. A pure-operation contract would need additional effect rules. Whether a receiver can change indirectly through another alias remains part of the ownership and aliasing design.

## Beginner-facing defaults

The existing inferred declarations still let students choose permissions without writing type annotations.

```text
var count := 0;
count += 1; /* replaces the binding's integer value; var is sufficient */
```

```text
mut user := make_user();
user.age += 1; /* updates held data; mut is required */
```

The compound update follows the target: a whole-binding update needs `var`, while a field or element update through the binding needs `mut`. `mut count := 0; count += 1;` is rejected because the update assigns the fixed `count` binding. `var count` does not introduce reference qualifiers or mutation of a separate referenced object.

For a union receiver, mut grants no exemption from the selected [all-target field write rule](union-field-writes.md). The assigned value must fit every possible target field type; the combined read type alone does not describe its write contract. Explicitly representable [access contracts](union-values-and-access.md) remain a proposal.

The original example is now decided:

```text
user := make_user();
user.age = 13; /* rejected: read-only access through user */
```

```text
var user := make_user();
user.age = 13; /* also rejected: var permits reassignment, not held-data updates */
```

Use `mut user` for field updates alone, or `var mut user` for both field updates and whole-binding reassignment. The earlier recommendation to grant writable owned fields through `var` alone is superseded.

## Cost and implementation direction

Binding and access permissions are candidates for static checking. They do not inherently require runtime dictionaries, heap allocation, or cloning. Alias enforcement, sharing, and any explicit interior-mutation facility may have separate costs; no zero-cost implementation has been demonstrated here.

## Decisions still required

[Var parameters](slot-parameters.md) replace caller storage through explicit var grants; mut parameter calls explicitly grant mutation of supplied data. Local-only var parameter headers are retired: use a local declaration and shadowing. Ordinary read-only input transfer and general borrowing rules remain open. This does not select a public pointer system or imply that mut alone replaces the caller's binding.

- Define the inference and conversion rules for access-bearing values without upgrading read-only borrowed access.
- Complete method declarations, capability inference, and combined payload/replacement argument syntax. Separate mut and var grants are selected. Mutation is marked on affected receiver/parameter bindings without an additional function-level marker.
- Choose move/copy/borrow/share behavior, write exclusivity, and lifetimes.
- Define how read access propagates through owned fields and reference-valued fields.
- Define fixed fields separately from binding reassignment and whole-object replacement.
- Decide whether frozen values, interior mutation, or pure operations are initial features.
- Specify receiver contracts for interface dispatch and mutable closure captures.

## References and related concepts

- [Declarations and assignment](declarations-and-assignment.md)
- [Composition and interfaces](composition-and-interfaces.md)
- [Memory and performance](memory-and-performance.md)
- [Closures](closures.md)
- [C++ const correctness](https://isocpp.org/wiki/faq/const-correctness): fixed pointers versus read-only access, receiver constness, and logical constness. LiteScript has not adopted exceptions to read-only receiver restrictions such as C++ `mutable` fields.
- [Rust references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html): access permissions and aliasing restrictions as related but distinct contracts.
- [Swift methods](https://docs.swift.org/latest/documentation/the-swift-programming-language/methods/): explicit mutation requirements for value-type methods. This is comparison material, not a selected LiteScript value/reference model.
