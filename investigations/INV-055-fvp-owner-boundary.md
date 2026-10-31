# INV-055 — FVP runtime-owner decision boundary

Status: open (copy-first FVP direction clarified; construction/growth API unresolved)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-055](TOPICS.md#inv-055)
Baseline: `2139003`, tagged igniter-v0.1.0-alpha.13

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

The selected [collection families](../docs/sequence-types.md) distinguish fixed
arrays, runtime-sized fixed owners, growable list owners and views. Known-size
fresh literals infer fixed arrays. Explicit mut access alone does not add growth.

[Ordinary value transfers](../docs/parameter-values-and-slots.md#general-copy-default-selected)
have copy semantics with no implicit references or moves. That rule explicitly
leaves type-specific resource copy eligibility open.

The user clarifies the [List direction](../docs/lists.md#copy-and-ownership-decision)
on 2026-10-31: focus on copies and compiler/post-compilation optimizations now;
explicit noncopying modes come later. For the current FVP sequence values with
copyable elements, preserve the ordinary copied sequence value. Do not block this
work on designing a noncopyable owner or explicit clone/move/borrow surface.
A host array reference cannot silently turn that copy into shared mutable data.
List's generic grammar, helper names, capacity APIs and allocation policy remain
proposals.
[End-operation spellings](../docs/sequence-end-operations.md) remain under review
even though the user has requested push/pop behavior.

Thus inventing a constructor, append helper or public List type spelling now
would exceed the automatic selected-scope authorization.
No language implementation is added by this investigation.

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

The next [bounded naming review](INV-055-fvp-list-operations.md) recommends the
already proposed push_front/push_back/pop_front/pop_back family. It leaves the
names unselected pending consent and does not adopt List<Int> generic grammar.

## Evidence and handoff

This is a repository-contract review, not runtime validation of lists. The last
delivered interpreter has strict checking, 108 passing test groups and runnable
examples 010–012. None demonstrates runtime growth. This note and the owning
reference/catalog updates are committed atomically without a new igniter tag.

The copy/noncopying question above is resolved for the current focus. The
[automatic workflow](README.md#automatic-progression-within-selected-contracts)
now stops at the remaining concrete construction/growth surface and bounded
allocation behavior. Resume owner implementation after those needed decisions;
do not substitute a temporary helper or choose from provisional generic syntax
on the user's behalf. No new igniter tag or runtime claim follows from this
documentation clarification.
