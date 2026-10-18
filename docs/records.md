# Records

Status: **record declaration keyword, typed fields, = initialization, and named field-pattern operators selected; outer construction/pattern wrappers, type identity, and memory semantics remain open**.

## Purpose

Combine named fields in one value. A record contains all its fields together; an enum instead selects one case.

## Template

```text
Name := record {
    field: Type;
}
```

The uniform binding names the record type. The declaration body lists fields; it is not an executable block with a final-expression result. Ordinary field separators follow the lexical rules: a final separator inside the body and a trailing semicolon after the complete declaration are optional and allowed.

## Example

```text
Student := record {
    name: String;
    grade: Int;
}
```

Student names the record type, name is a String field, and grade is an Int field. This replaces the earlier `Student := type { ... }` record sketch. It does not choose the use of type for aliases or other type definitions.

## Field values and named patterns

Declared fields use field: Type. Supplying a predefined field's value uses field = expression. Matching routes that field's component with field = pattern:

```text
/* Fragments only; the outer construction/pattern spelling is open. */
{ name = "Ali", grade = 12 }           /* initialization */
{ name = studentName, grade == 12 }    /* bind name; compare grade */
{ grade: Int }                        /* bind grade with Int constraint */
{ grade = : Int }                     /* type test only */
```

Initialization is not reassignment through an existing binding. Named matching reuses the ordinary subpatterns, including nested records, tuples, cases, and typed bindings. See [aggregate clauses](aggregate-patterns.md#named-field-clauses). The wrapper, field omission, defaults, and construction/type inference remain separate decisions.

## Access and composition

Records support the composition-first direction: fields can contain other data types, and interfaces describe behavior. Declaration and field visibility follow the minimal-exposure goal; their modifier syntax remains open. Binding reassignment and writable held-data access remain independent var/mut capabilities.

## Open decisions

- Constructor and initialization syntax, defaults, and field order.
- Nominal versus structural identity and generic declarations.
- Field visibility/accessor syntax and any per-field mutation rules.
- Public matching schemas and named/positional destructuring.
- Generated equality, hashing, formatting, and copy operations.
- Ownership, borrowing, reference identity, storage, and layout.

Selecting record does not independently choose those contracts.

## Related concepts and references

- [Type categories](type-categories.md): product shape versus generated operations and storage semantics.
- [Reference-language comparison](type-categories-comparison.md): structs, records, and data/case classes.
- [Composition and interfaces](composition-and-interfaces.md), [mutability](mutability.md), and [aggregate patterns](aggregate-patterns.md).
