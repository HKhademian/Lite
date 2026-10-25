# Var parameters and caller locations

Status: **temporary caller-location access selected, 2026-10-18; canonical var spelling selected, 2026-10-19**. Var replaces the former slot keyword in signatures, call grants, and access summaries. Assignment through such a parameter replaces the caller's supplied variable or field. Local-only var parameter headers are omitted in favor of body declarations/shadowing. Complete compatibility and general borrowing rules remain open. This selects no public pointer feature or general reference-value system.

The [ref/mut/slot/mut ref comparison](caller-location-keywords.md) preserves earlier naming alternatives. The later [var qualifier decision](var-access-qualifier.md) unifies replacement permission across local declarations and received caller storage. Slot is no longer a source-keyword synonym. No general ref parameter mode is selected.

## Selected caller-location contract

The [ordinary parameter review](parameter-values-and-slots.md) clarifies the current scope: writable caller locations can be received without introducing public pointers or general reference values. Ordinary value/borrow semantics remain a separate decision.

Distinguish replacing an ordinary local parameter binding from replacing a location supplied by the caller. A declaration's access permissions alone do not select how arguments are passed.

A var-qualified parameter requests temporary access to the caller's location. Assignment through the parameter writes back to that location. This does not make every ordinary call an aliasing operation. The explicit call grant is replace(var value); see [caller grants](caller-mutation-grants.md).

## Local working bindings

Local-only var parameter headers are unnecessary: use an ordinary declaration inside the body. This is separate from receiving caller storage.

```text
local_only := fn(value: A | B) {
    var value: A | B = value;
    value = new_B()
}
```

The assignment replaces the new local binding, not the caller's variable. Sequential same-block shadowing is allowed. General input copy/move/share rules remain open; see [local shadowing and copies](local-shadowing-and-copies.md).

## Var parameter and explicit call grant

```text
replace := fn(target: var (A | B)) {
    target = new_B()
}

var value: A | B = new_A();
replace(var value);
```

Target denotes the supplied caller location, so assignment through it replaces value. It is not an independent local value parameter, and no extra var or mut is required merely to repeat the explicit var-replacement requirement. Mutating fields of the stored payload still requires the appropriate mut access. The explicit var call marker is required.

The association between target and its caller location remains fixed for this call. Writing through target replaces content, not that association. No retargetable reference handle is introduced; no left-side local-binding modifier belongs in this header. Combined payload mutation and replacement syntax is reviewed in [parameter permissions](parameter-permissions.md).

The signature applies the type-position var replacement contract to a temporary caller location. Expression-position var value explicitly supplies the location. The marker grants existing replacement authority and cannot manufacture a writable location. Complete parameter/type grammar still needs formalization.

For an ordinary binding, the caller must possess var authority. A fixed mut binding does not qualify for replacement of that binding. For a record field, writable access through the parent and the field's permitted replacement types are required; the parent binding itself need not be reassignable.

The source must be a valid writable location. A literal, ordinary function result, or arithmetic temporary must not silently become caller storage via an implicit temporary. Exact addressability and computed-property support remain open.

## Advanced partial-write contract illustration

The mixed contract below illustrates the mathematical access rule. Its public advanced type grammar remains open; the user prefers deriving these summaries rather than making them routine annotations. This does not change the explicit full-var receiver above.

```text
put_b := fn(target: A | var B | C) {
    target = new_B()
}

var value: A | B | C = choose_value();
put_b(var value);
```

The parameter's access contract can read A/B/C but may replace the target only with B. It cannot assign A or C merely because it can read them. Supplying more write capability than the callee requires does not authorize the callee to use it. Exact argument compatibility is proposed below.

The same signature can accept a projected field when every possible parent permits replacing that field with B:

```text
P := record { field: A | B; }
Q := record { field: C | B; }
parent: mut (P | Q) = choose_parent();

put_b(var parent.field);
```

The argument's common contract reads A/B/C and accepts B, exactly matching the proposed parameter. Its source-parent alternatives and ownership restrictions still exist behind that contract.

## Compatibility in both directions

For the current exact-member model, recommend checking normalized contracts as follows:

```text
every source readable alternative fits the parameter's readable type
every parameter replacement alternative fits the source's accepted writes
```

For example, a source with read A/B/C and write B cannot satisfy a parameter requiring var (A | B). The parameter cannot handle a possible read of C and could attempt a write of A that the source rejects. Checking only the write requirement is insufficient.

A parameter requiring only var B also promises that reading yields B. It cannot generally accept a source that might currently contain A, even if the parameter body happens not to read it. A separate write-only parameter mode would need its own contract rather than inference from the current function body.

These are proposed access-compatibility rules, not general container variance, numeric conversion, structural record assignment, or a complete subtype system.

For the selected simple local flow cases, entry compatibility uses the current justified read type and the location's declared accepted writes. Var String reads and writes String: a current Int cannot enter that parameter, while a valid String input remains String after normal return whether or not a write occurs. A var (String | Int) call can widen an Int-only fact to String | Int. Preserve stability/authority and the separate ordinary call result; write-only access remains future work. See [call replacement flow](call-replacement-flow.md).

A simple var local reserved with = ? may be selected before it is initialized if later argument evaluation definitely performs its first whole-value initialization before invocation. Location selection is not a payload read; the callee receives initialized compatible storage, and reads before that first write remain rejected. This does not grant var replacement authority to fixed storage or select initialization by the receiving callee. See [initialization during preparation](call-replacement-flow.md#initialization-during-argument-preparation-selected).

## Lifetime, evaluation, and observable effects

The selected caller-location access is temporary and limited to the call. It does not grant an escaping storage-access handle that can be stored globally, returned, or captured for later use. General reference values and lifetime extension are not selected. One source location supplies only one active write grant: two explicit var arguments identifying the same local in one call are rejected, even if both parameter types match. General field/index/path overlap, alias detection, and reentrant/callback enforcement still need rules; the conservative broader proposal rejects overlaps that cannot be proven safe. See [single source write grant](call-replacement-flow.md#single-source-write-grant-selected).

A received var parameter may temporarily forward the same grant to one nested call. Only the nested holder is active during that access; the outer holder regains the same-location authority on normal return, with nested writes visible. The nested call cannot exceed the outer received read/write authority or outlive it. This does not select callback/reentrancy policy or activation timing; see [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected). After a recoverable failure, the same grant is restored before caller recovery starts, once nested access and applicable callee-side cleanup end; writes remain visible and old refinements are not automatically restored. See [caller recovery](call-replacement-flow.md#recovery-after-a-forwarded-call-selected).

Select each location once in the established left-to-right argument evaluation order. Later arguments must not invalidate an earlier selected location. They must also establish or preserve a valid proof of its required readable input type at invocation. For an initialized simple local, a later String assignment may prepare String | Int storage initially holding Int for a var String callee. The current read becomes String; caller writes remain String | Int and callee writes are limited to String. See [established entry compatibility](call-replacement-flow.md#entry-compatibility-established-during-preparation-selected). Conversely, selecting x as String does not allow a later argument to leave Int before a var String callee begins. This entry-type obligation is selected without choosing borrow activation or complete alias rules; see [entry facts](call-replacement-flow.md#entry-facts-after-argument-evaluation-selected). Field/index selection, source-parent replacement, and container resizing must be checked against the eventual ownership/lifetime contract. Selecting an initialized local does permit later argument reads that compute scalar values before invocation, as in add(var count, count + 1); see [later argument reads](call-replacement-flow.md#later-argument-reads-of-a-selected-local-allowed). Entry checks and the duplicate-write-grant restriction remain. Permitted direct local writes in later arguments also use the caller's preparation-time grant; it passes to the callee at invocation without overlapping holders. See [later argument writes](call-replacement-flow.md#later-argument-writes-to-a-selected-local-allowed). A later synchronous call may temporarily receive the same simple local grant and return it before outer invocation; the inline scalar example and its fresh-temporary form preserve the successive holders. See [nested preparation](call-replacement-flow.md#nested-granting-calls-during-argument-preparation-allowed).

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

V marks mutable arguments with mut in both declarations and calls. Its documented array example updates caller data, illustrating explicit caller-visible mutation syntax. V has its own restrictions and pointer-storage distinctions; its mut is not automatically equivalent to LiteScript's separate payload-mutation and storage-replacement contracts. Source: [V mutable arguments](https://docs.vlang.io/functions-2.html#mutable-arguments).

## Remaining decisions

Temporary caller-location access and explicit replace(var value) grants are selected. Local-only var parameter headers are retired in favor of local declarations. Ordinary read-only parameter semantics, exact compatibility, aliasing, computed locations, and a general ownership system remain open. General references and pointers are outside the current feature selection.

Related: [functions](functions.md), [var qualifier](slot-access-qualifier.md), [mutability](mutability.md), [evaluation order](evaluation-order.md), [field writes](union-field-writes.md), and [memory and performance](memory-and-performance.md).
