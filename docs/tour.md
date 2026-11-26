# A short LiteLang tour

Try [your first program](lite://doc/start-here) for browser and local setup,
then use this tour to see what Lite code looks like. The linked programs run
with both the TypeScript and C11 backends. Read the
[Handbook](lite://handbook/overview-and-setup) for a guided walk through
supported language features.

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
Continue with [Bindings & Mutability](lite://handbook/bindings-and-mutability)
or look up [declarations](lite://doc/declarations-and-assignment) and
[operators](lite://doc/operators) in the language design.

## Modern collections, loops, and records

```text
io := import "core/io";

nums := [-2, 3, 0, 5];
posDoubled := loop nums { if .item > 0 { .item * 2 } }.collected;

scores: mut Map<String, Int> = ["alice" = 10, "bob" = 20];
scores["alice"] += 5;

tags: Set<String> = ["lite", "typed", "lite"];
io.outputLine(posDoubled.length, scores.size, tags.size, "hello".length);
```

Loops collect committed values with `.collected` (partial `if`/`match` tails skip non-matching items), `Map`/`Set` support bracket initializers and zero-initialization, and `List`, `[T; N]`, `Map`, `Set`, and `String` expose read-only `.length`/`.size`/`.isEmpty` properties.

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
- [Typed maps](lite://play/example/typed-maps): `Map<K, V>` key-value indexing,
  `core/map` lookups, value snapshots, and entry iteration; continue with
  [maps](lite://doc/maps).
- [Typed sets](lite://play/example/typed-sets): `Set<T>` deduplication,
  `core/set` membership and mutation grants, value snapshots, and element
  iteration; continue with [sets](lite://doc/sets).
- [Value enums](lite://play/example/value-enums): nominal plain and backing-typed
  enums, contextual `.Case` shorthand, `.value` reads, and exhaustive `match`;
  continue with [enums and variants](lite://doc/enums-and-variants).
- [Integer calculator](lite://play/example/integer-calculator): a scanner and
  recursive parser composed from smaller features.
- [Type aliases](lite://play/example/type-aliases) shows how to name tuple and
  list types using `:= alias`. The
  [alias and distinct reference](lite://doc/type-aliases) covers `alias` and
  `distinct` declarations.
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

Browse the [module reference](lite://module) for library functions, or
[practice in Gym](lite://gym). The [design index](lite://doc/overview)
links to detailed rules and [implementation status](lite://doc/implementation-status).
