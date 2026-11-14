# A short LiteLang tour

This tour introduces selected language ideas through existing sources. All
linked tour examples compile and run through the generated TS compiler, while
broader language features remain in progress—check
[compiler status](../compiler/README.md); the wider reference is a design
contract, not a claim of full executable coverage.

## Bindings and arithmetic

```text
io := import "core/io";

first := 7;
second := 5;
var total := first + second;
total = total * 2;
io.outputLine(total);
```

`:=` introduces a binding. `var` permits replacement. This fragment prints
`24` and has its own [runnable case](../language/cases/tour-bindings.case.json).
The [double-sum case](../language/verifications/artifacts/examples/001-double-sum.json)
checks the corresponding interactive program.
Read [declarations](declarations-and-assignment.md), [mutability](mutability.md)
and [operators](operators.md) for the selected contracts.

## Follow a useful program

- [Decisions](../language/examples/002-decisions.lts): conditions and short-circuiting;
  continue with [conditionals](conditionals.md).
- [Factorial](../language/examples/004-factorial.lts): functions and recursion;
  continue with [functions](functions.md).
- [Fixed tuples](../language/examples/006-fixed-tuples.lts): unit, singleton, and
  nested tuple values and patterns; continue with
  [tuples and patterns](tuples-and-patterns.md).
- [Named tuples](../language/examples/008-named-tuples.lts): structured values and labels;
  continue with [tuples and patterns](tuples-and-patterns.md).
- [Fixed arrays](../language/examples/009-fixed-arrays.lts): fixed-extent sequence literals,
  checked indexing, and compound updates; continue with [arrays](arrays.md).
- [Named arguments](../language/examples/012-named-arguments.lts): interleaved positional and named
  arguments, `=name` shorthand, and named `self` calls; continue with
  [named input routing](named-input-routing.md).
- [Growable lists](../language/examples/013-growable-lists.lts): explicit storage and mutation;
  continue with [lists](lists.md).
- [Integer calculator](../language/examples/016-integer-calculator.lts): a scanner and
  recursive parser composed from smaller features.
- [Type aliases](../language/examples/021-type-aliases.lts): transparent `type` contracts for
  tuples and growable lists; continue with [type aliases](type-aliases.md).
- [Sum loop](../language/examples/022-sum-loop.lts): mutable accumulators, `+=` updates, and
  explicit loop exit; continue with [loops](loops.md).
- [Subjectless match](../language/examples/023-subjectless-match.lts): ordered
  Boolean `match { ... }` arms with a required `_` fallback for values and
  actions; continue with [match](match.md).

Each example has a corresponding manifest under
[artifact verifications](../language/verifications/artifacts/examples/). Cases preserve
input, output, diagnostics and status; an unsupported case remains visible.

Return to [the reference index](README.md), visit [start here](start-here.md),
or read [the normative map](normative-pages.md) for rule ownership.
