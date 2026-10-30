# INV-016 — Text-scanning igniter increment

Status: recorded (bounded implementation; full text/character contracts open)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-016](TOPICS.md#inv-016)
Covered scope: computed concatenation and temporary text-scanning helpers.

## Scope and contracts

Baseline: `29978ff`, preserved as igniter-v0.1.0-alpha.4. The user requests the
next runnable increment. Text scanning is a small practical prerequisite for
compiler experiments in Lite. Preserve the [FVP scope correction](INV-016-01-fvp-text-profile.md#fvp-scope-correction-2026-10-30):
implement only what a concrete example needs, documenting temporary behavior
without treating the deferred text profile as an accepted specification.

The [igniter](../igniter/README.md#temporary-text-operations) now supports the
existing [computed concatenation direction](../docs/strings.md#adjacent-literal-joining),
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
provided. The names, position unit and fault diagnostic are provisional; this
does not select language-wide String indexing, character types, slice/view
semantics, or a public panic API. The earlier detailed proposal remains deferred.

Each helper currently materializes the code points, using time and temporary
storage proportional to the input. Repeated scanning may be quadratic. There is
no constant-time indexing, native storage, zero-copy slicing, ownership/lifetime,
or performance claim. Keep the host disposable rather than building a text
framework. Collections, general String indexing syntax, byte/grapheme views,
interpolation, formatting, and full Unicode policy remain unimplemented/open.

## Concrete experiment and evidence

The [arithmetic tokenizer](../igniter/examples/scan-arithmetic.lts) is written
in Lite using ordinary functions, loops, short-circuit logic and the helpers.
It groups ASCII decimal runs, skips spaces/tabs, and reports individual
`+ - * / ( )` symbols. It preserves leading zeroes and emits tokens explicitly.
Unsupported characters explicitly report an error and exit 2. An empty supplied
line emits nothing; missing input faults. It is not the Lite lexer, a parser,
an arithmetic evaluator, or a compiler-to-compiler build stage.

Strict TypeScript no-emit checking and all 52 Node test groups pass with Node
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
Collections/structured data and file I/O remain practical gaps for a Lite-written
compiler. No native compiler, self-hosted successor, or verified forward rebuild
chain exists yet. Extend the actual bootstrap compatibility map when one does.
