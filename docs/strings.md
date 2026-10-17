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

A semicolon separates expressions, so this is not one joined literal:

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

Whitespace outside literals can move freely without changing executable structure. Whitespace inside literals is part of the value. These are separate rules, not an exception that makes indentation structural.

## Open decisions

- Exact escape sequences and raw-string syntax.
- Interpolation syntax, if any.
- Unicode model, indexing, and normalization.
- Whether physical line endings are normalized when reading source.
- String ownership, slicing, and allocation behavior.
- How adjacent literals with different encodings or future literal prefixes interact.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Memory and performance](memory-and-performance.md)
- Adjacent literal joining was requested as a C-style convenience; no complete C string or encoding semantics are adopted by this note.
