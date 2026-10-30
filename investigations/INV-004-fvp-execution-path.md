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
The selection below answers this boundary before caches, packages, or multiple
source modes are designed.

## Interpreter selection, 2026-10-30

The user accepts a **small interpreter first** for the FVP. Read one source
file, parse/check the supported subset, and execute it using the selected
temporary input/report/exit surface. Preserve selected language behavior for
supported features and clearly diagnose unsupported constructs.

Native compilation remains a later goal; a native artifact is not required for
this FVP. Do not make dual execution paths, caching, a bytecode/JIT engine, a
debugger, or module machinery prerequisites. Python is now the selected minimal
igniter, followed by early LiteLang self-hosting. Concrete
internal representation/checker structure, numeric/text profile, later feature
coverage, and remaining I/O/exit details are still open. The first feature
checkpoint is selected in [INV-002.02](INV-002-02-fvp-first-runnable-slice.md#selected-first-runnable-slice).

Owner: [FVP interpreter](../docs/tooling-and-learning.md#fvp-interpreter).
Ledger: [small interpreter for the FVP](../docs/decisions-and-open-questions.md#small-interpreter-for-the-fvp-2026-10-30).
Selection baseline: `075a10a`. No parser/checker/interpreter has been implemented
or tested, and no native speed/footprint claim follows from this selection.

## Current contracts and evidence

### Temporary helper selection, 2026-10-30

The user proposes a minimal temporary/fake surface for now: inputInt, inputFloat,
inputLine, inputWord, report(...), and reportError(...). Adopt these provisional
FVP names/roles, supplied by demonstrator scaffolding without requiring a module
system or permanent stdlib design. report supersedes the assistant's unselected
show illustration. The ellipsis does not select further helpers or a variadic
signature. Real versus scripted/mock input, numeric parsing and token/line
consumption, complete signatures, reporting formats/destinations,
and reportError's I/O-failure behavior remain open. No mock values are chosen.
Invalid input/EOF behavior is subsequently selected in the input-failure section
below; concrete fault category/transport and recovery support remain open.
A subsequent [INV-005 selection](INV-005-fvp-completion-and-reporting.md#report-only-and-explicit-exit-selection-2026-10-30)
makes successful reportError calls report-only and adds exit(errCode?) for
explicit program end; exit defaults and cleanup behavior remain open.

Calls explicitly request their operations; ordinary bindings/file completion stay
silent and declaration-final blocks still produce Unit. This helper selection
alone did not choose the execution mechanism; the selection above now chooses
the interpreter. It does not authorize implicit imports in .lt source.
Owner: [temporary input and reporting](../docs/tooling-and-learning.md#temporary-fvp-input-and-reporting).
Ledger: [temporary FVP helpers](../docs/decisions-and-open-questions.md#temporary-fvp-input-and-reporting-helpers-2026-10-30).
No runner/helper implementation or LiteLang execution is claimed.

The user subsequently reaffirms that all this FVP scaffolding will be cleaned
up later: temporary helpers and any experimental inspection flags/marks can be
removed or replaced, without making them permanent API commitments. See the
[cleanup clarification](../docs/decisions-and-open-questions.md#disposable-fvp-scaffolding-2026-10-30).

Baseline: `b947746`; working tree clean before this investigation.

- [Immediate FVP focus](../docs/principles.md#immediate-focus-first-viable-product)
  prioritizes a tiny runnable version for experimentation. Module/source-mode
  architecture is deferred; the full investigation catalog is not a prerequisite.
- [Native execution](../docs/memory-and-performance.md#lightweight-native-execution-priority)
  remains a selected language/deployment goal. The experimental demonstrator's
  execution mechanism was open at the original baseline; the small interpreter
  is now selected above. Python is subsequently selected as the minimal igniter
  with early LiteLang self-hosting; the native backend remains open. An experimental evaluator does not establish the native goal.
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

Literals, fixed bindings, name reads, and addition form a smaller probe within
the selected first checkpoint, not the complete FVP. Reached items remain ordered; names must
resolve and values must obey the supported type/numeric contracts. Reject
unsupported constructs clearly. A host evaluator's arithmetic is not an
automatic definition of LiteLang numeric behavior. Add invalid-name and
unsupported-feature probes alongside the successful case when implemented.

## Temporary input failure selection, 2026-10-30

This bounded FVP question concerns how the selected fake input helpers behave on
bad input or end-of-input. This does not reopen the permanent I/O library design
or require module machinery. Baseline for this addition: `7c01542`.

The user accepts option A below on baseline `904729d`: invalid input or EOF
before a requested value is available raises an input fault; unhandled faults
produce a clear diagnostic and nonzero status. No automatic retry or fabricated
0/empty string. An intentionally supplied empty inputLine remains valid.
Owner: [temporary input failures](../docs/tooling-and-learning.md#temporary-input-failures).
Ledger: [temporary input fault policy](../docs/decisions-and-open-questions.md#temporary-input-fault-policy-2026-10-30).

```text
number := inputInt();
report(number);
```

Design probes, not executed tests:

- A supplied integer such as 12 should produce that value for report.
- Text such as hello is not an integer. Should the helper fail, request another
  input, return a default, or expose an explicit failure result?
- End-of-input before a requested value is available needs a defined outcome.
  A deliberate empty line for inputLine is distinct from no input being available
  at EOF; tokenization, line terminators, and consumption rules remain open.

Original options and consequences (A now selected):

- **A — Input fault, failed run if unhandled.** Keep the success call simple;
  a failed read produces a clear diagnostic and nonzero completion if unhandled.
  No report(number) runs after an unhandled failure to initialize number.
- **B — Retry automatically.** Useful as an interactive convenience, but needs
  retry/prompt and invalid-input consumption rules. EOF still needs a separate
  outcome, and scripted input cannot supply an unlimited sequence of retries.
- **C — Return a default.** Avoids a failure path but hides the distinction
  between an actual 0/empty value and a failed read. Not recommended for the FVP.
- **D — Return explicit optional/failure data.** Lets the program handle absence
  or malformed input, but requires selecting the helper's Result/Option contract
  and making the relevant handling features available in the supported subset.

**Selected:** A for these temporary direct-value helpers.
Do not silently manufacture 0 or an empty string and do not silently reprompt.
For inputLine, an intentionally supplied empty line can be a successful empty
string; EOF without a line is a failed read. The same failure policy applies
to inputFloat and inputWord.

The concrete input-fault category/transport, any supported recovery, numeric grammar/range,
token-versus-line consumption, real versus scripted input, and exact diagnostic/
status code remain open. This selection does not select a host exception,
hard abort, cleanup bypass, or permanent stdlib policy. If recovery is supported,
its selected semantics must be preserved; failure of an input operation is
different from the separate report-only operation reportError(...).

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

**Selected:** A for the tiny experimental FVP, using the temporary explicit
reporting helpers. This is a scope judgment, not a measured development-time
claim. Native deployment remains the language goal; the evaluator does not
satisfy that goal. B is not required for the first runnable version. Bytecode
engines, JITs, caching, and full REPL behavior are outside this bounded choice.

## Verification and limits

Checked the repository's current FVP, observation, native-goal, and exercise
contracts; checked note/tracking links, code fences, and focused diff consistency.
No source probe was executed as LiteLang. No performance, native footprint,
implementation-time measurement, or foreign-language behavior is claimed.

## Decision references and handoff

The small interpreter, temporary helper surface, and input-fault policy are
selected above. The [first executable checkpoint](INV-002-02-fvp-first-runnable-slice.md#selected-first-runnable-slice)
is now selected; Python is the minimal igniter with early LiteLang self-hosting.
Numeric/text details, complete I/O/exit contracts, and internal structure remain open.
The input-fault behavior above is selected, with concrete category/transport,
recovery support, and exact parsing/consumption still open.
Next bound numeric/text details and remaining input/report/exit behavior, then
the minimal igniter structure needed for the selected slice.
Preserve the deferred investigations; a native backend is not an FVP blocker.
