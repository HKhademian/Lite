# Provisional grammar sketch

Status: **descriptive outline, deliberately incomplete and not implementation-ready**.

The selected [union initialization restriction](union-initialization-policy.md#selected-rejection-and-explicit-member-choice) rejects x: A | B = 0 for multiple distinct normalized members. Explicit = ? and initialized member expressions remain available. A{0}/B{0} are proposed member-qualified whole-zero constructor markers, requiring a grammar decision; they are not positional record-field lists. A{}/B{} retain default-construction meaning for valid record members. Bare local declarations of normalized multi-member unions require an initialized expression or explicit = ?; omission is rejected.

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

Fractional literals require a leading digit (`0.5`); standalone `.5` is rejected as a numeric literal. Selected tuple member suffixes such as tuple.5 are positional access, not fractional literals. Leading-dot context access remains distinct. Other numeric-token productions remain open; see [numbers and ranges](numbers.md).

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

Documentation and formatter style omit optional separators after a closed item at every nesting depth. This does not alter the grammar's permissive optional separators or remove required separators from simple items; see [semicolon style after closing braces](lexical-structure.md#semicolon-style-after-closing-braces).

The exact expression productions implementing this classification remain part of the incomplete expression grammar. The classification must follow syntactic structure, not a scan for the last `}` character: import-list braces and blocks/record constructions nested inside calls or groupings do not end the enclosing item.

## Block-value continuation

```text
grouped_block_value := "(" block_value_construct ")"
```

`block_value_construct` denotes an expression-producing block, conditional, match, loop, or function literal. The same grouping requirement applies to record construction, including contextual initialization where its expected type is established. See [record literal boundaries](record-literal-boundaries.md); standalone inferred literals still need syntactic disambiguation. Continuing that value with an operator, call, member access, or indexing requires the grouped form. Grouping allows ordinary expression continuation and ordinary item separators:

```text
answer := ({ calculate() }) + 1;
result := (fn (x: Int): Int { x * 2 })(3);
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

function := "fn" [function_input_binding] [":" type] block

function_input_binding := identifier | receiver_header

receiver_header := "(" [receiver {"," receiver} [","]] ")"
receiver := identifier [":" type] | "..." identifier [":" type]

lambda := receiver_header [":" type] block

function_type := "fn" "(" [signature_input {"," signature_input} [","]] ")" ":" type
signature_input := type | identifier ":" type
                 | "..." type | "..." identifier ":" type

mut_qualified_type := "mut" type_operand
var_qualified_access := "var" type_operand
```

The explicit function-type template admits named typed inputs, as in `fn (a: Int): Int!`, and unnamed positional types, as in `fn (Int): Int!`, with no executable body. Its last `type` is the result contract. Parentheses immediately after `fn` in type context denote the input signature, so a one-input signature needs no trailing comma; ordinary tuple type/value/pattern grouping remains unchanged. `function` and `lambda` are expressions usable in declarations, assignments, and call arguments. The outline covers simple local receivers; full nested header patterns, defaults, parameter-name identity, callable variance/capture rules, and complete recursive type grammar remain open. See [functions](functions.md#function-types-literals-and-reassignment).

The 2026-10-24 surface direction is one callable model: `fn (a) { ... }` and `(a) { ... }` share semantics, with the keyword optional only for the parenthesized form. This supersedes the earlier retirement of contextual `fn`. Input shape/types come from annotations, an expected callable, or both; local result inference is available once inputs are known. Independently untyped `(x) { x * 3 }` and `fn (x) { x * 3 }` retain the same unresolved input type. A declaration or assignment ending directly in either body is a closed item with an optional trailing semicolon. Arrows and pipes remain unselected; see [callable input packs](callable-input-packs.md).

Headerless `fn { ... }` and `fn : Ret { ... }` retain expected inputs when present; independently their input tuple is Unit. `fn pack { ... }` gives the whole input tuple a local name, while parenthesized receivers bind components. The implicit `arguments` names the full tuple of the nearest callable, including unnamed inputs. Its complete shadowing/collision and ownership rules remain open. Omitting `fn` from headerless/whole-pack forms is not selected: bare braces already execute, and identifier-plus-braces overlaps record construction.

The arrow-free `(parameters) { body }` lambda is recognized syntactically in ordinary expression positions, before its destination is type-checked. A destination such as Int rejects the lambda instead of changing its parse. Brace-owning construct headers such as `if (condition) { body }` retain their own boundary, and `(T) { ... }` cannot simultaneously denote grouped-type record construction there. Newlines, expected types, and name lookup must not choose the parse. Complete recursive integration remains open; see [lambda boundaries](functions.md#c-arrow-free-lambda-parameter-list-followed-by-a-block-current-direction).

Within that contextual lambda direction, the empty-header meaning is selected: `() { body }` leaves all expected inputs unnamed locally while retaining the expected callable's entire signature. It does not declare zero arity or inject the signature's parameter names into the body. Expected types supply the contract after syntactic recognition; they do not choose whether the tokens form a lambda. Nonempty headers may bind a positional prefix; local result inference is selected below, while unknown-input and recursive result inference remain open. See [header bindings](functions.md#named-underscore-and-empty-headers).

The independent empty-header rule is [selected](functions.md#empty-headers-without-an-expected-callable): zero inputs when no expected callable contract exists, while preserving expected inputs when it does. Thus `constant := (): Int { 42 }` has `fn (): Int`; `ignore_input: fn (n: Int): Int = (): Int { 42 }` retains its one input. This does not introduce variable arity or general stored-callable conversion. Local result inference has its own selected rule below.

Nonempty [partial lambda headers](functions.md#partially-named-input-headers) are selected: bind a positional prefix of expected inputs and leave trailing inputs unnamed, so `(left) { ... }` can implement an expected two-input callable. `(left, _)` remains legal without being required. `(_, right)` selects the second position; names do not select signature positions. Reject more header positions than expected inputs. The public input contract and ordinary argument evaluation, passing, permissions, and cleanup remain intact. General stored-callable adaptation is separate.

Optional lambda signatures are selected: `(a: Int): Int { body }`, with each parameter annotation and the result annotation independently optional where context can supply the missing types. Full annotations on named inputs/results supply an independent signature. Integrate the colon/type grammar with existing construct-header restrictions before formalization. An empty contextual header retains expected inputs even with a result annotation; without an expected callable, it declares zero inputs. See [optional lambda signatures](functions.md#optional-lambda-signatures).

[Independent lambda result inference](functions.md#independent-lambda-result-inference) is selected: infer a nonrecursive local lambda's unambiguous result from its body once input types are established. `(n: Int) { n * 2 }` infers Int and `() {}` infers Unit. Require an annotation when the result is ambiguous. Keep recursive/public signature policy and unknown input types separate; no escaping recoverable error channel is inferred implicitly.

[Mixed local completion payloads](functions.md#mixed-local-result-types) infer a normalized plain union when a nonrecursive local lambda has known inputs and no explicit/expected result contract: an Int return plus a String tail infers Int | String. Existing result contracts constrain all payloads; Result boundaries and explicit escaping-error contracts remain intact. [Conditional and match result inference](branch-result-inference.md) is also selected: without an expected result contract, infer the normalized plain union of normally completing branch/arm results. Preserve allowed single-type missing-else zero(T), actual Unit results, then T/R separation, and match exhaustiveness. The selected [conditional union fallback](conditional-union-fallback.md) requires an explicit fallback for normally reachable unmatched multi-member union completion; exhaustive chains construct their selected member without initial undirected union zero.

Callable capture/context design and environment context such as allocators are [postponed](deferred-contexts.md). Earlier capture headers and context-bearing callable types are retained as ideas, not current productions. This does not change ordinary lambda parameters, optional annotations, or the unnamed-input rule.

All the empty/prefix receiver and known-input result rules above apply equally with and without `fn`; an explicit whole-pack header is not a one-component receiver header. Simple trailing rest receivers follow the array-tail extension below; general exact/nested header patterns remain separate from positional-prefix binding.

inferred_source_pattern denotes a pattern whose outermost form is not the typed binding identifier : type. Thus `age: Int = source` is the selected whole typed declaration and `age: Int := source` is rejected. A structural source pattern can still contain typed subpatterns, such as `(age: Int, name) := pair`; its outer form is a tuple pattern, not a whole typed binding. Complete recursive productions remain open, but must preserve this selected restriction rather than introduce a second typed spelling.

The no-initializer alternative applies only to simple typed value declarations. It immediately supplies the type's valid all-zero value, equivalent to explicitly writing = 0; it bypasses declared field defaults. All types must define a valid zero mapping, so no zeroability eligibility restriction applies. It does not introduce source-free destructuring or late first assignment. Inferred name := still requires a source. Conditional type tests, parameter lists, and record-field declarations retain their own contexts and contracts. A declaration without an initializer is a simple item and follows the existing separator rules.

An argument may be omitted only with an applicable explicitly declared parameter default, regardless of type. Without one, myfn() is rejected for fn (a: Int): Int!; use myfn(0) to supply zero. This supersedes default-or-zero omission and applies to unnamed lambda inputs and zero callables too. Full default grammar, evaluation timing/scope, signature/implementation placement, named arguments, and caller-access permission details remain open; see [omitted value arguments](functions.md#omitted-value-arguments).

Direct local assignment checks the declared replacement contract rather than a temporarily narrowed read type. After it succeeds, subsequent reads use justified replacement facts: var x: String | Int = ? followed by x = 42 gives Int reads while retaining String | Int accepted writes. This applies throughout ordinary code blocks; joins include all normally reaching paths, and stale tests/relationships are invalidated by replacement. Preserve existing initialization, var/mut, evaluation/failure, and stability obligations; no assignment production changes. See [assignment flow types](type-tests-and-narrowing.md#flow-types-after-direct-assignment-selected).

The = ? alternative is the selected explicit reserved-storage marker for a simple typed value declaration. It supplies no initialized payload and is not a general expression, ordinary assignment right-hand side, inferred ?Type expression, or ?= declaration operator. Its first whole-value assignment uses the existing = production without requiring var, provided the target is uninitialized on every reaching path. Before ordinary value use, every reaching path must have initialized it. Subsequent replacement requires var. Partial/callee construction, layout eligibility, allocation policy, and complete state/cleanup rules remain open; see [first initialization](first-initialization.md) and [reserved storage](reserved-storage.md). An initialized source declaration remains initialized semantically even if the optimizer omits unobservable physical stores.

The type placeholder admits mut-qualified held-data access and type-side var caller-storage access, as in user: mut User and target: var User. Var replaces the former slot marker. These qualifiers apply to a following type operand, with grouping for composite operands. type_operand and the rest of type parsing remain incomplete; complete mixed access grammar and generic access composition remain open. Inferred parameter value types and defaults remain open: fn (param: var) is meaningful only where the eventual inference rules can determine the omitted value type. Left-side fn (var param: T) headers for local rebinding are omitted; use declarations inside the body. Full lvalue grammar, generics, public modifiers, and type-expression/value distinctions remain open. Refutable patterns cannot be assumed valid declarations without a failure contract.

No modifiers means a fixed binding with read-only access. var permits whole-binding reassignment; mut permits held-data updates through the binding, subject to field, element, and ownership permissions. Inferred var mut permits both; its typed counterpart is var user: mut User. Typed mut user: User and var mut user: User are superseded, rather than aliases. Inferred mut var and repeated modifiers are rejected. Typed parameters explicitly carry mut after the colon; a method receiver follows the same rule once its full declaration notation is defined. No additional function-level mutation marker is required.

Sequential ordinary local declarations may shadow earlier names in the same block. Resolve an ordinary initializer before introducing its new names. This does not select recursive function initialization or duplicate parameter/field-list entries. A mutable declaration from an existing copyable record creates a shallow mutable copy, including inline nested records but preserving reference targets and permissions; see [local shadowing and copies](local-shadowing-and-copies.md).

Standalone `_` is an ordinary binding identifier, not a separate wildcard production. Repeated names in one pattern shadow in recursive written order; the final occurrence is visible and each binding keeps its own type. `_ := expression` evaluates its initializer and produces Unit as an ordinary declaration. `_ = expression` assigns the visible binding and requires var, not discard semantics. See [pattern binding and shadowing](pattern-shadowing.md) and [underscore bindings and skips](wildcards-and-skips.md).

## Intrinsic callable application

```text
pack_application := invokable_operand "." "call" [pack_expression]
```

This is an intentionally incomplete expression-boundary outline. Intrinsic `.call` invokes, with Unit as the supplied pack when its operand is omitted. `f.call pack`, `f.call(pack)`, and `f(...pack)` use the same component routing for a valid tuple. Parentheses after `.call` belong to the pack expression: `(pack)` groups it and `(...pack)` constructs a spread tuple; whitespace does not change the parse. `f.call(4)` rejects a scalar operand, while `f.call (4,)` and invocation sugar `f(4)` supply one Int. `f(pack)` still supplies one tuple-valued input. `f.call`, `f.call Unit`, `f.call ()`, and `f()` invoke with zero supplied inputs; missing required inputs still need declared defaults. `.call` is not ordinary method-value lookup. Full operand precedence, chaining, reserved-member policy, and recursive expression integration remain open. See [application with an existing pack](callable-input-packs.md#application-with-an-existing-pack).

## Tuple-type spread and array tails

```text
tuple_type_entry := identifier ":" type | identifier | ":" type | "..." type
declared_array_tail := "..." identifier ":" type
fixed_array_type := "[" type ";" static_extent "]"
```

These fragments extend the incomplete tuple/callable type grammar. ...Params in type position expands a tuple schema with unnamed append and labeled replacement in the original slot. A final ...rest: T declares an array tail whose additional inputs each have type T; T may itself be a tuple. It does not annotate the entire collected remainder. This segment is valid in ordinary tuple schemas as well as callable inputs. The corresponding implementation collector may have a different name. Arrays with known or runtime-known length may feed a declared tail. The supplied arguments must provably satisfy the statically known input tuple shape; runtime tail length does not change that shape. Runtime-array spelling, tail normalization/composition, general length proofs, and complete recursive grammar remain open; [T; ...] was only a placeholder. See [selected examples and constraints](tuple-array-shapes.md).

## Named calls and tuples under review

The [named-call review](named-arguments-and-tuples.md) has selected name = expression call entries, positional calls, and positional prefixes followed by named arguments for simple identifier parameters. The 2026-10-23 extension selects interleaved positional/named inputs, =name shorthand, and explicit tuple call spread. Unnamed inputs fill the next unfilled declared slot; named inputs select a declared slot and replace an earlier supplied value. Explicit argument labels, including shorthand, must be unique; spread collisions may replace an earlier value. Reject unknown/ambiguous labels, excess positions, missing required inputs, and type/access mismatches. Complete recursive call grammar, superseded-value cleanup, and callable label compatibility remain open. Core tuple construction and binding forms are selected, while complete recursive productions remain to be formalized. Tuple patterns permit interleaved positional entries and destination = sourceField clauses: process left to right, selecting the next unselected source component for positional entries and the named field for named entries; reject duplicate source selection. A whole-tuple type annotation supplies named types such as (l: Int, r: Int); := infers the source contract. Within that direction, the user selected fresh named initializer reordering into a known destination and explicit reconstruction for differently ordered stored tuples; different stored tuple labels likewise require explicit reconstruction. Identical ordered labels and component types define the same structural tuple type wherever written. Stored named/unnamed conversions remain open. See [concrete named routing](named-input-routing.md). Assignment expressions, typed patterns, singleton/grouping forms, contextual lambda headers, and call-spread syntax must retain explicit syntactic boundaries. Named inputs preserve supplied-expression source order and the selected declared-default requirement for omission.

The selected tuple type component forms are identifier ":" type, bare identifier with an inferred type, and ":" type without a name. Examples are (l: Int, r: Int), (l, r), and (:Int, :Int). In type context, bare identifiers are labels rather than positional type operands; bare (Int, Int) no longer spells an unnamed typed tuple. A written colon requires a following type, so (l:, r:) and bare-colon components are rejected. Value expressions and binding patterns retain their own parenthesized roles. See [tuple component grammar](named-input-routing.md#selected-tuple-type-component-grammar). The empty tuple is Unit, also spelled () in type and value contexts. Complete recursive integration and inference diagnostics remain to be formalized. Singleton value construction is selected below.

Selected tuple value entries and numeric access are outlined separately from tuple type components:

```text
tuple_value_entry := expression
                   | identifier "=" expression
                   | "=" identifier
                   | "..." expression

spread_tuple_value := "(" tuple_value_entry {"," tuple_value_entry} [","] ")"

tuple_position_suffix := "." decimal_position
```

Here decimal_position is a descriptive placeholder for a fixed nonnegative zero-based position, not a runtime expression. The selected = identifier shorthand expands to identifier = identifier; ordinary positional expressions do not infer labels. Both named and unnamed tuples expose positions in stored order, and invalid positions are compile-time errors. Runtime variable tuple indexing is rejected; dot followed by an identifier selects that literal field name. Mixed tuples with an unnamed prefix and named suffix are selected: (42, = tea) infers (:Int, tea: String) when tea is String, preserving unlabeled positions and all written evaluation order. Named/unnamed tuple value components and corresponding type layouts may now interleave. These fragments do not decide complete recursive type/pattern integration, computed compile-time position syntax, numeric writes, or the complete lexer. In particular, scanning nested pair.0.1 must distinguish numeric suffixes from a fractional literal without whitespace or type-based guessing. See [tuple entries and access](tuple-entries-and-access.md).

The spread_tuple_value fragment requires at least one spread entry, identifying tuple construction independently of the expanded count. Fixed tuple operands preserve components/labels, and [T; N] operands contribute N unnamed components. Evaluate operands once in written order and flatten only explicitly spread values; no scalar conversion or Option/Result unwrap is added. Known-size arrays and fixed tuples may also supply array-construction entries. Runtime arrays supply declared homogeneous tails rather than an unknown number of fixed tuple fields. Preserve [append-or-replace](tuple-spread-and-rest.md#append-or-replace-by-label-selected), explicit-label uniqueness, final surviving types, contextual fixed destination checks, and stored tuple compatibility. Type construction now follows the same override rule. Full recursive mixed/runtime spread grammar and ownership remain open; see [tuple/array shapes](tuple-array-shapes.md).

Selected singleton value forms distinguish grouping by syntax:

```text
empty_tuple_value := "(" ")"
empty_tuple_type := "(" ")"
grouped_expression := "(" expression ")"
unnamed_singleton_value := "(" expression "," ")"
named_singleton_value := "(" named_tuple_entry [","] ")"
named_tuple_entry := identifier "=" expression | "=" identifier
```

Thus (cake) groups, (cake,) constructs an unnamed singleton, and (= cake) or (cake = cake) constructs a named singleton. Named forms permit a trailing comma; the unnamed singleton's comma is required to establish the tuple. Expected types do not choose the parse. Selected singleton type and pattern fragments follow below. The empty tuple is selected as Unit, with () an equivalent value/type spelling; zero-argument calls and empty lambda headers retain their existing context-specific syntax. Call argument parentheses remain distinct: take(cake,) passes one scalar argument, while take((cake,)) passes a singleton tuple. See [singleton values](tuple-entries-and-access.md#singleton-values-selected).

Selected singleton type forms use these descriptive fragments:

```text
grouped_type := "(" type ")"
unnamed_singleton_type := "(" ":" type "," ")"
named_singleton_type := "(" identifier ":" type [","] ")"
inferred_named_singleton_type := "(" identifier "," ")"
```

Thus (Int) groups a scalar type, (:Int,) is an unnamed singleton, (cake: Int) is a named singleton with an optional trailing comma, and (cake,) names a singleton component whose type must be inferred from static evidence. (:Int) is rejected: the unnamed singleton comma is required across values, types, and patterns. Bare labels remain labels in tuple type components; name lookup and expected types do not choose the parse. See [singleton type boundary](tuple-entries-and-access.md#2-singleton-type-boundary-selected).

Selected empty, grouped, and singleton tuple patterns use these descriptive fragments:

```text
empty_tuple_pattern := "(" ")"
grouped_pattern := "(" pattern ")"
singleton_tuple_pattern := "(" pattern "," ")"
named_singleton_tuple_pattern := "(" named_tuple_selector [","] ")"
named_tuple_selector := identifier "=" identifier | "=" identifier
```

In the explicit named selector, the two identifiers mean destination binding and source field label, respectively. The selected = identifier pattern shorthand expands to identifier = identifier; each identifier denotes that same destination name and source label. Thus (=fruit, =tea, =cake) is an all-named pattern in the written binding order. Reject unknown/duplicate source selectors after expansion and require complete coverage unless rest captures the remainder. This is not equality or positional inference. See [pattern shorthand](named-input-routing.md#same-name-tuple-pattern-shorthand-selected). (local) := one groups the binding and preserves the whole tuple; (local,) := one extracts its one component; (local = label) := one extracts by name. A typed binding inside grouping constrains the whole source, while a typed component followed by the singleton comma constrains the component. Expected types do not choose the parse. The selected empty tuple pattern () matches only Unit and binds no names. Its source is evaluated once. Ordinary declarations require an irrefutable match; supported conditional/match contexts use their existing mismatch rules. These fragments do not formalize the complete recursive parser or new header-pattern support. See [empty tuple patterns](tuple-entries-and-access.md#empty-tuple-pattern-selected). See [singleton binding patterns](tuple-entries-and-access.md#singleton-binding-patterns-selected).

## Call input entries selected

```text
call_entry := call_argument
            | identifier "=" call_argument
            | "=" identifier
            | "..." expression

nonempty_call_arguments := "(" [","] call_entry {"," call_entry} [","] ")"
empty_call_arguments := "(" ")"
```

The selected future call-list direction permits an optional leading comma and an optional trailing comma on a nonempty argument list. Both are punctuation only: max(, ...extra, ...fixed,) and max(...extra, ...fixed) supply identical entries. They do not represent omitted arguments, Unit, or requests for defaults. Interior separators still require actual entries; empty-list boundary variants remain open. These descriptive fragments do not complete expression parsing or change intrinsic .call's tuple-pack operand grammar.

The call_argument fragment retains ordinary values and explicit mut/var grants; =name expands one identifier into a named argument. Fixed tuple spread preserves labels and stored order; fixed array spread supplies its known number of unnamed values. Runtime-array spread may precede a known-size spread when the complete positional composition proves required fixed coverage and compatible possible slot/tail types. Earlier fixed-slot routing, named replacement, explicit-label uniqueness, final-slot type/access checks, and expression-once written evaluation remain. Additional positional inputs require a declared variadic segment; otherwise excess inputs fail. Compile-time proof must establish that the supplied composition satisfies the input tuple shape, including required fixed coverage and final-slot types/access. Both max(...fixed, ...extra) and max(...extra, ...fixed,) are valid for compatible Int sources when fixed: [Int; 5] guarantees the two required fixed inputs. Route the written positional sequence; runtime-dependent value origins do not make the destination shape dynamic. Reject missing fixed coverage that cannot be proven; a runtime arity check is not a fallback. General length proofs, named-tail supply, and spread/default interactions remain open. See [variadic array tails](tuple-array-shapes.md#a-declared-variadic-tail-collects-an-array).

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

The proposed nested field type `stats: { points: Int; level: Int = 1; }` uses braces in an explicit type position and omits record there. Distinct identity per record type declaration is selected for inline types too; the shorthand's full type production remains open. This does not remove record from a top-level binding such as Profile := record { ... }.

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

The selected 2026-10-24 default for a fresh nonempty bracket literal with an established element type and statically known total length N is [T; N], unless an expected concrete collection type selects another family. Thus [1, 2, 3] infers [Int; 3]. Known-size array/fixed-tuple spreads contribute their lengths; var/mut and later operations do not change the inferred family or extent. An expected concrete List can request growable storage. Existing providers retain their contracts. This supersedes the earlier unconditional List default.

This is a type-inference/default rule, not a complete sequence production. Runtime-length spread literals, empty/heterogeneous inference, runtime-array type spelling, indexing/slicing, and ownership remain open. Bracketed sequence patterns keep their own matching contract. See [array inference](tuple-array-shapes.md#known-size-fresh-literals-infer-fixed-arrays) and [sequence families](sequence-types.md).

## Conditionals

```text
conditional := [tag] "if" condition block
               { "else" "if" condition block }
               [ "else" block ]
               [ conditional_then ]
               [ finally_clause ]
conditional_then := "then" block

condition := [leading_condition_separator] or_condition
leading_condition_separator := "and" | "or"
or_condition := and_condition { "or" and_condition }
and_condition := condition_operand { "and" condition_operand }
condition_operand := condition_boolean_operand | existing_name_type_test
                   | negated_existing_name_type_test | pattern_condition
                   | "(" condition ")" | negated_matching_condition
negated_matching_condition := "not" "(" condition ")"
negated_existing_name_type_test := "not" existing_name_type_test
existing_name_type_test := identifier ":" type
pattern_condition := inferred_source_pattern ":=" condition_value_operand
                   | identifier ":" type "=" condition_value_operand

binding_pattern := identifier
type_match_pattern := ":" type
value_match_pattern := "==" pattern_value_operand
typed_binding_pattern := identifier ":" type
```

The optional leading and/or belongs only to a complete condition or explicitly parenthesized condition group. Remove it before applying the ordinary precedence and binding rules; it creates no true/false operand or empty alternative. Require at least one real operand and reject stacked, interior, or trailing separators: if and a and b is valid, while if or and a and if a or and b are invalid. The same condition production is used after else if and in subject-based match guards. This does not change ordinary Boolean expression, loop-header, subjectless-match-header, or pattern-alternative grammar. See [optional leading separators](leading-separators.md).

The := separator belongs to pattern_condition, not to pattern. Therefore the same case/value-test pattern appears as `if .Some(== outValAge) := find_user_age(id)` or directly as `.Some(== outValAge) { ... }` in a match arm. Typed conditions use the separate selected identifier : type = source form; identifier : type := source is rejected by the same inferred_source_pattern restriction as ordinary declarations. Nested typed constraints remain valid, as in `if .Some(age: Int) := source`. Bare .Some in a pattern is now selected to test only the tag with no payload binding; arbitrary refutable receiver patterns still need a mismatch contract. See the [operator-placement audit](pattern-contexts.md#operator-placement-audit).

The existing-name test resolves a name already in scope and refines knowledge about its value without introducing a binding. A well-formed test proven always true or always false remains legal with a warning for the constant test, including exact same-type and known disjoint-type cases. Unknown names/types, malformed syntax, and ordinary type errors remain errors. Preserve evaluation/effects, failures/exits, and short-circuiting; full type relations and broader unreachable diagnostics remain open. Supported exhausted conditional branches use internal Never reads and a reachability warning under the separate selected checking rule; no public Never type production is added. See [constant type tests](type-tests-and-narrowing.md#provably-constant-type-tests-selected). The declaration-shaped forms reuse declarations without `let`; they evaluate their source once and bind new names only on a successful match. `Some(value)` illustrates refutable destructuring; `name: Type` illustrates union narrowing. Plain Boolean conditions still require `Bool`. Irrefutable conditional patterns are allowed; they succeed on normal source completion, including false payloads. Warn when the complete matching condition is provably always successful. An irrefutable and-prefix alone does not trigger that warning when a later operand can reject the condition. Preserve source evaluation/effects, failures/exits, and ordinary successful-condition scope; diagnostic controls and conditional binding modifiers remain open. See [irrefutable conditions](conditionals.md#irrefutable-pattern-conditions-selected). Existing-name tests complete before not; negated_existing_name_type_test permits not name: Type, equivalent to not (name: Type). Source-pattern conditions, including typed name: Type = source, still require grouped negation. Ordinary not binds more tightly than and, which binds more tightly than or; if not A or B and C groups as (not A) or (B and C). See [condition negation scope](operators.md#negation-scope-in-conditions-selected). Broader logical flow and complete expression/type grammar interactions remain open; see [type tests and narrowing](type-tests-and-narrowing.md). The selected `then` follows the complete chain and receives the selected branch or zero result of type `T`; its tail expression yields final type `R`. A tagged conditional's `.value` is readable only inside this block; `.condition` metadata is not exposed for simple conditions or chains. Targeted-return and propagated-failure behavior is selected. If attached, cleanup-only `finally` runs after `then`; it has no receiver and does not recover failures. Exact attachment syntax/scope and aggregate handling remain open; cleanup-failure precedence is recorded in [finally](finally.md#pending-outcomes). `endif` is superseded.

False-branch [narrowing through else/else if](type-tests-and-narrowing.md#false-branches-and-else-if-chains-selected) carries supported remainders of stable existing bindings into each later condition and final else. For closed distinct members, a failed whole-member type test subtracts that member; a guard that may fail after a successful type test does not remove the whole type. Explicitly nested if inside else receives the same remainder. Preserve binding identity, source order, and mutation/effect invalidation; failed condition bindings never escape into later branches.

The selected and chain evaluates operands in order and exposes successful pattern bindings to later operands and the body, never the failed branch. The condition operand placeholders exclude ungrouped top-level logical separators; nested grouping can contain ordinary Boolean and/or expressions. In `Some(user) := find_user(id) and user.age > 14`, the pattern source ends before and. Top-level or likewise ends a source operand; ordinary Boolean operators intended inside the source require expression grouping. Binding-producing or is selected between complete condition alternatives that may introduce different name sets. Collect the union of final visible introduced names and contribute Unit where an alternative lacks a name. And binds more tightly than or; condition grouping permits a shared later and operand. Each alternative starts with the same incoming lexical bindings and cannot see failed alternatives' new bindings. Supported false-path facts may narrow stable existing bindings on entry to a later or operand: String | Int tested as value: String leaves Int for or value > 0, while the successful body still admits String | Int. Guarded failures may retain the tested type; preserve identity and stability across effects. See [or-operand narrowing](condition-chains.md#narrowing-into-later-or-operands-selected). On success, each shared name holds the first successful alternative's final binding value or Unit if absent, with a normalized union of its possible final binding types plus those Unit contributions. Boolean-only alternatives introduce no names of their own but may mix with binding-producing alternatives, contributing Unit for their new names. Incoming same-named bindings are shadowed even on Unit paths and cannot fill omissions. Joined names are not available during another alternative; if all alternatives fail, none are exported. Grouped matching-condition negation is selected as not (condition), exporting no names. Nested constructor/tuple or patterns are selected separately; logical and/not subpatterns and other expression/type grammar interactions remain open. Repeated binding names within a pattern and across successful chain operands use selected ordered shadowing. Each source and comparison-pattern RHS free name resolves in the scope established before its pattern; after whole-pattern success, the final new bindings shadow earlier ones for later operands and the body. Distinct bindings may have different types; this is not reassignment or type widening. Failed chains expose none of their bindings to else, sibling arms, or following code. The same rule applies to initial subject-based match bindings and later guard operands; subjectless Boolean headers introduce no pattern bindings. See [conditional pattern chains](condition-chains.md).

After a successful or group, join supported successful-path possibilities of each stable existing binding as a normalized union, including failure facts needed to reach each alternative. String | Float | Int tested as value: String or value: Float gives String | Float in the body and Int in else. Add no Unit merely for joining an existing binding; genuinely possible Unit members remain and new names retain payload-or-Unit joins. Boolean-only alternatives may preserve wider possibilities, guarded failures may retain tested types, and identity/stability across effects is required. The refinement can feed a later and operand after grouping without changing first-success evaluation or retry behavior. See [successful or narrowing](condition-chains.md#narrowing-after-successful-or-conditions-selected).

The type in an existing_name_type_test or supported typed/type-only pattern may be a plain union. For closed distinct members, normalize both sets: success keeps shared input/target members and failure the input remainder. Thus String | Float | Int tested as value: (String | Float) gives String | Float in the body and Int in else; target-only members cannot widen the input. This is one type test, not new pattern-alternative syntax or conversion dispatch. Preserve ordinary binding/mismatch, warning, stability, and evaluation contracts; see [union targets](type-tests-and-narrowing.md#union-targets-in-type-tests-selected).

An explicit var caller-location call checks both the current read type and declared accepted writes. Var T both reads and may write T; a current Int cannot enter var String, even when the location accepts String replacements. Accepted single-member calls preserve that member; a String | Int parameter can widen Int reads to String | Int after normal return. A rejected call establishes no post-call type. Call results remain separate; var is not output-only or a mandatory-write guarantee. Write-only access is future work without new syntax; see [call replacement flow](call-replacement-flow.md).

If supported conditional type-test flow proves that a branch has no input possibilities, warn that it is unreachable and give the exhausted binding an internal Never read type. A read may satisfy an already-known ordinary expected value type without supplying a runtime value. Keep unrelated variable types and ordinary errors/access obligations; unreachable branches supply no normal result or implicit Unit. Missing-else zero fallback is unchanged. Public Never syntax, member/generic behavior, and Never | T / Never & T algebra remain future topics; see [Never and unreachable flow](never-and-unreachable-flow.md).

For negated_matching_condition, evaluate the inner condition once under its ordinary short-circuit and binding rules and complement only its normal Bool result. Its internal bindings may be used inside that condition but none escape to outer operands, the body, else, other alternatives, or following code, even through nested/double negation. It contributes an empty introduced-name set to an enclosing or; the inner or joins may supply Unit for absent names but all inner names remain confined to the negation. Incoming names retain ordinary outside lookup and their own types/access. Failures, explicit exits, and prior effects keep their ordinary behavior. Require grouping for source-pattern negation; existing-name tests separately permit concise not name: Type. Ordinary Boolean not precedence remains unchanged. Comparison expressions and all ten comparison-pattern prefixes introduce no bindings, including =!=. This adds no matching conditions to subjectless headers or logical not subpatterns. Separately selected [early-exit narrowing](type-tests-and-narrowing.md#narrowing-after-early-exits-selected) retains supported type facts about stable existing bindings on every path reaching a continuation; it never exports names from negation or branches. Actual exit targets/completion paths and intervening effects determine which facts survive; arbitrary negative-flow solving remains open. See [negated matching conditions](condition-chains.md#negated-matching-conditions-selected).

The earlier [external conditional recovery](conditional-recovery.md) proposal is superseded by [body-owned recovery](body-recovery.md). Do not add an error-catching else(receiver) after the normal conditional chain. Internal body-wide sections are explicitly deferred for the joint cleanup/resource review; no delimiter rule or new production is selected. Plain else remains false selection, ! still returns from the enclosing function/closure, and inner Results are not implicitly unwrapped.

## Match

```text
match_expression := subject_match | subjectless_match
subject_match := "match" expression "{" match_arm { match_arm } "}"
match_arm := arm_pattern [ "if" condition ] block { ";" }
arm_pattern := alternative_pattern
alternative_pattern := pattern { "or" pattern }
component_pattern := alternative_pattern
subjectless_match := "match" "{" boolean_match_arm { boolean_match_arm } "}"
boolean_match_arm := boolean_match_header block { ";" }
boolean_match_header := boolean_match_expression | "_"
contextual_enum_case := "." identifier [ "(" [pattern_list] ")" ]
```

Initial subject-based arm_pattern alternatives share the once-evaluated subject and try left to right. After per-alternative ordered shadowing, collect the union of their final visible binding-name sets; missing names contribute Unit to the shared guard/body bindings. Each shared guard/body name has the normalized union of its possible final binding types, including Unit for absent alternatives: Email(String) and Sms(PhoneNumber) alternatives binding address give String | PhoneNumber. Differently named Email(email)/Sms(phone) alternatives instead give email: String | Unit and phone: PhoneNumber | Unit, initializing the absent name with Unit rather than reading an outer binding. The same payload-or-Unit join now applies to complete condition/guard alternatives; neither context requires identical name sets. A distinct numeric-representation PhoneNumber is not replaced with Number; transparent aliases resolve normally. Failed alternatives leak no bindings and failures remain failures. The repeated or production permits any finite number of initial alternatives. The if separator starts one shared guard after the whole pattern section: stop at the first successful initial pattern, evaluate the shared guard once, and on complete guard failure continue to the next arm without retrying any initial alternatives. Ordinary and/or precedence applies inside the guard, not across the if separator. Nested constructor/tuple component alternatives are selected as described below. See [alternative arm patterns](match.md#alternative-arm-patterns-selected).

Nested constructor payload patterns and tuple component patterns may use component_pattern alternatives. In this descriptive fragment, pattern denotes one individual supported pattern, whose child payload/tuple patterns may in turn admit component_pattern; complete recursive productions remain unfinished. Existing payload/tuple parentheses and comma separators bound each local choice. At that component level, or separates complete pattern alternatives; ordinary Boolean or intended inside a comparison RHS stays grouped as == (ready or retry). Thus .Some(.Email(address) or .Sms(address)) joins address as String | PhoneNumber; (.Email(address) or .Sms(address), received_at) applies the choice only to the first component. Different local binding names join payload types with Unit where absent, after per-alternative shadowing. Candidate bindings are exposed outside only after the whole enclosing pattern succeeds. Free comparison-RHS names retain pre-pattern lookup, not sibling binding lookup. Stop at the first local success and skip later local alternatives; a later component/guard failure never retries an earlier successful local choice. A failed enclosing pattern may still permit another enclosing alternative; a failed shared arm guard moves to the next arm. Preserve source-once evaluation, ordinary effects/failures, irrefutable declarations, existing supported pattern contexts, and ownership obligations. No and/not subpatterns, new headers, or constructor schemas are selected. See [nested alternatives](match.md#nested-alternative-patterns-selected).

If the next non-comment token after match is `{`, parse subjectless_match. A brace-starting subject expression must be grouped, as in `match ({ compute_subject() }) { ... }`; whitespace or type lookup cannot choose the form. boolean_match_expression is an ordinary Bool-valued expression placeholder, excluding a header consisting solely of the fallback token `_` and outer-level ungrouped body braces. The next outer-level ungrouped opening brace starts the arm body; block/conditional/record value expressions inside a header require grouping, with nested call arguments retaining their ordinary delimiters. In `val1 == val2 { ... }`, val2 is an expression reference, not a record-construction head. Complete recursive expression/header productions remain incomplete.

In a subjectless match, evaluate reached Boolean headers once in source order and execute only the first true arm body. A false condition tries the next arm; later conditions/bodies are skipped after selection. Preserve expression precedence, internal short-circuiting, effects, failures, and explicit exits. Bare isUserSigned reads an existing Bool, not a pattern binding. A whole `_` header is an unconditional fallback with no new binding or implicit subject; underscore identifiers elsewhere retain ordinary lookup. Subject-based `_` patterns remain readable bindings. Both forms retain exhaustive action/value coverage and the same branch-result type rules. Binding-producing pattern-condition headers and a pattern-arm if separator are not added to the subjectless form. See [subjectless selection](match.md#subjectless-boolean-selection-selected).

Omitting the entire parenthesized payload-pattern list selects a tag-only pattern, even for a case that carries payloads. Thus `.Some` tests the tag without binding its payload, consistently in if, match, and nested patterns. This does not permit constructing Some without a value or settle partial/empty payload lists, constructor arity, or receiver mismatch policies; see [tag-only patterns](enums-and-variants.md#tag-only-patterns).

The [keyword-placement alternative](match-keyword-placement.md) `expression match { ... }` is under review and is not a production or alias in this sketch. It would require explicit precedence and block-continuation rules; whitespace cannot choose the subject boundary.

Each subject-based arm may follow its initial pattern with an if guard. The guard reuses condition above: and chains and or alternatives, including explicit pattern bindings of other expressions. Or alternatives expose the union of introduced names, joining payload types with Unit where absent; failed alternatives do not leak names to the next, while earlier initial arm bindings remain in the common incoming scope. The if separator replaces the earlier pattern-and arm separator; ordinary conditional chains are unchanged. No as arm-binding marker is selected. Within each and chain, bindings flow left to right. A failed chain may try the next or alternative from the common incoming scope; a failed complete guard tries the next arm. Choose the first fully successful arm. See [match arm chains](match-guards.md). Both forms have braced arm bodies, with no case/arrow delimiter or required separator between arms; trailing semicolons after arm bodies are allowed. The complete match is a block-value construct: it ends its item with an optional trailing semicolon, and continuing its value requires parentheses. A supplied subject is evaluated once, and pattern bindings are local to the selected arm. Conditional and subject-based match patterns share the same pattern concepts, including `binding: Type`.

Later subject-based arms and initial pattern alternatives receive the remaining subject possibilities established by earlier failures, without importing failed bindings. For a stable initialized String | Float | Int subject, an unguarded : String arm excludes String from the next arm, so both the original stable name and a catch-all _ binding there have type Float | Int. A guard or partial pattern failure does not exclude the whole written type: String may remain after a guarded String arm. Refine only proven subject possibilities and stable aliases of that same subject; no copy/freeze or general predicate-complement solver is implied. Declared types after the match remain unchanged. See [remaining subject narrowing](type-tests-and-narrowing.md#remaining-subject-types-across-match-arms-selected).

This sketches the selected arm surfaces, not a full expression/pattern parser. Every match must be exhaustive, including actions. In subject-based matching, an unconstrained _ binding supplies the catch-all, and _ {} explicitly ignores remaining subjects with Unit. In subjectless matching, _ {} is a fallback with no binding and handles the all-false path with Unit. A separate else fallback, overlaps, exact type versus subtype tests, and detailed coverage proofs remain open. See [match](match.md) and [union type patterns](union-patterns.md).

Finite known binding combinations from input/pattern alternatives are retained for later stable related-binding narrowing. For Email(String)/Sms(PhoneNumber), separate email/phone names initially have String | Unit and PhoneNumber | Unit but only the two paired combinations are possible. A later successful email: String test excludes the Sms combination, so phone narrows to Unit. If Email may itself carry Unit, email: Unit does not identify Sms; retain all compatible combinations and their projected types. Require stable binding identities; relevant replacement, shadowing, or effects must not transfer stale relationships to new values. No arbitrary predicate solver, implicit conversion, extra runtime discriminator, sibling pattern-RHS lookup, or negation binding export is selected. See [related binding inference](pattern-binding-inference.md#narrowing-related-stable-bindings-selected).

The full pattern grammar must cover equality, plain enum cases, payload-bearing cases, destructuring, and type tests. The base spellings are selected: name binds, `: Type` type-matches, and `== expected` value-matches. Full operand boundaries, recursive composition, enum declarations, and record-pattern delimiters remain open. See [match pattern capabilities](match-patterns.md).

Bare identifiers in pattern binding positions introduce names; they do not become equality or type tests through lookup or capitalization. Use `.None` for the absent Option case, not bare None. Existing Some(value) constructor heads remain explicit payload patterns. The [pattern primitives](pattern-bindings-and-tests.md) select `== expected` value tests and `: Type` type-only patterns, neither of which binds a name. `name: Type` combines binding and type matching. The pattern_value_operand placeholder still requires complete expression-boundary/precedence rules; these productions describe the chosen forms without claiming a complete parser.

Typed component patterns are selected within destructuring, as in `(x: Int, y: String)` and constructor payloads containing that tuple pattern. The same pattern can appear as a match arm or before `:=` in a conditional. The whole pattern succeeds only when all required structural and type constraints hold; it is not a converting cast. This composition requirement does not complete the recursive pattern parser, record syntax, or ownership contract.

An annotation constrains its component; other binding types are inferred by narrowing the entire input against the pattern and projecting each binding's concrete type or union from the compatible portions. Composite alternatives remain intact. This is a semantic requirement, not additional syntax or a match-arm result-union rule; see [pattern binding inference](pattern-binding-inference.md).

Nested tuple components use either a variable binding or a nested pattern: (first, pair, ...rest) binds the second component as pair, while (first, (a, b), ...rest) destructures it into a and b. Combined whole-value/subpattern binding is rejected. Colon retains its type role: pair: (a, b) constrains and binds pair, with a and b as type-component labels rather than new local bindings. Complete recursive parsing must preserve these roles independently of whitespace, identifier casing, or type lookup. Positional tuple rest now has selected shape, placement, and arity:

```text
tuple_rest_capture := "..." identifier
rest_only_tuple_pattern := "(" tuple_rest_capture [","] ")"

tuple_pattern_entry := positional_component_pattern | named_tuple_selector
mixed_tuple_pattern := "(" tuple_pattern_entry {"," tuple_pattern_entry}
                       ["," tuple_rest_capture] [","] ")"
```

The mixed_tuple_pattern fragment requires at least one positional entry and one named selector. positional_component_pattern is a placeholder for already supported component-pattern forms, excluding top-level named selectors and rest. This fragment does not complete recursive pattern parsing or add patterns to loop/lambda headers. Each positional entry selects the next unselected source position in stored order; a named selector selects its source field. Selecting a component twice is invalid, regardless of destination binding names. Explicit selectors and =name shorthand share this rule.

At most one capture appears last in a positional tuple pattern. For a fixed tuple it preserves remaining component types, labels, and order as a tuple: zero gives Unit/(), one remains a singleton; without rest, require exact coverage. On a schema with an array tail, preserve any unselected fixed components followed by that tail; a callable receiver aligned with all fixed inputs collects the declared array segment. No pattern rest fills missing fixed components. Tail-only normalization and full integration remain open; see [array-tailed tuples](tuple-array-shapes.md#ordinary-tuples-may-have-the-same-array-tail).

The [pattern context review](pattern-contexts.md) distinguishes shared pattern forms from per-construct mismatch behavior. Current loop headers bind only one optional item name; destructuring and selection belong in the body. Parameter and completion/recovery receiver mismatch policy remains proposed. A pattern placeholder does not silently select filtering, runtime dispatch, unchecked unwrap, or automatic propagation.

### Comparison-pattern prefixes selected

```text
comparison_pattern := comparison_operator comparison_pattern_operand
grouped_comparison_pattern_operand := "(" expression ")"
```

comparison_operator is the same ten-token family used by expression comparisons below. The enclosing pattern supplies the left operand; comparison_pattern_operand is a descriptive placeholder for the right value expression. Its complete recursive boundaries, including arm bodies and named-field selector clauses, remain open. This fragment selects no additional constructor schema, header-pattern context, or type-based parsing rule.

Selected common RHS forms include ordinary arithmetic, calls, and member access without additional pattern-specific grouping: `>= minimum + margin`, `== expected()`, and `== settings.limit`. They retain ordinary operator meanings, static compatibility, pre-pattern name lookup, and RHS-once-when-reached evaluation; they bind nothing. An ungrouped implicit-subject chain such as `>= lower < upper` is invalid. Use `v if lower <= v < upper { ... }` to bind and guard explicitly. Grouped RHS value expressions are also selected, with grouping required for outer-level comparison operators, Boolean logic, and conditional/block expressions. The grouped_comparison_pattern_operand production is one admitted comparison_pattern_operand form; it uses existing expression forms and adds no binding. Full recursive operand and delimiter productions remain incomplete. See [common comparison operands](comparison-patterns.md#common-right-operands-selected).

`== (left == right)` and `== (ready or retry)` compare the supplied Bool-compatible subject with a computed Bool; neither binds a name. Conditional/block operands likewise group, as in `== (if ready { first } else { second })` and `== ({ compute_expected() })`. Arithmetic/call/member forms keep their ordinary concise syntax; nested call arguments use their existing delimiters. Ungrouped outer comparison/Boolean/conditional/block RHS forms are rejected. An arm if guard follows the complete pattern, as in `== expected() if ready { handle() }`. These boundaries apply to all ten comparison prefixes. See [grouped comparison operands](comparison-patterns.md#grouped-right-operands-selected).

Each prefix introduces no binding and uses its ordinary operator meaning, including Boolean complement for negative forms. The runtime right operand evaluates once when the comparison is reached; skipped tests do not evaluate it. RHS names resolve in the surrounding pre-pattern scope, not from new bindings elsewhere in the same pattern. False rejects that pattern; comparison/expression failures retain their ordinary failure behavior rather than becoming mismatch. Supported conditional/match contexts retain their mismatch rules, and ordinary declarations retain irrefutability requirements. Use an if guard in match arms, or later and operands in conditional chains, for compound or cross-component conditions. Logical and/not subpatterns and implicit-subject pattern comparison chains are not selected; nested constructor/tuple or alternatives are selected separately. Complete conditional/guard or alternatives with explicit sources and Unit for absent binding names are selected separately; see [binding-producing or](condition-chains.md#binding-producing-or-alternatives-selected). See [comparison patterns](comparison-patterns.md).

## Loops

```text
loop := [tag] "loop" [source] [item_binding] block [loop_completion] [finally_clause]

item_binding := "as" identifier

loop_completion := "then" block

finally_clause := "finally" block
```

As is selected spelling for a single optional item name; the earlier colon alternative is retired. There is no header count/value receiver list, tuple-pattern receiver, or completion receiver. Destructuring and refutable selection belong in the body; no header mismatch behavior is implied.

Every loop owns .item, .index, .count, and typed .value metadata, subject to phase availability. Index is zero-based traversal position; count is entered-iteration count. Value is zero-initialized before iteration and internally replaced by a completed tail expression, continue value, or break value. Plain continue and bare break preserve it. The old .acc/Option accumulator and previous-value slots are retired. See [loop value](loop-value.md) for typing and zero rules.

Source type selects Boolean reevaluation or iterable evaluation-once. Omitted source means unconditional iteration. There is no post-condition production. Count and value can be read before the first condition, in the body, and in then. Item/index are available during active iterations and as last-visited metadata in then, not in source/condition evaluation. With zero body entries, then exposes typed zero placeholders for item/index and count 0; completion retention is field-sensitive, so unused last-item state need not be retained.

Then retains the same owning loop context, including on untagged loops, and follows ordinary final-expression rules. When both completion and cleanup hooks are present, `then` finishes before `finally`; successful cleanup preserves the result and cleanup does not recover failures. Cleanup-failure precedence is selected; exact attachment syntax/scope and aggregate handling remain open. Separate loop empty-else and completion-receiver forms are superseded. Body-wide recovery/cleanup sections remain [deferred](deferred-cleanup-and-resources.md); external whole-loop error handlers remain retired.

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

These are selected surface templates, not complete type productions. `T!` expands exactly to `T ! Error`; its suffix ! must touch the end of the type, with no intervening whitespace or comment. An explicitly supplied error operand retains the binary T ! E form and ordinary token separation. `!T` is not a selected spelling. The type grammar and valid boundaries determine whether an explicit error operand follows; omitted-error shorthand is valid only with attachment. The following declaration initializer = remains a separate token with optional spacing. An annotation `T` declares no recoverable error channel. If angle-bracket generics become source syntax, grammatical type context must split a closing > from its attached ! and any following =: x: Box<Int>! = load(), x: Box<Int>!= load(), and x: Box<Int>!=load() are equivalent; x: Box<Int> != load() is invalid. No identifier lookup or type-check success chooses that split. Generic source grammar remains unselected; expression comparisons are selected separately at their shared precedence. See [shorthand attachment](fallible-types-and-error-composition.md#fallible-type-shorthand-attachment-selected).

In type declarations, union `|` binds more tightly than binary fallible type `!`: `A|B|C!D|E|F` is valid and means `(A | B | C) ! (D | E | F)`. Official reference documentation prefers the explicitly grouped form for unions on either side. A union of complete outcomes groups the fallible operands, as in `(A ! D) | (B ! E)`. Precedence with other constructors, associativity of repeated `!`, complete type-expression grammar, and the full definition of `Error` remain open. See [fallible types and error composition](fallible-types-and-error-composition.md#grouping).

### Selected alias form

```text
type_alias := identifier ":=" "type" type_expression
```

The [type alias comparison](type-aliases.md) selected Alias := type TypeExpression. The prefix establishes type context for the whole alias initializer, including unions and fallible types, and creates no fresh nominal wrapper. Direct type binding without the prefix is not an alternate alias spelling. This is a surface production, not a completed type parser; tuple, generic, function-type, scope/cycle, and fresh-record alias boundaries remain open.

Plain-union [normalization](union-normalization.md) is selected independently of precedence: member order does not affect identity, nested plain unions flatten, and duplicate identities disappear after alias resolution. These rules do not flatten Option/Result/enum boundaries, merge distinct nominal records, reorder match arms, or choose an ABI.

### Optional leading union separator selected

```text
union_type := ["|"] union_member_type { "|" union_member_type }
```

This is a selected nonempty-chain fragment in type context, not a complete type-expression grammar. union_member_type excludes ungrouped top-level | and binary fallible !; its recursive productions and other constructor precedence remain open. Established grouping may contain another union chain. Thus Alias := type | A | B and Alias := type A | B denote the same type, while Alias := type |, Alias := type | | A, and Alias := type A | are invalid. A singleton | A denotes A and adds no empty member or Unit. Each union operand of binary ! uses this same fragment, preserving the selected tighter union precedence. No public intersection-type or leading-& production is selected. See [optional leading separators](leading-separators.md#plain-union-types).

## Recoverable error expressions and shared recovery direction

```text
target!
target else { recovery_body }
target else (failure) { recovery_body }
target else (_) { recovery_body }
target else (name: FailureType) { recovery_body }
target else (: FailureType) { recovery_body }
```

These are selected surface templates, not complete productions. Postfix `!` extracts one successful Result payload or returns its typed error from the nearest function or closure; it must not silently extract every Result in a chain. It participates in left-to-right postfix chaining, so `load_user(id)!.load_profile()!.name` needs no grouping around each extraction. `!.` is the `!` token followed by the ordinary `.` token, not a nullable-access token; token-separating whitespace changes no meaning.

Receiverless `else`, an untyped readable binding such as `failure` or `_`, and a typed receiver pattern have distinct binding behavior. The three untyped recovery forms match every failure supported by the target. `_` remains an ordinary readable binding and can be used in the handler. A typed receiver pattern matches only its named failure type: `: BoundPanic` handles that panic category without binding, while `: Panic` matches the panic family and does not match returned Result errors. `name: FailureType` also binds the narrowed failure. A bare identifier remains a catch-all binding even when spelled like a type name. An unmatched panic propagates implicitly; an unmatched returned error remains an explicit Result obligation and can be propagated with `!`. Exact grammar precedence, mixed-channel broad receiver typing, nested-operand scope, and cleanup-failure aggregate handling remain open; cleanup-failure precedence is selected under [finally](finally.md#pending-outcomes).

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
comparison_operator := "==" | "=!=" | ">" | ">!" | "<" | "<!"
                     | ">=" | ">!=" | "<=" | "<!="
```

These are ordinary Boolean expression productions. Optional leading and/or is selected separately at the complete condition boundary above; do not put an optional prefix on logical_and, logical_or, and_condition, or or_condition. Doing so would admit stacked/interior leaders that the selected rule rejects. Leading condition punctuation does not change this precedence ladder or introduce unary logical operators.

All ten comparison operators share exactly this one precedence level, binding more tightly than `not`; a leading `not` applies to the whole chain. Each comparison operator checks adjacent operands and produces `Bool`; the result of one comparison is not the next operator's operand. Negated operators complement one corresponding positive comparison: =!= negates ==, >! negates >, >!= negates >=, <! negates <, and <!= negates <=. Chain operands evaluate at most once in source order, and subsequent comparisons and operands are skipped after a false result. All adjacent comparisons are statically checked. Recognize the longest comparison token in expression context; grammatical type context retains the selected attached type-suffix/initializer boundary. Parentheses establish separate comparisons when required. All ten nonbinding comparison-pattern prefixes are selected separately; that does not add implicit-subject pattern chains.

`comparison_operand` is a placeholder for expressions binding more tightly than comparisons, including grouping and arithmetic; its full production remains open. With no comparison operator, the production passes through the operand expression. Arithmetic, ranges, calls, member access, literals, type syntax, and pattern grammar are intentionally not completed here. See [comparison chains](comparison-chains.md).

## Evaluation semantics

Ordinary operator operands evaluate left to right after grouping is determined. Calls evaluate the callee first, supplied arguments in source order, then invoke the callable. Short-circuit constructs skip unneeded expressions. Assignment selects its target once before the right-hand side; a compound update reads the selected target's value before its right operand, then computes and writes the result.

At invocation after all reached supplied arguments, earlier var locations must still have justified readable types fitting their parameters. A later argument that changes selected String | Int storage from String to Int prevents a var String call, even though the location initially fit and the write itself was allowed. Preserve single selection and source evaluation order; this is a static type obligation, not runtime checking or a selected borrow-activation policy. See [entry facts](call-replacement-flow.md#entry-facts-after-argument-evaluation-selected).

Selecting an initialized local for an earlier var argument permits a later supplied expression to read it and compute a scalar before invocation. For add(var count, count + 1), with count initially 10 and an Int-adding callee, select once, compute 11, then invoke and write 21. Preserve entry compatibility and initialization checks; this does not select later writes or retained aliases during argument preparation. See [later argument reads](call-replacement-flow.md#later-argument-reads-of-a-selected-local-allowed).

One source location supplies only one active write grant. Reject two explicit var arguments referring to the same local in one call, even if the parameter types are identical; distinct local locations are not duplicates merely because their stored values are equal. This known-overlap check adds no new call syntax, snapshots, copy-back, or runtime alias check. Broader path/field/index overlap and grant activation remain open; see [single source write grant](call-replacement-flow.md#single-source-write-grant-selected).

A var-qualified parameter can explicitly forward its existing grant to one nested call. The nested active holder temporarily suspends outer access through the same authority; normal return restores the immediate caller's same-location grant with nested writes visible. Preserve read/write compatibility, received authority bounds, evaluation, and nonescaping lifetime; no new production, grant duplication, copy-back, or pointer representation is selected. Exact activation and callback/reentrancy checks remain open; see [nested forwarding](call-replacement-flow.md#nested-forwarding-of-a-write-grant-selected).

When a forwarded call fails, restore the immediate caller's same-location grant after nested access and applicable callee-side cleanup end, before caller recovery starts. Its handler can read/write; earlier writes persist, and pre-call refinements are not automatically restored. Normal handler completion reaches subsequent code; outward failure/transfer does not. Recovery inside the still-active nested callee does not restore the outer grant early. See [caller recovery](call-replacement-flow.md#recovery-after-a-forwarded-call-selected).

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
