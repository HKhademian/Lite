# Match pattern capabilities

Status: **equality, plain enums, payload enums, destructuring, and type matching required; complete productions and evaluation contracts open**.

## Purpose and template

One match construct must cover ordinary value selection and structured pattern matching. A separate switch construct is unnecessary for these capabilities.

```text
match subject {
    pattern { body }
    pattern { body }
}
```

The five capabilities below are selected requirements. Where a spelling extends the selected constructor, tuple, or typed-binding examples, it is an illustrative surface candidate rather than a completed grammar. Full fallback and guard syntax remain proposals. Each match evaluates its subject once and uses the same action/value body form.

## 1. Equality

Match by equality with a value: numbers, strings, Booleans, named constants, and compatible values computed or obtained at runtime. This is more than an integer-only jump-table switch.

Candidate literal arms:

```text
match answer {
    42 { celebrate() }
    /* Remaining arms or fallback go here. */
}
```

Require compatible operand types and a defined equality contract; do not add implicit truthiness or unrelated coercions. The spelling for matching an existing runtime value remains open. One candidate is `== expected { ... }`, making equality explicit rather than silently creating a binding named `expected`.

Decide how many times and when a computed comparison value is evaluated, whether matching uses ordinary `==` or a restricted equality capability, and how side effects or fallible equality participate. The subject-once rule does not automatically answer those questions. Custom equality must not silently swallow recoverable errors or force every structural pattern to call user-defined equality.

## 2. Plain enums

Support conventional payload-free enum cases:

```text
match status {
    Status.Ready { start() }
    Status.Busy { wait() }
    Status.Stopped { finish() }
}
```

Assume these are the enum's complete cases and the called operations produce Unit. Qualified case names are illustrative; enum declarations, raw integer representations, conversion, aliases, and invalid foreign values require separate contracts. Plain enum support does not automatically adopt implicit C-style integer conversion. See [enums and variants](enums-and-variants.md).

## 3. Enums with payloads

Select a case and extract its associated data:

```text
match event {
    Event.Click(x, y) { handle_click(x, y) }
    Event.Key(key) { handle_key(key) }
    Event.Quit { close_window() }
}
```

Assume these are the complete cases, handlers produce Unit, and each case exposes the illustrated payload. Parenthesized case payloads are a constructor-pattern candidate consistent with existing `Some(value)` examples; this does not finalize enum declaration or construction syntax.

This is a variant-tag test followed by payload matching. It is not an ordinary call to `Event.Click`, and it does not require an equality implementation for the entire Event value. Payload ownership and visibility still apply.

## 4. Destructuring

Extract components while matching their structure:

```text
match point {
    (x, y) { use_coordinates(x, y) }
}
```

Assume point has a compatible two-element tuple type. This pattern receives the whole point and destructures that same value. It does not switch to unrelated metadata because a tuple pattern was written.

Tuple, record/field, and nested patterns belong to this capability. Tuple syntax already has working examples; record, sequence/rest, and named-field spellings remain open. Literal or type constraints should compose with extraction, subject to the full pattern grammar. This does not imply heap allocation or automatic calls to arbitrary user getters.

Newly bound component names are branch-local and may shadow outer names. A name inside a constructor pattern, such as `Event.Key(key)`, binds its payload; an outer variable with the same spelling must not silently change it into an equality test. Duplicate names inside one pattern still need a policy; repeated names must not acquire equality constraints accidentally. `_` remains readable and is not a nonbinding wildcard.

## 5. Type checking and matching

Select an active union alternative and use its narrower static type:

```text
match person {
    user: User { greet_user(user) }
    guest: Guest { greet_guest(guest) }
}
```

Assume person has type `User | Guest`. These explicit typed-binding arms are selected. Type-only arms narrowing an existing stable subject are under review: bare `User` versus marked `: User` is not settled. See [type tests and narrowing](type-tests-and-narrowing.md).

A type test is different from an enum-case test. `Event.Click` and `Event.Key` can share the same declared type Event; `event: Event` cannot distinguish them. Similarly, testing a payload type cannot distinguish an intact Result's success from failure when the two payload types overlap.

## Recommended sixth capability: guards

After a structural pattern succeeds, allow a Boolean condition to refine selection. Candidate syntax, not yet selected:

```text
Event.Click(x, y) if x >= 0 and y >= 0 { handle_click(x, y) }
```

If the guard is false, selection should be able to continue to another arm. Scope, side effects, mutation, evaluation count, and ownership commitment need formal rules. A guarded arm does not establish full coverage of its structural pattern.

Other useful follow-ups are alternatives in one arm, range patterns, whole-value-plus-payload binding, and a remainder/fallback arm. They are separate decisions rather than additional requirements inferred from the numbered list.

## Common contracts still to settle

- Distinguish equality against an existing name, new binding, constant/enum selection, and type selection without relying on capitalization or whitespace.
- Specify ordering, overlap, unreachable arms, fallback syntax, and exhaustive action matches. Exhaustive value selection for closed variants is already required.
- Define borrow/copy/move behavior and field access permissions, especially after a nested match fails.
- Specify equality semantics, effects, and comparison-operand evaluation without sacrificing the once-evaluated subject contract.
- Share the applicable patterns with conditional matching; do not create an unrelated `if` pattern language.

Some fragments intentionally omit remaining arms to isolate a pattern category. They are not claims of exhaustive or executable examples. These capabilities do not establish a parser, representation, or benchmark result.

## References and related concepts

- [Rust patterns](https://doc.rust-lang.org/reference/patterns.html): literals, constant paths, variants, tuples, records, and name-resolution distinctions; its exact grammar and wildcard rules are not adopted.
- [Dart pattern types](https://dart.dev/language/pattern-types): constant, variable, typed, object, and record patterns.
- [Swift enumerations](https://github.com/swiftlang/swift-book/blob/main/TSPL.docc/LanguageGuide/Enumerations.md): payload-free and associated-value enum cases.
- [Match](match.md), [tuples and patterns](tuples-and-patterns.md), and [reference comparison](pattern-syntax-comparison.md).
