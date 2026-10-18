# Wildcards and skipped pattern fields

Status: **underscore wildcard in all patterns selected on 2026-10-18; supersedes the earlier readable underscore binding**.

## Purpose and rule

`_` matches a supplied value without introducing a name. Use it to skip positional components, payloads, parameters, or receiver slots. Every occurrence is independent; repeated underscores are valid and do not shadow each other or assert equality.

An ordinary name such as `_temporary` remains a readable identifier. Standalone `_` is not a readable value binding. Use an explicit name whenever the body needs the value.

Longer underscore-prefixed names also explicitly allow the binding or declared field to go unused without an unused-name warning. They still bind and remain readable, unlike `_`; see [unused-name intent](unused-name-intent.md). This does not waive a separate required-use or error-handling contract.

## Positional and nested destructuring

```text
if (first, _, last: String, _) := record {
    greet(first, last)
}
```

Each underscore occupies one required position. The tuple must still have the specified shape; a wildcard is not a rest pattern. The typed last component must match String without conversion. Other named bindings retain their inferred types from all compatible input possibilities.

Nested tuple and constructor payload patterns use the same wildcard:

```text
if Some((first, _, last: String)) := value {
    greet(first, last)
}
```

Some still has to match: `Some(_)` does not match None. Skipping a component removes its binding and additional constraints, not the surrounding shape or variant tests.

## Typed wildcards

```text
if (_, _: String) := pair {
    report_string_component()
}
```

A typed wildcard constrains the selected component but gives it no local name. Its successful type test still narrows the compatible input possibilities used for other bindings. The ordinary type-test/subtype and ownership rules apply; a wildcard is not an unchecked cast or a general type-inference placeholder.

## Match arms and additional conditions

```text
match find_user(id) {
    Some(user)
        and user.age > 14
        and (_, last: String) := user.name_parts {
        greet(user, last)
    }
    Some(_) { report_ineligible() }
    None { report_missing() }
}
```

Assume find_user returns Option<User> and name_parts supplies the illustrated tuple shape. A top-level `_ { body }` arm is also a catch-all pattern. As an ordinary pattern it can cover the whole remaining subject, including an intact Result, without extracting any payload or propagating an error. This does not decide whether a separate else fallback spelling is also retained.

## Declarations, loops, and hooks

```text
(first, _, third) := triple;
_ := calculate();

loop items as _, count, acc {
    inspect(count, acc)
}
```

Declarations still require an irrefutable pattern for their input contract. A wildcard declaration evaluates its initializer, introduces no binding, and produces Unit like other declarations. It does not cancel the initializer's work or turn its failure into success.

In loop receiver lists, underscore skips naming that slot. Item/count/accumulator state remains available through permitted construct metadata. Repeated ordinary receiver names retain their separately selected left-to-right shadowing; repeated wildcards introduce no names at all.

Under the existing completion-hook proposal, `then(_) { replacement }` still has a receiver pattern and may supply a replacement result while leaving its input unnamed. To read it, write `then(value) { process(value) }`. Recovery and other receiver patterns follow the same no-binding meaning; their phase-specific payload and result rules do not change.

## Scope and evaluation limits

- Reading `_` as an expression is invalid because it introduces no value binding.
- There is no ordinary variable called `_` to update. `_ = expression` is not enabled as a new discard-assignment operation by this decision; destructuring assignment remains a separate design topic.
- Wildcards never exempt Result values or other required-use types from the eventual ignored-outcome policy. That policy remains open.
- Skipping a field does not imply copying, allocation, ownership transfer, or a particular destruction time. Those need the ownership model.
- Producer evaluation is preserved. Whether unused field/getter extraction can be omitted without effects needs the extraction/effect contract; do not silently adopt another language's getter behavior.
- Capability modifiers on patterns cannot turn `_` into a readable binding. Modifier validation for mixed or binding-free patterns remains part of the full declaration grammar.
- The proposed `...rest` is distinct from `_`: it concerns several remaining positions. Exact rest syntax, including any ignored-rest form, remains open.

## Superseded rule

Earlier examples let `_` name the last loop receiver or read a hook input. Those uses now need explicit names such as count, acc, or value. The ordinary-name shadowing rules remain intact. Duplicate real names within one simultaneous pattern still need a policy; repeated wildcards are not duplicates because they bind nothing.

## References and related concepts

- [Rust wildcard patterns](https://doc.rust-lang.org/reference/patterns.html#wildcard-pattern): an underscore ignores a value without binding; Rust's detailed move/borrow rules are not automatically selected.
- [Dart wildcard patterns](https://dart.dev/language/pattern-types#wildcard): positional skips and typed wildcards without local names.
- [Kotlin skipped components](https://kotlinlang.org/docs/destructuring-declarations.html#underscore-for-unused-variables): skipped destructuring components have specific component-call semantics, which LiteScript must define separately.
- [Tuples and patterns](tuples-and-patterns.md), [identifiers](identifiers.md), [loop receivers](loop-receivers.md), and [match arm chains](match-guards.md).
