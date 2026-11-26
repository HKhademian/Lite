# Record construction and item boundaries

Status: **historical and compatibility links**.

## Established construction forms

See [record construction and item boundaries](lite://doc/record-initialization#established-construction-forms).

## Contextual record literals and executable blocks

See [contextual record literals](lite://doc/record-initialization#contextual-record-literals)
and [standalone executable blocks](lite://doc/blocks-and-results#standalone-executable-blocks).

## Earlier anonymous record sketch

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

## Empty braces in the existing grammar

- user: User = {} constructs declared defaults in a record-initializer position.
- fn() {} and an empty match-arm body remain executable and produce Unit.
- Without a record-initializer context, point := {} retains the established executable-block meaning; it cannot simultaneously infer an empty record.

The block/result rule and construction/default rule therefore remain distinct, even though both complete forms can end an outer item at their closing brace.

Related: [records](lite://doc/records), [initialization](lite://doc/record-initialization), [lexical structure](lite://doc/lexical-structure), [blocks and results](lite://doc/blocks-and-results), and [record identity](lite://doc/record-type-identity).
