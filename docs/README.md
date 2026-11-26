# Language documentation

Start with the first program or use this index to find language design rules.

## Start here

- [Run your first program](lite://doc/start-here) in the browser or on your machine.
- [Take the syntax tour](lite://doc/tour) to see bindings, functions, loops, and data types in short programs.
- [Read the Handbook](lite://handbook/overview-and-setup) or [follow interactive lessons](lite://learn) to learn supported Lite.
- [Search the module reference](lite://module) for library operations and the [CLI reference](lite://tool) for commands.
- [Check implementation status](lite://doc/implementation-status) or [set up for contributing](lite://doc/contributing).

## Language design and compiler

Use the [development workflow](lite://doc/development-workflow),
[documentation maintenance guide](lite://doc/documentation), and
[self-hosting development guide](lite://doc/evolving-language) to work on Lite.
The [compiler guide](lite://doc/compiler/overview) and
[verification cases](lite://repo/language/verifications/README.md) describe
the implementation and its tests.

1. [LiteLang white paper](lite://doc/white-paper): the LiteLang philosophy, intended audience, and criteria for every design decision.
2. [Principles and goals](lite://doc/principles): a concise overview of established goals and defaults.
3. [Current decisions and open questions](lite://doc/decisions-and-open-questions): dated design history and open questions.
4. [Provisional grammar sketch](lite://doc/grammar-sketch): the current syntax outline and its remaining boundaries.
5. [LiteLang current design specification](lite://spec): stable IDs and links to the current rule owners.
6. [Normative page map](lite://doc/normative-pages): which page owns each current rule and which pages are historical.

The detailed reference below develops these foundations one concept at a time.

## Reading paths

- **Types and patterns.** Start with [type categories](lite://doc/type-categories),
  then see [unions](lite://doc/union-normalization), [pattern examples](lite://doc/pattern-examples),
  and [Result and errors](lite://doc/result-and-errors).
- **Collections.** Compare [sequence types](lite://doc/sequence-types), then see
  how [arrays](lite://doc/arrays), [lists](lite://doc/lists), and [slices](lite://doc/slices)
  relate to [iterators](lite://doc/collections-and-iterators).
- **Control flow.** Read [blocks and results](lite://doc/blocks-and-results),
  [conditionals](lite://doc/conditionals), and [loops](lite://doc/loops), then follow
  [exits](lite://doc/control-flow), [recovery](lite://doc/recovery-boundaries), and
  [cleanup](lite://doc/finally).
- **Modules and tooling.** Read [modules and packages](lite://doc/modules-and-packages)
  for imports and file kinds. See [memory and performance](lite://doc/memory-and-performance)
  for native execution, and the [CLI reference](lite://tool) for command usage.

## How to read this reference

[Source kinds](lite://doc/modules-and-packages#distinct-script-and-module-files)
govern the separate `.lts` script and `.lt` module forms. The
[preload design](lite://doc/packages-and-preload#package-preload) defines
package-local availability, and the
[compiler gap](lite://doc/modules-and-packages#implicit-core-preloading-gap)
describes current ambient loading.

- **Selected / established** records an explicit user choice or a rule retained by the subsequent discussion. Status lines use “selected” for a specific decision and “established” for the broader direction; both have the same normative weight.
- **Working proposal** is a concrete design suggestion that still needs confirmation or formalization. Status lines may say “proposal” or “proposed.”
- **Open** means examples cannot settle the contract without another decision.
- **Superseded / historical** identifies earlier suggestions that should not be implemented as the current design. “Historical” marks a retained record rather than live status.

These four categories are the intended filter; status lines may use the synonyms above.

Examples use `text` fences for portable rendering. The project has a
[VS Code highlighter](lite://repo/editors/vscode/README.md). Reference fragments illustrate
the stated design status; executable evidence comes from linked case manifests.
`[...]` in grammar templates denotes optional syntax unless stated otherwise.

Tuple type components use `name: Type`, a bare label with an inferred type, or `:Type` for an unnamed component. For example, `(l: Int, r: Int)`, `(l, r)`, and `(:Int, :Int)` have distinct named/unnamed roles in type context. Tuple value expressions and binding patterns retain their context-specific meanings; see the component grammar in the named-input routing entry.

See [generic notation](lite://doc/generic-notation) for current parameter forms and the pending inference rules.

## Foundations

- [Continuity and analogical coherence](lite://doc/continuity-and-analogy): design-method principle of local predictability, visible semantic boundaries, and transferable syntax patterns.
- [Immutability by default](lite://doc/immutability-by-default): selected language goal of fixed bindings and readable access first, with explicit, practical mutation capabilities.
- [Lexical structure](lite://doc/lexical-structure): whitespace, tokens, ordinary separators, optional leading chain separators, block boundaries, and the shared rule to omit unnecessary semicolons after complete block items at every nesting depth.
- [Optional leading separators](lite://doc/leading-separators): selected leading and/or on Boolean expressions/conditions, identity + on additive chains, or on initial/nested pattern alternatives, and | on nonempty unions; equivalent compact forms, unchanged effects/bindings, nonempty boundaries, selected earlier chain presentation, and conditional future leading-& support.
- [Comments](lite://doc/comments): nested comments, raw fences, parser-neutral trivia, Ali's commented-out condition, delimiter errors, and selected opaque-content/attachment-preserving formatting with surrounding layout changes.
- [Multilingual source and learning](lite://doc/multilingual-source-and-learning): proposed familiar-language source, diagnostics, lessons, simple-English reference bridge, semantic boundaries, and investigations; Salam is a project reference language.
- [Identifiers](lite://doc/identifiers): selected Unicode 16.0.0 strict UAX #31 profile (`XID_Start`/`XID_Continue`, no ZWNJ/ZWJ), ordinary underscore bindings, case sensitivity, NFC identifier identity, and distinct confusables with UTS #39 diagnostics (Phase 1 Unicode lexing & C11 mangling implemented; NFC and confusable lints planned).
- [Unused-name intent](lite://doc/unused-name-intent): readable _user/_left names that explicitly allow nonuse without unused-name warnings.
- [Blocks and results](lite://doc/blocks-and-results): final expressions, statement results, block boundaries, and grouped value continuation.
- [Declarations and assignment](lite://doc/declarations-and-assignment): `:=`, unparenthesized Boolean initializers with optional leading and/or, explicit types, independent `var`/`mut` capabilities, and declared replacement contracts versus flow-sensitive read types.
- [Mutability, access, and operations](lite://doc/mutability): the four declaration forms, held-data access, and operation receiver requirements.
- [Mut qualifier placement](lite://doc/mut-qualifier-placement): selected name: mut T for typed forms, retained inferred prefixes, and the completed canonical-example migration.
- [Local shadowing and copies](lite://doc/local-shadowing-and-copies): scope and value-copy rules.
- [Operators](lite://doc/operators): selected basic arithmetic precedence and binary left association, comparison/logical operations, optional leading logical separators and identity additive +, and selected power spelling with explicit unary-minus grouping.
- [Power and negation](lite://doc/power-and-negation): reject -base `**` exponent, require the negative-base or outer-negation group, and retain open power typing/association/domain contracts.
- [Arithmetic operators across languages](lite://doc/arithmetic-operators-comparison): Java, C, C++, C#, Python, and modern references; division/remainder/modulo, current / :/ % :% family with rem/mod meanings, power and unary signs, identity versus promotion/conversion, primary sources, and seven versioned local toolchain probes.
- [Signed division, remainder, and modulo table](lite://doc/signed-division-table): 56 operation rows across 18 languages, all four sign combinations, integer versus fractional division, named floor/Euclidean alternatives, and captured V playground results.
- [Negated comparison operators](lite://doc/negated-comparison-operators): selected ASCII positive/negative family at one comparison precedence; Boolean complements, adjacent-pair chains, propagation boundaries, type-suffix attachment, and historical alternatives. All ten also support nonbinding comparison-pattern prefixes; general logical patterns remain separate.
- [Comparison chains](lite://doc/comparison-chains): adjacent comparisons, single evaluation, short-circuiting, and grouping.
- [Evaluation order](lite://doc/evaluation-order): left-to-right operands and arguments, var input facts that must survive later arguments, assignment targets, and skipped expressions.
- [Numbers and ranges](lite://doc/numbers): inferred numeric values, identity leading + without conversion or implicit zero, range direction, and stride.
- [Division](lite://doc/division): contextual /, integer floor :/, remainder %, modulo :%, corresponding updates, signed results, and open numeric/lexical contracts.
- [Arithmetic methods and selected family](lite://doc/arithmetic-methods-and-division-revision): / :/ % :%, additional named methods, division calculation versus integer storage, retained compact/spaced requirement, and unambiguous colon-prefixed operator scanning.
- [Arithmetic fault boundaries](lite://doc/arithmetic-faults): typed panic channel for basic arithmetic, local typed-`else` recovery, and unresolved fault cases.
- [Strings](lite://doc/strings): multiline contents and adjacent literal concatenation.

## Types and values

- [Beginner collection syntax compared](lite://doc/collection-ergonomics-comparison): construction context, simple loops, closure inference, and generic function declarations across Rust, Zig, and V.
- [Collection syntax for beginners](lite://doc/collection-inference): contextual nested literals, selected local indexed-input inference direction and broader proposals, without mandatory protocol vocabulary in first lessons.
- [Collection consumer abstractions](lite://doc/collection-abstractions): selected direction of minimum behavioral inputs, interchangeable providers, unified element typing, and honest traversal semantics.
- [Collection capabilities](lite://doc/collection-capabilities): proposed traversal, size, repeatability, indexing, contiguity, membership, and output requirements; no universal container superclass.
- [Sequence end operations](lite://doc/sequence-end-operations): proposed push/pop names, aligned indexing/removal failure modes, structural capabilities, and List/deque costs.
- [Short indexed-sequence contract](lite://doc/indexed-sequence-contract): accepted [T] indexed/iterable direction, get_index/set_index/iterable hooks, mutable refinement, and unresolved extent/storage spellings.
- [Collection operation contracts](lite://doc/collection-operation-contracts): compiler resolution beneath loop/bracket sugar, missing support versus runtime failure, and inferred requirements without new beginner vocabulary.
- [Collection function signatures](lite://doc/collection-function-signatures): required inputs, guaranteed outputs, inferred versus complete contracts, generic relationships, static abstract returns, and explicit runtime representations.
- [Collection signature ergonomics](lite://doc/collection-signature-ergonomics): the risk of overconstrained library APIs, complete shorthand versus partial element annotations, and explicit stable contracts.
- [Collection and source contracts](lite://doc/collection-source-contracts): static/runtime/unknown size, hot/cold production, replay, stability, and future generator consumption.
- [Collection order and shared traversal](lite://doc/collection-order-and-traversal): positional/insertion/sorted/unspecified order, iterable sets, noniterable membership stores, and reference examples.
- [Checked collection operations](lite://doc/checked-collection-operations): policy comparison; selected direct positional operations with typed faults and attached `else` recovery; fallible-default indexing is historical.
- [Provider-neutral algorithms](lite://doc/collection-algorithms): proposed fast customization hooks, generic fallbacks, lazy results, caller-selected output providers, and open extension rules.
- [Generic collection performance](lite://doc/generic-collection-performance): unified scalar/record APIs, static specialization versus runtime erasure, element representation, and reference comparisons.

- [Generic notation](lite://doc/generic-notation): selected separate function type-parameter direction, temporary type-family notation, and open type-input and compile-time-value questions.
- [Compile-time evaluation](lite://doc/compile-time-evaluation): ordinary functions at compile time, known values, required inputs, explicit evaluation, and open execution and build contracts.
- [Type parameter reference comparison](lite://doc/type-parameters-reference-comparison): named generic parameters, compile-time type inputs, call-site inference, and open choices for Lite.

- [Sequence types compared](lite://doc/sequence-types-comparison): fixed arrays, growable lists, slices, and copy/storage tradeoffs across Odin, Rust, Zig, V, Go, Swift, Kotlin, and Dart.
- [Sequence storage families](lite://doc/sequence-types): fixed-array inference for fresh known-size literals, element-wise fixed-array value widening without added write permission, explicit growable Lists, proposed owners/views, and separate permissions and storage contracts.
- [Arrays](lite://doc/arrays): [T; N] fixed extents, header-free inline layout, zero-sized element counts, literal/spread construction, runtime arrays for variadic tails, and open ownership/runtime representation details.
- [Lists](lite://doc/lists): explicitly selected growable storage, length versus uninitialized capacity, explicit mutation, and open owner-copy semantics; no unconditional List literal default.
- [Typed maps](lite://doc/maps): generated-TS `Map<K, V>` key-value collections, scalar/enum keys, checked indexing, `core/map` intrinsics, insertion-order traversal, and independent value-copy snapshots.
- [Typed sets](lite://doc/sets): generated-TS `Set<T>` value sets, scalar/enum elements, `core/set` intrinsics, insertion-order traversal, and independent value-copy snapshots.
- [Slices](lite://doc/slices): proposed borrowed contiguous views, read-only defaults, mutable access, lifetime/invalidation, and initialized bounds.

- [Types and inference](lite://doc/types-and-inference): static contracts, general safe widening, component-wise tuple value widening, complete-contract proofs for generic widening, and the intended type-system scope.
- [Record literal boundaries](lite://doc/record-literal-boundaries): compatibility links and earlier anonymous record sketches.
- [Records](lite://doc/records): selected record declarations, contextual construction, and destination-first deconstruction; full inference and memory contracts remain open.
- [Record type identity](lite://doc/record-type-identity): selected distinct identity per declaration, including inline types; explicit reconstruction, shared type reuse, and reference comparisons.
- [Aliases and distinct type declarations](lite://doc/type-aliases) describes names for structural types and existing symbols, fresh type identity, and the compiler migration status.
- [Plain union normalization](lite://doc/union-normalization): selected order independence, flattening, duplicate removal, and unchanged identity with optional leading |, without collapsing nominal records, enum cases, Option, or Result.
- [Union membership](lite://doc/union-membership): selected automatic member admission, checked payload reads/ordinary arguments, proven member-payload writes versus whole-union replacement grants, unchanged declared replacements under narrowing, nominal identity, and remaining representation contracts.
- [Union widening](lite://doc/union-widening): selected automatic widening when every normalized source alternative is an exact destination member, with checked narrowing in the reverse direction.
- [Union field reads](lite://doc/union-field-reads): selected availability on every alternative, normalized union of field types, and rejection for missing or inaccessible fields.
- [Union field writes](lite://doc/union-field-writes): selected compatibility with every possible target field, preserving each parent's storage type and mutation permissions.
- [Union values and access contracts](lite://doc/union-values-and-access): a storage location containing a union versus a union of possible storage locations; historical access notation and proposed explicit read/write contracts.
- [Unambiguous meaning](lite://doc/unambiguous-meaning): reject unresolved distinct meanings with a diagnostic instead of silently choosing.
- [Union initialization policy](lite://doc/union-initialization-policy): bare typed declarations initialize all-zero storage; contextual zero is accepted when its possible meanings yield one distinct result. `= ?` requests uninitialized storage.
- [Union zero](lite://doc/union-zero): selected universal zero requirement; active-member priority and mappings for unions, enums, references, and resources remain open.
- [Empty union zero proposal](lite://doc/union-empty-zero-proposal): proposed empty state for unions; not selected; compared with Unit and member-priority alternatives.
- [Branch result inference](lite://doc/branch-result-inference): normalized union inference for conditional, match, and local-lambda completion; explicit contracts constrain it, and `then` requires a final `else`.
- [Union parameter defaults](lite://doc/union-parameter-defaults): argument omission is rejected without an applicable explicit default; call-time default ordering and the absence of an automatic zero fallback.
- [Qualified access summaries](lite://doc/access-union-qualifiers): historical exploration of `A | mut B | C`, common write capabilities, source-contract boundaries, and payload mutation versus replacement.
- [Call replacement flow](lite://doc/call-replacement-flow): current-read and declared-write compatibility at invocation, later-argument invalidation, single source write grants, nested forwarding and caller recovery, rejected cross-member calls, and deferred write-only access.
- [Var access qualifier](lite://doc/var-access-qualifier): var unifies local replacement permission and received caller-storage access; no local-only header modifier; slot is retired as a source keyword.
- [Replacement access summaries](lite://doc/slot-access-qualifier): canonical var marker, grouped distribution, and var-binding summaries; whole access-contract grammar remains open.
- [Caller-location parameters](lite://doc/slot-parameters): selected temporary caller-location access and explicit var grants; proposed two-direction compatibility, with Swift/Rust/Zig/V comparisons.
- [Access ergonomics](lite://doc/slot-ergonomics): infer derived mathematical summaries while keeping caller-visible replacement explicit in signatures and calls.
- [Parameter permissions](lite://doc/parameter-permissions): local var declarations, payload mut, and caller-storage var; fixed location associations and open combined-access syntax.
- [Caller mutation grants](lite://doc/caller-mutation-grants): explicit mut for caller-data updates and var for caller-location replacement; existing source authority is required.
- [Ordinary parameters and caller locations](lite://doc/parameter-values-and-slots): general copy semantics including returns, no implicit references, explicit var/mut grants, physical copy elimination, and deferred reference/safety contracts.
- [Caller-location keywords](lite://doc/caller-location-keywords): historical ref/mut/slot/mut ref comparison, superseded spelling recommendation, and preserved permission boundaries.
- [Union membership across references](lite://doc/union-membership-comparison): entry, narrowing, named cases, hierarchy requirements, default states, and representation across the reference languages.
- [Union storage and references](lite://doc/union-storage-reference-comparison): cross-language comparison of union storage, active-member representation, and reference behavior.
- [Record creation and initialization](lite://doc/record-initialization): omitted typed initializers and = 0 select zero; = {} uses declared defaults; nested construction, inline forms, and remaining eligibility/grammar questions.
- [Universal zero initialization](lite://doc/zero-initialization): valid all-zero values for every type, omitted/explicit zero versus declared defaults, and pending mappings for special types.
- [Reserved storage](lite://doc/reserved-storage): selected value: Type = ? marker; earlier generic reserve() and punctuation alternatives; open initialization-state, partial construction, and allocation/cleanup contracts.
- [First initialization](lite://doc/first-initialization): first whole-value = without var, once per execution path; complete branch coverage before use, later replacement permissions, and reference-language comparisons.
- [Type categories](lite://doc/type-categories): products, sums, raw codes, domain wrappers, generated operations, and value/reference semantics as separate decisions.
- [Type categories compared](lite://doc/type-categories-comparison): enum, struct, data/case class, value-wrapper, and sealed-family models across twelve reference languages.
- [Underscore bindings and skips](lite://doc/wildcards-and-skips): ordinary readable `_`, unused-name intent, and concise positional matching.
- [Pattern binding and shadowing](lite://doc/pattern-shadowing): repeated names within patterns and across successful chain/guard bindings, recursive binding order, source lookup, and visible binding types.
- [Pattern bindings and tests](lite://doc/pattern-bindings-and-tests): selected bind/type-match/value-match primitives, composition, explicit .None cases, and the reference comparison.
- [Comparison patterns](lite://doc/comparison-patterns): all ten nonbinding comparison prefixes, selected arithmetic/call/member and grouped RHS forms, required grouping for outer comparison/Boolean/conditional/block operands, runtime bounds evaluated once when reached, ordinary comparison/failure semantics, rejection of implicit-subject chains, and if guards for complex conditions.
- [Aggregate patterns](lite://doc/aggregate-patterns): selected inferred record patterns, destination-first field routing, equality and typed shorthand; positional schemas remain open.
- [Tuples and patterns](lite://doc/tuples-and-patterns): selected positional/named/mixed bindings, typed/inferred tuple annotations, nested variable-or-pattern collectors without double binding, and remaining recursive parsing/ownership contracts.
- [Tuple and callable labels under explicit destination types](lite://doc/tuple-label-conversions): strict ordinary label compatibility with explicit typed-declaration conversion, destination public call labels, unchanged implementation bindings/defaults, the distinction from value reordering or runtime label storage, and the requested future in-place memory-compatible cast discussion.
- [Named arguments and named tuples](lite://doc/named-arguments-and-tuples): selected interleaved call inputs, same-name shorthand, explicit tuple call spread, named replacement, and structural, label-sensitive stored tuples; explicit typed-declaration label conversion for tuples/callables with strict ordinary transfers, with other compatibility/conversion rules open; modern reference-language comparisons.
- [Tuple entries and access](lite://doc/tuple-entries-and-access): selected = identifier named shorthand, unnamed and mixed value entries, inferred mixed tuple types, fixed zero-based numeric access, singleton values, selected ()/Unit empty tuple identity, and a cross-context review of types, patterns, calls, lambdas, initialization, and spread.
- [Concrete named input routing](lite://doc/named-input-routing): selected argument mapping, invalid-input checks, named destructuring, tuple component forms, written evaluation order, fixed destination tuple routing with complete coverage and no implicit component defaults, and fresh-versus-stored tuple behavior; selected missing-default evaluation after supplied inputs in declared slot order; open callable, default-typing/scope, and permission-composition details.
- [Named calls and tuples across the reference languages](lite://doc/named-arguments-reference-comparison): the dated twelve-language review plus C#, distinguishing native argument labels, named product values, tuple labels, and compatibility.
- [Tuple spread and rest](lite://doc/tuple-spread-and-rest): fixed component/pattern spread, type construction with label overriding, homogeneous array-tail declarations, remainder preservation, and ownership boundaries.
- [Named array segments](lite://doc/tuple-array-segments): ...name: T; C exact extents, automatic packing, one stored position per segment, positional/labeled array access, preserved rest markers, and future middle-collector partition questions.
- [Array-segment and pattern-rest re-evaluation](lite://doc/tuple-segment-pattern-review): structural capture outcome, role-sensitive identity, evaluated alternatives, simple empty arrays, callable consistency, middle construction, and performance/ownership boundaries.
- [Gradual tuple-remainder reasoning](lite://doc/tuple-remainder-gradual-reasoning): one-property edits, preserved wrappers through zero-length segments, Unit only for no remainder, explicit semantic boundaries, and deferred empty-array element defaults.
- [Logical tuple unpacking](lite://doc/tuple-unpacking): copy versus reconstruction, preserved fixed labels, expanded tail elements, merging, static/runtime extents, and zero/singleton boundaries.
- [Tuple types, array tails, and fixed-size inference](lite://doc/tuple-array-shapes): selected type-spread overrides, tuple-valued variadic elements, runtime array tails in ordinary tuples/functions, readable rest access and explicit ownership/retention boundaries, fixed-array conversions, known-size literal inference, and unselected header candidates.
- [Pattern binding inference](lite://doc/pattern-binding-inference): partially annotated patterns, compatible input alternatives, shared and nested constructor/tuple alternative binding unions with Unit for absent names and no contribution from a leading or, narrowing stable related bindings from known alternatives, and preserved composite shapes.
- [Pattern contexts](lite://doc/pattern-contexts): cross-context audit of := source placement, == value tests, bindings, declarations, if/match, receivers, and recommended mismatch policies.
- [Pattern type review](lite://doc/pattern-type-review): comprehensive coverage review, confirmed rules, and the remaining record, sequence, set, range, and evaluation decisions.
- [Pattern examples](lite://doc/pattern-examples): simple and complex construction, destructuring, conditionals, enum/Result selection, guards, contextual record construction, and explicitly marked list/schema proposals.
- [Ordered sequence patterns](lite://doc/sequence-patterns): proposed exact list/array/slice lengths, pair/tuple relationships, and trailing rest capture.
- [Set patterns](lite://doc/set-patterns): equality versus membership versus unordered extraction, ambiguous assignments, and deferred syntax.
- [Pattern aliases](lite://doc/pattern-aliases): source-field naming versus destination bindings, reference-language renaming forms, and proposed as aliases.
- [Enums and variants](lite://doc/enums-and-variants): plain cases, explicit backing types and assigned values, associated payloads, contextual .case shorthand, selected tag-only patterns, and open representation/conversion contracts.
- [Type tests and narrowing](lite://doc/type-tests-and-narrowing): existing-name `if person: User` and concise negation, selected condition precedence, direct union targets, warnings for provably constant tests, explicit bindings, selected remaining types in later match arms, else/else-if chains, and later or operands, successful or joins, read types after direct assignment, stable existing-binding refinement after early exits, guard limits, stability, and open broader flow rules.
- [Never and unreachable flow](lite://doc/never-and-unreachable-flow): warnings and internal Never reads for exhausted conditional branches, preserved noncontributing/Unit distinctions, and future public Never, Never | T, and Never & T exploration.
- [Union type patterns](lite://doc/union-patterns): type-based narrowing of success and error alternatives, plain-union targets, branch-local bindings, and intact Result distinctions.
- [Unit](lite://doc/unit): one zero-component value/type spelled Unit or (), zero mapping and storage, preserved Unit-valued positions, fixed Unit arrays, and runtime counts owned by enclosing containers.
- [Option](lite://doc/option): explicit absence without universal nullability.
- [Result and errors](lite://doc/result-and-errors): declared typed failures, implicit success construction, safe stored-outcome widening across matching layers, postfix `!` propagation, optional-receiver `else` recovery with union results, and stored outcomes.
- [Throw as an error return](lite://doc/error-return-sugar): proposed throw error shorthand for return .err(error), declared error coverage, function/closure boundaries, and unchanged caller handling.
- [Propagation and call chaining](lite://doc/propagation-and-chaining): selected postfix `!`, per-step extraction, stored Results, and reference-language comparisons.
- [Recovery receivers and fallback types](lite://doc/recovery-and-fallbacks): optional error naming, lazy fallbacks, union results, narrowing, and reference-language comparisons.
- [Fallible types and error composition](lite://doc/fallible-types-and-error-composition): selected `T ! E` spelling and `T!` shorthand for `T ! Error`, plus proposed named compositions and aliases.
- [Recovery boundaries](lite://doc/recovery-boundaries): mandatory handling of Result arguments, preferred local fallbacks, selected operation-specific and explicit whole-block scopes, current and historical evaluation traces, and implementation tradeoffs.
- [Recovery receiver types](lite://doc/recovery-receiver-types): typed filters, ordered Error/Panic/Failure collectors with [Error]/[Panic]/[Failure] bindings, one/many matches, once-per-clause execution, and remaining scalar-binding and handler-exit review.
- [Manual failures and inference](lite://doc/manual-failures-and-inference): custom Error/Panic capability, directed scalar/group raise with function defaults or explicit block targets, authenticateUser and handler-local raise examples, escaping-error inference, and contract checking; LP-0012/LP-0014.
- [Early returns from recovery](lite://doc/expression-recovery#early-function-returns-and-continuing-path-types): normal function return abandons unfinished captured recovery; residual types describe continuing paths, and handler return values belong to the function contract; LP-0015.

- [Failure-handling shortfalls](lite://doc/failure-handling-shortfalls): focused review queue for pending-remainder exits, group provenance/typing, untyped/aggregate access, category declarations, remaining expression/inference boundaries, and storage/transport.

- [Implicit panics without effect declarations](lite://doc/panics#no-checked-panic-effect-declarations): ordinary operators need no checked/transitive panic lists; captured panics remain typed data, and documentary known-fault annotations remain exploratory; LP-0018.
- [Recapture](lite://doc/failure-capture-and-unwrapping#recapture-is-allowed): legal repeated boundaries, union-based type stability, preserved occurrences, and suppressible proof-based warnings; LP-0016.
- [Result occurrence patterns](lite://doc/result-and-errors#failure-occurrence-patterns): .err(e) first occurrence, .err(...es) all occurrences, source-preserving inspection, and scalar subpatterns without hidden search; LP-0017.

- [Failure capture and unwrapping](lite://doc/failure-capture-and-unwrapping): postfix ? capture, flat T ! (E | Panic), ordered Error/Panic/Failure collectors, all x11–x26 types, ! forwarding, static exhaustion, manual raise/error inference, and the remaining caught-group forwarding draft; LP-0009/LP-0010/LP-0011/LP-0012.

- [Shared expression recovery](lite://doc/expression-recovery): catch-all and typed-filter else, written-order munching, whole-match consumption, ordered collectors, co-occurrence/tuple patterns, explicit block tags, operation/block recovery scope, stored captured failures, and static exhaustion.
- [Recovery block tags and temporary traces](lite://doc/expression-recovery#handler-block-tags-and-temporary-traces): explicit block scope, handler-local returns, and expression-layer reasoning; LP-0008.
- [Panics and failure channels](lite://doc/panics): typed panic propagation, the selected arithmetic channel and operation/block scopes, and open fault attribution, execution, `&` public value/inspection, and no-handler policies; cleanup-failure precedence and declaration-ordered member-wise handling are selected.
- [Future typed panics](lite://doc/typed-panics): requested structured fault categories for underlying null access, zero division, overflow, and related faults, with operation-specific versus explicit whole-block recovery selected; operation fault attribution, transfer, aggregate representation, duplicate-member behavior, and no-handler policy remain open.
- [Bounds and arithmetic policy](lite://doc/checked-fault-policy): historical comparison of fallible defaults and asserting operations; the selected direction is direct positional operations with typed faults, arithmetic typed panics, and explicit `else` recovery.
- [Safe callable input and result adaptation](lite://doc/callable-value-variance): direct safe ordinary value compatibility, wider implementation inputs/narrower results, basic var T invariance with unchanged argument-flow checks, unsafe reverse cases, compiler adaptation without a required manual wrapper, preserved implementation default promises through narrowed omission-capable views, widened fallible success/error contracts directly from the source, and remaining access/effect interactions.
- [Public omission contracts and implementation defaults](lite://doc/callable-default-contracts): public omission permission, implementation-owned expressions, required views, omission compatibility under replacement, the selected n?: Int / ?:Int public markers for fixed named/unnamed inputs, zero-callable omission with no default/body execution, and deferred internal omitted-input representation.
- [Parameter types inferred from defaults](lite://doc/parameter-default-inference): selected ordinary input inference from static default types, annotation/context constraints, fixed call contracts, reads of prepared earlier parameters, rejection of self/later dependencies, and remaining access/lexical-lookup/placement boundaries.
- [Default parameter inference across modern languages](lite://doc/default-parameter-inference-comparison): sourced V/Rust/Zig/Odin/Dart/TypeScript/Kotlin comparison supporting the selected fixed input inference from defaults, distinct from selected call-time evaluation.
- [Functions](lite://doc/functions): one callable model with typed input tuples, optional `fn` before parenthesized lambdas, contextual/annotated inputs, known-input result inference, intrinsic pack application, public omission contracts with implementation defaults, zero-callable omission without body/default execution, and sourced reference comparisons; complete grammar and representation remain open.
- [Type-attached operations](lite://doc/type-operations): selected static `TypeName.op := fn[<...>](...)` dot-call model without classes, `self` (fn self-ref) versus `Self` (type self-ref), generic receiver support from the start, owned nominal types (`record`, `enum`, `distinct`), current disallowance of `alias`/foreign attachments, and the deferred explicit-imported-extension direction.
- [Callable input packs and lambda shorthand](lite://doc/callable-input-packs): implicit `arguments`, whole-pack/component bindings, unnamed function-type inputs, `.call` versus invocation sugar, singleton boundaries, inline callback probes, and unresolved ownership/capture/grammar contracts.
- [Closures](lite://doc/closures): function values and return boundaries, with capture/context proposals and reference comparisons retained as deferred review history.
- [Deferred context ideas](lite://doc/deferred-contexts): environment services such as allocators, explicit captures, caller-supplied versus private callable state, and lifetime alternatives pinned for later.
- [Composition and interfaces](lite://doc/composition-and-interfaces): records, explicit capabilities, and reuse.
- [Visibility](lite://doc/visibility): private defaults and explicitly expanded abilities.

## Control flow

- [Body-owned recovery](lite://doc/body-recovery): selected internal recovery placement; body-wide section examples and delimiter candidates are explicitly deferred.
- [Deferred cleanup and resources](lite://doc/deferred-cleanup-and-resources): future joint review of body-wide sections, defer, scoped resource management, cleanup ordering, and lifetimes.
- [Conditional recovery](lite://doc/conditional-recovery): historical external-handler proposal, superseded by body-owned recovery; ordinary branch selection and explicit Result handling remain.
- [Conditionals](lite://doc/conditionals): one conditional form; a no-`else` conditional is partial and noncontributing, with uninitialized declarations, assignment no-write, loop no-contribution, and explicit `?` reservation; `then` requires a final `else`; read-only `@tag.value` only in `then`; optional leading and/or; and irrefutable matching conditions allowed with a warning for proven complete-condition success.
- [Conditional pattern chains](lite://doc/condition-chains): and chains, optional leading and/or without extra operands, binding-producing or alternatives with Unit for absent names, normalized union binding types, ordered shadowing, source-before-binding scope, short-circuiting, failure-path narrowing of stable existing bindings into later or operands and their successful-path joins, concise Boolean/type-test negation under not/and/or precedence, and grouped source-pattern negation with no exported bindings.
- [Pattern syntax comparison](lite://doc/pattern-syntax-comparison): conditional bindings, narrowing, arm delimiters, and scope across reference languages.
- [Match arm guards](lite://doc/match-guards): selected pattern-if separator, optional leading or on initial patterns and and/or on guards, and chains and payload-or-Unit or alternatives, additional pattern matches, nested extraction, scope, and rejection of an arm.
- [Match](lite://doc/match): subject-based arms, optional leading or on initial/nested pattern lists sharing one body/guard, nested constructor/tuple choices with local first-success, and selected subjectless Boolean selection with optional leading and/or and an underscore fallback; exhaustive action/value selection, with the coverage algorithm and ownership details still open.
- [Match coverage](lite://doc/match-coverage): all matches are exhaustive; `_ {}` handles remaining cases with an empty Unit body, and `_` binds the subject as an ordinary readable name.
- [Match keyword placement](lite://doc/match-keyword-placement): prefix versus subject-first selection, reference precedents, and expression/block-boundary tradeoffs.
- [Match pattern capabilities](lite://doc/match-patterns): selected equality, plain/payload enum, destructuring, and type patterns; the selected recursive grammar is outlined, with constructor schemas and coverage still open.
- [Loops](lite://doc/loops): Boolean, iterable, and unconditional sources, with optional leading and/or on unparenthesized Boolean sources. `as` is selected for one optional item name; the earlier colon separator, receiver lists, and header destructuring are retired.
- [Loop examples](lite://doc/loop-examples): worked loops with one optional item name, metadata state, nested exits, adapters, and operation-local error handling, with provisional contracts marked.
- [Unified loop completion](lite://doc/unified-loop-completion): selected receiverless then with .count/.value on tagged or untagged loops, final-expression results, and completion distinguished from deferred cleanup.
- [Collections and iterators](lite://doc/collections-and-iterators): source adapters and capability requirements.
- [Optional loop item name](lite://doc/loop-receivers): one item identifier, body-local destructuring, and metadata instead of receiver lists.
- [Loop pattern alternatives](lite://doc/loop-pattern-alternatives): selected body-based selection and historical receiver-pattern/filtering alternatives, with adapter, termination, branch, and failure questions deferred.
- [Finally](lite://doc/finally): selected cleanup-only behavior, `then` before cleanup on loop/conditional completion, inner-to-outer cleanup before an outer matching handler, primary/secondary cleanup-failure precedence, declaration-ordered member-wise handling, order-insensitive `&` co-occurrence patterns, and ordered failure tuples; the `&` form's public value, attachment scope, no-handler policy, and hard-abort behavior remain open.
- [Loop recovery](lite://doc/loop-recovery): historical grouped-loop recovery example; external handler placement is superseded, with completion and cleanup questions retained.
- [Loop completion](lite://doc/loop-completion): receiverless `then`, tagged returns, explicit targeted break/continue, result/metadata behavior, and its distinction from deferred cleanup.
- [Receiver clauses](lite://doc/receiver-clauses): historical hook-receiver exploration; Result recovery receivers and typed `else` filters are selected, while hook receivers are retired.
- [Tags and contexts](lite://doc/tags-and-contexts): prefix tags, typed metadata, shadowing, and leading-dot access.
- [Control-flow exits](lite://doc/control-flow): plain/targeted `return`, `break`, and `continue`, the sparse target matrix, payloadless named-break value preservation, and explicit exit target/payload boundaries.

## Project and implementation direction

- [Compiler development guidelines](lite://repo/.agents/rules/compiler-development.md): develop language support in Lite, require multiple focused and combined-feature cases, investigate behind opt-in flags, and accept generated-igniter support before using new features in compiler source.
- [Release and tag history](lite://doc/releases): published igniter tags, current component versions, and test/verification counts.
- [Bootstrap and self-hosting plan](lite://doc/bootstrap-plan): staged compiler-bootstrap defaults, igniter tooling, shared library layers, gates, agent workflow, and the self-host definition of done; an implementation plan, not a language, module or std decision.
- [Serious usage, generics, and libraries roadmap](lite://doc/serious-usage-roadmap): owner-selected architecture for alias/distinct migration, uniform comptime generics (`T: Type`, `Type<Constraint>`, `Int`/`Bool`/`enum`/`String`), general-purpose `lib/` domains, portable `surface`/`canvas` layering, C11 memory hygiene, and multi-file `apps/`.
- [C11 memory, raw values, numeric ladder, and codegen architecture plan](lite://doc/c11-memory-and-codegen-plan): owner-confirmed plan for inline `[T; N]`, 16 B immutable SSO strings, exact scalar widths (`Int1..64`, `UInt1..64`, `Float8..64`), unique ownership + `Rc<T>`, Goose/Jai VM arenas, and C11 codegen optimizations.
- [Historical TS0/LT0 self-hosting strategy](lite://doc/self-hosting-kernel-strategy-2026-11-10): the minimal compiler-subset path, paired TS0/LT0 growth, and the LT1/LT2 fixed-point check as recorded on 2026-11-10.
- [Naming and versioning](lite://doc/versioning-and-naming): Lite project, LiteLang language, LiteScript programs, layered `lite-compile` commands, `literun` runtime, independent version streams, `LP-NNNN` proposals and component tags.
- [Lite Proposal register](lite://doc/proposals/README): accepted and unreleased LP-0001–LP-0004 and LP-0006–LP-0010 plus LP-0012–LP-0018, draft LP-0005 r7 for untyped binding and pending exits, draft LP-0011 r4 for unmatched-remainder/provenance transport, revision/status records, and unassigned release targets.
- [Modules and packages](lite://doc/modules-and-packages): private defaults and intended packaging experience.
- [Packages and preload](lite://doc/packages-and-preload): package-local preload selection and separate compilation.
- [Memory and performance](lite://doc/memory-and-performance): selected lightweight native execution priorities, small runtime/executable goals, measurement requirements, singleton/fixed-array layouts, zero-sized element cardinality, representation boundaries, and open memory semantics; the supporting [runtime-cost review](lite://doc/memory-and-performance#runtime-cost-review) separates compile-time proofs from generated work and unresolved support machinery.
- [Tooling and learning](lite://doc/tooling-and-learning): official formatter, read-only lite fmt --check for CI using normal formatting/verification rules, compact/multiline and opaque-comment policies, idempotence, verified output before writing, unchanged malformed/unverified files with diagnostics and overall failure status, format-on-save preservation, and gradual teaching.
- [Comments in modern formatters](lite://doc/comment-formatting-research): 2026-10-25 investigation of Deno, Bun, Rustfmt, Dart/Flutter, and Prettier; eight versioned local Deno/Rustfmt probes, primary sources, execution limits, the subsequent selected LiteLang formatter contract, and remaining open implementation details.
- [Language design review handoff](lite://doc/language-design-review-handoff): historical review log and completed plan; current rules are in the ledger and concept pages.
- [Documentation review backlog](lite://repo/TASKS.md): historical 2026-10-23 snapshot of documentation defects; current rules are in the ledger.
- [Backlog by topic](lite://repo/ISSUES-BY-TOPIC.md): topic-grouped view of the same historical snapshot.
- [References](lite://doc/references): primary language documentation and relevant research.

## Suggested reading order

Read the principles, lexical rules, blocks, declarations, and functions first. Then read conditionals and the loop documents together. Loop result inference and completion hooks must be evaluated as one contract, rather than implemented independently from isolated examples.

## Historical reading

- [Conditional union fallback](lite://doc/conditional-union-fallback): historical zero-default rule. Current partial initializers follow the conditional pages.
- [Historical accumulator](lite://doc/loop-accumulator): retired Option/previous-value receiver model.
- [Compiler transition checkpoints](lite://doc/compiler/transition-plan) record historical bootstrap status.
