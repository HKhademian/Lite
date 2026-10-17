# Mutability, access, and operations

Status: **independent `var`/`mut` declaration capabilities established; receiver syntax and ownership details open**.

## Purpose

Separate changing a binding, changing the data accessible through it, and declaring what an operation may change. An immutable binding alone cannot settle all three questions.

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

`var` grants reassignment of the binding. It does not change the static value type or grant writable access to held data. That second permission requires `mut`.

## 2. Access to held data

For an owned value, reference, handle, or view, distinguish access permissions:

- Read access: inspect the data through that access path.
- Write access: modify permitted data through that access path.

A fixed binding may provide write access. A reassignable binding may provide only read access. The selected declarations express the four combinations:

```text
x := make_user();         /* fixed binding; read-only access */
mut x := make_user();     /* fixed binding; writable access */
var x := make_user();     /* reassignable binding; read-only access */
var mut x := make_user(); /* reassignable binding; writable access */
```

These lines are separate alternatives, not repeated declarations in one scope. The same prefixes apply before an explicitly typed declaration, such as `mut x: User = make_user()`. Combined modifiers have the order `var mut`; `mut var` and repeated modifiers are rejected.

Updating a field or collection element requires `mut`, an accessible writable target, and an ownership/aliasing state permitting the operation. Assigning the whole binding through `x = replacement` requires `var`. Neither modifier bypasses type safety, field privacy, or aliasing restrictions.

The examples assume an initializer that can supply the requested capability, such as fresh owned construction. `mut` cannot silently upgrade an existing read-only borrowed view, manufacture exclusive access, or request an implicit clone. Conversion and move rules for owned values remain open.

### Read-only access versus frozen data

Read-only access means this path cannot perform the write. It does not, by itself, promise that another authorized alias cannot change the data. Borrowing rules might prohibit that alias from writing while the view is active; that would be an additional contract.

A frozen value would have a stronger guarantee: its protected state cannot change through any alias. Whether that extends through nested references, shared objects, caches, or external resources requires a separate definition. Do not silently equate read-only access with deep immutability.

## 3. Operation receiver requirements

Operations receive read access by default; mutation requires an explicit `mut` contract. The operation's required receiver/parameter capability must be checked against the caller's available capability. Operation and parameter syntax still need selection.

The following sketches put `mut` before a receiver parameter to resemble the declaration prefix. This is proposed parameter syntax, not an accepted general type qualifier, reference syntax, argument-passing rule, or operation-declaration modifier. Assume the fields are accessible in the implementation context.

```text
name_of := fn(self: User): String {
    self.name
}

rename := fn(mut self: User, name: String): Unit {
    self.name = name
}
```

- Read access permits operations requiring read access.
- Write access can be restricted to read access for an operation, subject to the chosen borrowing rules.
- An operation requiring write access cannot be called using only read access.
- A read operation cannot directly assign receiver fields, derive writable access to protected fields, or call another operation requiring writable access to that receiver.
- Restricting access does not copy, freeze, or permanently revoke the owner's write capability.

This makes operation mutability a requirement on its receiver, rather than an independent third state of the object. The same principle should cover ordinary parameters, interfaces, callbacks, and closures where they expose mutation capabilities.

A declaration such as `mut operation := fn(...) { ... }` qualifies access to the held function value; the declaration prefix alone does not declare which receivers, parameters, or captured objects the function body may mutate. Whether a separate operation-level `mut` marker is required in addition to explicit writable receiver/parameter contracts remains open.

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

- Define the inference and conversion rules for access-bearing values without upgrading read-only borrowed access.
- Define parameter, receiver, and operation-level mutation syntax; declaration-prefix `mut` is selected, but other placements remain provisional.
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
