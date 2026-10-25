# Power and negation

Status: **`**` power spelling and rejection of ambiguous unparenthesized unary-minus/power forms selected 2026-10-25; full power grammar, association, operand/result types, and exact numeric/fault contracts remain open**. This is a documentation-level language decision, not an implemented parser claim.

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

## Reference behavior and rationale

- [Python power](https://docs.python.org/3/reference/expressions.html#the-power-operator) gives power priority on the left: `-2 ** 2` evaluates as `-(2 ** 2)`, giving -4.
- [Lua 5.4 precedence](https://www.lua.org/manual/5.4/manual.html#3.4.8) similarly puts its ^ power operator above unary minus.
- [ECMAScript's power grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-exp-operator) rejects a bare unary-minus left operand of `**`, requiring explicit grouping for the two intentions.
- Rust, Dart, Odin, and Zig do not provide a built-in numeric `**` operator in the references reviewed. Their named power operations do not establish a competing grouping rule for this spelling. The inspected V appendix lists numeric `**` but does not establish its unary-minus interaction; no V signed-power runtime result is claimed. See the [full comparison](arithmetic-operators-comparison.md).

These languages have deterministic grammars, but their conventions do not give a portable reading of the source. The user selected rejection when the intent remains ambiguous. LiteScript therefore requires the visible choice instead of adopting either precedence interpretation for this spelling.

## Separate decisions still open

The rule above selects the `**` symbol and this grouping restriction. It does not by itself settle chained-power association or a complete precedence ladder, signed right operands, integer versus fractional exponents, promotions, complex numbers, zero/negative-base domain cases, signed zero, overflow, or fault categories. Right-associative power remains the documented recommendation; it is not newly selected by rejecting a unary-minus base. The recursive grammar must enforce the selected boundary rather than accidentally admitting -(ungrouped power) through a generic unary production.

The examples' values describe ordinary mathematical powers for admitted operands. Complete typing and numeric rules determine which programs are accepted and how their values are represented. `**=` and redundant leading `**` are not selected. Leading minus remains a real operation; identity leading + gains no new operation or exception.

## Related documents

- [Operators](operators.md)
- [Grammar sketch](grammar-sketch.md)
- [Numbers](numbers.md)
- [Arithmetic comparison](arithmetic-operators-comparison.md)
- [Evaluation order](evaluation-order.md)
- [Decision ledger](decisions-and-open-questions.md)
