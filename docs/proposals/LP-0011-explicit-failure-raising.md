# LP-0011 r3: Explicit failure raising from recovery

- ID: `LP-0011`
- Revision: `r3`
- Status: **draft, 2026-10-27; raise targets/groups selected in LP-0014; unmatched-remainder transport remains open**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; explores explicit forwarding from handlers alongside LP-0010 extraction.
- Superseded by: none.

## Selected follow-up

[LP-0014 r1](LP-0014-directed-failure-exits.md) now selects raise failure, raise ...failures, and explicit @outer block targets. Untagged raise completes the nearest function/closure with failure, for Error and Panic alike. Tagged raise completes the named enclosing executable block. After operand evaluation the transfer bypasses recovery inside its target; surrounding recovery of that completed target remains eligible. This revises LP-0012's earlier bare Panic local-interception behavior. Required cleanup and preserved channels remain selected.

[LP-0013 r1](LP-0013-scalar-recovery-selection.md) resolves typed scalar multi-match binding: expose the first match, consume/discard the other matches, and leave different categories untouched. The collector exposes all matches; raise ...ps can now forward them explicitly. No-match clauses still skip execution. Raising one scalar cannot revive matches already discarded by that catch.

## Remaining unmatched-remainder policy

A partial catch may raise selected matches while another category remains pending outside its explicit operand. The chosen target determines which handlers are skipped but does not alone decide transport for that remainder. Carrying it alongside the explicitly raised failures in preserved order is the reviewed recommendation; rejecting the exit until its remainder is handled is still an alternative. Neither policy may silently discard an unmatched category. Cleanup can introduce additional failures during the transfer under existing retention rules.

Exact provenance/identity exposure, ownership, filtered sequence providers, and mixed-channel transfer ABI remain open. These are not reasons to keep selected raise group syntax or target semantics marked undecided. See [the focused shortfalls](../failure-handling-shortfalls.md).

## Revision history

`r1` records the requested explicit raise form, proposed collector forwarding and nearest-function/closure target, the distinction from emitting a locally catchable failure, and unresolved remainder policies. This draft adds no selected exit production or panic-trigger API.

`r2` separates LP-0012's selected manual failure emission from the still-requested caught-group outward forwarding. Panic raise follows ordinary local recovery scope; the earlier forwarding meaning is not silently retained as a second contextual meaning. Scalar/group binding, remainder preservation, forwarding syntax/target, and re-emission provenance remain under review.

`r3` records the accepted LP-0013/LP-0014 follow-up: typed scalar first-match/discard, scalar/group raise, function default targets, and explicit block targets. The draft now concerns unmatched-remainder policy and transport/provenance details; prior emission-versus-forwarding alternatives are history.

Current selected extraction: [LP-0010 r1](LP-0010-outcome-extraction-and-exhaustion.md). Related: [pending exits](LP-0005-handler-execution-and-exits.md), [temporary scope traces](LP-0008-recovery-block-tags-and-traces.md), and [capture reference](../failure-capture-and-unwrapping.md#manual-raise-and-remaining-caught-group-forwarding).
