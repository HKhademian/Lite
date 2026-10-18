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

Named pattern braces get their shape from the source contract; they do not instantiate a type or alter nominal identity. There is no type-name prefix in the selected named-record pattern grammar. To distinguish a particular nominal type, use an explicit type test before deconstruction. See [aggregate clauses](aggregate-patterns.md#named-field-clauses).

### No construction-shaped record patterns

Keep `TypeName { ... }` for construction expressions, not as an alternative named-record deconstruction form. The same rule applies recursively to nested records. Known source types do not need to be written again, and field extraction must not silently add a nominal type test. Explicit tests keep the existing `: Type` spelling:

```text
/* Known source contract: extract its fields. */
{ studentName = name, studentGrade = grade, } := student;

/* Broader input: test the type before extracting. */
if person: Student and {
    studentName = name,
    studentGrade = grade,
} := person {
    show_student(studentName, studentGrade)
}

/* Rejected as a named-record declaration pattern. */
Student { studentName = name, studentGrade = grade, } := student;
```

This restriction concerns record-pattern productions. It cannot ban every identifier followed by braces: in `match person { Student {} }`, bare Student is an ordinary binding name and the following braces are its empty arm body. That is not a Student type test or record deconstruction. Do not use capitalization or lookup of an outer type to change that binding meaning. Enum-case selectors such as `.Some(...)` still test a case and are unaffected; positional constructor-family patterns remain separate schema/type-test proposals.

### Proposed same-name field shorthand

The proposed `{ name, age } := user` is coherent: each bare field entry expands to `name = name` or `age = age` within a record pattern. The left occurrence binds and the right occurrence selects the source field, independently of outer variables with those names. The whole right-hand source is resolved before the new bindings. Types follow the source contract; no type-name prefix is needed.

This shorthand is not yet added to the selected grammar. It needs field-presence and omission rules, the same visibility/ownership rules as explicit clauses, and a decision about bare `_`: an ordinary field entry would select a field actually named _, rather than skip an arbitrary source field. Explicit `_ = age` already binds age under the unused-allowed name.

Removing record from the declaration is a separate proposal. `User := { name: String; age: Int; }` would make braces introduce a type as well as executable blocks and contextual data. Nonempty type-only field entries could potentially distinguish that form syntactically, but empty `{}` already means a Unit-valued block, and future field defaults can resemble ordinary typed declarations. Retain `User := record { ... }` until an explicit grammar settles those cases; do not choose by capitalization or whichever interpretation type-checks.

An explicit type position is a narrower case: the proposed `stats: { points: Int; level: Int = 1; };` can omit record because colon already requires a type. This is an unnamed record type, unlike braces in a record-value initializer or executable body. Its identity and full type grammar remain proposals; see [inline record types](record-initialization.md#6-unnamed-record-type-inside-a-record-proposal).

### Reference comparison and tradeoff

- Rust's struct-pattern grammar includes a path before its field braces. LiteScript deliberately keeps that type/constructor selection separate from its selected named-field extraction. Source: [Rust struct patterns](https://doc.rust-lang.org/reference/patterns.html#struct-patterns).
- Dart object patterns include a named type and test it before extracting properties. This is useful for nominal selection; LiteScript already has explicit colon type tests for that job. Source: [Dart object patterns](https://dart.dev/language/pattern-types#object).
- Kotlin demonstrates destructuring without repeating the source type name, using component operations. That supports the usability direction, but does not supply LiteScript's named-field syntax or matching contract. Source: [Kotlin destructuring](https://kotlinlang.org/docs/destructuring-declarations.html).

Omitting the type name shortens known-type and deeply nested extraction. The cost is an extra explicit type test when nominal discrimination is intended. Field shape alone must not establish nominal identity, expose private fields, or introduce arbitrary runtime reflection. Broader-input field compatibility and missing-field behavior still need the shared pattern contract.

### Context and brace boundaries

Record shorthand requires a known expected record type, as in an annotated initializer or predefined nested field. A field initializer's right-hand side is an expression, while a deconstruction clause's right-hand side is a source-field selector. Their syntactic contexts decide these roles; moving data is always toward the left, with copy/move/borrow details left to the memory model.

Function/if/loop/match bodies remain executable blocks even when their expected result is a record; do not reinterpret a body as initialization. Empty contextual initialization is selected: `user: User = {};` creates a record using its declared-default construction policy, while an empty executable body still produces Unit. Full expression grammar must express these distinct roles, including single-field cases. Do not resolve ambiguous syntax by choosing whichever interpretation happens to type-check. Construction in other expected-type positions, exact inference propagation, omitted/default fields, and diagnostics still need a full contract.

## Access and composition

The [record creation and initialization overview](record-initialization.md) separates proposed contextual zero initialization with = 0 from declared-default construction with = {}, including selected empty contextual record initialization. Initializer omission remains an unresolved alternative. Field-default resolution and anonymous-type examples still need formalization; they do not silently complete this document's open initialization/type-identity contracts.

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
