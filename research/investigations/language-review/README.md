# Language review: ten foundational areas

Status: **initial review in progress, 2026-11-15**. This is a non-normative
investigation for the joint, one-at-a-time review. Current selections remain the
baseline until explicitly revised; initial judgments are starting hypotheses,
not approval, implementation evidence, or a substitute for concrete decisions.
The latest source and owning pages must be rechecked when each discussion starts.

Work through the areas in this order. Each review keeps five stable subtopics,
records baseline evidence, concrete probes, tradeoffs, open questions, and links
to related areas. When a discussion exposes a cross-topic issue, record it at the
owning topic and return to the active question; bring a prerequisite forward only
when needed. Each initial review is intentionally broad and does not claim to
resolve every edge case. No item below is acceptance of a recommendation.

1. **Core types and values**: 1.1 primitives and literals; 1.2 identity and distinct types; 1.3 tuples, records, and arrays; 1.4 inference and conversion; 1.5 unions and value operations.
2. **Bindings, mutation, and lifetime**: 2.1 scope and symbols; 2.2 bindings and assignment; 2.3 `var` and `mut`; 2.4 initialization; 2.5 copies, references, and lifetimes.
3. **Records**: 3.1 declaration and identity; 3.2 fields and visibility; 3.3 construction; 3.4 defaults and zero; 3.5 value behavior.
4. **Enums and variants**: 4.1 definition and identity; 4.2 cases and payloads; 4.3 construction and access; 4.4 matching and coverage; 4.5 value behavior and zero.
5. **Functions and calls**: 5.1 definitions and signatures; 5.2 calls and arguments; 5.3 function values; 5.4 surrounding state; 5.5 callable compatibility.
6. **Control flow and patterns**: 6.1 blocks and execution order; 6.2 conditionals; 6.3 matching and patterns; 6.4 loops; 6.5 control transfers.
7. **Collections**: 7.1 collection families; 7.2 construction and inference; 7.3 access and mutation; 7.4 iteration; 7.5 storage, copies, and views.
8. **Errors, panics, and cleanup**: 8.1 failure categories; 8.2 function contracts; 8.3 propagation; 8.4 handling and recovery; 8.5 cleanup.
9. **Modules and public APIs**: 9.1 files and modules; 9.2 imports and namespaces; 9.3 visibility; 9.4 initialization; 9.5 packages and projects.
10. **Generics and compile-time evaluation**: 10.1 type parameters; 10.2 compile-time value parameters; 10.3 requirements and inference; 10.4 compile-time execution; 10.5 build-time effects.

## Review notes

The following notes are recorded as provisional starting points:

- [1. Core types and values](01-core-types.md)

- [2. Bindings, mutation, and lifetime](02-bindings.md)

- [3. Records](03-records.md)

- [4. Enums and variants](04-enums.md)

- [5. Functions and calls](05-functions.md)

- [6. Control flow and patterns](06-control-flow.md)

- [7. Collections](07-collections.md)

- [8. Errors, panics, and cleanup](08-failure-cleanup.md)

- [9. Modules and public APIs](09-modules.md)

## Starting context

- [Language specification map](../../../docs/spec/README.md) distinguishes selected language rules from open areas and limited implementation.
- [Investigation catalog](../README.md) explains the consent, evidence, and atomic-commit rules.
- [Records and labeled tuples](../../../docs/records.md#records-and-labeled-tuples) records the recent field-oriented record direction.
- Distinct `UserID := distinct String` and `UserData := distinct (name: String, age: Int)` are directions under discussion. The user favors two-way distinctness, while conversion boundaries, typed declarations, literal context, type calls, and cast syntax need review. No general distinct-type contract is selected by this note.
- No-copy read-only access, writable access, and callback state interaction remain open. An optimization preserving value-copy behavior is not a guarantee of no copy.
