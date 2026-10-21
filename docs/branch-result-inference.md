# Conditional and match result inference

Status: **open review, 2026-10-21**. Local lambda completion payloads already infer normalized unions. Extending that policy to conditional and match result expressions is recommended but not selected.

## Equivalent source forms

The selected local-lambda rule permits:

```text
choose := (flag: Bool) {
    if flag { return 1 }
    "none"
}
/* Inferred result: Int | String */
```

The following rewrite still encounters the older conditional compatibility rule:

```text
choose := (flag: Bool) {
    if flag { 1 } else { "none" }
}
```

Without a broader rule, this rewrite can require an explicit or expected union even though the guard version infers one. That difference is the next decision.

## Recommended extension

When no expected result contract supplies the type, infer the normalized plain union of normally completing conditional branches or match arms:

```text
value := if flag { 1 } else { "none" }
/* Proposed type: Int | String */

value := match flag {
    == true { 1 }
    == false { "none" }
}
/* Proposed type: Int | String */
```

Duplicate type identities disappear, and nested plain unions flatten. Preserve nominal identity and complete composite/Result alternatives under the existing normalization rules. This selects no new numeric conversion, automatic boxing, or escaping error inference.

An expected result remains a constraint: `value: Int = if flag { 1 } else { "none" }` is rejected rather than widening the annotation. An expected Int | String accepts both alternatives. Exiting branches supply no local result; their payloads are checked against their actual targets. Match exhaustiveness remains required.

## Unit, missing else, and then

An explicit empty branch genuinely produces Unit. Under the proposal, `if flag { 1 } else {}` therefore infers Int | Unit. By contrast, `if flag { 1 }` retains the selected missing-else policy: infer Int from its contributing branch and supply zero(Int) when unmatched. Missing else never adds Unit merely because no branch ran.

For a conditional with then, this inference determines the pre-then value type T. The then body still produces final type R. An expected R does not by itself force the branch type T to equal R.

Multiple distinct branch types without a final else still require zero(T) on the unmatched path. The exact zero value for a multi-member plain union remains unresolved; union member order cannot select its zero alternative. This review must not invent a first-member default or abandon universal valid zero initialization. The union-zero contract needs its own resolution before such examples have a fully specified unmatched value. See [union initialization](union-normalization.md#ordering-coverage-and-initialization).

## Alternatives and tradeoff

Recommendation: use automatic normalized union inference for both if and match, matching the selected local-lambda behavior and reducing annotation. A changed branch can widen an inferred local result; an explicit contract can pin it.

The alternative retains explicit/expected union contracts for mixed conditional and match results. It preserves the older compatibility boundary but leaves the guard-versus-tail rewrite distinction above. No choice has been selected yet. Loop accumulator inference, recursive function inference, and deferred contexts remain separate.

## References

Checked 2026-10-21. [Rust if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html) require one type across outcomes, and use Unit when no branch executes; LiteScript has already chosen a different missing-else zero policy. [Zig peer type resolution](https://ziglang.org/documentation/master/#Peer-Type-Resolution) finds a common type for constructs such as if and switch under Zig's coercion rules; it is not LiteScript's plain-union policy. [TypeScript union examples](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types) show inferred union results. These are comparison points, not requirements for LiteScript's representation or runtime.
