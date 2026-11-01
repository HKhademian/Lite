# Strings

Status: **multiline strings and adjacent literal joining requested; detailed literal grammar open**.

## Purpose

Allow readable text without making source-code indentation or line breaks determine executable structure.

## Templates

```text
message := "Hello";
message := "Hello, " "world";
```

## Adjacent literal joining

Adjacent string literal tokens concatenate without inserting whitespace:

```text
message := "Hello, "
           "world";
```

is equivalent to:

```text
message := "Hello, world";
```

The join applies to literal tokens, not arbitrary adjacent expressions. Use an explicit operation for computed strings:

```text
message := prefix + name;
```

A semicolon separates items, so these are two expression items, not one joined literal:

```text
"Hello"; "world"
```

## Multiline contents

```text
message := "Hello,
world";
```

The newline inside the quotes is data. The working direction preserves literal contents exactly; indentation is not automatically removed. The formatter must not alter the data when formatting surrounding code.

## Notes

The next [focused FVP review](../investigations/INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31)
records the explicit acceptance of textLength/textAt/textSlice as temporary
positional code-point helpers with terminal bounds faults. This review does not settle ordinary String indexing, graphemes,
normalization, native representation or the deferred complete text profile.

String literal patterns test the whole string through its ordinary equality contract. Existing text uses == expectedText. Neither spelling implies regex, substring, case-folding, or normalization operations. Unicode equality details remain a String contract, not a special pattern conversion.

The [pattern review](pattern-type-review.md#8-strings-and-characterbyte-views) recommends explicit byte/scalar/grapheme views before sequence matching. A proposed [list pattern](sequence-patterns.md) must not silently choose one text unit or treat every string as a list.

Whitespace outside literals can move freely without changing executable structure. Whitespace inside literals is part of the value. These are separate rules, not an exception that makes indentation structural.

## Open decisions

- Exact escape sequences and raw-string syntax.
- Interpolation syntax, if any.
- Unicode model, indexing, and normalization.
- Whether physical line endings are normalized when reading source.
- String ownership, slicing, and allocation behavior.
- How adjacent literals with different encodings or future literal prefixes interact.

## Approved temporary igniter coverage

The user explicitly approves the exact temporary positional code-point helpers
on 2026-10-31 after the consent correction and focused review. Acceptance comes
from that reply, not the earlier implementation/tag. See
[INV-016 approval and evidence](../investigations/INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

Implementation increment, **2026-10-30**: the
[igniter](../igniter/README.md#temporary-text-operations) now executes computed
String + String concatenation, plus temporary textLength/textAt/textSlice helpers
for a small Lite-written arithmetic tokenizer. The helpers consistently use
zero-based code-point positions and half-open slices, without normalization;
invalid bounds raise a terminal BoundPanic. Code points are materialized on each
helper call, so these operations do not promise constant-time access or a native
representation. This records disposable host behavior, not a language-wide
String indexing/character/slicing policy. The detailed FVP text-profile proposal
remains deferred; [INV-016 evidence](../investigations/INV-016-igniter-text-operations.md)
records exact coverage and limitations.

The restricted compiler's TS path now accepts the same three helpers as checked
calls and emits self-contained code-point helpers: `textLength` returns an Int,
`textAt` a one-code-point String and `textSlice` a half-open String, with the
same zero-based positions and terminal `BoundPanic` bounds faults as the
igniter. The C path rejects them clearly for now. This changes no language
policy: graphemes, normalization, generic String indexing and native
representation remain open.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Memory and performance](memory-and-performance.md)
- Adjacent literal joining was requested as a C-style convenience; no complete C string or encoding semantics are adopted by this note.
