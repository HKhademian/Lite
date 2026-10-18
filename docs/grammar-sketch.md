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

Every valid identifier beginning with underscore, including standalone `_`, is an ordinary readable name and explicitly permits nonuse without unused-name warnings. This is a diagnostic rule, not another binding production or permission to ignore a separate required-use contract; see [unused-name intent](unused-name-intent.md).

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
                 { closed_item { ";" } | simple_item ";" { ";" } }
                 [simple_item]

item := declaration
      | assignment
      | exit
      | expression
```

`closed_item` and `simple_item` are disjoint categories of `item`. A `closed_item` is a complete unparenthesized block construct, including its attached clauses, or a declaration, assignment, or exit whose outer expression ends directly in one. Examples include a standalone block, an `if` chain, a `match`, a loop with hooks, and a binding initialized by a function or type body. A `simple_item` is any other item.

The sketch allows leading extra separators and repeated separators after simple items. A final simple item may omit its separator before the enclosing `}` or end of file. A closed item ends itself and permits optional trailing separators. Separators are not AST items and do not produce `Unit`. Declarations and assignments remain items, not general value expressions.

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
declaration := [binding_modifiers] inferred_source_pattern ":=" expression
             | [binding_modifiers] pattern ":" type "=" expression

binding_modifiers := "mut" | "var" | "var" "mut"

assignment := assignable "=" expression
            | assignable update_operator expression

function := "fn" "(" [parameters] ")" [":" type] block

typed_parameter := ["mut"] pattern ":" type
```

inferred_source_pattern denotes a pattern whose outermost form is not the typed binding identifier : type. Thus `age: Int = source` is the selected whole typed declaration and `age: Int := source` is rejected. A structural source pattern can still contain typed subpatterns, such as `(age: Int, name) := pair`; its outer form is a tuple pattern, not a whole typed binding. Complete recursive productions remain open, but must preserve this selected restriction rather than introduce a second typed spelling.

The typed-parameter production shows the selected `mut` prefix; the complete parameter list, including inferred types, defaults, and parameter rebinding, remains open. Full lvalue grammar, generics, public modifiers, and the distinction between type expressions and ordinary values also remain open. Refutable patterns cannot be assumed valid declarations without a failure contract.

No modifiers means a fixed binding with read-only access. `var` permits whole-binding reassignment; `mut` permits held-data updates through the binding, subject to field, element, and ownership permissions. `var mut` permits both; `mut var` and repeated modifiers are rejected. Affected function parameters explicitly carry `mut`; a method receiver follows the same rule once its full declaration notation is defined. No additional function-level mutation marker is required.

Standalone `_` is an ordinary binding identifier, not a separate wildcard production. Repeated names in one pattern shadow in recursive written order; the final occurrence is visible and each binding keeps its own type. `_ := expression` evaluates its initializer and produces Unit as an ordinary declaration. `_ = expression` assigns the visible binding and requires var, not discard semantics. See [pattern binding and shadowing](pattern-shadowing.md) and [underscore bindings and skips](wildcards-and-skips.md).

## Records

```text
record_type := "record" "{" record_field_sequence "}"
record_field := identifier ":" type
```

The selected declaration surface is `Student := record { name: String; grade: Int; }`. The record_field_sequence placeholder uses explicit semicolons between fields and permits a final separator inside the body. The complete declaration permits an optional trailing semicolon. Fields form a declaration body, not an executable tail-value block. Field modifiers, defaults, construction, generics, and the complete field-list grammar remain open; see [records](records.md).

The [initialization overview](record-initialization.md) proposes field: Type = defaultExpression, recursive valid-default filling, simple typed declarations without explicit initializers, and unnamed record field types. Those extensions are not yet added to these selected productions; executable {} retains its Unit result, distinct from explicitly headed TypeName {} construction.

Selected record forms and field-list fragments:

```text
record_initialization_field := identifier "=" expression
named_record_pattern := "{" [named_record_fields] "}"
named_record_fields := named_record_clause { "," named_record_clause } [","]
named_record_clause := pattern "=" identifier
                    | identifier "==" pattern_value_operand
                    | identifier ":" type
```

The general matching clause is destinationPattern = sourceField, not the earlier reverse mapping. The right identifier selects a field from the source record contract; it is not outer lexical value lookup. Named pattern braces have no record type head: TypeName { ... } is not a named-record pattern production, including in nested patterns. Nominal tests use the existing colon type-test forms. Equality shorthand binds nothing; typed shorthand type-tests and binds the same-named field. Type-only testing is : Type = field; typed aliasing is localName: Type = field.

Bare identifiers still bind in pattern positions. In a match arm, a name followed by braces is a binding followed by its arm body, not a headed record pattern; type-name lookup or capitalization does not change this parse. The proposed bare field-entry shorthand `{ name, age }` and bare-brace record type declarations are not added to these productions; see [record syntax investigation](records.md#proposed-same-name-field-shorthand).

Construction uses TypeName { field = expression, ... }, or just { field = expression, ... } when a unique expected record type is known, including in an annotated binding and nested record field initializer. Explicit type heads remain allowed in construction. Full data-brace versus executable-expression-block disambiguation still needs productions, especially empty/single-field cases. Control-flow/function body positions always remain blocks. Do not silently select anonymous record types or type-check-dependent parses.

Trailing commas are optional and allowed; complete field-list omission, defaults, partial schemas, nominal/structural matching, and ownership remain separate contracts. See [records](records.md) and [aggregate clauses](aggregate-patterns.md#named-field-clauses).

## Enums

```text
enum_definition := "enum" [":" type] "{" enum_case_sequence "}"
plain_enum_case := identifier ["=" expression]
```

The backing-type clause and each case value are independently optional, including mixed explicit/omitted values. A written backing type requires the colon. enum_case_sequence uses the selected separator/trailing-separator rules; payload declarations and full case productions remain incomplete. Inferred/default backing types, automatic values, constant expressions, and duplicate codes need separate semantic contracts. See [optional enum type and values](enums-and-variants.md#independently-optional-type-and-values).

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
pattern_condition := inferred_source_pattern ":=" condition_value_operand
                   | identifier ":" type "=" condition_value_operand

binding_pattern := identifier
type_match_pattern := ":" type
value_match_pattern := "==" pattern_value_operand
typed_binding_pattern := identifier ":" type
```

The := separator belongs to pattern_condition, not to pattern. Therefore the same case/value-test pattern appears as `if .Some(== outValAge) := find_user_age(id)` or directly as `.Some(== outValAge) { ... }` in a match arm. Typed conditions use the separate selected identifier : type = source form; identifier : type := source is rejected by the same inferred_source_pattern restriction as ordinary declarations. Nested typed constraints remain valid, as in `if .Some(age: Int) := source`. Bare .Some in a pattern is now selected to test only the tag with no payload binding; arbitrary refutable receiver patterns still need a mismatch contract. See the [operator-placement audit](pattern-contexts.md#operator-placement-audit).

The existing-name test resolves a name already in scope and refines knowledge about its value without introducing a binding. The declaration-shaped forms reuse declarations without `let`; they evaluate their source once and bind new names only on a successful match. `Some(value)` illustrates refutable destructuring; `name: Type` illustrates union narrowing. Plain Boolean conditions still require `Bool`. Policy for irrefutable conditional patterns and modifiers remains open. Existing-name test precedence and broader logical flow remain open; see [type tests and narrowing](type-tests-and-narrowing.md). Ordinary conditionals do not use `then` or `endif`.

The selected and chain evaluates operands in order and exposes successful pattern bindings to later operands and the body, never the failed branch. The condition operand placeholders exclude ungrouped top-level logical separators; nested grouping can contain ordinary Boolean and/or expressions. In `Some(user) := find_user(id) and user.age > 14`, the pattern source ends before and. Full productions remain incomplete; binding-producing or/not, rebinding across separate operands, and general type-test precedence are not selected here. Repeated names within each individual pattern use selected ordered shadowing. See [conditional pattern chains](condition-chains.md).

## Match

```text
match_expression := "match" expression "{" match_arm { match_arm } "}"
match_arm := pattern { "and" condition_operand } block { ";" }
contextual_enum_case := "." identifier [ "(" [pattern_list] ")" ]
```

Omitting the entire parenthesized payload-pattern list selects a tag-only pattern, even for a case that carries payloads. Thus `.Some` tests the tag without binding its payload, consistently in if, match, and nested patterns. This does not permit constructing Some without a value or settle partial/empty payload lists, constructor arity, or receiver mismatch policies; see [tag-only patterns](enums-and-variants.md#tag-only-patterns).

The [keyword-placement alternative](match-keyword-placement.md) `expression match { ... }` is under review and is not a production or alias in this sketch. It would require explicit precedence and block-continuation rules; whitespace cannot choose the subject boundary.

Each arm may extend its initial pattern with and-chained conditions or explicit pattern bindings of other expressions. Bindings flow left to right to later operands and the body; false/mismatch tries the next arm. Choose the first fully successful arm. See [match arm chains](match-guards.md). Each arm has a braced body, with no case/arrow delimiter or required separator between arms; trailing semicolons after arm bodies are allowed. The complete match is a block-value construct: it ends its item with an optional trailing semicolon, and continuing its value requires parentheses. Its input is evaluated once and bindings are local to the selected arm. Conditional and match patterns share the same pattern concepts, including `binding: Type`.

This sketches the selected arm surface, not a full pattern parser. Every match must be exhaustive, including actions. An unconstrained _ binding supplies the catch-all, and _ {} explicitly ignores remaining subjects with Unit. A separate else fallback, overlaps, exact type versus subtype tests, and detailed coverage proofs remain open. See [match](match.md) and [union type patterns](union-patterns.md).

The full pattern grammar must cover equality, plain enum cases, payload-bearing cases, destructuring, and type tests. The base spellings are selected: name binds, `: Type` type-matches, and `== expected` value-matches. Full operand boundaries, recursive composition, enum declarations, and record-pattern delimiters remain open. See [match pattern capabilities](match-patterns.md).

Bare identifiers in pattern binding positions introduce names; they do not become equality or type tests through lookup or capitalization. Use `.None` for the absent Option case, not bare None. Existing Some(value) constructor heads remain explicit payload patterns. The [pattern primitives](pattern-bindings-and-tests.md) select `== expected` value tests and `: Type` type-only patterns, neither of which binds a name. `name: Type` combines binding and type matching. The pattern_value_operand placeholder still requires complete expression-boundary/precedence rules; these productions describe the chosen forms without claiming a complete parser.

Typed component patterns are selected within destructuring, as in `(x: Int, y: String)` and constructor payloads containing that tuple pattern. The same pattern can appear as a match arm or before `:=` in a conditional. The whole pattern succeeds only when all required structural and type constraints hold; it is not a converting cast. This composition requirement does not complete the recursive pattern parser, record syntax, or ownership contract.

An annotation constrains its component; other binding types are inferred by narrowing the entire input against the pattern and projecting each binding's concrete type or union from the compatible portions. Composite alternatives remain intact. This is a semantic requirement, not additional syntax or a match-arm result-union rule; see [pattern binding inference](pattern-binding-inference.md).

The proposed whole-value pattern `y: (a, b: str, c)` and `...rest` capture are not added as productions yet. A nested tuple pattern after colon must be distinguishable from any tuple-type annotation, independently of whitespace or identifier casing. Rest tokenization and result typing also need a contract. See [whole-value/nested/rest patterns](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).

The [pattern context review](pattern-contexts.md) distinguishes shared pattern forms from per-construct mismatch behavior. Loop receiver patterns must be irrefutable; selection belongs in the body. The corresponding parameter and completion/recovery receiver policy remains proposed. A pattern placeholder does not silently select filtering, runtime dispatch, unchecked unwrap, or automatic propagation.

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

Every receiver slot must use a pattern irrefutable under its input contract. Reject a loop receiver that can fail; this applies in all source modes. Refutable patterns belong in if/match inside the body. This semantic constraint does not prohibit tuple destructuring with a statically guaranteed shape. Filtering-header and other mismatch alternatives are [documented as deferred](loop-pattern-alternatives.md).

Separate receiver slots bind names from left to right, traversing nested slot patterns recursively; later same-named bindings shadow earlier ones. `_` follows this ordinary rule: `as _, _, acc` leaves `_` naming count, and `as _, _, _` leaves it naming the accumulator. A hook receiver such as `then(_)` binds readable `_`. The full parameter and member declaration-list rules remain separate.

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
