# Pattern binding inference

Status: **infer unannotated bindings from compatible input possibilities, preserving concrete types and unions; complete inference and ownership algorithms open**.

## Purpose and template

An explicit annotation constrains the matched component. Other bindings are inferred from the part of the input type that can satisfy the whole pattern. A programmer need not annotate every component to keep static type checking.

```text
(x, y: (a, b: str, c), ...rest)
```

Here str stands for a known string type or alias. The typed component b must match it without conversion. The other names receive inferred static types, not automatically Any, a common supertype, or runtime-varying variable types. The whole-value colon/rest spelling remains a [separate syntax proposal](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest); the binding-inference requirement also applies to already selected typed destructuring.

## Inference rule

1. Start with the input's statically possible types and shapes at this match site.
2. Apply the complete structural and type constraints. Narrow compatible portions of each alternative and discard impossible portions; an alternative containing a union at b may be partly compatible rather than entirely accepted or rejected.
3. For each name, obtain the type of the component or whole value it binds in every compatible possibility.
4. Use that type if there is only one; otherwise use their union, collapsing duplicate alternatives. Narrow composite values before projecting their component types.

This is input narrowing and projection, not a rule that arbitrarily unions unrelated arm result expressions. A single matching arm can bind several union-typed names while its final expression still obeys the ordinary compatible-result contract.

## Example: one constraint, several inferred bindings

Suppose input admits these three type shapes. This is explanatory type notation; the complete tuple-type declaration grammar remains open:

```text
A = (Int,    (Bool,  String, Int),  Bool,   Int)
B = (Float,  (Int,   String, Int),  String, Bool)
C = (String, (Float, Int,    Bool), Bool,   Float)
```

Match with str denoting String:

```text
(x, y: (a, b: str, c), ...rest)
```

A and B satisfy the type constraint; C cannot, because its b component is Int. Inside the successful branch:

```text
x    : Int | Float
a    : Bool | Int
b    : String
c    : Int
y    : (Bool, String, Int) | (Int, String, Int)
rest : (Bool, Int) | (String, Bool)
```

c remains Int because every compatible possibility supplies Int. C contributes nothing to the types of x, a, c, y, or rest. Matching does not convert C's Int component into text.

For a single statically possible input shape, every binding instead receives the corresponding concrete component type. If one source alternative has b of type `String | Int`, its matching portion retains only String for b; its other components narrow further only where the input contract establishes a relationship.

## Composite types retain their alternatives

rest is a union of complete remaining tuple shapes. Do not replace it with `(Bool | String, Int | Bool)`: that product admits combinations neither A nor B supplied. The same principle applies to y and other composite bindings. Different remaining lengths must be retained as different shapes, rather than silently inserting missing values or converting the remainder into a homogeneous list.

Projecting individual bindings naturally gives each its own union type. Further narrowing one extracted binding and automatically refining its siblings requires explicit correlation and mutation rules; that broader flow feature is not selected merely by this initial inference requirement. Preserve the compatible composite alternatives without claiming arbitrary cross-binding dependent typing.

## Static meaning and capabilities

- The inferred types describe every value that may reach the successful branch, not only the concrete value observed in one execution.
- No implicit cast, numeric widening, string conversion, allocation, or cloning is introduced by pattern inference.
- Type knowledge does not grant mutation, access, or ownership permissions.
- Whole-value and component bindings must refer to the matched data under the chosen ownership contract; inference cannot manufacture duplicate ownership.
- A pattern with no compatible portion cannot normally execute its body. The exact unreachable-pattern diagnostic policy remains open.
- A generic or open input can justify only its available type bounds and refinements. Generic type-test legality and how to represent such refinements need formalization; the compiler must not guess concrete types.

## References and remaining decisions

Dart patterns bind variables with inferred types and permit typed subpatterns; Kotlin describes smart casts and common-supertype approximations because it does not expose general union types. LiteScript's selected requirement preserves concrete types or unions from compatible alternatives rather than automatically replacing them with such an approximation. See [Dart patterns](https://dart.dev/language/patterns) and [Kotlin type checks](https://kotlinlang.org/docs/typecasts.html).

Formalize union normalization, exact-type/subtype intersections, generics, correlated component refinements, tuple/rest type grammar, and ownership during matching. No compiler implementation or inference-completeness proof is implied.

Related: [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule), [union type patterns](union-patterns.md), [types and inference](types-and-inference.md), and [tuples and patterns](tuples-and-patterns.md).
