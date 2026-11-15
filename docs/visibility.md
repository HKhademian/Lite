# Visibility and capability defaults

Status: **minimal exposure established as a goal; file block `pub` clarified 2026-11-15; exact modifier grammar open**.

## Purpose

Declarations and values should expose less until a programmer explicitly supplies broader abilities. This principle applies to public APIs, mutable access, dynamic dispatch, and potentially effects.

## Initial visibility direction

Clarified **2026-11-15**: a LiteLang source file is an invisible-brace root code block with **no parent block**, and `pub` is its sole structural difference from an inner braced `{ ... }` block (which cannot be imported as a namespace). Declarations in a module/file block are private by default and type fields are private by default; `pub` exposes chosen top-level symbols (`fn`, `type`, `var`, `mut`, immutable values) across the file boundary. Exposing `pub var` or `pub mut` is valid in the design (keeping state private and exposing `pub` getter/setter helpers remains a common alternative; the current generated TS compiler exposes `pub` functions, types, and immutable scalar values). Detailed privacy units, modifier placement, and export contracts remain to be finalized.

## Conceptual template

```text
name := definition;
public_modifier name := definition;
```

The placeholder `public_modifier` is not a keyword proposal. `pub` is used in current compiler/library sources and design discussions while its complete alignment with records, types, and `var`/`mut` exports is finished.

## Established mutability example

```text
limit := 10;
var attempts := 0;
attempts += 1;
```

Bindings are fixed and provide read-only access by default. `var` permits reassignment; `mut` permits held-data updates through the binding; `var mut` permits both. Writable receiver/parameter access requires `mut` on each affected binding, without an additional function-level mutation marker. Full method notation and ownership rules remain open. These capabilities do not make the value type dynamic, override field privacy, or promise global deep immutability. See [mutability, access, and operations](mutability.md).

## Other candidate explicit capabilities

Mutation through a function parameter, dynamic interface dispatch, unsafe operations, shared ownership, and ambient I/O were discussed as areas where deliberate opt-in may be useful. Their keywords, type effects, and defaults are not settled and must not be inferred from this general principle.

## Open decisions

Export syntax, private field access, friend-like access, package visibility, re-exports, effect annotations, capability passing, and interaction with generic interfaces.

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Composition and interfaces](composition-and-interfaces.md)
- [Modules and packages](modules-and-packages.md)
- This document records the project's design principle. External language visibility systems in [references](references.md) are comparison material, not an adopted modifier set.
