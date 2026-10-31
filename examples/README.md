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

- [016 — Integer calculator](016-integer-calculator.lts): a scanner and recursive
  arithmetic parser written entirely in supported Lite. Input 2 + 3 * (4 - 1)
  reports result: 11. Supports parentheses, unary signs and checked integer
  arithmetic; malformed input exits 2 and arithmetic faults remain terminal.

- [017 — Report-to-TypeScript compiler](017-report-ts-compiler.lts): reads complete
  Lite source such as report(42); and emits a readable TS module. It supports
  one signed-decimal Int report with multi-line whitespace and rejects unsupported syntax before emitting
  code. Inspect the [TS reference](generated/017-report-42.ts) and
  [explicit Node adapter](generated/017-run-report.ts); the adapter prints 42.
  The [generated-source checking config](generated/tsconfig.json) inherits the
  igniter's strict options. This is an initial emitter, not a self-hosted compiler.

- [018 — Report-to-C compiler](018-report-c-compiler.lts): compiles the same
  restricted signed-integer report source into standalone readable C. The
  [C reference](generated/018-report-42.c) builds with a C11 compiler and standard
  library. Native output bytes/status match the igniter and TS path for the 12
  tested cases; general libraries/ABI and self-hosting remain future work.

- [019 — Whole input](019-whole-input.lts): optionally prompted whole-input read
  through EOF. Reports the code-point count and the preserved text; report adds
  its own newline. Empty input is a valid empty String.

- [020 — Script arguments](020-script-arguments.lts): reports ordered values from
  inputArgs(). Run ./lite run examples/020-script-arguments.lts -- "a b" "" --check
  to report a b, an empty line, and the literal --check. Omit the suffix for no
  arguments/output. The helper consumes no stdin and adds no prompt.

Each Lite file is self-contained. Its visible output is explicitly requested with
report/reportError. Keep future demonstrations here with the next three-digit
index, a descriptive hyphenated filename and an entry in this guide. Module
examples, when supported, should use .lt; runnable scripts use .lts. No .lite
compatibility extension is introduced.

See the [interpreter guide](../igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
