# Records

Status: **record declaration keyword and typed-field surface selected; construction, type identity, and memory semantics remain open**.

## Purpose

Combine named fields in one value. A record contains all its fields together; an enum instead selects one case.

## Template

```text
Name := record {
    field: Type;
}
```

The uniform binding names the record type. The declaration body lists fields; it is not an executable block with a final-expression result. Ordinary field separators follow the lexical rules: a final separator inside the body is allowed, while a separator after the complete declaration is rejected.

## Example

```text
Student := record {
    name: String;
    grade: Int;
}
```

Student names the record type, name is a String field, and grade is an Int field. This replaces the earlier `Student := type { ... }` record sketch. It does not choose the use of type for aliases or other type definitions.

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
