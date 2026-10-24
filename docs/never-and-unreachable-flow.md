# Never and unreachable flow

Status: **internal Never reads for exhausted conditional type-test branches and a reachability warning selected 2026-10-24; public Never syntax, general type algebra, member lookup, generic inference, and broader unreachable-code policies remain open**.

## Purpose

Keep an evolving program reviewable when a supported type-test chain becomes exhaustive. Removing an admitted type can make a previously useful fallback unreachable; the remaining code should receive a warning without manufacturing a replacement value or losing its static checking model.

## Exhausted bindings selected

For an initialized stable closed union of distinct, nonoverlapping types, apply the selected success/remainder rules at each condition. If no possibilities remain on entry to a conditional branch, warn that the branch is unreachable. The exhausted binding has an internal Never read type there:

```text
x: String | Int = read_value();
count: Int = 0;

if x: String {
    handle_text(x)
} else if x: Int {
    handle_integer(x)
} else {
    /* Warning: unreachable. x reads as internal Never; count is still Int. */
    log_float(x);
    log_integer(count)
}
```

Assume read_value produces String | Int, the named types are distinct, and handlers/loggers have the indicated ordinary value-parameter types and return Unit. The former String | Int | Float version could reach the fallback with Float. After Float is removed from the input contract, x has no possible remaining value there, but the call to the known log_float(Float) contract can remain in place during development.

This also covers a successful branch of a provably disjoint existing-name test, where the successful input possibilities are empty. A mere unknown predicate, a guarded type-test failure, unstable aliases, or overlapping/open type relationships must not be treated as exhaustion without a proof. General unreachable match-arm and impossible-pattern policies remain separate. The existing constant-test warning may overlap with the unreachable-branch warning; exact wording and deduplication remain open.

## Internal Never and ordinary checking

Never describes no possible runtime value. For ordinary value compatibility, a read with this internal type can satisfy an already-known expected value type: log_float(x) is type-compatible because no execution reaches an argument value there. It does not construct Float, change x's declared String | Int contract, convert x, or provide a runtime placeholder.

Only the binding with exhausted possibilities acquires that read type. Unrelated bindings keep their normally justified types. Unknown names, malformed syntax, and independently invalid expressions remain errors; reachability is not permission to skip ordinary checking. In particular, a missing field on a reachable union alternative remains a failed field lookup, not a Never result that can be erased.

Read compatibility does not grant var/mut permissions, initialized storage, writable aliases, ownership, or lifetime. Accepted replacements still follow the declared storage contract, not the Never read type. Definite initialization and access/call contracts retain their own obligations. Public Never parameter/storage declarations, member selection on Never, overload resolution, and generic constraint/inference behavior are not selected by the known ordinary value-parameter example.

Checking statements inside the unreachable body does not make that path executable. No data is created, and no side effects in that body run. Tests and source effects on paths actually reached still retain their ordinary evaluation, failure, exit, and cleanup behavior.

## Branch results and Unit

An exhausted branch contributes no normally produced value to the enclosing conditional result. Its syntactic body might otherwise produce Unit or another type, but that unreachable result does not widen the inferred union. This is a reachable-result collection rule, not adoption of public Never type expressions or general union/intersection algebra.

Unit remains a real one-value type, spelled Unit or (). An empty remainder does not add Unit to x. With input String | Int | Unit, however, failed String and Int tests leave the genuine Unit alternative and the final branch is reachable.

The existing missing-else rule is explicitly retained. Given user: User, value := if flag { user; } infers User and uses zero(User) when the false path is normally reached, under the existing single-type fallback contract. It does not implicitly become User | Unit. An explicit reachable empty else body can contribute Unit under ordinary branch-result inference. A missing branch, a reachable Unit-producing branch, and an unreachable branch remain distinct cases.

The internal state selected here is not an ordinary constructible/storage type and creates no new zero value or exception to ordinary value initialization. Public Never requires its own future contract.

## Future exploration requested by the user

Keep these topics open for a later design review:

- Public Never spelling and where it may appear: function results, parameters, variables, aggregate members, and diagnostics.
- Never | T: investigate possible normalization, branch/value compatibility, nominal boundaries, and interaction with ordinary source-level union syntax. No general law is selected here.
- Never & T: explore the intended meaning of intersection and how an empty type combines with constraints or capabilities. The & notation is exploratory; no source-level intersection operator or grammar is selected.
- General Never algebra, including nested combinations, generics, aliases, recursive types, and the relationship between type operations and control-flow facts.
- Member lookup, generic inference/constraints, overload resolution, and diagnostics involving internal or public Never.
- Interaction with zero initialization, constructibility, callable defaults, storage/access capabilities, ownership, and ABI if a public type is introduced.
- Broader unreachable-code detection and checking, beyond the supported exhausted conditional type-test paths.

These are project review topics, not accepted source syntax or implemented compiler behavior.

## Related documents

- [Type tests and narrowing](type-tests-and-narrowing.md), [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected), and [condition chains](condition-chains.md).
- [Branch-result inference](branch-result-inference.md), [conditional fallbacks](conditional-union-fallback.md), and [Unit](unit.md).
- [Union normalization](union-normalization.md), [common field reads](union-field-reads.md#missing-fields-are-not-bottom-types), and [types and inference](types-and-inference.md).
