# INV-004 — Optional input prompt and multiple report values

Status: recorded (explicitly approved bounded helper implementation)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-004](TOPICS.md#inv-004)
Covered scope: inputInt's optional prompt and report's ordinary multiple arguments.

## Request and explicit choices

Baseline: `d3169ac`; runnable baseline igniter-v0.1.0-alpha.7 at `36b301f`.
Before named tuples, the user requests inputInt(optionalPrompt) and
report(optionalPrompt, a, b, c, ...values). The agent asks about the previously
unspecified output/ellipsis behavior; the user explicitly selects:

- The inputInt prompt writes to stdout without an added newline, then reads.
- report separates arguments with spaces and adds a final newline; a first
  String remains ordinary printed data, without special prompt detection.
- Multiple ordinary arguments only; tuple unpacking in report calls is excluded.

These selections authorize the implementation under the
[consent rule](README.md#explicit-consent-for-language-changes). They revise the
temporary helper surface, not the language's general callable grammar or stdlib.
Named tuples remain awaiting consent; unapproved text helpers remain unapproved.

## Implemented behavior and boundaries

inputInt accepts zero arguments or one String prompt. The prompt expression
evaluates once before writing; its exact contents are output before the read.
An empty prompt emits no visible text. Newlines/spaces inside the String are
data; no space/newline is automatically appended. A supplied prompt is emitted
with redirected stdin too. Invalid input/EOF still faults after that one prompt,
without an implicit retry or fabricated value. An output failure prevents reading.

report accepts one or more ordinary scalar/Unit values. Evaluate all arguments
once left to right, then join their displayed values with a single space between
each pair and append one newline. Empty strings still occupy argument positions;
embedded newlines remain data. No percent/brace placeholder interpretation is
performed. A failed argument prevents the final joined report, while earlier
argument effects retain their ordinary behavior. Both helpers return their
existing Int/Unit results; static checking still precedes program effects.

No new public variadic header syntax, tuple/call spread, aggregate formatting,
or zero-argument report behavior is added. Existing report() rejection is retained.
reportError stays one value on stderr, and inputFloat/inputLine/inputWord stay
zero-argument helpers. Existing helper shadowing, input cursor semantics and
failure/report-only rules remain unchanged. Future cleanup may replace this FVP
scaffolding without permanent compatibility obligations.

## Evidence

Strict TypeScript no-emit checking and all 69 interpreter test groups pass on
Node 26.13.0/TypeScript 7.0.2. New cases cover prompt-before-read order, prompt
argument effects, empty/multiline prompts, invalid input/EOF, writer failure,
space/newline/literal formatting, left-to-right report evaluation, failed report
arguments, static rejection before effects and unchanged helper boundaries.

The real root-command [007 example](../examples/007-prompts-and-report.lts)
reads 7 and 5. With redirected input, stdout is exactly First number: Second
number: sum: 12 followed by inputs: 7 5 equal: false, each report line ending in
a newline. Input text is not echoed by the program; a terminal may echo typed
input independently. Check-only mode emits no prompts and reads nothing.
This is bounded helper/CLI evidence, not full I/O or callable conformance.

## Handoff

Follow-up requested by the user, **2026-10-31**: apply the approved facilities
to earlier examples too. Examples 001–004 now pass explicit String prompts to
inputInt. Example 005 prints its heading with report before the unchanged
zero-argument inputLine, and uses ordinary multi-value report calls for token
labels. Existing expected-output assertions include these prompts, including
sentinel repeats, factorial rejection and the scanner's empty/error cases.
Strict checking, 69 interpreter groups and nine highlighter groups pass. This
is an example/test update, not a new helper signature or language feature.

Preserve as igniter-v0.1.0-alpha.8 with prior tags unchanged. Keep the example in
root ./examples with its indexed name. This explicit request takes precedence
over the pending named-tuple review; it does not approve that separate proposal.
