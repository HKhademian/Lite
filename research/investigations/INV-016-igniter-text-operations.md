# INV-016 — Text-scanning igniter increment

Status: recorded (temporary helpers explicitly approved; retained-token example verified)
Contributor: project contributor (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-016](TOPICS.md#inv-016)
Covered scope: computed concatenation and temporary text-scanning helpers.

## Scope and contracts

**Consent correction, 2026-10-30:** the user requires explicit approval before
new language syntax/features, including temporary builtins and semantic choices.
The agent introduced textLength/textAt/textSlice and their position/bounds policy
without that approval. At that point they remained an experiment awaiting review, not accepted FVP
additions. The later explicit approval is recorded below; the original tag/tests
did not grant consent. The continuation request, successful tests
and alpha.5 tag do not supply consent. Computed concatenation had an existing
documented direction; the newly invented helpers require separate consideration,
including an investigation if needed. No further extension is authorized by
this note. See the [consent rule](README.md#explicit-consent-for-language-changes).

Baseline: `29978ff`, preserved as igniter-v0.1.0-alpha.4. The user requests the
next runnable increment. Text scanning is a small practical component of
compiler experiments in Lite. Preserve the [FVP scope correction](INV-016-01-fvp-text-profile.md#fvp-scope-correction-2026-10-30):
implement only what a concrete example needs, documenting temporary behavior
without treating the deferred text profile as an accepted specification.

The [igniter](../../igniter/README.md#temporary-text-operations) now supports the
existing [computed concatenation direction](../../docs/strings.md#adjacent-literal-joining),
String + String. Operands evaluate once, left to right, without numeric coercion,
separator insertion, normalization or reinterpreting escapes. Other String
arithmetic remains unsupported.

Three temporary builtin helpers provide a consistent explicit text view:

- textLength(String): Int counts code points with the host string iterator.
- textAt(String, Int): String returns one code point at a zero-based position.
- textSlice(String, Int, Int): String returns a half-open start/end interval.

Require 0 <= index < length for textAt, and 0 <= start <= end <= length for
textSlice. Empty intervals are valid, including (0, 0) on empty text. Invalid
bounds raise a terminal BoundPanic diagnostic at the helper call, without clamping,
negative wrapping, or a fabricated character. Check BigInt bounds before host
number conversion. Supplied arguments evaluate once in written order before the
helper checks bounds. Whole-program arity/type checking still precedes I/O.

Supplementary characters occupy one position; combining marks and joined emoji
sequences may occupy several. No grapheme segmentation or normalization is
provided. The names, position unit and fault diagnostic are now approved for the temporary
FVP helper scope only; this
does not select language-wide String indexing, character types, slice/view
semantics, or a public panic API. The earlier detailed proposal remains deferred.

Each helper currently materializes the code points, using time and temporary
storage proportional to the input. Repeated scanning may be quadratic. There is
no constant-time indexing, native storage, zero-copy slicing, ownership/lifetime,
or performance claim. Keep the host disposable rather than building a text
framework. Broader collection/text integration, general String indexing syntax, byte/grapheme views,
interpolation, formatting, and full Unicode policy remain unimplemented/open.

## Concrete experiment and evidence

The [arithmetic tokenizer](../../language/examples/005-scan-arithmetic.lts) is written
in Lite using ordinary functions, loops, short-circuit logic and the helpers.
It groups ASCII decimal runs, skips spaces/tabs, and reports individual
`+ - * / ( )` symbols. It preserves leading zeroes and emits tokens explicitly.
Unsupported characters explicitly report an error and exit 2. An empty supplied
line emits nothing; missing input faults. It is not the Lite lexer, a parser,
an arithmetic evaluator, or a compiler-to-compiler build stage.

Historical alpha.5 evidence: strict TypeScript checking and all 52 groups passed with Node
26.13.0/TypeScript 7.0.2. Added tests cover computed concatenation/copies,
supplementary/Persian/combining text, empty/full/end intervals, negative/huge/
reversed/out-of-range bounds, written evaluation order before bounds faults,
type/arity rejection before effects, helper shadowing, and recursive text
reconstruction. The real CLI tokenizer reports number: 12, symbol: +, number: 30
for input 12 + 30, and explicitly rejects an emoji without splitting it. Separate
CLI probes verify Unicode line input, check-only mode and located BoundPanic.
No lesson source or checked lesson coverage changes.

## Handoff

Preserve this source as igniter-v0.1.0-alpha.5; alpha.1–alpha.4 stay fixed.
The later alpha.14 list slice supplies bounded runtime collection storage. File
I/O and broader structured data remain practical gaps for a Lite-written compiler. No native compiler, self-hosted successor, or verified forward rebuild
chain exists yet. Extend the actual bootstrap compatibility map when one does.

## Focused consent review, 2026-10-31

The approved List<T> slice now supplies runtime-sized token storage. The next
bounded scanner example can retain named token tuples rather than report each
token immediately. Before this decision, text scanning still depended on the
three unapproved helpers above. This is a concrete next experiment, not a
claim that this tokenizer or its APIs are required for every compiler approach.

The user explicitly replies "Approve these temporary text helpers" to the
focused review in `d3122b9`. Accept these exact existing contracts as temporary
FVP runner helpers, leaving the wider text profile deferred:

- textLength(text) takes one String and returns an Int code-point count.
- textAt(text, index) takes String/Int and returns a one-code-point String.
- textSlice(text, start, end) takes String/Int/Int and returns the half-open
  code-point interval. An empty interval is valid, including at the end.

These parameter names explain the positional contract; they do not select public
named arguments. Keep them as temporary runner bindings, with existing helper
shadowing and before-effects arity/type checks. Arguments evaluate once in
written order before bounds checking. Invalid indices/intervals use the existing
terminal BoundPanic diagnostic, without clamping, negative wrapping or retries.

For example, the approved temporary interpretation is:

```text
report(textLength("A🙂B"));     /* 3 */
report(textAt("A🙂B", 1));      /* 🙂 */
report(textSlice("A🙂B", 1, 2)); /* 🙂 */
```

A combining mark counts separately from its base letter. Joined emoji may span
several positions. This does not choose grapheme positions, normalization, a
new Char type, ordinary String bracket indexing or a native String layout.
The current host implementation materializes code points per operation and may
scan repeatedly; no optimization or constant-time access is promised. The
detailed encoding/literal/Unicode/profile proposal remains deferred.

## Current delivery and evidence

The approved helpers retain their existing implementation and positional-only
calling convention. No new text operator, API or String representation is added.
The detailed FVP text/Unicode profile remains deferred. Approval here comes from
the user's explicit reply, not from prior tags, tests or unrelated feature work.

[015-retained-tokens.lts](../../language/examples/015-retained-tokens.lts) combines ordinary
functions, the approved helpers and approved named-tuple list storage. It returns
a complete token list, then explicitly traverses/reports its fields. It preserves
digit text including leading zeroes, skips spaces/tabs, and recognizes the same
arithmetic symbols as 005. Unsupported characters report an error and exit 2
before the outer traversal prints any partial tokens. An empty supplied line
produces an empty list; missing input retains InputFault.

Strict no-emit checking and all 122 interpreter groups pass on pinned Node
26.13.0/TypeScript 7.0.2. Existing helper checks still cover combining/supplementary
text, invalid/empty/full intervals, BigInt bounds, evaluation order, shadowing and
before-effects signatures. New integration checks cover retained field values,
final digit runs, whitespace/empty input, Unicode rejection after earlier tokens,
and real ./bin/lite run/check-only behavior. All 9 editor checks pass on the expanded
corpus. No native/compiler-performance or self-hosting result is claimed.

Preserve this consent/application milestone as igniter-v0.1.0-alpha.15, with prior
tags intact. Next, a bounded arithmetic parser/evaluator example can use these
selected features under INV-061 without changing Lite grammar, adding helper
APIs or choosing a native backend. That demonstration would be application code,
not a self-hosted Lite compiler or a permanent compiler architecture.
