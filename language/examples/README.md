# Runnable FVP examples

Short programs for exploring LiteLang. These project examples are shared by
reference tests, generated compiler migration checks and editor tooling. Their local index
is independent of the [520 learning exercises](../samples/list.md).

Run from the repository root with Node 26.13.0:

```sh
./bin/lite run language/examples/001-double-sum.lts
./bin/lite compile language/examples/001-double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
```

`run` compiles to a temporary artifact and executes it. All twenty-two examples compile and run through the generated TS compiler; broader parity items live in [compiler gaps](../../compiler/gaps.md) and the [archived inventory](../../compiler/reports/current-t00-t11-inventory.md). Unsupported source fails without a T00 fallback. C output is deferred.

The interactive examples display explicit prompts. Integer prompts leave the
cursor on the same line; the scanner prints a heading before reading its line.
When input is redirected, the program does not echo that input, so successive
integer prompts may appear together in captured stdout.

- [001 — Double a sum](001-double-sum.lts): enter 7 and 5; reports 24.
- [002 — Decisions](002-decisions.lts): enter an integer; reports its sign,
  checks a range, and demonstrates short-circuiting before division.
- [003 — Sum positive inputs](003-sum-positive.lts): enter 3, -2, 4, 0;
  skips the negative number, stops at zero, and reports 7.
- [004 — Recursive factorial](004-factorial.lts): enter 5; reports 120.
  Zero reports 1; negative input explicitly exits 2; overflow faults.
- [005 — Arithmetic scanning](005-scan-arithmetic.lts): enter
  12 + 30; reports number/symbol tokens. Its temporary code-point helpers and bounds
  policy are explicitly approved as of 2026-10-31. This remains a small arithmetic
  demonstration rather than the full Lite lexer.
- [006 — Fixed tuples](006-fixed-tuples.lts): no input needed; demonstrates
  construction, positional reads, destructuring, singleton/Unit distinctions,
  and tuple function inputs/results. Reports number, 12, number: 12, and 42.
- [007 — Prompts and multiple report values](007-prompts-and-report.lts):
  enter 7 and 5 at the explicit prompts; reports sum: 12 and the two inputs
  with their equality result. Input prompts add no newline; report separates
  its values with spaces and adds a final newline.
- [008 — Named tuples](008-named-tuples.lts): no input needed; demonstrates
  named fields, =name shorthand, named function inputs/results, positional
  destructuring and a named singleton. Reports number 12, number: 12,
  number 12, and 42 on separate lines.
- [009 — Fixed arrays](009-fixed-arrays.lts): traverses three named token
  tuples, asks for an index from 0 to 2, reports that token's text, then reports
  sum: 60 using an explicit fixed-array function input. An invalid index faults.

- [010 — Mixed tuples](010-mixed-tuples.lts): interleaves named and unnamed
  fields, uses a mixed function contract and destructures in stored order.
  Reports 7 green 2 true twice.

- [011 — Tuple label conversion](011-tuple-label-conversion.lts): gives stored
  positions new labels through explicit receiving types. Reports 640 480 three
  times, retaining source order and values.

- [012 — Named arguments](012-named-arguments.lts): named/positional interleaving,
  shorthand, replacement of a positional contribution and named self calls.
  Reports 123, 123, and 10 on separate lines.

- [013 — Growable lists](013-growable-lists.lts): typed list construction, all
  four `core/list` mut end operations (`list.pushFront`, `list.pushBack`,
  `list.popFront`, `list.popBack`), and an independent saved sequence. Reports
  0 3, then 1, then 2 on separate lines.

- [014 — Input history](014-input-history.lts): collects integers until 0, then
  reports every entered value and their sum. Enter 7, -2, 5, 0 for a sum of 10;
  entering 0 immediately leaves the history empty and reports sum: 0.

- [015 — Retained tokens](015-retained-tokens.lts): scans arithmetic text into a
  returned list of named token tuples before reporting them. Input 12 + 30
  reports number 12, symbol +, number 30; invalid text exits 2 before printing
  partial tokens.

- [016 — Integer calculator](016-integer-calculator.lts): a scanner and recursive
  arithmetic parser written entirely in supported Lite. Input 2 + 3 * (4 - 1)
  reports result: 11. Supports parentheses, unary signs and checked integer
  arithmetic; malformed input exits 2 and arithmetic faults remain terminal.

The report-to-TypeScript and report-to-C compiler prototypes are no longer
examples. They live under [compiler/](../../compiler/README.md) and are run with
`./bin/lite-compile` or `./bin/lite compile`; the numbered example gap is intentional.

- [019 — Whole input](019-whole-input.lts): optionally prompted whole-input read
  through EOF. Reports the code-point count and the preserved text; report adds
  its own newline. Empty input is a valid empty String.

- [020 — Script arguments](020-script-arguments.lts): reports ordered values from
  inputArgs(). Compile it to `/tmp/args.ts`, then execute
  `node compiler/entry.ts /tmp/args.ts "a b" "" --check`
  to report a b, an empty line, and the literal --check. Omit the suffix for no
  arguments/output. The helper consumes no stdin and adds no prompt.

- [021 — Type aliases](021-type-aliases.lts): demonstrates Alias := type TypeExpression
  defining transparent named contracts for tuples and growable lists with zero
  runtime memory overhead. Reports ident: total, op: +=, and num: 100.

- [022 — Sum loop](022-sum-loop.lts): sums 1 through 5 with `var` bindings, `+=`
  compound updates, and explicit `loop`/`break`. Reports `sum(1..5) = 15`.

- [023 — Subjectless match](023-subjectless-match.lts): demonstrates subjectless
  Boolean `match { ... }` for both value selection and action statements with
  ordered guards and a final `_` fallback.
- [024 — Numeric widths](024-numeric-widths.lts): demonstrates explicit
  `Int8`, `Int16`, `Int32`, and `Float32` widths, same-family and mixed
  promotion, lossless widening, contextual `List<Int8>`, and binary32 rounding.

## Play canvas & audio examples (`play/`)

Interactive programs using `extra/canvas`, `extra/board`, and `extra/audio`:

- [play/01 — Bounce](play/01-bounce.lts): `320x200` animated mark with RGBA
  halo and wall-bounce chimes.
- [play/02 — RGBA composition](play/02-rgba-art.lts): `360x240` layered
  translucent disks, gridlines, and frames.
- [play/03 — Pointer paint](play/03-cursor-paint.lts): `240x160` interactive
  canvas with drag drawing, palette swatches, and keyboard shortcuts.
- [play/04 — Synth arpeggio](play/04-arpeggio.lts): `320x180` four-pad
  sequencer using `audio.Note` and `onCanvas*` hooks.

When a language feature lands, revisit these examples for obsolete workarounds. Keep an example that explicitly demonstrates the replaced construct; otherwise prefer the simpler current form. See the [artifact-refresh checklist](../../docs/tooling-and-learning.md#refreshing-artifacts-after-a-language-change).

Each Lite file is self-contained. Its visible output is explicitly requested with
output/outputLine/reportError. Keep future demonstrations here with the next three-digit
index, a descriptive hyphenated filename and an entry in this guide. Module
examples, when supported, should use .lt; runnable scripts use .lts. No .lite
compatibility extension is introduced.

See the [interpreter guide](../../igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
