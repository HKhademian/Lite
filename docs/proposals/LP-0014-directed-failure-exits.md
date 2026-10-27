# LP-0014 r1: Directed failure exits and explicit block targets

- ID: `LP-0014`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: LP-0012's manual Panic raise direction that allowed interception inside the same function. Custom failure capability, channel classification, and eligible escaping-error inference from LP-0012 remain selected. Resolves raise spelling and target questions explored by draft LP-0011; unmatched-remainder policy remains open.
- Superseded by: none.

## Boundary rule

```text
return value;
raise failure;
raise ...failures;

return @outer value;
raise @outer failure;
raise @outer ...failures;
```

Untagged return completes the nearest function/closure normally; untagged raise completes that same boundary with failure. A tagged raise completes the named lexically enclosing executable block with failure, while tagged return supplies its normal value. It never implicitly selects the nearest ordinary block. No target or transfer may cross a function/closure boundary. Functions are not newly taggable; additional target kinds beyond general executable blocks require their own support rule.

Raise requires an explicit operand. A scalar supplies one failure; ellipsis supplies the failures of the evaluated sequence in order. Evaluate the operand once. Preserve supplied categories, payloads, occurrence order, and retained channel origins. Error versus Panic selects the outgoing channel, not a different default target. New failures and already-caught failures use the same targeting syntax. No bare rethrow or implicit current-error name is introduced. Sequence/provider integration and exact provenance representation remain open.

## Transfer and recovery

After operand evaluation, the directed transfer bypasses intervening else/? boundaries inside its target. It does not behave like a new ordinary local failure for each skipped clause to catch. Applicable exited-scope cleanup still runs, retaining failures under existing cleanup rules. Faults arising while evaluating the operand retain their ordinary evaluation/boundary behavior; the directed transfer has not yet begun. Cleanup-failure transport and unmatched remainders are not suppressed by the jump.

At the named block boundary, recovery/capture surrounding the completed target may handle the failures. A returned Error is exposed through the target's outward outcome; a Panic retains its panic channel unless captured. Failing completion supplies no ordinary value for then/result processing. Untagged raise newPanic bypasses local handlers in its function; recovery/capture of the caller's call may receive it. This explicitly changes LP-0012's earlier local interception direction for manual Panic raise. Generated/live panics arising in ordinary operations retain their existing implicit propagation rules.

```text
value := @outer {
    attempt := read_cached()?;
    attempt
        else ...errs: BoundPanic { raise @outer ...errs }
        else { local_default }
}
else ...panics: Panic { outer_default }
```

Assume compatible normal/fallback values, no new handler failures, and no unmatched categories on the demonstrated raise path. The raise skips local_default and fails @outer. Recovery attached outside @outer can consume those panics. A tag on the original protected block does not enclose that block's attached handlers; use an additional explicit wrapper when handlers need to target around the complete chain, as selected in LP-0008.

## Remainders and temporary traces

Temporary outcome layers already explain handler-local completion: return @handler completes that handler, and its unmatched remainder reaches later layers. A temporary binding itself performs no extraction. For true nonlocal return, raise, or ! inside a partial catch, later skipped layers cannot process the remainder; decide its outward transport or rejection separately. This proposal does not select suppression or require later handlers to run after the jump. Forwarding other pending failures alongside the supplied group in preserved order is the reviewed recommendation, not a selected policy. See LP-0005/LP-0011 for that remaining issue.

## Revision history

`r1` selects function/closure default boundaries, explicit block targets, single/group raising, bypass of intervening recovery, eligibility of recovery around the completed target, and retained cleanup/channel obligations. It leaves unmatched-remainder transport, complete typing/grammar integration, ownership, and implementation open. No release or runtime validation is implied.

Normative owner: [manual failures and inference](../manual-failures-and-inference.md#directed-raise-boundaries). Related: [control flow](../control-flow.md), [tags](../tags-and-contexts.md), [scalar recovery](LP-0013-scalar-recovery-selection.md), and [remaining shortfalls](../failure-handling-shortfalls.md).
