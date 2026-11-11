# INV-016 — Temporary FVP text profile

Status: recorded (detailed profile deferred; proposal unselected)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-30
Catalog brief: [INV-016](TOPICS.md#inv-016)
Covered subtopics: partial INV-016.01 (encoding) and INV-016.04 (literal/input text)
Subtopic briefs: [INV-016.01](SUBTOPICS.md#inv-016-01), [INV-016.04](SUBTOPICS.md#inv-016-04)

This is a non-normative investigation. The profile below is proposed, not a
selected String contract or an implemented input/parser subsystem.

## FVP scope correction, 2026-10-30

The user challenged whether this level of text design belongs in the FVP and
accepted narrowing the immediate work to basic quoted text and the temporary
inputLine/inputWord/report helpers. Defer the detailed profile below; it is
not selected and no answer to that proposal is requested now.

Use a simple temporary implementation and define behavior needed by concrete
examples as they arise. Detailed encoding/Unicode policy, escape coverage, and
mixed-input cursor rules are not design prerequisites for starting the FVP.
Record practical implementation behavior and unsupported cases honestly; this
does not waive selected input-fault or explicit-output semantics, nor redefine
the language-wide String direction. Baseline for this correction: `af1dc3b`.

## Question and current contracts

Implementation follow-up, **2026-10-30**: a later
[text-scanning increment](INV-016-igniter-text-operations.md) adds computed
concatenation and three disposable code-point helpers for an arithmetic tokenizer
experiment written in Lite. This records concrete supported behavior; it does
not accept the detailed profile below or settle language-wide text indexing.

Baseline: `a7fedf3`; working tree clean before this note.

What is the smallest usable text profile for the selected interpreter checkpoint?
Keep indexing, Unicode algorithms, formatting libraries, and ownership design
out of this bounded decision.

- [The first checkpoint](../../docs/tooling-and-learning.md#first-executable-checkpoint)
  selects text values and temporary input/report helpers. Text details remain
  open; the helpers are disposable scaffolding.
- [Strings](../../docs/strings.md) already describes double-quoted literals,
  adjacent literal joining, and embedded newlines as content rather than source
  structure. Escape grammar, Unicode encoding/normalization, and physical source
  line-ending conversion remain open.
- [Temporary input failures](../../docs/tooling-and-learning.md#temporary-input-failures)
  distinguish a supplied empty line from EOF without a value. Invalid input and
  premature EOF fault, without implicit retry/default values.

## Proposed bounded profile

- **Encoding:** UTF-8 source and text input, preserving valid Unicode text,
  including Persian. Reject malformed encoding with a source diagnostic or
  input fault, respectively. Do not silently normalize or replace characters.
  This is an external text contract, not a chosen internal string layout.
- **Literals:** double quotes; support escaped quote, backslash, newline, and
  tab. Reject unknown escapes rather than reinterpret them. Preserve the current
  adjacent-literal joining and multiline-content rules; do not strip indentation.
  Raw strings, interpolation, and Unicode escape notation can wait.
- **Line input:** inputLine() returns text without its consumed line terminator.
  Recognize LF and CRLF; an empty supplied line returns empty text. A nonempty
  final line at EOF remains a successful value; EOF with no line available
  raises the selected input fault. This host-input policy does not silently
  choose physical source-file line-ending normalization.
- **Word input:** inputWord() skips separators then returns one nonempty token.
  For this temporary helper, use an explicit ASCII whitespace set: space, tab,
  LF, CR, form feed, and vertical tab. Other Unicode characters remain token
  content; this is not a human-language word-segmentation algorithm. EOF before
  a token faults; EOF after token content completes that token.
- **Output request:** report(text) is explicit. Exact newline/separator and
  destination rules remain a separate minimal helper decision. Plain declarations
  still print nothing. Do not interpret returned input text as source escapes.

Illustrative literals under this proposal:

```text
message := "Hello";
greeting := "سلام";
two_lines := "first\nsecond";
quoted := "He said \"hello\"";
```

inputLine() given the actual characters backslash followed by n returns those
characters, whereas \n inside a source string literal denotes a newline under
the proposed escape rule. The literal examples request no console output.

## Options and recommendation

**Recommend the profile above**, not ASCII-only text or a complete text library.
It supplies direct text input/literals for experiments while avoiding an implicit
choice of byte, scalar, or grapheme indexing. This is a scope judgment, not an
implementation-time or memory-cost measurement.

Shared input-cursor behavior when mixing inputWord/inputInt/inputFloat with
inputLine still needs a concrete rule, including whether a token separator is
left unread or consumed. Numeric token grammar, source line-ending handling,
prompting, report formatting, text concatenation, equality, indexing/slicing,
allocation/ownership, and complete Unicode whitespace behavior are not selected
by this proposal. Do not equate UTF-8 transport with one byte per character.

## Verification and handoff

Read the selected checkpoint/input-fault rules and current String direction.
Checked note/tracking links, fences, and focused diff consistency. No LiteLang
source/input probe was executed and no encoding implementation is claimed.

The detailed proposal is deferred. Resume it when concrete experiments or later
library design need its answers. For now, proceed toward the selected interpreter
checkpoint with basic text/helper scaffolding and document the actual supported
behavior; do not turn full text semantics into a pre-implementation checklist.
