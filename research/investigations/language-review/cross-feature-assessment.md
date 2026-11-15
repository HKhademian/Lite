# Cross-feature assessment and review priorities

Status: **analysis and recommendations, 2026-11-15; no new language decision**.
This connects the ten reviews to the user's goals: Lite should remain small and
light, without a GC or runtime footprint, and aim to compete with or exceed C
on suitable complex applications. [Compiler baseline](compiler-baseline.md)
separates these goals from what the current TS/Node path actually demonstrates.
The goal is not evidence of native performance, and no preference below changes
an existing selection without a separate decision.

## What the current evidence says

The current compiler executes a useful bounded TS subset: verified numeric
operations, flat tuple cases, fixed arrays, list operations, control flow,
function recursion, module consumers and a construct-level `finally` scenario.
The exact tested record, enum, general distinct type, union, generic function,
fallible signature, and subject-match programs reject. An accepted local capture
is not proof of safe escaping closures. The verifier passes 86 scenarios, not
all conceivable cases. Native output, native self-hosting, no-GC execution,
zero-runtime deployment, and C-relative program performance remain unproven.
Each [topic review](README.md#review-notes) identifies its narrower evidence.

## Feature dependencies and practical leverage

1. **Identity → conversions → aggregate contracts.** Distinct IDs and nominal
   records need type identity before conversion, union membership, generic
   compatibility, zero, equality and public signatures can be precise. Static
   identity can in principle erase entirely, but constrained values must have a
   valid creation path and reconcile with the selected all-zero rule.
2. **Ownership and access → collections and closures.** A growable list, a
   borrowed slice and a retained closure all need answers to owner lifetime,
   copies, writable aliases, moves, failure cleanup and escape. These questions
   determine whether a 2 GB argument can be explicitly passed without a copy;
   leaving optimization to the compiler is a different guarantee.
3. **Representation → patterns and outcomes.** Unions and enum cases need
   observable alternative identity; patterns and failure recovery consume or
   inspect that identity. Inline tags, niche encoding and specialization have
   different size and branch costs. A selected physical layout must not make
   safe narrowing or resource cleanup impossible.
4. **Failure behavior → control flow and resources.** Every return, break,
   panic and partial construction interacts with cleanup. The currently selected
   ability to retain secondary cleanup failures has a storage question when
   occurrences are unbounded. If absolute allocation-free behavior is required
   in those cases, compare bounded policies, caller-provided storage and a
   possible revision to retention semantics explicitly; none is selected here.
5. **Generic requirements → APIs, code size and optimization.** A provider-
   generic sum can be as direct as a hand-written loop if specialization and
   bounds proofs work; that is a hypothesis to test. Specializing many types or
   extents can increase binary size and build time. Public interfaces, module
   boundaries and separate compilation determine what can be optimized.
6. **Compile-time execution → modules and build reproducibility.** The selected
   direction includes compile-time effects, not just pure folding. File or
   network access moves work out of runtime but creates build-input tracking,
   cache, reproducibility and authorization questions. Static data emitted by
   the computation still occupies artifact space.

## Worked design traces

### A. Branded ID in a record and a union

Suppose `UserID` is distinct from String and `User` contains an ID. The user
distinguishes a fresh string-like literal shaped by a destination from an
established String or another distinct value, whose conversion into UserID
requires an explicit operation. Compare other expression contexts and the
illustrative `cast<UserID>(raw)` without assuming final syntax. Next ask whether an empty String is a valid zero
UserID, whether a `UserID | String` retains which alternative is active, and
whether record construction or matching can bypass validation. This trace
belongs primarily to [types](01-core-types.md), with [records](03-records.md)
and [enums/variants](04-enums.md) providing follow-up cases.

### B. A 2 GB list read by `sum`

A normal value argument can promise independent observable behavior while the
compiler removes a copy when safe; that does not promise no copying. A requested
read-only view can avoid copying elements but must remain valid if the owner is
mutated, reallocated or destroyed. A static checker could reject conflicting
access; another mechanism could carry runtime state or change ownership. Each
has ergonomics, memory, compile-time and execution tradeoffs. Returning that
view extends the problem beyond the call. See [bindings](02-bindings.md),
[functions](05-functions.md) and [collections](07-collections.md).

### C. A loop processes fallible resource-owning records

One iteration constructs a record, a later field fails, and cleanup of a
previously initialized field also fails. Track which fields exist, which
cleanups run and in what order, which failure remains primary and where the
secondary failure is stored. Then compare `continue`, `break`, `return`, and a
panic. Static proof may eliminate state for simple scopes; complex paths still
need a sound design. The selected failure precedence is not permission to drop
secondary failures to meet a performance goal. See [records](03-records.md),
[control flow](06-control-flow.md) and [cleanup](08-failure-cleanup.md).

### D. Generic sum across module boundaries

A public `sum` is called with a fixed array and a view. Compare independently
specialized loops, a shared loop taking pointer/length-like information, and an
erased callable provider. Measure code size, bounds checks, vectorization,
dispatch, and compile/link time. The fastest implementation may vary with data
size and target, and an advanced C implementation can use the same algorithmic
ideas. See [collections](07-collections.md), [modules](09-modules.md) and
[generics](10-generics-comptime.md).

## Earlier suggested discussion checkpoints

These checkpoints predate the agreed [onion review method](review-method.md).
Use them as topic-specific prompts in the appropriate layer, not as a reason to
finish one topic's detailed decisions before the other topics receive the same
level of review.

Keep the agreed topic order; these are discussion checkpoints, not a new
implementation plan or approved prioritization:

1. For **types**, settle distinct identity, conversion contexts, literal
   handling and the relationship of records and arrays to tuples. Make zero and
   constraints visible while deferring their complete solution if necessary.
2. For **bindings**, determine the semantics of value copies, explicit no-copy
   reads, writable access and escape. Use a small set of lifetime/resource
   examples rather than selecting a full memory mechanism prematurely.
3. For **records and enums**, reuse the above decisions for identity, field or
   case access, defaults/zero, construction, matching and owned payloads.
4. For **functions, control and collections**, test the decisions against
   callbacks, argument evaluation, patterns, loops, views and growth.
5. For **failures, modules and generics**, revisit the full dependency graph:
   cleanup under every exit, public boundaries and specialization/build effects.

A blocker may justify a short prerequisite discussion out of order. Record the
question in its owning topic and return to the active case; do not silently
select a workaround. When a selected rule conflicts with the lightweight goal,
show retaining, revising or replacing it and concrete consequences.

## Proposed evidence for a native milestone

Before claiming no-GC or a particular footprint, specify target/platform,
linking and whether the claim includes OS/libc support, startup code, error
handling, allocator, generated metadata and transitive libraries. Examine a
minimal program and incremental feature deltas. A self-hosting fixed point
proves a bounded rebuild property, not a no-runtime or performance property.

Before claiming C competitiveness, measure correct real tasks (e.g. parsing,
collections, text processing and a multi-module workload) and small isolating
cases. Use equivalent algorithms, input distributions, observable checks,
allocator and safety policies, compiler optimization, target hardware and
link settings. Include a strong idiomatic C version and, where useful, an
algorithmically improved version for both. Record wall-clock distributions,
throughput, tail latency, startup, compile time, executable plus dependencies,
allocations, peak memory and worst-case failure behavior. Preserve generated
artifacts and source identities. Use disassembly or profiling to explain a
result, not to replace end-to-end measurements. No such C comparison was run
for this review.
