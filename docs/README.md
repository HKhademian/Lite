# Language documentation

Design snapshot: **2026-10-17**. Stage: **planning; no implementation**.

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
- [Identifiers](identifiers.md): Unicode names, readable `_`, proposed character classes, and normalization questions.
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
- [Tuples and patterns](tuples-and-patterns.md): binding versus destructuring the same value.
- [Pattern binding inference](pattern-binding-inference.md): partially annotated patterns, compatible input alternatives, inferred unions, and preserved composite shapes.
- [Pattern contexts](pattern-contexts.md): review of binding versus selection in declarations, if/match, loops, parameters, recovery, and completion hooks; recommended mismatch policies and remaining gaps.
- [Pattern aliases](pattern-aliases.md): source-field naming versus destination bindings, reference-language renaming forms, and proposed as aliases.
- [Enums and variants](enums-and-variants.md): plain cases, associated payloads, case/type distinctions, and open declaration/representation contracts.
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
- [Match](match.md): pattern-and-brace arms for action/value selection; full coverage rules remain open.
- [Match pattern capabilities](match-patterns.md): required equality, plain/payload enum, destructuring, and type patterns; proposed guards and remaining naming rules.
- [Loops](loops.md): Boolean, iterable, and unconditional sources.
- [Collections and iterators](collections-and-iterators.md): source adapters and capability requirements.
- [Loop receivers](loop-receivers.md): optional item/count/accumulator binding lists and ordered shadowing.
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
