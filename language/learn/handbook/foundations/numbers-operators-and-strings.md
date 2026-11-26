# Numbers, Operators & Strings

Lite provides overflow-checked signed integers, binary64 and binary32 floating-point numbers, an unambiguous pair of division families, chained comparisons, and UTF-8 scalar text operations.

## Integers and Floats

- `Int` (synonym for `Int64`) is the default signed 64-bit integer type; overflow, underflow, and zero-division panic with source locations.
- Narrow signed widths `Int8`, `Int16`, `Int32` widen losslessly into larger widths during expressions or assignments.
- `Float` (synonym for `Float64`) and binary32 `Float32` represent IEEE-754 floating-point values. Literal expressions receive exact typed contexts (`half: Float32 = 0.5;`).

```lite
io := import "core/io";

small: Int8 = 40;
medium: Int16 = 300;
wide: Int32 = small + medium;
f32: Float32 = 0.25;
exact: Float = 1 + f32;
io.outputLine(wide, exact);
```

## Two Division Families: `/` `%` vs `:/` `:%`

Lite makes integer rounding explicit through two distinct operator pairs:

| Operator pair | Rounding mode | `-7 op 2` quotient | `-7 op 2` remainder |
| --- | --- | --- | --- |
| `/` and `%` | Truncating toward `0` | `-3` | `-1` |
| `:/` and `:%` | Flooring toward `-infinity` | `-4` | `1` |

Mixing any `Float` operand with `/` computes exact floating division: `7.0 / 2 == 3.5`.

## Power (`**`) and Unary Sign Grouping

Exponentiation `**` binds tighter than multiplication and associates right-to-left (`2 ** 3 ** 2 == 512`). Because unary negation precedence beside power is a frequent source of bugs in math expressions, writing `-2 ** 3` unparenthesized is a compile error; write `(-2) ** 3` or `-(2 ** 3)` explicitly.

## Comparisons, Equality (`=!=`), and Logical Operators

Lite spells inequality as `=!=` (never `!=`) and Boolean operators as keywords `and`, `or`, `not`. Adjacent comparison chains evaluate every middle operand **once** and short-circuit left-to-right:

```lite
io := import "core/io";

score := 84;
inBand := 60 <= score < 90;
notZero := score =!= 0 and not (score > 100);
io.outputLine(inBand, notZero);
```

## Strings, Math, Random & Unicode Helpers

Double-quoted `"..."` strings support multi-line text and standard escapes (`\n`, `\t`, `\"`, `\\`, `\r`). Concatenate strings with `+` and call `.length()` or `.isEmpty()` directly on any `String`.

Use [core/text](lite://module/core/text) for code-point length, indexing, slicing, trimming, searching, joining, and UTF-8 byte/scalar conversion, [math/scalar](lite://module/math/scalar) for numeric constants and helpers (`PI`, `TAU`, `sqrt`, `clamp`, `min`), and [math/random](lite://module/math/random) for deterministic seedable PRNGs:

```lite
io := import "core/io";
math := import "math/scalar";

msg := "  Lite\t".trim() + "!";
io.outputLine(msg, msg.length(), msg.at(0), math.clamp(120, 0, 100));
```

See [Numbers](lite://doc/numbers), [Division](lite://doc/division), [Comparison Chains](lite://doc/comparison-chains), [Strings](lite://doc/strings), and [Math, Vectors & Matrices](lite://handbook/math-vectors-and-matrices).

### UTF-8 round trip

`"Aé🚀"` has three Unicode scalars and occupies seven UTF-8 bytes. Encode
with [`String.utf8Encode`](lite://module/core/text#String.utf8Encode) and decode
with [`String.fromUtf8Strict`](lite://module/core/text#String.fromUtf8Strict).
The decode result reports whether the bytes represent valid UTF-8.
Use the encoded list's length for buffer sizes and `String.length` when
counting code points. See the [string properties rule](lite://doc/strings#string-properties).

```lite
/* Showcase 01.03 — Escaped strings, code-point text indexing, and Unicode UTF-8 conversion. */

io := import "core/io";

/* String literals support escapes and concatenation; indexing operates on Unicode code points. */
raw := "  Hello\t\"Lite\" 🚀  ";
cleaned := raw.trim();
firstCh := cleaned.at(0);
lastCh := cleaned.at(cleaned.length() - 1);
tag := cleaned + "!";

/* Explicit scalar code-point and UTF-8 encode/decode helpers bridge strings and byte lists. */
phrase := "Aé🚀";
scalars := phrase.toCodePoints();
utf8Bytes := phrase.utf8Encode();
decoded := String.fromUtf8Strict(utf8Bytes);

io.outputLine("cleaned:", tag, "edges:", firstCh, lastCh, "len:", cleaned.length());
io.outputLine("scalars:", scalars.map(fn(x: Int): String { x.toText() }).join(","));
io.outputLine("utf8-bytes:", utf8Bytes.map(fn(x: Int): String { x.toText() }).join(" "), "roundtrip:", decoded.ok, decoded.text);
```

[Run in Playground](lite://play/example/showcase-strings-and-unicode) ·
[Expected output](lite://repo/language/verifications/artifacts/showcases/foundations/strings/strings-and-unicode.json) ·
[Learn walkthrough](lite://learn/strings-and-unicode) ·
[Practice scalar and byte counts](lite://gym/drills/utf8-roundtrip-count)

## Next Chapter

Continue to [Conditionals, Match & Loops](lite://handbook/conditionals-match-and-loops).
