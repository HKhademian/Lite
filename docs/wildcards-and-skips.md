# Underscore bindings and skipped pattern fields

Status: **ordinary readable `_` binding selected on 2026-10-18; replaces the nonbinding-wildcard decision**.

## Purpose and rule

`_` is an ordinary identifier beginning with underscore, just like `_user` or `_left`. It introduces a readable binding and explicitly permits that binding to be unused. There is no separate nonbinding underscore pattern.

Repeated names within a pattern shadow in binding order. This applies to every name, including `_`; it is not a special exemption for underscores. See [pattern binding and shadowing](pattern-shadowing.md) for ordering, scope, and typing.

## Subjectless match fallback is not a pattern

The selected [subjectless match](match.md#subjectless-boolean-selection-selected) uses Boolean expression headers instead of patterns. In that form only, a header consisting solely of `_` is the unconditional fallback and introduces no binding because no subject is supplied. `_ready` and underscore names within ordinary expressions retain normal value lookup. `match value { _ { ... } }` still binds the whole subject to ordinary readable `_`; underscore pattern and unused-name rules are unchanged.

## Positional and nested destructuring

```text
if (first, _, last: String, _) := record {
    greet(first, last);
    inspect(_)
}
```

The tuple must have the required shape. Each `_` binds one component; the later `_` shadows the earlier one, so inspect receives the fourth component. Neither underscore creates an equality constraint. If the body does not read them, no unused-name warning is needed. A single `_` does not capture several remaining components.

```text
if .Some((first, _, last: String)) := value {
    greet(first, last);
    inspect(_)
}
```

Here `_` names the middle tuple component. Some still has to match: `Some(_)` does not match None. Using an unconstrained name leaves that component unconstrained without removing surrounding shape or variant tests.

## Typed underscore bindings

```text
if (_, _: String) := pair {
    print(_)
}
```

Both positions bind normally. The second component must match String without conversion; the body sees the second `_` with type String. The first binding keeps its own inferred type even though it is hidden. Type constraints still narrow compatible input possibilities for all bindings.

## Match arms and additional conditions

```text
match find_user(id) {
    .Some(user)
        if user.age > 14
        and (_, last: String) := user.name_parts {
        greet(user, last)
    }
    .Some(_) { report_ineligible() }
    .None { report_missing() }
}
```

Assume find_user returns Option<User> and name_parts supplies the illustrated tuple shape. An unconstrained `_ { body }` arm matches any remaining subject and binds that whole subject to `_`. It can bind an intact Result without extracting its payload or propagating an error. The selected Result-side inspection rules still apply when examining an outcome's payload. A separate match else convenience remains open.

This differs from `.None`, which tests one particular case and binds nothing, and `.Some(user)`, which tests a case and binds its payload. In a tuple subpattern, `_` names one component; at the top of an arm, `_` names the entire subject. It is the same ordinary binding operation in both places, not a special selector.

## Declarations, loops, and hooks

```text
(first, _, third) := triple;
use(first, third);
inspect(_);
```

```text
_ := calculate();
inspect(_);
```

These are ordinary declarations and still require irrefutable patterns for their input contracts. A declaration produces Unit regardless of whether its bindings are subsequently read. The initializer still executes and retains its error behavior.

```text
loop items as _ {
    inspect(_, .count);
}
```

The one optional loop item name follows ordinary underscore rules. Count/index/value use metadata; receiver lists and loop-completion receivers are retired. Then { ... } uses its owning context and ordinary tail-expression results. Recovery receivers still follow their error-payload contract.

## Assignment, lifetime, and diagnostics

```text
var _ := 1;
_ = 2;
inspect(_);
```

`_ = expression` is ordinary assignment to the visible binding. It requires an existing reassignable target with a compatible type. It is not a discard operation. Similarly, `mut _` controls held-data access just as mut does for any other name.

Shadowing hides a name; it does not automatically destroy, copy, borrow, move, or discard its value. Hidden bindings retain their own types and ownership obligations. Their exact lifetime and destruction rules need the memory model. An underscore prefix cannot waive a separate required-use or recoverable-error-handling contract; that policy remains open.

Unused-name permission also does not suppress initializer effects or promise that field/getter extraction is skipped. Structural extraction effects and ownership commitment remain separate decisions. Proposed rest capture concerns multiple components and still needs its own grammar and result contract.

The same ordinary-block declaration rules apply to `_` as to other names. Permitting repeated names inside one pattern or receiver list does not enable repeated independent declarations in an otherwise duplicate-rejecting block.

## Superseded rule

The intermediate design treated `_` as a nonbinding wildcard and forbade reading it. That decision is replaced: wildcard-like matching is expressed through ordinary unconstrained bindings, underscore-prefixed unused-name intent, and ordered shadowing. Examples using `_` remain concise, but the bindings are real.

## Related concepts

- [Pattern binding and shadowing](pattern-shadowing.md)
- [Explicitly allowed unused names](unused-name-intent.md)
- [Identifiers](identifiers.md), [tuples and patterns](tuples-and-patterns.md), and [loop receivers](loop-receivers.md)
- [Match arm chains](match-guards.md) and [pattern context review](pattern-contexts.md)
