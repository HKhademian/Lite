# A short LiteLang tour

This tour introduces selected language ideas through existing sources. All
linked tour examples compile and run through the generated TS compiler, while
broader language features remain in progress—check
[compiler status](lite://doc/compiler/overview); the wider reference is a design
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
`24` and has its own [runnable case](lite://repo/language/cases/bindings/tour/run-mutable-accumulator.case.json).
The [double-sum case](lite://repo/language/verifications/artifacts/examples/foundations/io/double-sum.json)
checks the corresponding interactive program.
Read [declarations](lite://doc/declarations-and-assignment), [mutability](lite://doc/mutability)
and [operators](lite://doc/operators) for the selected contracts.

## Follow a useful program

- [Decisions](lite://play/decisions): conditions and short-circuiting;
  continue with [conditionals](lite://doc/conditionals).
- [Factorial](lite://play/example/factorial): functions and recursion;
  continue with [functions](lite://doc/functions).
- [Fixed tuples](lite://play/example/fixed-tuples): unit, singleton, and
  nested tuple values and patterns; continue with
  [tuples and patterns](lite://doc/tuples-and-patterns).
- [Named tuples](lite://play/example/named-tuples): structured values and labels;
  continue with [tuples and patterns](lite://doc/tuples-and-patterns).
- [Fixed arrays](lite://play/example/fixed-arrays): fixed-extent sequence literals,
  checked indexing, and compound updates; continue with [arrays](lite://doc/arrays).
- [Named arguments](lite://play/example/named-arguments): interleaved positional and named
  arguments, `=name` shorthand, and named `self` calls; continue with
  [named input routing](lite://doc/named-input-routing).
- [Growable lists](lite://play/example/growable-lists): explicit storage and mutation;
  continue with [lists](lite://doc/lists).
- [Integer calculator](lite://play/example/integer-calculator): a scanner and
  recursive parser composed from smaller features.
- [Type aliases](lite://play/example/type-aliases): transparent `type` contracts for
  tuples and growable lists; continue with [type aliases](lite://doc/type-aliases).
- [Sum loop](lite://play/example/sum-loop): mutable accumulators, `+=` updates, and
  explicit loop exit; continue with [loops](lite://doc/loops).
- [Subjectless match](lite://play/example/subjectless-match): ordered
  Boolean `match { ... }` arms with a required `_` fallback for values and
  actions; continue with [match](lite://doc/match).
- [Numeric widths](lite://play/example/numeric-widths): explicit
  `Int8`/`Int16`/`Int32` and `Float32` widths, promotion, lossless widening, and
  binary32 rounding; continue with [numbers and ranges](lite://doc/numbers).

Each example has a corresponding manifest under
[artifact verifications](lite://repo/language/verifications/artifacts/examples). Cases preserve
input, output, diagnostics and status; an unsupported case remains visible.

Return to [the reference index](lite://doc/overview), visit [start here](lite://doc/start-here),
or read [the normative map](lite://doc/normative-pages) for rule ownership.
