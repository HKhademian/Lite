# Records

Status: **record declaration keyword, typed fields, = initialization, and named field-pattern operators selected; inferred named patterns and contextual construction selected; full inference, type identity, and memory semantics remain open**.

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

Declared fields use field: Type. Supplying their initial values uses field = expression. An explicit construction type is allowed, but can be omitted when the expected record type is uniquely known:

```text
student: Student = { name = "Ali", grade = 12, };
other := Student { name = "Sam", grade = 10, };
```

The same contextual rule applies to nested record fields. If Registration declares a Student-valued student field, `Registration { student = { ... }, ... }` need not repeat Student. Initialization does not require var merely because it uses =. No search through unrelated record types by field names is implied.

Deconstruction follows the same destination-from-source direction and needs no redundant type head:

```text
{ studentName = name, studentGrade = grade, } := student;
{ grade: Int, studentName = name, } := student;
```

The second pattern binds grade with an Int constraint. General clauses are destinationPattern = sourceField. Type-only testing uses { : Int = grade, }, equality can use { == expectedGrade = grade, } or the retained compact { grade == expectedGrade, }. A record-pattern clause is not an executable assignment statement, so `_ = grade` there introduces an unused-allowed binding rather than requiring an existing var _.

Named pattern braces get their shape from the source contract; they do not instantiate a type or alter nominal identity. To distinguish a particular nominal type, use an explicit type test before deconstruction. See [aggregate clauses](aggregate-patterns.md#named-field-clauses).

### Context and brace boundaries

Record shorthand requires a known expected record type, as in an annotated initializer or predefined nested field. A field initializer's right-hand side is an expression, while a deconstruction clause's right-hand side is a source-field selector. Their syntactic contexts decide these roles; moving data is always toward the left, with copy/move/borrow details left to the memory model.

Function/if/loop bodies remain executable blocks even when their expected result is a record; do not reinterpret a body as initialization. Full expression grammar must disambiguate contextual data braces from executable expression blocks, especially empty and single-field cases. Do not resolve ambiguous syntax by choosing whichever interpretation happens to type-check. Construction in other expected-type positions, exact inference propagation, omitted/default fields, and diagnostics still need a full contract.

## Access and composition

Records support the composition-first direction: fields can contain other data types, and interfaces describe behavior. Declaration and field visibility follow the minimal-exposure goal; their modifier syntax remains open. Binding reassignment and writable held-data access remain independent var/mut capabilities.

## Open decisions

- Complete contextual construction grammar/inference, defaults, required fields, and initialization order.
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
