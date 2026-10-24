# Optional leading separators

Status: **selected 2026-10-24 for conditional and/or chains and plain-union type expressions; intersection-type semantics and complete recursive parsing remain open**. This is a documentation-level language decision, not an implemented parser or formatter claim.

## Purpose

Let every entry in a chain have the same visual shape, including the first. A leading separator makes lines easy to add, remove, reorder, and align without giving the first entry special punctuation. This redundancy is optional; compact forms remain equally valid.

## Conditions

```text
if
    and connected
    and authenticated
    and permitted
{
    proceed()
}

if
    or cached
    or available_locally
    or downloadable
{
    load()
}
```

Assume existing Bool flags and Unit-producing handlers. At the start of a complete condition, permit one optional leading `and` or `or`. Removing that token produces exactly the same condition:

```text
if and a and b { act() }
if a and b { act() }

if or a or b { act() }
if a or b { act() }
```

Each pair is equivalent. A single real operand is sufficient: `if and ready` and `if or ready` both test `ready`. The leading token is punctuation in this position, not a unary operator or an implicit true/false operand. It introduces no evaluation, binding, alternative, or result value.

This applies to `if` and `else if` conditions and to subject-based match-arm guards after their `if` separator, which already reuse the same condition grammar. It also applies at the start of an explicitly parenthesized condition group:

```text
if
    and connected
    and (
        or administrator
        or owner
    )
{
    proceed()
}
```

Each condition/group has its own optional leading token. Parentheses establish the nested group; indentation does not. This selection does not add leading operators to ordinary Boolean value expressions, loop headers, subjectless match expression headers, or pattern alternatives. Their extension remains a separate decision. In particular, an ungrouped interior operand cannot start another leading-separator sequence.

### Precedence and effects

After removing the optional leading token at each selected boundary, parse and check the remaining condition normally. `and` still binds more tightly than `or`:

```text
if or a and b or c { act() }
if (a and b) or c { act() }
```

These conditions are equivalent. The leading token does not select a different grouping, require a homogeneous chain, or turn the rest of the condition into an all/any operation. Parenthesize the intended group when mixing operators.

Preserve left-to-right evaluation, short-circuiting, source evaluation counts, effects, failures/exits, ordered shadowing, and all existing successful/failed-path narrowing and binding joins. For example:

```text
if
    and .Some(user) := find_user(id)
    and user.active
{
    greet(user)
}
```

Assume `find_user` returns `Option<User>`, `User.active` is `Bool`, and `greet` returns `Unit`. Evaluate the source once when reached. The binding `user` exists for the active test and successful body only after matching succeeds, exactly as without the leading `and`. A leading `or` creates no empty alternative and contributes no `Unit` to alternative-local binding types. See [conditional pattern chains](condition-chains.md).

## Plain-union types

In an established type-expression context, a plain-union chain permits one optional leading `|`:

```text
Value := type
    | String
    | Int
    | Float;

Compact := type String | Int | Float;
Grouped := type (| String | Int) | Float;
Single := type | String;
```

`Value`, `Compact`, and `Grouped` denote the same type. `Single` denotes `String`. The `type` keyword establishes the alias's type context; an annotation or explicit type grouping can likewise supply type context. This is not a new alias spelling or a value-expression operator.

The leading `|` introduces no empty member, `Unit`, bottom type, or fresh nominal identity. Plain-union normalization and existing precedence with fallible type `!` are unchanged. Each union chain, including a grouped chain or a union operand of a fallible type, has its own optional leading `|`. For example, `Outcome := type (| String | Int) ! (| ReadError | ParseError);` has the same type as the form without those two leaders. See [type aliases](type-aliases.md), [union normalization](union-normalization.md), and [fallible type grouping](fallible-types-and-error-composition.md#grouping).

The same presentation is intended for a leading `&` if intersection types are selected. This decision does not establish public intersection syntax, its semantics, or its precedence. Illustrative simultaneous-failure aggregates using `A & B` do not establish intersection types or gain a leading `&` through this rule.

## Boundaries and rejected forms

- Require at least one real condition operand or union member. A leading separator alone does not form a condition or type.
- Permit at most one leading separator at each admitted boundary. Do not stack leading `and`/`or` tokens or repeat leading `|` tokens.
- Retain every interior separator and operand. A trailing separator is not selected.
- Whitespace, indentation, comments, and line breaks do not create or change these boundaries. The same forms work on one line or many.

```text
/* Invalid: no real operand/member. */
if and { act() }
if or { act() }
Empty := type |;

/* Invalid: stacked or interior leading separators. */
if and and ready { act() }
if or and ready { act() }
if a and or b { act() }
if a or and b { act() }
Invalid := type | | String;
InvalidInterior := type String | | Int;

/* Invalid: missing final operand/member. */
if a and { act() }
InvalidTail := type String |;
```

Ordinary item and list separators retain their own contracts. A leading `|` is unrelated to duplicate type-member normalization, repeated semicolons, or optional boundary commas in call inputs. No general permission to repeat arbitrary punctuation follows.

## Grammar and tooling

The [grammar sketch](grammar-sketch.md#conditionals) puts the optional condition leader on the complete condition production, outside its precedence ladder. The [type fragment](grammar-sketch.md#optional-leading-union-separator-selected) places `|` on a nonempty union chain. This prevents accidental admission of leading operators after every interior `and`/`or` token.

Formatting can align the entries and place braces consistently without changing meaning. A policy for preserving, adding, or removing optional leading separators remains open; no formatter implementation is claimed. Diagnostics should identify the missing operand or extra separator at the relevant token. These examples require future parser/type-checker conformance tests; documentation checks do not verify execution.
