# T00 versus T11 support inventory

Runtime environment details omitted for privacy.
Working tree at audit start: modified. The raw report records its status; artifact and per-source hashes identify the measured inputs.

T11 identity: `3fe0dd566163b06861e0a05cb84da47afdc8934921133f02ac626e0e9975fcdd`. The preserved artifact passed its separate strict TypeScript check.

This is the current measured support inventory, not acceptance of new language features. Dated historical inventories remain unchanged.

## Scope and interpretation

- All canonical feature, example, sample and showcase manifests were selected, regardless of their existing target lists. Each scenario ran under T00, with its expected manifest bytes checked, and under the T11-generated TS program when compilation and strict checking succeeded.
- Additional boundary probes isolate existing T00 contracts that a broad canonical program can hide. Their exact source, input, output and interpreter-test reference are in the raw JSON and probe file.
- Every tracked Lite source is accounted for. Source fragments/data fixtures rejected as standalone programs by T00 are excluded. Remaining sources receive a compile-only check, except bundles explicitly linked to recorded self-compilation evidence. Large-source artifacts can reuse exact source/builder/artifact identities and receive a fresh strict typecheck; other source checks do not include execution.
- A rejection is a gap for that program, not proof that every subfeature in it is absent. Matching one probe is not universal feature parity. Runtime diagnostics are distinguished from output/status mismatches. The 520 exercise catalog contains only 20 implemented lesson files; planned exercises are not counted as supported programs.
- Canonical case counts describe tested programs, not complete feature support. Isolated probes can reveal gaps within a passing broad case. Both runtime paths use anonymous source diagnostics; raw-byte input probes use the reference CLI's lazy strict decoding behavior.
- Five-second execution and twenty-second ordinary compiler limits are bounded audit checks, not performance measurements. With --large-sources, compiler bundles over 50 KB receive up to ten minutes each. Timeout rows are unverified, not unsupported.

## Counts

- feature: 38; 23 matches tested behavior; 15 T11 rejects source.
- example: 19; 11 matches tested behavior; 8 T11 rejects source.
- sample: 20; 11 matches tested behavior; 9 T11 rejects source.
- probe: 79; 32 matches tested behavior; 47 T11 rejects source.
- library-test: 8; 8 matches tested behavior.
- trackedSourceFiles: 210.
- Showcases: none currently implemented.

## Progress since the original inventory

- 33 formerly failing cases now match; 0 formerly matching cases regress. Case identity includes kind and id.
- 85/164 executed source cases match; 79 still fail. These are case counts, not distinct missing features or an overall completion percentage.
- Native C, compile-only sources and run/check migration have separate gates in [the live gap tracker](../gaps.md).

Closed original cases:

- feature: io.input
- example: example.001-double-sum
- example: example.002-decisions
- example: example.003-sum-positive
- example: example.004-factorial
- example: example.005-scan-arithmetic
- example: example.007-prompts-and-report
- example: example.014-input-history
- example: example.015-retained-tokens
- example: example.019-whole-input
- probe: numeric.dynamic-add-overflow
- probe: numeric.dynamic-subtract-overflow
- probe: numeric.dynamic-multiply-overflow
- probe: numeric.dynamic-negate-overflow
- probe: numeric.dynamic-divide-fault
- probe: input.integer
- probe: input.float
- probe: input.line
- probe: input.whole-prompt
- probe: comparison.chain
- probe: tuple.report
- probe: function.report-order
- probe: text.bounds-diagnostic
- probe: output.before-fault
- probe: text.adjacent-literals
- probe: call.trailing-comma
- probe: syntax.final-semicolon
- probe: syntax.empty-script
- probe: syntax.whitespace-script
- probe: condition.dead-arithmetic
- probe: logic.short-circuit-fault
- probe: comparison.parenthesized-not-equal
- probe: input.invalid-utf8

## feature

- **int.arithmetic — matches tested behavior.** Signed Int arithmetic and precedence. Source: `verifications/features/int-arithmetic.lts`.
- **num.widths — T11 rejects source.** Sized integer and floating widths with promotion and lossless widening. Source: `verifications/features/num-widths.lts`.
  First diagnostic: 1:4: unsupported local type Int8
- **bool.conditions — matches tested behavior.** Bool comparisons and conditional selection. Source: `verifications/features/bool-conditions.lts`.
- **comparison.chains — matches tested behavior.** Adjacent comparison chains with single-evaluation middle values and lazy later operands. Source: `verifications/features/comparison-chains.lts`.
- **cond.partial — T11 rejects source.** Partial conditional declaration defaults and no-write assignments. Source: `verifications/features/cond-partial.lts`.
  First diagnostic: 2:19: value if requires a final else
- **loop.conditional — matches tested behavior.** Conditional action loops with mutable state. Source: `verifications/features/loop-conditional.lts`.
- **loop.sequence — matches tested behavior.** Ordered sequence traversal loops. Source: `verifications/features/loop-sequence.lts`.
- **loop.value — T11 rejects source.** Typed loop .value accumulation and then completion. Source: `verifications/features/loop-value.lts`.
  First diagnostic: 1:8: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.metadata — T11 rejects source.** Loop metadata and payload/targeted exits. Source: `verifications/features/loop-metadata.lts`.
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **finally.cleanup — T11 rejects source.** Construct-level finally cleanup ordering. Source: `verifications/features/finally-cleanup.lts`.
  First diagnostic: 1:31: expected an Int, String or Bool expression
- **function.recursion — matches tested behavior.** Typed functions and own-name recursion. Source: `verifications/features/function-recursion.lts`.
- **tuple.shape — T11 rejects source.** Flat tuple values and fields. Source: `verifications/features/tuple-shape.lts`.
  First diagnostic: 3:1: expected a statement: output/outputLine, declaration, assignment, if or loop
- **array.fixed — matches tested behavior.** Fixed arrays and indexed reads. Source: `verifications/features/array-fixed.lts`.
- **list.mutation — T11 rejects source.** Growable lists and end operations. Source: `verifications/features/list-mutation.lts`.
  First diagnostic: 3:11: expected := or = after local name push_front
- **text.helpers — matches tested behavior.** Temporary code-point text helpers. Source: `verifications/features/text-helpers.lts`.
- **alias.transparent — matches tested behavior.** Transparent type aliases. Source: `verifications/features/alias-transparent.lts`.
- **scope.locals — T11 rejects source.** Lexical local scope and shadowing. Source: `verifications/features/scope-locals.lts`.
  First diagnostic: 2:1: expected a statement: output/outputLine, declaration, assignment, if or loop
- **scope.assignment — matches tested behavior.** Mutable var replacement. Source: `verifications/features/scope-assignment.lts`.
- **io.input — matches tested behavior.** Prompted integer input. Source: `verifications/features/io-input.lts`.
- **io.arguments — matches tested behavior.** Ordered script arguments. Source: `verifications/features/io-arguments.lts`.
- **io.whole-input — matches tested behavior.** Whole remaining input through EOF. Source: `verifications/features/io-whole-input.lts`.
- **io.exit — matches tested behavior.** Explicit process exit. Source: `verifications/features/io-exit.lts`.
- **io.report — matches tested behavior.** Multiple report values.
- **int.remainder — matches tested behavior.** Truncating Int remainder. Source: `verifications/features/int-remainder.lts`.
- **text.concat — matches tested behavior.** String concatenation. Source: `verifications/features/text-concat.lts`.
- **local.immutable — matches tested behavior.** Immutable local bindings. Source: `verifications/features/local-immutable.lts`.
- **string.escape — matches tested behavior.** String escape sequences. Source: `verifications/features/string-escape.lts`.
- **report.multi — matches tested behavior.** Multi-value reports. Source: `verifications/features/report-multi.lts`.
- **report.tuple — T11 rejects source.** Source-like report display of flat tuple values. Source: `verifications/features/report-tuple.lts`.
  First diagnostic: 1:29: expected )
- **int.limits — matches tested behavior.** Signed 64-bit Int boundaries. Source: `verifications/features/int-limits.lts`.
- **int.floor — matches tested behavior.** Floor division and floor modulo. Source: `verifications/features/int-floor.lts`.
- **scope.compound — T11 rejects source.** Compound arithmetic updates. Source: `verifications/features/scope-compound.lts`.
  First diagnostic: 2:7: expected := or = after local name total
- **mut.inferred — T11 rejects source.** Inferred mut and var mut declarations. Source: `verifications/features/mut-inferred.lts`.
  First diagnostic: 1:1: unsupported feature "mut": see docs/declarations-and-assignment.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **num.power — T11 rejects source.** Right-associative Float-default power. Source: `verifications/features/num-power.lts`.
  First diagnostic: 1:15: expected an Int, String or Bool expression
- **match.subjectless — T11 rejects source.** Subjectless Boolean match selection. Source: `verifications/features/match-subjectless.lts`.
  First diagnostic: 2:10: unsupported feature "match": see docs/match.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **init.zero — T11 rejects source.** Zero initialization for omitted typed locals. Source: `verifications/features/init-zero.lts`.
  First diagnostic: 3:5: expected a tuple field name
- **init.reserved — T11 rejects source.** Reserved storage and first whole-value initialization. Source: `verifications/features/init-reserved.lts`.
  First diagnostic: 1:10: expected an Int, String or Bool expression
- **io.temporary — matches tested behavior.** Temporary input prompts and variadic output/outputLine helpers. Source: `verifications/features/io-temporary.lts`.

## probe

- **numeric.float — T11 rejects source.** Float literals and mixed Int/Float arithmetic
  First diagnostic: 1:13: expected )
- **numeric.sized-int — T11 rejects source.** Sized Int8/Int16/Int32 storage and widening
  First diagnostic: 1:4: unsupported local type Int8
- **numeric.int64-alias — T11 rejects source.** Explicit Int64 annotations
  First diagnostic: 1:4: unsupported local type Int64
- **numeric.float32 — T11 rejects source.** Float32 rounding and promotion
  First diagnostic: 1:4: unsupported local type Float32
- **numeric.float-aliases — T11 rejects source.** Float64 and Double annotations
  First diagnostic: 1:4: unsupported local type Float64
- **numeric.exponent-literal — T11 rejects source.** Decimal exponent literal syntax
  First diagnostic: 1:13: expected )
- **numeric.power — T11 rejects source.** Right-associative Float-default power
  First diagnostic: 1:15: expected an Int, String or Bool expression
- **numeric.dynamic-add-overflow — matches tested behavior.** Runtime Int64 addition overflow faults
- **numeric.dynamic-subtract-overflow — matches tested behavior.** Runtime Int64 subtraction overflow faults
- **numeric.dynamic-multiply-overflow — matches tested behavior.** Runtime Int64 multiplication overflow faults
- **numeric.dynamic-negate-overflow — matches tested behavior.** Runtime Int64 negation overflow faults
- **numeric.dynamic-divide-fault — matches tested behavior.** Runtime division fault and diagnostic contract
- **input.integer — matches tested behavior.** Prompted inputInt and token consumption
- **input.float — matches tested behavior.** inputFloat parsing
- **input.line — matches tested behavior.** inputLine and shared input cursor
- **input.word — T11 rejects source.** inputWord tokenization
  First diagnostic: 1:12: unknown value inputWord
- **input.whole-prompt — matches tested behavior.** Optional inputAll prompt
- **input.whole-unprompted — matches tested behavior.** Unprompted inputAll including a trailing newline
- **input.arguments — matches tested behavior.** Script argument order, empty strings and copies
- **condition.partial-default — T11 rejects source.** Partial conditional declaration defaults
  First diagnostic: 1:20: value if requires a final else
- **condition.partial-assignment — T11 rejects source.** False partial conditional assignment performs no write
  First diagnostic: 1:40: value if requires a final else
- **condition.block-value — T11 rejects source.** General block-valued expressions and local tails
  First diagnostic: 1:6: expected an Int, String or Bool expression
- **condition.statement-value-if — T11 rejects source.** Statement-bearing value-if branches outside function tails
  First diagnostic: 1:16: unknown value y
- **condition.unit-block — T11 rejects source.** Empty blocks and declaration tails produce Unit
  First diagnostic: 1:12: expected an Int, String or Bool expression
- **comparison.chain — matches tested behavior.** Comparison chains
- **comparison.complements — matches tested behavior.** Complement comparison spellings <! <!= >! >!=
- **scope.compound — T11 rejects source.** Compound arithmetic updates
  First diagnostic: 1:16: expected := or = after local name x
- **scope.discarded-expression — T11 rejects source.** Expression statements with silent Unit script completion
  First diagnostic: 1:11: expected := or = after local name x
- **scope.zero-scalar — matches tested behavior.** Omitted typed scalar initializers
- **scope.reserved — T11 rejects source.** Reserved storage and first whole-value initialization
  First diagnostic: 1:10: expected an Int, String or Bool expression
- **tuple.unnamed — T11 rejects source.** Unnamed tuple construction and positional reads
  First diagnostic: 1:11: expected )
- **tuple.mixed — T11 rejects source.** Mixed named/unnamed tuple fields
  First diagnostic: 1:12: expected )
- **tuple.shorthand — T11 rejects source.** Named tuple field shorthand
  First diagnostic: 1:29: expected an Int, String or Bool expression
- **tuple.destructuring — T11 rejects source.** Tuple destructuring declarations
  First diagnostic: 1:25: expected a statement: output/outputLine, declaration, assignment, if or loop
- **tuple.receiving-labels — T11 rejects source.** Typed receiving declarations rename tuple positions
  First diagnostic: 1:29: cannot initialize (l: Int, r: Int) with (r: Int, l: Int)
- **tuple.report — matches tested behavior.** Source-like tuple report formatting
- **tuple.unit-singleton — T11 rejects source.** Unit, empty tuples and singleton tuples
  First diagnostic: 1:24: expected )
- **array.fixed — T11 rejects source.** Fixed-extent arrays and bracket reads
  First diagnostic: 1:9: unsupported local type
- **array.inferred — T11 rejects source.** Unannotated brackets infer a fixed array
  First diagnostic: 1:36: expected )
- **array.function — T11 rejects source.** Fixed-array function parameters/results
  First diagnostic: 1:15: unsupported function type
- **list.front-operations — T11 rejects source.** push_front/pop_front end operations
  First diagnostic: 1:43: expected := or = after local name push_front
- **list.inferred-mut — T11 rejects source.** Inferred mut and var mut list declarations
  First diagnostic: 1:1: unsupported feature "mut": see docs/declarations-and-assignment.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **list.unit-elements — T11 rejects source.** List<Unit> element contracts
  First diagnostic: 1:14: unsupported list element type Unit
- **list.tuple-copies — matches tested behavior.** Named-tuple list elements and copied end results
- **loop.unnamed-traversal — T11 rejects source.** Sequence traversal without an item binding
  First diagnostic: 1:6: loop condition must be Bool
- **loop.value — T11 rejects source.** Loop values and then completion
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.metadata — T11 rejects source.** Loop .item/.index/.count metadata
  First diagnostic: 1:33: expected an Int, String or Bool expression
- **loop.payload — T11 rejects source.** Value-bearing break and continue
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.tagged — T11 rejects source.** Tagged outer-loop exits
  First diagnostic: 1:6: expected an Int, String or Bool expression
- **control.tagged-return — T11 rejects source.** Tagged return to an enclosing loop
  First diagnostic: 1:6: expected an Int, String or Bool expression
- **control.finally — T11 rejects source.** Construct-level finally cleanup
  First diagnostic: 1:33: unsupported feature "finally": see docs/finally.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **control.match — T11 rejects source.** Subjectless Boolean match
  First diagnostic: 1:18: unsupported feature "match": see docs/match.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.named-arguments — T11 rejects source.** Named/positional call routing and shorthand
  First diagnostic: 1:86: unknown value c
- **function.argument-replacement — T11 rejects source.** Replacement of an earlier positional call contribution
  First diagnostic: 1:81: unknown value a
- **function.values — T11 rejects source.** Function values, copies and compatible replacement
  First diagnostic: 1:11: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.live-helper — T11 rejects source.** Function helpers retain live lexical bindings
  First diagnostic: 1:15: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.nested-helper — T11 rejects source.** Nested function declarations without a scalar capture
  First diagnostic: 1:28: function definitions are only allowed at top level
- **function.report-order — matches tested behavior.** Reports in a function argument precede the outer report
- **text.bounds-diagnostic — matches tested behavior.** Text bounds faults preserve the diagnostic contract
- **output.before-fault — matches tested behavior.** Earlier output survives a later runtime bounds fault
- **alias.array — T11 rejects source.** Transparent aliases to fixed-array types
  First diagnostic: 1:14: unsupported type alias target; only Int, Float, String, Bool, Unit, List<T>, flat named tuples and aliases are supported
- **alias.shadowing — matches tested behavior.** One lexical namespace: a later value hides an alias
- **tuple.named-positional-read — T11 rejects source.** Positional reads from named tuple values
  First diagnostic: 1:42: expected )
- **scope.standalone-block — T11 rejects source.** Standalone lexical blocks
  First diagnostic: 1:1: expected a statement: output/outputLine, declaration, assignment, if or loop
- **function.immutable-copy — T11 rejects source.** Copying an immutable function into another binding
  First diagnostic: 1:41: function f must be called
- **function.builtin-shadow — matches tested behavior.** Lexical shadowing of a temporary builtin by a function
- **numeric.unary-plus — matches tested behavior.** Unary plus on integer values
- **function.escaped-environments — T11 rejects source.** Escaped helper functions retain distinct lexical environments
  First diagnostic: 1:14: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **text.adjacent-literals — matches tested behavior.** Adjacent quoted strings concatenate
- **call.trailing-comma — matches tested behavior.** Trailing comma in a call argument list
- **scope.same-block-shadow — T11 rejects source.** Later declarations shadow same-block bindings
  First diagnostic: 1:9: duplicate local x
- **syntax.final-semicolon — matches tested behavior.** Final declaration can end at EOF without a semicolon
- **syntax.empty-script — matches tested behavior.** Empty scripts complete silently
- **syntax.whitespace-script — matches tested behavior.** Whitespace-only scripts complete silently
- **condition.dead-arithmetic — matches tested behavior.** Arithmetic in an unselected branch does not fault
- **logic.short-circuit-fault — matches tested behavior.** Short-circuiting skips a failing arithmetic operand
- **comparison.parenthesized-not-equal — matches tested behavior.** Parenthesized inequality with a named left operand
- **input.invalid-utf8 — matches tested behavior.** Invalid UTF-8 stdin is rejected rather than replaced
- **comparison.bare-function-tail — matches tested behavior.** A bare inequality function tail remains a comparison rather than assignment

## example

- **example.001-double-sum — matches tested behavior.** Prompted integer addition doubled and reported. Source: `examples/001-double-sum.lts`.
- **example.002-decisions — matches tested behavior.** Sign, range, and short-circuit decisions for a supplied integer. Source: `examples/002-decisions.lts`.
- **example.003-sum-positive — matches tested behavior.** Reads integers until zero, skipping negatives, and reports the positive sum. Source: `examples/003-sum-positive.lts`.
- **example.004-factorial — matches tested behavior.** Prompts for an integer and reports its recursive factorial. Source: `examples/004-factorial.lts`.
- **example.005-scan-arithmetic — matches tested behavior.** Scans an arithmetic line into number and symbol tokens. Source: `examples/005-scan-arithmetic.lts`.
- **example.006-fixed-tuples — T11 rejects source.** Tuple construction, fields, destructuring, and singleton grouping. Source: `examples/006-fixed-tuples.lts`.
  First diagnostic: 1:47: expected a tuple field name
- **example.007-prompts-and-report — matches tested behavior.** Two prompted integers with a multi-value report. Source: `examples/007-prompts-and-report.lts`.
- **example.008-named-tuples — T11 rejects source.** Named tuple fields, shorthand construction, and named function contracts. Source: `examples/008-named-tuples.lts`.
  First diagnostic: 2:6: expected an Int, String or Bool expression
- **example.009-fixed-arrays — T11 rejects source.** Traverses token tuples, reads one index, and sums a fixed array. Source: `examples/009-fixed-arrays.lts`.
  First diagnostic: 12:19: unsupported function type
- **example.010-mixed-tuples — T11 rejects source.** Interleaves named and unnamed tuple fields and destructures stored order. Source: `examples/010-mixed-tuples.lts`.
  First diagnostic: 2:12: expected )
- **example.011-tuple-label-conversion — T11 rejects source.** Relabels stored tuple positions through explicit receiving types. Source: `examples/011-tuple-label-conversion.lts`.
  First diagnostic: 2:1: cannot initialize (x: Int, y: Int) with (width: Int, height: Int)
- **example.012-named-arguments — T11 rejects source.** Interleaves named and positional arguments and uses named self calls. Source: `examples/012-named-arguments.lts`.
  First diagnostic: 5:19: unknown value c
- **example.013-growable-lists — T11 rejects source.** Exercises all four explicit mut list end operations. Source: `examples/013-growable-lists.lts`.
  First diagnostic: 3:11: expected := or = after local name push_front
- **example.014-input-history — matches tested behavior.** Collects integers until zero, then reports the retained history and sum. Source: `examples/014-input-history.lts`.
- **example.015-retained-tokens — matches tested behavior.** Tokenizes a line into a retained list before reporting it. Source: `examples/015-retained-tokens.lts`.
- **example.016-integer-calculator — T11 rejects source.** Tokenized integer calculator with precedence and nesting. Source: `examples/016-integer-calculator.lts`.
  First diagnostic: 70:97: expected a tuple field name
- **example.019-whole-input — matches tested behavior.** Reads remaining text through EOF and reports its code-point length. Source: `examples/019-whole-input.lts`.
- **example.020-script-arguments — matches tested behavior.** Reports ordered script arguments after --. Source: `examples/020-script-arguments.lts`.
- **example.021-type-aliases — matches tested behavior.** Transparent tuple/list aliases with list traversal. Source: `examples/021-type-aliases.lts`.

## sample

- **sample.001-add-two-numbers — matches tested behavior.** Adds two supplied baskets; the verification appends outputLine(apples). Source: `samples/001_add_two_numbers.lts`.
- **sample.002-arithmetic-operations — matches tested behavior.** Four integer operations; the verification appends reports for each result. Source: `samples/002_arithmetic_operations.lts`.
- **sample.003-rectangle-measurements — matches tested behavior.** Rectangle area and perimeter. Source: `samples/003_rectangle_measurements.lts`.
- **sample.004-triangle-area — T11 rejects source.** Triangle area from base and height. Source: `samples/004_triangle_area.lts`.
  First diagnostic: 4:10: expected ; after local declaration base
- **sample.005-circle-measurements — T11 rejects source.** Approximate circumference and area of a circle. Source: `samples/005_circle_measurements.lts`.
  First diagnostic: 4:12: expected ; after local declaration radius
- **sample.006-temperature-conversion — T11 rejects source.** Celsius to Fahrenheit and back. Source: `samples/006_temperature_conversion.lts`.
  First diagnostic: 4:14: expected ; after local declaration celsius
- **sample.007-distance-conversion — T11 rejects source.** Meters converted to kilometers and centimeters. Source: `samples/007_distance_conversion.lts`.
  First diagnostic: 3:14: expected ; after local declaration meters
- **sample.008-duration-parts — matches tested behavior.** Split seconds into hours, minutes and seconds. Source: `samples/008_duration_parts.lts`.
- **sample.009-average-three-values — T11 rejects source.** Average of three daily values. Source: `samples/009_average_three_values.lts`.
  First diagnostic: 3:15: expected ; after local declaration first_day
- **sample.010-percentage-of-total — T11 rejects source.** Completed percentage and a percentage of the total. Source: `samples/010_percentage_of_total.lts`.
  First diagnostic: 4:14: expected ; after local declaration finished
- **sample.011-discounted-price — matches tested behavior.** Percentage discount rounded to cents. Source: `samples/011_discounted_price.lts`.
- **sample.012-tax-and-tip — matches tested behavior.** Tax and tip rounded to cents. Source: `samples/012_tax_and_tip.lts`.
- **sample.013-simple-interest — matches tested behavior.** Simple interest over three years. Source: `samples/013_simple_interest.lts`.
- **sample.014-speed-distance-time — T11 rejects source.** Speed, distance and time relations. Source: `samples/014_speed_distance_time.lts`.
  First diagnostic: 5:23: expected ; after local declaration distance_meters
- **sample.015-weighted-average — matches tested behavior.** Weighted average of three scores. Source: `samples/015_weighted_average.lts`.
- **sample.016-midpoint-coordinates — T11 rejects source.** Midpoint of two coordinate pairs. Source: `samples/016_midpoint_coordinates.lts`.
  First diagnostic: 4:14: expected ; after local declaration first_x
- **sample.017-linear-interpolation — T11 rejects source.** Linear interpolation at a fraction. Source: `samples/017_linear_interpolation.lts`.
  First diagnostic: 4:12: expected ; after local declaration start
- **sample.018-split-bill — matches tested behavior.** Whole-cent bill split with remainder. Source: `samples/018_split_bill.lts`.
- **sample.019-currency-conversion — matches tested behavior.** Currency conversion rounded to target cents. Source: `samples/019_currency_conversion.lts`.
- **sample.020-swap-values — matches tested behavior.** Swaps two var bindings through a temporary; verification reports both. Source: `samples/020_swap_values.lts`.

## library-test

- **lib/tests/diag-fail.lts — matches tested behavior.** lib/tests/diag-fail.lts Source: `lib/tests/diag-fail.lts`.
- **lib/tests/diag.lts — matches tested behavior.** lib/tests/diag.lts Source: `lib/tests/diag.lts`.
- **lib/tests/format.lts — matches tested behavior.** lib/tests/format.lts Source: `lib/tests/format.lts`.
- **lib/tests/int.lts — matches tested behavior.** lib/tests/int.lts Source: `lib/tests/int.lts`.
- **lib/tests/list.lts — matches tested behavior.** lib/tests/list.lts Source: `lib/tests/list.lts`.
- **lib/tests/source.lts — matches tested behavior.** lib/tests/source.lts Source: `lib/tests/source.lts`.
- **lib/tests/test-fail.lts — matches tested behavior.** lib/tests/test-fail.lts Source: `lib/tests/test-fail.lts`.
- **lib/tests/text.lts — matches tested behavior.** lib/tests/text.lts Source: `lib/tests/text.lts`.

## Other tracked Lite sources

- `compiler/c-emitter.lts`: compile accepted; execution not tested.
- `compiler/src/c-literals.lts`: not-a-standalone-T00-program.
- `compiler/src/check.lts`: not-a-standalone-T00-program.
- `compiler/src/driver-c.lts`: not-a-standalone-T00-program.
- `compiler/src/driver-ts.lts`: not-a-standalone-T00-program.
- `compiler/src/emit-c.lts`: not-a-standalone-T00-program.
- `compiler/src/emit-ts.lts`: not-a-standalone-T00-program.
- `compiler/src/frontend.lts`: not-a-standalone-T00-program.
- `compiler/src/lexer.lts`: not-a-standalone-T00-program.
- `compiler/src/parser.lts`: not-a-standalone-T00-program.
- `compiler/src/ts-literals.lts`: not-a-standalone-T00-program.
- `compiler/tests/checker/checker-dump.lts`: compile accepted; execution not tested.
- `compiler/tests/checker/symbols.lts`: compile accepted; execution not tested.
- `compiler/tests/lexer/comments.lts`: compile accepted; execution not tested.
- `compiler/tests/lexer/int.lts`: not-a-standalone-T00-program.
- `compiler/tests/lexer/lexer-dump.lts`: compile accepted; execution not tested.
- `compiler/tests/lexer/strings.lts`: compile accepted; execution not tested.
- `compiler/tests/lexer/symbols.lts`: not-a-standalone-T00-program.
- `compiler/tests/lexer/tokens.lts`: not-a-standalone-T00-program.
- `compiler/tests/parser/declarations.lts`: not-a-standalone-T00-program.
- `compiler/tests/parser/parser-decl-dump.lts`: compile accepted; execution not tested.
- `compiler/tests/parser/parser-dump.lts`: compile accepted; execution not tested.
- `compiler/tests/parser/parser-program-dump.lts`: compile accepted; execution not tested.
- `compiler/tests/parser/program.lts`: compile accepted; execution not tested.
- `compiler/tests/parser/types.lts`: compile accepted; execution not tested.
- `compiler/ts-emitter.lts`: compile accepted; execution not tested. Current source bytes exactly match preserved T11/T12 source identity; not recompiled in this audit..
- `igniter/tests/compiler/001-001-adjacent-strings.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-empty-source.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-output-line-empty-arguments.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-crlf-spacing.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-int-42.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-int-max.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-int-min.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-large-magnitude.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-leading-plus-zeroes.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-missing-argument.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-multiline-spacing.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-negative-zero.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-spaced-negative.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-zero.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-report-zeroes.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-whitespace-source.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-beyond-32-bit.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-int-min.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-negative-division.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-parentheses.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-precedence.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-arithmetic-unary-signs.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-floor-int.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-remainder-int.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-002-report-signed-sequence.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-003-arithmetic-large-multiply.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-003-local-arithmetic.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-003-local-dependencies.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-local-unused.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-report-two-strings.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-concatenation.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-empty.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-escapes.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-hello.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-local.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-multiline.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-004-string-unicode.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-local-missing-semicolon.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-output-values.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-report-mixed-values.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-report-three-statements.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-report-trailing-newline.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-report-two-statements.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-string-local-chain.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-005-string-percent-trigraph.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-006-local-hygiene-int.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-006-local-hygiene-string.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-006-local-macro-name.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-006-report-empty-value.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-006-report-literal-sequence.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-bool-literals-logic.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-int-comparisons-if-else.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-mutable-counter-loop.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-nested-if-in-loop.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-not-precedence.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-report-in-loop.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-007-string-equality-if.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-009-runtime-division.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-009-runtime-remainder.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-010-runtime-string-concat.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-division-by-zero.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-min-divide-minus-one.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-overflow-add.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-overflow-multiply-large.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-overflow-multiply.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-011-overflow-subtract.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/002-001-bare-name.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-call-statement.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-decimal-literal.lts`: T11 rejects source.
- `igniter/tests/compiler/002-001-exponent-literal.lts`: T11 rejects source.
- `igniter/tests/compiler/002-001-injected-source.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-report-missing-close.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-report-missing-expression.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-report-without-call.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-001-trailing-statement.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-002-mixed-int-string.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-002-string-minus-int.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-002-string-plus-int-local.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-002-string-times-int.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-002-unary-minus-string.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-003-literal-above-max.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-003-literal-below-min.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-003-literal-too-large.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-004-bad-string-escape.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-004-unterminated-string.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-005-duplicate-local.lts`: T11 rejects source.
- `igniter/tests/compiler/002-005-unknown-local.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-005-unknown-value.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-006-unsupported-loop.lts`: T11 rejects source.
- `igniter/tests/compiler/002-007-assign-immutable.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-007-assign-kind-mismatch.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-007-if-condition-int.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-007-loop-condition-int.lts`: not-a-standalone-T00-program.
- `lib/core/diag.lts`: compile accepted; execution not tested.
- `lib/core/format.lts`: not-a-standalone-T00-program.
- `lib/core/int.lts`: compile accepted; execution not tested.
- `lib/core/list.lts`: compile accepted; execution not tested.
- `lib/core/source.lts`: compile accepted; execution not tested.
- `lib/core/test.lts`: not-a-standalone-T00-program.
- `lib/core/text.lts`: not-a-standalone-T00-program.
- `lib/tests/diag-fail.lts`: matches tested behavior.
- `lib/tests/diag.lts`: matches tested behavior.
- `lib/tests/format.lts`: matches tested behavior.
- `lib/tests/int.lts`: matches tested behavior.
- `lib/tests/list.lts`: matches tested behavior.
- `lib/tests/source.lts`: matches tested behavior.
- `lib/tests/test-fail.lts`: matches tested behavior.
- `lib/tests/text.lts`: matches tested behavior.

## Reproduce

```sh
node compiler/scripts/t00-t11-inventory.ts --large-sources
```

Full observations and source probes: [raw JSON](current-t00-t11-inventory.json).
