# INV-055 — FVP runtime-owner decision boundary

Status: open (reviewed; user decision required before implementation)
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

The [List contract](../docs/lists.md#copy-and-ownership-decision) does not yet
choose whether this owner is ordinarily copyable, independently cloned, shared
under an explicit contract, or subject to future move/borrow modes. A host array
reference cannot settle this public contract. The same document says List's
generic grammar, helper names, capacity APIs and allocation policy are proposals.
[End-operation spellings](../docs/sequence-end-operations.md) remain under review
even though the user has requested push/pop behavior.

Thus implementing a constructor, append helper, public List type spelling, or
owner sharing rule now would exceed the automatic selected-scope authorization.
No language implementation is added by this investigation.

## First decision to resolve: ordinary copies

Use a behavior probe without inventing syntax: create a growable list containing
one scalar element; initialize a second binding from it through an ordinary
value read; then change an element or append through authorized mutable access
to the original. Should the second binding preserve its own original sequence,
or should the ordinary owner-copy operation be rejected?

- A copyable independent-value contract would preserve the second sequence.
  Its physical implementation and allocation-failure handling need separate
  care; it need not prescribe copying instructions at every read.
- A noncopyable-owner contract would reject the ordinary transfer until an
  explicitly selected cloning/moving/borrowing path exists. No such new spelling
  follows merely from choosing noncopyability.

Neither alternative is selected here. Silent shared mutable aliases and implicit
moves are not fallback implementations of the existing ordinary-copy default.
Reference-valued elements, if admitted later, retain their own copy contracts;
an independent sequence does not imply a recursive clone of arbitrary objects.

After copy eligibility, settle the concrete type/construction/growth surface and
bounded allocation behavior before implementing it. Keep views, generalized
protocols, capacity tuning and native layout outside a first implementation
unless an actual example requires their design.

## Evidence and handoff

This is a repository-contract review, not runtime validation of lists. The last
delivered interpreter has strict checking, 108 passing test groups and runnable
examples 010–012. None demonstrates runtime growth. This note and the owning
reference/catalog updates are committed atomically without a new igniter tag.

The [automatic workflow](README.md#automatic-progression-within-selected-contracts)
stops at this concrete uncertainty. Resume owner implementation only after the
needed public behavior and surface have explicit consent; do not substitute a
temporary helper or choose from provisional generic syntax on the user's behalf.
