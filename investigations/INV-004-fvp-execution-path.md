# INV-004 — Minimal FVP execution path

Status: in progress
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-004](TOPICS.md#inv-004)
Covered scope: bounded whole-topic question — the first runnable FVP mechanism;
native deployment, caching, full mode parity, and restricted profiles remain open.

This is a non-normative investigation note outside the language draft. Options
and recommendations below are not selected implementation decisions.

## Investigation question

Must the first runnable FVP generate a native executable, or may an experimental
evaluator execute a small supported subset before a native backend exists?
Choose this boundary before designing caches, packages, or multiple source modes.

## Current contracts and evidence

Baseline: `b947746`; working tree clean before this investigation.

- [Immediate FVP focus](../docs/principles.md#immediate-focus-first-viable-product)
  prioritizes a tiny runnable version for experimentation. Module/source-mode
  architecture is deferred; the full investigation catalog is not a prerequisite.
- [Native execution](../docs/memory-and-performance.md#lightweight-native-execution-priority)
  remains a selected language/deployment goal. The experimental demonstrator's
  execution mechanism is open; no interpreter, backend, or host language is
  selected. An experimental evaluator would not establish the native goal.
- [Explicit observation](../docs/tooling-and-learning.md#explicit-output-and-tracing)
  permits a deliberately enabled tool facility. It must observe executed values
  without reevaluating their expressions. Running a file alone does not echo it.
- [Initial exercise coverage](../samples/NOTES.md#initial-correctness-batch)
  grows incrementally through 001–020. The first run need not cover all 20.
- The repository currently has design documents and samples, not a LiteLang
  parser, checker, runner, or compiler. Neither path has an implementation or
  measured delivery-time advantage here.

## Small candidate probe

```text
first := 7;
second := 5;
total := first + second;
```

Candidate observation: explicitly request inspection of total through the runner
and expect 12. With inspection disabled, these statements request no output.
Inspection command spelling, value formatting, output destination, missing-name
behavior, and supported scope must be defined before this becomes an executable
acceptance case. This is not a selected global print function or implicit import.

Literals, fixed bindings, name reads, and addition are a proposed first slice,
not a complete FVP feature selection. Reached items remain ordered; names must
resolve and values must obey the supported type/numeric contracts. Reject
unsupported constructs clearly. A host evaluator's arithmetic is not an
automatic definition of LiteLang numeric behavior. Add invalid-name and
unsupported-feature probes alongside the successful case when implemented.

## Options and consequences

- **A — Experimental evaluator first.** Parse and check the supported subset,
  then evaluate its representation directly. This proposal avoids implementing
  native emission/linking in the first runnable path and permits inspection of
  evaluated values. It creates an experimental execution path whose semantics
  must stay aligned with the selected language as native support is added.
- **B — Native executable first.** Parse and check the subset, lower it to a
  native-producing path, then execute the result. C emission plus an external C
  compiler is one candidate, not a selected backend. This puts code generation,
  toolchain invocation, failure reporting, and observation support inside the
  first runnable scope. Target arithmetic and evaluation must preserve LiteLang
  contracts rather than inherit a backend's defaults.

**Recommendation, not selected:** A for the tiny experimental FVP, with an
explicitly enabled observation facility. This is a scope judgment, not a measured
speed-of-development claim. Keep native deployment as the language goal; do not
present the evaluator as satisfying it. If the user requires a native artifact
in the first viable product, select B instead. Do not build both paths as an
initial requirement. Bytecode engines, JITs, caching, and full REPL behavior are
outside this bounded choice.

## Verification and limits

Checked the repository's current FVP, observation, native-goal, and exercise
contracts; checked note/tracking links, code fences, and focused diff consistency.
No source probe was executed as LiteLang. No performance, native footprint,
implementation-time measurement, or foreign-language behavior is claimed.

## Decision references and handoff

No new execution mechanism, output API, or complete feature subset is selected.
First settle whether an experimental evaluator is acceptable for the FVP or a
native artifact is mandatory. Then bound the initial supported syntax/numbers
and exact explicit-observation behavior. Preserve the deferred investigations.
