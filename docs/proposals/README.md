# Lite Proposal register

Status: **design record, 2026-10-26; no release is created by this register**.

Proposals follow [the selected versioning policy](../versioning-and-naming.md#8-proposal-versioning). Each record has a stable LP ID, revision, status, target version or unassigned marker, and supersession information. Accepted proposal text is retained; a later contract change requires a new revision or proposal rather than a silent edit.

## Accepted and unreleased

- [LP-0001 r1: Operation-specific panic recovery](LP-0001-operation-specific-panic-recovery.md). Target language and compiler/runtime versions: unassigned. An operation handler covers its defined faults; argument/operand panics bypass it.
- [LP-0002 r1: Explicit whole-block panic recovery](LP-0002-explicit-block-panic-recovery.md). Target language and compiler/runtime versions: unassigned. An explicit block covers supported typed panics from its executed contents and synchronous calls.
- [LP-0003 r1: Pending-failure munching](LP-0003-pending-failure-munching.md). Target language and compiler/runtime versions: unassigned. Clauses consume their matches in written declaration order; singleton, aggregate, and empty remainders share one recovery model.

- [LP-0004 r1: Count-free error contracts](LP-0004-count-free-error-contracts.md). Target language and compiler/runtime versions: unassigned. Error declarations admit types without occurrence counts; complete recovery cannot require a caller to predict multiplicity or write one clause per unknown occurrence.

These are the first actual proposal records in this repository; LP numbers used as illustrative examples in the naming/versioning page do not reserve proposal IDs. Historical ledger entries are not retroactively renumbered.

## Drafts under review

- [LP-0005 r1: Recovery-handler execution and pending exits](LP-0005-handler-execution-and-exits.md). Target language and compiler/runtime versions: unassigned. Records the expensive-fallback counterexample, an at-most-once body candidate, payload-binding alternatives, optional type-owned count/details, and nonlocal exits with unhandled remainders. No new handler execution rule is accepted.

## Current reference and release boundary

The [decision ledger](../decisions-and-open-questions.md), [expression recovery](../expression-recovery.md), [grammar sketch](../grammar-sketch.md), and [LS-008 summary](../spec/README.md#ls-008--errors-recovery-and-cleanup) describe current selected contracts and remaining gaps. Detailed normative pages own the current rules; proposal records preserve the accepted decisions. [Recovery-boundary traces](../recovery-boundaries.md) are supporting analysis, while unbraced whole-call broad capture is retained as a historical alternative.

Acceptance alone does not bump the language, compiler, runtime, CLI, or ABI version. Target versions and the release manifest are assigned when changes ship. No release tag, compatibility claim, compiler implementation, or conformance result is created here. The count-independent repeated-type invocation/binding mechanism, carrier representation, operation fault attribution, and complete recovery-chain/assignment integration remain open.
