# Future strongly typed panics

Status: **strongly typed panic information requested, the panic channel selected for basic arithmetic faults, and typed target-level `else` recovery selected, 2026-10-20**. Panic/fault events should carry typed categories and appropriate structured information. Capture scope, transfer mechanism, exact operation triggers, payload details, and ABI remain future work.

## Intended categories

Examples of the requested future categories include:

- Null access in an underlying low-level representation or interoperability boundary.
- Division by zero for operations whose numerical contract treats it as a fault.
- Fixed-width addition overflow or another arithmetic operation's unrepresentable result.
- Indexed access outside the valid element bounds, under the asserting-access proposal.

Names such as NullAccess, DivisionByZero, IntegerOverflow, and BoundsFault are explanatory candidates, not selected declarations. Categories can have typed payloads such as index and length, numeric representation and operation kind, or relevant source location. Exact fields, privacy, construction, storage costs, and hierarchy/union structure need design.

## Preserve the existing channel distinction

Panics propagate implicitly without ! or a Result error declaration, as explicitly confirmed by the user. The exact eligible handler scope and transfer/cleanup mechanism remain under review.

Typed panic information remains separate from a returned T ! E outcome. It does not automatically add every possible panic category to every function's declared recoverable error type. The proposed throw error continues to mean return .err(error), not a panic trigger.

Typed target-level `else` filters are selected for local panic recovery. A matching handler handles only its named category; chained filters consume matching members in declaration order, and unmatched panics propagate implicitly after the chain through applicable exited-scope `finally` blocks before an outer matching handler. Cleanup-failure precedence is selected: the pending work failure stays primary and cleanup failures are retained as secondary. Aggregate representation, duplicate-member behavior, supported evaluation scope, transfer implementation, no-handler policy, and any capture-as-Result conversion still require contracts. A future panic-effect declaration or restriction is not adopted by this typing requirement.

If a checked operation converts a selected fault into a returned error, the resulting Result and any outward propagation obey the existing explicitly declared error contract. Which panic information is retained by such conversion remains open.

## Low-level null access

The language still has no universal null/nil/undefined value. A typed event for invalid underlying null access does not make an ordinary User, slice, or other safe value implicitly nullable.

Define detection before an invalid access where possible. An arbitrary foreign-code crash or hardware memory fault cannot simply be promised a safely recoverable typed panic. Low-level handles, references, unsafe facilities, foreign code, and host integration need precise validity and transfer rules before broader guarantees are made.

## Numeric details remain specific

Integer zero division and fixed-width overflow use the panic channel when their operation contract defines them as faults; they do not produce `Result` errors. Floating-point non-finite results and explicitly requested wrapping/saturating operations may have different contracts. The selected channel does not define every operator's fault cases or build-mode behavior. Exact category names and panic payloads remain open; see [arithmetic fault boundaries](arithmetic-faults.md).

Related: [panics](panics.md), [bounds and arithmetic policy](checked-fault-policy.md), [Result](result-and-errors.md), [memory](memory-and-performance.md), and [division](division.md).
