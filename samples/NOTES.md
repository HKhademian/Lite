# Notes for language contributors

Exercises 001–020 are **implemented but unverified** as LiteScript programs. There is no compiler, interpreter, runtime, or implemented `lite run` command. External arithmetic checks establish expected answers only; they do not verify LiteScript syntax, static types, or execution. Exercises 021–520 remain planned.

The `.lite` files are introductory reading material. Keep each focused on one worked example, with a plain-language problem, named inputs, and expected answers next to the calculation. Put verification records and language-design questions here. A printed answer, assertion API, or script exit-value convention is not assumed.

## Arithmetic choices and bounds

- Use small finite values. For further experiments, keep integer magnitudes and intermediate products at most 1000000 and fractional input magnitudes at most 1000. These teaching bounds do not select integer widths or numeric precision.
- Widths and heights are positive; radius, distance, duration, and monetary amounts are nonnegative. Division requires a nonzero divisor. Duration decomposition uses whole seconds; bill splitting uses at least one person. Weights are nonnegative with a positive sum. Interpolation uses a fraction from zero through one. These are supplied-input examples, without input validation.
- [Fractional `/`, integer floor `//`, remainder `%`, and modulo `%%`](../docs/division.md) follow the selected design. The current examples use nonnegative inputs and positive divisors, so their % results remain unchanged; only %% is generally paired with floor // for signed inputs. Fractional-only formulas use fractional literals consistently. The full [numeric representation, literal typing, and compatibility rules](../docs/numbers.md) remain open.
- Parentheses make grouping explicit; basic arithmetic precedence and left association are selected, while complete [expression integration and power contracts](../docs/operators.md) remain open. The temperature formula uses the familiar multiply/divide/add sequence.
- Circle measurements use supplied approximate pi `3.14159`; displayed answers are approximate. Future automated fractional checks should use appropriate tolerances.
- Money uses integer cents and nonnegative half-up rounding. For a numerator `n` and positive denominator `d`, `(n + (d // 2)) // d` rounds to the nearest integer, with ties upward. This also works for odd denominators.
- Discount rounding applies to the discount before subtraction. Tax and tip each use the pretax price and are rounded separately. Simple interest earns on the original principal and rounds once after the full term. The currency example uses an invented rational rate relating minor units directly.

## Verification and design work

The revised examples' 40 named result values were cross-checked with external exact-rational and binary-floating arithmetic models. Approximate comments were reviewed against those values, and local documentation links were checked. This is arithmetic review, not LiteScript execution verification.

Check ordinary cases, zero where permitted, negative arithmetic inputs where meaningful, fractional answers, unit boundaries, and rounding ties separately from the introductory examples. For duration and bill splitting, also check that the parts reconstruct the original total. For swapping, check that both original values survive, including equal values and zero.

No standard library is required by these calculations. No compiler diagnostics have been observed. Numeric precision, inferred types, the complete expression grammar, and [run/build and diagnostic tooling](../docs/tooling-and-learning.md) still need implementation and review. A real toolchain must run these files before their status becomes **verified**.
