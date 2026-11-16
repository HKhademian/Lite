# Runnable FVP examples

Short programs for exploring LiteLang. These project examples are shared by
reference tests, generated compiler migration checks and editor tooling. Their local index
is independent of the [520 learning exercises](../samples/list.md).

Run from the repository root with Node 26.13.0:

```sh
./bin/lite run language/examples/foundations/io/double-sum.lts
./bin/lite compile language/examples/foundations/io/double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
```

`run` compiles to a temporary artifact and executes it. All twenty-six examples compile and run through the generated TS compiler; broader parity items live in [compiler gaps](../../compiler/gaps.md) and the [archived inventory](../../compiler/reports/current-t00-t11-inventory.md). Unsupported source fails without a T00 fallback. C output is deferred.

The interactive examples display explicit prompts. Integer prompts leave the
cursor on the same line; the scanner prints a heading before reading its line.
When input is redirected, the program does not echo that input, so successive
integer prompts may appear together in captured stdout.

- [001 — Double a sum](foundations/io/double-sum.lts): enter 7 and 5; reports 24.
- [002 — Decisions](control/branching/range-decisions.lts): enter an integer; reports its sign,
  checks a range, and demonstrates short-circuiting before division.
- [003 — Sum positive inputs](control/loops/sum-positive.lts): enter 3, -2, 4, 0;
  skips the negative number, stops at zero, and reports 7.
- [004 — Recursive factorial](functions/recursion/factorial.lts): enter 5; reports 120.
  Zero reports 1; negative input explicitly exits 2; overflow faults.
- [005 — Arithmetic scanning](parsing/scanning/scan-arithmetic.lts): enter
  12 + 30; reports number/symbol tokens. Its temporary code-point helpers and bounds
  policy are explicitly approved as of 2026-10-31. This remains a small arithmetic
  demonstration rather than the full Lite lexer.
- [006 — Fixed tuples](types/tuples/fixed-tuples.lts): no input needed; demonstrates
  construction, positional reads, destructuring, singleton/Unit distinctions,
  and tuple function inputs/results. Reports number, 12, number: 12, and 42.
- [007 — Prompts and multiple report values](foundations/io/prompts-and-report.lts):
  enter 7 and 5 at the explicit prompts; reports sum: 12 and the two inputs
  with their equality result. Input prompts add no newline; report separates
  its values with spaces and adds a final newline.
- [008 — Named tuples](types/tuples/named-tuples.lts): no input needed; demonstrates
  named fields, =name shorthand, named function inputs/results, positional
  destructuring and a named singleton. Reports number 12, number: 12,
  number 12, and 42 on separate lines.
- [009 — Fixed arrays](types/collections/fixed-arrays.lts): traverses three named token
  tuples, asks for an index from 0 to 2, reports that token's text, then reports
  sum: 60 using an explicit fixed-array function input. An invalid index faults.

- [010 — Mixed tuples](types/tuples/mixed-tuples.lts): interleaves named and unnamed
  fields, uses a mixed function contract and destructures in stored order.
  Reports 7 green 2 true twice.

- [011 — Tuple label conversion](types/tuples/tuple-label-conversion.lts): gives stored
  positions new labels through explicit receiving types. Reports 640 480 three
  times, retaining source order and values.

- [012 — Named arguments](functions/calls/named-arguments.lts): named/positional interleaving,
  shorthand, replacement of a positional contribution and named self calls.
  Reports 123, 123, and 10 on separate lines.

- [013 — Growable lists](types/collections/growable-lists.lts): typed list construction, all
  four `core/list` mut end operations (`list.pushFront`, `list.pushBack`,
  `list.popFront`, `list.popBack`), and an independent saved sequence. Reports
  0 3, then 1, then 2 on separate lines.

- [014 — Input history](io/streams/input-history.lts): collects integers until 0, then
  reports every entered value and their sum. Enter 7, -2, 5, 0 for a sum of 10;
  entering 0 immediately leaves the history empty and reports sum: 0.

- [015 — Retained tokens](parsing/scanning/retained-tokens.lts): scans arithmetic text into a
  returned list of named token tuples before reporting them. Input 12 + 30
  reports number 12, symbol +, number 30; invalid text exits 2 before printing
  partial tokens.

- [016 — Integer calculator](parsing/evaluators/integer-calculator.lts): a scanner and recursive
  arithmetic parser written entirely in supported Lite. Input 2 + 3 * (4 - 1)
  reports result: 11. Supports parentheses, unary signs and checked integer
  arithmetic; malformed input exits 2 and arithmetic faults remain terminal.

The report-to-TypeScript and report-to-C compiler prototypes are no longer
examples. They live under [compiler/](../../compiler/README.md) and are run with
`./bin/lite-compile` or `./bin/lite compile`; the numbered example gap is intentional.

- [019 — Whole input](io/streams/whole-input.lts): optionally prompted whole-input read
  through EOF. Reports the code-point count and the preserved text; report adds
  its own newline. Empty input is a valid empty String.

- [020 — Script arguments](io/process/script-arguments.lts): reports ordered values from
  inputArgs(). Compile it to `/tmp/args.ts`, then execute
  `node compiler/entry.ts /tmp/args.ts "a b" "" --check`
  to report a b, an empty line, and the literal --check. Omit the suffix for no
  arguments/output. The helper consumes no stdin and adds no prompt.

- [021 — Type aliases](types/aliases/type-aliases.lts): demonstrates Alias := type TypeExpression
  defining transparent named contracts for tuples and growable lists with zero
  runtime memory overhead. Reports ident: total, op: +=, and num: 100.

- [022 — Sum loop](control/loops/sum-loop.lts): sums 1 through 5 with `var` bindings, `+=`
  compound updates, and explicit `loop`/`break`. Reports `sum(1..5) = 15`.

- [023 — Subjectless match](control/branching/subjectless-match.lts): demonstrates subjectless
  Boolean `match { ... }` for both value selection and action statements with
  ordered guards and a final `_` fallback.
- [024 — Numeric widths](foundations/numeric/numeric-widths.lts): demonstrates explicit
  `Int8`, `Int16`, `Int32`, and `Float32` widths, same-family and mixed
  promotion, lossless widening, contextual `List<Int8>`, and binary32 rounding.
- [025 — Tagged control and cleanup](control/unwinding/tagged-control-and-cleanup.lts):
  demonstrates `@tag` labeled block returns, conditional `then` `.value`
  forwarding, tagged multi-loop `continue`/`break`, and LIFO `finally` cleanup.
- [026 — Closures and pipelines](functions/closures/closures-and-pipelines.lts): demonstrates
  callable type aliases, higher-order `map`/`filter`/`fold` list helpers, and
  stateful lexical closures across independent counter frames.
- [027 — Unified blocks and wiring](blocks/wiring/unified-blocks-and-wiring.lts):
  demonstrates value blocks, inner transparent type aliases, forward mutual
  recursion (`even`/`odd`), nearer-forward shadowing vs eager outer reads, and
  `?` execution-trace ordering.
- [028 — Modules and hashing](modules/core/modules-and-hashing.lts): imports a helper
  module ([stats-module](modules/core/helpers/stats-module.lts)) exporting `pub` types,
  constants, and functions alongside `core/format` alignment and `core/crypto`
  SHA-256 hashing.

For project showcases, graphics, audio, and mini-game demos, see [samples](../../samples/README.md).
For the progressive chapter-by-chapter learning curriculum, see the [ability and feature showcase](../showcases/README.md).

When a language feature lands, revisit these examples for obsolete workarounds. Keep an example that explicitly demonstrates the replaced construct; otherwise prefer the simpler current form. See the [artifact-refresh checklist](../../docs/tooling-and-learning.md#refreshing-artifacts-after-a-language-change).

Each Lite file is self-contained. Its visible output is explicitly requested with
output/outputLine/reportError. Place future demonstrations under a descriptive
`<domain>/<subDomain>/<topic>.lts` path with a matching
`example.<domain>.<subDomain>.<topic>` manifest under `language/verifications/artifacts/examples/`
and an indexed entry in this guide (progression order lives here rather than in numeric
filename prefixes). Module examples, when supported, should use .lt; runnable scripts
use .lts. No .lite compatibility extension is introduced.

See the [interpreter guide](../../igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
