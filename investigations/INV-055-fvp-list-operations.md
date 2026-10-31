# INV-055 — Concrete list end-operation names

Status: recorded (canonical names selected by the user; no implementation)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-055](TOPICS.md#inv-055)
Related scope: [INV-057 collection protocols](TOPICS.md#inv-057)
Baseline: `e1ac7bc`; interpreter remains igniter-v0.1.0-alpha.13

## Review question

Following the user's copy-first clarification and request to continue, inspect
the remaining concrete construction/growth surface. The existing
[end-operation proposal](../docs/sequence-end-operations.md) already contains
push/pop behavior requested by the user, but explicitly leaves its canonical
names and signatures under review. The concrete naming proposal was committed
in `65db67f`. The user then accepted it with "sure" and renewed automatic
progression until another decision needs permission. This selects the four names;
it does not select the remaining type/construction or allocation surface.

The smallest independent decision here is the operation-name family. It can be
discussed without adopting generic punctuation, a constructor, a capacity API,
new ownership modes or a library/module layout.

## Selected operation names

Selected by the user, **2026-10-31**, from the existing proposal:

- push_front: insert one element before the first element.
- push_back: insert one element after the last element.
- pop_front: remove and return the first element.
- pop_back: remove and return the last element.

Use one canonical family rather than adding equivalent aliases. The existing
proposal also lists start/end and first/last alternatives; those alternatives are not selected.
Front/back makes the chosen sequence end explicit at the call site.

These remain library operations in the existing free-function proposal, with
the selected explicit mut caller grant for mutation. This review does not add
method syntax, make mut imply growth, or make fixed arrays growable. The concrete
public parameter names, complete callable signatures and module placement remain
separate decisions; choosing an operation name does not select named arguments
for it.

## Preserve settled behavior

The requested operations concern both ends; an FVP implementation may deliver
one bounded part at a time after its needed contracts are selected. No need to
implement all operations merely to deliver a first append example, and no need
to create a generalized collection framework.

Current ordinary values use copy semantics, with compiler/post-compilation copy
optimization permitted only while behavior is preserved. Explicit noncopying
modes remain later work. The accepted ordinary pop direction returns an element
directly and faults safely on empty removal, leaving the sequence unchanged by
that failed removal. Do not reopen that choice as mandatory Option handling.
Recovery implementation and operation-specific fault attribution remain separate.

## Remaining boundary

Selecting these names resolves only naming. The concrete growable type and
construction surface, push allocation-failure channel, and bounded mutation/access
implementation must still be settled before an executable list increment.
The [generic notation convention](../docs/generic-notation.md) explicitly says
List<Int> is explanatory notation, not adopted source grammar; this review does
not adopt it or invent a replacement.

No parser, evaluator, runtime helper, optimization pass or runnable example is
added. This is a review of existing proposals, not test evidence for list support.
Record the selection and affected references atomically, then continue within the
[selected-scope workflow](README.md#automatic-progression-within-selected-contracts).
No repeated permission is needed for these names; concrete growable construction
and temporary failure handling still need review before an executable delivery.
