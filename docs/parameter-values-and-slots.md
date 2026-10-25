# Ordinary parameters and writable slots

Status: **general copy semantics for ordinary value transfers, including returns, and no implicit references selected 2026-10-25**. Var/mut remain explicit access grants. Type-specific copy eligibility, future explicit reference modes, reference syntax, memory safety, ownership/lifetimes, aliases, and resources remain deferred; backend representation is not prescribed.

## General copy default selected

Selected on **2026-10-25**, clarified by the user: **ordinary runtime value transfers have copy semantics, including returns; there are no implicit references**. This is the general language rule, not a tentative default for a list of individual types. Ordinary reads supplying values, binding initializers, assignment right-hand sides, call arguments, and ordinary result payloads preserve the evaluated value under the applicable copy contract. Source location replacement does not silently retarget those copied values.

Location selection for an assignment or an explicit access grant is a different operation from reading a payload value. Existing var and mut calls explicitly request caller-location replacement or writable-payload access; they do not become detached-copy operations. An ordinary value expression does not silently create such a grant, a live caller-storage view, or an implicit move. Future reference-copy or borrowed-view modes must be explicitly stated; their source syntax is deferred.

Copy follows the value's valid type/component contract. Inline values are preserved; a reference value already declared as part of a value is copied with its existing target and permitted access under the agreed shallow rule. This is not a recursive graph clone, a permission upgrade, or an implicit reference to the containing source storage. Public result types, union members/enum cases, and existing source evaluation order retain their contracts.

The copy default does not classify every type or resource as copyable. Type-specific copy eligibility/effects, reference syntax, memory safety, ownership, lifetimes/escape, alias enforcement, and noncopyable resources remain explicitly deferred. An unavailable copy contract cannot be repaired by fabricating a copy or silently switching to a reference, borrow, sharing mode, or move.

These are observable semantics, not a requirement to execute a physical copy instruction at every expression. Direct construction, registers, indirect calling conventions, and copy elimination may be used only while preserving evaluated values, valid copy-contract effects, and all other observable behavior. No universal memcpy, deep clone, zero-copy guarantee, or new public reference syntax follows.

## Ordinary return values are copies selected

Selected on **2026-10-25**: ordinary explicit return payloads and implicit function-tail results follow the general copy rule. A plain value result read through a var parameter is a copy of the evaluated value, not an escaping caller-location grant:

```text
Counter := record {
    value: Int;
}

replace_and_read := fn(target: var Counter): Counter {
    target = Counter { value = 20 }
    target
}

var counter := Counter { value = 10 }
saved := replace_and_read(var counter);

counter = Counter { value = 30 }
/* saved.value is 20; counter.value is 30. */
```

Assume Counter has a valid copy contract. The final target reads the Counter value containing 20 for the result; an explicit return target; at that point has the same value behavior. The temporary write grant ends under the ordinary call/cleanup rules, and subsequent caller replacement with value 30 leaves saved at value 20. Existing reference fields, if any are admitted by valid contracts, keep their shallow reference-value behavior; the returned containing value is not a new writable alias.

Preserve declared result typing, control-flow targets, failures/exits, evaluation order, and applicable cleanup. Existing Unit/zero-fallback and tagged-return completion rules are unchanged; copy semantics create no result on a path that does not return normally. Result-storage optimization may avoid physical copying while preserving the evaluated value. Reference-return syntax, eligibility for resource/noncopyable results, and the full safety/lifetime model remain deferred.

## 1. Access defaults do not choose transport

Bindings and ordinary parameters are fixed and provide read access by default. Their ordinary value transfers use the selected copy semantics, with no implicit references. Access permissions and physical representation remain separate: read access alone grants no writes, and a backend address does not change source-level copying into reference passing.

The type-side mut parameter qualifier requests writable caller-data access, as in user: mut User, explicitly granted by rename(mut userVar). The updates affect supplied data, without a detached-copy fallback. A var-qualified parameter describes accepted replacements into the caller location, explicitly granted by replace(var userVar). Neither marker manufactures authority, invents a nullable state, bypasses visibility, or changes a location's declared storage type.

## 2. Semantic passing versus physical calling convention

The general ordinary-parameter behavior is copied evaluated values, not an implicit borrowed view. The type's valid copy contract must define its value mapping and eligibility; future reference-copy/borrowed-view contracts must be explicit. The type-specific examples below illustrate this general rule rather than limiting its scope.

The compiler may then choose registers, memory, inlining, or an indirect representation where the observable contract is preserved. This implementation choice must not silently change whether updates through another path are visible, whether ownership is transferred, whether a value is independently stored, or how long the caller must keep it alive.

In particular, passing an immutable aggregate indirectly as an optimization does not grant permission to replace the caller's binding. Avoiding a physical copy is not by itself a public reference feature. Read-only access also does not automatically permit snapshotting a live borrowed value when that would change observable behavior.

The observable copy semantics are selected; the compiler may optimize representation while preserving them. Copy eligibility, resource effects, and explicit reference/move contracts still need their own later review.

The selected [variadic rest access and retention rules](tuple-array-shapes.md#rest-access-storage-and-retention), 2026-10-24, add a scoped boundary: rest arrays are readable by default, collecting them does not mandate heap allocation, and borrowed backing storage must remain valid. Retaining rest requires valid ownership or a proven lifetime; creating independent owned storage requires an explicit copy/ownership operation, without an automatic escape-repair copy. These rest contracts do not override the general ordinary-value copy rule or add an implicit live source alias; any backing-storage reuse must preserve that behavior. They select no general escaping-reference syntax or automatic ownership conversion. Writable rest still needs an explicit contract and caller grant; its full syntax and alias rules remain open.

## Ordinary Int evaluated values selected

Selected on **2026-10-25**: an ordinary Int argument supplies the value evaluated at its source-order argument position. Subsequent replacement of the source local through a var grant does not change that supplied Int value:

```text
read_original := fn(target: var Int, original: Int): Int {
    target = 20;
    original
}

var count: Int = 10;
saved := read_original(var count, count);
/* saved is 10; count is 20. */
```

Evaluate the callee first, select count's location once for the var input, and then read the ordinary Int input as 10 before invocation. The target parameter receives the caller-location grant. The ordinary original parameter receives the evaluated Int value and remains 10 when target writes 20 to count. There is only one write grant; the ordinary Int input is not a second storage grant or a live view of count.

From the same starting state, the user's explicit temporary form is equivalent:

```text
var count: Int = 10;
tmp := count; /* 10 */
saved := read_original(var count, tmp);
/* saved is 10; count is 20; tmp remains 10. */
```

The simple tmp binding holds the Int value read from count. Its value is preserved when count is replaced. The snippets are alternative fragments, and their equivalence uses this stable callable name and simple local, preserving ordinary callee-first/source-argument evaluation. It is not permission to hoist an argument ahead of effectful earlier expressions or change scope/lifetimes. Ordinary Int input evaluation still requires initialized readable data and ordinary type compatibility; it grants no caller-write authority.

This selects observable Int value semantics, including the illustrated scalar temporary, not a physical copy instruction or calling convention. Registers, indirect transport, inlining, or eliding unobservable storage must preserve the evaluated value and source-order effects. A backend may not make original observe 20 through an alias merely to avoid materializing 10. No heap allocation, deep clone, public reference syntax, or performance result is implied. Other aggregate and other-type copying/moving/borrowing, ownership, and reference-alias contracts remain separate.

## Copyable records with inline Int fields selected

Selected on **2026-10-25**: for a record with a valid copy contract whose fields are inline Int values, an ordinary argument supplies the evaluated record value. It follows the selected ordinary Int value behavior rather than a live view of the caller's replaceable location:

```text
Counter := record {
    value: Int;
}

read_original := fn(target: var Counter, original: Counter): Int {
    target = Counter { value = 20 }
    original.value
}

var counter := Counter { value = 10 }
saved := read_original(var counter, counter);
/* saved is 10; counter.value is 20. */
```

Assume Counter has a valid copy contract and its field is accessible in this context. Evaluate the callee first, select counter's location for the var input, then evaluate the ordinary Counter input with value 10. Target receives the caller-location grant; original keeps the evaluated record value after target installs Counter { value = 20 } in that source location. Its field read therefore produces 10. The ordinary record input adds no second write grant or live source-location view.

From the same initial counter value, the equivalent temporary form is:

```text
tmp := counter; /* captures Counter { value = 10 } */
saved := read_original(var counter, tmp);
/* saved is 10; counter.value is 20; tmp.value remains 10. */
```

The simple fixed tmp binding preserves the evaluated record value when counter is replaced. These are alternative fragments with the same stable callable name and simple local. Preserve source evaluation order and scope/lifetimes; this is not general argument hoisting past effects. All reads still require initialized compatible values, and var replacement requires ordinary caller authority.

For Int and this copyable record class, ordinary inputs thus have value semantics by default; explicit var receives a caller location, while mut retains its separate writable-payload access meaning. This is an observable contract, not a requirement that the machine ABI copy every argument. A backend may use registers, indirect passing, inlining, or copy elimination only while preserving the old evaluated value and ordinary effects. Preserving a larger inline value across replacement can require copying its data; no zero-copy/performance guarantee is selected.

This scoped rule assumes copyability; it does not introduce a copy trait or classify every record as copyable. The conditional shallow mapping for already-copyable reference fields is selected below. Reference syntax and memory safety are deferred by the user; reference-capability copyability, noncopyable resources, other aggregate kinds, moves, and general borrowed-view/ownership contracts remain separate decisions. This example selects no deep clone, resource-copy operation, universal byte copy, public reference syntax, or new aliasing permission.

## Copyable reference-bearing record values selected

Selected on **2026-10-25**: for a record whose value and reference fields already have valid copy contracts, ordinary argument evaluation and the corresponding simple fixed temporary preserve a shallow record value. Reuse the established rule: copy inline value fields under their contracts and preserve each copied reference field's reference value, target, and permitted access, without cloning the referenced target.

```text
Profile := record {
    score: Int;
    user: UserRef;
}

tmp := profile;
```

Here UserRef is a descriptive placeholder for an already valid, copyable read-only reference type. Assume profile is an initialized copyable Profile. No spelling for constructing or declaring a reference capability is selected by this placeholder.

Tmp.score preserves the evaluated Int value. Tmp.user preserves the evaluated reference value and designates the same User target as profile.user did at the copy point. Replacing profile later does not retarget tmp.user or replace tmp's inline fields. The same mapping applies when the evaluated Profile is supplied as an ordinary argument alongside a separate valid var grant to its source location. The evaluated record value is preserved; the reachable object graph is not an automatic snapshot.

The referenced User remains shared. If another access is authorized to change it under its eventual lifetime/alias contract, a read through tmp.user may observe that change. This does not authorize that access, freeze the target, make a read-only reference writable, or create a new reference capability. Existing permissions can be preserved only where their copy contract permits it. Preserve ordinary initialized reads, field visibility, argument/source order, caller-grant rules, and observable behavior under backend optimization; no deep clone or physical byte-copy requirement is added.

### Reference syntax and memory safety deferred

A future reference-copy or borrowed-view mode must be explicitly stated in the source contract, with syntax deferred. This differs from preserving references already declared in a copied field; such fields retain their agreed shallow mapping without turning the containing record into a caller-location alias.

**Explicitly deferred by the user on 2026-10-25:** reference syntax, memory safety, ownership and borrowing, lifetime/escape rules, alias enforcement, and the complete resource model must be discussed later. This selection specifies the shallow value mapping only when those required contracts are already valid; it is neither a memory-safety design nor evidence of a safe implementation. In particular, it does not decide which owned or mutable reference capabilities are copyable, how sharing/cleanup is implemented, or how noncopyable resources are passed. Do not fabricate a copy or choose a reference-counting, garbage-collection, pointer, or allocation policy to fill those gaps.

## Copyable fixed tuple and array values selected

Selected on **2026-10-25**: ordinary inputs for fixed tuples and fixed arrays with valid component copy contracts preserve their evaluated aggregate values, like the selected copyable record cases. Replacing the source location through a separate var grant does not replace those already-evaluated components:

```text
read_original := fn(target: var [Int; 2], original: [Int; 2]): Int {
    target = [20, 30];
    original[0]
}

var values := [10, 11];
saved := read_original(var values, values);
/* saved is 10; values is [20, 30]. */
```

The ordinary array input preserves [10, 11] while the var input designates the caller's replaceable [Int; 2] location. From the same initial source value, the explicit temporary form is:

```text
var values := [10, 11];
tmp := values; /* preserves [10, 11] */
saved := read_original(var values, tmp);
/* saved is 10; values is [20, 30]; tmp remains [10, 11]. */
```

A fixed tuple follows the same value rule:

```text
read_original_pair := fn(target: var (:Int, :Int), original: (:Int, :Int)): Int {
    target = (20, 30);
    original.0
}

var pair: (:Int, :Int) = (10, 11);
saved_pair := read_original_pair(var pair, pair);
/* saved_pair is 10; pair is (20, 30). */
```

These alternative examples preserve existing tuple component order, types, and labels, and fixed-array element type and extent. They select no tuple/array type identity or implicit conversion. Ordinary aggregate values and their fixed temporaries remain readable without gaining caller-location or held-data mutation authority. A var input replaces its source location under its declared contract; no extra mut is needed for that whole-location replacement.

Keep callee-first/source-argument evaluation, initialized compatible reads, granted authority, location/lifetime validity, and observable effects. The temporary equivalence uses stable callable names and simple source locals; it is not a general argument-hoisting rewrite. Apply each valid component copy contract, preserving already-copyable reference values/targets/permissions under the selected shallow rule. No deep clone, new reference capability, universal copyability, or physical-copy ABI is selected.

Value semantics can require copying substantial inline data when an old value must survive replacement. Optimizations may avoid physical copies only while preserving that old value and ordinary effects. A future reference-copy or borrowed-view mode must be explicitly stated in its source contract; its syntax remains deferred. Backend indirect passing is not that source-level mode and cannot silently turn these inputs into live views of caller storage.

This selection covers copyable fixed aggregates. Runtime-sized owners, slices/views, and variadic rest retain their separate existing contracts; fixed size does not override a special rest access/retention contract or make a noncopyable component copyable. Reference syntax, memory safety, ownership/lifetimes, alias enforcement, and resources remain explicitly deferred by the user.

## Copyable union and enum values selected

Selected on **2026-10-25**: where a union or enum value and its payload have valid copy contracts, an ordinary argument or corresponding simple fixed temporary preserves the evaluated active member/case and its payload. Replacing the source location afterward does not change that copied value:

```text
var value: String | Int = ?;
value = 42;

tmp: String | Int = value;
value = "ready";

/* tmp still holds the Int value 42. */
/* value now holds the String "ready". */
```

Assume the illustrated value/payload copy contracts are valid. The typed tmp initializer admits the existing Int member and preserves its payload; it does not choose String because of annotation order, initialize an inactive alternative, or select a new zero/default member. The same evaluated-value behavior applies to an ordinary String | Int argument supplied alongside a separate valid var grant to value: the callee may replace the source without retagging the already-evaluated ordinary input.

For a copyable payload enum, copying .Email(payload) preserves its Email case identity and that payload under its valid copy contract. Changing the source later to Sms does not change the copy's case. Distinct cases such as Items(3) and Retries(3) remain distinct even though their payload types and payload values coincide. This describes copying already-valid enum values; it selects no additional case-construction or declaration syntax.

Semantically preserve the active payload without constructing inactive alternatives. Keep ordinary source evaluation and any required valid copy-contract effects. This does not dictate which physical bytes are copied, the discriminator encoding, padding, allocation, or a copy instruction. Already-copyable reference payloads preserve their reference values, targets, and permitted access under the selected shallow rule; referenced objects are not automatically cloned or frozen.

Declared union/enum types, nominal case identities, normalization, type-test/flow rules, and public function result contracts retain their existing meaning. This is a value-preservation rule, not new call-site result narrowing, an implicit unwrap/match, a conversion, or a choice of union-zero state. Keep initialized reads, compatibility, source order, source-location authority, and valid lifetime/copy preconditions. No second write grant or live source-location view is introduced by the ordinary copy.

This assumes an available valid copy contract; it neither classifies all unions/enums as copyable nor chooses copyability eligibility for resource-bearing or flow-refined cases. Reference syntax, memory safety, ownership/lifetimes, alias enforcement, noncopyable resources, and moves remain explicitly deferred. Future reference-copy/borrowed-view source contracts must remain explicit, with their syntax deferred.

## 3. Explicit operation on the caller's location

The selected writable-storage feature covers temporary access to a caller variable or field:

```text
replace := fn (target: var (A | B)) {
    target = new_B()
}

var value: A | B = new_A();
replace(var value);
```

Assignment through target writes back to the supplied location. There is no pointer dereference expression in this design, and target is not an independent local variable that happens to receive a copied value.

A var binding supplies whole-binding replacement authority. A record field requires writable access through its parent and compatibility with every possible target field declaration. Local parameter replacement and held-payload mutation remain different operations; var does not make payload fields mutable on its own.

The granted caller-location access lasts for the call. This does not introduce pointer arithmetic, manual address manipulation, nullable pointers, or a freely escaping reference value. It also does not select an internal representation or a complete lifetime/exclusivity system.

## 4. Is an explicit read-only reference necessary now?

No new public read-only reference form is required merely to complete the selected writable-storage feature or to permit compiler optimization. The current scope can remain ordinary read-only inputs plus explicit caller-replacement parameters.

An explicit read-only borrowed view might later be useful when an API must expose caller identity, non-owning access, a lifetime relationship, or avoidance of ownership transfer. Those are semantic guarantees that an optimization alone cannot provide. Such a feature would need its own justification and contract; no ref T production or read-only storage-handle constructor is selected here.

Implicit argument borrowing for a known signature would also be a distinct language rule. It must not be confused with the backend choosing an efficient physical calling convention.

## 5. The mutable-reference analogy

A temporary writable var resembles the part of a mutable-reference feature that allows a callee to read and replace caller storage. That analogy is useful without adopting a general pointer/reference system.

LiteScript further distinguishes the accepted replacement set. A parameter described as A | var B | C may read A/B/C while accepting only B on writes. Mutating an existing payload's fields still follows mut permissions. Var now expresses replacement in both local declarations and received caller-storage contracts; mut remains separately meaningful for held-data updates.

Complete access compatibility is proposed in [var parameters](slot-parameters.md): the callee must handle every possible read and must not write anything the source location rejects. A single source write grant cannot be duplicated: repeated explicit var arguments to the same local in one call are rejected; see [single source write grant](call-replacement-flow.md#single-source-write-grant-selected). Escaping aliases, general field/index/path overlap, reentrancy, activation timing, and exact mutation observability remain open.

## Reference-language comparison

C# distinguishes a parameter passed by value from one passed by ref. For a class type, passing by value copies the object reference rather than cloning the object; passing by ref additionally permits replacement of the caller's variable. Thus the phrase reference type does not by itself mean a by-reference parameter. This distinction informs LiteScript's review, without selecting classes or general references. Source: [C# parameter passing](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/keywords/method-parameters).

C++ references alias existing objects, and assignment through a reference assigns the referred-to object rather than reseating the reference. This is one comparison for var assignment; C++ reference initialization, lifetime, constness, and value-category rules are separate features. Source: [C++ reference initialization](https://eel.is/c++draft/dcl.init.ref).

Rust's shared and mutable references borrow data. A mutable reference permits writes through borrowed access, with restrictions on simultaneous access and lifetimes. It provides a useful comparison for temporary writable slots, without selecting Rust syntax or the entire ownership model. Source: [Rust references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html).

## Next contract to settle

The ordinary value default is settled: copy semantics and no implicit references. The remaining review must define type-specific copy eligibility/effects and future explicit reference-copy/borrowed-view contracts, not silently choose a different ordinary default. Reference syntax, memory safety, ownership/lifetimes, alias enforcement, resources, and any move feature remain deferred by the user.

No new ref keyword, pointer syntax, or general reference-value system is proposed for adoption in this review.

The historical [caller-location keyword comparison](caller-location-keywords.md) evaluates ref, mut, slot, and mut ref. The later [var qualifier decision](var-access-qualifier.md) replaces slot without selecting a broader reference feature or a local-only header modifier.

Related: [immutability by default](immutability-by-default.md), [functions](functions.md), [mutability](mutability.md), [var qualifier](slot-access-qualifier.md), and [memory and performance](memory-and-performance.md).
