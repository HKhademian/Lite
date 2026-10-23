# Pattern binding inference

Status: **infer unannotated bindings from compatible input possibilities, preserving concrete types and unions; complete inference and ownership algorithms open**.

## Purpose and template

An explicit annotation constrains the matched component. Other bindings are inferred from the part of the input type that can satisfy the whole pattern. A programmer need not annotate every component to keep static type checking.

```text
(x, (a, b: str, c), ...rest)
```

Here str stands for a known string type or alias. The typed component b must match it without conversion. The other names receive inferred static types, not automatically Any, a common supertype, or runtime-varying variable types. The nested component uses a pattern collector rather than also binding a whole-value name. This [collector choice](tuples-and-patterns.md#nested-tuple-patterns-and-rest-selected) is selected; complete recursive parsing and ownership remain separate. The binding-inference requirement also applies to typed destructuring.

## Inference rule

1. Start with the input's statically possible types and shapes at this match site. In a later match arm or initial alternative, use the remaining subject possibilities established by earlier failures; for closed distinct union members, an unguarded whole-type arm removes its handled member. Guarded/partial patterns do not automatically remove an entire type. See [remaining subject narrowing](type-tests-and-narrowing.md#remaining-subject-types-across-match-arms-selected).
2. Apply the complete structural and type constraints. Narrow compatible portions of each alternative and discard impossible portions; an alternative containing a union at b may be partly compatible rather than entirely accepted or rejected.
3. For each binding occurrence, obtain the type of the component or whole value it binds in every compatible possibility. Distinct occurrences of the same name remain distinct bindings.
4. For that occurrence, use the single projected type or the union of its projected alternatives, collapsing duplicates. Narrow composite values before projecting their component types; do not union different occurrences merely because their names are the same.

Every binding, including `_`, receives its own inferred local type. Ordered shadowing chooses which same-named binding is visible after a successful match; it does not merge their types or erase constraints on hidden components. An underscore-prefixed name may be left unused without a warning. See [pattern binding and shadowing](pattern-shadowing.md).

This is input narrowing and projection. A single matching arm can bind several union-typed names; its final expression follows the separately selected [branch-result inference](branch-result-inference.md): satisfy an expected result contract, or infer a normalized union across normally completing arms.

## Example: one constraint, several inferred bindings

Suppose input admits these three type shapes. This is explanatory type notation using the selected colon form for each unnamed component; complete recursive tuple grammar remains open:

```text
A = (:Int,    :(:Bool,  :String, :Int),  :Bool,   :Int)
B = (:Float,  :(:Int,   :String, :Int),  :String, :Bool)
C = (:String, :(:Float, :Int,    :Bool), :Bool,   :Float)
```

Match with str denoting String:

```text
(x, (a, b: str, c), ...rest)
```

A and B satisfy the type constraint; C cannot, because its b component is Int. Inside the successful branch:

```text
x    : Int | Float
a    : Bool | Int
b    : String
c    : Int
rest : (:Bool, :Int) | (:String, :Bool)
```

c remains Int because every compatible possibility supplies Int. C contributes nothing to the types of x, a, c, or rest. Matching does not convert C's Int component into text.

For a single statically possible input shape, every binding instead receives the corresponding concrete component type. If one source alternative has b of type `String | Int`, its matching portion retains only String for b; its other components narrow further only where the input contract establishes a relationship.

## Alternative arm binding types selected

For initial match-arm alternatives, collect the union of final visible binding names and join each name's possible payload types as a normalized union, contributing Unit for alternatives where that name is absent:

```text
.Email(address) or .Sms(address) {
    deliver(address)
}
```

This is an arm fragment for cases Email(String) and Sms(PhoneNumber); deliver must accept String | PhoneNumber. The shared body has one address name whose type is String | PhoneNumber. At runtime the value is the payload from the selected case. If PhoneNumber is a distinct type with a numeric representation, retain PhoneNumber in the union. If it is a transparent alias for Number, resolve that alias and normalize to String | Number. The language's documented string spelling is String; the example does not add lowercase string or number types.

Compute each alternative's own final visible bindings using existing recursive ordered shadowing, then join the types of corresponding names across alternatives. This union is a join of mutually exclusive successful bindings; it does not merge successive same-named occurrences within a single alternative or change a binding's type during execution. Hidden bindings still retain their constraints and obligations. Different initial arm alternatives may introduce different names, including ordinary underscore bindings. For `.Email(email) or .Sms(phone)`, email has type String | Unit and phone has type PhoneNumber | Unit. The successful case supplies its payload and every absent shared name receives Unit. Shared names shadow outer bindings even on absent paths; outer values are not substituted. Identical-name `.Email(address) or .Sms(address)` retains String | PhoneNumber with no Unit contribution. Unit is an initialized value, not an unbound local or a new absence tag; a genuine Unit payload cannot be distinguished from absent-binding Unit through that binding alone. Complete condition/guard or alternatives now use the same union-of-names and payload-or-Unit rule, including Boolean-only alternatives; no missing binding is borrowed from incoming scope. See [differently named arm bindings](match.md#differently-named-arm-bindings-selected).

A composite payload preserves its complete alternative shapes under the existing union rules. No implicit conversion, common-supertype replacement, or arbitrary correlation/refinement between multiple extracted names is selected. Access must be valid for all possible successful bindings; complete ownership/access joins remain separate. Source-once evaluation, first-success selection, and pre-pattern free-name lookup follow [alternative arm patterns](match.md#alternative-arm-patterns-selected).

## Composite types retain their alternatives

rest is a union of complete remaining tuple shapes. Do not replace it with `(:(Bool | String), :(Int | Bool))`: that product admits combinations neither A nor B supplied. The same principle applies to other composite variable collectors, which bind their supplied value without also destructuring it in that pattern. Different remaining lengths must be retained as different shapes, rather than silently inserting missing values or converting the remainder into a homogeneous list.

Projecting individual bindings naturally gives each its own union type. Further narrowing one extracted binding and automatically refining its siblings requires explicit correlation and mutation rules; that broader flow feature is not selected merely by this initial inference requirement. Preserve the compatible composite alternatives without claiming arbitrary cross-binding dependent typing.

## Static meaning and capabilities

- The inferred types describe every value that may reach the successful branch, not only the concrete value observed in one execution.
- No implicit cast, numeric widening, string conversion, allocation, or cloning is introduced by pattern inference.
- Type knowledge does not grant mutation, access, or ownership permissions.
- Each supplied component uses a variable collector or a pattern collector, without an extra whole-value binding alongside its nested pattern. Inference cannot manufacture ownership, copies, or mutation permissions.
- A pattern with no compatible portion cannot normally execute its body. The exact unreachable-pattern diagnostic policy remains open.
- A generic or open input can justify only its available type bounds and refinements. Generic type-test legality and how to represent such refinements need formalization; the compiler must not guess concrete types.

## References and remaining decisions

Dart patterns bind variables with inferred types and permit typed subpatterns; Kotlin describes smart casts and common-supertype approximations because it does not expose general union types. LiteScript's selected requirement preserves concrete types or unions from compatible alternatives rather than automatically replacing them with such an approximation. See [Dart patterns](https://dart.dev/language/patterns) and [Kotlin type checks](https://kotlinlang.org/docs/typecasts.html).

Formalize union normalization, exact-type/subtype intersections, generics, correlated component refinements, tuple/rest type grammar, and ownership during matching. No compiler implementation or inference-completeness proof is implied.

Related: [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule), [union type patterns](union-patterns.md), [types and inference](types-and-inference.md), and [tuples and patterns](tuples-and-patterns.md).
