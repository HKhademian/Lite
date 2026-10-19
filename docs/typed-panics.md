# Future strongly typed panics

Status: **future direction requested by the user, 2026-10-19**. Panic/fault events should carry strongly typed categories and appropriate structured information. The later [shared expression recovery](expression-recovery.md) direction selects attached else as its surface. Capture scope, transfer mechanism, exact operation classification, and ABI remain future work.

## Intended categories

Examples of the requested future categories include:

- Null access in an underlying low-level representation or interoperability boundary.
- Division by zero for operations whose numerical contract treats it as a fault.
- Fixed-width addition overflow or another arithmetic operation's unrepresentable result.
- Indexed access outside the valid element bounds, under the asserting-access proposal.

Names such as NullAccess, DivisionByZero, IntegerOverflow, and BoundsFault are explanatory candidates, not selected declarations. Categories can have typed payloads such as index and length, numeric representation and operation kind, or relevant source location. Exact fields, privacy, construction, storage costs, and hierarchy/union structure need design.

## Preserve the existing channel distinction

Typed panic information remains separate from a returned T ! E outcome. It does not automatically add every possible panic category to every function's declared recoverable error type. The proposed throw error continues to mean return .err(error), not a panic trigger.

Typing alone did not select recovery. The later else direction requests typed panic recovery, while its supported scope, transfer mechanism, cleanup, and any capture-as-Result conversion still require contracts. A future panic-effect declaration or restriction is not adopted by this typing requirement.

If a checked operation converts a selected fault into a returned error, the resulting Result and any outward propagation obey the existing explicitly declared error contract. Which panic information is retained by such conversion remains open.

## Low-level null access

The language still has no universal null/nil/undefined value. A typed event for invalid underlying null access does not make an ordinary User, slice, or other safe value implicitly nullable.

Define detection before an invalid access where possible. An arbitrary foreign-code crash or hardware memory fault cannot simply be promised a safely recoverable typed panic. Low-level handles, references, unsafe facilities, foreign code, and host integration need precise validity and transfer rules before broader guarantees are made.

## Numeric details remain specific

Integer zero division, floating-point nonfinite results, fixed-width overflow, and explicitly requested wrapping/saturating operations may have different contracts. Listing intended panic categories does not select the numerical policy of every operator or build mode. Ordinary arithmetic and its explicit checked forms still need a coherent final policy.

Related: [panics](panics.md), [bounds and arithmetic policy](checked-fault-policy.md), [Result](result-and-errors.md), [memory](memory-and-performance.md), and [division](division.md).
