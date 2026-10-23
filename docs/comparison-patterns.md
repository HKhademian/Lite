# Comparison patterns and Boolean guards

Status: **all ten comparison operators selected as nonbinding pattern prefixes on 2026-10-23; Boolean guards selected; complete operand parsing, comparison protocols, coverage, and ownership remain open**.

## Selected comparison-pattern family

The selected value-match family accepts every selected comparison operator as a prefix to its right operand. The enclosing pattern supplies the left operand, whether it is the whole match subject or one selected component:

```text
== expected
=!= expected
> limit
>! limit
< limit
<! limit
>= limit
>!= limit
<= limit
<!= limit
```

This adds comparison choices within value matching rather than a fourth base operation. Each prefix tests the supplied subject/component against its right operand and introduces no binding. Literal value patterns keep their concise equality meaning.

These prefixes use the [selected expression comparison meanings](negated-comparison-operators.md): =!= complements ==, >! complements >, >!= complements >=, <! complements <, and <!= complements <=. Evaluate the underlying positive comparison once and complement its normal Bool result for a negative form. This does not introduce logical pattern not, independently overloaded negative relations, or conventional !=.

```text
label := match score {
    >= passMark { "pass" }
    _           { "retry" }
}

match entry {
    (name, >! limit) { accept(name) }
    _               { reject() }
}
```

Assume Int-compatible score/passMark and a comparable second entry component/limit; the handlers in the second example return Unit. A false comparison rejects that pattern and permits the enclosing conditional/match fallback behavior. A comparison failure remains a failure, not mismatch. Literal patterns such as 42 retain concise equality semantics.

## A direct component comparison

Assume User exposes two components and its second component supports the indicated comparison with minimum:

```text
User(: Int, >= minimum)
```

Assuming that positional User schema is available, match its structure, type-match the first component, then compare the second with minimum. No local names are introduced by those two tests. This keeps a single component constraint next to its component without adding a temporary binding; selecting a comparison prefix does not itself define a new record/constructor schema.

The underlying operator must be statically applicable and produce Bool. A comparison does not silently become a type test, coerce incompatible operands, or turn a recoverable error into mismatch. If broader input requires narrowing before comparing, use an explicit typed binding and a guard. Generic constraints, union applicability, operator overloads, and failure/effect contracts still need their complete rules.

The right operand may be a runtime value, not only a compile-time constant. Evaluate its expression once when that comparison test is reached; a skipped test does not evaluate it. Preserve ordinary expression/operator effects and failure behavior. This does not require hoisting bounds or caching them across arms. Names resolve in the surrounding pre-pattern scope: a binding introduced elsewhere in the same pattern is not implicitly available as a comparison bound. Use a later and guard for relationships between newly extracted components.

The source still evaluates once under the enclosing pattern's rules. Ordinary declarations retain their irrefutability requirement; this selection adds no implicit failure behavior, parameter dispatch, or loop/lambda header support. Complete right-operand syntax, recursive pattern/arm-body boundaries, generic operator applicability, extraction effects, ownership commitment, and required Result handling remain separate contracts.

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

Dart directly supports equality and ordering patterns, including nested combinations with logical patterns. Its relational operands are constants, and its logical patterns have separate precedence and binding rules. LiteScript's selected runtime bounds and existing guard syntax are deliberate choices, not an adoption of all Dart semantics. [Dart relational patterns](https://dart.dev/language/pattern-types#relational).

Rust match guards are Boolean tests evaluated after their pattern succeeds; a false guard permits a later arm. They supply the useful model for complex conditions without needing a new structural pattern for every predicate. LiteScript already uses and as its guard separator. [Rust match guards](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards).

## Selected boundary and remaining work

Use direct comparison patterns for a single component test. Use and guards, with grouped Boolean or where needed, for compound or cross-component conditions. All ten prefixes are selected; general logical subpatterns, binding-producing alternatives, and implicit-subject pattern chains are not added by this selection.

Remaining contracts include complete operand boundaries, custom operator applicability/effects, generic constraints, extraction/ownership commitment, coverage of comparison regions, and whether logical subpatterns are worth adding later. A false comparison is mismatch, but a failure is not; right-operand evaluation is once when reached. Arbitrary comparison regions or guarded predicates do not automatically prove exhaustive coverage; retain an explicit catch-all when completeness cannot be established.

Related: [pattern primitives](pattern-bindings-and-tests.md), [aggregate patterns](aggregate-patterns.md), [match arm chains](match-guards.md), and [conditional pattern chains](condition-chains.md).
