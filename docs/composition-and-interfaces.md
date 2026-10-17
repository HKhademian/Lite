# Composition and interfaces

Status: **composition-first goal established; declaration and implementation details proposed**.

## Purpose

Build reusable programs around owned data and explicitly supplied behavior, with interfaces and composition as the primary alternative to class inheritance.

## Record template

```text
Student := type {
    name: String;
    progress: Progress
}
```

This is working notation. Constructor syntax, accessors, and field visibility grammar are not finalized.

## Intended rules

- Prefer composed fields over superclass state.
- Interfaces describe required behavior.
- Implementation should be explicit.
- Generic constraints should allow static dispatch where possible.
- Dynamic interface dispatch should be an explicit capability or value representation.
- Fields and declarations should expose less by default; visibility is expanded deliberately.
- Mutation through parameters should require an explicit contract.

## Interface and implementation sketch

Earlier sketches used `interface Named { ... }` and `impl Named for Student { ... }`. The later uniform-binding direction means their exact forms must be reconsidered rather than copied as final grammar.

An interface conceptually requires a name-producing function; a `Student` implementation satisfies it using its own data. Whether receiver syntax is `self`, a named parameter, or another form remains open.

## Reuse mechanisms

Composed fields, interface default behavior, and explicit delegation were recommended as initial mechanisms. Unrestricted mixins were deferred because they need rules for conflicting methods, hidden state, and initialization order.

Modifiers may express visibility, mutation, effects, or dispatch, but their actual set and spelling are not selected.

## Classes

Uniform bindings could support `Name := class { ... }` if classes are introduced. This is not a decision to add inheritance or classes to the initial language. A class or identity-bearing reference type must justify semantics not already covered by records, interfaces, and explicit ownership.

## Open decisions

Nominal identity, structural conformance, interface coherence, orphan-style implementation rules, associated types, delegation syntax, default method conflicts, field privacy, construction, and reference identity remain open.

## Related concepts and references

- [Declarations and assignment](declarations-and-assignment.md)
- [Types and inference](types-and-inference.md)
- [Memory and performance](memory-and-performance.md)
- [Swift value and reference types](https://www.swift.org/documentation/articles/value-and-reference-types.html) is a useful comparison for local reasoning and composed values, not an adopted ARC or class model.
