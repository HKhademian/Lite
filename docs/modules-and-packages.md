# Modules and packages

Status: **required capability; organization and commands are working proposals**.

## Purpose

Support a single-file first lesson and a path to reusable, explicitly versioned libraries without requiring students to learn packaging before writing a program.

## Intended experience

```text
lite run lesson.lite
lite build lesson.lite
```

These are proposed commands and a proposed extension; no tool exists in this workspace.

One file should run without a manifest or handwritten entry function. A package can add metadata, dependencies, exports, and an entry point as it grows.

## Import sketch

```text
import std.fs;
import school.students.{Student, find_student};
```

This is working notation from the initial discussion, not a settled grammar. Explicit imports and exports are the intended direction. Re-exports should be deliberate.

The braces in the import-list sketch group imported names; they are not a block body. This ordinary import item keeps its separator. The ban on semicolons after complete block constructs does not apply merely because an item ends in `}`.

## Visibility

Declarations should expose less by default. A private module-level declaration and private record fields were recommended defaults. The exact visibility boundary, modifier syntax, and use of `pub` need to be aligned with uniform definition bindings.

For example, `pub name := fn(...) { ... }` is a possible future shape, not an accepted declaration form in this snapshot.

## Package contents

The proposal includes a manifest for metadata and dependency declarations, a lockfile for exact resolved versions, and file-based modules. Manifest format, package identity, version constraints, registries, offline use, and reproducibility rules remain open.

Implicit arbitrary module initialization and package installation scripts were discouraged as defaults. This is a design preference, not implemented enforcement.

## Prelude

A small predefined environment could contain basic types, basic collections, `Option`, `Result`, and convenient output. Filesystem, networking, and larger libraries would require explicit imports. The effect and error contract of even convenient output must eventually be specified.

## Open decisions

Module path resolution; cycles; declaration resolution across files; initialization order; interface files; binary versus source packages; target-specific dependencies; C interoperability; package authenticity; and the stable public API policy.

## Related concepts and references

- [Visibility](visibility.md)
- [Functions](functions.md)
- [Tooling and learning](tooling-and-learning.md)
- Packaging is primarily a local design requirement. See [references](references.md) for the language comparisons already discussed; no external package manager is adopted by this file.
