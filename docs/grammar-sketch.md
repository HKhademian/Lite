# Provisional grammar sketch

Status: **descriptive outline, deliberately incomplete and not implementation-ready**.

## Purpose

Collect the current surface direction in one place without disguising unresolved inference, pattern, and clause rules as a complete specification.

Angle-bracket generic examples elsewhere are [temporary documentation notation](generic-notation.md), not productions selected by this sketch. Generic declaration/application syntax is deferred. In particular, `Array<Float, 3>` does not settle how type parameters or compile-time value parameters will be expressed.

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

`closed_item` and `simple_item` are disjoint categories of `item`. A `closed_item` is a complete unparenthesized block construct, including its attached clauses, a complete record-construction expression, or a declaration, assignment, or exit whose outer expression ends directly in either form. Examples include a standalone block, an `if` chain, a `match`, a loop with hooks, and a binding initialized by a function or type body. A `simple_item` is any other item.

The sketch allows leading extra separators and repeated separators after simple items. A final simple item may omit its separator before the enclosing `}` or end of file. A closed item ends itself and permits optional trailing separators. Separators are not AST items and do not produce `Unit`. Declarations and assignments remain items, not general value expressions.

The exact expression productions implementing this classification remain part of the incomplete expression grammar. The classification must follow syntactic structure, not a scan for the last `}` character: import-list braces and blocks/record constructions nested inside calls or groupings do not end the enclosing item.

## Block-value continuation

```text
grouped_block_value := "(" block_value_construct ")"
```

`block_value_construct` denotes an expression-producing block, conditional, match, loop, or function literal. The same grouping requirement applies to record construction, including contextual initialization where its expected type is established. See [record literal boundaries](record-literal-boundaries.md); standalone inferred literals still need syntactic disambiguation. Continuing that value with an operator, call, member access, or indexing requires the grouped form. Grouping allows ordinary expression continuation and ordinary item separators:

```text
answer := ({ calculate() }) + 1;
result := (fn(x: Int): Int { x * 2 })(3);
name := ({ make_user() }).name;
```

Without grouping, a completed block item ends before any following suffix; the following tokens must form a separate valid item. Newlines never choose between those readings. Within a complete conditional or loop, attached clauses are parsed before deciding that the item has ended.

## Declarations

```text
declaration := [inferred_binding_modifiers] inferred_source_pattern ":=" expression
             | ["var"] pattern ":" type "=" expression
             | ["var"] identifier ":" type
             | ["var"] identifier ":" type "=" "?"

inferred_binding_modifiers := "mut" | "var" | "var" "mut"

assignment := assignable "=" expression
            | assignable update_operator expression

function := "fn" "(" [parameters] ")" [":" type] block

typed_parameter := pattern ":" type

mut_qualified_type := "mut" type_operand
var_qualified_access := "var" type_operand
```

inferred_source_pattern denotes a pattern whose outermost form is not the typed binding identifier : type. Thus `age: Int = source` is the selected whole typed declaration and `age: Int := source` is rejected. A structural source pattern can still contain typed subpatterns, such as `(age: Int, name) := pair`; its outer form is a tuple pattern, not a whole typed binding. Complete recursive productions remain open, but must preserve this selected restriction rather than introduce a second typed spelling.

The no-initializer alternative applies only to simple typed value declarations. It immediately supplies the type's valid all-zero value, equivalent to explicitly writing = 0; it bypasses declared field defaults. All types must define a valid zero mapping, so no zeroability eligibility restriction applies. It does not introduce source-free destructuring, optional function arguments, or late first assignment. Inferred name := still requires a source. Conditional type tests, parameter lists, and record-field declarations retain their own contexts and contracts. A declaration without an initializer is a simple item and follows the existing separator rules.

The = ? alternative is the selected explicit reserved-storage marker for a simple typed value declaration. It supplies no initialized payload and is not a general expression, ordinary assignment right-hand side, inferred ?Type expression, or ?= declaration operator. Its first whole-value assignment uses the existing = production without requiring var, provided the target is uninitialized on every reaching path. Before ordinary value use, every reaching path must have initialized it. Subsequent replacement requires var. Partial/callee construction, layout eligibility, allocation policy, and complete state/cleanup rules remain open; see [first initialization](first-initialization.md) and [reserved storage](reserved-storage.md). An initialized source declaration remains initialized semantically even if the optimizer omits unobservable physical stores.

The type placeholder admits mut-qualified held-data access and type-side var caller-storage access, as in user: mut User and target: var User. Var replaces the former slot marker. These qualifiers apply to a following type operand, with grouping for composite operands. type_operand and the rest of type parsing remain incomplete; complete mixed access grammar and generic access composition remain open. Inferred parameter value types and defaults remain open: fn(param: var) is meaningful only where the eventual inference rules can determine the omitted value type. Left-side fn(var param: T) headers for local rebinding are omitted; use declarations inside the body. Full lvalue grammar, generics, public modifiers, and type-expression/value distinctions remain open. Refutable patterns cannot be assumed valid declarations without a failure contract.

No modifiers means a fixed binding with read-only access. var permits whole-binding reassignment; mut permits held-data updates through the binding, subject to field, element, and ownership permissions. Inferred var mut permits both; its typed counterpart is var user: mut User. Typed mut user: User and var mut user: User are superseded, rather than aliases. Inferred mut var and repeated modifiers are rejected. Typed parameters explicitly carry mut after the colon; a method receiver follows the same rule once its full declaration notation is defined. No additional function-level mutation marker is required.

Sequential ordinary local declarations may shadow earlier names in the same block. Resolve an ordinary initializer before introducing its new names. This does not select recursive function initialization or duplicate parameter/field-list entries. A mutable declaration from an existing copyable record creates a shallow mutable copy, including inline nested records but preserving reference targets and permissions; see [local shadowing and copies](local-shadowing-and-copies.md).

Standalone `_` is an ordinary binding identifier, not a separate wildcard production. Repeated names in one pattern shadow in recursive written order; the final occurrence is visible and each binding keeps its own type. `_ := expression` evaluates its initializer and produces Unit as an ordinary declaration. `_ = expression` assigns the visible binding and requires var, not discard semantics. See [pattern binding and shadowing](pattern-shadowing.md) and [underscore bindings and skips](wildcards-and-skips.md).

## Caller mutation grants

```text
call_argument := expression
               | "mut" mutable_data_argument
               | "var" replaceable_location_argument
```

The last two operand names are semantic placeholders, not complete productions. Mut parameters require explicit mut grants with existing mutable source access; type-side var parameters require explicit var grants with an existing writable caller location. Plain arguments do not grant either caller effect. Each supplied source is evaluated once in the selected left-to-right order. Combined grants and complete operand/overlap rules remain open; see [caller grants](caller-mutation-grants.md) and [var access](var-access-qualifier.md).

## Record declarations

```text
record_type := "record" "{" record_field_sequence "}"
record_field := identifier ":" type
```

The selected declaration surface is `Student := record { name: String; grade: Int; }`. The record_field_sequence placeholder uses explicit semicolons between ordinary fields and permits a final separator inside the body. A field declaration ending in a complete block/record initializer follows the closed-item boundary rule and needs no additional semicolon; full field-default productions remain deferred. The complete declaration permits an optional trailing semicolon. Fields form a declaration body, not an executable tail-value block. Field modifiers, defaults, construction, generics, and the complete field-list grammar remain open; see [records](records.md).

The [initialization overview](record-initialization.md) proposes field: Type = defaultExpression and declared-default filling when a record initializer is supplied. Zero mode bypasses declared defaults and requires valid zero values. Simple typed value declarations select it through an omitted initializer or explicit contextual literal 0. Complete field-default/literal-typing rules remain unformalized. Empty contextual record initialization is selected, as described below; executable {} retains its Unit result.

The proposed nested field type `stats: { points: Int; level: Int = 1; };` uses braces in an explicit type position and omits record there. Distinct identity per record type declaration is selected for inline types too; the shorthand's full type production remains open. This does not remove record from a top-level binding such as Profile := record { ... }.

The selected [zero rule](zero-initialization.md) equates value: Type; with value: Type = 0. Both use universally valid all-zero initialization and bypass declared field defaults. Within initializer expressions, only literal 0 has the special contextual-zero meaning; integer variables and nonzero integer literals are not implicitly converted to records. Special-type zero mappings and complete literal/inference contracts remain open.

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

Empty contextual record initialization is also selected: user: User = {} is record construction, as is a nested empty initializer for an established record field. A match arm or function/if/loop body {} remains executable and produces Unit, even if an enclosing result contract expects a record. This requires distinct initializer/body grammar roles; it does not permit reinterpreting executable bodies by whichever type-check succeeds.

Trailing commas are optional and allowed; complete field-list omission, defaults, partial schemas, nominal/structural matching, and ownership remain separate contracts. See [records](records.md) and [aggregate clauses](aggregate-patterns.md#named-field-clauses).

## Enums

```text
enum_definition := "enum" [":" type] "{" enum_case_sequence "}"
plain_enum_case := identifier ["=" expression]
```

The backing-type clause and each case value are independently optional, including mixed explicit/omitted values. A written backing type requires the colon. enum_case_sequence uses the selected separator/trailing-separator rules; payload declarations and full case productions remain incomplete. Inferred/default backing types, automatic values, constant expressions, and duplicate codes need separate semantic contracts. See [optional enum type and values](enums-and-variants.md#independently-optional-type-and-values).

## Sequence literal defaults

The selected default for a nonempty bracket literal without a more specific expected sequence type is growable List. For example, numbers := [1, 2, 3] infers `List<Int>`. An explicit expected array type can select fixed layout under the eventual array construction rules. Var/mut does not change the literal's inferred collection family, and later operations do not retroactively select another family.

This is a type-inference/default rule, not a complete sequence production. Empty/heterogeneous literals, array/slice type syntax, indexing/slicing grammar, and ownership remain open. Bracketed sequence patterns still use their separately proposed matching contract and do not construct a list. See [sequence storage families](sequence-types.md) and [lists](lists.md).

## Conditionals

```text
conditional := [tag] "if" condition block
               { "else" "if" condition block }
               [ "else" block ]
               [ conditional_then ]
conditional_then := "then" block

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

The existing-name test resolves a name already in scope and refines knowledge about its value without introducing a binding. The declaration-shaped forms reuse declarations without `let`; they evaluate their source once and bind new names only on a successful match. `Some(value)` illustrates refutable destructuring; `name: Type` illustrates union narrowing. Plain Boolean conditions still require `Bool`. Policy for irrefutable conditional patterns and modifiers remains open. Existing-name test precedence and broader logical flow remain open; see [type tests and narrowing](type-tests-and-narrowing.md). The selected `then` follows the complete chain and receives the selected branch or zero result of type `T`; its tail expression yields final type `R`. A tagged conditional's `.value` is readable only inside this block; `.condition` metadata is not exposed for simple conditions or chains. Targeted-return and propagated-failure behavior is selected; the relative placement of an attached `finally` remains open. `endif` is superseded.

The selected and chain evaluates operands in order and exposes successful pattern bindings to later operands and the body, never the failed branch. The condition operand placeholders exclude ungrouped top-level logical separators; nested grouping can contain ordinary Boolean and/or expressions. In `Some(user) := find_user(id) and user.age > 14`, the pattern source ends before and. Full productions remain incomplete; binding-producing or/not, rebinding across separate operands, and general type-test precedence are not selected here. Repeated names within each individual pattern use selected ordered shadowing. See [conditional pattern chains](condition-chains.md).

The earlier [external conditional recovery](conditional-recovery.md) proposal is superseded by [body-owned recovery](body-recovery.md). Do not add an error-catching else(receiver) after the normal conditional chain. Internal body-wide sections are explicitly deferred for the joint cleanup/resource review; no delimiter rule or new production is selected. Plain else remains false selection, ! still returns from the enclosing function/closure, and inner Results are not implicitly unwrapped.

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

The [pattern context review](pattern-contexts.md) distinguishes shared pattern forms from per-construct mismatch behavior. Current loop headers bind only one optional item name; destructuring and selection belong in the body. Parameter and completion/recovery receiver mismatch policy remains proposed. A pattern placeholder does not silently select filtering, runtime dispatch, unchecked unwrap, or automatic propagation.

## Loops

```text
loop := [tag] "loop" [source] [item_binding] block [loop_completion]

item_binding := "as" identifier

loop_completion := "then" block

/* Shared cleanup candidate used above; not a loop completion clause. */
finally_clause := "finally" ["(" pattern ")"] block
```

As is selected spelling for a single optional item name; the earlier colon alternative is retired. There is no header count/value receiver list, tuple-pattern receiver, or completion receiver. Destructuring and refutable selection belong in the body; no header mismatch behavior is implied.

Every loop owns .item, .index, .count, and typed .value metadata, subject to phase availability. Index is zero-based traversal position; count is entered-iteration count. Value is zero-initialized before iteration and internally replaced by a completed tail expression, continue value, or break value. Plain continue and bare break preserve it. The old .acc/Option accumulator and previous-value slots are retired. See [loop value](loop-value.md) for typing and zero rules.

Source type selects Boolean reevaluation or iterable evaluation-once. Omitted source means unconditional iteration. There is no post-condition production. Count and value can be read before the first condition, in the body, and in then. Item/index are available during active iterations and as last-visited metadata in then, not in source/condition evaluation. With zero body entries, then exposes typed zero placeholders for item/index and count 0; completion retention is field-sensitive, so unused last-item state need not be retained.

Then retains the same owning loop context, including on untagged loops, and follows ordinary final-expression rules. Separate loop empty-else/finally and completion-receiver forms are superseded. All-exit cleanup and body-wide recovery remain [deferred](deferred-cleanup-and-resources.md); external whole-loop error handlers remain retired.

## Tags and contexts

```text
tag := "@" identifier
tagged_block := tag block

context_access := "." field
                | "@" identifier "." field
```

Named tags are prefixes on the construct. Leading-dot metadata shorthand applies to the current loop context and never searches outward; inside a conditional, use an explicit loop tag. Conditional result `.value` requires `@tag.value` and is readable only inside the attached `then`; ambiguous leading-dot metadata reads are rejected. Body braces belong to their construct and do not add another wrapper context.

Contextual enum cases also use `.case`, with the owning enum inferred from a single established expected type. The template above shows this selected case surface; pattern_list and full enum productions remain incomplete. Its identical leading-dot token shape requires a deliberate disambiguation rule against metadata; see [inferred case names](enums-and-variants.md#inferred-case-names). Whitespace cannot choose either meaning, and unqualified bare-case contextual lookup is not selected.

The tag scope includes its header, so a loop condition may reference initialized count or typed value state even when receiver declarations follow the source textually. Current items are not available before body entry.

## Exits

```text
return_exit := "return" ["@" identifier] [expression]
break_exit := "break" ["@" identifier] [expression]
continue_exit := "continue" [expression]
               | "continue" "@" identifier [expression]
```

Break value commits a value of body type T, stops the nearest loop, and runs then if present. Bare break preserves .value and follows normal completion. An optional `@tag` selects an enclosing loop explicitly; without it, break targets the nearest loop, tagged or untagged. A break target that is not a loop is invalid. `continue @tag [value]` advances the named loop; with a value, it commits that T value before advancing. An untagged continue targets the nearest loop. `continue` also requires a loop target. Tagged `return` may target a loop, conditional, general result block, or function; plain `return` targets the nearest function/closure. Unsupported operation–target pairs are invalid. Exits cannot cross function/closure boundaries. A missing return payload means `Unit`.

The [throw proposal](error-return-sugar.md) considers throw expression as shorthand for return .err(expression), with a required operand and the nearest function/closure as its target. This is not yet an adopted exit production; it would not introduce dynamic handler search or a tagged-throw form.

## Fallible type templates

```text
success_type ! error_type
success_type!
```

These are selected surface templates, not complete type productions. `T!` expands exactly to `T ! Error`; an explicitly supplied error operand permits a refined contract. `!T` is not a selected spelling. The type context and valid type boundaries distinguish an omitted error operand from a supplied one; spaces and newlines cannot make that decision. An annotation `T` declares no recoverable error channel.

General type precedence, union grouping and composition, complete type-expression grammar, and the full definition of `Error` remain open. See [fallible types and error composition](fallible-types-and-error-composition.md).

### Selected alias form

```text
type_alias := identifier ":=" "type" type_expression
```

The [type alias comparison](type-aliases.md) selected Alias := type TypeExpression. The prefix establishes type context for the whole alias initializer, including unions and fallible types, and creates no fresh nominal wrapper. Direct type binding without the prefix is not an alternate alias spelling. This is a surface production, not a completed type parser; tuple, generic, function-type, scope/cycle, and fresh-record alias boundaries remain open.

Plain-union [normalization](union-normalization.md) is selected independently of precedence: member order does not affect identity, nested plain unions flatten, and duplicate identities disappear after alias resolution. These rules do not flatten Option/Result/enum boundaries, merge distinct nominal records, reorder match arms, or choose an ABI.

## Recoverable error expressions and shared recovery direction

```text
target!
target else { recovery_body }
target else (failure) { recovery_body }
target else (_) { recovery_body }
target else (name: FailureType) { recovery_body }
target else (FailureType) { recovery_body }
```

These are selected surface templates, not complete productions. Postfix `!` extracts one successful Result payload or returns its typed error from the nearest function or closure; it must not silently extract every Result in a chain. It participates in left-to-right postfix chaining, so `load_user(id)!.load_profile()!.name` needs no grouping around each extraction. `!.` is the `!` token followed by the ordinary `.` token, not a nullable-access token; token-separating whitespace changes no meaning.

Receiverless `else`, an untyped readable binding such as `failure` or `_`, and a typed receiver pattern have distinct binding behavior. The first three untyped forms match every failure supported by the target. `_` remains an ordinary readable binding and can be used in the handler. A typed receiver pattern matches only its named failure type: `BoundPanic` handles that panic category, while `Panic` matches the panic family and does not match returned Result errors. An unmatched panic propagates implicitly; an unmatched returned error remains an explicit Result obligation and can be propagated with `!`. Exact grammar precedence, mixed-channel broad receiver typing, nested-operand scope, and cleanup remain open.

Type checking each call argument precedes any claim that an outer recovery clause makes a call valid. If a parameter expects A, an argument of A ! E requires its own explicit recovery/extraction; an outer else does not unwrap it. Passing intact Result data to a Result-accepting parameter remains valid. This does not select panic-capture scope.

The attached `else` form supplies a fallback for every supported failure or filters for one typed failure. When the handler matches, success type `T` and normally completing fallback type `D` form result type `T | D`; omitting the receiver does not suppress the block's result. An ordinary Result expression remains data without implicit extraction. Every escaping recoverable error must be covered by the function's declared contract.

Complete postfix productions, full precedence, nested-operand evaluation scope, and general union typing rules remain open. The recovery clause must be distinguished from conditional and loop `else` through grammar rather than line breaks. Prefix `try` and postfix `?` are superseded as recoverable-error propagation spellings. No capture marker is required; Option propagation remains separate. The selected shared [recovery direction](expression-recovery.md) lets target-level `else` filter typed panics while keeping panic propagation distinct from returned Result data. Complete scope, mixed-channel receiver typing, and assignment attachment remain pending. This is a recovery boundary, not implicit Result conversion. See [propagation and call chaining](propagation-and-chaining.md).

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
