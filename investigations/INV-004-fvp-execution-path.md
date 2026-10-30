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

### Temporary helper selection, 2026-10-30

The user proposes a minimal temporary/fake surface for now: inputInt, inputFloat,
inputLine, inputWord, report(...), and reportError(...). Adopt these provisional
FVP names/roles, supplied by demonstrator scaffolding without requiring a module
system or permanent stdlib design. report supersedes the assistant's unselected
show illustration. The ellipsis does not select further helpers or a variadic
signature. Real versus scripted/mock input, numeric parsing and token/line
consumption, EOF/failures, complete signatures, reporting formats/destinations,
and reportError's failure/exit effects remain open. No mock values are chosen.

Calls explicitly request their operations; ordinary bindings/file completion stay
silent and declaration-final blocks still produce Unit. This selection does not
answer evaluator versus native-first or authorize implicit imports in .lt source.
Owner: [temporary input and reporting](../docs/tooling-and-learning.md#temporary-fvp-input-and-reporting).
Ledger: [temporary FVP helpers](../docs/decisions-and-open-questions.md#temporary-fvp-input-and-reporting-helpers-2026-10-30).
No runner/helper implementation or LiteLang execution is claimed.

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
report(total);
```

The temporary report operation explicitly requests observation of total, expected
to be 12. Remove that call and these declarations request no output. Exact value
formatting, destination, and failure behavior must be defined before this becomes
an executable acceptance case. Runner inspection was an earlier unselected
alternative; it is not required to display this result.

Literals, fixed bindings, name reads, and addition are a proposed first slice,
not a complete FVP feature selection. Reached items remain ordered; names must
resolve and values must obey the supported type/numeric contracts. Reject
unsupported constructs clearly. A host evaluator's arithmetic is not an
automatic definition of LiteLang numeric behavior. Add invalid-name and
unsupported-feature probes alongside the successful case when implemented.

## Options and consequences

### Observation scope clarification, 2026-10-30

The term inspection above describes an unselected tool proposal, not a language
rule or a requirement to display the file's final bindings. Distinguish observing
a block's value from observing bindings created inside it. Under the current
final-item rule, a final declaration, including tuple destructuring, produces
Unit. Its RHS value and introduced bindings are different observation targets.

The user asks whether to display all, last, marked, or special bindings:

- **All bindings:** a possible deliberately enabled trace/debug view. Define
  scopes, repeated updates, shadow identities, and display timing before adding
  it. Do not activate it merely because a script is run.
- **Last statement's bindings:** a possible explicitly enabled convenience mode,
  not the block result. It needs rules for destructuring, statements without
  bindings, nested blocks/loops, and cleanup. Adding a final temporary would
  change the displayed selection; this is not recommended as the FVP default.
- **Explicitly marked/requested values:** recommend one simple explicit output
  operation for the FVP. The source chooses values or tuples to display at that
  execution point; there is no implicit traversal of local bindings and no need
  for a separate binding-inspection subsystem. A selected value is read normally;
  an operation supplied as the argument executes once, not again for display.
- **Special binding names or declaration forms:** possible future syntax, but
  no spelling or special meaning is selected. Do not reinterpret ordinary names,
  destructuring, or the existing readable underscore binding as an output request.

Historical illustration, superseded by the temporary report selection above:
show(total) could request the computed total, while
show((a, b, c, rest)) could request explicitly grouped destructured values.
show is not a selected built-in or real API. Exact operation spelling, supported
values, formatting, destination, and failure behavior remain open.

**Refined observation recommendation, not selected:** use explicit source output
for the FVP; keep all/last-binding inspection optional and deferred. This replaces
the earlier preference for runner inspection as the first observation mechanism,
without changing block results, explicit-effect rules, or choosing an API.

### Optional teaching inspection proposal, 2026-10-30

The user adds a possible run flag revealing all internal identifier bindings'
final values and debugger-style marked points for students to examine code.
Record this as a **proposal**, complementing the temporary helper selection.
Neither a flag nor a mark spelling, scope/snapshot policy, or full debugger is
selected. Ordinary execution remains silent without explicit reports or an
explicitly enabled observation facility. Blocks do not start returning their
binding environments.

The [owning tooling proposal](../docs/tooling-and-learning.md#optional-teaching-inspection)
and [INV-072.05](SUBTOPICS.md#inv-072-05) track final-value versus point-in-time
views, shadow/activation identities, ended scopes, hidden identifiers, retention
costs, and non-reevaluation. The full tool is not required for the first runnable
FVP; it may grow incrementally alongside the experiments.

### Execution-mechanism options

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
explicit output operation as recommended above. This is a scope judgment, not a measured
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

Temporary input/reporting helper names and roles are selected above; complete
I/O contracts, execution mechanism, and feature subset remain open.
First settle whether an experimental evaluator is acceptable for the FVP or a
native artifact is mandatory. Then bound the initial supported syntax/numbers
and exact explicit-observation behavior. Preserve the deferred investigations.
