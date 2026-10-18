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

## Names and scope

Identifier spelling determines which name is being referenced. Lexical scope determines which binding of that name is visible. A declaration does not become mutable merely because an inner binding can shadow it.

Pattern bindings may reuse the source value's name. A matching branch can shadow an outer union binding with a narrowed binding; the source expression is resolved before that new name becomes active. The shadow is limited to its matching branch and does not affect sibling branches or outer lookup. See [union type patterns](union-patterns.md) for examples using both same-name shadowing and a distinct pattern name.

An unmarked bare identifier in a pattern binds, even if an outer constant or type uses that name. Capitalization does not turn it into a test. Use `.None` to select the absent Option case; bare None binds. Explicit constructor heads with payload parentheses, such as Some(value), keep their distinct constructor role. Equality and type-only test spelling remain proposals; see [pattern bindings and tests](pattern-bindings-and-tests.md).

The name after `@` in a tag follows the same identifier character rules. Tags retain their own namespace and construct-specific capabilities.

## Underscore-prefixed names, including standalone underscore

`_`, `_user`, and `_left` are ordinary readable identifiers with explicit permission to be unused. Their type, var/mut capabilities, ownership, and scope rules remain ordinary. The prefix does not make declared fields private or skip initialization. See [explicit unused-name intent](unused-name-intent.md).

```text
(first, _, third, _) := tuple;
inspect(_);
```

The second `_` shadows the first, so this read selects the fourth component. Every binding keeps its own inferred type. Repeated names follow ordered shadowing inside patterns, including nested patterns; the rule applies to all names, not only underscores. See [pattern binding and shadowing](pattern-shadowing.md).

```text
loop items as _, _, acc {
    inspect(_, acc)
}
```

Here `_` names count; `as _, _, _` would leave `_` naming the accumulator. Omitted trailing receiver slots bind nothing. `_ = value` is ordinary assignment requiring an existing var binding and a compatible value, not discard syntax. Initializer effects and separate required-use obligations remain intact; see [underscore bindings and skips](wildcards-and-skips.md).

## Case and normalization

The proposed case-sensitive rule distinguishes `score` from `Score`.

Normalization is a separate decision from case sensitivity. Before implementation, choose whether canonically equivalent Unicode spellings denote the same identifier, which normalization form applies, and how source spelling is preserved in diagnostics. NFC was suggested but has not been adopted. The relevant forms are defined by [Unicode normalization](https://www.unicode.org/reports/tr15/).

Identifier normalization must not silently establish a normalization rule for string contents.

## Open decisions

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
