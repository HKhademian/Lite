# Decisions and open questions

Snapshot: **2026-10-18**. Source: the language-design discussion in this chat. No compiler implementation or conformance result is implied.

## Established direction

### Audience and defaults

- Static, strong typing, with ordinary type inference so first examples need no annotations.
- Bindings are fixed and provide read-only access by default. `var` permits binding reassignment, `mut` permits held-data updates through the binding, and `var mut` permits both.
- Operations have read access by default; affected receiver/parameter bindings explicitly carry `mut`. There is no additional function-level mutation marker.
- Minimal visibility and capability exposure by default.
- Explicit optional data and typed errors instead of universal nullability.
- Recoverable failures have statically typed error contracts. To obtain a fallible call's successful payload, a caller explicitly handles/inspects the outcome, supplies a default, or propagates the error. Keeping the outcome as a `Result` for later handling does not unwrap it.
- Propagation uses postfix `!` at each extracted Result step. Calls and members can continue directly, as in `load_user(id)!.load_profile()!.name`; parenthesis-heavy chains and mandatory temporary bindings are rejected as the everyday solution. `!.` consists of two ordinary postfix-chain tokens and is not nullable access. Local recovery uses an attached `else(error) { ... }` or `else { ... }` block. The error receiver is optional and introduces no implicit name when omitted. Implicit success construction does not imply automatic call-site extraction.
- One outer propagation marker must not silently extract all intermediate Result values. Stored Results remain ordinary data; no implicit member forwarding or recursive unwrapping is selected.
- Matching stored Results preserves the explicit success/failure side; the selected patterns are lowercase .ok(value) and .err(error), with tag-only .ok/.err forms available. Success construction may remain implicit without making outcome inspection implicit. Matching does not automatically unwrap, propagate, or flatten nested Results; payload patterns and later and conditions operate only after the outcome side is identified.
- Result recovery combines success type `T` and normally completing fallback type `D` as `T | D`, collapsing identical alternatives. An explicitly exiting fallback contributes no local alternative. This does not establish automatic union inference for other constructs or the full union type grammar.
- Developers can narrow success and error unions through type-pattern matching, binding an active alternative with its narrower static type. This includes unions on both sides of `!` and recovery-created unions. An intact Result preserves its outer success/failure distinction when the payload types overlap. Complete pattern grammar, overlap, and ownership rules remain open; see [union type patterns](union-patterns.md).
- Every recoverable error that can escape must be covered by the function's explicitly declared error contract, whether explicitly returned or forwarded by `!`. Inference must not silently widen the declared contract.
- Panics use a separate path; Result recovery and `!` do not catch them. Postfix `!` is propagation, not a panic-producing assertion. Panic triggers, execution, and cleanup guarantees remain open.
- A user can inspect and recover from an individual fallible operation, including arithmetic and function calls. Local handling observes the outcome without a prior implicit unwrap or automatic propagation; it does not require every intermediate binding to be a visible `Result`.
- Composition and interfaces as the primary reuse direction.
- Small runtime and native performance as goals, not measured achievements.

### Syntax and results

- Braces are required for bodies.
- Existing-name type tests use `if person: User { ... }` without redeclaration. Narrowing changes static knowledge, not the value or declared type; mutation stability, logical composition, negative/early-return flow, and generic/subtype semantics remain to formalize. See [type tests and narrowing](type-tests-and-narrowing.md).
- Conditional patterns reuse declarations: `if Some(value) := expression` and `if value: Type = expression`. Matching binds branch-local names and permits lexical shadowing; no `let` keyword is added.
- Pattern matches and Boolean guards combine through and, as in `if Some(user) := find_user(id) and user.age > 14`. Operands run left to right and stop at the first mismatch/false result; bindings from successful patterns are available to later operands and the successful body, not else or following code. Binding-producing or/not and repeated chain names remain open; see [conditional pattern chains](condition-chains.md).
- Match arms may extend their initial pattern through and with Boolean conditions and additional explicit pattern matches. Earlier bindings are available to later operands and the body; false/mismatch tries later arms, and the first fully successful arm is selected without implicit fallthrough. Nested typed destructuring uses the same pattern system. See [match arm chains](match-guards.md).
- Match arms use pattern { body } without case, an arrow, or required arm separators; trailing semicolons after arm bodies are allowed. Match shares action/value syntax and requires exhaustive coverage for every match. Ignored cases need an explicit arm, such as _ {}, whose empty block already returns Unit. Complete coverage proofs, optional else fallback syntax, and ownership remain open; see [match coverage](match-coverage.md).
- Enum case shorthand keeps its dot: `.started` or `.completed`, with the owner inferred from a single established match-subject or expected enum type. Payload cases use the same form, such as `.Click(x, y)`. Qualified access remains available; no bare-name contextual case lookup or enum search across unrelated types is selected. Collision handling with metadata .field remains open. See [enums and variants](enums-and-variants.md#inferred-case-names).
- Explicit enum backing types follow enum with a colon, and case values use `=`, as in `Status := enum : Float { Ready = 1.1; Busy = 2.2; Stopped = 3.3 }`. The colonless header is superseded. This selects Float backing-value support, without selecting implicit numeric conversions, physical layout, omitted-value numbering, or how backing values combine with payload cases. See [backing types and assigned values](enums-and-variants.md#backing-types-and-assigned-values).
- The enum backing-type clause and each assigned case value are independently optional, including mixtures of explicit and omitted values. A written backing type still requires colon. Backing inference/defaults and automatic case numbering remain semantic decisions; omission itself is selected. See [optional enum type and values](enums-and-variants.md#independently-optional-type-and-values).
- The three base pattern operations are bind (`name`), type match (`: Type`), and value match (`== expected`). Type/value tests introduce no name; `name: Type` composes binding and type matching. Literals are concise value tests. Structure and case patterns route components and test shape/tag identity without requiring whole-value equality. Complete operand, effect, and ownership contracts remain open; see [pattern primitives](pattern-bindings-and-tests.md).
- Pattern source placement and equality remain distinct: `if .Some(age) := source` binds its payload, while `if .Some(== expected) := source` tests the payload against an existing value. Ordinary expression == never introduces bindings, and `.Some(age) == source` is not a binding-condition spelling. Match arms and receivers already receive their input from their construct and do not add := merely to use the same pattern; see the [operator-placement audit](pattern-contexts.md#operator-placement-audit).
- Whole typed declarations and typed conditions use `name: Type = source`; `name: Type := source` is rejected. The := source form excludes an outermost typed binding, while type constraints inside structural patterns remain valid, such as `if .Some(age: Int) := source` or `(age: Int, name) := pair`. Direct typed patterns in match arms and receiver slots retain their separate contracts. This resolves the previously open typed-binding syntax overlap.
- Bare identifiers in patterns bind, independent of capitalization or an outer constant/type. Use `.None` for the absent Option case; bare None binds. Existing Some(value) payload constructor heads keep their explicit role, and ordinary expression uses of prelude None retain normal lookup. Bare `User` is therefore not a type-test shorthand. See [pattern bindings and tests](pattern-bindings-and-tests.md).
- Option pattern examples use `.Some(value)` and `.None` consistently as contextual case patterns. This uses existing selected syntax without banning the older named Some(value) payload head. An unguarded top-level `_` accepts remaining whole subjects and binds one to readable `_`; it is not an absent-case selector or a nonbinding discard. A component `_` binds its supplied component under the same ordinary rule.
- Tag-only enum patterns omit the complete payload-pattern list and introduce no payload binding: `if .Some := source` and `.Some { body }` in match test the same case. This applies to any payload-bearing case and nested case patterns. An unguarded tag-only arm covers every payload of its case under first-success selection. It does not construct a value without data, select partial/empty argument-list rules, or introduce filtering/dispatch in receiver contexts. See [tag-only patterns](enums-and-variants.md#tag-only-patterns).
- Match must support equality, conventional payload-free enums, enums with associated values, destructuring, and type checking/matching. Enum cases are not assumed to be separate types; plain enum support does not silently select integer conversion or representation rules. See [match pattern capabilities](match-patterns.md) and [enums and variants](enums-and-variants.md).
- Type matching composes with destructuring: `(x: Int, y: String)` can test and bind tuple components directly in a match arm or an `if` pattern; constructor payload patterns can contain such subpatterns. The whole pattern must match before its branch executes. This narrows without implicit conversion; complete ownership and nested grammar rules remain open. See [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule).
- In partially annotated patterns, infer every unannotated binding from the input portions compatible with the entire pattern. Give it the corresponding concrete type or union, excluding impossible alternatives from all projections. Preserve composite alternatives rather than inventing combinations by independently widening their components. This rule concerns bound input values, not arbitrary unions of match-arm results; see [pattern binding inference](pattern-binding-inference.md).
- Whitespace outside token separation and literal data does not determine structure.
- Ordinary `/* ... */` comments nest; raw `/*# ... #*/` comments use matching hash fences and do not nest.
- Comments do not parse source text or insert item separators; missing closing delimiters are errors.
- Unicode identifiers are supported; the precise Unicode profile and normalization policy remain open.
- Fractional literals require a leading digit: write `0.5`, not `.5`; leading-dot context access remains distinct.
- `_` is an ordinary readable underscore-prefixed binding, not a separate wildcard. Every repeated binding name within a pattern shadows in recursive written order, including `_`; the last occurrence is visible without implying equality or changing an earlier binding's type. Source lookup precedes new bindings. This replaces the nonbinding-wildcard decision; see [pattern binding and shadowing](pattern-shadowing.md) and [underscore bindings and skips](wildcards-and-skips.md).
- An underscore-prefixed name, including _, _user, or _left, remains an ordinary readable name and explicitly permits nonuse without unused-name warnings. This applies to locals, pattern/parameter/receiver bindings, and declared fields where those diagnostics apply. It does not alter visibility, initialization, ownership, type constraints, or separate required-use/error-handling rules. See [unused-name intent](unused-name-intent.md).
- Explicit semicolons separate ordinary items; there is no automatic insertion.
- Complete block constructs end their items without requiring semicolons; trailing semicolons are optional and allowed, including for declarations initialized directly by block constructs. This supersedes the earlier prohibition.
- Continuing a block construct's value with an operator, call, member access, or indexing requires parentheses around that construct.
- Attached `else`, `then`, and `finally` clauses belong to the complete construct before its item ends.
- Extra semicolons are harmless, including after complete block items, and do not become empty result-producing statements. Trailing commas in comma-separated lists are optional and allowed; required separators between ordinary items/list elements remain significant.
- Final expressions produce block results; final declarations/assignments produce `Unit`.
- Explicit `Unit` should be supported as a value.
- `:=` declares with inference; `: Type =` declares with annotation; `=` assigns.
- Declaration prefixes are `mut`, `var`, or `var mut`, with the same forms for inferred and explicit types. `mut var` and repeated modifiers are rejected.
- Typed mutation parameters use a prefix, as in `fn(mut user: User) { ... }`; the full method-receiver notation remains open.
- Whole-binding `=` and compound updates require `var`; field/element updates require `mut` and the target's other permissions.
- Assignments are not general expressions or chained value assignments.
- Function result annotations use `:`, not `->`.
- Uniform name bindings can hold function and type definitions.
- Field aggregates use record, as in `Student := record { name: String; grade: Int; }`, replacing the earlier type-body record sketch. Declared field types use colon; construction supplies predefined fields as field = expression. Named patterns use inferred braces and destinationPattern = sourceField; the previous reverse direction is superseded. field == expected compares without binding, while field: Type type-tests and binds that same-named field. Type-only testing is : Type = sourceField. Construction may name its type explicitly or omit it when a unique expected record type is known, including annotated bindings and nested record fields. Distinct identity per declaration is selected. Complete inference/brace disambiguation, generic instantiation, visibility, and memory remain open; see [records](records.md) and [aggregate clauses](aggregate-patterns.md#named-field-clauses).
- Empty contextual record initialization is selected: profile: Profile = {} constructs a record and applies its declared-default policy. Empty executable bodies, including fn() {} and _ {} match arms, still produce Unit. Expected record result types must not silently reinterpret body braces as data. The grammar must express initializer and body roles explicitly; see [initialization modes](record-initialization.md#2-two-initialization-modes).
- Contextual zero initialization uses value: Type = 0, recursively bypassing declared field defaults when the type admits a valid zero. Only literal 0 receives this special meaning; inferred 0 remains Int, an integer variable is not converted to a record, and nonzero integer literals are rejected for record initialization. The paired = {} form applies declared defaults. Initializer omission remains undecided; see [zero initialization](zero-initialization.md).
- Each record type declaration creates a distinct type, including unnamed inline declarations, even when field shapes are identical. Convert through explicit destination reconstruction, subject to visibility and ownership. Contextual construction and headless deconstruction do not introduce implicit structural assignment. Reuse one shared record type declaration when different fields need the same type; see [record type identity](record-type-identity.md).
- Named transparent aliases use Alias := type TypeExpression for both simple and composite types. The keyword covers the whole right-hand type expression, introduces no nominal wrapper, and is not optional in alias definitions. Ordinary value bindings remain unchanged; name capitalization never chooses their kind. See [type aliases](type-aliases.md).
- Plain unions ignore member order, flatten nested plain unions, and remove duplicate resolved type identities, including transparent aliases. A | (B | A) is the same type as A | B. Distinct record declarations and enum cases retain identity; Option/Result and whole product alternatives are not flattened or redistributed. Match-arm order remains source order. See [union normalization](union-normalization.md).
- An existing value of a listed member type is admitted to a plain union automatically, without a cast or explicit case wrapper. Using an arbitrary union value as a particular member requires checked narrowing. Resolve aliases/normalization before exact membership; do not infer numeric conversions, equal-shaped record conversion, or interface implementation. See [union membership](union-membership.md).
- A plain union widens automatically to another when every normalized source alternative is an exact destination member. Preserve the active member's identity; no numeric conversion, record reconstruction, interface conversion, or recursive container/Result conversion follows. Reverse assignment needs checked narrowing when the source permits uncovered alternatives. Ownership, permissions, and layout remain separate; see [union widening](union-widening.md).
- The [reference comparison](union-membership-comparison.md) distinguishes direct unions (Scala/TypeScript), discriminated sums (Odin/V), explicit named cases (Rust/Zig/Swift), common-root sealed hierarchies (Kotlin/Dart), C++ variant construction, and Python/Lua dynamic behavior. It supports the chosen admission ergonomics without importing their nullable defaults, casts, hierarchy obligations, or representation policies.
- Early returns are encouraged.
- Common field reads through a plain union require a readable field on every possible alternative. The result is the normalized union of field types, including duplicate removal and order independence. Missing or inaccessible fields reject the projection; they are not bottom-type members to discard during normalization. Record identity stays nominal. Methods and full flow/ownership rules remain separate; see [union field reads](union-field-reads.md).
- Field writes through a plain union must be accepted by every possible target field, with mut and writable access. For P.field: C | D and Q.field: C | E, reading through P | Q produces C | D | E but only C can be written without narrowing. A standalone variable declared C | D | E can accept any member; the projected read type does not replace each parent's storage contract. See [union field writes](union-field-writes.md). Explicitly presentable access contracts are investigated in [union values and access](union-values-and-access.md); their public notation and first-class status remain proposals.
- Ordinary `Result` success is implicit when an appropriate contract is expected; errors are explicit.
- Fallible type notation is `T ! E`; `T!` means exactly `T ! Error`, declaring the general recoverable error contract. A plain `T` declares no recoverable failure. Refined error types remain available; `!T` is not an alternate spelling. Type and expression contexts distinguish a fallible type from postfix propagation without whitespace semantics.
- Multiline strings and adjacent literal joining are desired.

### Operators

- Use `and`, `or`, and `not`.
- Use `==` for equality; express inequality through negation.
- Comparison binds more tightly than `not`, followed by `and` and `or`.
- `<`, `<=`, `>`, `>=`, and `==` form comparison chains at one precedence level, checking adjacent operands with strict `Bool` results.
- Chain operands evaluate at most once from left to right; a false comparison skips later operands and comparisons. All pairs must type-check.
- Mixed comparisons and changes in direction use the same adjacent-pair rule; `not` applies to the complete chain unless parentheses specify another grouping.
- Ordinary operator operands evaluate left to right after grouping. Calls evaluate the callee first, then supplied argument expressions in source order, then invoke the callable. Short-circuiting skips unneeded expressions.
- Assignment selects its target once before the right-hand side; compound updates read its current value before their right operand, then compute and write the result. Alias and lifetime rules still need formalization.
- `?=` and `!=` have no selected meaning in the current design.
- Supported `op=` updates use defined underlying operations and evaluate the target once.
- `/` is fractional division; `//` performs integer division on integer operands, with `//=` as its update form. Positive examples are `7 / 2` yielding `3.5` and `7 // 2` yielding `3`.
- Ordinary integer division uses operator syntax without mandatory named rounding helpers or floating-point conversion. Integer `//` rounds toward negative infinity, including for negative divisors; `-7 // 2` and `7 // -2` both produce `-4`.
- Integer `%` is paired with the floor quotient so that `a == b * (a // b) + (a % b)` holds mathematically. A nonzero remainder has the divisor's sign. `//=` and `%=` preserve those rules; numeric representation, noninteger remainder, conversion policy, and operator failure contracts remain open.
- `//` is not a line-comment opener. Outside comments and strings, slash operators use longest-token recognition, including `//=` as one token.

### Conditional and loop direction

- One `if` form works for actions and values; branch braces establish ownership.
- One `loop` keyword handles Boolean, iterable, and unconditional sources.
- Remove post-condition loop syntax; use inner conditions and explicit exits.
- Loop receiver slots are item, count, accumulator; trailing slots can be omitted. An explicitly written `_` binds its slot normally and permits nonuse.
- Receiver names shadow from left to right, including nested slot patterns and ordinary `_` bindings: `_, _, acc` leaves count visible as `_` and the accumulator as acc; `_, _, _` leaves the accumulator visible as `_`.
- Tuple destructuring within a slot operates on that slot's actual value.
- Loop receiver patterns must be irrefutable for their input contracts in every slot and loop mode. Reject receivers that can fail; put refutable matching inside the body. Irrefutable tuple destructuring remains allowed. Filtering headers, adapters, mismatch termination/branches, and mismatch failures/assertions are [documented alternatives](loop-pattern-alternatives.md), not selected receiver behavior.
- Do not inject implicit ordinary names such as `it` or `acc`.
- Direction and stepping should be source/range capabilities rather than more loop keywords.
- An accumulator represents previous contributions, with absence modeled explicitly.
- Plain `continue` and bare `break` contribute nothing.
- Completion receivers are optional; `_` is an ordinary readable receiver name that permits nonuse. Receiver presence retains the proposed opt-in to a value-producing hook.
- Concise optional search loops should not require redundant `None` bodies or `else { None }`.

### Tags

- A tag is an explicit typed construct context, not a global loop object.
- Put it before the construct: `@name loop ...`, `@name if ...`, or `@name { ... }`.
- Construct kind determines metadata and permitted operations.
- Tags follow lexical shadowing; an inner tag may reuse a name.
- `.field` refers only to the current construct, with no outward fallback.
- `@name.field` explicitly selects a named context.
- `return @tag [value]` exits a named construct; omitted payload is `Unit`.

## Working proposals requiring confirmation or formalization

- The [type alias comparison](type-aliases.md) selects an explicit type prefix for named aliases while retaining uniform := definitions. Scope, generic alias parameters, cycles, namespace rules, and tuple/function/generic type grammar remain open. The prefix must not silently add another record-declaration form.

- [Record type identity](record-type-identity.md) selects distinct identity per named and unnamed inline declaration, with explicit reconstruction between distinct types. Alias spelling is now selected separately; inferred standalone record literal types, generic instantiation, and additional conversion facilities remain open.

- In an explicit record-field type position, the proposed stats: { points: Int; level: Int = 1; }; omits record because colon already requires a type. Keep the top-level Profile := record { ... } form pending broader type/value brace grammar. Distinct unnamed-type declaration identity is selected; the shorthand and whether to retain the longer nested spelling remain open. See [inline record types](record-initialization.md#6-unnamed-record-type-inside-a-record-proposal).

- The [zero/default core distinction](zero-initialization.md) is selected. Complete field-default resolution, zero eligibility across types, generic constraints, required fields, broader literal contexts, and anonymous inline record types still need confirmation/formalization. The earlier initializer-omission form remains an unresolved alternative. Do not admit invalid zeroed enum/reference/handle states or implicitly select a Result outcome from representation bits; existing implicit-success construction remains intact.

- Record-pattern syntax investigation: the selected named pattern has no type-name prefix; construction-shaped TypeName { ... } is not an alternative deconstruction form. Nominal selection uses explicit colon type tests. A bare match-arm name still binds before its body, so not every name-plus-braces sequence can be banned. The suggested same-name shorthand { name, age } and removal of record from type declarations remain separate proposals; see [records](records.md#no-construction-shaped-record-patterns).

- The [all-type pattern review](pattern-type-review.md) checks records, ordered sequences, sets, tuples/pairs, enums, strings, ranges, numbers, maps, unions, and opaque types. Confirmed primitives, loop-body selection, and lowercase Result cases remain selected; new collection forms are not silently finalized. [Sequence patterns](sequence-patterns.md) propose exact lengths and one trailing rest capture. [Set patterns](set-patterns.md) distinguish whole-set equality, membership, and unordered extraction, with extraction deferred as the recommendation. Subsequently selected field operators distinguish typed declaration, destination-first = initialization/deconstruction, == comparison, and typed same-name binding. Record patterns infer their type from their source. Construction may omit a known expected type. Earlier field-colon and reversed field-routing recommendations are superseded; complete brace/inference grammar remains open. See [aggregate patterns](aggregate-patterns.md#construction-and-matching-must-be-reviewed-together).
- The [pattern operator-placement audit](pattern-contexts.md#operator-placement-audit) checks conditions, match arms, nesting, declarations, parameters, loop receivers, and completion/recovery hooks. The same pattern meanings fit their current contracts: := supplies an explicit source, == expected tests an existing value, and constructs that already supply input do not need := in each receiver/arm. Subsequent selections keep whole typed : Type = declarations, reject whole typed : Type := aliases, permit tag-only enum patterns, and require irrefutable loop slots. Parameter and completion/recovery receiver mismatch policies remain open; no filtering is selected.
- The [type-category comparison](type-categories-comparison.md) separates products, named sums, unions of existing types, domain wrappers, generated operations, and value/reference semantics. The [enum proposal](enums-and-variants.md#design-direction-after-the-category-review) recommends one nominal enum concept for plain and payload cases, without automatic independently annotatable case subtypes. Raw mappings, checked conversion, flags, and physical layout remain separate decisions. The subsequent backing-type header and assigned case-value spelling are selected separately; data-class, value-class, and sealed-family declaration syntax remain open.
- The [match keyword-placement review](match-keyword-placement.md) compares `match value { ... }` with subject-first `value match { ... }` and recommends retaining the current prefix form. The alternative would need explicit expression precedence and a decision on block-result continuation; no alias or syntax migration is selected by the review.
- The [comparison-pattern review](comparison-patterns.md) recommends direct <, <=, >, and >= tests as an extension of the value-match family, with runtime bounds under an explicit operand/effect contract. Only direct == is currently selected. Other comparisons already work in and guards with grouped Boolean or for compound logic; logical subpatterns and binding-producing alternatives remain open.
- Given a generic User with two exposed constructor fields, `User(: Int, == outVal)` recognizes the aggregate family/schema, type-matches the first component, and compares the second with an existing value, introducing no names. Generic syntax, parameter identity, variance, runtime type-test support, and the schema contract remain open; see [generic aggregate matching](aggregate-patterns.md#generic-aggregate-example).
- [Aggregate patterns](aggregate-patterns.md) compare candidate named-field constraints such as `Student(age == outVal, name == "ali")` with `Student(== outVal, "ali")`. Equivalence requires an explicit `(age, name)` matching schema. `Student(outVal, "ali")` instead binds the first component under the selected primitive rule. Named braces with destination-first source-field selection are now selected; the older named Student(...) wrapper is superseded. Positional schema declaration, field/position mixing, omitted-field policy, and extraction contracts remain proposals.
- The [pattern primitive review](pattern-bindings-and-tests.md) now selects the base spellings. Complete value-operand boundaries, comparison effects/fallibility, exact type/subtype rules, and narrowing stability. No bare prelude-constructor exception is retained; broader inline pattern combinations require their own grammar.
- Named deconstruction uses destinationPattern = sourceField in inferred braces, superseding field as localName and the reverse field = destinationPattern. Same-name field: Type binds and type-tests; : Type = sourceField only tests. Complete schema rules, duplicate source-field selection, and ownership remain open; see [pattern aliases](pattern-aliases.md).
- The [pattern context review](pattern-contexts.md) selects irrefutable loop slots and refutable if/match selection, with no hidden filtering or error swallowing. Irrefutable parameters and completion/recovery receivers remain recommendations. Remaining colon/type/record grammar is proposed. The bind/type-match/value-match distinction is selected; the former duplicate-binding rejection recommendation is superseded by selected ordered shadowing within patterns and between loop receiver slots.
- `(x, y: (a, b: str, c), ...rest)` proposes a whole-value binding y with nested destructuring, a typed component b, and a final outer tuple-rest capture. Type constraints within destructuring are already selected; whole-value colon syntax, tuple-type ambiguity, rest result types, and simultaneous whole/component ownership remain proposals. See [nested patterns and rest](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).
- Enum/metadata collision handling still needs a policy, with an explicit ambiguity diagnostic recommended rather than silent reinterpretation. The .case shorthand and explicit Float backing-value declarations are selected. Raw mapping, uniqueness, representation, conversions, and floating-point equality details remain open. See [enums and variants](enums-and-variants.md#inferred-case-names).
- Type-only arms now use selected `: Type` and can narrow a stable existing subject without redeclaration. Every match is now exhaustive, with explicit empty ignore arms. Remaining proposals include a final else fallback and any explicit fallthrough capability. Source-order first-success selection, no implicit fallthrough, and and-chained conditions are selected. Complete operand grammar and constructor-head resolution; see [match](match.md#type-only-arms-and-remaining-coverage-proposals) and the [reference comparison](pattern-syntax-comparison.md#match-specific-comparison-and-recommendations).
- Multiple error families can be composed as `T ! (E1 | E2)` and reused through a transparent alias such as `CombinedError := type E1 | E2;`. Alias spelling is selected. Complete propagation membership, general union semantics, alias scope/generics, and conversions still need formalization. `T ! E` and the `T!` expansion are selected; define the general Error contract separately. See [fallible types and error composition](fallible-types-and-error-composition.md).
- Full method notation, parameter rebinding and call-site syntax, access inference and conversions, capture permissions, and aliasing rules remain open. Affected receiver/parameter bindings use `mut`, without an additional function-level mutation marker; see [mutability](mutability.md).
- Identifiers use `XID_Start` plus `_` initially and `XID_Continue` thereafter, with case-sensitive lookup; pin the Unicode version and settle normalization separately.
- Counter value zero before the first condition, then one-based body-entry counts.
- Boolean and unconditional item payloads use `Unit`.
- Receiver aliases are read-only snapshots of loop state.
- Count/accumulator names cover the entire header and body despite textual declaration position.
- Iterable expressions evaluate once; Boolean sources are reevaluated through static mode selection.
- Public functions require explicit signatures.
- `Int` is a checked signed 64-bit default, with explicit other representations.
- A small prelude includes output, basic collections, `Option`, and `Result`.
- Module-private declarations, type-private fields, explicit exports, a manifest, and a lockfile.
- Native compilation/caching behind a run command.
- Ownership, deterministic cleanup, and explicit shared ownership as a candidate memory model.

## Contracts to settle next

### 1. Loop contribution and construct-result inference

Define iteration type `T`, accumulator state `Option<T>`, and final result type `R` independently. Explain all of these with one coherent system:

- Last-value loops.
- Action loops with `Unit` bodies.
- Search loops whose only non-Unit values come from targeted returns.
- Empty loops and loops whose every entry skips.
- Existing `Option` values without accidental nested wrapping or flattening.
- Explicit seeds that may or may not count as body contributions.

### 2. Completion hooks and abrupt exits

Set the exact relationship between receiving `then` and a separate `else`. The latest optional-state proposal lets `then` handle both presence and absence, so a separate `else` must not process the same empty case again.

Define receiving `finally` inputs and normal-result transformations. It must be possible to perform cleanup during early returns or propagated errors without inventing a successful result or suppressing the pending exit.

Confirm whether `break value` remains alongside `return @tag value`, and whether labeled contribution-bearing `continue` is accepted.

### 3. Receiver punctuation and initialization

Choose one separator. `:` was explicitly favored for all modes, but later receiver and tag examples continued using `as`. The documentation uses `as` provisionally rather than silently accepting both.

Define explicit seed syntax in the final receiver-list form. Retired parenthesized prototypes should not become an accidental second syntax.

### 4. Context phase rules

Specify initialized fields during source evaluation, conditions, bodies, hooks, and cleanup. Define whether a standalone untagged expression block establishes a new current context. Ordinary body braces do not add a wrapper context.

For an `if` chain, distinguish the selected branch from conditions that were never evaluated. Do not represent an unevaluated condition as if it had evaluated false.

### 5. Type-system and ownership foundations

Choose generics, nominal identity, interfaces, variance, borrowing/moves/copies, shared values, closure captures, and type-level values. Define how the `Unit` type and requested `Unit` value coexist with uniform bindings.

Binding reassignment (`var`) and held-data access (`mut`) are independent. Complete method notation and receiver/parameter passing rules, define how read-only access propagates, and decide whether a stronger frozen-value guarantee exists. Mutation is marked on affected receiver/parameter bindings, without an additional function-level marker. Do not infer purity or global immutability from a read-only receiver.

### 6. Standard library and project boundaries

Specify range/iterator capabilities, invalid dynamic stride handling, collection ownership, I/O failure, import/export grammar, package identity, and build behavior.

### 7. Numeric arithmetic

Integer `//` uses floor rounding and integer `%` is its paired remainder. Define arithmetic failures, including zero divisors and unrepresentable fixed-width quotients, before claiming an operator returns a plain value, a `Result`, or an implicit trap. Complete floating-point representations, mixed numeric operations, noninteger remainder, and conversion policy independently of the selected division semantics. See [division](division.md).

### 8. Typed recovery syntax and arithmetic failure boundaries

Local recovery is required for individual operations, including addition overflow and returned function errors. Recoverable failures use postfix `!` propagation or `else` recovery with an optional receiver; ordinary calls can retain their Result as data. Recovery forms `T | D` from success and normal fallback types. Every escaping recoverable error must fit an explicitly declared error contract: `T ! E` is refined and `T!` explicitly means `T ! Error`. Define the general Error contract, generic error contracts and conversion, union composition and narrowing, representation, complete expression precedence and nested-operand scope, and ignored-outcome diagnostics. Expected-`Result` arithmetic capture and union-alias grammar remain proposals. Decide whether ordinary arithmetic faults are recoverable outcomes or another checked-fault category, and reconcile that choice with local arithmetic recovery and concise ordinary code. Define the separate panic path's triggers, execution, and cleanup guarantees. See [result and errors](result-and-errors.md), [fallible types and error composition](fallible-types-and-error-composition.md), [propagation and call chaining](propagation-and-chaining.md), and [panics](panics.md).

### 9. Pattern matching after underscore unification

Ordinary readable underscore bindings and ordered shadowing within patterns are settled. The next pattern review should distinguish binding from existing-value equality and type-only tests. Then complete recursive pattern grammar, including aliases, whole-value/nested colon syntax, and rest capture; define rebinding across and operands, binding-producing or/not, and stability of narrowed names under mutation.

The [focused review](pattern-bindings-and-tests.md) compares Rust, Python, Dart, Swift, Kotlin, Odin, Zig, and V. Bind (`name`), type match (`: Type`), and value match (`== expected`) are now selected base operations, alongside explicit `.None` case spelling. Complete operand/effect, recursive composition, and type-refinement contracts.

Loop receivers are irrefutable; parameter, recovery, and completion receiver policies remain to confirm. Complete coverage and fallback rules, enum-case/metadata collisions, stored Result payload extraction, and ownership/lifetime contracts. These are separate from underscore unused-name intent; see [pattern binding and shadowing](pattern-shadowing.md) and [pattern context review](pattern-contexts.md#review-findings-and-decisions-to-settle-first).

## Superseded suggestions

- Bare None as an absent-case pattern or a special prelude-constructor exception. Use `.None`; bare pattern identifiers bind.
- Bare `User` as a type-only arm selected through type-name lookup. Use the selected marked `: User` type-only pattern instead.

- Indentation or newlines as statement/body delimiters.
- Optional unblocked function, conditional, and loop bodies.
- The earlier pattern-if match guard separator; match arms use and chains instead.
- Provisional LiteScript `if let` headers or mandatory `case`, `=>`, or `then` separators in match arms.
- `do/end`, `then/endif`, or specialized `endfn/endloop` as the selected block system.
- Mandatory parentheses around every conditional as the chosen source/body divider.
- Post-tested loop syntax and a separate required `loop if` spelling.
- Treating every loop receiver as an automatic metadata tuple.
- Changing the supplied value based on whether a pattern is a simple name or tuple.
- Requiring `.with_state()` or a separate `with` clause just to access ordinary loop metadata.
- Implicit `it`, global `loop.field`, or a current-context lookup that searches outward.
- A prohibition on nested tag shadowing.
- Suffix tags or `name: construct` as the current tag placement.
- Mandatory `Ok(...)` on normal success paths.
- Automatic extraction of success and propagation of recoverable failure from an ordinary call without an explicit caller choice.
- Prefix `try` or postfix `?` as recoverable-error propagation aliases; postfix `!` is selected.
- Requiring a `?` marker to retain a call's Result outcome.
- Silently inferring additional escaping recoverable errors outside a function's declared error contract.
- Requiring every fallible declaration to use general Error instead of allowing refined error contracts. `T!` deliberately chooses general Error; `T ! E` retains a refined contract.
- Mandatory trailing `None` or redundant empty clauses for simple searches.
- Semicolons suppressing final-expression results.
- Requiring a semicolon after a complete block item, or the earlier prohibition on allowing one. Trailing semicolons are now optional and allowed.
- Continuing an unparenthesized block value across its item boundary through an operator, call, member access, or indexing.
- Treating `_` as a nonbinding wildcard or prohibiting reads of it. It is an ordinary underscore-prefixed name; ordered shadowing replaces the intermediate wildcard decision.
- Requiring unique binding names within a single pattern. Later names now shadow earlier ones; ordinary block redeclarations retain their separate rules.
- `_ = value` as special discard syntax. It is ordinary assignment requiring an existing var binding with a compatible type.
- Granting writable owned fields through `var` alone; `mut` is required explicitly.
- Requiring an additional function-level mutation marker beyond explicit `mut` receiver/parameter contracts.
- Rejecting comparison chains merely to simplify the grammar, or treating them as ordinary left-associated binary comparisons.
- Requiring verbose named division helpers as the ordinary interface for integer-only arithmetic; `//` and `//=` are selected.
- Truncation toward zero as the meaning of integer `//`, or a mismatched truncating remainder for integer `%`.
- `?=` equality or conventional `!=` inequality as currently selected operators.

## Documentation boundaries

These files preserve the design's evolution without claiming every assistant suggestion was approved. External languages supply comparisons, not inherited semantics. No parser, runtime, package manager, tests, or benchmarks are present or claimed.

See the [index](README.md), [grammar sketch](grammar-sketch.md), and [references](references.md).
