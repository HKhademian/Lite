# Integers, Floats, Division Families & Power

Lite makes numeric widths and rounding directions explicit so negative remainders and operator precedence never surprise you.

## Walkthrough

1. **`/` & `%` vs `:/` & `:%`**: `-7 / 2 == -3` (truncating toward zero) with remainder `-1`, whereas `-7 :/ 2 == -4` (flooring toward `-infinity`) with nonnegative modulo `1`.
2. **Exact Floats**: Mixing `Float` (`7.0 / 2`) yields `3.5`.
3. **Power `**`**: `2 ** 3 ** 2` associates right-to-left (`512`). Negative bases require explicit grouping `(-2) ** 3`.
4. **Sized widths**: `Int8` and `Int16` widen losslessly into `Int32`; `Float32` arithmetic mixes cleanly into `Float`.

> [!WARNING]
> Writing `-2 ** 3` without parentheses is a deliberate compile error in Lite so exponentiation sign rules are never ambiguous.

## Try Modifying This

1. Change `-7 :/ 2` to `-7 :/ -2` and observe both `/` and `:/` results.
2. Try initializing `tiny: Int8 = 200;` to observe checked narrow-range validation.

See [Handbook: Numbers, Operators & Strings](lite://handbook/numbers-operators-and-strings) and [Division](lite://doc/division).
