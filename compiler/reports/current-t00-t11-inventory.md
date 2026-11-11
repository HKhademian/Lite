# T00 versus selected generated compiler support inventory

Runtime environment details omitted for privacy.
Working tree at audit start: modified. The raw report records its status; artifact and per-source hashes identify the measured inputs.

Selected compiler identity: `02e8e226d5d192660eaf2fe009f9ec54fa8d3a4fe3c3cda487ac594ca76adc59`. The preserved artifact passed its separate strict TypeScript check.

This is the current measured support inventory, not acceptance of new language features. Dated historical inventories remain unchanged.

## Scope and interpretation

- All canonical feature, example, sample and showcase manifests were selected, regardless of their existing target lists. Each scenario ran under T00, with its expected manifest bytes checked, and under the selected generated TS program when compilation and strict checking succeeded.
- Additional boundary probes isolate existing T00 contracts that a broad canonical program can hide. Their exact source, input, output and interpreter-test reference are in the raw JSON and probe file.
- Every tracked Lite source is accounted for. Source fragments/data fixtures rejected as standalone programs by T00 are excluded. Remaining sources receive a compile-only check, except bundles explicitly linked to recorded self-compilation evidence. Large-source artifacts can reuse exact source/builder/artifact identities and receive a fresh strict typecheck; other source checks do not include execution.
- A rejection is a gap for that program, not proof that every subfeature in it is absent. Matching one probe is not universal feature parity. Runtime diagnostics are distinguished from output/status mismatches. The 520 exercise catalog contains only 20 implemented lesson files; planned exercises are not counted as supported programs.
- Canonical case counts describe tested programs, not complete feature support. Isolated probes can reveal gaps within a passing broad case. Both runtime paths use anonymous source diagnostics; raw-byte input probes use the reference CLI's lazy strict decoding behavior.
- Five-second execution and twenty-second ordinary compiler limits are bounded audit checks, not performance measurements. With --large-sources, compiler bundles over 50 KB receive up to ten minutes each. Timeout rows are unverified, not unsupported.

## Counts

- feature: 41; 28 matches tested behavior; 13 selected compiler rejects source.
- example: 19; 11 matches tested behavior; 8 selected compiler rejects source.
- sample: 20; 20 matches tested behavior.
- probe: 85; 45 matches tested behavior; 40 selected compiler rejects source.
- library-test: 8; 8 matches tested behavior.
- trackedSourceFiles: 217.
- Showcases: none currently implemented.

## Progress since the original inventory

- 51 formerly failing cases now match; 0 formerly matching cases regress. Case identity includes kind and id.
- 112/173 executed source cases match; 61 still fail. These are case counts, not distinct missing features or an overall completion percentage.
- Native C, compile-only sources and run/check migration have separate gates in [the live gap tracker](../gaps.md).

Closed original cases:

- feature: scope.locals
- feature: io.input
- feature: num.power
- example: example.001-double-sum
- example: example.002-decisions
- example: example.003-sum-positive
- example: example.004-factorial
- example: example.005-scan-arithmetic
- example: example.007-prompts-and-report
- example: example.014-input-history
- example: example.015-retained-tokens
- example: example.019-whole-input
- sample: sample.004-triangle-area
- sample: sample.005-circle-measurements
- sample: sample.006-temperature-conversion
- sample: sample.007-distance-conversion
- sample: sample.009-average-three-values
- sample: sample.010-percentage-of-total
- sample: sample.014-speed-distance-time
- sample: sample.016-midpoint-coordinates
- sample: sample.017-linear-interpolation
- probe: numeric.float
- probe: numeric.int64-alias
- probe: numeric.float-aliases
- probe: numeric.exponent-literal
- probe: numeric.power
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
- probe: scope.discarded-expression
- probe: tuple.report
- probe: function.report-order
- probe: text.bounds-diagnostic
- probe: output.before-fault
- probe: scope.standalone-block
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

- **int.arithmetic — matches tested behavior.** Signed Int arithmetic and precedence. Source: `language/verifications/features/int-arithmetic.lts`.
- **num.float — matches tested behavior.** Finite Float arithmetic and mixed Int/Float comparisons with checked runtime faults. Source: `language/verifications/features/num-float.lts`.
- **num.aliases — matches tested behavior.** Int64, Float64 and Double as synonyms of the existing 64-bit numeric types. Source: `language/verifications/features/num-aliases.lts`.
- **num.float-context — matches tested behavior.** Exactly representable integer literals in admitted Float storage, call and result contexts. Source: `language/verifications/features/num-float-context.lts`.
- **num.widths — selected compiler rejects source.** Sized integer and floating widths with promotion and lossless widening. Source: `language/verifications/features/num-widths.lts`.
  First diagnostic: 1:4: unsupported local type Int8
- **bool.conditions — matches tested behavior.** Bool comparisons and conditional selection. Source: `language/verifications/features/bool-conditions.lts`.
- **comparison.chains — matches tested behavior.** Adjacent comparison chains with single-evaluation middle values and lazy later operands. Source: `language/verifications/features/comparison-chains.lts`.
- **cond.partial — selected compiler rejects source.** Partial conditional declaration defaults and no-write assignments. Source: `language/verifications/features/cond-partial.lts`.
  First diagnostic: 2:19: value if requires a final else
- **loop.conditional — matches tested behavior.** Conditional action loops with mutable state. Source: `language/verifications/features/loop-conditional.lts`.
- **loop.sequence — matches tested behavior.** Ordered sequence traversal loops. Source: `language/verifications/features/loop-sequence.lts`.
- **loop.value — selected compiler rejects source.** Typed loop .value accumulation and then completion. Source: `language/verifications/features/loop-value.lts`.
  First diagnostic: 1:8: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.metadata — selected compiler rejects source.** Loop metadata and payload/targeted exits. Source: `language/verifications/features/loop-metadata.lts`.
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **finally.cleanup — selected compiler rejects source.** Construct-level finally cleanup ordering. Source: `language/verifications/features/finally-cleanup.lts`.
  First diagnostic: 1:31: expected an Int, Float, String or Bool expression
- **function.recursion — matches tested behavior.** Typed functions and own-name recursion. Source: `language/verifications/features/function-recursion.lts`.
- **tuple.shape — selected compiler rejects source.** Flat tuple values and fields. Source: `language/verifications/features/tuple-shape.lts`.
  First diagnostic: 3:2: unknown value one
- **array.fixed — matches tested behavior.** Fixed arrays and indexed reads. Source: `language/verifications/features/array-fixed.lts`.
- **list.mutation — selected compiler rejects source.** Growable lists and end operations. Source: `language/verifications/features/list-mutation.lts`.
  First diagnostic: 3:1: unknown value push_front
- **text.helpers — matches tested behavior.** Temporary code-point text helpers. Source: `language/verifications/features/text-helpers.lts`.
- **alias.transparent — matches tested behavior.** Transparent type aliases. Source: `language/verifications/features/alias-transparent.lts`.
- **scope.locals — matches tested behavior.** Lexical local scope and shadowing. Source: `language/verifications/features/scope-locals.lts`.
- **scope.assignment — matches tested behavior.** Mutable var replacement. Source: `language/verifications/features/scope-assignment.lts`.
- **io.input — matches tested behavior.** Prompted integer input. Source: `language/verifications/features/io-input.lts`.
- **io.arguments — matches tested behavior.** Ordered script arguments. Source: `language/verifications/features/io-arguments.lts`.
- **io.whole-input — matches tested behavior.** Whole remaining input through EOF. Source: `language/verifications/features/io-whole-input.lts`.
- **io.exit — matches tested behavior.** Explicit process exit. Source: `language/verifications/features/io-exit.lts`.
- **io.report — matches tested behavior.** Multiple report values.
- **int.remainder — matches tested behavior.** Truncating Int remainder. Source: `language/verifications/features/int-remainder.lts`.
- **text.concat — matches tested behavior.** String concatenation. Source: `language/verifications/features/text-concat.lts`.
- **local.immutable — matches tested behavior.** Immutable local bindings. Source: `language/verifications/features/local-immutable.lts`.
- **string.escape — matches tested behavior.** String escape sequences. Source: `language/verifications/features/string-escape.lts`.
- **report.multi — matches tested behavior.** Multi-value reports. Source: `language/verifications/features/report-multi.lts`.
- **report.tuple — selected compiler rejects source.** Source-like report display of flat tuple values. Source: `language/verifications/features/report-tuple.lts`.
  First diagnostic: 1:29: expected )
- **int.limits — matches tested behavior.** Signed 64-bit Int boundaries. Source: `language/verifications/features/int-limits.lts`.
- **int.floor — matches tested behavior.** Floor division and floor modulo. Source: `language/verifications/features/int-floor.lts`.
- **scope.compound — selected compiler rejects source.** Compound arithmetic updates. Source: `language/verifications/features/scope-compound.lts`.
  First diagnostic: 2:8: expected an Int, Float, String or Bool expression
- **mut.inferred — selected compiler rejects source.** Inferred mut and var mut declarations. Source: `language/verifications/features/mut-inferred.lts`.
  First diagnostic: 1:1: unsupported feature "mut": see docs/declarations-and-assignment.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **num.power — matches tested behavior.** Right-associative Float-default power. Source: `language/verifications/features/num-power.lts`.
- **match.subjectless — selected compiler rejects source.** Subjectless Boolean match selection. Source: `language/verifications/features/match-subjectless.lts`.
  First diagnostic: 2:10: unsupported feature "match": see docs/match.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **init.zero — selected compiler rejects source.** Zero initialization for omitted typed locals. Source: `language/verifications/features/init-zero.lts`.
  First diagnostic: 3:5: expected a tuple field name
- **init.reserved — selected compiler rejects source.** Reserved storage and first whole-value initialization. Source: `language/verifications/features/init-reserved.lts`.
  First diagnostic: 1:10: expected an Int, Float, String or Bool expression
- **io.temporary — matches tested behavior.** Temporary input prompts and variadic output/outputLine helpers. Source: `language/verifications/features/io-temporary.lts`.

## probe

- **numeric.float — matches tested behavior.** Float literals and mixed Int/Float arithmetic
- **numeric.sized-int — selected compiler rejects source.** Sized Int8/Int16/Int32 storage and widening
  First diagnostic: 1:4: unsupported local type Int8
- **numeric.int64-alias — matches tested behavior.** Explicit Int64 annotations
- **numeric.float32 — selected compiler rejects source.** Float32 rounding and promotion
  First diagnostic: 1:4: unsupported local type Float32
- **numeric.float-aliases — matches tested behavior.** Float64 and Double annotations
- **numeric.float-integer-literal — matches tested behavior.** An exactly representable integer literal in a Float storage context
- **numeric.exponent-literal — matches tested behavior.** Decimal exponent literal syntax
- **numeric.power — matches tested behavior.** Right-associative Float-default power
- **numeric.dynamic-add-overflow — matches tested behavior.** Runtime Int64 addition overflow faults
- **numeric.dynamic-subtract-overflow — matches tested behavior.** Runtime Int64 subtraction overflow faults
- **numeric.dynamic-multiply-overflow — matches tested behavior.** Runtime Int64 multiplication overflow faults
- **numeric.dynamic-negate-overflow — matches tested behavior.** Runtime Int64 negation overflow faults
- **numeric.dynamic-divide-fault — matches tested behavior.** Runtime division fault and diagnostic contract
- **input.integer — matches tested behavior.** Prompted inputInt and token consumption
- **input.float — matches tested behavior.** inputFloat parsing
- **input.line — matches tested behavior.** inputLine and shared input cursor
- **input.word — selected compiler rejects source.** inputWord tokenization
  First diagnostic: 1:12: unknown value inputWord
- **input.whole-prompt — matches tested behavior.** Optional inputAll prompt
- **input.whole-unprompted — matches tested behavior.** Unprompted inputAll including a trailing newline
- **input.arguments — matches tested behavior.** Script argument order, empty strings and copies
- **condition.partial-default — selected compiler rejects source.** Partial conditional declaration defaults
  First diagnostic: 1:20: value if requires a final else
- **condition.partial-assignment — selected compiler rejects source.** False partial conditional assignment performs no write
  First diagnostic: 1:40: value if requires a final else
- **condition.block-value — selected compiler rejects source.** General block-valued expressions and local tails
  First diagnostic: 1:6: expected an Int, Float, String or Bool expression
- **condition.statement-value-if — selected compiler rejects source.** Statement-bearing value-if branches outside function tails
  First diagnostic: 1:16: unknown value y
- **condition.unit-block — selected compiler rejects source.** Empty blocks and declaration tails produce Unit
  First diagnostic: 1:12: expected an Int, Float, String or Bool expression
- **comparison.chain — matches tested behavior.** Comparison chains
- **comparison.complements — matches tested behavior.** Complement comparison spellings <! <!= >! >!=
- **scope.compound — selected compiler rejects source.** Compound arithmetic updates
  First diagnostic: 1:17: expected an Int, Float, String or Bool expression
- **scope.discarded-expression — matches tested behavior.** Expression statements with silent Unit script completion
- **scope.zero-scalar — matches tested behavior.** Omitted typed scalar initializers
- **scope.reserved — selected compiler rejects source.** Reserved storage and first whole-value initialization
  First diagnostic: 1:10: expected an Int, Float, String or Bool expression
- **tuple.unnamed — selected compiler rejects source.** Unnamed tuple construction and positional reads
  First diagnostic: 1:11: expected )
- **tuple.mixed — selected compiler rejects source.** Mixed named/unnamed tuple fields
  First diagnostic: 1:12: expected )
- **tuple.shorthand — selected compiler rejects source.** Named tuple field shorthand
  First diagnostic: 1:29: expected an Int, Float, String or Bool expression
- **tuple.destructuring — selected compiler rejects source.** Tuple destructuring declarations
  First diagnostic: 1:26: unknown value x
- **tuple.receiving-labels — selected compiler rejects source.** Typed receiving declarations rename tuple positions
  First diagnostic: 1:29: cannot initialize (l: Int, r: Int) with (r: Int, l: Int)
- **tuple.report — matches tested behavior.** Source-like tuple report formatting
- **tuple.unit-singleton — selected compiler rejects source.** Unit, empty tuples and singleton tuples
  First diagnostic: 1:24: expected )
- **array.fixed — selected compiler rejects source.** Fixed-extent arrays and bracket reads
  First diagnostic: 1:9: unsupported local type
- **array.inferred — selected compiler rejects source.** Unannotated brackets infer a fixed array
  First diagnostic: 1:36: expected )
- **array.function — selected compiler rejects source.** Fixed-array function parameters/results
  First diagnostic: 1:15: unsupported function type
- **list.front-operations — selected compiler rejects source.** push_front/pop_front end operations
  First diagnostic: 1:33: unknown value push_front
- **list.inferred-mut — selected compiler rejects source.** Inferred mut and var mut list declarations
  First diagnostic: 1:1: unsupported feature "mut": see docs/declarations-and-assignment.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **list.unit-elements — selected compiler rejects source.** List<Unit> element contracts
  First diagnostic: 1:14: unsupported list element type Unit
- **list.tuple-copies — matches tested behavior.** Named-tuple list elements and copied end results
- **loop.unnamed-traversal — selected compiler rejects source.** Sequence traversal without an item binding
  First diagnostic: 1:6: loop condition must be Bool
- **loop.value — selected compiler rejects source.** Loop values and then completion
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.metadata — selected compiler rejects source.** Loop .item/.index/.count metadata
  First diagnostic: 1:33: expected an Int, Float, String or Bool expression
- **loop.payload — selected compiler rejects source.** Value-bearing break and continue
  First diagnostic: 1:6: unsupported feature "loop": see docs/loops.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **loop.tagged — selected compiler rejects source.** Tagged outer-loop exits
  First diagnostic: 1:6: expected an Int, Float, String or Bool expression
- **control.tagged-return — selected compiler rejects source.** Tagged return to an enclosing loop
  First diagnostic: 1:6: expected an Int, Float, String or Bool expression
- **control.finally — selected compiler rejects source.** Construct-level finally cleanup
  First diagnostic: 1:33: unsupported feature "finally": see docs/finally.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **control.match — selected compiler rejects source.** Subjectless Boolean match
  First diagnostic: 1:18: unsupported feature "match": see docs/match.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.named-arguments — selected compiler rejects source.** Named/positional call routing and shorthand
  First diagnostic: 1:86: unknown value c
- **function.argument-replacement — selected compiler rejects source.** Replacement of an earlier positional call contribution
  First diagnostic: 1:81: unknown value a
- **function.values — selected compiler rejects source.** Function values, copies and compatible replacement
  First diagnostic: 1:11: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.live-helper — selected compiler rejects source.** Function helpers retain live lexical bindings
  First diagnostic: 1:15: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **function.nested-helper — selected compiler rejects source.** Nested function declarations without a scalar capture
  First diagnostic: 1:28: function definitions are only allowed at top level
- **function.report-order — matches tested behavior.** Reports in a function argument precede the outer report
- **text.bounds-diagnostic — matches tested behavior.** Text bounds faults preserve the diagnostic contract
- **output.before-fault — matches tested behavior.** Earlier output survives a later runtime bounds fault
- **alias.array — selected compiler rejects source.** Transparent aliases to fixed-array types
  First diagnostic: 1:14: unsupported type alias target; only Int, Float, String, Bool, Unit, List<T>, flat named tuples and aliases are supported
- **alias.shadowing — matches tested behavior.** One lexical namespace: a later value hides an alias
- **tuple.named-positional-read — selected compiler rejects source.** Positional reads from named tuple values
  First diagnostic: 1:42: expected )
- **scope.standalone-block — matches tested behavior.** Standalone lexical blocks
- **function.immutable-copy — selected compiler rejects source.** Copying an immutable function into another binding
  First diagnostic: 1:41: function f must be called
- **function.builtin-shadow — matches tested behavior.** Lexical shadowing of a temporary builtin by a function
- **numeric.unary-plus — matches tested behavior.** Unary plus on integer values
- **function.escaped-environments — selected compiler rejects source.** Escaped helper functions retain distinct lexical environments
  First diagnostic: 1:14: unsupported feature "fn": see docs/functions.md; the restricted compiler accepts Int/Float/String/Bool expressions, locals, output/outputLine, if/else and loop only
- **text.adjacent-literals — matches tested behavior.** Adjacent quoted strings concatenate
- **call.trailing-comma — matches tested behavior.** Trailing comma in a call argument list
- **scope.nested-shadow — matches tested behavior.** Nested declarations shadow root bindings
- **scope.duplicate-root-rejected — selected compiler rejects source.** The initial self-hosting compiler rejects repeated root value definitions
  First diagnostic: 1:9: duplicate top-level value x
- **syntax.final-semicolon — matches tested behavior.** Final declaration can end at EOF without a semicolon
- **syntax.empty-script — matches tested behavior.** Empty scripts complete silently
- **syntax.whitespace-script — matches tested behavior.** Whitespace-only scripts complete silently
- **condition.dead-arithmetic — matches tested behavior.** Arithmetic in an unselected branch does not fault
- **logic.short-circuit-fault — matches tested behavior.** Short-circuiting skips a failing arithmetic operand
- **comparison.parenthesized-not-equal — matches tested behavior.** Parenthesized inequality with a named left operand
- **input.invalid-utf8 — matches tested behavior.** Invalid UTF-8 stdin is rejected rather than replaced
- **comparison.bare-function-tail — matches tested behavior.** A bare inequality function tail remains a comparison rather than assignment
- **flow.unreachable-tail — matches tested behavior.** A definite return excludes an unreachable ordinary tail from the function result
- **flow.return-through-true-loop — matches tested behavior.** An unconditional return-through-loop produces a strictly runnable generated function
- **flow.value-if-first-token — matches tested behavior.** A value branch starts immediately after its opening brace
- **flow.braced-expression-boundary — matches tested behavior.** A directly closed braced value ends its item before a following unary expression

## example

- **example.001-double-sum — matches tested behavior.** Prompted integer addition doubled and reported. Source: `language/examples/001-double-sum.lts`.
- **example.002-decisions — matches tested behavior.** Sign, range, and short-circuit decisions for a supplied integer. Source: `language/examples/002-decisions.lts`.
- **example.003-sum-positive — matches tested behavior.** Reads integers until zero, skipping negatives, and reports the positive sum. Source: `language/examples/003-sum-positive.lts`.
- **example.004-factorial — matches tested behavior.** Prompts for an integer and reports its recursive factorial. Source: `language/examples/004-factorial.lts`.
- **example.005-scan-arithmetic — matches tested behavior.** Scans an arithmetic line into number and symbol tokens. Source: `language/examples/005-scan-arithmetic.lts`.
- **example.006-fixed-tuples — selected compiler rejects source.** Tuple construction, fields, destructuring, and singleton grouping. Source: `language/examples/006-fixed-tuples.lts`.
  First diagnostic: 1:47: expected a tuple field name
- **example.007-prompts-and-report — matches tested behavior.** Two prompted integers with a multi-value report. Source: `language/examples/007-prompts-and-report.lts`.
- **example.008-named-tuples — selected compiler rejects source.** Named tuple fields, shorthand construction, and named function contracts. Source: `language/examples/008-named-tuples.lts`.
  First diagnostic: 2:6: expected an Int, Float, String or Bool expression
- **example.009-fixed-arrays — selected compiler rejects source.** Traverses token tuples, reads one index, and sums a fixed array. Source: `language/examples/009-fixed-arrays.lts`.
  First diagnostic: 12:19: unsupported function type
- **example.010-mixed-tuples — selected compiler rejects source.** Interleaves named and unnamed tuple fields and destructures stored order. Source: `language/examples/010-mixed-tuples.lts`.
  First diagnostic: 2:12: expected )
- **example.011-tuple-label-conversion — selected compiler rejects source.** Relabels stored tuple positions through explicit receiving types. Source: `language/examples/011-tuple-label-conversion.lts`.
  First diagnostic: 2:1: cannot initialize (x: Int, y: Int) with (width: Int, height: Int)
- **example.012-named-arguments — selected compiler rejects source.** Interleaves named and positional arguments and uses named self calls. Source: `language/examples/012-named-arguments.lts`.
  First diagnostic: 5:19: unknown value c
- **example.013-growable-lists — selected compiler rejects source.** Exercises all four explicit mut list end operations. Source: `language/examples/013-growable-lists.lts`.
  First diagnostic: 3:1: unknown value push_front
- **example.014-input-history — matches tested behavior.** Collects integers until zero, then reports the retained history and sum. Source: `language/examples/014-input-history.lts`.
- **example.015-retained-tokens — matches tested behavior.** Tokenizes a line into a retained list before reporting it. Source: `language/examples/015-retained-tokens.lts`.
- **example.016-integer-calculator — selected compiler rejects source.** Tokenized integer calculator with precedence and nesting. Source: `language/examples/016-integer-calculator.lts`.
  First diagnostic: 49:5: cannot return Unit from function digitValue returning Int
- **example.019-whole-input — matches tested behavior.** Reads remaining text through EOF and reports its code-point length. Source: `language/examples/019-whole-input.lts`.
- **example.020-script-arguments — matches tested behavior.** Reports ordered script arguments after --. Source: `language/examples/020-script-arguments.lts`.
- **example.021-type-aliases — matches tested behavior.** Transparent tuple/list aliases with list traversal. Source: `language/examples/021-type-aliases.lts`.

## sample

- **sample.001-add-two-numbers — matches tested behavior.** Adds two supplied baskets; the verification appends outputLine(apples). Source: `language/samples/001_add_two_numbers.lts`.
- **sample.002-arithmetic-operations — matches tested behavior.** Four integer operations; the verification appends reports for each result. Source: `language/samples/002_arithmetic_operations.lts`.
- **sample.003-rectangle-measurements — matches tested behavior.** Rectangle area and perimeter. Source: `language/samples/003_rectangle_measurements.lts`.
- **sample.004-triangle-area — matches tested behavior.** Triangle area from base and height. Source: `language/samples/004_triangle_area.lts`.
- **sample.005-circle-measurements — matches tested behavior.** Approximate circumference and area of a circle. Source: `language/samples/005_circle_measurements.lts`.
- **sample.006-temperature-conversion — matches tested behavior.** Celsius to Fahrenheit and back. Source: `language/samples/006_temperature_conversion.lts`.
- **sample.007-distance-conversion — matches tested behavior.** Meters converted to kilometers and centimeters. Source: `language/samples/007_distance_conversion.lts`.
- **sample.008-duration-parts — matches tested behavior.** Split seconds into hours, minutes and seconds. Source: `language/samples/008_duration_parts.lts`.
- **sample.009-average-three-values — matches tested behavior.** Average of three daily values. Source: `language/samples/009_average_three_values.lts`.
- **sample.010-percentage-of-total — matches tested behavior.** Completed percentage and a percentage of the total. Source: `language/samples/010_percentage_of_total.lts`.
- **sample.011-discounted-price — matches tested behavior.** Percentage discount rounded to cents. Source: `language/samples/011_discounted_price.lts`.
- **sample.012-tax-and-tip — matches tested behavior.** Tax and tip rounded to cents. Source: `language/samples/012_tax_and_tip.lts`.
- **sample.013-simple-interest — matches tested behavior.** Simple interest over three years. Source: `language/samples/013_simple_interest.lts`.
- **sample.014-speed-distance-time — matches tested behavior.** Speed, distance and time relations. Source: `language/samples/014_speed_distance_time.lts`.
- **sample.015-weighted-average — matches tested behavior.** Weighted average of three scores. Source: `language/samples/015_weighted_average.lts`.
- **sample.016-midpoint-coordinates — matches tested behavior.** Midpoint of two coordinate pairs. Source: `language/samples/016_midpoint_coordinates.lts`.
- **sample.017-linear-interpolation — matches tested behavior.** Linear interpolation at a fraction. Source: `language/samples/017_linear_interpolation.lts`.
- **sample.018-split-bill — matches tested behavior.** Whole-cent bill split with remainder. Source: `language/samples/018_split_bill.lts`.
- **sample.019-currency-conversion — matches tested behavior.** Currency conversion rounded to target cents. Source: `language/samples/019_currency_conversion.lts`.
- **sample.020-swap-values — matches tested behavior.** Swaps two var bindings through a temporary; verification reports both. Source: `language/samples/020_swap_values.lts`.

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

- `language/cases/reject-effects.lts`: not-a-standalone-T00-program.
- `language/cases/silent.lts`: compile accepted; execution not tested.
- `language/cases/tour-bindings.lts`: compile accepted; execution not tested.
- `compiler/c-emitter.lts`: compile accepted; execution not tested.
- `compiler/src/c-literals.lts`: not-a-standalone-T00-program.
- `compiler/src/check.lts`: not-a-standalone-T00-program.
- `compiler/src/driver-c.lts`: not-a-standalone-T00-program.
- `compiler/src/driver-ts.lts`: not-a-standalone-T00-program.
- `compiler/src/emit-c.lts`: not-a-standalone-T00-program.
- `compiler/src/emit-ts.lts`: not-a-standalone-T00-program.
- `compiler/src/frontend.lts`: not-a-standalone-T00-program.
- `compiler/src/lexer.lts`: not-a-standalone-T00-program.
- `compiler/src/numeric-literals.lts`: not-a-standalone-T00-program.
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
- `compiler/ts-emitter.lts`: compile accepted; execution not tested. Current source bytes exactly match preserved selected source identity; not recompiled in this audit..
- `igniter/tests/compiler/001-001-adjacent-strings.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-decimal-literal.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-empty-source.lts`: compile accepted; execution not tested.
- `igniter/tests/compiler/001-001-exponent-literal.lts`: compile accepted; execution not tested.
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
- `igniter/tests/compiler/001-005-duplicate-local.lts`: load-error.
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
- `igniter/tests/compiler/002-005-unknown-local.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-005-unknown-value.lts`: not-a-standalone-T00-program.
- `igniter/tests/compiler/002-006-unsupported-loop.lts`: selected compiler rejects source.
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
