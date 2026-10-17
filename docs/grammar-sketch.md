# Provisional grammar sketch

Status: **descriptive outline, deliberately incomplete and not implementation-ready**.

## Purpose

Collect the current surface direction in one place without disguising unresolved inference, pattern, and clause rules as a complete specification.

`[x]` below means optional notation; `{x}` means repetition in grammar productions. Quoted braces and punctuation are literal tokens. The code examples elsewhere use source braces normally.

## Item separation

```text
program := { ";" | item ";" } [item]
block   := "{" { ";" | item ";" } [item] "}"

item := declaration
      | assignment
      | exit
      | expression
```

This shape allows extra separators and an omitted trailing separator. Separators are not AST items and do not produce `Unit`. Declarations and assignments are items, not general value expressions.

## Declarations

```text
declaration := ["var"] pattern ":=" expression
             | ["var"] pattern ":" type "=" expression

assignment := assignable "=" expression
            | assignable update_operator expression

function := "fn" "(" [parameters] ")" [":" type] block
```

The full lvalue grammar, parameter declarations, generics, public modifiers, and distinction between type expressions and ordinary values remain open. Refutable patterns cannot be assumed valid declarations without a failure contract.

## Conditionals

```text
conditional := [tag] "if" condition block
               { "else" "if" condition block }
               [ "else" block ]
               [ finally_clause ]

condition := boolean_expression | pattern_condition
```

The current pattern-condition example is `if let pattern = expression`. Whether that is the final spelling is open. Ordinary conditionals do not use `then` as a separator and do not require `endif`.

## Loops

```text
loop := [tag] "loop" [source] [receivers] block
        [then_clause] [else_clause] [finally_clause]

receivers := "as" pattern ["," pattern ["," pattern]]

then_clause    := "then" ["(" pattern ")"] block
else_clause    := "else" ["(" pattern ")"] block
finally_clause := "finally" ["(" pattern ")"] block
```

`as` is working notation. `:` remains a candidate, and the final language should not accidentally acquire both spellings by treating this sketch as normative. The seeded receiver form is not specified.

Source expression type selects Boolean reevaluation or iterable evaluation-once. Omitted source means unconditional iteration. There is no post-condition production.

The hook productions show explored syntax. Receiver payloads and `then`/`else` composition are still open; grammar acceptance cannot settle those semantics.

## Tags and contexts

```text
tag := "@" identifier
tagged_block := tag block

context_access := "." field
                | "@" identifier "." field
```

Named tags are prefixes on the construct. Leading-dot access resolves only against the current context, without outward field search. Body braces belong to their construct and do not add another wrapper context.

The tag scope includes its header, so a loop condition may reference initialized count or accumulator state even when receiver declarations follow the source textually. Current items are not available before body entry.

## Exits

```text
return_exit := "return" ["@" identifier] [expression]
break_exit := "break" [expression]
continue_exit := "continue" [expression]
               | "continue" "@" identifier [expression]
```

`break value` and labeled contribution-bearing continuation are shown as possibilities whose final retention needs confirmation. The established targeted exit is `return @tag [value]`. Exits cannot cross function/closure boundaries. A missing return payload means `Unit`.

## Logical grouping

```text
logical_or  := logical_and { "or" logical_and }
logical_and := logical_not { "and" logical_not }
logical_not := "not" logical_not | comparison
```

Comparison binds more tightly than `not`. Arithmetic, comparisons, ranges, calls, member access, literals, type syntax, and pattern grammar are intentionally not completed here. Comparison chaining still needs an explicit policy.

## Open parser interactions

- A body-opening brace must not be confused with a record literal or trailing closure in a source/condition.
- Prefix tags must be distinguishable from targeted exits and context references through grammar, not whitespace.
- `Unit` in type and expression positions needs a deliberate built-in rule.
- Adjacent string literal tokens join before ordinary expression separation is interpreted.
- Match arms and typed hook-dispatch chains have no selected production.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Decisions and open questions](decisions-and-open-questions.md)
- [Odin grammar](https://odin-lang.org/spec/grammar/) and [Zig grammar](https://ziglang.org/documentation/master/#Grammar) were useful comparison references. This is not a grammar translation of either language.
