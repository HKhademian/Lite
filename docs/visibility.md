# Visibility and capability defaults

Status: **minimal exposure established as a goal; exact modifier grammar open**.

## Purpose

Declarations and values should expose less until a programmer explicitly supplies broader abilities. This principle applies to public APIs, mutable access, dynamic dispatch, and potentially effects.

## Initial visibility direction

Module-private declarations and type-private fields were proposed as defaults. Public exports require explicit syntax. The precise privacy unit and modifier placement are not yet settled.

## Conceptual template

```text
name := definition;
public_modifier name := definition;
```

The placeholder `public_modifier` is not a keyword proposal. `pub` was used in early sketches but needs alignment with uniform definitions before it is normative.

## Established mutability example

```text
limit := 10;
var attempts := 0;
attempts += 1;
```

Immutability is the default. `var` explicitly expands a binding's reassignment capability; it does not make its type dynamic. Whether immutable bindings imply deep immutability depends on the unchosen reference and ownership model.

## Other candidate explicit capabilities

Mutation through a function parameter, dynamic interface dispatch, unsafe operations, shared ownership, and ambient I/O were discussed as areas where deliberate opt-in may be useful. Their keywords, type effects, and defaults are not settled and must not be inferred from this general principle.

## Open decisions

Export syntax, private field access, friend-like access, package visibility, re-exports, effect annotations, capability passing, and interaction with generic interfaces.

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Composition and interfaces](composition-and-interfaces.md)
- [Modules and packages](modules-and-packages.md)
- This document records the project's design principle. External language visibility systems in [references](references.md) are comparison material, not an adopted modifier set.
