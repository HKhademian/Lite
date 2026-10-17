# Mutability, access, and operations

Status: **three separate concerns identified; access model, defaults, and syntax proposed**.

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

`var` grants reassignment of the binding. It does not change the static type. Whether it also supplies writable access to an owned record's fields is a separate, unresolved default.

## 2. Access to held data

For a reference, handle, or view, distinguish two capabilities:

- Read access: inspect the data through that access path.
- Write access: modify permitted data through that access path.

A fixed handle may provide write access. A reassignable handle may provide only read access. The four semantic combinations are:

- Fixed binding, read-only access.
- Reassignable binding, read-only access.
- Fixed binding, writable access.
- Reassignable binding, writable access.

These combinations describe capabilities, not four new declaration keywords. Their ownership, lifetime, and aliasing contracts must be defined before accepting a surface syntax.

For the proposed handle/view model, updating a field requires write access, an accessible writable field, and an ownership/aliasing state permitting the operation. Merely making the handle reassignable cannot upgrade its access to the referenced object.

### Read-only access versus frozen data

Read-only access means this path cannot perform the write. It does not, by itself, promise that another authorized alias cannot change the data. Borrowing rules might prohibit that alias from writing while the view is active; that would be an additional contract.

A frozen value would have a stronger guarantee: its protected state cannot change through any alias. Whether that extends through nested references, shared objects, caches, or external resources requires a separate definition. Do not silently equate read-only access with deep immutability.

## 3. Operation receiver requirements

Proposed direction: operations receive read access by default and explicitly request write access when needed. The operation's required capability is checked against the caller's available capability.

The following sketches use `User` for read access to a receiver and `mut User` for write access. This notation is a candidate for receiver/access contracts, not an accepted general type qualifier, reference syntax, or ownership rule. Assume the fields are accessible in the implementation context.

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
- A read operation cannot directly assign receiver fields, derive writable access to protected fields, or call another operation requiring writable access to that receiver.
- Restricting access does not copy, freeze, or permanently revoke the owner's write capability.

This makes operation mutability a requirement on its receiver, rather than an independent third state of the object. The same principle should cover ordinary parameters, interfaces, callbacks, and closures where they expose mutation capabilities.

### Receiver read-only does not mean pure

A receiver contract alone does not prohibit output, reading time, or modifying unrelated state supplied through other explicit capabilities. A pure-operation contract would need additional effect rules. Whether a receiver can change indirectly through another alias remains part of the ownership and aliasing design.

## Beginner-facing defaults

The existing inferred declarations and `var count := 0; count += 1;` remain sufficient to explain binding reassignment. Advanced access types need not appear in those first lessons.

Before examples involving record updates or collection-building can be normative, choose how owned values expose mutation. Possibilities include granting writable owned storage through `var`, or requiring an additional explicit value/access capability. The current proposal does not choose between them.

The recommended beginner-facing option is writable owned storage through `var`, with independent read/write access for references and views. This would let a student update an owned record without learning reference qualifiers. A `var` binding holding a read-only view would remain unable to write through that view. This is a recommendation, not an adopted ownership or inference rule.

Accordingly, these remain undecided:

```text
user := make_user();
user.age = 13;
```

```text
var user := make_user();
user.age = 13;
```

Both depend on whether the value is owned or a handle, the access supplied by its type/initializer, field permissions, and the eventual default. Neither should be marked accepted or rejected solely from the declaration's spelling yet.

## Cost and implementation direction

Binding and access permissions are candidates for static checking. They do not inherently require runtime dictionaries, heap allocation, or cloning. Alias enforcement, sharing, and any explicit interior-mutation facility may have separate costs; no zero-cost implementation has been demonstrated here.

## Decisions still required

- Choose owned-value mutation defaults and the inference rules for access-bearing values.
- Define read/write type or parameter syntax; `mut` is provisional.
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
