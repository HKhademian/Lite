# INV-002 — First runnable FVP slice

Status: recorded (first feature checkpoint selected; numeric/text and helper details open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-002](TOPICS.md#inv-002)
Covered scope: bounded whole-topic question — the smallest end-to-end interpreter
slice and its demonstrable behavior, before adding later language features.

This note is non-normative. It records the selected first feature checkpoint,
not an implemented interpreter or a permanent limit on LiteLang.

## Question and current evidence

Baseline: `3f2b28a`; working tree clean before this note.

The [small interpreter](../docs/tooling-and-learning.md#fvp-interpreter), temporary
input/report/exit helper names, input-fault policy, and explicit observation are
selected. The user accepts the first slice below on baseline `49265c3`.
Numeric/text details, remaining helper contracts, and implementation language
remain open. Owners: [first executable checkpoint](../docs/tooling-and-learning.md#first-executable-checkpoint)
and [decision ledger](../docs/decisions-and-open-questions.md#first-executable-interpreter-checkpoint-2026-10-30).
The [FVP focus](../docs/principles.md#immediate-focus-first-viable-product) defers
module architecture and native compilation.

[Lesson 001](../samples/001_add_two_numbers.lts) needs fixed integer bindings and
addition. [Lesson 002](../samples/002_arithmetic_operations.lts) adds subtraction,
multiplication, and division. [Lesson 020](../samples/020_swap_values.lts) uses
var and replacement. The [initial 001–020 batch](../samples/NOTES.md#initial-correctness-batch)
is incremental, not a requirement to implement all 20 before the first run.

## Selected first runnable slice

- One source file with ordered execution, comments, ordinary separators, and
  clear diagnostics for unsupported constructs. A final declaration remains Unit;
  no implicit output or special meaning for the final binding.
- Integer, floating, and text literals/values for the temporary helper roles,
  plus normal Unit completion. An explicit provisional numeric profile and
  supported text/escape subset still need selection; do not inherit the host's
  arithmetic or text behavior silently.
- Inferred fixed bindings with :=, name reads, var bindings, and replacement
  with =. Preserve existing shadowing and type/replacement rules for admitted
  forms; mutation of a fixed binding is rejected.
- +, -, *, /, unary minus, and parentheses, preserving selected precedence and
  division behavior within the supported numeric profile. Other operators can
  receive explicit unsupported diagnostics in this first slice.
- Calls to the selected temporary inputInt/inputFloat/inputLine/inputWord,
  report/reportError, and exit helpers. Built-in helper calls do not require
  user-defined functions, a module system, or a complete stdlib. Remaining input,
  formatting, and exit contracts must be bounded before claiming completion.
- Parse/check the supported code before executing it. Bad names/types or fixed
  binding replacement receive diagnostics; unhandled input faults fail the run.
  These are selected behavior requirements, not existing test results.

Conditionals, Boolean expressions, loops, user-defined functions, tuples and
destructuring, and richer type syntax are subsequent increments, each
with focused valid/invalid examples. Their relative order remains open. This
slice is the first executable checkpoint toward a useful experimental FVP, not a
claim that calculator-like coverage completes every desired FVP feature.

## Candidate end-to-end probe

```text
first := inputInt();
second := inputInt();
var total := first + second;
total = total * 2;
report(total);
```

With supplied inputs 7 and 5, the value reported should be 24 and normal
completion should map to status 0. Exact report rendering is not selected.
Removing report should leave no requested program output. A malformed first
integer should produce the selected input fault, with no report after an
unhandled failure. The temporary input transport remains open.

Other bounded probes: read-only replacement rejected; unknown name rejected;
compatible var replacement allowed; later := shadow selects a new binding;
text and floating helper round-trips within the chosen supported profile;
reportError continues; explicit exit prevents later ordinary continuation.
Use explicit exit codes while the omitted-code default remains unresolved.

## Verification, decision status, and handoff

Read the selected FVP/interpreter/helper contracts and lesson sources above.
Checked note/tracking links, fences, and focused diff consistency. No LiteLang
execution, parser/typechecker result, or implementation-time estimate is claimed.

The user accepts the first slice above. Next define its numeric/text profile
and remaining minimal helper contracts; implementation language is still open.
Keep the existing lessons unchanged until implementation/verification work is
actually in scope. The complete 001–020 batch remains an incremental growth
target, not a prerequisite for this first executable checkpoint.
