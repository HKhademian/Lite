# Reserved storage without initialization

Status: **value: Type = ? and whole-value first initialization with = selected, 2026-10-19; not implementation-ready**. The marker requests storage for an expected type without zero initialization or declared-default construction. The earlier generic reserve() spelling remains a separate proposal, not a selected synonym. Stack/heap selection, partial/callee construction, allocation failure, ownership, and cleanup remain undecided.

## Selected initialization marker

```text
x: User;       /* implicit zero initialization */
x: User = 0;   /* explicit zero initialization */
x: User = {}  /* declared defaults */
x: User = ?;   /* explicitly uninitialized storage */
```

The expected type supplies the intended layout. The final form is a construction/storage request, not an ordinary expression yielding a valid User. It must not permit ordinary value use before initialization completes. The same direction can cover eligible tuple and aggregate layouts, while their complete type grammar and eligibility rules remain open.

## Earlier function-shaped proposal

```text
x: User = reserve();
x: {u1: User, u2: User} = reserve();
x: (:User, :User, :Teacher, :Student) = reserve();
```

These preserve the user's earlier function-shaped sketches, with tuple component types updated to the selected colon spelling. The expected annotation supplies the intended layout type to the generic operation. The reserve() name, anonymous-record spelling, generic declaration/call grammar, and allocation policy are not finalized by these examples. No explicit generic argument spelling or synonymous reserve() operation is selected.

Records, anonymous record aggregates, and tuples motivate the same operation: reserve enough correctly aligned storage for the complete aggregate. Inline nested records contribute to its layout. Reference-valued fields occupy representation storage but do not cause allocation of their targets.

## Main use case: large arrays and buffers

User clarification, 2026-10-19: bulk element storage, especially large arrays, is the primary motivation. Reserve the storage and populate it directly rather than requiring a preliminary pass that zeroes every element. Array type syntax, dynamic-size allocation APIs, and indexed first-initialization syntax remain open; the single-User examples illustrate the marker rather than its primary workload.

Reservation means storage has been provided. It is not a null pointer, a missing allocation, None, or a recoverable allocation-failure result. No public pointer syntax is implied. Heap allocation failure must have its own eventual contract rather than becoming a readable null inside an ordinary value.

The payload bytes are unspecified. They may contain previous contents or happen to be zero; the language promises neither random generation nor stable readable values. A physically reserved element slot is not yet a valid value of its element type. In particular, an unwritten reference field is not implicitly a valid null reference.

For sequential filling, the conceptual state could be:

```text
reserved storage:        N element slots
initialized prefix:      [0, k)
uninitialized remainder: [k, N)
```

This is explanatory notation, not selected source syntax. An initialization contract must prevent ordinary element reads outside the valid region. A whole fixed-size array cannot be used as an initialized array until its required elements are valid. A future growable collection could instead expose only its initialized prefix as live elements while retaining unused capacity; that needs its own valid collection representation and length/capacity contract.

Reservation bookkeeping, such as storage extent and allocation ownership, is distinct from the unwritten payload. It must remain valid wherever needed to fill or release storage. This does not mean = ? automatically initializes any descriptor fields that are themselves part of the reserved Type.

Sequential construction may track a count/prefix rather than one runtime flag per element. Arbitrary-index construction requires a different coverage proof or tracking strategy; the compiler is not promised to prove arbitrary filling loops. On early exit, any required element cleanup applies only to initialized elements, followed by releasing owned storage under the eventual policy. Exact APIs, checks, and cleanup remain open.

The existing one-time whole-value rule remains useful for deferred immutable values. Bulk filling adds a separate element-initialization contract rather than turning ordinary var/mut parameters into implicit output buffers. See [first initialization](first-initialization.md) and [collections](collections-and-iterators.md).

The later [sequence-family proposal](sequence-types.md) makes this concrete: a list with a valid descriptor can expose zero initialized elements while owning large spare capacity. An ordinary slice would expose only live initialized elements. A compile-time fixed array can reserve its full known inline layout with = ?; reserving an uninitialized runtime owner descriptor alone cannot infer or allocate an arbitrary requested element count. Names, allocation APIs, and these collection types remain proposals; see [lists](lists.md), [arrays](arrays.md), and [slices](slices.md).

## Shorthand comparison and decision

The user compared these forms and subsequently approved the first as the initialization-marker direction. The remaining three are unselected alternatives, not supported synonyms:

```text
x: User = ?;
x: User = {?}
x ?= User;
x := ?User;
```

### Expected-type marker: x: User = ?

This is the selected surface direction. It keeps the ordinary typed declaration and changes only its initialization request. The expected type supplies layout, so the same marker can cover records, tuples, scalars, and other eligible layouts once their contracts are defined. Omission, 0, {}, and ? visibly distinguish implicit zero, explicit zero, declared defaults, and no initialization.

The question mark denotes a construction/storage marker, not a usable unknown value or optional User. The selected starting context is a simple typed value declaration. Broader contexts remain open. It cannot be passed wherever an ordinary User expression is accepted merely because it appears after =.

### Record-shaped marker: x: User = {?}

This resembles the existing record-initializer form. The extra braces need a specific purpose: the exact syntax could mean reserve the whole aggregate or leave selected/remaining fields uninitialized during partial construction. Those are different contracts. Requiring record-shaped braces for tuples and scalars would also need explanation.

Do not accept both ? and {?} as synonyms just to postpone this choice. If partial-initializer markers are later useful, define their field/default behavior separately; no mixed field-initializer syntax is selected here.

### Declaration operator: x ?= User

This is compact but introduces another declaration operator specifically for reservation. It also resembles an op= update, while its right-hand side supplies a type rather than a replacement value. The existing := definition and = assignment distinction becomes harder to teach. Recommend against this alternative. The current operators document assigns ?= no meaning, so this is a readability/consistency concern rather than a collision with a selected operator.

### Typed reservation expression: x := ?User

This retains the ordinary inferred-binding operator and supplies the layout type on the right. It could avoid repeating the name in a typed declaration, but needs a new type-directed reservation-expression rule: ?User cannot simply produce an already valid User. Composite tuple/record operands, grouping, prefix precedence, and permitted expression positions require formalization.

It is a credible alternative if one self-contained typed reservation form is preferred. Supporting it alongside an expected-type ? marker needs a demonstrated use, rather than adding both immediately.

### Decision and common boundaries

Use x: User = ? for explicit uninitialized storage. Preserve reserve() and the other punctuation forms as historical proposals; this selection does not add them as synonyms.

Every candidate retains the same initialization-state, lifetime, ownership, and cleanup obligations below. None alone selects stack versus heap, an allocator, or allocation-failure handling. The punctuation choice must not redefine ordinary zero/default initialization or make uninitialized storage readable.

## Distinction from ordinary initialization

```text
x: User;             /* selected: implicit valid all-zero value */
x: User = 0;         /* selected: explicit valid all-zero value */
x: User = {}        /* selected: declared-default construction */
x: User = ?;         /* selected marker: storage exists; payload not initialized */
```

Explicit reservation bypasses both zero filling and declared field defaults. It does not produce null, None, an arbitrary enum case, or a valid User merely because the storage has the right size. It also does not first construct a User and then discard its contents. Ordinary omitted initializers retain their selected zero behavior.

## Type layout versus initialization state

Recommendation: preserve User as the intended value/layout type while tracking whether its storage is initialized separately. Before initialization completes, reject ordinary reads, field reads, copying as User, pattern matching, method calls requiring User, and passing/returning it as a valid User. This is an initialization-state contract, not another alternative in a User union or a universal nullable state.

An ordinary generic function returning T promises a valid T. Consequently, the earlier reserve() proposal cannot simply return arbitrary bytes through that ordinary contract. The selected ? marker requires compiler-recognized initialization-state semantics, though the exact tracking representation remains open. A function-shaped facility or explicit reserved-storage result type would need a separate contract if introduced. The intended expected type supplies layout; it does not prove initialized validity.

Reading a tuple or enum discriminator also requires valid initialization. Every type has a valid all-zero value, but reserved storage deliberately skips that initialization. Arbitrary uninitialized bytes do not become a readable value merely because all-zero bytes would be valid. Reservation still needs the construction-state rules.

## First initialization, later mutation

Initializing reserved fields for the first time must be distinguished from assignment to an existing live value. A fixed x could become a fully initialized immutable User without implying that it may be reassigned afterward. Var and mut retain their established replacement and held-data permissions once a value exists.

Whole-value x = value is selected as first initialization without var when the compiler proves x has not already been initialized on any reaching path. Multiple assignment sites in mutually exclusive branches are allowed, but every path reaching a value use must have initialized x. Later replacement requires var. No fallback zero value is supplied to a missing branch. See [first initialization](first-initialization.md).

Before that first write, the reserved binding permits whole-value initialization but no ordinary reads. Fixed storage is single-write; var storage is multi-write. In every currently selected case, a successful whole-value write makes the binding readable. Fixed storage then has no remaining write permission; var storage retains replacement permission and stays readable after later successful writes. Union read-flow rules apply after initialization and update the readable type without changing the write allowance. See the [single-write and multi-write examples](first-initialization.md#writable-before-initialization-readable-afterward).

Field/element construction, initializer callbacks, and initialization through a callee remain separate decisions. No init/finalize keyword is selected. An ordinary function named reserve cannot silently grant first-initialization semantics outside the selected marker contract.

If field-by-field construction is supported, track which fields are initialized on every control-flow path. A complete value requires every required field and the type's validity contract, including any cross-field invariant. Partially written record storage is not automatically a usable User. Whether initialized subfields can be accessed during construction requires a separate rule.

## Stack and heap

The same expected type can describe storage reserved on the stack or heap, but the selection mechanism remains open: explicit operations, an allocation-policy argument, or a context/inference rule are candidates. No particular spelling, default allocator, or automatic escape policy is selected.

Stack storage must remain alive for every use; returning access to an expired reserve-call frame cannot implement the proposal. Caller-provided destination construction or another valid lifetime strategy would be needed. Heap storage requires ownership and release rules. Heap placement does not silently change an inline record-valued field into a reference field or alter value-copy semantics.

Allocation failure and fallible construction need separate contracts. This proposal selects neither a Result error channel nor a panic policy for them.

## Partial construction and cleanup

Recommendation: on abandonment or early exit, clean up only parts already validly initialized and release any owned reservation under its allocation policy. Never run a User destructor over unwritten storage or overwrite a live resource as though it were uninitialized. The exact cleanup, overwrite, rollback, and panic rules remain open.

The compiler may be able to enforce initialization facts statically; no universal runtime bitmap or zero-cost implementation is promised. Allocator/ownership metadata is separate from initializing the reserved payload. Skipping initialization is an explicit performance facility, not an established benchmark result.

## Decisions to revisit

- Whether any separate function-shaped facility is needed alongside the selected ? initialization marker, and its storage/result contract.
- Expected-type inference, eligible layouts, and explicit generic arguments when inference is unavailable.
- Stack/heap choice, allocation failure, ownership, escape, and lifetime rules.
- Bulk array/element initialization syntax, initialized-prefix or arbitrary-index tracking, caller construction contracts, capability grants, and complete control-flow proofs beyond the selected whole-value first = rule.
- Partial cleanup, repeated initialization, and validation of complete values.

Related: [zero initialization](zero-initialization.md), [record creation](record-initialization.md), [declarations](declarations-and-assignment.md), [types and inference](types-and-inference.md), [records](records.md), and [memory and performance](memory-and-performance.md).
