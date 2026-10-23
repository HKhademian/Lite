# Comparison patterns and Boolean guards

Status: **all ten comparison operators, common and grouped right operands, and rejection of implicit-subject comparison-pattern chains selected on 2026-10-23; if guards selected; complete operand parsing, comparison protocols, coverage, and ownership remain open**.

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

## Common right operands selected

Comparison-pattern right operands admit ordinary arithmetic, calls, and member access without additional grouping just because they occur in a pattern:

```text
>= minimum + margin
== expected()
== settings.limit
```

Each is one comparison against the supplied subject/component. The arithmetic and postfix operations retain their ordinary expression meanings and precedence. The operands must be statically valid and compatible with that comparison; calls and arithmetic retain their effects and failures. These spellings create no bindings. Existing RHS names resolve in the pre-pattern scope, and each reached RHS evaluates once under the selected comparison-pattern contract.

An ungrouped comparison-pattern chain such as `>= lower < upper` is invalid. It neither repeats the implicit subject nor acquires the expression comparison-chain meaning. For an interval or another complex condition, bind the value and use an if guard:

```text
match target {
    v if lower <= v < upper { accept(v) }
    _                      { reject() }
}
```

Assume compatible integer operands and Unit-producing handlers. Here v binds the subject; the guard is an ordinary Boolean comparison chain using v explicitly. A false guard tries the next arm. `_` remains a readable ordinary binding with permission for nonuse.

## Grouped right operands selected

A parenthesized value expression is admitted as a comparison-pattern right operand. Require grouping when comparison operators, Boolean logic (and/or/not), or a conditional/block expression occur at the outer level of that operand:

```text
== (left == right)
== (ready or retry)
== (not ready)
== (if choose_first { first } else { second })
== ({ compute_expected() })
```

The first three compare a Bool-compatible subject with a computed Bool. The conditional and block supply their ordinary result values, which must be compatible with the selected comparison. Grouping adds no conversion, truthiness, or change to the operator meaning. All ten comparison prefixes share this rule.

```text
match flag {
    == (ready or retry) { report_equal() }
    _                  { report_different() }
}
```

Assume Bool inputs and Unit-producing handlers. The first arm tests flag against the computed expected Bool; it does not capture flag or bind ready/retry. The RHS free names use the surrounding pre-pattern scope. Grouping does not expose newly bound sibling pattern names or create an implicit subject name. Any explicit local declarations within a block expression keep that block's ordinary scope.

Arithmetic, calls, and member access retain their accepted concise forms. Nested operands keep their ordinary delimiters; for example, `== expected(ready or retry)` needs no extra parentheses around the whole call. By contrast, an outer RHS `== ready or retry` is invalid without grouping. `== left == right` is also invalid as a comparison pattern; use `== (left == right)` for one computed expected Bool.

Grouping also distinguishes the expected conditional/block value from an arm guard or body: `== (if choose_first { first } else { second }) { handle() }` and `== ({ compute_expected() }) { handle() }` are arm fragments. An ungrouped conditional/block RHS is rejected. The optional arm guard begins after the complete pattern, as in `== expected() if ready { handle() }`.

Evaluate the grouped RHS once when its comparison is reached, retaining ordinary internal short-circuiting, effects, failures, and explicit exits. Skipped patterns do not evaluate it. The subject still evaluates once. For relationships involving the matched value itself, use an explicit binding and if guard, such as `v if lower <= v < upper`; `>= lower < upper` remains invalid. This selects the grouping boundary, not a complete recursive expression/pattern parser or new logical subpatterns.

## A direct component comparison

Assume User exposes two components and its second component supports the indicated comparison with minimum:

```text
User(: Int, >= minimum)
```

Assuming that positional User schema is available, match its structure, type-match the first component, then compare the second with minimum. No local names are introduced by those two tests. This keeps a single component constraint next to its component without adding a temporary binding; selecting a comparison prefix does not itself define a new record/constructor schema.

The underlying operator must be statically applicable and produce Bool. A comparison does not silently become a type test, coerce incompatible operands, or turn a recoverable error into mismatch. If broader input requires narrowing before comparing, use an explicit typed binding and a guard. Generic constraints, union applicability, operator overloads, and failure/effect contracts still need their complete rules.

The right operand may be a runtime value, not only a compile-time constant. Evaluate its expression once when that comparison test is reached; a skipped test does not evaluate it. Preserve ordinary expression/operator effects and failure behavior. This does not require hoisting bounds or caching them across arms. Names resolve in the surrounding pre-pattern scope: a binding introduced elsewhere in the same pattern is not implicitly available as a comparison bound. Use an if guard in a match arm, or a later and operand in a conditional chain, for relationships between newly extracted components.

The source still evaluates once under the enclosing pattern's rules. Ordinary declarations retain their irrefutability requirement; this selection adds no implicit failure behavior, parameter dispatch, or loop/lambda header support. Complete right-operand syntax, recursive pattern/arm-body boundaries, generic operator applicability, extraction effects, ownership commitment, and required Result handling remain separate contracts.

## Compound and cross-component conditions

Use an if guard in match arms for conditions involving several tests, extracted values, calls, or relationships between components; additional guard operands use and:

```text
match candidate {
    User(first: Int, second: Int)
        if minimum <= first < maximum
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

The selected form is `pattern if (Boolean_condition or Boolean_condition)`. Its grouped or runs only after preceding bindings exist and introduces no new names. Complete condition or alternatives with explicit sources may also introduce bindings when every alternative introduces the same visible names; the first successful alternative supplies them, with normalized union types. This does not select binding-producing not or alternatives inside one structural pattern. A disjunction must not expose a name supplied by only one alternative; see [binding-producing or](condition-chains.md#binding-producing-or-alternatives-selected).

## Reference comparison

Dart directly supports equality and ordering patterns, including nested combinations with logical patterns. Its relational operands are constants, and its logical patterns have separate precedence and binding rules. LiteScript's selected runtime bounds and existing guard syntax are deliberate choices, not an adoption of all Dart semantics. [Dart relational patterns](https://dart.dev/language/pattern-types#relational).

Rust match guards are Boolean tests evaluated after their pattern succeeds; a false guard permits a later arm. They supply the useful model for complex conditions without needing a new structural pattern for every predicate. LiteScript selects if as its arm guard separator and retains and between further guard operands. [Rust match guards](https://doc.rust-lang.org/reference/expressions/match-expr.html#match-guards).

## Selected boundary and remaining work

Use direct comparison patterns for a single component test. Use if guards in match arms and later and operands in conditional chains, with grouped Boolean or where needed, for compound or cross-component conditions. All ten prefixes are selected; general logical subpatterns, alternatives inside one structural pattern, and implicit-subject pattern chains are not added by this selection. Binding-producing or between complete condition alternatives is selected separately.

Remaining contracts include complete operand boundaries, custom operator applicability/effects, generic constraints, extraction/ownership commitment, coverage of comparison regions, and whether logical subpatterns are worth adding later. A false comparison is mismatch, but a failure is not; right-operand evaluation is once when reached. Arbitrary comparison regions or guarded predicates do not automatically prove exhaustive coverage; retain an explicit catch-all when completeness cannot be established.

Related: [pattern primitives](pattern-bindings-and-tests.md), [aggregate patterns](aggregate-patterns.md), [match arm chains](match-guards.md), and [conditional pattern chains](condition-chains.md).
