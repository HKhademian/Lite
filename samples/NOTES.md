# Notes for language contributors

Exercises 001–020 are written; the complete batch remains **unverified** against
the language design. The limited [TypeScript/Node igniter](../igniter/README.md)
now checks and runs the supported subset. Its tests verify outcomes for lessons
001, 002, and 020 by appending explicit report calls in memory, without changing
lesson bodies. This is bounded interpreter evidence, not full language or batch
conformance. Exercises 021–520 remain planned; no native compiler exists.

The `.lts` files are introductory reading material. Keep each focused on one worked example, with a plain-language problem, named inputs, and expected answers next to the calculation. Put verification records and language-design questions here. A printed answer, assertion API, or script exit-value convention is not assumed.

## FVP example organization, 2026-10-31

The user requests that implementation demonstrations live with the project's
examples and have numbered names. The five former igniter examples now live
under root-level [examples](../examples/README.md) as 001-double-sum.lts through
005-scan-arithmetic.lts. This local sequence leaves exercise IDs 001–520 intact.
Source bodies are unchanged; tests, run commands, investigation links and the
editor preview/discovery paths follow the new locations. Implementation-private
unit-test cases stay in the igniter test file. New demonstrations should join
the root examples collection with an indexed name and a guide entry. The user
explicitly allows this directory and reuse/reordering of samples when useful;
the separate exercise catalog does not need renumbering for this move.
Relocation does not approve the experimental text helpers or change lesson
verification status.

The user's subsequent prompt update adds explicit input prompts to root examples
001–004 and a report heading before line input in 005. Scanner token reports use
the approved multiple-value helper. Their expected-output tests and guide now
include those requested effects. The learning exercise files are unchanged.

## Source file kind migration

Selected 2026-10-30: these introductory scripts use .lts; module-based source
uses .lt and has no implicit imports. The 20 existing files were renamed from
.lite to .lts and catalog/readme paths updated without changing lesson bodies.
Their implemented-but-unverified status is unchanged. Legacy .lite names in
dated investigation/backlog snapshots describe earlier revisions. No compiler
alias or source conversion is implemented. General script conveniences remain
proposals; [temporary FVP input/reporting names](../docs/tooling-and-learning.md#temporary-fvp-input-and-reporting)
are now selected, with full I/O contracts open. No input/report calls or in-program
checks have been added to these lessons; see [source kinds](../docs/modules-and-packages.md#distinct-script-and-module-files).

## Initial correctness batch

Selected 2026-10-28: use exercises **001–020** as the initial correctness batch
for the tiny demonstrator. Run supported cases incrementally as the demonstrator
grows; the batch is not a requirement to implement all its features before the
first runnable experiment. Add focused examples as conditionals, functions,
loops, and other features become executable. The full 520-exercise catalog guides
later coverage and is not a completion gate for the tiny demonstrator.

Selected 2026-10-30: the [first executable checkpoint](../docs/tooling-and-learning.md#first-executable-checkpoint)
supports scalar values, bindings/replacement, basic arithmetic, and temporary
helper calls before adding control flow, user functions, and tuples. It does
not claim the full batch is executable or waive its in-program-check acceptance
direction. No lesson bodies or verification status change with this selection.

The experimental igniter has since added [conditions, loops, typed scalar
functions, fixed tuples, and experimental text operations](../igniter/README.md#supported-checkpoint),
with focused examples and 120 test groups. The new text helpers still await
explicit consent. This does not expand the checked lesson outcomes beyond 001,
002, and 020 or add in-program checks to the lesson sources.

The selected acceptance direction is in-program checks for 001–020, with mismatch
using the panic channel, followed later by a grading harness. Comment answers
remain documentation. Check syntax/API, exit status, numeric contracts, and host
observation still need definition; no checks have been added to the lessons and
all 20 remain implemented but unverified. See
[INV-002](../investigations/INV-002-01-exercise-contracts-001-020.md) for evidence,
selected policy, and remaining dependencies. Exact later milestone coverage is open.

## Multilingual learning proposal

Current lessons retain simple-English reference syntax. The [multilingual source
proposal](../docs/multilingual-source-and-learning.md) records familiar-language
keywords/names, teaching APIs, narratives, diagnostics, and an optional bridge to
English as investigation scope. Unicode names alone do not implement that scope.
Do not present illustrative translations as accepted syntax, rewrite payload
strings as part of code conversion, or claim learner benefits before evaluation.
Use the [question map](../investigations/multilingual-source-and-learning.md) for
paired-lesson and conversion checks; no translated sample suite is claimed.

## Arithmetic choices and bounds

- Use small finite values. For further experiments, keep integer magnitudes and intermediate products at most 1000000 and fractional input magnitudes at most 1000. These teaching bounds do not select integer widths or numeric precision.
- Widths and heights are positive; radius, distance, duration, and monetary amounts are nonnegative. Division requires a nonzero divisor. Duration decomposition uses whole seconds; bill splitting uses at least one person. Weights are nonnegative with a positive sum. Interpolation uses a fraction from zero through one. These are supplied-input examples, without input validation.
- [Contextual `/`, integer floor `_/`, remainder `%`, and modulo `_%`](../docs/division.md) follow the selected design. Int-result `/` truncates and pairs with `%`; Float/Double result contexts retain fractional answers, including integer-spelled literals. Floor `_/` pairs with `_%` for signed inputs. Whole-unit examples use integer `/` with nonnegative inputs and positive divisors. Fractional formulas use fractional literals consistently for readability; either decimal literal in 2.0 / 7 or 2 / 7.0 already supplies a fractional default. Int storage does not override floating arithmetic: nonintegral floating operands are admitted and retain their values during division, then / truncates or _/ floors the quotient for the destination. For example 2 / 0.5 stores 4 in Int. General assignment casts, mixed floating-width precision, representability/non-finite faults, and complete expected-type propagation through unresolved subexpressions/calls/returns remain open. Floating intermediates in the admitted expression now stay untruncated until full-value Int storage; a typed Int intermediate introduces an earlier storage boundary. Parentheses alone do not truncate. See [the selected rule](../docs/division.md#floating-intermediates-and-storage-boundaries). Compact underscore-operator scanning remains an unresolved lexical question. The full [numeric representation, literal typing, and compatibility rules](../docs/numbers.md) remain open.
- Parentheses make grouping explicit; basic arithmetic precedence and left association are selected, while complete [expression integration and power contracts](../docs/operators.md) remain open. The temperature formula uses the familiar multiply/divide/add sequence.
- Circle measurements use supplied approximate pi `3.14159`; displayed answers are approximate. Future automated fractional checks should use appropriate tolerances.
- Money uses integer cents and nonnegative half-up rounding. For a numerator `n` and positive denominator `d`, `(n + (d / 2)) / d` rounds to the nearest integer, with ties upward. This also works for odd denominators.
- Discount rounding applies to the discount before subtraction. Tax and tip each use the pretax price and are rounded separately. Simple interest earns on the original principal and rounds once after the full term. The currency example uses an invented rational rate relating minor units directly.

## Verification and design work

After the division-family revision, the examples' 40 named result values were rechecked with an external exact-rational arithmetic model that distinguishes integer and fractional operands. Earlier binary-floating checks remain arithmetic observations, not a selected representation. Approximate comments were reviewed against those values, and local documentation links were checked. This is arithmetic review, not LiteScript execution verification.

Check ordinary cases, zero where permitted, negative arithmetic inputs where meaningful, fractional answers, unit boundaries, and rounding ties separately from the introductory examples. For duration and bill splitting, also check that the parts reconstruct the original total. For swapping, check that both original values survive, including equal values and zero.

No standard library is required by these calculations. No compiler diagnostics have been observed. Numeric precision, inferred types, the complete expression grammar, and [run/build and diagnostic tooling](../docs/tooling-and-learning.md) still need implementation and review. A real toolchain must run these files before their status becomes **verified**.
