# Language documentation

Design snapshot: **2026-10-26**. Stage: **planning; no implementation**.

## Start here

1. [LiteLang white paper](white-paper.md): the LiteLang philosophy, intended audience, and criteria for every design decision.
2. [Principles and goals](principles.md): a concise overview of established goals and defaults.
3. [Current decisions and open questions](decisions-and-open-questions.md): selected contracts and work still to settle.
4. [Provisional grammar sketch](grammar-sketch.md): the current syntax outline and its remaining boundaries.
5. [LiteLang current design specification](spec/README.md): stable-ID summary of selected rules, subordinate to the normative pages.
6. [Normative page map](normative-pages.md): which page owns each current rule and which pages are historical.

The detailed reference below develops these foundations one concept at a time.

## Reading paths

- **Foundations and types:** white paper → principles → decisions → grammar sketch → type categories → unions → patterns → errors.
- **Collections and sequences:** collections and iterators → sequence types → arrays/lists/slices → collection contracts and algorithms.
- **Control flow and lifecycle:** blocks and results → conditionals → loops → exits → recovery → finally and cleanup.
- **Modules, performance, and tooling:** modules and packages → memory and performance → tooling and learning.

These are reading paths, not separate index entries; each document has one canonical entry in this index.

## How to read this reference

- **Selected / established** records an explicit user choice or a rule retained by the subsequent discussion. Status lines use “selected” for a specific decision and “established” for the broader direction; both have the same normative weight.
- **Working proposal** is a concrete design suggestion that still needs confirmation or formalization. Status lines may say “proposal” or “proposed.”
- **Open** means examples cannot settle the contract without another decision.
- **Superseded / historical** identifies earlier suggestions that should not be implemented as the current design. “Historical” marks a retained record rather than live status.

These four categories are the intended filter; status lines may use the synonyms above.

Examples use `text` fences because no LiteLang syntax highlighter exists in this project. They illustrate proposed language behavior rather than verified executable programs. `[...]` in grammar templates denotes optional syntax unless the document explicitly says otherwise.

Tuple type components use `name: Type`, a bare label with an inferred type, or `:Type` for an unnamed component. For example, `(l: Int, r: Int)`, `(l, r)`, and `(:Int, :Int)` have distinct named/unnamed roles in type context. Tuple value expressions and binding patterns retain their context-specific meanings; see the component grammar in the named-input routing entry.

Generic forms such as `Array<Float, 3>`, `List<Int>`, and `Option<User>` are temporary explanatory notation. Generic declaration/application syntax has not been designed or selected; the future review may replace these spellings. See the temporary generic notation entry.

## Foundations

- [Continuity and analogical coherence](continuity-and-analogy.md): design-method principle of local predictability, visible semantic boundaries, and transferable syntax patterns.
- [Immutability by default](immutability-by-default.md): selected language goal of fixed bindings and readable access first, with explicit, practical mutation capabilities.
- [Lexical structure](lexical-structure.md): whitespace, tokens, ordinary separators, optional leading chain separators, block boundaries, and the shared rule to omit unnecessary semicolons after complete block items at every nesting depth.
- [Optional leading separators](leading-separators.md): selected leading and/or on Boolean expressions/conditions, identity + on additive chains, or on initial/nested pattern alternatives, and | on nonempty unions; equivalent compact forms, unchanged effects/bindings, nonempty boundaries, selected earlier chain presentation, and conditional future leading-& support.
- [Comments](comments.md): nested comments, raw fences, parser-neutral trivia, Ali's commented-out condition, delimiter errors, and selected opaque-content/attachment-preserving formatting with surrounding layout changes.
- [Identifiers](identifiers.md): Unicode names, ordinary underscore bindings, proposed character classes, and normalization questions.
- [Unused-name intent](unused-name-intent.md): readable _user/_left names that explicitly allow nonuse without unused-name warnings.
- [Blocks and results](blocks-and-results.md): final expressions, statement results, block boundaries, and grouped value continuation.
- [Declarations and assignment](declarations-and-assignment.md): `:=`, unparenthesized Boolean initializers with optional leading and/or, explicit types, independent `var`/`mut` capabilities, and declared replacement contracts versus flow-sensitive read types.
- [Mutability, access, and operations](mutability.md): the four declaration forms, held-data access, and operation receiver requirements.
- [Mut qualifier placement](mut-qualifier-placement.md): selected name: mut T for typed forms, retained inferred prefixes, and the completed canonical-example migration.
- [Local shadowing and copies](local-shadowing-and-copies.md): sequential same-block shadowing, shallow mutable record copies, inline nested layout, and preserved reference targets.
- [Operators](operators.md): selected basic arithmetic precedence and binary left association, comparison/logical operations, optional leading logical separators and identity additive +, and selected power spelling with explicit unary-minus grouping.
- [Power and negation](power-and-negation.md): reject -base `**` exponent, require the negative-base or outer-negation group, and retain open power typing/association/domain contracts.
- [Arithmetic operators across languages](arithmetic-operators-comparison.md): Java, C, C++, C#, Python, and modern references; division/remainder/modulo, current / _/ % _% family with rem/mod meanings, power and unary signs, identity versus promotion/conversion, primary sources, and seven versioned local toolchain probes.
- [Signed division, remainder, and modulo table](signed-division-table.md): 56 operation rows across 18 languages, all four sign combinations, integer versus fractional division, named floor/Euclidean alternatives, and captured V playground results.
- [Negated comparison operators](negated-comparison-operators.md): selected ASCII positive/negative family at one comparison precedence; Boolean complements, adjacent-pair chains, propagation boundaries, type-suffix attachment, and historical alternatives. All ten also support nonbinding comparison-pattern prefixes; general logical patterns remain separate.
- [Comparison chains](comparison-chains.md): adjacent comparisons, single evaluation, short-circuiting, and grouping.
- [Evaluation order](evaluation-order.md): left-to-right operands and arguments, var input facts that must survive later arguments, assignment targets, and skipped expressions.
- [Numbers and ranges](numbers.md): inferred numeric values, identity leading + without conversion or implicit zero, range direction, and stride.
- [Division](division.md): contextual /, integer floor _/, remainder %, modulo _%, corresponding updates, signed results, and open numeric/lexical contracts.
- [Arithmetic methods and selected family](arithmetic-methods-and-division-revision.md): / _/ % _%, additional named methods, division calculation versus integer storage, retained compact/spaced requirement, and unresolved underscore/identifier scanning.
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
- [Checked collection operations](checked-collection-operations.md): policy comparison; selected direct positional operations with typed faults and attached `else` recovery; fallible-default indexing is historical.
- [Provider-neutral algorithms](collection-algorithms.md): proposed fast customization hooks, generic fallbacks, lazy results, caller-selected output providers, and open extension rules.
- [Generic collection performance](generic-collection-performance.md): unified scalar/record APIs, static specialization versus runtime erasure, element representation, and reference comparisons.

- [Temporary generic notation](generic-notation.md): angle brackets explain type-family concepts while generic source syntax remains deferred; type inputs and compile-time values are distinct concerns.

- [Sequence types compared](sequence-types-comparison.md): fixed arrays, growable lists, slices, and copy/storage tradeoffs across Odin, Rust, Zig, V, Go, Swift, Kotlin, and Dart.
- [Sequence storage families](sequence-types.md): fixed-array inference for fresh known-size literals, element-wise fixed-array value widening without added write permission, explicit growable Lists, proposed owners/views, and separate permissions and storage contracts.
- [Arrays](arrays.md): [T; N] fixed extents, header-free inline layout, zero-sized element counts, literal/spread construction, runtime arrays for variadic tails, and open ownership/runtime representation details.
- [Lists](lists.md): explicitly selected growable storage, length versus uninitialized capacity, explicit mutation, and open owner-copy semantics; no unconditional List literal default.
- [Slices](slices.md): proposed borrowed contiguous views, read-only defaults, mutable access, lifetime/invalidation, and initialized bounds.

- [Types and inference](types-and-inference.md): static contracts, general safe widening, component-wise tuple value widening, complete-contract proofs for generic widening, and the intended type-system scope.
- [Record literal boundaries](record-literal-boundaries.md): optional semicolons after record initializers and unresolved inferred-literal versus executable-block classification.
- [Records](records.md): selected record declarations, contextual construction, and destination-first deconstruction; full inference and memory contracts remain open.
- [Record type identity](record-type-identity.md): selected distinct identity per declaration, including inline types; explicit reconstruction, shared type reuse, and reference comparisons.
- [Type aliases](type-aliases.md): selected Alias := type TypeExpression, optional leading | in union initializers, transparent identity, and comparison with the rejected direct-binding alternative.
- [Plain union normalization](union-normalization.md): selected order independence, flattening, duplicate removal, and unchanged identity with optional leading |, without collapsing nominal records, enum cases, Option, or Result.
- [Union membership](union-membership.md): selected automatic member admission, checked payload reads/ordinary arguments, proven member-payload writes versus whole-union replacement grants, unchanged declared replacements under narrowing, nominal identity, and remaining representation contracts.
- [Union widening](union-widening.md): selected automatic widening when every normalized source alternative is an exact destination member, with checked narrowing in the reverse direction.
- [Union field reads](union-field-reads.md): selected availability on every alternative, normalized union of field types, and rejection for missing or inaccessible fields.
- [Union field writes](union-field-writes.md): selected compatibility with every possible target field, preserving each parent's storage type and mutation permissions.
- [Union values and access contracts](union-values-and-access.md): a storage location containing a union versus a union of possible storage locations; historical access notation and proposed explicit read/write contracts.
- [Union initialization policy](union-initialization-policy.md): selected rejection of `x: A | B = 0` for multiple distinct normalized members; explicit `?` and initialized member expressions remain; member-qualified zero markers are proposed.
- [Union zero](union-zero.md): selected universal zero requirement; active-member priority and mappings for unions, enums, references, and resources remain open.
- [Empty union zero proposal](union-empty-zero-proposal.md): proposed empty state for unions; not selected; compared with Unit and member-priority alternatives.
- [Conditional union fallback](conditional-union-fallback.md): declaration initializers with a multi-member union require an explicit `else` or `?`; assignment and loop no-match paths are noncontributing.
- [Branch result inference](branch-result-inference.md): normalized union inference for conditional, match, and local-lambda completion; explicit contracts constrain it, and `then` requires a final `else`.
- [Union parameter defaults](union-parameter-defaults.md): argument omission is rejected without an applicable explicit default; call-time default ordering and the absence of an automatic zero fallback.
- [Qualified access summaries](access-union-qualifiers.md): historical exploration of `A | mut B | C`, common write capabilities, source-contract boundaries, and payload mutation versus replacement.
- [Call replacement flow](call-replacement-flow.md): current-read and declared-write compatibility at invocation, later-argument invalidation, single source write grants, nested forwarding and caller recovery, rejected cross-member calls, and deferred write-only access.
- [Var access qualifier](var-access-qualifier.md): var unifies local replacement permission and received caller-storage access; no local-only header modifier; slot is retired as a source keyword.
- [Replacement access summaries](slot-access-qualifier.md): canonical var marker, grouped distribution, and var-binding summaries; whole access-contract grammar remains open.
- [Caller-location parameters](slot-parameters.md): selected temporary caller-location access and explicit var grants; proposed two-direction compatibility, with Swift/Rust/Zig/V comparisons.
- [Access ergonomics](slot-ergonomics.md): infer derived mathematical summaries while keeping caller-visible replacement explicit in signatures and calls.
- [Parameter permissions](parameter-permissions.md): local var declarations, payload mut, and caller-storage var; fixed location associations and open combined-access syntax.
- [Caller mutation grants](caller-mutation-grants.md): explicit mut for caller-data updates and var for caller-location replacement; existing source authority is required.
- [Ordinary parameters and caller locations](parameter-values-and-slots.md): general copy semantics including returns, no implicit references, explicit var/mut grants, physical copy elimination, and deferred reference/safety contracts.
- [Caller-location keywords](caller-location-keywords.md): historical ref/mut/slot/mut ref comparison, superseded spelling recommendation, and preserved permission boundaries.
- [Union membership across references](union-membership-comparison.md): entry, narrowing, named cases, hierarchy requirements, default states, and representation across the reference languages.
- [Union storage and references](union-storage-reference-comparison.md): cross-language comparison of union storage, active-member representation, and reference behavior.
- [Record creation and initialization](record-initialization.md): omitted typed initializers and = 0 select zero; = {} uses declared defaults; nested construction, inline forms, and remaining eligibility/grammar questions.
- [Universal zero initialization](zero-initialization.md): valid all-zero values for every type, omitted/explicit zero versus declared defaults, and pending mappings for special types.
- [Reserved storage](reserved-storage.md): selected value: Type = ? marker; earlier generic reserve() and punctuation alternatives; open initialization-state, partial construction, and allocation/cleanup contracts.
- [First initialization](first-initialization.md): first whole-value = without var, once per execution path; complete branch coverage before use, later replacement permissions, and reference-language comparisons.
- [Type categories](type-categories.md): products, sums, raw codes, domain wrappers, generated operations, and value/reference semantics as separate decisions.
- [Type categories compared](type-categories-comparison.md): enum, struct, data/case class, value-wrapper, and sealed-family models across twelve reference languages.
- [Underscore bindings and skips](wildcards-and-skips.md): ordinary readable `_`, unused-name intent, and concise positional matching.
- [Pattern binding and shadowing](pattern-shadowing.md): repeated names within patterns and across successful chain/guard bindings, recursive binding order, source lookup, and visible binding types.
- [Pattern bindings and tests](pattern-bindings-and-tests.md): selected bind/type-match/value-match primitives, composition, explicit .None cases, and the reference comparison.
- [Comparison patterns](comparison-patterns.md): all ten nonbinding comparison prefixes, selected arithmetic/call/member and grouped RHS forms, required grouping for outer comparison/Boolean/conditional/block operands, runtime bounds evaluated once when reached, ordinary comparison/failure semantics, rejection of implicit-subject chains, and if guards for complex conditions.
- [Aggregate patterns](aggregate-patterns.md): selected inferred record patterns, destination-first field routing, equality and typed shorthand; positional schemas remain open.
- [Tuples and patterns](tuples-and-patterns.md): selected positional/named/mixed bindings, typed/inferred tuple annotations, nested variable-or-pattern collectors without double binding, and remaining recursive parsing/ownership contracts.
- [Tuple and callable labels under explicit destination types](tuple-label-conversions.md): strict ordinary label compatibility with explicit typed-declaration conversion, destination public call labels, unchanged implementation bindings/defaults, the distinction from value reordering or runtime label storage, and the requested future in-place memory-compatible cast discussion.
- [Named arguments and named tuples](named-arguments-and-tuples.md): selected interleaved call inputs, same-name shorthand, explicit tuple call spread, named replacement, and structural, label-sensitive stored tuples; explicit typed-declaration label conversion for tuples/callables with strict ordinary transfers, with other compatibility/conversion rules open; modern reference-language comparisons.
- [Tuple entries and access](tuple-entries-and-access.md): selected = identifier named shorthand, unnamed and mixed value entries, inferred mixed tuple types, fixed zero-based numeric access, singleton values, selected ()/Unit empty tuple identity, and a cross-context review of types, patterns, calls, lambdas, initialization, and spread.
- [Concrete named input routing](named-input-routing.md): selected argument mapping, invalid-input checks, named destructuring, tuple component forms, written evaluation order, fixed destination tuple routing with complete coverage and no implicit component defaults, and fresh-versus-stored tuple behavior; selected missing-default evaluation after supplied inputs in declared slot order; open callable, default-typing/scope, and permission-composition details.
- [Named calls and tuples across the reference languages](named-arguments-reference-comparison.md): all twelve established references plus C#, distinguishing native argument labels, named product values, tuple labels, and compatibility.
- [Tuple spread and rest](tuple-spread-and-rest.md): fixed component/pattern spread, type construction with label overriding, homogeneous array-tail declarations, remainder preservation, and ownership boundaries.
- [Named array segments](tuple-array-segments.md): ...name: T; C exact extents, automatic packing, one stored position per segment, positional/labeled array access, preserved rest markers, and future middle-collector partition questions.
- [Array-segment and pattern-rest re-evaluation](tuple-segment-pattern-review.md): structural capture outcome, role-sensitive identity, evaluated alternatives, simple empty arrays, callable consistency, middle construction, and performance/ownership boundaries.
- [Gradual tuple-remainder reasoning](tuple-remainder-gradual-reasoning.md): one-property edits, preserved wrappers through zero-length segments, Unit only for no remainder, explicit semantic boundaries, and deferred empty-array element defaults.
- [Logical tuple unpacking](tuple-unpacking.md): copy versus reconstruction, preserved fixed labels, expanded tail elements, merging, static/runtime extents, and zero/singleton boundaries.
- [Tuple types, array tails, and fixed-size inference](tuple-array-shapes.md): selected type-spread overrides, tuple-valued variadic elements, runtime array tails in ordinary tuples/functions, readable rest access and explicit ownership/retention boundaries, fixed-array conversions, known-size literal inference, and unselected header candidates.
- [Pattern binding inference](pattern-binding-inference.md): partially annotated patterns, compatible input alternatives, shared and nested constructor/tuple alternative binding unions with Unit for absent names and no contribution from a leading or, narrowing stable related bindings from known alternatives, and preserved composite shapes.
- [Pattern contexts](pattern-contexts.md): cross-context audit of := source placement, == value tests, bindings, declarations, if/match, receivers, and recommended mismatch policies.
- [Pattern type review](pattern-type-review.md): comprehensive coverage review, confirmed rules, and the remaining record, sequence, set, range, and evaluation decisions.
- [Pattern examples](pattern-examples.md): simple and complex construction, destructuring, conditionals, enum/Result selection, guards, contextual record construction, and explicitly marked list/schema proposals.
- [Ordered sequence patterns](sequence-patterns.md): proposed exact list/array/slice lengths, pair/tuple relationships, and trailing rest capture.
- [Set patterns](set-patterns.md): equality versus membership versus unordered extraction, ambiguous assignments, and deferred syntax.
- [Pattern aliases](pattern-aliases.md): source-field naming versus destination bindings, reference-language renaming forms, and proposed as aliases.
- [Enums and variants](enums-and-variants.md): plain cases, explicit backing types and assigned values, associated payloads, contextual .case shorthand, selected tag-only patterns, and open representation/conversion contracts.
- [Type tests and narrowing](type-tests-and-narrowing.md): existing-name `if person: User` and concise negation, selected condition precedence, direct union targets, warnings for provably constant tests, explicit bindings, selected remaining types in later match arms, else/else-if chains, and later or operands, successful or joins, read types after direct assignment, stable existing-binding refinement after early exits, guard limits, stability, and open broader flow rules.
- [Never and unreachable flow](never-and-unreachable-flow.md): warnings and internal Never reads for exhausted conditional branches, preserved noncontributing/Unit distinctions, and future public Never, Never | T, and Never & T exploration.
- [Union type patterns](union-patterns.md): type-based narrowing of success and error alternatives, plain-union targets, branch-local bindings, and intact Result distinctions.
- [Unit](unit.md): one zero-component value/type spelled Unit or (), zero mapping and storage, preserved Unit-valued positions, fixed Unit arrays, and runtime counts owned by enclosing containers.
- [Option](option.md): explicit absence without universal nullability.
- [Result and errors](result-and-errors.md): declared typed failures, implicit success construction, safe stored-outcome widening across matching layers, postfix `!` propagation, optional-receiver `else` recovery with union results, and stored outcomes.
- [Throw as an error return](error-return-sugar.md): proposed throw error shorthand for return .err(error), declared error coverage, function/closure boundaries, and unchanged caller handling.
- [Propagation and call chaining](propagation-and-chaining.md): selected postfix `!`, per-step extraction, stored Results, and reference-language comparisons.
- [Recovery receivers and fallback types](recovery-and-fallbacks.md): optional error naming, lazy fallbacks, union results, narrowing, and reference-language comparisons.
- [Fallible types and error composition](fallible-types-and-error-composition.md): selected `T ! E` spelling and `T!` shorthand for `T ! Error`, plus proposed named compositions and aliases.
- [Recovery boundaries](recovery-boundaries.md): mandatory handling of Result arguments, preferred local fallbacks, selected operation-specific and explicit whole-block scopes, current and historical evaluation traces, and implementation tradeoffs.
- [Recovery receiver types](recovery-receiver-types.md): typed filters, ordered Error/Panic/Failure collectors with [Error]/[Panic]/[Failure] bindings, one/many matches, once-per-clause execution, and remaining scalar-binding and handler-exit review.
- [Manual failures and inference](manual-failures-and-inference.md): custom Error/Panic capability, directed scalar/group raise with function defaults or explicit block targets, authenticateUser and handler-local raise examples, escaping-error inference, and contract checking; LP-0012/LP-0014.
- [Early returns from recovery](expression-recovery.md#early-function-returns-and-continuing-path-types): normal function return abandons unfinished captured recovery; residual types describe continuing paths, and handler return values belong to the function contract; LP-0015.

- [Failure-handling shortfalls](failure-handling-shortfalls.md): focused review queue for pending-remainder exits, group provenance/typing, untyped/aggregate access, category declarations, remaining expression/inference boundaries, and storage/transport.

- [Implicit panics without effect declarations](panics.md#no-checked-panic-effect-declarations): ordinary operators need no checked/transitive panic lists; captured panics remain typed data, and documentary known-fault annotations remain exploratory; LP-0018.
- [Recapture](failure-capture-and-unwrapping.md#recapture-is-allowed): legal repeated boundaries, union-based type stability, preserved occurrences, and suppressible proof-based warnings; LP-0016.
- [Result occurrence patterns](result-and-errors.md#failure-occurrence-patterns): .err(e) first occurrence, .err(...es) all occurrences, source-preserving inspection, and scalar subpatterns without hidden search; LP-0017.

- [Failure capture and unwrapping](failure-capture-and-unwrapping.md): postfix ? capture, flat T ! (E | Panic), ordered Error/Panic/Failure collectors, all x11–x26 types, ! forwarding, static exhaustion, manual raise/error inference, and the remaining caught-group forwarding draft; LP-0009/LP-0010/LP-0011/LP-0012.

- [Shared expression recovery](expression-recovery.md): catch-all and typed-filter else, written-order munching, whole-match consumption, ordered collectors, co-occurrence/tuple patterns, explicit block tags, operation/block recovery scope, stored captured failures, and static exhaustion.
- [Recovery block tags and temporary traces](expression-recovery.md#handler-block-tags-and-temporary-traces): explicit block scope, handler-local returns, and expression-layer reasoning; LP-0008.
- [Panics and failure channels](panics.md): typed panic propagation, the selected arithmetic channel and operation/block scopes, and open fault attribution, execution, `&` public value/inspection, and no-handler policies; cleanup-failure precedence and declaration-ordered member-wise handling are selected.
- [Future typed panics](typed-panics.md): requested structured fault categories for underlying null access, zero division, overflow, and related faults, with operation-specific versus explicit whole-block recovery selected; operation fault attribution, transfer, aggregate representation, duplicate-member behavior, and no-handler policy remain open.
- [Bounds and arithmetic policy](checked-fault-policy.md): historical comparison of fallible defaults and asserting operations; the selected direction is direct positional operations with typed faults, arithmetic typed panics, and explicit `else` recovery.
- [Safe callable input and result adaptation](callable-value-variance.md): direct safe ordinary value compatibility, wider implementation inputs/narrower results, basic var T invariance with unchanged argument-flow checks, unsafe reverse cases, compiler adaptation without a required manual wrapper, preserved implementation default promises through narrowed omission-capable views, widened fallible success/error contracts directly from the source, and remaining access/effect interactions.
- [Public omission contracts and implementation defaults](callable-default-contracts.md): public omission permission, implementation-owned expressions, required views, omission compatibility under replacement, the selected n?: Int / ?:Int public markers for fixed named/unnamed inputs, zero-callable omission with no default/body execution, and deferred internal omitted-input representation.
- [Parameter types inferred from defaults](parameter-default-inference.md): selected ordinary input inference from static default types, annotation/context constraints, fixed call contracts, reads of prepared earlier parameters, rejection of self/later dependencies, and remaining access/lexical-lookup/placement boundaries.
- [Default parameter inference across modern languages](default-parameter-inference-comparison.md): sourced V/Rust/Zig/Odin/Dart/TypeScript/Kotlin comparison supporting the selected fixed input inference from defaults, distinct from selected call-time evaluation.
- [Functions](functions.md): one callable model with typed input tuples, optional `fn` before parenthesized lambdas, contextual/annotated inputs, known-input result inference, intrinsic pack application, public omission contracts with implementation defaults, zero-callable omission without body/default execution, and sourced reference comparisons; complete grammar and representation remain open.
- [Callable input packs and lambda shorthand](callable-input-packs.md): implicit `arguments`, whole-pack/component bindings, unnamed function-type inputs, `.call` versus invocation sugar, singleton boundaries, inline callback probes, and unresolved ownership/capture/grammar contracts.
- [Closures](closures.md): function values and return boundaries, with capture/context proposals and reference comparisons retained as deferred review history.
- [Deferred context ideas](deferred-contexts.md): environment services such as allocators, explicit captures, caller-supplied versus private callable state, and lifetime alternatives pinned for later.
- [Composition and interfaces](composition-and-interfaces.md): records, explicit capabilities, and reuse.
- [Visibility](visibility.md): private defaults and explicitly expanded abilities.

## Control flow

- [Body-owned recovery](body-recovery.md): selected internal recovery placement; body-wide section examples and delimiter candidates are explicitly deferred.
- [Deferred cleanup and resources](deferred-cleanup-and-resources.md): future joint review of body-wide sections, defer, scoped resource management, cleanup ordering, and lifetimes.
- [Conditional recovery](conditional-recovery.md): historical external-handler proposal, superseded by body-owned recovery; ordinary branch selection and explicit Result handling remain.
- [Conditionals](conditionals.md): one conditional form; a no-`else` conditional is partial and noncontributing, with declaration defaults, assignment no-write, loop no-contribution, and explicit `?` reservation; `then` requires a final `else`; read-only `@tag.value` only in `then`; optional leading and/or; and irrefutable matching conditions allowed with a warning for proven complete-condition success.
- [Conditional pattern chains](condition-chains.md): and chains, optional leading and/or without extra operands, binding-producing or alternatives with Unit for absent names, normalized union binding types, ordered shadowing, source-before-binding scope, short-circuiting, failure-path narrowing of stable existing bindings into later or operands and their successful-path joins, concise Boolean/type-test negation under not/and/or precedence, and grouped source-pattern negation with no exported bindings.
- [Pattern syntax comparison](pattern-syntax-comparison.md): conditional bindings, narrowing, arm delimiters, and scope across reference languages.
- [Match arm guards](match-guards.md): selected pattern-if separator, optional leading or on initial patterns and and/or on guards, and chains and payload-or-Unit or alternatives, additional pattern matches, nested extraction, scope, and rejection of an arm.
- [Match](match.md): subject-based arms, optional leading or on initial/nested pattern lists sharing one body/guard, nested constructor/tuple choices with local first-success, and selected subjectless Boolean selection with optional leading and/or and an underscore fallback; exhaustive action/value selection, with the coverage algorithm and ownership details still open.
- [Match coverage](match-coverage.md): all matches are exhaustive; `_ {}` handles remaining cases with an empty Unit body, and `_` binds the subject as an ordinary readable name.
- [Match keyword placement](match-keyword-placement.md): prefix versus subject-first selection, reference precedents, and expression/block-boundary tradeoffs.
- [Match pattern capabilities](match-patterns.md): selected equality, plain/payload enum, destructuring, and type patterns; the selected recursive grammar is outlined, with constructor schemas and coverage still open.
- [Loops](loops.md): Boolean, iterable, and unconditional sources, with optional leading and/or on unparenthesized Boolean sources. `as` is selected for one optional item name; the earlier colon separator, receiver lists, and header destructuring are retired.
- [Loop examples](loop-examples.md): worked loops with one optional item name, metadata state, nested exits, adapters, and operation-local error handling, with provisional contracts marked.
- [Unified loop completion](unified-loop-completion.md): selected receiverless then with .count/.value on tagged or untagged loops, final-expression results, and completion distinguished from deferred cleanup.
- [Collections and iterators](collections-and-iterators.md): source adapters and capability requirements.
- [Optional loop item name](loop-receivers.md): one item identifier, body-local destructuring, and metadata instead of receiver lists.
- [Loop pattern alternatives](loop-pattern-alternatives.md): selected body-based selection and historical receiver-pattern/filtering alternatives, with adapter, termination, branch, and failure questions deferred.
- [Loop value](loop-value.md): typed zero-initialized .value, internal commits, skipped iterations, and result inference.
- [Loop type inference](loop-type-inference.md): body and destination constraints, value-only bodies, separate completion results, and numeric compatibility boundaries.
- [Last item during completion](loop-last-item.md): .item and positional .index reporting, zero/empty behavior, and use-based retention that keeps no unused item state for completion.
- [Historical accumulator](loop-accumulator.md): retired Option/previous-value receiver model.
- [Finally](finally.md): selected cleanup-only behavior, `then` before cleanup on loop/conditional completion, inner-to-outer cleanup before an outer matching handler, primary/secondary cleanup-failure precedence, declaration-ordered member-wise handling, order-insensitive `&` co-occurrence patterns, and ordered failure tuples; the `&` form's public value, attachment scope, no-handler policy, and hard-abort behavior remain open.
- [Loop recovery](loop-recovery.md): historical grouped-loop recovery example; external handler placement is superseded, with completion and cleanup questions retained.
- [Loop completion](loop-completion.md): receiverless `then`, tagged returns, explicit targeted break/continue, result/metadata behavior, and its distinction from deferred cleanup.
- [Receiver clauses](receiver-clauses.md): historical hook-receiver exploration; Result recovery receivers and typed `else` filters are selected, while hook receivers are retired.
- [Tags and contexts](tags-and-contexts.md): prefix tags, typed metadata, shadowing, and leading-dot access.
- [Control-flow exits](control-flow.md): plain/targeted `return`, `break`, and `continue`, the sparse target matrix, payloadless named-break value preservation, and explicit exit target/payload boundaries.

## Project and implementation direction

- [Naming and versioning](versioning-and-naming.md): canonical `lite` project, LiteLang language, LiteScript programs, `litec` compiler, `literun` runtime, `lite` CLI, independent version streams, `LP-NNNN` proposals, component tags, and compatibility rules.
- [Lite Proposal register](proposals/README.md): accepted and unreleased LP-0001–LP-0004 and LP-0006–LP-0010 plus LP-0012–LP-0018, draft LP-0005 r7 for untyped binding and pending exits, draft LP-0011 r4 for unmatched-remainder/provenance transport, revision/status records, and unassigned release targets.
- [Modules and packages](modules-and-packages.md): private defaults and intended packaging experience.
- [Memory and performance](memory-and-performance.md): selected singleton/fixed-array layouts, zero-sized element cardinality, representation boundaries, performance goals, and open memory semantics; the supporting [runtime-cost review](memory-and-performance.md#runtime-cost-review) separates compile-time proofs from generated work and unresolved support machinery.
- [Tooling and learning](tooling-and-learning.md): official formatter, read-only lite fmt --check for CI using normal formatting/verification rules, compact/multiline and opaque-comment policies, idempotence, verified output before writing, unchanged malformed/unverified files with diagnostics and overall failure status, format-on-save preservation, and gradual teaching.
- [Comments in modern formatters](comment-formatting-research.md): 2026-10-25 investigation of Deno, Bun, Rustfmt, Dart/Flutter, and Prettier; eight versioned local Deno/Rustfmt probes, primary sources, execution limits, the subsequent selected LiteLang formatter contract, and remaining open implementation details.
- [Language design review handoff](language-design-review-handoff.md): historical review log and completed plan; current rules are in the ledger and concept pages.
- [Documentation review backlog](../TASKS.md): historical 2026-10-23 snapshot of documentation defects; current rules are in the ledger.
- [Backlog by topic](../ISSUES-BY-TOPIC.md): topic-grouped view of the same historical snapshot.
- [References](references.md): primary language documentation and relevant research.

## Suggested reading order

Read the principles, lexical rules, blocks, declarations, and functions first. Then read conditionals and the loop documents together. Loop result inference and completion hooks must be evaluated as one contract, rather than implemented independently from isolated examples.
