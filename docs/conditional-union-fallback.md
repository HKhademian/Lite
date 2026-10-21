# Missing conditional else with a union result

Status: **open review, 2026-10-21**. Local multi-member plain-union declarations require an initialized expression or = ?, and undirected = 0 is rejected. Conditional/match branch-union inference is selected. The missing-else union fallback needs reconciliation with those decisions.

## Concrete unresolved case

```text
value := if number_mode {
    7
} else if text_mode {
    "ready"
}
```

Normally completing branches infer Int | String. The current missing-else rule requests zero(T) if neither condition matches. The recent explicit-member rule gives no member to that implicit zero and must not be bypassed by constructing the union through a conditional.

## Recommended rule

Require an explicit fallback when the conditional's resolved branch-result type T is a normalized multi-member plain union and branch selection can normally complete without a contributor. Do not choose a leftmost/canonical member, create an empty union, add Unit/Option, leave a readable uninitialized value, or introduce a runtime panic.

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

The explicit fallback can also exit to an outer target, so no union value is required on that path. Detailed proofs that conditions without a final else cover all normal possibilities remain a separate coverage-analysis question; this review starts with an explicit final else or another established proof of no unmatched completion. No runtime condition evaluation is assumed to prove arbitrary coverage at compile time.

The rule is about the conditional's resolved T, not merely a wider type that eventually receives its result. A separately established Int expression can still widen into Int | String while preserving its Int value. Complete direct bidirectional inference must not silently treat a multi-member union as one chosen member to invent a fallback.

## Preserve single-type behavior

```text
number := if ready { 7 }
/* Int; false path remains integer zero */
```

A conditional with established Option<User> can retain its .None zero, and no-contributor inference still defaults to Unit unless context constrains it. Their existing type-specific mappings are not general multi-member plain-union member selection. This does not revise those rules.

An explicit empty final else contributes Unit under selected branch inference. It is a real branch value, not an automatically inserted absent value. A final else whose body returns a concrete member keeps the inferred union of the actual completion types.

## Result storage and then

Current conditionals are described as starting their result context at zero(T) before selection, even with a final else. That description also needs refinement for exhaustive union-valued chains: select and construct the normal branch result before any value read, rather than requiring an undirected union zero first. A conditional's own .value is already hidden from its conditions and branch bodies, so no user-visible initial union value is needed there.

Under the proposal, a conditional then receives a valid selected T. It still runs after branch selection and produces R; it cannot repair a missing union T after the fact, even if its own result is independent of .value. A missing-else path with a single valid type-zero supplies that zero as before. Reads, propagation, target exits, and cleanup must never interpret uninitialized payload as an active union member. Exact storage lowering and cleanup are separate contracts.

This is a proposed semantic refinement, not a request to perform or skip particular physical stores. Existing optimization freedom does not make an otherwise ambiguous source fallback valid.

## Alternatives

- Retain the missing-else syntax by introducing a separate explicit fallback-value facility. Such syntax and scope are not designed; it would still need to supply an actual member.
- Reopen automatic member selection or a valid empty union state. Those are earlier alternatives and conflict with the latest direction requiring an explicit member choice; no such reversal is implied.
- Supply Unit implicitly or reinterpret unmatched completion as uninitialized storage. Both would contradict selected result or initialization boundaries and are not recommended.

Recommendation: require an explicit fallback for unresolved multi-member union results, and construct exhaustive conditional results from the chosen branch. No choice is selected yet. Loop accumulator initialization, omitted union arguments, zero-result callables, and zeroing aggregate union fields remain separate pending cases.

## Reference comparison

[Rust if expressions](https://doc.rust-lang.org/reference/expressions/if-expr.html) use Unit when no block executes and require one type across outcomes. LiteScript deliberately retains its selected single-type zero fallback and normalized union inference; the proposed restriction handles their intersection with explicit member construction. Checked 2026-10-21. This comparison does not import Rust's missing-else semantics or require a runtime wrapper.
