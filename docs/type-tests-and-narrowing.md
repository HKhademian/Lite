# Type tests and narrowing

Status: **existing-name conditional tests, binding-free : Type patterns, and remaining-subject narrowing across match arms selected; match remainder selected on 2026-10-23; stability, broader logical flow, and full type-test rules need formalization**.

## Purpose

Test an existing value's active type without redeclaring its name. Where that test is known to hold, the compiler permits operations of the narrower type. This changes static knowledge, not the stored value or its declared type.

## Selected forms

```text
if person: User {
    greet_user(person)
}
```

Assume the existing `person` has type `User | Guest`. A successful test allows the body to use it as `User`, subject to stability. The header does not introduce a name, copy the value, assign it, or perform an unchecked cast. Name lookup must find an existing `person`; an unknown name is an error.

Explicit binding remains useful for a new name or a producer expression:

```text
if user: User = lookup(id)! {
    greet_user(user)
}
```

Destructuring still binds the extracted parts:

```text
if .Some(user) := find_user(id) {
    greet_user(user)
}
```

The three roles are distinct:

- `if person: User` tests and narrows an existing name.
- `if user: User = expression` tests an expression and binds a narrowed value in the matching branch.
- `if Some(user) := expression` tests a constructor pattern and binds its payload in the matching branch.

All bodies require braces. Existing-name tests do not add another general declaration syntax. `if person: User = person` remains valid explicit shadow binding, but is not required for narrowing.

## Evaluation and scope

The condition reads its subject once for the test. This does not promise that later independent property reads are cached, or that later function calls reproduce the tested value.

An existing-name test introduces no shadow binding. By contrast, the right-hand expression of an explicit binding resolves before its new branch-local names are introduced. Those new names do not leak into sibling branches or following code.

Ordinary declarations still fix the declared type. A union binding can be refined to one alternative at a particular program point without becoming a dynamically typed binding. Patterns and tests do not grant mutation, visibility, or ownership permissions.

## Remaining subject types across match arms selected

Later arms match only values not already selected by an earlier arm. A failed pattern introduces no bindings into the next arm, but its failure can exclude possibilities for the same matched subject. For a closed union of distinct, nonoverlapping types, an unguarded whole-subject type arm removes the entire matched alternative from subsequent arms:

```text
value: String | Float | Int = read_value();

match value {
    : String { handle_string(value) }
    _ {
        handle_number(value);
        handle_number(_)
    }
}
```

Assume read_value produces the declared initialized union, value is stable, and the handlers accept the indicated String or Float | Int and return Unit. The first arm permits value as String. Reaching the second arm proves that the subject is not String, so value and the newly bound readable `_` both have type Float | Int there. The underscore binds the remaining whole subject, not the original unnarrowed union. After the match, the declared type of value is still String | Float | Int; this is path-local type knowledge, not reassignment, type mutation, or a new implicit capture.

Before checking a later pattern and inferring its bindings, restrict its incoming subject possibilities by supported facts from earlier arm failures. Continue this across successive unguarded type arms; for these closed distinct union members, subtraction of a fully handled member is required. Failed alternatives inside an initial arm pattern can likewise refine the subject reaching a later alternative, without making their binding names visible. Initial pattern alternatives, however, still stop at the first success before the shared guard; guard failure does not pretend that skipped alternatives were tested.

### Guards and partial patterns

A type-matching pattern with a false guard has not consumed every value of that type:

```text
match value {
    text: String if is_special(text) { handle_special(text) }
    _ { handle_remaining(_) }
}
```

Here the fallback can still receive a String that is not special, so its type still includes String. Assume compatible Bool/Unit-producing predicates and handlers. Likewise, a literal, comparison, or payload-constrained pattern does not exclude an entire containing type merely because that pattern failed. Later arms may use only exclusions actually established for their path, not an unconditional complement of every earlier pattern's written type. Arbitrary predicate complements, intervals, overlapping subtype/interface relationships, and a complete coverage solver remain open.

Refining the once-evaluated match subject does not automatically refine a fresh call, repeated getter, replaced var, or unstable aliased path. Narrow the original named value only while it still denotes that same subject with a valid proof. Binding/extraction adds no copy, freeze, move, lifetime extension, or mutation permission. Effects that invalidate identity/refinement must retain their ordinary obligations; the complete stability/ownership model remains separate. This selection is about successive subject-based match arms/alternatives, not general else or early-return negative-flow analysis.

## Related pattern bindings

Successful type tests can narrow other stable bindings when finite known input/pattern alternatives establish their relationship. For Email(String)/Sms(PhoneNumber) with separate email/phone bindings and Unit for the missing name, testing email: String proves phone is Unit in the successful continuation. If Email can itself carry Unit, testing email: Unit retains both possible sources of that Unit and cannot uniquely prove Sms or remove Unit from phone. Track binding identity and invalidate affected proofs on relevant replacement/mutation unless preserved; no sibling lookup inside pattern comparison operands, negation binding export, or new runtime tag is introduced. See [related stable-binding narrowing](pattern-binding-inference.md#narrowing-related-stable-bindings-selected).

## Stability and mutation

A refinement is valid only while the compiler can establish that the tested value still satisfies it. Narrowing must not silently copy, freeze, or take a snapshot to manufacture stability.

Fixed local bindings are the initial target. `var` reassignment, writable aliases, captured variables, shared data, and getters require explicit invalidation rules. A fixed binding with `mut` access does not automatically make everything reachable through it stable. Mutation of an unrelated field need not invalidate a top-level union alternative; the compiler must track what can actually change.

**Working policy:** after an operation that may replace or change the tested alternative, drop the refinement unless it can be re-established. Reject a narrower-only operation where the proof is unavailable; the programmer can retest or use an explicit binding whose ownership contract supplies the required stability. Explicit binding alone is not a promise of a deep immutable snapshot.

The exact policy depends on the memory, aliasing, and effect models. Support for testing arbitrary member/index paths or call results without naming them remains open. No global runtime reflection system is selected by this feature.

## Missing conditional rules

These need decisions before the grammar is implementation-ready:

1. **Logical flow and precedence.** Pattern-binding and chains with bindings available to later Boolean operands are selected; see [conditional pattern chains](condition-chains.md). Binding-producing or alternatives export the union of introduced names with first-success values and Unit for absent paths, typed as normalized unions; each alternative starts from the common incoming scope. Grouped matching-condition not is selected with no exported bindings; it does not by itself select negative or early-exit refinement. Related stable-binding narrowing from finite known alternatives is selected separately. Broader negative/disjunctive refinement, existing-name type-test precedence, and complete mutation/effect invalidation still need rules. Do not derive parsing from whitespace or infer disjunction/negation bindings beyond the selected payload-or-Unit or guarantee.
2. **Early-return guards.** Retaining a successful refinement after a negative branch returns is desirable for shallow code, but the precise control-flow and invalidation rules remain a proposal.
3. **Broader negative information.** Remaining-subject narrowing across match arms is selected for fully handled members of a closed union of distinct types. Complete negative facts through conditional else, joins, overlapping types, arbitrary guards, and open interfaces separately.
4. **Type relations.** Define exact type identity versus subtype/interface satisfaction, generic type tests and erasure/reification, and impossible or always-true tests. This form does not settle those questions.
5. **Conditional declarations.** Decide whether irrefutable patterns such as `if flag := false` are rejected or diagnosed. Matching `Some(false)` with `Some(flag)` succeeds independently of the payload's Boolean value.
6. **Binding capabilities.** Finish conditional binding modifiers, borrow/move/copy behavior, and complete nested-pattern grammar. Repeated binding names within patterns and across successful and-chain operands use selected ordered shadowing; existing-name type tests narrow the current binding without introducing a new one.

These are semantic gaps to track, not reasons to require `person: User = person` everywhere.

## Relationship to match and Result

Type-only match arms and subpatterns use the selected `: Type` form without introducing a name. For a stable named match subject, a successful type-only arm permits narrowed use of that original name while its proof remains valid; it creates no implicit receiver or snapshot. Bare `User` binds rather than testing a type. The same type match composes with binding as `user: User`; see [pattern primitives](pattern-bindings-and-tests.md) and [match](match.md).

An intact Result still has an outer success/failure distinction. If both payload sides contain the same type, a payload type test cannot identify which side is active. Extract or pattern-match the outcome layer before narrowing a payload union. See [union type patterns](union-patterns.md).

## References

- [Kotlin type checks and smart casts](https://kotlinlang.org/docs/typecasts.html): existing-subject narrowing, stability restrictions, logical flow, and early-return guards. These inform the open policies; Kotlin's full rules are not adopted automatically.
- [V sum-type matching](https://docs.vlang.io/type-declarations.html#sum-types): existing-subject smart casts in branches and match arms.
- [Conditionals](conditionals.md), [mutability](mutability.md), and [types and inference](types-and-inference.md).
