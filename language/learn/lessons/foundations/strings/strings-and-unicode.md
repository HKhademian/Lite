# Escapes, Code-Point Text & UTF-8 Encoding

Strings in Lite store valid Unicode text and separate scalar character indexing (`core/text`) from raw UTF-8 bytes (`core/unicode`).

## Walkthrough

1. Double-quoted strings interpret `\t`, `\"`, and Unicode literals like emoji (`🚀`).
2. `cleaned.length` (or `text.length(cleaned)`) and `text.at(cleaned, i)` index **Unicode code points**, so multi-byte characters count as 1 scalar; `cleaned.isEmpty` checks for `""`.
3. `unicode.toCodePoints(phrase)` returns the scalar integer list, and `unicode.utf8Encode` / `utf8DecodeStrict` convert cleanly to and from UTF-8 bytes.

> [!NOTE]
> `=!=` is Lite's not-equal operator (`!=` is invalid), and `utf8DecodeStrict` returns `(ok: Bool, text: String)` so invalid UTF-8 sequences never fail silently.

## Try Modifying This

1. Change `phrase` to another multi-byte greeting and inspect the UTF-8 byte sequence vs code point count.
2. Append an exclamation mark conditionally using `if not text.endsWith(tag, "!")`.

See [Handbook: Numbers, Operators & Strings](lite://handbook/numbers-operators-and-strings), [core/text](lite://module/core/text), and [core/unicode](lite://module/core/unicode).
