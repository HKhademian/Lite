# Future strongly typed panics

Status: **strongly typed panic information requested, the panic channel selected for basic arithmetic faults, and typed target-level `else` recovery selected, 2026-10-20**. Panic/fault events should carry typed categories and appropriate structured information. Operation-specific and explicit whole-block recovery were selected 2026-10-26: argument panics bypass the outer operation handler, while an explicit block covers supported typed panics across its executed contents and synchronous calls. Operation fault attribution, block/chain integration, transfer mechanism, triggers, payload details, and ABI remain future work.

## Intended categories

Examples of the requested future categories include:

- Null access in an underlying low-level representation or interoperability boundary.
- Division by zero for operations whose numerical contract treats it as a fault.
- Fixed-width addition overflow or another arithmetic operation's unrepresentable result.
- Indexed access outside the valid element bounds, under the asserting-access proposal.

Names such as NullAccess, DivisionByZero, IntegerOverflow, and BoundsFault are explanatory candidates, not selected declarations. Categories can have typed payloads such as index and length, numeric representation and operation kind, or relevant source location. Exact fields, privacy, construction, storage costs, and hierarchy/union structure need design.

## Preserve the existing channel distinction

Panics propagate implicitly without ! or a Result error declaration, as explicitly confirmed by the user. An operation handler covers only its defined faults, excluding evaluated argument/operand panics. An explicit `{ ... } else { ... }` block covers supported typed panics from its contents and synchronous calls. Complete chain/attachment rules and the transfer/cleanup mechanism remain under review.

Typed panics remain a separate implicit channel by default, with no automatic addition to a function's E. [LP-0009 r1](proposals/LP-0009-flat-failure-capture.md) now selects explicit postfix ? capture as flat T ! (E | Panic), or T ! Panic for an ordinary T operand. Panic admits unknown concrete categories while retaining enough category/payload identity for specific recovery. Error/Panic/Failure select returned errors, panics, and both; ...fails: Failure binds an occurrence-ordered [Failure]. Detailed category schemas, hierarchy, payload fields, and origin inspection remain open. LP-0014 now makes raise a directed exit for Error and Panic alike: default nearest function/closure, or explicit enclosing-block target. Channels remain distinct; generated/live operation panics retain ordinary implicit propagation. The earlier throw shorthand remains unselected history. Eligible ordinary error inference excludes panics; custom category declaration/conformance syntax remains open.

Typed target-level `else` filters are selected for local panic recovery. A matching handler handles only its named category; chained filters consume matching members in declaration order, and unmatched live panics propagate implicitly after the chain through applicable exited-scope `finally` blocks before an outer matching handler. Cleanup-failure precedence is selected: the pending work failure stays primary and cleanup failures are retained as secondary. Aggregate representation, repeated-type combined-pattern behavior, operation fault attribution, block/chain integration, transfer implementation, and no-handler policy remain implementation/design questions. Captured unmatched panics remain stored until handled or explicitly forwarded. Explicit capture is now selected in LP-0009; ! forwarding of retained panic occurrences is selected in LP-0010, preserving their panic channel. LP-0018 now explicitly prohibits checked live-panic effect declarations. Concrete category types, values, and matching remain selected; non-exhaustive documentary known-fault annotations remain under investigation.

If a checked operation converts a selected fault into a returned error, the resulting Result and any outward propagation obey the existing explicitly declared error contract. Which panic information is retained by such conversion remains open.

## Categories without checked effect lists

[LP-0018 r1](proposals/LP-0018-implicit-panics-without-effect-declarations.md) keeps live panics implicit and forbids requiring exhaustive panic lists in callable types. Array access and arithmetic can have typed failure categories without every caller naming them transitively. Explicit capture exposes those newly captured live occurrences through broad Panic; matching can recover their concrete category/payload. Literal panic-bearing Result outputs remain first-class data, including function returns. Documentary known-fault lists are non-exhaustive information only; exact format/tooling remains open and they cannot narrow callable types or prove other panics impossible.

## Low-level null access

The language still has no universal null/nil/undefined value. A typed event for invalid underlying null access does not make an ordinary User, slice, or other safe value implicitly nullable.

Define detection before an invalid access where possible. An arbitrary foreign-code crash or hardware memory fault cannot simply be promised a safely recoverable typed panic. Low-level handles, references, unsafe facilities, foreign code, and host integration need precise validity and transfer rules before broader guarantees are made.

## Numeric details remain specific

Integer zero division and fixed-width overflow use the panic channel when their operation contract defines them as faults; they do not produce `Result` errors. Floating-point non-finite results and explicitly requested wrapping/saturating operations may have different contracts. The selected channel does not define every operator's fault cases or build-mode behavior. Exact category names and panic payloads remain open; see [arithmetic fault boundaries](arithmetic-faults.md).

Related: [panics](panics.md), [bounds and arithmetic policy](checked-fault-policy.md), [Result](result-and-errors.md), [memory](memory-and-performance.md), and [division](division.md).
