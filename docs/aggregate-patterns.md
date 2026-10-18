# Aggregate patterns: fields and positions

Status: **Student examples reviewed on 2026-10-18; the three base pattern operations are selected, but record-pattern syntax and positional schemas remain proposals**.

## Purpose

Apply bind, type match, and value match to components of one structured value. The pattern must first recognize the appropriate type or constructor and then apply subpatterns to its supplied components. This is not a call that constructs a Student during matching, nor an equality test on the whole Student.

Assume Student exposes an age component and a name component. These examples describe candidate record/constructor patterns; they do not select a class, inheritance, or record declaration grammar.

## Named-field value constraints

```text
Student(age == outVal, name == "ali")
```

Under this proposal, age and name select fields. Each field's supplied value is tested against its right-hand expression. Neither selector introduces a local binding, and neither is a lookup of an ordinary outer age/name variable. outVal is an existing value; the literal is a concise value test.

This form needs an explicit named-field production. It is not evidence that any ordinary `name == expression` automatically binds and compares a value in a positional pattern. Full named-field patterns, alias composition, and the boundary between named clauses and positional subpatterns remain open.

## Positional value constraints

If Student explicitly exposes the positional matching schema `(age, name)`, the same two tests can be written:

```text
Student(== outVal, == "ali")
```

The literal can use its concise value-match form:

```text
Student(== outVal, "ali")
```

The two positional patterns mean the same thing for that schema: compare age with the outer outVal and compare name with the string literal. Named and positional forms select the same components only when their schema establishes that correspondence. Do not infer positional order from memory layout, private fields, or an unrelated constructor overload.

The explicit schema is still a proposal: declaration syntax, visibility, stability when a type evolves, and positional arity need decisions before treating Student(...) as a fully specified record pattern.

## Binding changes the meaning

```text
Student(outVal, "ali")
```

This binds the first component to a new outVal and compares the second component with "ali". It does not compare age against the outer outVal. The new binding shadows that outer name only after the whole pattern succeeds, in the matching branch's scope. Its type is inferred from the compatible age components.

The distinction follows the selected primitives rather than a lookup heuristic:

```text
Student(age, name)        /* bind both components */
Student(: Int, name)      /* type-match the first; bind the second */
Student(== outVal, name)  /* value-match the first; bind the second */
Student(_, "ali")        /* bind age as unused-allowed _; value-match name */
```

These are aggregate-pattern candidates assuming the illustrated schema. The selected primitive meanings do not select that schema or bypass field access permissions. `_` remains a readable ordinary binding, not a special omission token.

## Generic aggregate example

Suppose User is generic over the types of two exposed constructor fields and supplies their positional matching schema. The generic declaration spelling and type-argument model have not been selected. Under that assumption, the required pattern interpretation is:

```text
User(: Int, == outVal)
```

There are three matching steps and two component subpatterns:

1. Recognize a value belonging to the User type/constructor family and its matching schema.
2. Type-match the first supplied component against Int, without binding it or testing it against a particular value.
3. Compare the second supplied component with the existing outVal, without binding it.

The head selects the aggregate family/schema; it does not bind a name called User, construct a new object, or compare the whole object by equality. If any required test fails, the whole pattern fails. Later component tests cannot be treated as valid accesses on an object that failed the required outer shape/type test. Exact observable extraction and comparison order still needs the effect contract.

In explanatory type notation, a family might have instances written User<A, B>. This is not an adopted generic declaration syntax. A field constraint examines the supplied component; it does not automatically prove that A is exactly Int, infer B solely from the type of outVal, or cast the entire object to User<Int, B>. For example, a first field whose declared type admits Int or String could contain an Int while the enclosing generic instantiation still has the broader field contract. The generic identity, variance, subtype, and refinement models must define the valid conclusions.

If the first component is statically known to be Int, its type test may need no runtime work. If it is statically incompatible, the pattern cannot succeed; choose the eventual impossible-pattern diagnostic separately. Unknown generic types require a legal type-test mechanism, such as specialization or available type information under the eventual type system. This example does not select universal type erasure, runtime type reification, reflection, allocation, or a particular dispatch representation.

No new names become available to a following guard in the unbound example. To test or use the first component later, bind it explicitly:

```text
User(first: Int, == outVal) and first >= minimum { accept(first) }
```

This is an arm fragment assuming the User schema, compatible comparisons, and additional coverage as needed. The typed binding reuses the selected type-match-plus-bind form; the comparison is an ordinary Boolean guard.

## When to prefer each form

Named fields identify the selected components directly and do not depend on positional order. Positional subpatterns are concise for types that deliberately expose a small stable order. Both can reuse the same underlying primitive patterns; allowing one must not change the meaning of bare identifiers in the other.

Recommendation: permit both only with explicit field/schema contracts. Keep positional components as ordinary subpatterns and treat named field constraints as field selection followed by a subpattern. The exact general selector-to-subpattern delimiter remains open; the user's equality-only named form does not settle type, binding, or nested-field syntax.

## Remaining decisions

- Record/type patterns versus enum payload constructors, and how the matching schema is declared.
- Full named-field grammar, aliases, nested subpatterns, and colon/type ambiguities.
- Whether named and positional forms may mix; no mixing rule is selected by these examples.
- Omitted fields, exact positional arity, and rest capture; do not silently assume partial or exhaustive field extraction.
- Duplicate source-field selection, unknown fields, visibility, extraction effects, ownership, and writable access.

The selected pattern binding order and branch scope still apply. Field selectors are not bindings. If later grammar introduces named bindings or aliases, their written pattern order determines shadowing, not physical record order. Semantic equality and extraction effects retain their separate open contracts.

## Related concepts

- [Pattern primitives](pattern-bindings-and-tests.md)
- [Field aliases and binding names](pattern-aliases.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Match capabilities](match-patterns.md) and [pattern context review](pattern-contexts.md)
