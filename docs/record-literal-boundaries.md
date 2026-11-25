# Record construction and item boundaries

Status: **record construction ends an item without a semicolon, 2026-10-19**. Contextual literals and `do` are the current design draft. Anonymous record identity remains open.

## Established construction forms

```text
x: User = {}
y := User {}
```

Each complete record initializer closes its declaration item. Omit the optional trailing semicolon, both at top level and in nested declarations. Newlines are irrelevant: x: User = {} y := User {} is the same pair of declarations. An assignment or explicit exit ending in the same outer construction follows the same boundary rule. The grammar still permits an optional semicolon; see the [shared style and required exceptions](lite://doc/lexical-structure#semicolon-style-after-closing-braces).

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

## Contextual record literals and executable blocks

Design draft **2026-11-26**. A standalone executable block expression uses
`do { ... }`. In expression position, bare `{ ... }` constructs a record
using a single known, constructible expected type. A named literal such as
`User { ... }` supplies that type directly. Constructs with their own body
headers, such as `fn`, `if`, and `loop`, retain their brace bodies.

`do` fills the same scoping role as an always-entered `if true { ... }` in
Mini. In Lite's draft, `do` enters its body unconditionally and produces
the body's ordinary block result. This gives a standalone block a visible
header without requiring a condition or an `else` for value use.

```text
user: User = { name = "Ali" };
saveUser({ name = "Ali" });
p = { x = 1 };
saveUser(do { loadUser() });
```

The parameter supplies `User` and the assignment target supplies `Point`
for `p`. The assignment constructs a fresh `Point`, fills omitted fields
from the type's defaults, and replaces `p`. Within `do { x = 1 }`, the
assignment updates the existing `x` and the block's result is `Unit`.

**Nested construction is required in the first version.** For example:

```text
saveUser({
    name = "Ali",
    address = {
        city = "Berlin",
        country = { code = "DE" },
    },
});
```

The parameter supplies `User`, the `address` field supplies `Address`,
and `country` supplies `Country`. Each level validates fields and applies
defaults for its own type. If a literal has no unique constructible record
type, point to those braces and require an explicit type there. Until
anonymous record identity is settled, `p := { x = 1 }` requires a type.

Pending TS and C11 cases include typed initializers, call arguments,
replacement of a previously nondefault field, nested defaults, ambiguous
or missing expected types, and an executable `do` argument with observable
effects. Recovery and cleanup attachment will be reviewed separately.

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
