# Missing conditional else with a union result

Status: **selected 2026-10-21; narrowed 2026-10-25: a no-`else` conditional is noncontributing. A declaration initializer with a multi-member union still requires an explicit `else` or `?` branch because its default `zero(T)` cannot choose a member. Assignment and loop no-match paths do not require a union member.**

## Rejected union declaration initializer

```text
value := if number_mode {
    7
} else if text_mode {
    "ready"
}
```

Normally completing branches infer Int | String. No match is noncontributing, but the declaration's default would be `zero(Int | String)`, which cannot choose an active member. The declaration is therefore rejected; add an explicit fallback or an explicit `?` reservation. This is not an implicit conditional zero.

## Selected rule

Require an explicit `else` or `?` when a declaration initializer's conditional result `T` is a normalized multi-member plain union and selection can normally complete without a contributor. Do not choose a leftmost/canonical member, create an empty union, add Unit/Option, or introduce a runtime panic.

```text
value := if number_mode {
    7
} else if text_mode {
    "ready"
} else {
    "idle"
}
/* Int | String; every normal path supplies a member */
```

The explicit fallback can also exit to an outer target, so no union value is required on that path. An explicit `?` branch reserves the declaration on no match rather than selecting a member. Detailed proofs that conditions without a final else cover all normal possibilities remain a separate coverage-analysis question.

The rule applies to declaration initializers, not to every conditional. In an assignment, no match performs no write and needs no union member. In a loop body, no match contributes nothing and needs no union member. The conditional's resolved `T` still must not be silently narrowed to one member.

## Preserve single-type behavior

```text
number := if ready { 7 }
/* Int; false path leaves the declaration default zero(Int) */
```

A conditional with established Option<User> can leave the declaration default `.None` on no match; no-contributor inference still defaults to Unit unless context constrains it. These are declaration defaults, not conditional zero results. They are not general multi-member plain-union member selection.

An explicit empty final else contributes Unit under selected branch inference. It is a real branch value, not an automatically inserted absent value. A final else whose body returns a concrete member keeps the inferred union of the actual completion types.

## Result storage and then

The earlier description of every conditional starting at zero(T) before selection is superseded: a total conditional selects and constructs the normal branch result before any value read, rather than requiring an undirected union zero first. A conditional's own .value is already hidden from its conditions and branch bodies, so no user-visible initial union value is needed there.

A conditional `then` requires a final `else` and receives a valid selected `T`. It still runs after branch selection and produces `R`; it cannot repair a missing union `T` after the fact, even if its own result is independent of `.value`. A no-`else` declaration initializer with a multi-member union must use an explicit `else` or `?`; a no-`else` assignment or loop path is noncontributing. Reads, propagation, target exits, and cleanup must never interpret uninitialized payload as an active union member. Exact storage lowering and cleanup are separate contracts.

This is a selected semantic refinement, not a request to perform or skip particular physical stores. Existing optimization freedom does not make an otherwise ambiguous source fallback valid.

## Alternatives not selected

- Implicit member selection, an empty union state, or Unit insertion on no match. These conflict with the requirement that a declaration default choose a real member; no such reversal is implied.
- Implicit uninitialized storage on no match. The selected explicit `?` branch opts into reservation; a no-`else` declaration without `?` uses its normal zero default.

Require an explicit `else` or `?` for a declaration initializer whose conditional result is a multi-member union. Assignment and loop no-match paths perform no write or contribution and need no union member. Loop accumulator initialization, zero-result callables, and zeroing aggregate union fields remain separate pending cases. Argument omission now requires an applicable explicitly declared default for every parameter type; see [argument defaults](union-parameter-defaults.md).

## Reference comparison

[Rust if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html) use Unit when no block executes and require one type across outcomes. LiteScript instead makes a no-`else` conditional noncontributing; a declaration's normal default still supplies its zero on no match, while a multi-member union default requires an explicit member or `?`. Checked 2026-10-21. This comparison does not import Rust's missing-else semantics or require a runtime wrapper.
