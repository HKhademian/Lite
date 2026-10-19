# Slot parameters and caller locations

Status: **temporary caller-location access selected, 2026-10-18; explicit slot call grants selected, 2026-10-19**. Assignment through such a parameter replaces the caller's supplied variable or field. Local-only var parameter headers are retired in favor of body declarations/shadowing. Complete compatibility and general borrowing rules remain open. This selects no public pointer feature or general reference-value system.

The [ref/mut/slot/mut ref comparison](caller-location-keywords.md) records alternative spellings considered earlier. The user subsequently retained explicit slot receivers while asking to hide derived mathematical slot summaries; see [slot ergonomics](slot-ergonomics.md). No ref parameter mode or synonymous var caller-replacement spelling is selected.

## Selected caller-location contract

The [ordinary parameter review](parameter-values-and-slots.md) clarifies the current scope: writable caller locations can be received without introducing public pointers or general reference values. Ordinary value/borrow semantics remain a separate decision.

Distinguish replacing an ordinary local parameter binding from replacing a location supplied by the caller. A declaration's access permissions alone do not select how arguments are passed.

A slot-qualified parameter requests temporary access to the caller's location. Assignment through the parameter writes back to that location. This does not make every ordinary call an aliasing operation. The explicit call grant is replace(slot value); see [caller grants](caller-mutation-grants.md).

## Local working bindings

Local-only var parameter headers are unnecessary: use an ordinary declaration inside the body. This is separate from receiving caller storage.

```text
local_only := fn(value: A | B) {
    var value: A | B = value;
    value = new_B()
}
```

The assignment replaces the new local binding, not the caller's variable. Sequential same-block shadowing is allowed. General input copy/move/share rules remain open; see [local shadowing and copies](local-shadowing-and-copies.md).

## Slot parameter and explicit call grant

```text
replace := fn(target: slot (A | B)) {
    target = new_B()
}

var value: A | B = new_A();
replace(slot value);
```

Target denotes the supplied caller location, so assignment through it replaces value. It is not an independent local value parameter, and no extra var or mut is required merely to repeat the explicit slot-replacement requirement. Mutating fields of the stored payload still requires the appropriate mut access. The explicit slot call marker is required.

The association between target and its caller location remains fixed for this call. Writing through target replaces content, not that association. No retargetable reference handle is introduced; an additional var marker has no selected caller-write role here. Combined payload mutation and replacement syntax is reviewed in [parameter permissions](parameter-permissions.md).

The signature applies the type-position slot replacement contract to a temporary caller location. Expression-position slot value explicitly supplies the location. The marker grants existing replacement authority and cannot manufacture a writable location. Complete parameter/type grammar still needs formalization.

For an ordinary binding, the caller must possess var authority. A fixed mut binding does not qualify for replacement of that binding. For a record field, writable access through the parent and the field's permitted replacement types are required; the parent binding itself need not be reassignable.

The source must be a valid writable location. A literal, ordinary function result, or arithmetic temporary must not silently become caller storage via an implicit temporary. Exact addressability and computed-property support remain open.

## Advanced partial-write contract illustration

The mixed contract below illustrates the mathematical access rule. Its public advanced type grammar remains open; the user prefers deriving these summaries rather than making them routine annotations. This does not change the explicit full-slot receiver above.

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
parent: mut (P | Q) = choose_parent();

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

Temporary caller-location access and explicit replace(slot value) grants are selected. Local-only var parameter headers are retired in favor of local declarations. Ordinary read-only parameter semantics, exact compatibility, aliasing, computed locations, and a general ownership system remain open. General references and pointers are outside the current feature selection.

Related: [functions](functions.md), [slot qualifier](slot-access-qualifier.md), [mutability](mutability.md), [evaluation order](evaluation-order.md), [field writes](union-field-writes.md), and [memory and performance](memory-and-performance.md).
