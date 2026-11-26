# Escapes, Code-Point Text & UTF-8 Encoding

Strings in Lite store valid Unicode text and separate scalar character indexing from raw UTF-8 byte conversion inside `core/text`.

## Walkthrough

1. Double-quoted strings interpret `\t`, `\"`, and Unicode literals like emoji (`🚀`).
2. `cleaned.length()` and `cleaned.at(i)` index **Unicode code points**, so multi-byte characters count as 1 scalar; `cleaned.isEmpty()` checks for `""`.
3. `phrase.toCodePoints()` returns the scalar integer list, and `phrase.utf8Encode()` / `String.fromUtf8Strict(...)` convert cleanly to and from UTF-8 bytes.

> [!NOTE]
> `=!=` is Lite's not-equal operator (`!=` is invalid), and `String.fromUtf8Strict` returns `(ok: Bool, text: String, error: String)` so invalid UTF-8 sequences never fail silently.

## Try Modifying This

1. Change `phrase` to another multi-byte greeting and inspect the UTF-8 byte sequence vs code point count.
2. Append an exclamation mark conditionally using `if not tag.endsWith("!")`.

See [Handbook: Numbers, Operators & Strings](lite://handbook/numbers-operators-and-strings) and [core/text](lite://module/core/text).

See the [verified UTF-8 round trip](lite://handbook/numbers-operators-and-strings#utf-8-round-trip).
