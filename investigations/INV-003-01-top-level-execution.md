# INV-003.01 — Top-level execution

Status: recorded
Contributor: redacted (agent-assisted)
Last updated: 2026-10-28
Catalog brief: [INV-003](TOPICS.md#inv-003)
Covered subtopics: INV-003.01
Subtopic brief: [INV-003.01](SUBTOPICS.md#inv-003-01)

This is a non-normative investigation note outside the language draft. Recording
an option or recommendation here does not select a language rule.

## Investigation question

When one `.lite` file is run, what is the executable body, and what does each
top-level item mean?

Two halves, with different prospects:

1. **Execution model.** Are a file's items an implicit executable block, an
   ordered module item list, or something requiring an explicit entry? What is
   the file's completion, and may the final item supply a value?
2. **Observable effects.** How does a top-level item affect anything outside the
   program?

Boundaries: this note owns the file-body question only. Import resolution,
cross-file visibility, and module identity belong to
[INV-003.04](SUBTOPICS.md#inv-003-04) and [INV-006](TOPICS.md#inv-006); top-level
lookup and recursion belong to [INV-003.02](SUBTOPICS.md#inv-003-02) and
[INV-011](TOPICS.md#inv-011); process exit and host effects belong to
[INV-005](TOPICS.md#inv-005) and [INV-067](TOPICS.md#inv-067). The catalog's
starter question can be answered only in part here, because the language has no
selected effect mechanism at all.

## Re-review against the demonstrator goal, 2026-10-28

Evidence baseline: revision `9eec717`, with a clean working tree before this
update. The [reconsideration rule](README.md#reconsidering-decisions-and-postponed-ideas)
requires reviewing the existing selection rather than exempting it. The current
[source-file contract](../docs/blocks-and-results.md#source-file-body) selects A;
the newer [working targets](../docs/principles.md#first-working-targets) require a
tiny executable demonstrator with a way to observe results. The discussion
initially reopened A; the selection below now retains it and requires explicit
output/tracing across scripts and tools.

### Concrete probes

```text
/* File 1: final expression */
7 + 5
```

```text
/* File 2: final declaration, matching the lesson style */
apples := 7 + 5;
```

Under current A, both files complete normally with Unit and neither prints an
answer. File 1 evaluates 12 and discards it; file 2 initializes apples to 12 and
its final declaration produces Unit. An automatic final-expression display
would show 12 only for file 1 unless another observation rule were added.

Re-read all 20 current lessons: each ends in a declaration or assignment, so
automatic tail display alone would leave every existing lesson silent. A
trailing call must still execute its observable effects and failures before its
ordinary result is discarded; discarding does not mean skipping execution.

### Alternatives and tradeoffs

- **Retain A and provide explicit observation.** Keep the implicit file body,
  written execution order, and discarded final value; define a small output API
  or deliberate tool observation facility separately. This preserves minimal
  source ceremony and predictable batch execution. It requires teaching how to
  request observation and eventually defining its formatting/effect/failure
  contract. The current lessons would need checks or explicit observation to
  become visibly useful; their answer comments are documentation only.
- **Revise A to display a final expression automatically.** This makes file 1
  immediately demonstrative, but does not help declaration-final lessons. It
  needs rules for printable types, Unit, formatting, output failures, and whether
  display is part of every run/build or an explicit playground facility. Implicit
  output can also change batch-script output when a final item changes. Its
  formatting/I/O support has a cost to investigate, not a measured footprint.
- **Require Unit completion (A-prime).** A static error could reveal an
  accidentally unused final value, but adds a rule at the file boundary and
  rejects file 1 without making file 2 observable. A warning could be evaluated
  separately; no warning is selected here.
- **Require an explicit entry (C).** This could provide a distinct program-entry
  contract, but adds first-script ceremony and requires migrating the current
  lesson files. No current observation requirement demands that extra entry.

The ordered-item-list alternative B remains possible, but changing the
container alone does not define output. Import behavior D is orthogonal and
belongs to INV-003.04. These alternatives have been compared against the new
goal; none is excluded merely because A was previously selected.

### Finding and selection

The demonstrator's observation requirement exposes a missing host/tool contract,
not a necessary contradiction in the implicit-block model. The opening
recommendation was to retain A and use explicit observation; playground display
was raised as a possible separate facility.

Selection recorded 2026-10-28: the user requires output to be explicit always,
including in demonstrators and playgrounds. Retain A. Neither file above displays
12 automatically. A source output operation or deliberately enabled
inspection/tracing facility can request observation. The user's command-tracing
analogy illustrates explicit activation; no external command syntax is adopted.
An enabled facility may report events within its declared scope without a new
request for every event. Observation must not re-evaluate expressions.

This closes the silent-discard versus implicit-display question. The earlier
candidate of display enabled merely by being in a playground is not selected.
Concrete APIs, formatting/output failures, inspection controls, diagnostics, and
the broader host-effect surface remain with INV-004/INV-067/INV-072. The
[owning tooling page](../docs/tooling-and-learning.md#explicit-output-and-tracing)
and [ledger](../docs/decisions-and-open-questions.md#explicit-output-and-tracing-2026-10-28)
record the selected boundary; source-file completion is unchanged.

Verification: read the current owning pages, selected working targets, and
investigation workflow; inspected the final item of each of the 20 current
sample files. These are source/document checks. No LiteLang parsing, type
checking, execution, performance, or footprint measurement was performed.

## Original contracts and evidence

The following evidence/options/findings retain their original snapshot scope.
The current selected baseline and new reconsideration are recorded above.

Repository revision: `c59f743`, 2026-10-28. The catalog edits and this note are
uncommitted working-tree changes; the tracked tree matches that revision.

What is selected and bears on the question:

| Evidence | Status | Consequence for a file body |
|---|---|---|
| [Blocks and results](../docs/blocks-and-results.md) | established direction | An executable block groups items and produces its final item's result; a final declaration or assignment produces `Unit`; an empty block produces `Unit`; context decides whether the result is observed |
| [Blocks and results:16](../docs/blocks-and-results.md) | selected | "Bodies always use braces"; earlier `do/end` and `then/endif` forms are superseded |
| [Lexical structure](../docs/lexical-structure.md) | established direction | `;` separates ordinary items "in blocks and modules"; a trailing separator before `}` **or end of file** is optional; repeated separators are ignored; there is no automatic semicolon insertion |
| [Identifiers:30](../docs/identifiers.md) | selected | Sequential local declarations in the same block may shadow earlier names; resolve the initializer before introducing the new binding |
| [Local shadowing](../docs/local-shadowing-and-copies.md) | selected | The rule is "new binding, resolved against the previous one"; it explicitly does not settle recursive function initialization |
| [Functions:264](../docs/functions.md) | selected | A nonrecursive local function literal infers its result from its body; no signature-only declaration is required |
| [Modules and packages:18](../docs/modules-and-packages.md) | working proposal | "One file should run without a manifest or handwritten entry function"; a package can add an entry point as it grows |
| [Modules and packages:41](../docs/modules-and-packages.md) | design preference | Implicit arbitrary module initialization was discouraged as a default |

What no page states:

- A source file **is** an executable block, an ordered item list, or a module.
- Whether a file's final item supplies a value, and if so who observes it.
- Whether declarations and executable statements may interleave at file scope
  (all 20 written samples are declaration-only, so they never exercise this).
- What `return`, `break`, `continue`, or a block tag target means at top level.
- Whether two top-level `x :=` declarations shadow (block rule) or collide
  (module-declaration rule).
- Any process-level completion rule; that is [INV-005](TOPICS.md#inv-005).

### The document tension

[blocks-and-results:16](../docs/blocks-and-results.md) says "Bodies always
use braces," while [modules-and-packages:18](../docs/modules-and-packages.md)
intends a file to run with no handwritten entry. Taken literally, a file body
without braces is a body the block rule does not permit. The two statements can
coexist if "bodies" is scoped to block *constructs* and the source unit is a
separate outermost container — but that scope sentence is missing today. This is
an unstated boundary, not a contradiction between two selected rules.

## Concrete cases

All 20 written samples end in a declaration or assignment, so every one already
completes with `Unit` under any block-like model. Checked directly, not inferred
from the notes.

```text
/* 001, as written */
first_basket := 7;
second_basket := 5;
apples := first_basket + second_basket;   /* final item: declaration -> Unit */
```

Cases that discriminate between the options:

```text
/* 1. Empty file */                          /* 2. Declarations only */
                                             x := 1;
/* nothing */
```

```text
/* 3. Final bare expression */               /* 4. Same name twice */
first + second                               x := 1;
                                             x := 2;
```

```text
/* 5. Top-level exit */                      /* 6. Use before declaration */
return 0;                                    use(f);
                                             f := fn() { 1 };
```

```text
/* 7. Import plus executable item */
import std.fs;
print_line("hi");
```

Unselected syntax is not introduced: cases 3–7 use only forms already discussed
in the draft, and none of them occurs in `samples/001`–`020`.

Varying one property at a time:

- Removing every declaration from 001 leaves an empty file; only the completion
  rule changes.
- Making the final item an expression instead of a declaration changes only
  whether a file value exists.
- Renaming the second `x` removes the duplicate-name question and nothing else.
- Adding an import to 001 changes module scope, not the execution of the three
  initializations.

## Options and consequences

### A — The file body is an implicit executable block (result discarded)

Item sequence, braces supplied by the file boundary. The block rules apply:
final item's result computed, then not observed; empty file or final declaration
completes with `Unit`. No new evaluation rule is invented, only an observation
rule: the outermost block's value is not used.

- **For:** highest continuity. Separators, item boundaries, final-item rule,
  scope, and sequential shadowing all already apply to blocks; the file simply
  is the outermost one. Teaching "a script is a block" is one concept.
- **Against:** requires the scope sentence for "bodies always use braces."
  Silently discarding a final expression can hide a beginner expecting output.
  Imports a value-producing model into a context that cannot use a value.
- **Cost:** no new runtime work. The compiler must decide whether to evaluate a
  discarded tail at all — and must still execute it, because evaluation can
  panic or have effects once host calls exist.

### A′ — Implicit block whose result must be `Unit`

Same as A, but a final non-`Unit` expression is a static error ("the script body
must produce `Unit`") rather than silently discarded.

- **For:** turns a dead trailing expression into a diagnostic, which fits the
  beginner-diagnostics goal in [tooling](../docs/tooling-and-learning.md).
- **Against:** adds a construct-specific rule that blocks do not have; an unused
  block value is legal everywhere else. Would reject the natural first attempt
  `2 + 2` at the end of a file with a message that is about ceremony, not error.

### B — The file is an ordered module item list, with no value semantics

Items execute in written order; the file is not an expression, so there is no
final-item value to discard or reject. Completion could still be `Unit`.

- **For:** matches the lexical page's "items in blocks and modules" phrasing and
  the package model; no braces carve-out is needed; no tail-value temptation.
- **Against:** two item containers with different tail rules. A block used as an
  item still evaluates its tail; a file would not, so moving the same items in or
  out of braces changes meaning — the continuity principle asks for a visible
  reason, and braces at the file boundary are not visible in the source.
- **Open sub-question:** whether the last expression is evaluated at all. "Not an
  expression" does not by itself answer whether a trailing call runs.

### C — Require an explicit entry declaration or a braced file body

- **For:** unambiguous body, natural host signature, easy to explain to a
  runtime.
- **Against:** contradicts the stated single-file intent and makes all 20
  samples invalid as written. Would need a migration story for beginners.

### D — Scripts execute; imported modules are declaration-only

The file executes when it is the program root; when imported, top-level items
are declarations only and any executable item is rejected (or runs once at
import, which the module page discourages).

- **For:** avoids implicit import-time effects, aligning with
  [modules-and-packages:41](../docs/modules-and-packages.md); keeps the body
  question separate from module initialization.
- **Against:** moving working script code into a package changes behavior or
  requires editing, which undercuts "one file grows into a package." Needs a
  script/module distinction that no page currently draws.

## Verification and limits

What was checked: the status and content of `blocks-and-results`,
`lexical-structure`, `identifiers`, `local-shadowing-and-copies`, `functions`,
`modules-and-packages`, `tooling-and-learning`, `memory-and-performance`, and
`panics`; the 2026-10-27 decision-ledger snapshot; the 75-topic catalog and the
INV-003 subtopic brief; and the final item of each file in `samples/001`–`020`.

How: file reads and targeted text search at revision `c59f743`. Results: no page
states a file-body execution rule; all 20 samples end in a declaration or
assignment (`020` ends with `second_box = temporary;`); no sample uses strings,
annotations, functions, I/O, or a trailing expression. The phrase "end of file"
appears once, in the separator rule, and only to allow a trailing separator.

Not checked and not claimed: no LiteLang compiler, parser, or runtime exists, so
none of these cases was executed. No external technical claim was used. Whether
`return` at top level is rejected follows from the nearest-function/closure
target in [LP-0015](../docs/proposals/LP-0015-early-return-recovery-paths.md);
the selection below now states that consequence, while the exact diagnostic
remains open.

## Findings and remaining questions

**Evidence.** The catalog question has two halves. The execution-model half is
open but well-posed: every adjacent contract exists, and only the file boundary
is undefined. The observable-effects half cannot be answered yet, because the
language has no selected output, logging, or I/O surface — the 20 samples are
deliberately silent, with expected answers in comments. Under the acceptance
policy recorded in [INV-002-01](INV-002-01-exercise-contracts-001-020.md),
a panic-driven check plus exit status would become the first observable channel,
which is precisely [INV-005](TOPICS.md#inv-005).

**Interpretation.** A is the most continuous option: it reuses every block rule
and needs one missing scope sentence rather than a second item model. The
duplicate-name case is the sharpest observable divergence — under A, `x := 1;
x := 2;` follows the selected sequential-shadowing rule, while any
module-declaration model must reject or reinterpret it. All 20 samples are
indifferent to A versus B, so the corpus provides no evidence either way; the
choice must be made on model grounds.

**Recommendation (non-normative).** Select A and add one sentence to
[blocks and results](../docs/blocks-and-results.md): the source file is the
outermost implicit executable block, its braces are the file boundary, and its
final-item result is not observed. Add the completion rule in
[INV-005](TOPICS.md#inv-005), reject top-level `return`/`break`/`continue` as
targetless, and leave duplicate-name and module behavior to
[INV-006](TOPICS.md#inv-006) when a file grows into a module. Consider A′ only if
silently discarded tails prove to be a real beginner problem; do not adopt it
speculatively.

Selection recorded 2026-10-28: the design owner adopted **A** and directed it
recorded in the owning page and the decision ledger. See [source file
body](../docs/blocks-and-results.md#source-file-body). A′, B, and D remain
unselected alternatives.

**Remaining questions.**

- File-body model — settled 2026-10-28 as A; A′, B, and D remain unselected.
- Whether a discarded final expression should warn rather than disappear.
- Top-level shadowing versus module-level declaration uniqueness —
  [INV-006](TOPICS.md#inv-006)/[INV-011](TOPICS.md#inv-011).
- Recursive function literal initialization, which
  [local shadowing](../docs/local-shadowing-and-copies.md) explicitly leaves
  unsettled — [INV-003.02](SUBTOPICS.md#inv-003-02), [INV-011](TOPICS.md#inv-011).
- Whether imported files may execute items —
  [INV-003.04](SUBTOPICS.md#inv-003-04), [INV-007](TOPICS.md#inv-007).
- The effect surface that makes a top-level statement observable —
  [INV-067](TOPICS.md#inv-067), [INV-071](TOPICS.md#inv-071).

## Decision references

Selected 2026-10-28: [source file body](../docs/blocks-and-results.md#source-file-body)
— a run source file is the outermost implicit executable block, its final-item
result is computed but not observed, and the body completes with `Unit`. Recorded
in the [decision ledger](../docs/decisions-and-open-questions.md#source-file-body-2026-10-28).
No LP ID applies.

Re-review selection, 2026-10-28: retain A and require
[explicit output/tracing](../docs/tooling-and-learning.md#explicit-output-and-tracing)
for ordinary scripts and playgrounds, recorded in the
[ledger](../docs/decisions-and-open-questions.md#explicit-output-and-tracing-2026-10-28).
Automatic expression/declaration/assignment echo is not selected. Explicitly
enabled observation facilities remain possible; exact APIs remain open.

Top-level diagnostics, duplicate-name and module rules, imports, process exit
status, and concrete host-effect APIs remain without an accepted rule. The adjacent
selected rules are block results and the final-item rule, item separators
including end of file, sequential local shadowing, and nonrecursive local result
inference.

## Handoff

Question: what executes when one file runs, and does its final item supply a
value? Evidence: the contracts above, the seven discriminating cases, the
braces scope tension, and the observation that all 20 samples complete with
`Unit`. Settled 2026-10-28: A, recorded in the owning page and ledger.
Unresolved: top-level diagnostics, duplicate-name and module rules, recursive
function-literal initialization, and concrete observable-effect APIs. Explicit
output/tracing intent is now selected.

Current resume point: continue to INV-003.02 for declarations and lookup. The
re-review retains A and selects explicit output/tracing even in playgrounds.
INV-005 still
owns the exit-status dependency of exercise acceptance, and discarded-value
warnings remain open. This is not an implementation plan.
