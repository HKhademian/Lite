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

Use [core/text](lite://module/core/text) for code-point length, indexing, slicing, trimming, searching, and joining, [core/unicode](lite://module/core/unicode) for UTF-8 byte/scalar conversion, [core/math](lite://module/core/math) for numeric constants and helpers (`PI`, `TAU`, `sqrt`, `clampInt`, `minFloat`), and [core/random](lite://module/core/random) for deterministic seedable PRNGs:

```lite
io := import "core/io";
text := import "core/text";
math := import "core/math";

msg := text.trim("  Lite\t") + "!";
io.outputLine(msg, msg.length(), msg.at(0), math.clampInt(120, 0, 100));
```

See [Numbers](lite://doc/numbers), [Division](lite://doc/division), [Comparison Chains](lite://doc/comparison-chains), [Strings](lite://doc/strings), and [Math, Vectors & Matrices](lite://handbook/math-vectors-and-matrices).

## Next Chapter

Continue to [Conditionals, Match & Loops](lite://handbook/conditionals-match-and-loops).
