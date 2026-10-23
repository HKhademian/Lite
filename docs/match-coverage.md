# Match coverage and explicit ignoring

Status: **every match must be exhaustive, including action-only matches; empty-block ignore handlers selected**.

## One coverage rule

For a subject-based match, every possible input admitted by the subject's contract must be handled by some arm. For a subjectless match, every possible outcome of the Boolean tests must lead to an arm, including the all-false path when reachable. This applies whether the selected body supplies useful data or only Unit. If the compiler cannot establish completeness from the arms, require an explicit catch-all. Do not synthesize None, Unit, an error, or a panic for an omitted case.

Use if for an intentionally partial condition. A complete match may intentionally ignore cases, but that choice must appear in an arm.

## Subjectless fallback

The selected subjectless form tests existing Boolean expressions in source order:

```text
match {
    val1 == val2 { report_equal() }
    isUserSigned { show_account() }
    _            {}
}
```

Assume valid equality/Bool inputs and Unit-producing handlers. The whole `_` header is the unconditional fallback and introduces no binding; it explicitly handles the all-false path with Unit. Without it, the match requires a supported proof that its Boolean conditions cover every outcome. The exact proof algorithm remains open. Later conditions and bodies do not run after an arm is selected, and failures do not count as false. An empty fallback in a value match must still satisfy that match's result contract. Subject-based `_` remains an ordinary binding, as described below.

## Explicit ignore

```text
match status {
    .Ready { start() }
    _ {}
}
```

The existing _ is an unconstrained readable binding that accepts the remaining whole subject. Its unused-name permission makes nonuse intentional. The empty body returns Unit by the ordinary block rule. Writing _ { Unit } is equivalent; the explicit Unit is optional, not required syntax.

These braces are an executable arm body. They are distinct from an empty record initializer such as user: User = {}, which constructs record data using its defaults. A match expected to return a record does not turn its empty arm bodies into default record values.

A specific ignored case can likewise have an empty body:

```text
match attempt {
    .ok(value) { use_value(value) }
    .err {}
}
```

The lowercase .err is a tag-only case pattern, introducing no error-payload binding. Both outcome sides are explicitly handled. This is ordinary Result matching, not implicit propagation or panic recovery.

## Value matches still need compatible results

An empty branch produces Unit; it does not supply an arbitrary missing String or integer:

```text
/* Rejected: the catch-all cannot supply the required String. */
label: String = match status {
    .Ready { "Ready" }
    _ {}
};
```

Provide a compatible fallback or an explicit exit:

```text
label: String = match status {
    .Ready { "Ready" }
    _ { "Other status" }
};
```

An expected result contract must admit Unit to accept an empty result branch. Without an expected result contract, a genuine Unit arm participates in the normalized result union under selected [branch-result inference](branch-result-inference.md). A return/propagation exit provides no local continuation value and is checked against its exit target instead.

## Remaining subjects and coverage

For a closed union of distinct members, an unguarded whole-type arm handles that member and later arms see the remainder. With a stable initialized String | Float | Int subject, : String followed by _ gives the fallback binding Float | Int; the original stable subject name is narrowed to the same remainder there. Failed bindings never enter that scope. A guarded type arm or payload/literal/comparison restriction does not remove the full type unless its entire region is proved handled. This selected negative information does not claim a complete arbitrary-pattern coverage algorithm; see [remaining subject narrowing](type-tests-and-narrowing.md#remaining-subject-types-across-match-arms-selected).

## Coverage boundaries

- A closed enum must cover its cases. A tag-only arm covers every payload of its case.
- A closed union must cover every admitted alternative, accounting for type overlap under the eventual type-test contract.
- Bool can be covered by true and false. Irrefutable product patterns can cover an entire known tuple/record contract.
- Guarded arms do not by themselves prove coverage of their whole structural pattern. Include unguarded remaining cases or an explicit fallback unless a specified proof establishes otherwise.
- Runtime equality operands, arbitrary predicates, strings/numbers, and open interfaces generally need a fallback unless a supported coverage proof establishes completeness.
- New closed cases should invalidate a previously explicit complete enumeration. A broad fallback deliberately handles future cases and may hide that addition signal.

Source-order first-success selection remains unchanged. A catch-all before a more specific arm prevents that later arm from being selected; exact unreachable/impossible-pattern diagnostics and the coverage algorithm remain to specify.

## Related concepts

- [Match](match.md), [guards](match-guards.md), [blocks and results](blocks-and-results.md), and [Unit](unit.md).
- [Enum patterns](enums-and-variants.md), [Result](result-and-errors.md), and [pattern contexts](pattern-contexts.md).
