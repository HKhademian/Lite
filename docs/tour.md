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
`24` and has its own [runnable case](../language/cases/bindings/tour/run-mutable-accumulator.case.json).
The [double-sum case](../language/verifications/artifacts/examples/foundations/io/double-sum.json)
checks the corresponding interactive program.
Read [declarations](declarations-and-assignment.md), [mutability](mutability.md)
and [operators](operators.md) for the selected contracts.

## Follow a useful program

- [Decisions](../language/examples/control/branching/range-decisions.lts): conditions and short-circuiting;
  continue with [conditionals](conditionals.md).
- [Factorial](../language/examples/functions/recursion/factorial.lts): functions and recursion;
  continue with [functions](functions.md).
- [Fixed tuples](../language/examples/types/tuples/fixed-tuples.lts): unit, singleton, and
  nested tuple values and patterns; continue with
  [tuples and patterns](tuples-and-patterns.md).
- [Named tuples](../language/examples/types/tuples/named-tuples.lts): structured values and labels;
  continue with [tuples and patterns](tuples-and-patterns.md).
- [Fixed arrays](../language/examples/types/collections/fixed-arrays.lts): fixed-extent sequence literals,
  checked indexing, and compound updates; continue with [arrays](arrays.md).
- [Named arguments](../language/examples/functions/calls/named-arguments.lts): interleaved positional and named
  arguments, `=name` shorthand, and named `self` calls; continue with
  [named input routing](named-input-routing.md).
- [Growable lists](../language/examples/types/collections/growable-lists.lts): explicit storage and mutation;
  continue with [lists](lists.md).
- [Integer calculator](../language/examples/parsing/evaluators/integer-calculator.lts): a scanner and
  recursive parser composed from smaller features.
- [Type aliases](../language/examples/types/aliases/type-aliases.lts): transparent `type` contracts for
  tuples and growable lists; continue with [type aliases](type-aliases.md).
- [Sum loop](../language/examples/control/loops/sum-loop.lts): mutable accumulators, `+=` updates, and
  explicit loop exit; continue with [loops](loops.md).
- [Subjectless match](../language/examples/control/branching/subjectless-match.lts): ordered
  Boolean `match { ... }` arms with a required `_` fallback for values and
  actions; continue with [match](match.md).
- [Numeric widths](../language/examples/foundations/numeric/numeric-widths.lts): explicit
  `Int8`/`Int16`/`Int32` and `Float32` widths, promotion, lossless widening, and
  binary32 rounding; continue with [numbers and ranges](numbers.md).

Each example has a corresponding manifest under
[artifact verifications](../language/verifications/artifacts/examples/). Cases preserve
input, output, diagnostics and status; an unsupported case remains visible.

Return to [the reference index](README.md), visit [start here](start-here.md),
or read [the normative map](normative-pages.md) for rule ownership.
