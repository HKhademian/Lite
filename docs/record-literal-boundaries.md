# Record construction and item boundaries

Status: **record construction ends an item without a semicolon, 2026-10-19**. Standalone inferred record literals are requested; their disambiguation and inferred type identity still need a decision.

## Established construction forms

```text
x: User = {}
y := User {}
```

Each complete record initializer closes its declaration item. A trailing semicolon is optional and allowed. Newlines are irrelevant: x: User = {} y := User {} is the same pair of declarations. An assignment or explicit exit ending in the same outer construction follows the same boundary rule.

This applies to field declarations with record defaults as well:

```text
Registration := record {
    student: Student = {}
    contact: Contact = {}
}
```

These are field declarations, whose full default grammar is still being formalized. In a construction expression, supplied fields are comma-separated instead:

```text
registration := Registration {
    student = {},
    contact = {},
}
```

The inner braces do not remove the comma separating student from contact. Similarly, braces inside a call or grouping do not end the enclosing expression. To continue the value of a complete outer record construction, group it:

```text
name := (User { name = "Ali", }).name;
```

## Requested inferred inline form

```text
x := { a = 1, b = 2 }
```

The intended result is a record with inferred field types, not a lookup of an existing named type by field shape. Closing its construction would end the declaration just like the named/contextual forms. Its inferred nominal identity and behavior in generic instantiations remain open; it must not implicitly relax the selected distinct-per-declaration record rule.

The remaining issue is brace classification, independently of separators between outer items:

```text
x := { a = 1 }
```

This already admits an executable-block reading: assign an existing writable a, then produce Unit. A record reading would instead supply a field called a. Whitespace, capitalization, and whichever reading type-checks must not decide between them.

One possible syntactic rule is to require a comma to identify a standalone inferred record: { a = 1, } is a one-field literal, while { a = 1 } remains an executable block. The requested multi-field example already contains that distinguishing comma. This is a proposal, not a selected requirement; record-value markers or another explicit literal context are alternatives. Do not silently introduce mandatory trailing commas through the formatter.

## Empty braces keep their established roles

- user: User = {} constructs declared defaults in a record-initializer position.
- fn() {} and an empty match-arm body remain executable and produce Unit.
- Without a record-initializer context, point := {} retains the established executable-block meaning; it cannot simultaneously infer an empty record.

The block/result rule and construction/default rule therefore remain distinct, even though both complete forms can end an outer item at their closing brace.

Related: [records](records.md), [initialization](record-initialization.md), [lexical structure](lexical-structure.md), [blocks and results](blocks-and-results.md), and [record identity](record-type-identity.md).
