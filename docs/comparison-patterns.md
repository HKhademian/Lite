# Comparison patterns and Boolean guards

Status: **equality value matching and Boolean guards selected; direct ordering-comparison patterns proposed on 2026-10-18**.

## Current rule and proposed extension

The selected direct value-match form is `== expected`. Other comparisons already work as ordinary Boolean expressions in an and guard after a successful pattern. Direct ordering prefixes are not selected yet.

Recommend extending the existing value-match family to these operator prefixes:

```text
== expected     /* selected */
< limit         /* proposed */
<= limit        /* proposed */
> limit         /* proposed */
>= limit        /* proposed */
```

This adds comparison choices within value matching rather than a fourth base operation. Each prefix tests the supplied subject/component against its right operand and introduces no binding. Literal value patterns keep their concise equality meaning.

Do not introduce != through this extension: that token has no selected LiteScript meaning. Ordinary Boolean negation already expresses inequality in a guard.

## A direct component comparison

Assume User exposes two components and its second component supports the indicated comparison with minimum:

```text
User(: Int, >= minimum)
```

Under the proposal, match the User family/schema, type-match the first component, then compare the second with minimum. No local names are introduced. This keeps a single component constraint next to its component without adding a temporary binding.

The underlying operator must be statically applicable and produce Bool. A comparison does not silently become a type test, coerce incompatible operands, or turn a recoverable error into mismatch. If broader input requires narrowing before comparing, use an explicit typed binding and a guard. Generic constraints, union applicability, operator overloads, and failure/effect contracts still need their complete rules.

For consistency with equality matching, the proposed right operand can be an existing runtime value, not only a compile-time constant. Expected-value expression boundaries, evaluation timing, effects, and required error handling need the same explicit contract as equality patterns; selecting a prefix does not settle them.

## Compound and cross-component conditions

Use the selected and chain for conditions involving several tests, extracted values, calls, or relationships between components:

```text
match candidate {
    User(first: Int, second: Int)
        and minimum <= first < maximum
        and (second == outVal or second == fallback) {
        accept(first, second)
    }
    _ { reject() }
}
```

This example assumes the User matching schema, Int-compatible bounds/comparison values, and Unit-producing handlers. The whole structural pattern succeeds before first and second become available to later conditions. The comparison chain and grouped or are ordinary Boolean expressions with their existing short-circuit and evaluation rules. Other matched alternatives require the illustrated fallback or appropriate explicit coverage.

If no new binding is needed, the guard may instead reference an already stable subject through its accessible fields. The unbound `User(: Int, == outVal)` pattern does not create implicit first/second receiver names for later conditions.

## Keep pattern logic separate from Boolean logic

These are not selected shorthand:

```text
User(: Int, >= minimum and < maximum)
User(first: Int, _) or Other(first)
```

The first would need logical composition between patterns on the same component, including parsing and implicit-subject rules. The second would need alternative-pattern binding guarantees. Neither follows automatically from ordinary Boolean and/or operators or from the three base primitives.

The selected form is `pattern and (Boolean_condition or Boolean_condition)`. Its grouped or runs only after preceding bindings exist and introduces no new names. General binding-producing or/not and pattern alternatives remain open. A successful disjunction must not expose a name supplied by only one of its alternatives.

## Reference comparison

Dart directly supports equality and ordering patterns, including nested combinations with logical patterns. Its relational operands are constants, and its logical patterns have separate precedence and binding rules. LiteScript's proposed runtime bounds and existing guard syntax would therefore be deliberate choices, not an adoption of all Dart semantics. [Dart relational patterns](https://dart.dev/language/pattern-types#relational).

Rust match guards are Boolean tests evaluated after their pattern succeeds; a false guard permits a later arm. They supply the useful model for complex conditions without needing a new structural pattern for every predicate. LiteScript already uses and as its guard separator. [Rust match guards](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards).

## Recommendation and remaining work

Use direct comparison patterns for a single component test. Use and guards, with grouped Boolean or where needed, for compound or cross-component conditions. Keep equality selected, record direct <, <=, >, and >= as the proposed extension, and postpone general logical subpatterns until binding/precedence rules are settled.

Remaining contracts include operand boundaries, operator applicability/effects, generic constraints, evaluation/ownership commitment, coverage of comparison regions, and whether logical subpatterns are worth adding later. Arbitrary guarded predicates do not automatically prove exhaustive coverage.

Related: [pattern primitives](pattern-bindings-and-tests.md), [aggregate patterns](aggregate-patterns.md), [match arm chains](match-guards.md), and [conditional pattern chains](condition-chains.md).
