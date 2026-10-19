# Reserved storage without initialization

Status: **user-proposed direction, 2026-10-19; not selected syntax or implemented behavior**. A generic operation provisionally named reserve() would reserve storage for an expected type without zero initialization or declared-default construction. Stack/heap selection, initialization operations, allocation failure, ownership, and cleanup remain undecided.

## Proposed surface

```text
x: User = reserve();
x: {u1: User, u2: User} = reserve();
x: (User, User, Teacher, Student) = reserve();
```

These are the user's sketches. The expected annotation supplies the intended layout type to the generic operation. The anonymous-record spelling, generic declaration/call grammar, and allocation policy are not finalized by these examples. No explicit generic argument spelling is selected.

Records, anonymous record aggregates, and tuples motivate the same operation: reserve enough correctly aligned storage for the complete aggregate. Inline nested records contribute to its layout. Reference-valued fields occupy representation storage but do not cause allocation of their targets.

## Candidate shorthand spellings

The user also proposed these alternatives; none is selected:

```text
x: User = ?;
x: User = {?};
x ?= User;
x := ?User;
```

### Expected-type marker: x: User = ?

This is the leading punctuation recommendation. It keeps the ordinary typed declaration and changes only its initialization request. The expected type supplies layout, so the same marker could work for records, tuples, scalars, and other eligible layouts. Omission, 0, {}, and ? would visibly distinguish implicit zero, explicit zero, declared defaults, and no initialization.

The question mark would denote a construction/storage marker, not a usable unknown value or optional User. Its legal contexts and grammar still need a decision. In particular, it cannot be passed wherever an ordinary User expression is accepted merely because it appears after =.

### Record-shaped marker: x: User = {?}

This resembles the existing record-initializer form. The extra braces need a specific purpose: the exact syntax could mean reserve the whole aggregate or leave selected/remaining fields uninitialized during partial construction. Those are different contracts. Requiring record-shaped braces for tuples and scalars would also need explanation.

Do not accept both ? and {?} as synonyms just to postpone this choice. If partial-initializer markers are later useful, define their field/default behavior separately; no mixed field-initializer syntax is selected here.

### Declaration operator: x ?= User

This is compact but introduces another declaration operator specifically for reservation. It also resembles an op= update, while its right-hand side supplies a type rather than a replacement value. The existing := definition and = assignment distinction becomes harder to teach. Recommend against this alternative. The current operators document assigns ?= no meaning, so this is a readability/consistency concern rather than a collision with a selected operator.

### Typed reservation expression: x := ?User

This retains the ordinary inferred-binding operator and supplies the layout type on the right. It could avoid repeating the name in a typed declaration, but needs a new type-directed reservation-expression rule: ?User cannot simply produce an already valid User. Composite tuple/record operands, grouping, prefix precedence, and permitted expression positions require formalization.

It is a credible alternative if one self-contained typed reservation form is preferred. Supporting it alongside an expected-type ? marker needs a demonstrated use, rather than adding both immediately.

### Recommendation and common boundaries

Prefer x: User = ? if choosing a compact contextual marker. Keep reserve() as the readable baseline while evaluating whether punctuation is worthwhile. This recommendation does not select either spelling or promise that both remain synonyms.

Every candidate retains the same initialization-state, lifetime, ownership, and cleanup obligations below. None alone selects stack versus heap, an allocator, or allocation-failure handling. The punctuation choice must not redefine ordinary zero/default initialization or make uninitialized storage readable.

## Distinction from ordinary initialization

```text
x: User;             /* selected: implicit valid semantic zero */
x: User = 0;         /* selected: explicit valid semantic zero */
x: User = {};        /* selected: declared-default construction */
x: User = reserve(); /* proposed: storage exists; payload not initialized */
```

Reserve would bypass both zero filling and declared field defaults. It does not produce null, None, an arbitrary enum case, or a valid User merely because the storage has the right size. It also does not first construct a User and then discard its contents. Ordinary omitted initializers retain their selected zero behavior.

## Type layout versus initialization state

Recommendation: preserve User as the intended value/layout type while tracking whether its storage is initialized separately. Before initialization completes, reject ordinary reads, field reads, copying as User, pattern matching, method calls requiring User, and passing/returning it as a valid User. This is an initialization-state contract, not another alternative in a User union or a universal nullable state.

An ordinary generic function returning T promises a valid T. Consequently, reserve cannot simply return arbitrary bytes through that ordinary contract. To keep the proposed surface, it would need compiler-recognized construction/storage semantics. An explicit reserved-storage result type is another possible design, but neither approach is selected. The intended expected type supplies layout; it does not prove initialized validity.

Reading a tuple or enum discriminator also requires valid initialization. A type lacking a valid zero could still be constructed through reserved storage if its layout can be reserved and a valid initialization operation exists. Reservation alone never proves that operation possible.

## First initialization, later mutation

Initializing reserved fields for the first time must be distinguished from assignment to an existing live value. A fixed x could become a fully initialized immutable User without implying that it may be reassigned afterward. Var and mut retain their established replacement and held-data permissions once a value exists.

The syntax and permission for first initialization are open. Do not assume the sketches select x = value, x.field = value, an initializer callback, or an init/finalize keyword. In particular, today's fixed-binding assignment rule must not silently be bypassed by an ordinary function call named reserve.

If field-by-field construction is supported, track which fields are initialized on every control-flow path. A complete value requires every required field and the type's validity contract, including any cross-field invariant. Partially written record storage is not automatically a usable User. Whether initialized subfields can be accessed during construction requires a separate rule.

## Stack and heap

The same expected type can describe storage reserved on the stack or heap, but the selection mechanism remains open: explicit operations, an allocation-policy argument, or a context/inference rule are candidates. No particular spelling, default allocator, or automatic escape policy is selected.

Stack storage must remain alive for every use; returning access to an expired reserve-call frame cannot implement the proposal. Caller-provided destination construction or another valid lifetime strategy would be needed. Heap storage requires ownership and release rules. Heap placement does not silently change an inline record-valued field into a reference field or alter value-copy semantics.

Allocation failure and fallible construction need separate contracts. This proposal selects neither a Result error channel nor a panic policy for them.

## Partial construction and cleanup

Recommendation: on abandonment or early exit, clean up only parts already validly initialized and release any owned reservation under its allocation policy. Never run a User destructor over unwritten storage or overwrite a live resource as though it were uninitialized. The exact cleanup, overwrite, rollback, and panic rules remain open.

The compiler may be able to enforce initialization facts statically; no universal runtime bitmap or zero-cost implementation is promised. Allocator/ownership metadata is separate from initializing the reserved payload. Skipping initialization is an explicit performance facility, not an established benchmark result.

## Decisions to revisit

- Reserve spelling versus punctuation shorthand, and ordinary library operation versus compiler-recognized storage/construction operation.
- Expected-type inference, eligible layouts, and explicit generic arguments when inference is unavailable.
- Stack/heap choice, allocation failure, ownership, escape, and lifetime rules.
- Whole-value or field-by-field initialization syntax, capability grants, and completion proofs.
- Partial cleanup, repeated initialization, and validation of complete values.

Related: [zero initialization](zero-initialization.md), [record creation](record-initialization.md), [declarations](declarations-and-assignment.md), [types and inference](types-and-inference.md), [records](records.md), and [memory and performance](memory-and-performance.md).
