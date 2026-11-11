# INV-055 — FVP runtime-owner decision boundary

Status: recorded (copy-first direction and bounded FVP slice approved; broader owner contracts open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-055](TOPICS.md#inv-055)
Baseline: `2139003`, tagged igniter-v0.1.0-alpha.13

Subsequent status, **2026-10-31**: the user explicitly approves the temporary
textLength/textAt/textSlice helpers after the focused review. Earlier pending
consent statements in this dated increment describe its original baseline, not
the current status. See [INV-016 approval](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

## Concrete need

The interpreter now carries fixed arrays of named token tuples. A retained token
sequence whose length is learned during input would need a different construction
path: existing fresh known-size literals infer fixed arrays, and var permits
whole-binding replacement without changing the fixed extent or granting growth.

Growable storage is one possible next FVP direction, not a prerequisite proved
necessary for self-hosting. Streaming or a deliberately bounded buffer could be
investigated separately. This review does not select those alternatives or a
compiler architecture. The existing scanning example's experimental text helpers
still await consent independently of this storage question.

## What is selected, and what is open

The selected [collection families](../../docs/sequence-types.md) distinguish fixed
arrays, runtime-sized fixed owners, growable list owners and views. Known-size
fresh literals infer fixed arrays. Explicit mut access alone does not add growth.

[Ordinary value transfers](../../docs/parameter-values-and-slots.md#general-copy-default-selected)
have copy semantics with no implicit references or moves. That rule explicitly
leaves type-specific resource copy eligibility open.

The user clarifies the [List direction](../../docs/lists.md#copy-and-ownership-decision)
on 2026-10-31: focus on copies and compiler/post-compilation optimizations now;
explicit noncopying modes come later. For the current FVP sequence values with
copyable elements, preserve the ordinary copied sequence value. Do not block this
work on designing a noncopyable owner or explicit clone/move/borrow surface.
A host array reference cannot silently turn that copy into shared mutable data.
The subsequent approved FVP slice adopts builtin List<T> spelling and temporary
end-operation/failure handling. General generics, capacity helpers/APIs and
permanent allocation policy remain proposals.
[End-operation names](../../docs/sequence-end-operations.md) are now selected;
complete signatures and placement still need review.

At this review baseline, inventing a constructor, helper or List spelling would
have exceeded selected scope. The subsequent concrete slice received explicit
consent and now supplies bounded runtime list support; this owner-review note
itself remains contract review.

## Copy-first FVP direction clarified

Use a behavior probe without inventing syntax: create a growable list containing
one scalar element; initialize a second binding from it through an ordinary
value read; then change an element or append through authorized mutable access
to the original. Under the clarified current focus, the second binding preserves
its original sequence. Owner noncopyability and explicit noncopying operations
are later investigations, not prerequisites to this FVP copy behavior.

The observable model is a copy; it does not require a physical allocation or copy
instruction at every transfer. Compiler and post-compilation optimizations may
remove or combine work only while preserving evaluated values, effects, failures
and all other selected behavior. This does not select copy-on-write, shared
ownership, a backend optimization pass, or a zero-copy guarantee.

Silent shared mutable aliases and implicit moves are not fallback implementations
of the existing ordinary-copy default.
Reference-valued elements, if admitted later, retain their own copy contracts;
an independent sequence does not imply a recursive clone of arbitrary objects.

Next settle the concrete type/construction/growth surface and
bounded allocation behavior before implementing it. Keep views, generalized
protocols, capacity tuning and native layout outside a first implementation
unless an actual example requires their design.

The [bounded naming decision](INV-055-fvp-list-operations.md) selects the
push_front/push_back/pop_front/pop_back family. It does not adopt List<Int>
generic grammar or a construction/failure API.

The [concrete FVP slice](INV-055-fvp-list-slice.md) subsequently received separate
explicit consent and implements typed list construction, end operations and
temporary terminal faults. Its type spelling/failure choices were not inferred
from the earlier naming approval.

## Evidence and handoff

This note began as a repository-contract review at alpha.13, with 108 passing
interpreter groups and examples 010–012, none demonstrating growth. That was not
runtime list validation. The later approved slice now provides separate runtime
evidence at alpha.14 with 120 interpreter groups and example 013; see its note.
The owner-review-only commits did not create an igniter release tag.

The copy/noncopying question above is resolved for the current focus. The
subsequent approved slice removes the concrete FVP construction/failure blocker.
Continue under the [automatic workflow](README.md#automatic-progression-within-selected-contracts)
inside that selected scope. Broader native owner representation, capacity,
advanced aliases, recovery and generic design remain separate investigations.
