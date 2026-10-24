# Aggregate patterns: fields and positions

Status: **destination-first record patterns, inferred pattern shape, contextual/explicit construction, equality shorthand, and typed same-name binding selected; complete schemas and ownership remain open**.

## Purpose

Apply bind, type match, and value match to components of one structured value. The pattern must first recognize the appropriate type or constructor and then apply subpatterns to its supplied components. This is not a call that constructs a Student during matching, nor an equality test on the whole Student.

Assume Student exposes an age component and a name component. These examples describe candidate record/constructor patterns; they do not select a class, inheritance, or record declaration grammar.

## Named-field clauses

### Construction and matching must be reviewed together

The = direction is destination from source. Construction supplies a predefined destination field from an expression; deconstruction supplies a destination pattern from a source field. The earlier field = destinationPattern mapping was backwards and is superseded.

```text
/* Construction: destination fields on the left. */
student: Student = { id = 7, name = "Ali", age = 18, }

/* Deconstruction: destination bindings on the left. */
{
    studentId = id,
    studentName = name,
    years = age,
} := student;
```

The source contract establishes the record's fields. No Student head is needed on this named record pattern. The braces contain clauses, not executable assignment statements or a declaration of an anonymous type. Source field selectors on the right resolve against that record, not outer lexical variables. Trailing commas and final semicolons are optional and allowed in their respective contexts.

The general selected clause is:

```text
pattern = sourceField
```

Each destination receives that field's value under the eventual copy/move/borrow rules; binding syntax does not choose those rules.

```text
{ years = age }          /* bind source age as years */
{ years: Int = age }     /* type-test and bind as years */
{ : Int = age }          /* type-test only */
{ == expected = age }    /* compare source age; bind nothing */
{ _ = age }              /* ordinary unused-allowed binding */
```

Existing conveniences remain:

```text
{ age == expected }     /* same test as == expected = age */
{ age: Int }            /* same as age: Int = age: test and bind age */
```

These equations describe semantic expansion without introducing a general grouping syntax. A typed shorthand is not also a type-only test. Nested patterns sit on the destination side just like a simple binding:

```text
{
    .Some(user) = owner,
    (x, y) = position,
    { email = email, true = verified, } = contact,
} := value;
```

A literal on the left is a value test; true = verified compares rather than binding true. Fields/shape are established before dependent extraction. Binding names follow the existing recursive written-order shadowing rule. The general clause is selected, but every custom nested schema and full expression boundary still needs its contract.

### Inferred patterns and explicit type tests

A named record pattern has no record type head in the selected grammar; TypeName { ... } is not an alternative deconstruction form. Matching uses the source's exposed fields and the compatible-input inference rule. It does not change nominal type identity, search every declared record for a matching field set, or grant runtime reflection. Use an explicit colon type test for nominal selection. Bare names in match still bind, so a name followed by an arm body is not a headed record pattern; see [record-pattern boundaries](records.md#no-construction-shaped-record-patterns).

When distinguishing a particular nominal type is needed, use the existing explicit type test before destructuring:

```text
if person: Student and { years = age, } := person and years >= 18 {
    show_age(years)
}
```

In match, a record-pattern brace group is followed by a separate arm-body brace group:

```text
match student {
    { studentName = name, years = age, studentId = id, } {
        show_student(studentId, studentName, years)
    }
}
```

All fields are shown here to avoid selecting partial-field omission through an example. Positional constructor-family examples below remain schema proposals, not a requirement to write a type head on the selected named form. Omission, field/position mixing, duplicate source-field selection, and complete grammar remain open.

The proposed same-name shorthand `{ name, age } := user` would expand to `{ name = name, age = age } := user`. It does not require a type name and does not turn bare entries into value tests. Its grammar, field omission, and `_` field-entry behavior remain proposals; see [record shorthand](records.md#proposed-same-name-field-shorthand).

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
User(first: Int, == outVal) if first >= minimum { accept(first) }
```

This is an arm fragment assuming the User schema, compatible comparisons, and additional coverage as needed. The typed binding reuses the selected type-match-plus-bind form; the comparison is an ordinary Boolean guard.

## When to prefer each form

Named fields identify the selected components directly and do not depend on positional order. Positional subpatterns are concise for types that deliberately expose a small stable order. Both can reuse the same underlying primitive patterns; allowing one must not change the meaning of bare identifiers in the other.

Recommendation: permit both only with explicit field/schema contracts. Keep positional components as ordinary subpatterns and treat named field constraints as field selection followed by a subpattern. Named clauses now use destination pattern = sourceField, with field == expected and typed same-name field: Type conveniences. Named braces infer their shape from the source; complete field/schema contracts remain open.

## Remaining decisions

- Record/type patterns versus enum payload constructors, and how the matching schema is declared.
- Full named-pattern productions and schema rules, preserving inferred braces, destination-first routing, and typed shorthand.
- Whether named and positional forms may mix; no mixing rule is selected by these examples.
- Omitted fields, exact positional arity, and rest capture; do not silently assume partial or exhaustive field extraction.
- Duplicate source-field selection, unknown fields, visibility, extraction effects, ownership, and writable access.

The selected pattern binding order and branch scope still apply. Field selectors are not bindings. Selected field subpatterns introduce bindings in written pattern order, not physical record order. Semantic equality and extraction effects retain their separate open contracts.

## Related concepts

- [Pattern primitives](pattern-bindings-and-tests.md)
- [Field aliases and binding names](pattern-aliases.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Match capabilities](match-patterns.md) and [pattern context review](pattern-contexts.md)
