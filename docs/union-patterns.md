# Union type patterns and narrowing

Status: **type-pattern narrowing of success and error unions selected; basic pattern and match-arm forms selected; overlap, coverage, and ownership rules open**.

## Purpose

Let a programmer distinguish a union's active alternative by its type and use that alternative's fields and operations with static checking. The same capability applies to successful payloads, recoverable error payloads, and unions formed by recovery fallbacks.

## Union template

```text
(User | Guest) ! (ReadError | ParseError)
```

The success payload is one `User` or `Guest`; the failure payload is one `ReadError` or `ParseError`. These are alternative values, not tuples containing every member. A pattern observes the active alternative without reconstructing it from a message or a field-name convention.

## Selected type-pattern spelling

```text
binding: Type
```

This reuses the language's colon type annotation. In a conditional, write `if binding: Type = expression { ... }`; in a match arm, write `binding: Type { ... }`. These surface forms are selected; the complete pattern grammar remains open.

Type patterns also compose inside destructuring: `(x: Int, y: String)` tests and narrows both tuple components in one pattern. Constructor payload patterns may contain these typed component patterns too; no nested selection construct is required solely for component type tests. See [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule).

## Narrowing without redeclaration

For an existing union binding, use `if person: User { ... }` when no new name is needed. This is a type test of that name, not a pattern that creates a shadow binding. The existing value is usable as User while its refinement is valid. The explicit binding forms below remain useful and selected. Stability, mutation, and broader flow rules are tracked in [type tests and narrowing](type-tests-and-narrowing.md).

## Narrowing a success union with explicit bindings

Assume `lookup(id)` returns the outcome type above:

```text
person := lookup(id)!;

if person: User = person {
    greet_user(person)
} else if guest: Guest = person {
    greet_guest(guest)
}
```

The outer `person` retains type `User | Guest`. In `if person: User = person`, the right-hand `person` resolves to that outer binding before the pattern introduces its branch-local name. The matching first branch shadows it with a `User` binding. The second condition again reads the outer union and introduces a differently named `Guest` binding, demonstrating both naming choices.

The shadow does not leak into sibling branches or outside the conditional. After the branch, name lookup again selects the outer union binding. This is a new narrowed binding, not reassignment or a change to the outer binding's static type. Whether matching borrows, copies, or moves the payload remains an ownership decision; shadowing alone does not guarantee later availability of a moved value.

A successful type pattern supplies a statically narrowed value without a separate unchecked cast. Patterns and fallible extraction do not grant extra mutation or access permissions.

Conditional binding reuses declaration-shaped headers without adding a `let` keyword. Refutable matching is permitted here; ordinary declarations require irrefutable patterns for their input type.

## Narrowing an error union

Inside a recovery receiver, only the error payload is being matched:

```text
person := lookup(id) else(error) {
    if error: ReadError = error {
        report_read_error(error)
    } else if parse: ParseError = error {
        report_parse_error(parse)
    }

    guest_user()
}
```

The receiver's static type is `ReadError | ParseError`. The first branch shadows `error` with a narrowed `ReadError` binding. The second condition reads the original receiver and binds a `ParseError` as `parse`. A matching branch can access that error type's structured payload. The handler still needs to supply its normal fallback or explicitly exit. Type matching does not automatically propagate, swallow, or retry an error.

Several cases inside the same concrete error type still need case/variant or payload patterns. A type pattern distinguishes types; it cannot distinguish two values solely because their error messages differ.

## Intact outcomes preserve their success/failure distinction

An intact Result has an outer success/failure distinction. First match that distinction or use the selected `!` or `else` operations, then narrow the relevant payload union.

The distinction matters when success and error types overlap. `Error ! Error` can succeed with an Error value as ordinary data or fail with an Error value. A payload type test for `Error` alone cannot identify which occurred. Type patterns must not erase the outer outcome tag or assume every Error-typed value is a failure.

The success-pattern spelling for a stored Result remains open. Existing `Err(...)` illustrations describe failure patterns; removing mandatory success constructors does not settle the name of a success pattern.

## Match expressions and coverage

The same type patterns should work in general `match` arms. A value-producing match over a closed union is intended to cover every possible alternative or use a suitable fallback. Merely inspecting one alternative in an action conditional does not require providing a replacement value for the others.

A narrowed binding exists only where its pattern matched. The producer is evaluated once; matching does not repeat a function call. Exact coverage for guarded patterns, overlapping type relationships, and open interfaces remains to be formalized. The general `Error` contract still needs its own definition; selecting union patterns does not finalize that contract as an open interface.

## Open decisions

- Complete nested pattern productions and choose common fallback patterns.
- Define exact type identity versus subtype matching, overlap, ordering, and unreachable arms.
- Define nested type/variant/record patterns and alternatives within one arm.
- Specify borrowing, copying, moves, and narrowed binding capabilities.
- Define exhaustive coverage for closed unions and fallback requirements for open Error contracts.

## Related concepts

- [Match and exhaustive selection](match.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Conditionals](conditionals.md)
- [Result and errors](result-and-errors.md)
- [Recovery receivers and fallback types](recovery-and-fallbacks.md)
- [Fallible types and error composition](fallible-types-and-error-composition.md)
