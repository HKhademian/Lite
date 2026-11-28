# Runnable FVP examples

Short programs for exploring LiteLang. These project examples are shared by
reference tests, generated compiler migration checks and editor tooling. Their local index
is independent of the [520 learning exercises](lite://repo/language/samples/list.md).

Run from the repository root with Node 26.13.0:

```sh
./bin/lite run language/examples/foundations/io/double-sum.lts
./bin/lite compile language/examples/foundations/io/double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
```

`run` compiles to a temporary artifact and executes it on either TypeScript (`--target ts`, default) or standalone native C11 (`--target c`). All curated examples support both TS and C11 cleanly; see [compiler gaps](lite://doc/compiler/gaps) for remaining open items.

The interactive examples display explicit prompts. Integer prompts leave the
cursor on the same line; the scanner prints a heading before reading its line.
When input is redirected, the program does not echo that input, so successive
integer prompts may appear together in captured stdout.

- [001 — Double a sum](lite://play/double-sum): enter 7 and 5; reports 24.
- [002 — Decisions](lite://play/decisions): enter an integer; reports its sign,
  checks a range, and demonstrates short-circuiting before division.
- [003 — Sum positive inputs](lite://play/example/sum-positive): enter 3, -2, 4, 0;
  skips the negative number, stops at zero, and reports 7.
- [004 — Recursive factorial](lite://play/example/factorial): enter 5; reports 120.
  Zero reports 1; negative input explicitly exits 2; overflow faults.
- [005 — Arithmetic scanning](lite://play/example/scan-arithmetic): enter
  12 + 30; reports number/symbol tokens. Its temporary code-point helpers and bounds
  policy are explicitly approved as of 2026-10-31. This remains a small arithmetic
  demonstration rather than the full Lite lexer.
- [006 — Fixed tuples](lite://play/example/fixed-tuples): no input needed; demonstrates
  construction, positional reads, destructuring, singleton/Unit distinctions,
  and tuple function inputs/results. Reports number, 12, number: 12, and 42.
- [007 — Prompts and multiple report values](lite://play/example/prompts-and-report):
  enter 7 and 5 at the explicit prompts; reports sum: 12 and the two inputs
  with their equality result. Input prompts add no newline; report separates
  its values with spaces and adds a final newline.
- [008 — Named tuples](lite://play/example/named-tuples): no input needed; demonstrates
  named fields, =name shorthand, named function inputs/results, positional
  destructuring and a named singleton. Reports number 12, number: 12,
  number 12, and 42 on separate lines.
- [009 — Fixed arrays](lite://play/example/fixed-arrays): traverses three named token
  tuples, asks for an index from 0 to 2, reports that token's text, then reports
  sum: 60 using an explicit fixed-array function input. An invalid index faults.

- [010 — Mixed tuples](lite://play/example/mixed-tuples): interleaves named and unnamed
  fields, uses a mixed function contract and destructures in stored order.
  Reports 7 green 2 true twice.

- [011 — Tuple label conversion](lite://play/example/tuple-label-conversion): gives stored
  positions new labels through explicit receiving types. Reports 640 480 three
  times, retaining source order and values.

- [012 — Named arguments](lite://play/example/named-arguments): named/positional interleaving,
  shorthand, replacement of a positional contribution and named self calls.
  Reports 123, 123, and 10 on separate lines.

- [013 — Growable lists](lite://play/example/growable-lists): typed list construction, all
  four `type/list` mut end operations (`list.pushFront`, `list.pushBack`,
  `list.popFront`, `list.popBack`), and an independent saved sequence. Reports
  0 3, then 1, then 2 on separate lines.

- [014 — Input history](lite://play/example/input-history): collects integers until 0, then
  reports every entered value and their sum. Enter 7, -2, 5, 0 for a sum of 10;
  entering 0 immediately leaves the history empty and reports sum: 0.

- [015 — Retained tokens](lite://play/example/retained-tokens): scans arithmetic text into a
  returned list of named token tuples before reporting them. Input 12 + 30
  reports number 12, symbol +, number 30; invalid text exits 2 before printing
  partial tokens.

- [016 — Integer calculator](lite://play/example/integer-calculator): a scanner and recursive
  arithmetic parser written entirely in supported Lite. Input 2 + 3 * (4 - 1)
  reports result: 11. Supports parentheses, unary signs and checked integer
  arithmetic; malformed input exits 2 and arithmetic faults remain terminal.

The report-to-TypeScript and report-to-C compiler prototypes are no longer
examples. They live under [compiler/](lite://doc/compiler/overview) and are run with
`./bin/lite-compile` or `./bin/lite compile`; the numbered example gap is intentional.

- [019 — Whole input](lite://play/example/whole-input): optionally prompted whole-input read
  through EOF. Reports the code-point count and the preserved text; report adds
  its own newline. Empty input is a valid empty String.

- [020 — Script arguments](lite://play/example/script-arguments): reports ordered values from
  inputArgs(). Compile it to `/tmp/args.ts`, then execute
  `node compiler/entry.ts /tmp/args.ts "a b" "" --check`
  to report a b, an empty line, and the literal --check. Omit the suffix for no
  arguments/output. The helper consumes no stdin and adds no prompt.

- [021 — Type aliases](lite://play/example/type-aliases): demonstrates Alias := alias TypeExpression
  defining transparent named contracts for tuples and growable lists with zero
  runtime memory overhead. Reports ident: total, op: +=, and num: 100.

- [022 — Sum loop](lite://play/example/sum-loop): sums 1 through 5 with `var` bindings, `+=`
  compound updates, and explicit `loop`/`break`. Reports `sum(1..5) = 15`.

- [023 — Subjectless match](lite://play/example/subjectless-match): demonstrates subjectless
  Boolean `match { ... }` for both value selection and action statements with
  ordered guards and a final `_` fallback.
- [024 — Numeric widths](lite://play/example/numeric-widths): demonstrates explicit
  `Int8`, `Int16`, `Int32`, and `Float32` widths, same-family and mixed
  promotion, lossless widening, contextual `List<Int8>`, and binary32 rounding.
- [025 — Tagged control and cleanup](lite://play/example/tagged-control-and-cleanup):
  demonstrates `@tag` labeled block returns, conditional `then` `.value`
  forwarding, tagged multi-loop `continue`/`break`, and LIFO `finally` cleanup.
- [026 — Closures and pipelines](lite://play/example/closures-and-pipelines): demonstrates
  callable type aliases, higher-order `map`/`filter`/`fold` list helpers, and
  stateful lexical closures across independent counter frames.
- [027 — Unified blocks and wiring](lite://play/example/unified-blocks-and-wiring):
  demonstrates value blocks, inner transparent type aliases, forward mutual
  recursion (`even`/`odd`), nearer-forward shadowing vs eager outer reads, and
  `?` execution-trace ordering.
- [028 — Modules and hashing](lite://play/example/modules-and-hashing): imports a helper
  module ([stats-module](lite://repo/language/examples/modules/core/helpers/stats-module.lts)) exporting `pub` types,
  constants, and functions alongside `type/string` alignment and `core/crypto`
  SHA-256 hashing.
- [029 — Nominal records](lite://play/example/nominal-records): declares nominal `record`
  types with field defaults and zero initialization, constructs values via `Type { = name }`
  and contextual `{ ... }`, and destructures named fields cleanly.
- [030 — Aggregate destructuring](lite://play/aggregate-destructuring): demonstrates
  uniform destructuring and `=name` shorthand across `rec {}`, named/mixed `tuple ()`,
  and fixed `[T; N]` arrays (`[lo, _, hi] := bounds;`).
- [031 — Subject match](lite://play/subject-match): demonstrates subject-based `match`
  over scalars, nominal records, and tuples with comparison patterns, `or` alternatives,
  and `if` guards.
- [032 — Typed maps](lite://play/example/typed-maps): demonstrates `Map<K, V>` indexed
  writes/reads, `type/map` operations (`set`, `has`, `getOr`, `remove`, `size`),
  independent value snapshots, and insertion-order entry iteration.
- [033 — Value enums](lite://play/example/value-enums): declares an `Int`-backed nominal
  `enum`, uses auto-incremented cases, contextual `.Case` shorthand, `.value` reads,
  and exhaustive `match`.
- [034 — Typed sets](lite://play/example/typed-sets): demonstrates `Set<T>` deduplication,
  `type/set` operations (`add`, `has`, `remove`, `size`, `values`), independent value
  snapshots, and insertion-order element iteration.
- [035 — Packed widths & bitwise](lite://play/example/packed-widths-and-bitwise): demonstrates `Int4`/`UInt4`, `UInt8`, and `Float16` widths, `.wrappingAdd`/`.saturatingAdd`/bitwise methods, `wideningMul`, and `.fma`.
- [036 — Slices, splitAt & bit-packed storage](lite://play/example/slice-split-and-pack): demonstrates zero-copy `Slice<Int>`, disjoint `mut s.splitAt(mid)`, bit-packed `[Bool; N]` slices with `loop mut`, and `String.bytes()`.
- [037 — Option, #packed layout, SIMD & SoA](lite://play/example/option-simd-soa): demonstrates `#packed` records, `Option<T>` (`if .Some(...) := ...`), `Rc<T>`, `Float32x4` SIMD, and `SoA<Particle>` columns.
- [038 — Interfaces, associated types & dyn](lite://play/example/interfaces-and-dyn): demonstrates `interface`/`impl`, associated types, default method bodies, bounded generics, and `dyn` dispatch.
- [039 — Lexical contexts & overloads](lite://play/example/lexical-context-and-overloads): demonstrates `context(...)` defaults and scoped overrides alongside statically resolved overloading.
- [040 — Loop mut, .static(), do & dependent defaults](lite://play/example/loop-mut-and-static): demonstrates `loop mut`, contextual `.static()` calls, standalone `do { ... }` blocks, `if` pattern bindings, and dependent defaults.
- [041 — Unions & fallible pipelines](lite://play/example/unions-and-fallibles): demonstrates normalized `A | B` unions, `match` narrowing, `T ! E` / `T!`, `ToError`, postfix `!`, and `else(err)` recovery.
- [042 — Comptime, structural records, defaults & variance](lite://play/example/comptime-and-records): demonstrates `comptime { ... }`, structural `{ ... }` records, unified `alias`, earlier-parameter defaults, and callable variance.

For project showcases, graphics, audio, and mini-game demos, see [samples](lite://repo/samples/README.md).
For the progressive chapter-by-chapter learning curriculum, see the [ability and feature showcase](lite://repo/language/showcases/README.md).

When a language feature lands, revisit these examples for obsolete workarounds. Keep an example that explicitly demonstrates the replaced construct; otherwise prefer the simpler current form. See the [artifact-refresh checklist](lite://doc/tooling-and-learning#refreshing-artifacts-after-a-language-change).

Each Lite file is self-contained. Its visible output is explicitly requested with
output/outputLine/reportError. Place future demonstrations under a descriptive
`<domain>/<subDomain>/<topic>.lts` path with a matching
`example.<domain>.<subDomain>.<topic>` manifest under `language/verifications/artifacts/examples/`
and an indexed entry in this guide (progression order lives here rather than in numeric
filename prefixes). Module examples, when supported, should use .lt; runnable scripts
use .lts. No .lite compatibility extension is introduced.

See the [interpreter guide](lite://repo/igniter/README.md) for supported features and
limits. Numbering/navigation and successful tests do not select language designs.
