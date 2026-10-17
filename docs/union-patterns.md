# Union type patterns and narrowing

Status: **type-pattern narrowing of success and error unions selected; complete pattern spelling, match-arm grammar, overlap, and ownership rules open**.

## Purpose

Let a programmer distinguish a union's active alternative by its type and use that alternative's fields and operations with static checking. The same capability applies to successful payloads, recoverable error payloads, and unions formed by recovery fallbacks.

## Union template

```text
(User | Guest) ! (ReadError | ParseError)
```

The success payload is one `User` or `Guest`; the failure payload is one `ReadError` or `ParseError`. These are alternative values, not tuples containing every member. A pattern observes the active alternative without reconstructing it from a message or a field-name convention.

## Working type-pattern spelling

```text
binding: Type
```

This reuses the language's colon type-annotation direction. The type-pattern capability is selected; this exact production and its integration with declarations and `if let` remain illustrative, not a finalized grammar.

## Narrowing a success union

Assume `lookup(id)` returns the outcome type above:

```text
person := lookup(id)!;

if let user: User = person {
    greet_user(user)
} else if let guest: Guest = person {
    greet_guest(guest)
}
```

`person` retains type `User | Guest`. The first branch introduces a `User` binding only if that alternative is active; the second introduces a `Guest` binding only if that alternative is active. A successful type pattern supplies a statically narrowed value without a separate unchecked cast. Patterns and fallible extraction do not grant extra mutation or access permissions.

The example uses existing illustrative `if let` notation. It does not select `let` as a new general declaration keyword or finalize a new expression grammar.

## Narrowing an error union

Inside a recovery receiver, only the error payload is being matched:

```text
person := lookup(id) else(error) {
    if let read: ReadError = error {
        report_read_error(read)
    } else if let parse: ParseError = error {
        report_parse_error(parse)
    }

    guest_user()
}
```

The receiver's static type is `ReadError | ParseError`. A matching branch can access that error type's structured payload. The handler still needs to supply its normal fallback or explicitly exit. Type matching does not automatically propagate, swallow, or retry an error.

Several cases inside the same concrete error type still need case/variant or payload patterns. A type pattern distinguishes types; it cannot distinguish two values solely because their error messages differ.

## Intact outcomes preserve their success/failure distinction

An intact Result has an outer success/failure distinction. First match that distinction or use the selected `!` or `else` operations, then narrow the relevant payload union.

The distinction matters when success and error types overlap. `Error ! Error` can succeed with an Error value as ordinary data or fail with an Error value. A payload type test for `Error` alone cannot identify which occurred. Type patterns must not erase the outer outcome tag or assume every Error-typed value is a failure.

The success-pattern spelling for a stored Result remains open. Existing `Err(...)` illustrations describe failure patterns; removing mandatory success constructors does not settle the name of a success pattern.

## Match expressions and coverage

The same type patterns should work in general `match` arms. A value-producing match over a closed union is intended to cover every possible alternative or use a suitable fallback. Merely inspecting one alternative in an action conditional does not require providing a replacement value for the others.

A narrowed binding exists only where its pattern matched. The producer is evaluated once; matching does not repeat a function call. Exact coverage for guarded patterns, overlapping type relationships, and open interfaces remains to be formalized. The general `Error` contract still needs its own definition; selecting union patterns does not finalize that contract as an open interface.

## Open decisions

- Complete the `binding: Type` pattern spelling and its conditional syntax.
- Choose match-arm delimiters and common fallback patterns.
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
