# Language documentation

Design snapshot: **2026-10-19**. Stage: **planning; no implementation**.

## How to read this reference

- **Established direction** records an explicit user choice or a rule retained by the subsequent discussion.
- **Working proposal** is a concrete design suggestion that still needs confirmation or formalization.
- **Open** means examples cannot settle the contract without another decision.
- **Superseded** identifies earlier suggestions that should not be implemented as the current design.

Examples use `text` fences because no LiteScript syntax highlighter exists in this project. They illustrate proposed language behavior rather than verified executable programs. `[...]` in grammar templates denotes optional syntax unless the document explicitly says otherwise.

Generic forms such as `Array<Float, 3>`, `List<Int>`, and `Option<User>` are temporary explanatory notation. Generic declaration/application syntax has not been designed or selected; the future review may replace these spellings. See [temporary generic notation](generic-notation.md).

As is selected for a loop's one optional item name; the earlier colon separator, receiver lists, and header destructuring are retired. See [loop receivers](loop-receivers.md).

## Foundations

- [Principles](principles.md): audience, defaults, scope, and performance goals.
- [Immutability by default](immutability-by-default.md): selected language goal of fixed bindings and readable access first, with explicit, practical mutation capabilities.
- [Lexical structure](lexical-structure.md): whitespace, tokens, ordinary separators, and block boundaries.
- [Comments](comments.md): nested comments, raw fences, and delimiter errors.
- [Identifiers](identifiers.md): Unicode names, ordinary underscore bindings, proposed character classes, and normalization questions.
- [Unused-name intent](unused-name-intent.md): readable _user/_left names that explicitly allow nonuse without unused-name warnings.
- [Blocks and results](blocks-and-results.md): final expressions, statement results, block boundaries, and grouped value continuation.
- [Declarations and assignment](declarations-and-assignment.md): `:=`, explicit types, and independent `var`/`mut` capabilities.
- [Mutability, access, and operations](mutability.md): the four declaration forms, held-data access, and operation receiver requirements.
- [Mut qualifier placement](mut-qualifier-placement.md): selected name: mut T for typed forms, retained inferred prefixes, and the completed canonical-example migration.
- [Local shadowing and copies](local-shadowing-and-copies.md): sequential same-block shadowing, shallow mutable record copies, inline nested layout, and preserved reference targets.
- [Operators](operators.md): arithmetic, comparison, logical operations, and precedence.
- [Comparison chains](comparison-chains.md): adjacent comparisons, single evaluation, short-circuiting, and grouping.
- [Evaluation order](evaluation-order.md): left-to-right operands and arguments, assignment targets, and skipped expressions.
- [Numbers and ranges](numbers.md): inferred numeric values, range direction, and stride.
- [Division](division.md): fractional `/`, integer floor `//`, paired `%`, compound updates, and numeric fault cases.
- [Arithmetic fault boundaries](arithmetic-faults.md): typed panic channel for basic arithmetic, local typed-`else` recovery, and unresolved fault cases.
- [Strings](strings.md): multiline contents and adjacent literal concatenation.

## Types and values

- [Beginner collection syntax compared](collection-ergonomics-comparison.md): construction context, simple loops, closure inference, and generic function declarations across Rust, Zig, and V.
- [Collection syntax for beginners](collection-inference.md): contextual nested literals, inferred function requirements, and an unselected element-oriented annotation, without mandatory protocol vocabulary in first lessons.
- [Collection consumer abstractions](collection-abstractions.md): selected direction of minimum behavioral inputs, interchangeable providers, unified element typing, and honest traversal semantics.
- [Collection capabilities](collection-capabilities.md): proposed traversal, size, repeatability, indexing, contiguity, membership, and output requirements; no universal container superclass.
- [Sequence end operations](sequence-end-operations.md): proposed push/pop names, aligned indexing/removal failure modes, structural capabilities, and List/deque costs.
- [Short indexed-sequence contract](indexed-sequence-contract.md): accepted [T] indexed/iterable direction, get_index/set_index/iterable hooks, mutable refinement, and unresolved extent/storage spellings.
- [Collection operation contracts](collection-operation-contracts.md): compiler resolution beneath loop/bracket sugar, missing support versus runtime failure, and inferred requirements without new beginner vocabulary.
- [Collection function signatures](collection-function-signatures.md): required inputs, guaranteed outputs, inferred versus complete contracts, generic relationships, static abstract returns, and explicit runtime representations.
- [Collection signature ergonomics](collection-signature-ergonomics.md): the risk of overconstrained library APIs, complete shorthand versus partial element annotations, and explicit stable contracts.
- [Collection and source contracts](collection-source-contracts.md): static/runtime/unknown size, hot/cold production, replay, stability, and future generator consumption.
- [Collection order and shared traversal](collection-order-and-traversal.md): positional/insertion/sorted/unspecified order, iterable sets, noniterable membership stores, and reference examples.
- [Checked collection operations](checked-collection-operations.md): proposed fallible indexing, mismatch versus extraction failure, and flat checked declarations with explicit recovery.
- [Provider-neutral algorithms](collection-algorithms.md): proposed fast customization hooks, generic fallbacks, lazy results, caller-selected output providers, and open extension rules.
- [Generic collection performance](generic-collection-performance.md): unified scalar/record APIs, static specialization versus runtime erasure, element representation, and reference comparisons.

- [Temporary generic notation](generic-notation.md): angle brackets explain type-family concepts while generic source syntax remains deferred; type inputs and compile-time values are distinct concerns.

- [Sequence types compared](sequence-types-comparison.md): fixed arrays, growable lists, slices, and copy/storage tradeoffs across Odin, Rust, Zig, V, Go, Swift, Kotlin, and Dart.
- [Sequence storage families](sequence-types.md): selected growable List literal default; proposed array owners and slice views, storage/copy boundaries, and decision order.
- [Arrays](arrays.md): proposed compile-time inline arrays and runtime-sized fixed-length owners; initialization, layout, and sized-view distinctions.
- [Lists](lists.md): selected growable List literal default; proposed contiguous owners, length versus uninitialized capacity, explicit mutation, and open owner-copy semantics.
- [Slices](slices.md): proposed borrowed contiguous views, read-only defaults, mutable access, lifetime/invalidation, and initialized bounds.

- [Types and inference](types-and-inference.md): static contracts and the intended type-system scope.
- [Record literal boundaries](record-literal-boundaries.md): optional semicolons after record initializers and unresolved inferred-literal versus executable-block classification.
- [Records](records.md): selected record declarations, contextual construction, and destination-first deconstruction; full inference and memory contracts remain open.
- [Record type identity](record-type-identity.md): selected distinct identity per declaration, including inline types; explicit reconstruction, shared type reuse, and reference comparisons.
- [Type aliases](type-aliases.md): selected Alias := type TypeExpression, transparent identity, and comparison with the rejected direct-binding alternative.
- [Plain union normalization](union-normalization.md): selected order independence, flattening, and duplicate removal without collapsing nominal records, enum cases, Option, or Result.
- [Union membership](union-membership.md): selected automatic member admission, checked narrowing, nominal identity, and remaining representation contracts.
- [Union widening](union-widening.md): selected automatic widening when every normalized source alternative is an exact destination member, with checked narrowing in the reverse direction.
- [Union field reads](union-field-reads.md): selected availability on every alternative, normalized union of field types, and rejection for missing or inaccessible fields.
- [Union field writes](union-field-writes.md): selected compatibility with every possible target field, preserving each parent's storage type and mutation permissions.
- [Union values and access contracts](union-values-and-access.md): a slot containing a union versus a union of possible slots; proposed explicit read/write contracts and reference-language comparisons.
- [Qualified access summaries](access-union-qualifiers.md): exploration of A | mut B | C, common write capabilities, source-contract boundaries, and payload mutation versus replacement.
- [Var access qualifier](var-access-qualifier.md): var unifies local replacement permission and received caller-storage access; no local-only header modifier; slot is retired as a source keyword.
- [Replacement access summaries](slot-access-qualifier.md): canonical var marker, grouped distribution, and var-binding summaries; whole access-contract grammar remains open.
- [Caller-location parameters](slot-parameters.md): selected temporary caller-location access and explicit var grants; proposed two-direction compatibility, with Swift/Rust/Zig/V comparisons.
- [Access ergonomics](slot-ergonomics.md): infer derived mathematical summaries while keeping caller-visible replacement explicit in signatures and calls.
- [Parameter permissions](parameter-permissions.md): local var declarations, payload mut, and caller-storage var; fixed location associations and open combined-access syntax.
- [Caller mutation grants](caller-mutation-grants.md): explicit mut for caller-data updates and var for caller-location replacement; existing source authority is required.
- [Ordinary parameters and slots](parameter-values-and-slots.md): read-only defaults, semantic passing versus compiler representation, and scoped writable locations without adopting public pointers or general references.
- [Caller-location keywords](caller-location-keywords.md): historical ref/mut/slot/mut ref comparison, superseded spelling recommendation, and preserved permission boundaries.
- [Union membership across references](union-membership-comparison.md): entry, narrowing, named cases, hierarchy requirements, default states, and representation across the reference languages.
- [Record creation and initialization](record-initialization.md): omitted typed initializers and = 0 select zero; = {} uses declared defaults; nested construction, inline forms, and remaining eligibility/grammar questions.
- [Universal zero initialization](zero-initialization.md): valid all-zero values for every type, omitted/explicit zero versus declared defaults, and pending mappings for special types.
- [Reserved storage](reserved-storage.md): selected value: Type = ? marker; earlier generic reserve() and punctuation alternatives; open initialization-state, partial construction, and allocation/cleanup contracts.
- [First initialization](first-initialization.md): first whole-value = without var, once per execution path; complete branch coverage before use, later replacement permissions, and reference-language comparisons.
- [Type categories](type-categories.md): products, sums, raw codes, domain wrappers, generated operations, and value/reference semantics as separate decisions.
- [Type categories compared](type-categories-comparison.md): enum, struct, data/case class, value-wrapper, and sealed-family models across twelve reference languages.
- [Underscore bindings and skips](wildcards-and-skips.md): ordinary readable `_`, unused-name intent, and concise positional matching.
- [Pattern binding and shadowing](pattern-shadowing.md): repeated names, recursive binding order, source lookup, and visible binding types.
- [Pattern bindings and tests](pattern-bindings-and-tests.md): selected bind/type-match/value-match primitives, composition, explicit .None cases, and the reference comparison.
- [Comparison patterns](comparison-patterns.md): proposed direct ordering tests, selected Boolean guards, and the boundary between pattern alternatives and Boolean or.
- [Aggregate patterns](aggregate-patterns.md): selected inferred record patterns, destination-first field routing, equality and typed shorthand; positional schemas remain open.
- [Tuples and patterns](tuples-and-patterns.md): binding versus destructuring the same value.
- [Tuple spread and rest](tuple-spread-and-rest.md): requested construction spreading and typed pattern capture, known shapes, evaluation order, and unresolved empty/singleton tuple details.
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
- [Unit](unit.md): successful completion without useful data; one value, selected zero mapping, and proposed zero-sized physical representation.
- [Option](option.md): explicit absence without universal nullability.
- [Result and errors](result-and-errors.md): declared typed failures, implicit success construction, postfix `!` propagation, optional-receiver `else` recovery with union results, and stored outcomes.
- [Throw as an error return](error-return-sugar.md): proposed throw error shorthand for return .err(error), declared error coverage, function/closure boundaries, and unchanged caller handling.
- [Propagation and call chaining](propagation-and-chaining.md): selected postfix `!`, per-step extraction, stored Results, and reference-language comparisons.
- [Recovery receivers and fallback types](recovery-and-fallbacks.md): optional error naming, lazy fallbacks, union results, narrowing, and reference-language comparisons.
- [Fallible types and error composition](fallible-types-and-error-composition.md): selected `T ! E` spelling and `T!` shorthand for `T ! Error`, plus proposed named compositions and aliases.
- [Recovery boundaries](recovery-boundaries.md): mandatory handling of Result arguments, preferred local fallbacks, panic-scope comparison, evaluation traces, and implementation tradeoffs.
- [Recovery receiver types](recovery-receiver-types.md): selected typed filtering, unmatched-channel behavior, and open broad receiver representation.
- [Shared expression recovery](expression-recovery.md): selected catch-all and typed-filter `else` forms for returned errors and panics, pending evaluation scope, broad receiver typing, cleanup, and runtime design.
- [Panics and failure channels](panics.md): typed panic propagation, the selected arithmetic channel, and open recovery, execution, and cleanup policies.
- [Future typed panics](typed-panics.md): requested structured fault categories for underlying null access, zero division, overflow, and related faults, with capture scope, transfer, and cleanup still open.
- [Bounds and arithmetic policy](checked-fault-policy.md): fallible defaults versus asserting operations with explicit checked capture, source-level burden, panic scope, and unchanged propagation rules.
- [Functions](functions.md): uniform bindings, `:` result annotations, closures, and early returns.
- [Closures](closures.md): function values, capture questions, and return boundaries.
- [Composition and interfaces](composition-and-interfaces.md): records, explicit capabilities, and reuse.
- [Visibility](visibility.md): private defaults and explicitly expanded abilities.

## Control flow

- [Body-owned recovery](body-recovery.md): selected internal recovery placement; body-wide section examples and delimiter candidates are explicitly deferred.
- [Deferred cleanup and resources](deferred-cleanup-and-resources.md): future joint review of body-wide sections, defer, scoped resource management, cleanup ordering, and lifetimes.
- [Conditional recovery](conditional-recovery.md): historical external-handler proposal, superseded by body-owned recovery; ordinary branch selection and explicit Result handling remain.
- [Conditionals](conditionals.md): one syntax for actions and values.
- [Conditional pattern chains](condition-chains.md): and-chained matching, later-operand binding scope, short-circuiting, and open or/not rules.
- [Pattern syntax comparison](pattern-syntax-comparison.md): conditional bindings, narrowing, arm delimiters, and scope across reference languages.
- [Match arm chains](match-guards.md): and-chained guards, additional pattern matches, nested extraction, scope, and rejection of an arm.
- [Match](match.md): pattern-and-brace arms for action/value selection; every match is exhaustive, with the coverage algorithm and ownership details still open.
- [Match coverage](match-coverage.md): all matches are exhaustive; `_ {}` explicitly ignores remaining cases, and empty blocks already return Unit.
- [Match keyword placement](match-keyword-placement.md): prefix versus subject-first selection, reference precedents, and expression/block-boundary tradeoffs.
- [Match pattern capabilities](match-patterns.md): required equality, plain/payload enum, destructuring, type patterns, selected arm chains, and remaining composition rules.
- [Loops](loops.md): Boolean, iterable, and unconditional sources.
- [Loop examples](loop-examples.md): worked loops with one optional item name, metadata state, nested exits, adapters, and operation-local error handling, with provisional contracts marked.
- [Unified loop completion](unified-loop-completion.md): selected receiverless then with .count/.value on tagged or untagged loops, final-expression results, and completion distinguished from deferred cleanup.
- [Collections and iterators](collections-and-iterators.md): source adapters and capability requirements.
- [Optional loop item name](loop-receivers.md): one item identifier, body-local destructuring, and metadata instead of receiver lists.
- [Loop pattern alternatives](loop-pattern-alternatives.md): selected body-based selection and historical receiver-pattern/filtering alternatives, with adapter, termination, branch, and failure questions deferred.
- [Loop value](loop-value.md): typed zero-initialized .value, internal commits, skipped iterations, and result inference.
- [Loop type inference](loop-type-inference.md): body and destination constraints, value-only bodies, separate completion results, and numeric compatibility boundaries.
- [Last item during completion](loop-last-item.md): .item/.index reporting, zero/empty behavior, and use-based retention that keeps no unused item state for completion.
- [Historical accumulator](loop-accumulator.md): retired Option/previous-value receiver model.
- [Finally](finally.md): selected cleanup-only behavior with preserved pending outcomes, plus open attachment, panic, and cleanup-failure rules.
- [Loop recovery](loop-recovery.md): historical grouped-loop recovery example; external handler placement is superseded, with completion and cleanup questions retained.
- [Loop completion](loop-completion.md): receiverless `then`, its result and metadata, and its distinction from deferred cleanup.
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
