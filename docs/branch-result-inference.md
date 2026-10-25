# Conditional and match result inference

Status: **selected 2026-10-21**. Conditional branches and match arms infer normalized plain unions when no expected result contract supplies the type, consistent with local lambda completion payloads.

## Equivalent source forms

The selected local-lambda rule permits:

```text
choose := (flag: Bool) {
    if flag { return 1 }
    "none"
}
/* Inferred result: Int | String */
```

The following rewrite now infers the same result type:

```text
choose := (flag: Bool) {
    if flag { 1 } else { "none" }
}
```

Both forms infer Int | String. Rewriting an early-return guard as a tail conditional does not require an added union annotation.

## Selected rule

When no expected result contract supplies the type, infer the normalized plain union of normally completing conditional branches or match arms:

```text
value := if flag { 1 } else { "none" }
/* Inferred type: Int | String */

value := match flag {
    == true { 1 }
    == false { "none" }
}
/* Inferred type: Int | String */
```

Duplicate type identities disappear, and nested plain unions flatten. Preserve nominal identity and complete composite/Result alternatives under the existing normalization rules. This selects no new numeric conversion, automatic boxing, or escaping error inference.

An expected result remains a constraint: `value: Int = if flag { 1 } else { "none" }` is rejected rather than widening the annotation. An expected Int | String accepts both alternatives. Exiting branches supply no local result; their payloads are checked against their actual targets. Match exhaustiveness remains required.

A conditional branch proven unreachable by the supported type-test exhaustion rules contributes no normally produced result, even when its syntactic body contains Unit-producing statements. Its exhausted binding has an internal Never read type for supported ordinary value checking. This selects reachable-result collection, not public Never | T or Never & T algebra; see [Never and unreachable flow](never-and-unreachable-flow.md).

## Unit, no final else, and then

An explicit empty branch genuinely produces Unit. Thus `if flag { 1 } else {}` infers Int | Unit. By contrast, `if flag { 1 }` is partial: it infers Int from its contributing branch, and no match is a noncontributing path. It does not add Unit, and it does not produce `zero(Int)` as a conditional result. The context supplies the meaning: a declaration keeps its zero default, an assignment performs no write, a loop body contributes nothing, and a value-required context rejects the missing `else`.

A multi-member union declaration still needs an explicit `else` or `?` branch because its default zero cannot select a member. Assignment and loop noncontributing paths do not require a union member.

A conditional with `then` requires a final `else`; inference determines the pre-then value type `T` from the total chain. The then body still produces final type `R`. An expected `R` does not by itself force the branch type `T` to equal `R`.

The selected [conditional union-fallback rule](conditional-union-fallback.md) remains for declaration initializers whose default `zero(T)` is a normalized multi-member plain union. Exhaustive chains construct the chosen member directly, without first requiring undirected zero(T). A wider destination alone does not force a union fallback.

## Alternatives and tradeoff

Use automatic normalized union inference for both if and match, matching the selected local-lambda behavior and reducing annotation. A changed branch can widen an inferred local result; an explicit contract can pin it.

Requiring an explicit/expected union contract for mixed conditional and match results was considered and not chosen. This supersedes the older rules rejecting mixed branch results merely because no union annotation was supplied. Loop accumulator inference, recursive function inference, and deferred contexts remain separate.

## References

Checked 2026-10-21. [Rust if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html) require one type across outcomes, and use Unit when no branch executes; LiteScript instead makes a missing final `else` noncontributing in guarded-update contexts and rejects it where a value is required. [Zig peer type resolution](https://ziglang.org/documentation/master/#Peer-Type-Resolution) finds a common type for constructs such as if and switch under Zig's coercion rules; it is not LiteScript's plain-union policy. [TypeScript union examples](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) show inferred union results. These are comparison points, not requirements for LiteScript's representation or runtime.
