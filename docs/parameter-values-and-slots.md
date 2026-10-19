# Ordinary parameters and writable slots

Status: **scope clarification and design review, 2026-10-18**. Read-only defaults and temporary caller-location access for slot parameters are selected. Ordinary parameter value/borrow semantics, call-site slot spelling, copying/moving, and alias rules remain open. Public pointers and general reference values are not current selected features.

## 1. Access defaults do not choose transport

Bindings and ordinary parameters are fixed and provide read access by default. These rules describe permitted operations, not whether an argument is copied, moved, borrowed, or represented by a machine address.

The selected type-side mut parameter qualifier requests writable access to held data, as in user: mut User. A slot-qualified parameter additionally describes accepted replacements into the supplied caller location. Neither is permission to invent a nullable state, bypass visibility, or alter a location's declared storage type.

## 2. Semantic passing versus physical calling convention

An ordinary parameter needs a language-defined behavior. Possible choices include a value with the type's copy/move rules, or a read-only borrowed view whose lifetime and alias behavior are specified. Immutability by default does not select between those choices.

The compiler may then choose registers, memory, inlining, or an indirect representation where the observable contract is preserved. This implementation choice must not silently change whether updates through another path are visible, whether ownership is transferred, whether a value is independently stored, or how long the caller must keep it alive.

In particular, passing an immutable aggregate indirectly as an optimization does not grant permission to replace the caller's binding. Avoiding a physical copy is not by itself a public reference feature. Read-only access also does not automatically permit snapshotting a live borrowed value when that would change observable behavior.

Recommendation: define observable semantics first, then let the compiler optimize representation. Default record value/reference semantics and the copy/move/borrow contract still need a separate decision.

## 3. Explicit operation on the caller's location

The selected writable-slot feature covers temporary access to a caller variable or field:

```text
replace := fn(target: slot (A | B)) {
    target = new_B()
}

var value: A | B = new_A();
replace(slot value); /* call marker is still a spelling proposal */
```

Assignment through target writes back to the supplied location. There is no pointer dereference expression in this design, and target is not an independent local variable that happens to receive a copied value.

A var binding supplies whole-binding replacement authority. A record field requires writable access through its parent and compatibility with every possible target field declaration. Local parameter replacement and held-payload mutation remain different operations; slot does not make payload fields mutable on its own.

The granted caller-location access lasts for the call. This does not introduce pointer arithmetic, manual address manipulation, nullable pointers, or a freely escaping reference value. It also does not select an internal representation or a complete lifetime/exclusivity system.

## 4. Is an explicit read-only reference necessary now?

No new public read-only reference form is required merely to complete the selected writable-slot feature or to permit compiler optimization. The current scope can remain ordinary read-only inputs plus explicit writable-slot parameters.

An explicit read-only borrowed view might later be useful when an API must expose caller identity, non-owning access, a lifetime relationship, or avoidance of ownership transfer. Those are semantic guarantees that an optimization alone cannot provide. Such a feature would need its own justification and contract; no ref T production or read-only-slot constructor is selected here.

Implicit argument borrowing for a known signature would also be a distinct language rule. It must not be confused with the backend choosing an efficient physical calling convention.

## 5. The mutable-reference analogy

A temporary writable slot resembles the part of a mutable-reference feature that allows a callee to read and replace caller storage. That analogy is useful without adopting a general pointer/reference system.

LiteScript further distinguishes the accepted replacement set. A parameter described as A | slot B | C may read A/B/C while accepting only B on writes. Mutating an existing payload's fields still follows mut permissions. Therefore slot, mut, and var remain separately meaningful rather than all becoming aliases for a single mutable-reference keyword.

Complete access compatibility is proposed in [slot parameters](slot-parameters.md): the callee must handle every possible read and must not write anything the source location rejects. Escaping aliases, overlapping writable arguments, reentrancy, and exact mutation observability remain open.

## Reference-language comparison

C# distinguishes a parameter passed by value from one passed by ref. For a class type, passing by value copies the object reference rather than cloning the object; passing by ref additionally permits replacement of the caller's variable. Thus the phrase reference type does not by itself mean a by-reference parameter. This distinction informs LiteScript's review, without selecting classes or general references. Source: [C# parameter passing](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters).

C++ references alias existing objects, and assignment through a reference assigns the referred-to object rather than reseating the reference. This is one comparison for slot assignment; C++ reference initialization, lifetime, constness, and value-category rules are separate features. Source: [C++ reference initialization](https://eel.is/c++draft/dcl.init.ref).

Rust's shared and mutable references borrow data. A mutable reference permits writes through borrowed access, with restrictions on simultaneous access and lifetimes. It provides a useful comparison for temporary writable slots, without selecting Rust syntax or the entire ownership model. Source: [Rust references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html).

## Next contract to settle

Decide ordinary parameter semantics independently of writable-slot semantics. In particular, define whether a read-only parameter provides an independent value or a borrowed view, what the type's copy/move rules are, and which other aliases may operate during the call. Only then decide whether an additional explicit read-only view is useful.

No new ref keyword, pointer syntax, or general reference-value system is proposed for adoption in this review.

The later [caller-location keyword comparison](caller-location-keywords.md) explicitly evaluates ref, mut, slot, and mut ref at the user's request. It compares retaining the current scoped slot feature with adding a separate read-only-by-default ref parameter mode. No alternate receiver spelling or broader reference feature is selected by that investigation.

Related: [immutability by default](immutability-by-default.md), [functions](functions.md), [mutability](mutability.md), [slot qualifier](slot-access-qualifier.md), and [memory and performance](memory-and-performance.md).
