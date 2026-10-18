# Slot parameters and caller locations

Status: **temporary caller-location access through slot-qualified parameters selected, 2026-10-18**. Assignment through such a parameter replaces the caller's supplied variable or field. Expression-position slot arguments, local var parameters, complete compatibility, and general borrowing rules remain proposals. This selects no public pointer feature or general reference-value system.

## Selected caller-location contract

Distinguish replacing an ordinary local parameter binding from replacing a location supplied by the caller. A declaration's access permissions alone do not select how arguments are passed.

A slot-qualified parameter requests temporary access to the caller's location. Assignment through the parameter writes back to that location. This is selected separately from the slot marker's earlier descriptive meaning; it does not make every ordinary call an aliasing operation. An explicit call-site marker remains recommended, with its spelling unselected.

## Local rebinding is a separate proposal

```text
local_only := fn(var value: A | B) {
    value = new_B()
}
```

Under the recommended local-var interpretation, the assignment replaces this parameter's local binding. It does not rebind the caller's variable. This is a proposal for var parameters, not a selected parameter grammar or a decision about copying, moving, shared objects, or payload ownership.

## Slot parameter with proposed call syntax

```text
replace := fn(target: slot (A | B)) {
    target = new_B()
}

var value: A | B = new_A();
replace(slot value);
```

The selected meaning is that target denotes the supplied caller location, so assignment through it replaces value. It is not an independent local value parameter, and no extra var or mut is required merely to repeat the already explicit slot-replacement requirement. Mutating fields of the stored payload still requires the appropriate mut access. The example's call-site slot marker remains a syntax proposal.

The signature applies the selected type-position slot replacement contract to a temporary caller location. Complete parameter/type grammar still needs formalization. Expression-position slot value is a proposed way to explicitly supply a location. The same word would make replacement authority visible in the declaration and at the call; that argument expression syntax is not selected by the caller-location decision alone.

For an ordinary binding, the caller must possess var authority. A fixed mut binding does not qualify for replacement of that binding. For a record field, writable access through the parent and the field's permitted replacement types are required; the parent binding itself need not be reassignable.

The source must be a valid writable location. A literal, ordinary function result, or arithmetic temporary must not silently become caller storage via an implicit temporary. Exact addressability and computed-property support remain open.

## Restrict replacement without restricting readable alternatives

```text
put_b := fn(target: A | slot B | C) {
    target = new_B()
}

var value: A | B | C = choose_value();
put_b(slot value);
```

The parameter's access contract can read A/B/C but may replace the target only with B. It cannot assign A or C merely because it can read them. Supplying more write capability than the callee requires does not authorize the callee to use it. Exact argument compatibility is proposed below.

The same signature can accept a projected field when every possible parent permits replacing that field with B:

```text
P := record { field: A | B; }
Q := record { field: C | B; }
mut parent: P | Q = choose_parent();

put_b(slot parent.field);
```

The argument's common contract reads A/B/C and accepts B, exactly matching the proposed parameter. Its source-parent alternatives and ownership restrictions still exist behind that contract.

## Compatibility in both directions

For the current exact-member model, recommend checking normalized contracts as follows:

```text
every source readable alternative fits the parameter's readable type
every parameter replacement alternative fits the source's accepted writes
```

For example, a source with read A/B/C and write B cannot satisfy a parameter requiring slot (A | B). The parameter cannot handle a possible read of C and could attempt a write of A that the source rejects. Checking only the write requirement is insufficient.

A parameter requiring only slot B also promises that reading yields B. It cannot generally accept a source that might currently contain A, even if the parameter body happens not to read it. A separate write-only parameter mode would need its own contract rather than inference from the current function body.

These are proposed access-compatibility rules, not general container variance, numeric conversion, structural record assignment, or a complete subtype system.

## Lifetime, evaluation, and observable effects

The selected caller-location access is temporary and limited to the call. It does not grant an escaping slot that can be stored globally, returned, or captured for later use. General reference values and lifetime extension are not selected. Overlapping writable arguments and reentrant/callback access still need a defined rule; the conservative starting proposal rejects overlaps that cannot be proven safe.

Select each location once in the established left-to-right argument evaluation order. Later arguments must not invalidate an earlier selected location. Field/index selection, source-parent replacement, and container resizing must be checked against the eventual ownership/lifetime contract.

The selected semantics replace the supplied caller location. Exact alias observability, write timing, cleanup, exclusivity, and any implementation strategy still require a memory-model decision. No transactional commit/rollback policy or silently detached local-copy behavior follows from this choice. There is no runtime allocation, public pointer operation, pointer ABI, or performance guarantee from the syntax alone.

After a call that can replace a location, the caller must not retain a narrower fact that the callee's allowed writes could invalidate. Full refinement invalidation is still a separate contract.

## Reference comparison

### Swift

Swift parameters are constant by default. An inout parameter permits changes to reach the original caller variable; the call marks that variable with &. This makes the distinction visible in the function and call site. Swift defines additional inout access and implementation rules; this proposal does not import them merely by choosing a similar call-duration feature. Source: [Swift functions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/#In-Out-Parameters), with the text verified from the [official Swift book source](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Functions.md#in-out-parameters).

### Rust

Rust distinguishes a mutable local parameter binding, such as mut x: u8, from an &mut reference to caller storage. Its call site explicitly supplies a mutable reference, and dereferencing permits writing through it. Borrowing rules govern overlap and lifetime. This supports the semantic separation, without selecting Rust's dereference syntax or ownership model for LiteScript. Sources: [Rust mut keyword](https://doc.rust-lang.org/std/keyword.mut.html) and [references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html).

### Zig 0.15.1

Zig distinguishes ordinary immutable parameters from pointer-based access. Its documentation permits implementation choices between copying and passing some aggregates by reference; an implementation-level reference is not by itself a source-language grant to replace the caller's variable. This illustrates why ABI choice and observable replacement semantics must be specified separately. Source: [Zig parameter passing](https://ziglang.org/documentation/0.15.1/#Pass-by-value-Parameters).

### V

V marks mutable arguments with mut in both declarations and calls. Its documented array example updates caller data, illustrating explicit caller-visible mutation syntax. V has its own restrictions and pointer-storage distinctions; its mut is not automatically equivalent to LiteScript's separate mut/var/slot contracts. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

## Remaining decisions

Temporary caller-location access is selected. Recommend an explicit marker at the call site; the example replace(slot value) remains a spelling proposal. Ordinary parameter semantics, local var parameter rules, exact compatibility, aliasing, computed locations, and a general ownership system remain open. General references and pointers are outside the current feature selection.

Related: [functions](functions.md), [slot qualifier](slot-access-qualifier.md), [mutability](mutability.md), [evaluation order](evaluation-order.md), [field writes](union-field-writes.md), and [memory and performance](memory-and-performance.md).
