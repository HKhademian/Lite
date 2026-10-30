# INV-005 — FVP completion and error reporting

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-005](TOPICS.md#inv-005)
Covered scope: bounded whole-topic question — normal FVP completion, host success/
failure status, and whether reportError changes control flow or completion.

This is a non-normative investigation note outside the language draft. The
options and recommendations below are not selected lifecycle rules.

## Investigation question

Does a successful reportError(...) call merely report information, or also mark
the run failed or terminate it? Distinguish the report's intended role from an
I/O failure while trying to perform the report.

## Current contracts and evidence

Baseline: `617e79b`; working tree clean before this note.

- [Immediate FVP focus](../docs/principles.md#immediate-focus-first-viable-product)
  requires only lifecycle decisions needed by the tiny runnable subset.
- [Temporary helpers](../docs/tooling-and-learning.md#temporary-fvp-input-and-reporting)
  select report and reportError names/roles, but not streams, formatting, output
  failures, exit effects, or a termination operation.
- [File completion](../docs/blocks-and-results.md#source-file-body) produces Unit
  on normal completion. A block result is distinct from an operating-system exit
  status; Unit does not yet select a host success code. Top-level return has no
  selected valid target, so do not invent return 1 as script exit syntax.
- [Panic contracts](../docs/panics.md#separate-channels) distinguish live failures,
  returned outcome data, recovery, and cleanup. General unhandled-fault and
  hard-abort policies remain open. Reporting a message is not yet any of these
  transfers. Preserve cleanup requirements for whatever the FVP supports.
- [Exercise checks](INV-002-01-exercise-contracts-001-020.md#initial-coverage-selection-2026-10-28)
  use the panic channel on mismatch, but host exit mapping remains open.

## Concrete probes

These are proposed behavior cases, not executed acceptance tests. Assume that
the temporary reporting helpers accept the shown text and reporting succeeds.

```text
reportError("Could not use the preferred input");
report("Continuing with a fallback");
```

Possible behaviors: run both calls and finish successfully; run both but finish
with a failed status; or stop after the first call. Error-reporting destination
is a separate question, and observing messages across destinations would need
its own ordering contract.

A report-free file ending with total := first + second still has Unit normal
completion, not total as an exit status. Likewise, a reached fatal execution
failure must not be confused with a normally completed run merely because both
eventually return control to the runner. Exact failure status is not selected.

## Options and recommendation

- **A — Report only.** A successful reportError call reports its supplied values
  and ordinary execution continues. It neither requests termination nor marks
  the whole run failed. A program can describe an error it handled and still
  complete successfully.
- **B — Report and mark failure.** Continue execution, but record a failed-run
  state for final status. Requires rules for clearing/overriding that state and
  interaction with recovery; an earlier message affects later completion.
- **C — Report and terminate.** Make reporting also a control-flow operation.
  Requires a termination/failure contract, cleanup behavior, and rules for calls
  inside functions or other scopes. Its role overlaps a separate failure or exit
  request, which is not yet selected.

**Recommendation, not selected:** A. Keep reporting, failing, and terminating
as separate requests. For the FVP host boundary, also propose normal completion
as success status 0 and a rejected program or unhandled fatal execution failure
as nonzero. Exact failure codes, output-failure policy, explicit termination API,
input EOF/parse failures, and full panic/cleanup/host-abort behavior remain open.
This recommendation does not choose stderr or an exception type for reportError.

## Verification and limits

Read the owning FVP, temporary I/O, file-body, panic, and initial exercise-check
contracts. Checked note/tracking links, fences, and focused diff consistency.
No LiteLang execution, process-exit experiment, foreign-language comparison, or
runtime cleanup result was produced.

## Decision references and handoff

No lifecycle decision is selected here. First choose report-only, sticky failure,
or terminating reportError behavior using the two-call probe. Then settle the
small host success/failure contract and temporary input failures. Full startup,
module initialization, runtime teardown, and lifecycle hooks are outside this
bounded note and are not prerequisites for this choice.
