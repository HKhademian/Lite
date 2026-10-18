# Language documentation

Design snapshot: **2026-10-18**. Stage: **planning; no implementation**.

## How to read this reference

- **Established direction** records an explicit user choice or a rule retained by the subsequent discussion.
- **Working proposal** is a concrete design suggestion that still needs confirmation or formalization.
- **Open** means examples cannot settle the contract without another decision.
- **Superseded** identifies earlier suggestions that should not be implemented as the current design.

Examples use `text` fences because no LiteScript syntax highlighter exists in this project. They illustrate proposed language behavior rather than verified executable programs. `[...]` in grammar templates denotes optional syntax unless the document explicitly says otherwise.

`as` is used for loop receivers in current examples. The discussion also considered and provisionally accepted `:`; the final separator remains open. See [loop receivers](loop-receivers.md).

## Foundations

- [Principles](principles.md): audience, defaults, scope, and performance goals.
- [Lexical structure](lexical-structure.md): whitespace, tokens, ordinary separators, and block boundaries.
- [Comments](comments.md): nested comments, raw fences, and delimiter errors.
- [Identifiers](identifiers.md): Unicode names, ordinary underscore bindings, proposed character classes, and normalization questions.
- [Unused-name intent](unused-name-intent.md): readable _user/_left names that explicitly allow nonuse without unused-name warnings.
- [Blocks and results](blocks-and-results.md): final expressions, statement results, block boundaries, and grouped value continuation.
- [Declarations and assignment](declarations-and-assignment.md): `:=`, explicit types, and independent `var`/`mut` capabilities.
- [Mutability, access, and operations](mutability.md): the four declaration forms, held-data access, and operation receiver requirements.
- [Operators](operators.md): arithmetic, comparison, logical operations, and precedence.
- [Comparison chains](comparison-chains.md): adjacent comparisons, single evaluation, short-circuiting, and grouping.
- [Evaluation order](evaluation-order.md): left-to-right operands and arguments, assignment targets, and skipped expressions.
- [Numbers and ranges](numbers.md): inferred numeric values, range direction, and stride.
- [Division](division.md): fractional `/`, integer floor `//`, paired `%`, compound updates, and unresolved error rules.
- [Strings](strings.md): multiline contents and adjacent literal concatenation.

## Types and values

- [Types and inference](types-and-inference.md): static contracts and the intended type-system scope.
- [Records](records.md): selected record declarations, contextual construction, and destination-first deconstruction; full inference and memory contracts remain open.
- [Record type identity](record-type-identity.md): nominal versus structural compatibility, named-record recommendations, aliases, and remaining inline-type identity choices.
- [Record creation and initialization](record-initialization.md): selected zero/default distinction; declared field defaults, nested construction, inline forms, and remaining eligibility/grammar questions.
- [Contextual zero initialization](zero-initialization.md): selected value: Type = 0 versus declared-default record initialization with {}, with zero eligibility and broader literal contexts still open.
- [Type categories](type-categories.md): products, sums, raw codes, domain wrappers, generated operations, and value/reference semantics as separate decisions.
- [Type categories compared](type-categories-comparison.md): enum, struct, data/case class, value-wrapper, and sealed-family models across twelve reference languages.
- [Underscore bindings and skips](wildcards-and-skips.md): ordinary readable `_`, unused-name intent, and concise positional matching.
- [Pattern binding and shadowing](pattern-shadowing.md): repeated names, recursive binding order, source lookup, and visible binding types.
- [Pattern bindings and tests](pattern-bindings-and-tests.md): selected bind/type-match/value-match primitives, composition, explicit .None cases, and the reference comparison.
- [Comparison patterns](comparison-patterns.md): proposed direct ordering tests, selected Boolean guards, and the boundary between pattern alternatives and Boolean or.
- [Aggregate patterns](aggregate-patterns.md): selected inferred record patterns, destination-first field routing, equality and typed shorthand; positional schemas remain open.
- [Tuples and patterns](tuples-and-patterns.md): binding versus destructuring the same value.
- [Pattern binding inference](pattern-binding-inference.md): partially annotated patterns, compatible input alternatives, inferred unions, and preserved composite shapes.
- [Pattern contexts](pattern-contexts.md): cross-context audit of := source placement, == value tests, bindings, declarations, if/match, receivers, and recommended mismatch policies.
- [Pattern type review](pattern-type-review.md): comprehensive coverage review, confirmed rules, and the remaining record, sequence, set, range, and evaluation decisions.
- [Pattern examples](pattern-examples.md): simple and complex construction, destructuring, conditionals, enum/Result selection, guards, contextual record construction, and explicitly marked list/schema proposals.
- [Ordered sequence patterns](sequence-patterns.md): proposed exact list/array/slice lengths, pair/tuple relationships, and trailing rest capture.
- [Set patterns](set-patterns.md): equality versus membership versus unordered extraction, ambiguous assignments, and deferred syntax.
- [Pattern aliases](pattern-aliases.md): source-field naming versus destination bindings, reference-language renaming forms, and proposed as aliases.
- [Enums and variants](enums-and-variants.md): plain cases, explicit backing types and assigned values, associated payloads, contextual .case shorthand, selected tag-only patterns, and open representation/conversion contracts.
- [Type tests and narrowing](type-tests-and-narrowing.md): existing-name `if person: User`, explicit bindings, stability, and open flow rules.
- [Union type patterns](union-patterns.md): type-based narrowing of success and error alternatives, branch-local bindings, and intact Result distinctions.
- [Unit](unit.md): successful completion without useful data.
- [Option](option.md): explicit absence without universal nullability.
- [Result and errors](result-and-errors.md): declared typed failures, implicit success construction, postfix `!` propagation, optional-receiver `else` recovery with union results, and stored outcomes.
- [Propagation and call chaining](propagation-and-chaining.md): selected postfix `!`, per-step extraction, stored Results, and reference-language comparisons.
- [Recovery receivers and fallback types](recovery-and-fallbacks.md): optional error naming, lazy fallbacks, union results, narrowing, and reference-language comparisons.
- [Fallible types and error composition](fallible-types-and-error-composition.md): selected `T ! E` spelling and `T!` shorthand for `T ! Error`, plus proposed named compositions and aliases.
- [Panics and failure channels](panics.md): a separate panic path and open arithmetic, execution, and cleanup policies.
- [Functions](functions.md): uniform bindings, `:` result annotations, closures, and early returns.
- [Closures](closures.md): function values, capture questions, and return boundaries.
- [Composition and interfaces](composition-and-interfaces.md): records, explicit capabilities, and reuse.
- [Visibility](visibility.md): private defaults and explicitly expanded abilities.

## Control flow

- [Conditionals](conditionals.md): one syntax for actions and values.
- [Conditional pattern chains](condition-chains.md): and-chained matching, later-operand binding scope, short-circuiting, and open or/not rules.
- [Pattern syntax comparison](pattern-syntax-comparison.md): conditional bindings, narrowing, arm delimiters, and scope across reference languages.
- [Match arm chains](match-guards.md): and-chained guards, additional pattern matches, nested extraction, scope, and rejection of an arm.
- [Match](match.md): pattern-and-brace arms for action/value selection; every match is exhaustive, with the coverage algorithm and ownership details still open.
- [Match coverage](match-coverage.md): all matches are exhaustive; `_ {}` explicitly ignores remaining cases, and empty blocks already return Unit.
- [Match keyword placement](match-keyword-placement.md): prefix versus subject-first selection, reference precedents, and expression/block-boundary tradeoffs.
- [Match pattern capabilities](match-patterns.md): required equality, plain/payload enum, destructuring, type patterns, selected arm chains, and remaining composition rules.
- [Loops](loops.md): Boolean, iterable, and unconditional sources.
- [Collections and iterators](collections-and-iterators.md): source adapters and capability requirements.
- [Loop receivers](loop-receivers.md): optional item/count/accumulator binding lists and ordered shadowing.
- [Loop pattern alternatives](loop-pattern-alternatives.md): selected body-based selection, irrefutable header receivers, and deferred filtering, adapter, termination, branch, and failure forms.
- [Loop accumulator](loop-accumulator.md): contributions, optional previous values, and skipped iterations.
- [Loop completion](loop-completion.md): `then`, `else`, and `finally`.
- [Receiver clauses](receiver-clauses.md): action hooks, value hooks, and possible pattern dispatch.
- [Tags and contexts](tags-and-contexts.md): prefix tags, typed metadata, shadowing, and leading-dot access.
- [Control-flow exits](control-flow.md): `return`, targeted return, `break`, and `continue`.

## Project and implementation direction

- [Modules and packages](modules-and-packages.md): private defaults and intended packaging experience.
- [Memory and performance](memory-and-performance.md): constraints, tradeoffs, and unchosen memory semantics.
- [Tooling and learning](tooling-and-learning.md): official formatter, diagnostics, and gradual teaching.
- [Grammar sketch](grammar-sketch.md): a deliberately incomplete grammar outline.
- [Decisions and open questions](decisions-and-open-questions.md): the current design ledger.
- [References](references.md): primary language documentation and relevant research.

## Suggested reading order

Read the principles, lexical rules, blocks, declarations, and functions first. Then read conditionals and the loop documents together. Loop result inference and completion hooks must be evaluated as one contract, rather than implemented independently from isolated examples.
