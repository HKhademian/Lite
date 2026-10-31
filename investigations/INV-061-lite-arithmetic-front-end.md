# INV-061 — Arithmetic front-end exercise written in Lite

Status: recorded (bounded application demonstration; compiler stages/backend open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Baseline: `f5f9cbe`, preserved as igniter-v0.1.0-alpha.15

## Question and authorization boundary

Can the now approved FVP subset express a small token-consuming parser without
adding another host helper or language feature? Yes. The user authorizes
automatic progression within selected scope; this is application code using the
existing scanner, lists, functions, scalar locals, recursion and tuple results.
It does not select a new Lite grammar, compiler pipeline, AST/IR representation,
code-generation target, native runtime or bootstrap-stage format.

## Delivery

[016-integer-calculator.lts](../examples/016-integer-calculator.lts) is a
self-contained integer arithmetic application. It reuses 015's small scanner
as source because module/import infrastructure remains deferred for the FVP.
Retain token kind/text tuples in a list. Count tokens with ordinary traversal;
do not add a count helper. Convert digit runs with ordinary Lite functions and
checked integer arithmetic; do not add parseInt or another conversion builtin.

The parser's private result is an unnamed pair of calculated value and first
unconsumed token position. Precedence levels are ordinary application integers;
self recursion handles parentheses, unary signs and the right operand. Binary
+/- and */ use the familiar precedence and left associativity demonstrated by
the current language subset. The script checks complete input consumption and
reports its result explicitly.

Input 2 + 3 * (4 - 1) reports result: 11. Malformed input reports a useful error
and exits 2. Unsupported text follows the scanner's explicit error/exit path.
Missing line input remains InputFault. Division by zero and checked integer
overflow retain ArithmeticPanic, producing CLI status 1 when unhandled.

## Verification

Separate strict TypeScript checking and all 125 interpreter groups pass on
Node 26.13.0/TypeScript 7.0.2. The new cases cover precedence, left associativity,
nested parentheses, unary signs, leading zeroes, whitespace, integer division,
signed boundary calculations, malformed/trailing input, unsupported Unicode,
EOF, overflow and division by zero. Real-launcher checks cover success,
syntax failure, arithmetic failure and silent check-only mode. All 9 editor
groups pass on the expanded corpus.

Additionally extract the preserved alpha.15 lite.ts/cli.ts directly from its tag
into a temporary directory and run/check the new application with that unchanged
interpreter. The expression above reports 11 there too. The host evaluator needs
no feature changes for this application. Preserve its source milestone as
igniter-v0.1.0-alpha.16; alpha.15 (`f5f9cbe`) is the demonstrated compatible
interpreter revision for the new example source.

This compatibility probe is not a compiler bootstrap chain: the application
calculates an integer, not a next-stage compiler artifact. No compiler builds
itself, no native output is produced, and no performance result is claimed.

## Limits and next boundary

The example evaluates while parsing rather than retaining a general AST. An
arithmetic fault may therefore precede a later syntax error in application
input; this does not alter Lite's before-effects source checking contract.
Decimal accumulation uses checked nonnegative Int values; an input magnitude
above signed Int maximum faults even if a preceding unary minus would yield the
minimum signed value. Inputs such as -9223372036854775807 - 1 can calculate that
minimum. No floating syntax, identifiers, variables, calls or complete Lite
source parsing is implemented by this application.

Next inspect INV-061.06's actual first compiler execution/output contract. A
working arithmetic parser demonstrates useful expressiveness, not readiness to
retire host development by itself. A restricted Lite-written compiler needs a
selected source subset, output/execution route and concrete rebuild criterion.
Do not silently choose C/LLVM/JavaScript/bytecode, add file/argument helpers, or
turn this calculator's direct-evaluation model into permanent compiler design.

The [first-output proposal](INV-061-first-compiler-output.md) now reviews a
restricted C-emission experiment and records a successful foreign-tool probe.
The backend route remains unselected pending consent; no Lite emitter exists.
