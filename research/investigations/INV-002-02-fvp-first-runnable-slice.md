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

The [small interpreter](../../docs/tooling-and-learning.md#fvp-interpreter), temporary
input/report/exit helper names, input-fault policy, and explicit observation are
selected. The user accepts the first slice below on baseline `49265c3`.
Numeric/text details and remaining helper contracts remain open. TypeScript/Node now replaces Python as the minimal igniter, with early LiteLang self-hosting as the direction. Owners: [first executable checkpoint](../../docs/tooling-and-learning.md#first-executable-checkpoint)
and [decision ledger](../../docs/decisions-and-open-questions.md#first-executable-interpreter-checkpoint-2026-10-30).
The [FVP focus](../../docs/principles.md#immediate-focus-first-viable-product) defers
module architecture and native compilation.

[Lesson 001](../../language/samples/001_add_two_numbers.lts) needs fixed integer bindings and
addition. [Lesson 002](../../language/samples/002_arithmetic_operations.lts) adds subtraction,
multiplication, and division. [Lesson 020](../../language/samples/020_swap_values.lts) uses
var and replacement. The [initial 001–020 batch](../../language/samples/NOTES.md#initial-correctness-batch)
is incremental, not a requirement to implement all 20 before the first run.

## Selected first runnable slice

- One source file with ordered execution, comments, ordinary separators, and
  clear diagnostics for unsupported constructs. A final declaration remains Unit;
  no implicit output or special meaning for the final binding.
- Integer, floating, and text literals/values for the temporary helper roles,
  plus normal Unit completion. The subsequent [temporary numeric profile](../../docs/numbers.md#temporary-fvp-numeric-profile)
  selects checked 64-bit families; remaining numeric details and supported
  text/escape subset still need definition. Do not inherit host behavior silently.
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

### Implemented checkpoint follow-up, 2026-10-30

The [TypeScript/Node igniter](../../igniter/README.md) now implements this bounded
slice. Its strict typecheck and 15 test groups pass, including the real CLI 7/5
probe producing 24, pre-execution rejection, overflow/input faults, reportError,
exit, and focused outcomes for lessons 001/002/020. Lesson bodies remain unchanged.
Unsupported language features and provisional helper/text choices are documented
in the guide. This is narrow interpreter evidence, not full batch/language or
self-hosted compiler conformance. The earlier evidence below records its original
design-only baseline.

Read the selected FVP/interpreter/helper contracts and lesson sources above.
Checked note/tracking links, fences, and focused diff consistency. No LiteLang
execution, parser/typechecker result, or implementation-time estimate is claimed.

The user accepts the first slice above. The [temporary numeric-profile investigation](INV-014-01-fvp-numeric-profile.md)
now selects provisional signed 64-bit integers, one finite 64-bit binary floating
family, and checked arithmetic faults. Remaining rounding/promotion/literal
details, text profile, and minimal helper contracts are still open. TypeScript/Node is
now the selected minimal igniter; the compiler should move to LiteLang early. The detailed [INV-016.01 text profile](INV-016-01-fvp-text-profile.md#fvp-scope-correction-2026-10-30)
is now deferred and unselected. Basic quoted text and temporary line/word/report
helpers suffice to begin; define practical details as concrete examples need them.
Keep the existing lessons unchanged in this implementation unit. The complete
001–020 batch remains an incremental growth
target, not a prerequisite for this first executable checkpoint.
