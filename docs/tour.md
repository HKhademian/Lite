# A short LiteLang tour

This tour introduces selected language ideas through existing sources. The
generated compiler does not yet support every example. Check the linked case
and [compiler status](../compiler/README.md); the wider reference is a design
contract, not a claim of executable coverage.

## Bindings and arithmetic

```text
first := 7;
second := 5;
var total := first + second;
total = total * 2;
outputLine(total);
```

`:=` introduces a binding. `var` permits replacement. This fragment prints
`24` and has its own [runnable case](../cases/language/tour-bindings.case.json).
The [double-sum case](../verifications/artifacts/examples/001-double-sum.json)
checks the corresponding interactive program.
Read [declarations](declarations-and-assignment.md), [mutability](mutability.md)
and [operators](operators.md) for the selected contracts.

## Follow a useful program

- [Decisions](../examples/002-decisions.lts): conditions and short-circuiting;
  continue with [conditionals](conditionals.md).
- [Factorial](../examples/004-factorial.lts): functions and recursion;
  continue with [functions](functions.md).
- [Named tuples](../examples/008-named-tuples.lts): structured values and labels;
  continue with [tuples and patterns](tuples-and-patterns.md).
- [Growable lists](../examples/013-growable-lists.lts): explicit storage and mutation;
  continue with [lists](lists.md).
- [Integer calculator](../examples/016-integer-calculator.lts): a scanner and
  recursive parser composed from smaller features. Consult the current migration
  inventory before expecting generated-TS execution.

Each example has a corresponding manifest under
[artifact verifications](../verifications/artifacts/examples/). Cases preserve
input, output, diagnostics and status; an unsupported case remains visible.

Return to [the reference index](README.md), visit [start here](start-here.md),
or read [the normative map](normative-pages.md) for rule ownership.
