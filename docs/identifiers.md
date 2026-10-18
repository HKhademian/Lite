# Identifiers

Status: **Unicode names and underscore wildcards accepted; XID profile and case sensitivity proposed; normalization and Unicode version open**.

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

The name after `@` in a tag follows the same identifier character rules. Tags retain their own namespace and construct-specific capabilities.

## Standalone underscore

`_` is a wildcard in every pattern. It matches without introducing a value name, may repeat, and cannot be read in an expression. This supersedes the earlier readable-binding rule.

```text
(first, _, third) := triple;
_ := calculate();
```

Both declarations preserve initializer evaluation. The first binds first and third; the second binds nothing. Neither creates a readable `_`. An ordinary identifier such as `_temporary` remains a normal name under the proposed character profile.

Loop receivers can skip names explicitly:

```text
loop items as _, _, acc {
    inspect(acc)
}
```

Ordinary receiver names still shadow from left to right when repeated. Repeated wildcards introduce no names and therefore do not shadow. The item/count/accumulator state remains available through permitted metadata.

Reading `_` is invalid; `_ = value` is not enabled as a special discard-assignment operation. Full modifier validation, ignored-outcome diagnostics, and ownership/drop behavior remain separate contracts. See [wildcards and skips](wildcards-and-skips.md).

## Case and normalization

The proposed case-sensitive rule distinguishes `score` from `Score`.

Normalization is a separate decision from case sensitivity. Before implementation, choose whether canonically equivalent Unicode spellings denote the same identifier, which normalization form applies, and how source spelling is preserved in diagnostics. NFC was suggested but has not been adopted. The relevant forms are defined by [Unicode normalization](https://www.unicode.org/reports/tr15/).

Identifier normalization must not silently establish a normalization rule for string contents.

## Open decisions

- Pin the Unicode version and complete the identifier profile.
- Confirm case sensitivity and normalization behavior.
- Define any restrictions on format-control characters and any identifier escaping syntax.
- Specify reserved words and diagnostics for shadowed or unused names.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Declarations and assignment](declarations-and-assignment.md)
- [Tuples and patterns](tuples-and-patterns.md)
- [Loop receivers](loop-receivers.md)
- [Tags and contexts](tags-and-contexts.md)
- [Unicode Standard Annex #31: Unicode Identifiers and Syntax](https://www.unicode.org/reports/tr31/)
- [Unicode Standard Annex #15: Unicode Normalization Forms](https://www.unicode.org/reports/tr15/)
