# Identifiers

Status: **Unicode names, ordinary underscore bindings, and underscore-prefixed unused-name intent accepted; XID profile and case sensitivity proposed; normalization and Unicode version open**.

## Purpose

Let programmers name bindings in their own language while keeping identifier recognition separate from scope, shadowing, and mutation rules.

## Working template

```text
identifier := (XID_Start | "_") { XID_Continue }
```

`XID_Start` and `XID_Continue` are Unicode identifier properties. The proposed LiteScript profile adds `_` as an initial character and uses case-sensitive names. Unicode support is accepted; the precise profile is still a proposal. See [Unicode identifier rules](https://www.unicode.org/reports/tr31/).

## Examples

```text
student_name := "Ada";
élève := "Ada";
学生数 := 12;
_temporary := 3;
```

Digits may continue a name but do not begin one under this profile. Punctuation such as `.`, `@`, and `:` remains syntax rather than part of an identifier. Reserved words are recognized separately; their complete list and any escaping form remain open.

## Names versus localized source vocabulary

Unicode names already allow student-authored names in familiar scripts. The
[multilingual learning proposal](multilingual-source-and-learning.md) goes further:
localized keywords, predefined names/APIs, diagnostics, and lessons, with a possible
bridge to simple English. That proposal does not change current keyword lookup,
normalization, scope, or label compatibility. Translation of a user-defined name
needs a scope-aware mapping; visually similar or translated names are not silently
identical. Persian/Arabic letter variants and join controls remain profile and
tooling questions, not newly selected equivalences.

## Names and scope

Identifier spelling determines which name is being referenced. Lexical scope determines which binding of that name is visible across a nested block hierarchy whose outermost level is the invisible-brace file block (with no parent block). As clarified on **2026-11-15**, **same-block shadowing through redeclarations is postponed completely**: two declarations of the same symbol inside one block — even of different kinds — are disallowed for now across both root file blocks and inner `{ ... }` blocks (nested inner `{ ... }` blocks and flow-sensitive type narrowing without redeclaration remain distinct; see [local shadowing and copies](local-shadowing-and-copies.md)).

Pattern bindings may reuse the source value's name. A matching branch can shadow an outer union binding with a narrowed binding; the source expression is resolved before that new name becomes active. The shadow is limited to its matching branch and does not affect sibling branches or outer lookup. See [union type patterns](union-patterns.md) for examples using both same-name shadowing and a distinct pattern name.

An unmarked bare identifier in a pattern binds, even if an outer constant or type uses that name. Capitalization does not turn it into a test. Use `.None` to select the absent Option case; bare None binds. Explicit constructor heads with payload parentheses, such as Some(value), keep their distinct constructor role. Use `: Type` for a type-only match and `== expected` for an existing-value match; see [pattern bindings and tests](pattern-bindings-and-tests.md).

The name after `@` in a tag follows the same identifier character rules. Tags retain their own namespace and construct-specific capabilities.

In every code block (the root file block and inner braced `{ ... }` blocks),
symbol visibility is **parallel at compile time** ("circuit wiring") while
values follow serial execution along the **execution trace**. The
[deferred function-body rule](functions.md#deferred-body-lookup) permits
late reads, writes, type references, and calls across siblings and parent
blocks under one uniform rule, rejecting only uninitialized accesses (such as
reserved `x: Int = ?;` or reading a later binding before its initializer runs).
When no enclosing same-name binding conflicts, the
[direct self-reference case](functions.md#direct-self-reference-without-an-earlier-target)
admits a function's own binding, and an
[explicit self call](functions.md#explicit-current-function-self-calls) targets
the implementation currently executing instead of performing ordinary name lookup.
Only `self(...)` is selected; standalone-value and self-named local/parameter
collisions, mutual recursion, and nested-scope edge cases remain open. See
[executable block items](evaluation-order.md#executable-block-items) and
[module lookup](modules-and-packages.md#module-lookup-without-header-files).

## Underscore-prefixed names, including standalone underscore

`_`, `_user`, and `_left` are ordinary readable identifiers with explicit permission to be unused. Their type, var/mut capabilities, ownership, and scope rules remain ordinary. The prefix does not make declared fields private or skip initialization. See [explicit unused-name intent](unused-name-intent.md).

```text
(first, _, third, _) := tuple;
inspect(_);
```

The second `_` shadows the first, so this read selects the fourth component. Every binding keeps its own inferred type. Repeated names follow ordered shadowing inside patterns, including nested patterns; the rule applies to all names, not only underscores. See [pattern binding and shadowing](pattern-shadowing.md).

```text
loop items as _ {
    inspect(_, .count);
}
```

Here _ is the one optional item name and may be read. Loop count/index/value use metadata rather than extra receiver slots. _ = value is ordinary assignment requiring an existing var binding and compatible value, not discard syntax. Initializer effects and required-use obligations remain intact; see [underscore bindings and skips](wildcards-and-skips.md).

## Case and normalization

The proposed case-sensitive rule distinguishes `score` from `Score`.

Case is stylistic, not semantic. Documentation convention uses UpperCamelCase for types and user-defined enum cases, and snake_case for bindings, functions, modules, and fields. Prelude Option cases `.Some`/`.None` follow enum-case capitalization; prelude Result cases `.ok`/`.err` are the selected fixed exception. Capitalization never selects a binding, test, case, or type. Existing examples may use other casing until normalized; no formatter casing rule is selected.

Normalization is a separate decision from case sensitivity. Before implementation, choose whether canonically equivalent Unicode spellings denote the same identifier, which normalization form applies, and how source spelling is preserved in diagnostics. NFC was suggested but has not been adopted. The relevant forms are defined by [Unicode normalization](https://www.unicode.org/reports/tr15/).

Identifier normalization must not silently establish a normalization rule for string contents.

## Open decisions

- The selected `:/`, `:%`, `:/=` and `:%=` arithmetic symbols retain the user's compact/spaced equivalence requirement. Because the spellings begin with a colon, `a:/b` has exactly one reading, `a` followed by `:/` and `b`; the retired `a_/b` could read as `a_ / b` or `a _/ b`. There is no conflict with `a_` or `_` identifiers and no mandatory-space rule. See [the lexical boundary](arithmetic-methods-and-division-revision.md#compact-and-spaced-forms-must-agree).
- Pin the Unicode version and complete the identifier profile.
- Confirm case sensitivity and normalization behavior.
- Define any restrictions on format-control characters and any identifier escaping syntax.
- Specify reserved words and remaining diagnostic severities/configuration. Underscore-prefixed unused-name permission is selected; unrelated shadowing and required-use diagnostics remain separate.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Loop receivers](loop-receivers.md)
- [Tags and contexts](tags-and-contexts.md)
- [Unicode Standard Annex #31: Unicode Identifiers and Syntax](https://www.unicode.org/reports/tr31/)
- [Unicode Standard Annex #15: Unicode Normalization Forms](https://www.unicode.org/reports/tr15/)
