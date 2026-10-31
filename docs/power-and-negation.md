# Power and negation

Status: **`**` spelling and explicit unary-minus grouping selected 2026-10-25; right association, Float-default result typing and a positive-exponent checkpoint selected 2026-11-01. The igniter implements that subset; zero/negative exponents, exact overflow/fault rules and compiler-target lowering remain open.**

## Selected grouping requirement

Require the author to distinguish a negative power base from negation of a completed power:

```text
(-2) ** 2; /* negative base, mathematical result 4 */
-(2 ** 2); /* negate the power result, mathematical result -4 */
```

Reject the unparenthesized spelling:

```text
-2 ** 2; /* invalid: group the negative base or the completed power */
```

This is a syntactic requirement for unary minus at the power/base boundary, not a runtime ambiguity test. Apply it to any operand expression, not only a numeric literal:

```text
-base ** exponent;   /* invalid */
(-base) ** exponent; /* explicitly negative base */
-(base ** exponent); /* explicitly negate the completed power */
```

Grouping the entire unresolved expression does not clarify its inside: `(-base ** exponent)` is still invalid. Group one of the two intended operations as shown above. Whitespace, line breaks, and neutral comments do not select a grouping or remove the requirement. An optional identity-leading + cannot make an otherwise invalid source expression valid.

## Odd powers do not exempt the source

The user's `-2 ** 3` example is the right place to ask about intent, but its mathematical value does not distinguish the two groupings:

```text
(-2) ** 3; /* -8 */
-(2 ** 3); /* -8 */
-2 ** 3;   /* still invalid */
```

Use an even exponent to expose the difference. Do not accept an ambiguous source spelling because constant folding, an odd exponent, or the current value happens to make two interpretations agree. Do not infer the author's grouping from types or overload success either. A diagnostic should show the negative-base and outer-negation alternatives rather than silently choosing one.

## Dual spelling proposal — not selected

The user suggested a compatibility split:

- `**` remains right-associative.
- `^` would be a left-associative alias for users coming from Excel and MATLAB.

That is not selected. Excel and MATLAB make `^` familiar, but a second spelling
with different association creates new questions:

- What happens in a mixed chain such as `2 ** 3 ^ 2`? A safe rule would reject
  mixed unparenthesized chains and require explicit grouping.
- Both spellings would share the same precedence, or `^` would need its own
  level.
- Excel and MATLAB do not necessarily agree on unary-minus interaction, so
  `-2 ^ 2` cannot be imported from both.
- `^` is bitwise XOR in many other languages; Lite has no bitwise operators yet.
- The Float-default result and positive-exponent checkpoint would need to apply
  consistently to both spellings.

No `^` token or alternate association is selected.

## Reference behavior and rationale

- [Python power](https://docs.python.org/3/reference/expressions.html#the-power-operator) gives power priority on the left: `-2 ** 2` evaluates as `-(2 ** 2)`, giving -4.
- [Lua 5.4 precedence](https://www.lua.org/manual/5.4/manual.html#3.4.8) similarly puts its ^ power operator above unary minus.
- [ECMAScript's power grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-exp-operator) rejects a bare unary-minus left operand of `**`, requiring explicit grouping for the two intentions.
- Rust, Dart, Odin, and Zig do not provide a built-in numeric `**` operator in the references reviewed. Their named power operations do not establish a competing grouping rule for this spelling. The inspected V appendix lists numeric `**` but does not establish its unary-minus interaction; no V signed-power runtime result is claimed. See the [full comparison](arithmetic-operators-comparison.md).

These languages have deterministic grammars, but their conventions do not give a portable reading of the source. The user selected rejection when the intent remains ambiguous. LiteScript therefore requires the visible choice instead of adopting either precedence interpretation for this spelling.

## Association across languages

Power is right-associative in the common mathematical and programming convention:

| Right-associative | Left-associative | Function-only |
|---|---|---|
| Python `**`, Ruby `**`, JavaScript `**`, Lua `^`, Haskell `^`/`**`, R `^`, Perl `**`, PHP `**`, Julia `^`, Fortran `**` | MATLAB `^`, Excel `^` | Java, C#, Go, Rust, Swift, Kotlin, Zig, Dart |

Right association gives `2 ** 3 ** 2` the reading `2 ** (3 ** 2) = 512`. Left
association gives `(2 ** 3) ** 2 = 64`. Right association is now selected.

## Association, result and checkpoint selected 2026-11-01

Power is **right-associative**: `2 ** 3 ** 2` is `2 ** (3 ** 2) = 512`.
The result is **Float by default** for admitted Int or Float operands;
`2 ** 3` is Float 8. Int results wait for a future real NonNegInt exponent
type. Int and Float operands may mix.

The current igniter checkpoint admits only **positive exponents**. `x ** 0`
and negative exponents raise `ArithmeticPanic` as explicitly unsupported, not
as final language semantics. Non-finite Float results use the existing
arithmetic-fault path. Zero exponent, negative exponents, exact overflow and
the complete power fault contract remain open. Compiler targets do not lower
`**` yet.

## Separate decisions still open

The selected rule settles association and the first Float-default result/checkpoint.
It does not settle zero/negative exponents, signed zero, exact overflow,
non-finite/domain faults, or compiler-target lowering. The recursive grammar
enforces the selected unary-minus boundary.

The examples' values describe ordinary mathematical powers for admitted operands. Complete typing and numeric rules determine which programs are accepted and how their values are represented. `**=` and redundant leading `**` are not selected. Leading minus remains a real operation; identity leading + gains no new operation or exception.

## Related documents

- [Operators](operators.md)
- [Grammar sketch](grammar-sketch.md)
- [Numbers](numbers.md)
- [Arithmetic comparison](arithmetic-operators-comparison.md)
- [Evaluation order](evaluation-order.md)
- [Decision ledger](decisions-and-open-questions.md)
