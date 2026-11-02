# LP-0008 r1: Recovery block tags and temporary traces

- ID: `LP-0008`
- Revision: `r1`
- Status: **accepted, 2026-10-27; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; clarifies lexical scope within LP-0002/LP-0003 recovery composition.
- Superseded by: none.

## Tags name their explicit blocks

In `@inner { save_outputLine() } else { fallback() }`, @inner names only the protected block. Its scope does not extend into the attached handler. A handler cannot return to that already-completed block. To make @inner an enclosing return target for the whole chain, write an additional explicit block:

```text
y := @inner {
    { save_outputLine() }
        else ...errs: DiskFull { return @inner first_value() }
        else ...errs: CloseFailed { second_value() }
}
```

The lexical target is now valid. A return to it bypasses later clauses; the policy for leaving an unmatched CloseFailed remainder is still open in LP-0005. This example does not authorize losing that remainder.

A handler body can have its own tag, placed immediately before that body's opening brace:

```text
y := { save_outputLine() }
    else ...errs: DiskFull @myblock {
        return @myblock first_value()
    }
    else ...errs: CloseFailed { second_value() }
```

Here `return @myblock` completes only the first handler body. Its value contributes to that recovery layer; the unmatched remainder still reaches the next layer. If CloseFailed is pending, its handler runs next. If both handlers complete normally, the last matching handler supplies the recovered result. Assume the helpers produce compatible ordinary values and no new failures. Plain return still exits the nearest function/closure. An enclosing @outer return still exits that explicit outer block. Required cleanup is unchanged.

## Trace expression layers before deciding control flow

For future ambiguous recovery examples, first untangle the expression into temporary outcome layers:

```text
tmp1 := { save_outputLine() }
tmp2 := tmp1 else ...errs: DiskFull @myblock {
    return @myblock first_value()
}
tmp3 := tmp2 else ...errs: CloseFailed { second_value() }
y := tmp3;
```

Then identify lexical targets, normal completion, pending remainders, and any new failures. This is a reasoning method, not a general eager-statement lowering. In the original chained expression, later enclosing recovery is active while earlier layers execute. Separate statements cannot catch a panic that already escaped an earlier statement. Explicit capture, when available, can instead store an outcome for later processing.

## Revision history

`r1` records the explicit-wrapper requirement, handler-local block tags, local-return completion, and temporary-layer review method. Nonlocal exits with an unmatched remainder, transport, and complete expression parsing remain open. No compiler/runtime verification is claimed.

Normative owner: [expression recovery](../expression-recovery.md#handler-block-tags-and-temporary-traces). Related: [tags](../tags-and-contexts.md), [control flow](../control-flow.md), and [pending exit review](LP-0005-handler-execution-and-exits.md).
