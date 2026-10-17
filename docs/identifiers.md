# Identifiers

Status: **Unicode names and readable `_` accepted; XID profile and case sensitivity proposed; normalization and Unicode version open**.

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

## The name `_`

`_` is a readable binding name, not a reserved wildcard or a write-only discard target.

```text
_ := 42;
print(_);
```

Bindings named `_` follow the usual typing, `var`/`mut` capabilities, and lexical lookup rules. Repeated names in a loop's ordered receiver list shadow from left to right; this applies to `_` and to other receiver names. The last receiver with that name is visible in the header and body, subject to the ordinary phase-availability rules.

```text
loop items: _, _, _ {
    inspect(_);
    Unit
}
```

Here `_` names the third slot, the previous accumulator `Option<T>`. It does not name the item, count, or a tuple containing all three. `:` is the candidate receiver separator used in this example; choosing it over `as` remains a separate decision.

Nested bindings may shadow `_` just as they shadow another name. Leaving it unread is allowed by the binding semantics; unused-binding diagnostics remain a tooling decision. Repetition within a single destructuring pattern, rather than across receiver slots, is not settled by this rule.

`_ = value` is ordinary whole-binding assignment and requires `var _`; `mut _` alone is insufficient. It is not a special discard operation. Declaring `_ := value` produces `Unit`, like any declaration, while retaining a readable binding. Held-data updates through `_` instead require `mut` and the target's other permissions.

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
