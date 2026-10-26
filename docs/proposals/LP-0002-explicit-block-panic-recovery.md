# LP-0002 r1: Explicit whole-block panic recovery

- ID: `LP-0002`
- Revision: `r1`
- Status: **accepted, 2026-10-26; unreleased design**
- Target language version: **unassigned**
- Target compiler/runtime version: **unassigned**
- Supersedes: none; complements [LP-0001 r1](LP-0001-operation-specific-panic-recovery.md).
- Superseded by: none.

## Selected contract

The user selects an explicit block for capture-all recovery:

```text
answer := { multiply(values[0], values[1]) } else { 0 }
```

The block establishes its recovery boundary before its first item is evaluated. Supported language-managed typed panics from executed block items, callee/receiver and argument evaluation, and synchronously called code can reach its handler after applicable inner cleanup. The nearest eligible matching handler handles first. A receiverless handler matches all failures supported at that boundary; a typed filter can narrow it.

If values is empty, its first indexed access panics; the second access and multiply never run, and the block fallback supplies 0. With [5, 7] and successful multiplication, the result is 35. The fallback replaces the entire block's result; it does not resume the interrupted computation or supply a missing argument.

This complements operation-specific recovery: `multiply(...) else { 0 }` handles multiply's defined faults, while `{ multiply(...) } else { 0 }` also covers panics during argument evaluation and arbitrary supported synchronous callee panics.

## Preserved boundaries

- No retry or rollback; prior effects remain.
- A fallback is outside its own recovery boundary. A new failure needs an eligible enclosing recovery.
- Normal return, tagged return, break/continue, and function/closure-targeted postfix `!` remain exits rather than panic events.
- Result-valued arguments still need their explicit handling/extraction. Stored or discarded `.err` data is not collected implicitly. A final Result-valued block outcome follows ordinary one-layer target recovery.
- Body-wide special sections and external recovery tails on complete if/loop/match constructs are not introduced.
- Cleanup ordering, primary/secondary failure precedence, and declaration-ordered aggregate consumption retain their existing contracts.

## Runtime consequences and remaining work

An explicit block selects broad recovery semantically. It therefore needs a valid cross-call transport and cleanup implementation wherever such panics can occur. Static analysis may simplify known paths; no hidden Result ABI, unwinder, heap allocation, or standalone runtime executable is selected here.

Complete expression precedence, recovery-chain integration, indexed-write attachment, operation fault contracts, mixed-channel receiver typing, aggregate representation/inspection, unhandled-fault policy, and foreign boundaries remain open. Hard aborts and arbitrary corrupted machine state are not promised safely recoverable.

## Revision history

`r1` records the user's explicit block form and its broad panic scope. No implementation or measured performance claim is made.

Normative owner: [expression recovery](../expression-recovery.md#explicit-whole-block-panic-boundary-selected). Supporting traces: [recovery boundaries](../recovery-boundaries.md).
