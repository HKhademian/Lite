# Decisions and open questions

Snapshot: **2026-10-17**. Source: the language-design discussion in this chat. No compiler implementation or conformance result is implied.

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
- Match arms use `pattern { body }` without `case`, an arrow, or arm separators. Match shares action/value syntax and requires exhaustive value selection for closed variants; detailed coverage, fallback patterns, ordering, and ownership remain open.
- Match must support equality, conventional payload-free enums, enums with associated values, destructuring, and type checking/matching. Enum cases are not assumed to be separate types; plain enum support does not silently select integer conversion or representation rules. See [match pattern capabilities](match-patterns.md) and [enums and variants](enums-and-variants.md).
- Type matching composes with destructuring: `(x: Int, y: String)` can test and bind tuple components directly in a match arm or an `if` pattern; constructor payload patterns can contain such subpatterns. The whole pattern must match before its branch executes. This narrows without implicit conversion; complete ownership and nested grammar rules remain open. See [typed destructuring](match-patterns.md#typed-destructuring-selected-composition-rule).
- Whitespace outside token separation and literal data does not determine structure.
- Ordinary `/* ... */` comments nest; raw `/*# ... #*/` comments use matching hash fences and do not nest.
- Comments do not parse source text or insert item separators; missing closing delimiters are errors.
- Unicode identifiers are supported; the precise Unicode profile and normalization policy remain open.
- Fractional literals require a leading digit: write `0.5`, not `.5`; leading-dot context access remains distinct.
- `_` is a readable binding name, not a wildcard or a special discard-assignment target.
- Explicit semicolons separate ordinary items; there is no automatic insertion.
- Complete block constructs end their items without semicolons; a following semicolon is rejected, including for declarations initialized directly by block constructs.
- Continuing a block construct's value with an operator, call, member access, or indexing requires parentheses around that construct.
- Attached `else`, `then`, and `finally` clauses belong to the complete construct before its item ends.
- Extra semicolons are harmless where separators are allowed, but remain forbidden after complete block items and do not become empty result-producing statements.
- Final expressions produce block results; final declarations/assignments produce `Unit`.
- Explicit `Unit` should be supported as a value.
- `:=` declares with inference; `: Type =` declares with annotation; `=` assigns.
- Declaration prefixes are `mut`, `var`, or `var mut`, with the same forms for inferred and explicit types. `mut var` and repeated modifiers are rejected.
- Typed mutation parameters use a prefix, as in `fn(mut user: User) { ... }`; the full method-receiver notation remains open.
- Whole-binding `=` and compound updates require `var`; field/element updates require `mut` and the target's other permissions.
- Assignments are not general expressions or chained value assignments.
- Function result annotations use `:`, not `->`.
- Uniform name bindings can hold function and type definitions.
- Early returns are encouraged.
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
- Loop receiver slots are item, count, accumulator; trailing slots can be omitted and `_` can name an otherwise unused slot.
- Receiver bindings shadow from left to right; `_, _, _` leaves `_` referring to the accumulator. The rule also applies to other repeated receiver names.
- Tuple destructuring within a slot operates on that slot's actual value.
- Do not inject implicit ordinary names such as `it` or `acc`.
- Direction and stepping should be source/range capabilities rather than more loop keywords.
- An accumulator represents previous contributions, with absence modeled explicitly.
- Plain `continue` and bare `break` contribute nothing.
- Completion receivers are optional; `_` binds readable input and opts into a value-producing hook even if that input is left unused.
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

- `(x, y: (a, b: str, c), ...rest)` proposes a whole-value binding y with nested destructuring, a typed component b, and a final outer tuple-rest capture. Type constraints within destructuring are already selected; whole-value colon syntax, tuple-type ambiguity, rest result types, and simultaneous whole/component ownership remain proposals. See [nested patterns and rest](tuples-and-patterns.md#proposal-whole-value-binding-nested-patterns-and-rest).
- Enum cases may omit their owning type as `.started` or `.completed` when one enum is established by the match subject or expected operand type. Resolve this separately from current-context `.field`, with no outward search and an explicit ambiguity diagnostic as the recommended policy. Float raw-value enums are an independent proposal; their case identity, raw mapping, uniqueness, representation, and conversions remain open. See [enums and variants](enums-and-variants.md#proposal-inferred-case-names).
- Match review recommends type-only arms that narrow a stable existing subject (bare `User` versus marked `: User` remains open), a final `else` fallback, exhaustive action matches as well as value matches, first-successful-arm ordering, no fallthrough, and optional `if` guards. None of these recommendations silently extends the selected arm grammar. Constant/type/capture name resolution needs a decision; see [match](match.md#next-design-proposals-compact-arms-and-predictable-coverage) and the [reference comparison](pattern-syntax-comparison.md#match-specific-comparison-and-recommendations).
- Multiple error families can be composed as `T ! (E1 | E2)` and reused through a transparent alias such as `CombinedError := type E1 | E2;`. Propagation into a declared union preserves covered alternatives and rejects uncovered ones. Composition, alias grammar, general union semantics, and conversions remain proposals. `T ! E` and the `T!` expansion are already selected; define the general Error contract separately. See [fallible types and error composition](fallible-types-and-error-composition.md).
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

## Superseded suggestions

- Indentation or newlines as statement/body delimiters.
- Optional unblocked function, conditional, and loop bodies.
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
- Requiring or allowing a semicolon after a complete block item.
- Continuing an unparenthesized block value across its item boundary through an operator, call, member access, or indexing.
- An unreadable `_` wildcard, or `_ = value` as a special discard statement.
- Granting writable owned fields through `var` alone; `mut` is required explicitly.
- Requiring an additional function-level mutation marker beyond explicit `mut` receiver/parameter contracts.
- Rejecting comparison chains merely to simplify the grammar, or treating them as ordinary left-associated binary comparisons.
- Requiring verbose named division helpers as the ordinary interface for integer-only arithmetic; `//` and `//=` are selected.
- Truncation toward zero as the meaning of integer `//`, or a mismatched truncating remainder for integer `%`.
- `?=` equality or conventional `!=` inequality as currently selected operators.

## Documentation boundaries

These files preserve the design's evolution without claiming every assistant suggestion was approved. External languages supply comparisons, not inherited semantics. No parser, runtime, package manager, tests, or benchmarks are present or claimed.

See the [index](README.md), [grammar sketch](grammar-sketch.md), and [references](references.md).
