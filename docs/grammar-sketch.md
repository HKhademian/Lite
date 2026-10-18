# Provisional grammar sketch

Status: **descriptive outline, deliberately incomplete and not implementation-ready**.

## Purpose

Collect the current surface direction in one place without disguising unresolved inference, pattern, and clause rules as a complete specification.

`[x]` below means optional notation; `{x}` means repetition in grammar productions. Quoted braces and punctuation are literal tokens. The code examples elsewhere use source braces normally.

## Comment scanning

Before parsing items, the lexer recognizes [nested and raw comments](comments.md) as token-separating whitespace. A raw opener takes precedence over its ordinary `/*` prefix. Raw fences match their exact hash count; unterminated comments are errors. No comment form inserts `;`.

## Identifier scanning

```text
identifier := (XID_Start | "_") { XID_Continue }
```

This is the proposed Unicode profile, before reserved-word recognition. Case sensitivity is proposed; normalization and the pinned Unicode version remain open. See [identifiers](identifiers.md).

Standalone `_` is a wildcard in pattern positions. A longer valid identifier beginning with underscore remains an ordinary name and explicitly permits nonuse without unused-name warnings. This is a diagnostic rule, not another binding production or permission to ignore a separate required-use contract; see [unused-name intent](unused-name-intent.md).

## Numeric scanning

Fractional literals require a leading digit (`0.5`); `.5` is rejected. Leading-dot context access remains distinct. Other numeric-token productions remain open; see [numbers and ranges](numbers.md).

## Division tokens

`/` is fractional division; `//` is integer division on integer operands. `/=` and `//=` are their corresponding compound-update tokens. In the slash operator family, recognize the longest valid token, including `//=` before its shorter prefixes. Comment openers retain their lexical roles; outside comments and strings, `//` never starts a line comment.

For valid integer operands, `//` rounds toward negative infinity and `%` gives the paired remainder: mathematically, `a == b * (a // b) + (a % b)`. Nonzero integer remainders have the divisor's sign. `//=` and `%=` preserve those semantics. Full arithmetic productions, numeric conversions, noninteger remainder, and failure contracts remain open. See [division](division.md).

## Item separation

```text
program       := item_sequence
block         := "{" item_sequence "}"
item_sequence := { ";" }
                 { closed_item | simple_item ";" { ";" } }
                 [simple_item]

item := declaration
      | assignment
      | exit
      | expression
```

`closed_item` and `simple_item` are disjoint categories of `item`. A `closed_item` is a complete unparenthesized block construct, including its attached clauses, or a declaration, assignment, or exit whose outer expression ends directly in one. Examples include a standalone block, an `if` chain, a `match`, a loop with hooks, and a binding initialized by a function or type body. A `simple_item` is any other item.

The sketch allows leading extra separators and repeated separators after simple items. A final simple item may omit its separator before the enclosing `}` or end of file. A closed item ends itself; a separator after it is rejected. Separators are not AST items and do not produce `Unit`. Declarations and assignments remain items, not general value expressions.

The exact expression productions implementing this classification remain part of the incomplete expression grammar. The classification must follow syntactic structure, not a scan for the last `}` character: import-list braces and blocks nested inside calls or groupings do not end the enclosing item.

## Block-value continuation

```text
grouped_block_value := "(" block_value_construct ")"
```

`block_value_construct` denotes an expression-producing block, conditional, match, loop, or function literal. Continuing that value with an operator, call, member access, or indexing requires the grouped form. Grouping allows ordinary expression continuation and ordinary item separators:

```text
answer := ({ calculate() }) + 1;
result := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
```

Without grouping, a completed block item ends before any following suffix; the following tokens must form a separate valid item. Newlines never choose between those readings. Within a complete conditional or loop, attached clauses are parsed before deciding that the item has ended.

## Declarations

```text
declaration := [binding_modifiers] pattern ":=" expression
             | [binding_modifiers] pattern ":" type "=" expression

binding_modifiers := "mut" | "var" | "var" "mut"

assignment := assignable "=" expression
            | assignable update_operator expression

function := "fn" "(" [parameters] ")" [":" type] block

typed_parameter := ["mut"] pattern ":" type
```

The typed-parameter production shows the selected `mut` prefix; the complete parameter list, including inferred types, defaults, and parameter rebinding, remains open. Full lvalue grammar, generics, public modifiers, and the distinction between type expressions and ordinary values also remain open. Refutable patterns cannot be assumed valid declarations without a failure contract.

No modifiers means a fixed binding with read-only access. `var` permits whole-binding reassignment; `mut` permits held-data updates through the binding, subject to field, element, and ownership permissions. `var mut` permits both; `mut var` and repeated modifiers are rejected. Affected function parameters explicitly carry `mut`; a method receiver follows the same rule once its full declaration notation is defined. No additional function-level mutation marker is required.

Standalone `_` in a pattern is a wildcard and introduces no value binding. It may repeat, including within one tuple pattern, and cannot be read as an expression. A wildcard declaration still evaluates its initializer and produces Unit. `_ = expression` is not selected as a special discard assignment. Longer identifiers containing underscores remain ordinary names; see [wildcards and skips](wildcards-and-skips.md).

## Conditionals

```text
conditional := [tag] "if" condition block
               { "else" "if" condition block }
               [ "else" block ]
               [ finally_clause ]

condition := boolean_expression | and_condition
and_condition := condition_operand { "and" condition_operand }
condition_operand := condition_boolean_operand | existing_name_type_test | pattern_condition
existing_name_type_test := identifier ":" type
pattern_condition := pattern ":=" condition_value_operand
                   | identifier ":" type "=" condition_value_operand

type_pattern := (identifier | "_") ":" type
wildcard_pattern := "_"
```

The existing-name test resolves a name already in scope and refines knowledge about its value without introducing a binding. The declaration-shaped forms reuse declarations without `let`; they evaluate their source once and bind new names only on a successful match. `Some(value)` illustrates refutable destructuring; `name: Type` illustrates union narrowing. Plain Boolean conditions still require `Bool`. Policy for irrefutable conditional patterns and modifiers remains open. Existing-name test precedence and broader logical flow remain open; see [type tests and narrowing](type-tests-and-narrowing.md). Ordinary conditionals do not use `then` or `endif`.

The selected and chain evaluates operands in order and exposes successful pattern bindings to later operands and the body, never the failed branch. The condition operand placeholders exclude ungrouped top-level logical separators; nested grouping can contain ordinary Boolean and/or expressions. In `Some(user) := find_user(id) and user.age > 14`, the pattern source ends before and. Full productions remain incomplete; binding-producing or/not, repeated binding names, and general type-test precedence are not selected here. See [conditional pattern chains](condition-chains.md).

## Match

```text
match_expression := "match" expression "{" match_arm { match_arm } "}"
match_arm := pattern { "and" condition_operand } block
contextual_enum_case := "." identifier [ "(" [pattern_list] ")" ]
```

Each arm may extend its initial pattern with and-chained conditions or explicit pattern bindings of other expressions. Bindings flow left to right to later operands and the body; false/mismatch tries the next arm. Choose the first fully successful arm. See [match arm chains](match-guards.md). Each arm has a braced body, with no `case`, arrow, comma, or semicolon between arms. The complete match is a block-value construct: it ends its item without `;`, and continuing its value requires parentheses. Its input is evaluated once and bindings are local to the selected arm. Conditional and match patterns share the same pattern concepts, including `binding: Type`.

This sketches the selected arm surface, not a full pattern parser. Common fallback patterns, overlaps, exact type versus subtype tests, and detailed exhaustive-coverage rules remain open. `_` is a nonbinding wildcard and may appear as a catch-all pattern. See [match](match.md) and [union type patterns](union-patterns.md).

The full pattern grammar must cover equality, plain enum cases, payload-bearing cases, destructuring, and type tests. These required categories do not select bare-name equality versus binding, runtime-equality pattern punctuation, enum declarations, or record-pattern delimiters. See [match pattern capabilities](match-patterns.md).

Typed component patterns are selected within destructuring, as in `(x: Int, y: String)` and constructor payloads containing that tuple pattern. The same pattern can appear as a match arm or before `:=` in a conditional. The whole pattern succeeds only when all required structural and type constraints hold; it is not a converting cast. This composition requirement does not complete the recursive pattern parser, record syntax, or ownership contract.

An annotation constrains its component; other binding types are inferred by narrowing the entire input against the pattern and projecting each binding's concrete type or union from the compatible portions. Composite alternatives remain intact. This is a semantic requirement, not additional syntax or a match-arm result-union rule; see [pattern binding inference](pattern-binding-inference.md).

The proposed whole-value pattern `y: (a, b: str, c)` and `...rest` capture are not added as productions yet. A nested tuple pattern after colon must be distinguishable from any tuple-type annotation, independently of whitespace or identifier casing. Rest tokenization and result typing also need a contract. See [whole-value/nested/rest patterns](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).

The [pattern context review](pattern-contexts.md) distinguishes shared pattern forms from per-construct mismatch behavior. A `pattern` placeholder in a parameter, loop receiver, or hook production does not silently select filtering, runtime dispatch, unchecked unwrap, or automatic propagation. Their proposed irrefutable binding policy requires confirmation.

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

Separate receiver slots bind ordinary names from left to right and allow later names to shadow earlier ones. `_` instead skips binding a slot: `as _, _, acc` names only acc, and `as _, _, _` names nothing. Repeated wildcards within one pattern are valid; duplicate real-name policy remains separate. A hook receiver such as `then(_)` has a wildcard pattern and introduces no name.

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

Contextual enum cases also use `.case`, with the owning enum inferred from a single established expected type. The template above shows this selected case surface; pattern_list and full enum productions remain incomplete. Its identical leading-dot token shape requires a deliberate disambiguation rule against metadata; see [inferred case names](enums-and-variants.md#inferred-case-names). Whitespace cannot choose either meaning, and unqualified bare-case contextual lookup is not selected.

The tag scope includes its header, so a loop condition may reference initialized count or accumulator state even when receiver declarations follow the source textually. Current items are not available before body entry.

## Exits

```text
return_exit := "return" ["@" identifier] [expression]
break_exit := "break" [expression]
continue_exit := "continue" [expression]
               | "continue" "@" identifier [expression]
```

`break value` and labeled contribution-bearing continuation are shown as possibilities whose final retention needs confirmation. The established targeted exit is `return @tag [value]`. Exits cannot cross function/closure boundaries. A missing return payload means `Unit`.

## Fallible type templates

```text
success_type ! error_type
success_type!
```

These are selected surface templates, not complete type productions. `T!` expands exactly to `T ! Error`; an explicitly supplied error operand permits a refined contract. `!T` is not a selected spelling. The type context and valid type boundaries distinguish an omitted error operand from a supplied one; spaces and newlines cannot make that decision. An annotation `T` declares no recoverable error channel.

General type precedence, union grouping and composition, alias grammar, and the full definition of `Error` remain open. See [fallible types and error composition](fallible-types-and-error-composition.md).

## Recoverable error expressions

```text
result_expression!
result_expression else(error_pattern) { recovery_body }
result_expression else { recovery_body }
```

These are selected surface templates, not complete productions. Postfix `!` extracts one successful Result payload or returns its typed error from the nearest function or closure; it must not silently extract every Result in a chain. It participates in left-to-right postfix chaining, so `load_user(id)!.load_profile()!.name` needs no grouping around each extraction. `!.` is the `!` token followed by the ordinary `.` token, not a nullable-access token; token-separating whitespace changes no meaning.

The attached `else` form, with an optional error receiver, supplies a fallback or explicitly exits. Success type `T` and normally completing fallback type `D` form result type `T | D`; omitting the receiver does not suppress the block's result. An ordinary Result expression remains data without implicit extraction. Every escaping recoverable error must be covered by the function's declared contract.

Complete postfix productions, full precedence, nested-operand evaluation scope, and general union typing rules remain open. The recovery clause must be distinguished from conditional and loop `else` through grammar rather than line breaks. Prefix `try` and postfix `?` are superseded as recoverable-error propagation spellings. No capture marker is required; Option propagation remains separate. Panics do not flow through these Result expressions. See [propagation and call chaining](propagation-and-chaining.md).

See [Result and errors](result-and-errors.md) and [panics](panics.md).

## Logical grouping

```text
logical_or  := logical_and { "or" logical_and }
logical_and := logical_not { "and" logical_not }
logical_not := "not" logical_not | comparison

comparison := comparison_operand { comparison_operator comparison_operand }
comparison_operator := "<" | "<=" | ">" | ">=" | "=="
```

Comparison binds more tightly than `not`; a leading `not` applies to the whole chain. Each comparison operator checks adjacent operands and produces `Bool`; the result of one comparison is not the next operator's operand. Chain operands evaluate at most once in source order, and subsequent comparisons and operands are skipped after a false result. All adjacent comparisons are statically checked. Parentheses establish separate comparisons when required.

`comparison_operand` is a placeholder for expressions binding more tightly than comparisons, including grouping and arithmetic; its full production remains open. With no comparison operator, the production passes through the operand expression. Arithmetic, ranges, calls, member access, literals, type syntax, and pattern grammar are intentionally not completed here. See [comparison chains](comparison-chains.md).

## Evaluation semantics

Ordinary operator operands evaluate left to right after grouping is determined. Calls evaluate the callee first, supplied arguments in source order, then invoke the callable. Short-circuit constructs skip unneeded expressions. Assignment selects its target once before the right-hand side; a compound update reads the selected target's value before its right operand, then computes and writes the result.

These are semantic rules, not consequences of associativity or whitespace. [Evaluation order](evaluation-order.md) records the details and separates them from unchosen argument-passing, aliasing, and cleanup contracts.

## Open parser interactions

- A body-opening brace must not be confused with a record literal or trailing closure in a source/condition.
- Prefix tags must be distinguishable from targeted exits and context references through grammar, not whitespace.
- `Unit` in type and expression positions needs a deliberate built-in rule.
- Adjacent string literal tokens join before ordinary expression separation is interpreted.
- Selected match-arm shapes need complete pattern productions; typed hook-dispatch chains remain exploratory.

## Related concepts and references

- [Lexical structure](lexical-structure.md)
- [Decisions and open questions](decisions-and-open-questions.md)
- [Odin grammar](https://odin-lang.org/spec/grammar/) and [Zig grammar](https://ziglang.org/documentation/master/#Grammar) were useful comparison references. This is not a grammar translation of either language.
