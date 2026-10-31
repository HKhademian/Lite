# Runnable FVP examples

Short programs for exploring the current Lite interpreter. These are project
examples, shared by the interpreter tests and editor tooling. Their local index
is independent of the [520 learning exercises](../samples/list.md).

Run from the repository root with Node 26.13.0:

```sh
./lite run examples/001-double-sum.lts
```

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
  four explicit mut end operations, and an independent saved sequence. Reports
  0 3, then 1, then 2 on separate lines.

- [014 — Input history](014-input-history.lts): collects integers until 0, then
  reports every entered value and their sum. Enter 7, -2, 5, 0 for a sum of 10;
  entering 0 immediately leaves the history empty and reports sum: 0.

- [015 — Retained tokens](015-retained-tokens.lts): scans arithmetic text into a
  returned list of named token tuples before reporting them. Input 12 + 30
  reports number 12, symbol +, number 30; invalid text exits 2 before printing
  partial tokens.

Each file is self-contained. Its visible output is explicitly requested with
report/reportError. Keep future demonstrations here with the next three-digit
index, a descriptive hyphenated filename and an entry in this guide. Module
examples, when supported, should use .lt; runnable scripts use .lts. No .lite
compatibility extension is introduced.

See the [interpreter guide](../igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
