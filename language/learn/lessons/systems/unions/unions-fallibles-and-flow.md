# Plain Unions, Definite Initialization & Fallible `T!` Pipelines

Combine normalized `A | B` value unions, `Bool`-correlated definite initialization (`= ?`), custom `ToError` domain errors, postfix `!` propagation, and `else(err)` local recovery.

## Walkthrough

1. `Token := alias Int | String;` normalizes the union members; `match tok` narrows `n: Int` and `s: String` exhaustively.
2. `lim: Int = ?;` is proven initialized before returning because immutable predicate `useDefault` covers both `if useDefault` and `if not useDefault`.
3. `ConfigErr` implements `core/error.ToError`, allowing `parsePort(...)!` inside `loadBanner(...): String!` to convert and propagate `ConfigErr` into unified `Error` automatically.
4. `loadBanner(44) else(e) { ... }` recovers from the error locally without extra boilerplate.

## Try Modifying This

1. Add a `Bool` alternative to `Token` and extend `formatTok` with a `: Bool` arm.
2. Change `pickLimit` to omit the `if not useDefault` branch and inspect the compiler's definite-initialization diagnostic.

See [Handbook: Unions, Fallibles & Errors](lite://handbook/unions-fallibles-and-errors), [Union Normalization](lite://doc/union-normalization), and [Fallible Types & Error Composition](lite://doc/fallible-types-and-error-composition).
