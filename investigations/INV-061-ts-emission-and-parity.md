# INV-061 — First Lite-to-TypeScript emission and byte parity

Status: recorded (bounded emitted-code prototype; self-hosting remains open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-061](TOPICS.md#inv-061)
Direction: [TS bootstrap, web, C native/export and possible AS/Wasm](INV-061-first-compiler-output.md)

## Implemented source and output

The user selects toy-like TS emission for the first bootstrap path and clarifies
the safety criterion as identical program output bytes. Implement
[ts-emitter.lts](../compiler/ts-emitter.lts) as a small
compiler application written in already supported Lite. It admits one source
line of report(signed decimal Int literal), optional surrounding spaces/tabs and
final semicolon. Unsupported expressions, strings, additional statements and
out-of-range integer magnitudes fail with an explicit compiler diagnostic and
status 2 before any TS source is emitted. Missing input retains InputFault.

Normalize leading zeroes, an optional plus sign and negative zero. Validate the
full signed 64-bit range using digit comparisons, without converting the input
to a JavaScript number or overflowing an intermediate magnitude. Only validated
ASCII decimal text and an optional minus sign enter the emitted string literal;
arbitrary source is never evaluated or copied into executable TS.

For report(42); the output is exactly the checked-in readable
[TS module](../compiler/generated/report-42.ts). Its exported main returns
42 plus newline. The separate [Node adapter](../compiler/generated/run-report.ts)
writes that value. This tiny constant-output lowering is sufficient for this
admitted class; it does not select buffering all effects for general programs.

The emitted core has no Node imports, DOM dependencies, eval/Function, any,
unchecked cast or user-code execution at generation time. Strict checking also
uses only ESNext library declarations, without Node/DOM globals. The adapter
is visible and separately typechecked with the pinned Node typings. A small
package marker makes the module format explicit rather than weakening strict
verbatim-module checking.

## Existing parser defect fixed

Building the compiler exposed a pre-existing igniter defect: after a comma,
quoted closing delimiters such as ")" or "]" were mistaken for syntactic
trailing delimiters by spelling-only lookahead. Require a symbol token as well
as its spelling in call/tuple/array and related separator checks. A regression
test covers quoted delimiters as values. This corrects existing string/expression
semantics; it adds no syntax or feature.

## Checks performed

Strict no-emit checking and all 130 interpreter test groups pass under pinned
Node 26.13.0/TypeScript 7.0.2. New cases check exact deterministic output against
the reference, leading signs/zeroes, signed limits, malformed/injected/trailing
source and rejection before artifact bytes are emitted.

For nine admitted source cases, run the real Lite compiler example to produce
TS, run the same source directly through the igniter, and execute the emitted TS
through the fixed adapter. Compare stdout/stderr as Buffers, status and signal,
without normalization. All match, including values above JavaScript's safe
number range and signed Int minimum/maximum. These programs have no runtime
reads; arbitrary stdin bytes remain irrelevant to their output in each run.

Typecheck the emitted cores with all inherited strict settings and no Node/DOM
types, translate them to ES-module JavaScript with tsc, and compare JS execution
bytes/status with direct TS execution. Also strictly check and run the checked-in
reference module/adapter. All 9 editor groups pass on the expanded Lite corpus.

These are finite differential checks under ordinary captured stdio, not a
universal equivalence/Trojan-freedom proof. Closed pipes, resource exhaustion,
general runtime input/effects, multi-line compilation and other language features
are outside the emitted subset. A browser or AssemblyScript/Wasm execution is
not claimed. The permanent compiler bootstrap snapshot does not exist yet.

## Preservation and next step

Preserve source, expected TS, explicit adapter, tests and evidence atomically as
igniter-v0.1.0-alpha.17. The compatible builder/source for this prototype is that
milestone, including the existing-parser fix. No earlier tag is changed. Record
later generated compiler snapshots with source/builder tags, tools, generation
commands and reproducible comparisons once a real compiler stage exists.

Continue with the selected first native C target for the same restricted source
class and compare its output with both the igniter and TS path. This needs no new
Lite syntax or helper. Full library/export ABI and whole-file compiler input are
separate investigations, not silently added to this prototype.
