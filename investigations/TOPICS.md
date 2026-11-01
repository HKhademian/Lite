# Investigation topic briefs

Status: **inventory only**, established 2026-10-27; lightweight execution and multilingual learning questions added 2026-10-28; module-effects and replaceable-library questions added 2026-10-30. Topic status is tracked on each Investigation line.
These briefs define questions, not answers, implementation tasks, or review
findings. Advanced possibilities listed in a scope remain possibilities.

Use the [contributor guide and index](README.md) to pick up a topic and the
[note template](NOTE-TEMPLATE.md) to record an investigation when requested.
Starting references may contain selected rules, proposals, or explicitly open
questions; check their status and current owning pages before relying on them.

<a id="inv-001"></a>

## INV-001 — Language goals and boundaries

**Scope:** Intended uses, constraints, and tradeoffs.

**Starter question:** Which everyday workloads and kinds of memory control should the language serve, and how should conflicting goals be judged?

**Start with:** [docs/white-paper.md](../docs/white-paper.md); [docs/principles.md](../docs/principles.md).

**Investigation:** recorded; contributor: redacted (agent-assisted); note: [INV-001 — language goals and boundaries](INV-001-language-goals-and-boundaries.md) — tiny demonstrator, practical-script milestone, ordinary/advanced memory-control usability boundary, and case-by-case goal-conflict review selected 2026-10-28; exact coverage, memory mechanisms, and evidence budgets remain open.

<a id="inv-002"></a>

## INV-002 — Exercise coverage

**Scope:** Capabilities needed across the exercise corpus.

**Starter question:** Which exercises expose missing language, library, host, or tooling contracts, and what would count as a solved exercise?

**Start with:** [samples/list.md](../samples/list.md); [samples/NOTES.md](../samples/NOTES.md); [challenges/README.md](../challenges/README.md).

**Investigation:** in progress; contributor: redacted (agent-assisted); note: [INV-002-01](INV-002-01-exercise-contracts-001-020.md) — contracts required by 001–020; initial incremental correctness batch selected 2026-10-28, with focused feature examples added as executable. [INV-002-02](INV-002-02-fvp-first-runnable-slice.md) — recorded, first runnable checkpoint selected (scalar values, bindings/replacement, basic arithmetic, temporary helper calls); control flow/functions/tuples follow incrementally. Numeric/text profile, remaining helper details, and later coverage remain open.

<a id="inv-003"></a>

## INV-003 — Scripting model

**Scope:** Single-file programs, top-level statements, and entry points.

**Starter question:** What does a script's implicit entry body mean, and how do executable statements relate to declarations and local helpers?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/blocks-and-results.md](../docs/blocks-and-results.md); [samples/README.md](../samples/README.md).

**Starter subtopics:** [5 bounded questions](SUBTOPICS.md#inv-003).

**Investigation:** in progress; contributor: redacted (agent-assisted); notes: [INV-003-01](INV-003-01-top-level-execution.md) — recorded, file-body and explicit-output decisions, observation APIs open; [INV-003-02](INV-003-02-declarations-and-lookup.md) — in progress, ordered blocks, lookup/live-read rules, static-first checks, direct recursion, and explicit self calls recorded; naming/nesting/access/inference details remain open; [INV-003-03](INV-003-03-script-environment.md) — in progress, .lts/.lt source kinds, no implicit imports in .lt, and replaceable standard-module goal selected; script convenience/disclosure proposal remains open. [INV-003-04](INV-003-04-script-to-module-boundary.md) — recorded, unresolved importability discussion deferred beyond the immediate FVP on 2026-10-30; recommendation unselected. Source-kind direction remains recorded in INV-003.03 but two modes/module architecture are not FVP gates; full module shape and migration remain open. INV-003.05 (possible restriction on module top-level effects and declaration initializers) inventoried for later; not started.

<a id="inv-004"></a>

## INV-004 — Execution modes

**Scope:** Running scripts, building executables, and interactive execution.

**Starter question:** What semantics should execution modes share, and what compilation, caching, or interactive behavior needs a separate contract?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/tooling-and-learning.md](../docs/tooling-and-learning.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-004).

**Focus:** [Lightweight native execution questions and evidence](lightweight-native-execution.md).

**Investigation:** in progress; contributor: redacted (agent-assisted); note: [INV-004 — minimal FVP execution path](INV-004-fvp-execution-path.md) — small interpreter selected for the FVP: read one file, parse/check the supported subset, and execute with temporary helpers; native compilation is a later goal. Temporary inputInt/inputFloat/inputLine/inputWord/report/reportError helper names selected for the FVP; invalid input/EOF input faults selected, with clear diagnostics/nonzero status when unhandled, no automatic retry/default, and intentionally empty inputLine allowed. The first executable feature checkpoint is selected under INV-002.02. The user-requested root ./lite run shebang launcher now forwards to the TypeScript/Node igniter; strict checking and 63 interpreter test groups pass. Complete numeric/text and I/O contracts, native deployment/backend, caching, full mode parity and restricted profiles remain open.

**Helper follow-up:** [INV-004 — optional input prompt and multiple report values](INV-004-fvp-prompt-and-report-values.md) — explicit user selections implemented: inputInt prompt on stdout without an added newline, report values space-separated with a final newline, ordinary multiple arguments only. Strict checking and 69 interpreter test groups pass.

**Follow-up:** [INV-004 — whole input with optional prompt](INV-004-fvp-whole-input.md) — explicitly approved inputAll(prompt?) implemented: zero/one String prompt uses inputInt stdout/no-newline convention; remaining stdin preserves lookahead/whitespace/line endings through EOF, empty on immediate EOF. Strict checking and 138 interpreter groups plus 9 editor groups pass; older EOF rules unchanged.

<a id="inv-005"></a>

## INV-005 — Program lifecycle

**Scope:** Startup, initialization, termination, and exit status.

**Starter question:** What executes before and after user code, in what order, and how do normal completion and failures reach the host?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/finally.md](../docs/finally.md); [docs/panics.md](../docs/panics.md).

**Investigation:** in progress; contributor: redacted (agent-assisted); note: [INV-005 — FVP completion and reporting](INV-005-fvp-completion-and-reporting.md) — reportError report-only, normal completion status 0 versus nonzero rejected/fatal failure, and explicit exit(errCode?) selected. Omitted-code default, code domain, exit cleanup/recovery behavior, exact I/O failures/codes, and full lifecycle remain open.

<a id="inv-006"></a>

## INV-006 — Source organization

**Scope:** Files, modules, namespaces, and visibility.

**Starter question:** What are the boundaries of a source unit and its names, and which declarations are visible across them?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/visibility.md](../docs/visibility.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-007"></a>

## INV-007 — Packages and dependencies

**Scope:** Manifests, resolution, versions, and reproducibility.

**Starter question:** How are packages identified and resolved, and what information makes dependency selection and builds reproducible?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/versioning-and-naming.md](../docs/versioning-and-naming.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-008"></a>

## INV-008 — Lexical structure

**Scope:** Tokens, identifiers, keywords, literals, and comments.

**Starter question:** Which token boundaries and character rules are defined, and where can scanning conflict with selected syntax?

**Start with:** [docs/lexical-structure.md](../docs/lexical-structure.md); [docs/identifiers.md](../docs/identifiers.md); [docs/comments.md](../docs/comments.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-008).

**Focus:** [Multilingual source and learning questions](multilingual-source-and-learning.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-009"></a>

## INV-009 — Syntax and parsing

**Scope:** Delimiters, separators, precedence, and ambiguity.

**Starter question:** Can supported constructs be parsed without layout-sensitive guesses, and which grammar boundaries remain unresolved?

**Start with:** [docs/grammar-sketch.md](../docs/grammar-sketch.md); [docs/lexical-structure.md](../docs/lexical-structure.md); [docs/callable-input-packs.md](../docs/callable-input-packs.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-010"></a>

## INV-010 — Declarations and bindings

**Scope:** Inference, annotations, assignment, and shadowing.

**Starter question:** What establishes a binding's type and permissions, and what can later assignments or shadowing change?

**Start with:** [docs/declarations-and-assignment.md](../docs/declarations-and-assignment.md); [docs/local-shadowing-and-copies.md](../docs/local-shadowing-and-copies.md); [docs/pattern-binding-inference.md](../docs/pattern-binding-inference.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-011"></a>

## INV-011 — Scopes and name resolution

**Scope:** Lexical lookup, forward references, and recursive definitions.

**Starter question:** When does a name become visible, how are collisions resolved, and which forward or recursive references are valid?

**Start with:** [docs/identifiers.md](../docs/identifiers.md); [docs/local-shadowing-and-copies.md](../docs/local-shadowing-and-copies.md); [docs/modules-and-packages.md](../docs/modules-and-packages.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-012"></a>

## INV-012 — Expressions and blocks

**Scope:** Values, statement positions, tails, and evaluation order.

**Starter question:** Which contexts require a value, and how do evaluation order, noncontributing paths, and early exits affect results?

**Start with:** [docs/blocks-and-results.md](../docs/blocks-and-results.md); [docs/evaluation-order.md](../docs/evaluation-order.md); [docs/branch-result-inference.md](../docs/branch-result-inference.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-013"></a>

## INV-013 — Operators

**Scope:** Arithmetic, comparison, Boolean operations, and compound assignment.

**Starter question:** How are operators grouped, resolved, and evaluated, including chained comparisons and read-modify-write forms?

**Start with:** [docs/operators.md](../docs/operators.md); [docs/comparison-chains.md](../docs/comparison-chains.md); [docs/negated-comparison-operators.md](../docs/negated-comparison-operators.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-014"></a>

## INV-014 — Numeric semantics

**Scope:** Widths, signedness, precision, overflow, division, and conversions.

**Starter question:** Which numeric representations and conversions are defined, and where do calculation, rounding, and storage boundaries apply?

**Start with:** [docs/numbers.md](../docs/numbers.md); [docs/division.md](../docs/division.md); [docs/arithmetic-faults.md](../docs/arithmetic-faults.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-014).

**Investigation:** in progress; contributor: redacted (agent-assisted); note: [INV-014-01 — temporary FVP numeric profile](INV-014-01-fvp-numeric-profile.md) — temporary signed 64-bit integers, one finite 64-bit floating family, checked overflow, zero-divisor faults, and rejection/faulting of non-finite values selected. Covers INV-014.01 and part of INV-014.03; precise rounding, promotions, literal/input rules, permanent widths, and ABI remain open.

<a id="inv-015"></a>

## INV-015 — Boolean values and conditions

**Scope:** Truth tests, short-circuiting, and condition chains.

**Starter question:** Which values are valid conditions, what is skipped, and which bindings or refinements survive a condition chain?

**Start with:** [docs/condition-chains.md](../docs/condition-chains.md); [docs/conditionals.md](../docs/conditionals.md); [docs/leading-separators.md](../docs/leading-separators.md).

**Investigation:** recorded; contributor: redacted (agent-assisted); note: [INV-015 — Boolean/conditional igniter increment](INV-015-igniter-boolean-conditionals.md) — Bool-only logic, scalar comparison chains, scopes, and basic branches implemented with 22 passing test groups. Result unions, partial value/guarded updates, patterns, and then/finally remain unsupported; this is bounded implementation evidence, not completion of the full topic.

<a id="inv-016"></a>

## INV-016 — Text and characters

**Scope:** Encoding, Unicode, indexing, slicing, and formatting.

**Starter question:** What is a character or text position, and how do encoding, ownership, slicing, and formatting affect safety and cost?

**Start with:** [docs/strings.md](../docs/strings.md); [docs/slices.md](../docs/slices.md); [samples/list.md](../samples/list.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-016).

**Investigation:** recorded (temporary helpers explicitly approved); contributor: redacted (agent-assisted); notes: [INV-016-01 — temporary FVP text profile](INV-016-01-fvp-text-profile.md) — detailed proposal remains deferred; [INV-016 — text-scanning increment](INV-016-igniter-text-operations.md) — the user explicitly approves the existing positional textLength/textAt/textSlice code-point helpers and terminal bounds policy after the [focused review](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31). A retained named-token list scanner is verified through the launcher. Strict checking and 122 interpreter groups pass; 9 editor groups pass. General String indexing, grapheme/normalization policy, native text layout and performance remain open.

<a id="inv-017"></a>

## INV-017 — Binary data

**Scope:** Bytes, bit operations, byte order, and binary formats.

**Starter question:** How are raw bytes represented and processed without conflating text, numeric values, and host memory layout?

**Start with:** [docs/numbers.md](../docs/numbers.md); [docs/arrays.md](../docs/arrays.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-018"></a>

## INV-018 — Type-system foundations

**Scope:** Type identity, compatibility, inference, and checking.

**Starter question:** Which facts establish identity or compatibility, and how are inferred and explicitly constrained types reconciled?

**Start with:** [docs/types-and-inference.md](../docs/types-and-inference.md); [docs/type-categories.md](../docs/type-categories.md); [docs/record-type-identity.md](../docs/record-type-identity.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-018).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-019"></a>

## INV-019 — Conversions and coercions

**Scope:** Explicit conversion, implicit adaptation, widening, and narrowing.

**Starter question:** Which conversions are admitted, which require proof or checked selection, and how are values and permissions preserved?

**Start with:** [docs/types-and-inference.md](../docs/types-and-inference.md); [docs/tuple-label-conversions.md](../docs/tuple-label-conversions.md); [docs/union-widening.md](../docs/union-widening.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-020"></a>

## INV-020 — Unit, empty, and never types

**Scope:** Absence of payload, impossible values, and unreachable flow.

**Starter question:** How do zero-storage values, empty shapes, and nonreturning expressions differ in typing, execution, and layout?

**Start with:** [docs/unit.md](../docs/unit.md); [docs/never-and-unreachable-flow.md](../docs/never-and-unreachable-flow.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-021"></a>

## INV-021 — Optional values

**Scope:** Presence, absence, construction, and extraction.

**Starter question:** How are optional values created, inspected, and extracted, and how do they interact with zero values and nested alternatives?

**Start with:** [docs/option.md](../docs/option.md); [docs/zero-initialization.md](../docs/zero-initialization.md); [docs/enums-and-variants.md](../docs/enums-and-variants.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-022"></a>

## INV-022 — Tuples

**Scope:** Positions, labels, composition, spreading, and remainders.

**Starter question:** How do tuple shape, labels, segments, and extent survive construction, access, composition, and unpacking?

**Start with:** [docs/tuples-and-patterns.md](../docs/tuples-and-patterns.md); [docs/tuple-spread-and-rest.md](../docs/tuple-spread-and-rest.md); [docs/tuple-array-segments.md](../docs/tuple-array-segments.md).

**Investigation:** recorded (user-approved bounded implementation); contributor: redacted (agent-assisted); note: [INV-022 — fixed-tuple FVP increment](INV-022-fvp-fixed-tuples.md) — flat unnamed scalar tuples, construction/access, positional binding, explicit function inputs/results and value copies implemented using existing selected syntax. Strict checking and 62 test groups pass. Wider tuple topics remain open or unimplemented; text-helper consent is unchanged.

**Follow-up:** [INV-022 — named fields for fixed tuples](INV-022-fvp-named-tuples.md) — resumed after the intervening I/O work; bounded implementation of existing named entry/shorthand/member forms, named function tuple annotations and label-sensitive stored transfers. Strict checking and 79 interpreter groups pass. Broader routing/conversion, mixed/nested tuples and named patterns remain unimplemented.

**Follow-up:** [INV-022 — mixed fixed tuples](INV-022-fvp-mixed-tuples.md) — interleaved named/unnamed scalar fields and annotations implemented under existing selected rules; strict checking and 97 interpreter groups pass. No new syntax or APIs.

**Follow-up:** [INV-022 — explicit tuple label conversion](INV-022-fvp-label-conversion.md) — stored flat scalar tuples can acquire destination labels at a fully initialized typed declaration; strict checking and 102 interpreter groups pass. Shape/types and ordinary label-sensitive transfers are preserved.

<a id="inv-023"></a>

## INV-023 — Records

**Scope:** Identity, fields, construction, defaults, and updates.

**Starter question:** What constitutes a record contract, and how do initialization, field access, copies, and updates preserve it?

**Start with:** [docs/records.md](../docs/records.md); [docs/record-type-identity.md](../docs/record-type-identity.md); [docs/record-initialization.md](../docs/record-initialization.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-024"></a>

## INV-024 — Enums and unions

**Scope:** Alternatives, payloads, discriminators, and normalization.

**Starter question:** How are alternatives identified and normalized, and how do construction, storage, and replacement preserve the active member?

**Start with:** [docs/enums-and-variants.md](../docs/enums-and-variants.md); [docs/union-normalization.md](../docs/union-normalization.md); [docs/union-values-and-access.md](../docs/union-values-and-access.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-024).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-025"></a>

## INV-025 — Type refinement

**Scope:** Tests, narrowing, invalidation, and flow-sensitive facts.

**Starter question:** What proves a narrower read, where is that fact valid, and which writes, calls, or aliases invalidate it?

**Start with:** [docs/type-tests-and-narrowing.md](../docs/type-tests-and-narrowing.md); [docs/union-membership.md](../docs/union-membership.md); [docs/call-replacement-flow.md](../docs/call-replacement-flow.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-026"></a>

## INV-026 — Patterns and destructuring

**Scope:** Binding, matching, guards, coverage, and exhaustiveness.

**Starter question:** Which patterns bind or test, what must alternatives agree on, and how is complete coverage established?

**Start with:** [docs/match-patterns.md](../docs/match-patterns.md); [docs/pattern-bindings-and-tests.md](../docs/pattern-bindings-and-tests.md); [docs/match-coverage.md](../docs/match-coverage.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-027"></a>

## INV-027 — Generics

**Scope:** Parameters, constraints, inference, specialization, and code sharing.

**Starter question:** How are generic contracts expressed and checked, and which representation and compilation choices remain possible?

**Start with:** [docs/generic-notation.md](../docs/generic-notation.md); [docs/types-and-inference.md](../docs/types-and-inference.md); [docs/generic-collection-performance.md](../docs/generic-collection-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-027).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-028"></a>

## INV-028 — Interfaces and capabilities

**Scope:** Conformance, composition, dispatch, and type erasure.

**Starter question:** How does a consumer state minimum requirements, and what distinguishes statically resolved providers from runtime-erased values?

**Start with:** [docs/composition-and-interfaces.md](../docs/composition-and-interfaces.md); [docs/collection-abstractions.md](../docs/collection-abstractions.md); [docs/collection-capabilities.md](../docs/collection-capabilities.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-028).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-029"></a>

## INV-029 — Type aliases and distinct types

**Scope:** Naming, domain boundaries, and representation reuse.

**Starter question:** When does a name preserve an existing type, and when should a domain boundary create a distinct contract despite equal layout?

**Start with:** [docs/type-aliases.md](../docs/type-aliases.md); [docs/record-type-identity.md](../docs/record-type-identity.md); [docs/type-categories.md](../docs/type-categories.md).

**Investigation:** approved (one ordinary namespace selected); contributor: redacted (agent-assisted); note: [INV-029 — alias names versus ordinary shadowing](INV-029-fvp-alias-name-resolution.md) — selected alias syntax/transparent meaning stays intact; user selects one ordinary lexical binding namespace ("easier to reason; a value identifier could contain a value and has a type, but a type could not have any mem address") and rejects dual namespaces. Later same-name value shadows alias; subsequent type lookup fails with static TypeError.

<a id="inv-030"></a>

## INV-030 — Functions and calls

**Scope:** Signatures, inputs, results, recursion, and call evaluation.

**Starter question:** What belongs to a callable's public contract, and how are arguments, recursion, and result inference checked?

**Start with:** [docs/functions.md](../docs/functions.md); [docs/evaluation-order.md](../docs/evaluation-order.md); [docs/parameter-default-inference.md](../docs/parameter-default-inference.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-030).

**Investigation:** recorded (bounded implementation); contributor: redacted (agent-assisted); note: [INV-030 — typed-function igniter increment](INV-030-igniter-functions.md) — explicit scalar functions, positional calls, tail/explicit returns and own-name/self recursion implemented; strict checking and 43 test groups pass. General capture policy, later helper lookup, inference, full argument routing and callable inputs/results remain open or unsupported. **Follow-up:** [INV-030 — method and extension-operation declaration syntax](INV-030-method-declaration-syntax.md) — inventoried only; Kotlin's `fun T.method()` is a reference, and the user's `List.push_front := fn(self, ...)` candidate with `self` as a special receiver is recorded but not selected. Dot-call scope, receiver binding, `self` versus self-recursion, mutation grants, overloads, generics, and implementation remain open.

<a id="inv-031"></a>

## INV-031 — Argument routing

**Scope:** Labels, defaults, omission, packs, and variadic inputs.

**Starter question:** How are supplied inputs routed, which omissions are permitted, and when are defaults and extra inputs evaluated?

**Start with:** [docs/named-input-routing.md](../docs/named-input-routing.md); [docs/callable-default-contracts.md](../docs/callable-default-contracts.md); [docs/callable-input-packs.md](../docs/callable-input-packs.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-031).

**Investigation:** recorded (bounded implementation of selected rules); contributor: redacted (agent-assisted); note: [INV-031 — named fixed-slot calls](INV-031-fvp-named-calls.md) — interleaved named/positional arguments, shorthand and named replacement preserve evaluation order and final slot typing. Strict checking and 108 interpreter groups pass. Defaults, spread, access grants and builtin public labels remain outside this delivery.

<a id="inv-032"></a>

## INV-032 — Callable values

**Scope:** Storage, compatibility, invocation, and zero initialization.

**Starter question:** How do stored callables preserve access and outcome contracts, including invocation of a zero-initialized callable?

**Start with:** [docs/callable-value-variance.md](../docs/callable-value-variance.md); [docs/zero-initialization.md](../docs/zero-initialization.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-032).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-033"></a>

## INV-033 — Closures and captures

**Scope:** Environments, capture permissions, escape, and lifetime.

**Starter question:** What is captured, which accesses remain permitted, and how is an environment kept valid when a closure escapes?

**Start with:** [docs/closures.md](../docs/closures.md); [docs/deferred-contexts.md](../docs/deferred-contexts.md); [docs/parameter-permissions.md](../docs/parameter-permissions.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-033).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-034"></a>

## INV-034 — Conditionals

**Scope:** Branch selection, values, partial paths, and completion.

**Starter question:** How do total and partial conditionals behave in declarations, assignments, loops, and value-required contexts?

**Start with:** [docs/conditionals.md](../docs/conditionals.md); [docs/branch-result-inference.md](../docs/branch-result-inference.md); [docs/conditional-union-fallback.md](../docs/conditional-union-fallback.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-035"></a>

## INV-035 — Loops and iteration

**Scope:** Sources, traversal, metadata, accumulators, and completion.

**Starter question:** How do loop modes establish items and metadata, accumulate results, and complete after zero or multiple iterations?

**Start with:** [docs/loops.md](../docs/loops.md); [docs/loop-value.md](../docs/loop-value.md); [docs/loop-completion.md](../docs/loop-completion.md).

**Investigation:** recorded; contributor: redacted (agent-assisted); note: [INV-035 — action-loop igniter increment](INV-035-igniter-action-loops.md) — Boolean/unconditional action loops, scoped bodies, bare nearest-loop break/continue implemented; strict checking and 30 test groups pass. Values/metadata, iterables, header/tagged/payload transfers, and completion/cleanup remain unsupported.

<a id="inv-036"></a>

## INV-036 — Control transfer

**Scope:** Return, break, continue, tags, and nonlocal exits.

**Starter question:** Which target receives an exit, which payload is supplied, and what completion and cleanup execute along the way?

**Start with:** [docs/control-flow.md](../docs/control-flow.md); [docs/tags-and-contexts.md](../docs/tags-and-contexts.md); [docs/never-and-unreachable-flow.md](../docs/never-and-unreachable-flow.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-037"></a>

## INV-037 — Returned errors

**Scope:** Error types, propagation, recovery, and inference.

**Starter question:** Which errors belong to a result contract, and how do storage, forwarding, recovery, and inference affect that contract?

**Start with:** [docs/result-and-errors.md](../docs/result-and-errors.md); [docs/manual-failures-and-inference.md](../docs/manual-failures-and-inference.md); [docs/propagation-and-chaining.md](../docs/propagation-and-chaining.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-038"></a>

## INV-038 — Panics and checked faults

**Scope:** Fault attribution, recovery boundaries, and unwinding.

**Starter question:** Which operation owns a fault, which boundary can recover it, and how does propagation preserve required cleanup?

**Start with:** [docs/panics.md](../docs/panics.md); [docs/typed-panics.md](../docs/typed-panics.md); [docs/checked-fault-policy.md](../docs/checked-fault-policy.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-039"></a>

## INV-039 — Failure aggregation

**Scope:** Multiple failures, ordering, provenance, and inspection.

**Starter question:** How are multiple occurrences retained, selected, consumed, and inspected, and what storage obligations follow?

**Start with:** [docs/failure-capture-and-unwrapping.md](../docs/failure-capture-and-unwrapping.md); [docs/finally.md](../docs/finally.md); [docs/recovery-receiver-types.md](../docs/recovery-receiver-types.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-040"></a>

## INV-040 — Cleanup and resources

**Scope:** Finalization, deferred actions, disposal, and partial construction.

**Starter question:** Which lifecycle rules apply to acquisition and disposal, including early exits, incomplete construction, and cleanup failures?

**Start with:** [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md); [docs/finally.md](../docs/finally.md); [docs/first-initialization.md](../docs/first-initialization.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-040).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-041"></a>

## INV-041 — Value semantics

**Scope:** Reads, transfers, copies, moves, and observable effects.

**Starter question:** What does an ordinary transfer preserve, which types support copying, and what would an explicit alternative mean?

**Start with:** [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md); [docs/local-shadowing-and-copies.md](../docs/local-shadowing-and-copies.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-041).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-042"></a>

## INV-042 — Mutability and access permissions

**Scope:** Binding replacement, payload mutation, and read-only access.

**Starter question:** What authority do var and mut grant, and how is that authority bounded through calls, fields, and returned values?

**Start with:** [docs/mutability.md](../docs/mutability.md); [docs/parameter-permissions.md](../docs/parameter-permissions.md); [docs/access-union-qualifiers.md](../docs/access-union-qualifiers.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-042).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-043"></a>

## INV-043 — Ownership

**Scope:** Resource responsibility, transfer, sharing, and destruction.

**Starter question:** Who is responsible for a resource, how can that responsibility change, and how are invalid duplication and double disposal prevented?

**Start with:** [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-043).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-044"></a>

## INV-044 — References and borrowing

**Scope:** Targets, permissions, temporary access, and explicit syntax.

**Starter question:** What does explicit reference access designate, what permissions accompany it, and when must access end?

**Start with:** [docs/slot-parameters.md](../docs/slot-parameters.md); [docs/caller-mutation-grants.md](../docs/caller-mutation-grants.md); [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-044).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-045"></a>

## INV-045 — Lifetimes and escape analysis

**Scope:** Validity across scopes, calls, returns, and captures.

**Starter question:** What establishes that storage outlives an access, and how are returned, retained, and captured accesses checked?

**Start with:** [docs/closures.md](../docs/closures.md); [docs/call-replacement-flow.md](../docs/call-replacement-flow.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-045).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-046"></a>

## INV-046 — Aliasing and exclusivity

**Scope:** Overlapping access, disjointness, and invalidation.

**Starter question:** Which simultaneous accesses are compatible, what must be proved about overlap, and how do nested handoffs restore access?

**Start with:** [docs/call-replacement-flow.md](../docs/call-replacement-flow.md); [docs/caller-mutation-grants.md](../docs/caller-mutation-grants.md); [docs/evaluation-order.md](../docs/evaluation-order.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-046).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-047"></a>

## INV-047 — Allocation control

**Scope:** Automatic allocation, explicit allocation, allocators, arenas, and pools.

**Starter question:** Which operations may allocate, how can callers control allocation, and what are allocation failure and resource-lifetime contracts?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/lists.md](../docs/lists.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-047).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-048"></a>

## INV-048 — Storage placement

**Scope:** Registers, stack, heap, static storage, and thread-local storage.

**Starter question:** Which placement choices are observable or controllable, and which can the compiler choose while preserving lifetimes and identity?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/closures.md](../docs/closures.md); [docs/local-shadowing-and-copies.md](../docs/local-shadowing-and-copies.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-048).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-049"></a>

## INV-049 — Initialization safety

**Scope:** Zero values, reserved storage, definite initialization, and partial states.

**Starter question:** Which reads and writes are valid before complete initialization, and how do control flow and cleanup track partial states?

**Start with:** [docs/zero-initialization.md](../docs/zero-initialization.md); [docs/reserved-storage.md](../docs/reserved-storage.md); [docs/first-initialization.md](../docs/first-initialization.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-049).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-050"></a>

## INV-050 — Memory layout

**Scope:** Size, alignment, padding, field order, and packed representations.

**Starter question:** Which representation properties are guaranteed, which are target-dependent, and how are layout guarantees distinguished from ABI?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/arrays.md](../docs/arrays.md); [docs/records.md](../docs/records.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-050).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-051"></a>

## INV-051 — Addresses and identity

**Scope:** Stable locations, relocation, pinning, and zero-sized values.

**Starter question:** When is location identity observable, what can move, and how are addresses of zero-sized or relocated values treated?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/unit.md](../docs/unit.md); [docs/slot-parameters.md](../docs/slot-parameters.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-051).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-052"></a>

## INV-052 — Raw memory boundaries

**Scope:** Restricted pointers, unsafe operations, reinterpretation, and provenance.

**Starter question:** Which low-level operations are needed, how are they bounded, and what prevents them from silently weakening ordinary safe code?

**Start with:** [docs/principles.md](../docs/principles.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-052).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-053"></a>

## INV-053 — Memory reclamation

**Scope:** Deterministic destruction, reference counting, tracing, and cycles.

**Starter question:** Which reclamation mechanisms fit the intended control and cost model, and how would each handle sharing, cycles, and cleanup?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md); [docs/closures.md](../docs/closures.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-053).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-054"></a>

## INV-054 — Fixed arrays

**Scope:** Inline storage, static extent, indexing, and conversion.

**Starter question:** How do static extent, element layout, indexing, widening, and access grants interact without losing array shape?

**Start with:** [docs/arrays.md](../docs/arrays.md); [docs/tuple-array-shapes.md](../docs/tuple-array-shapes.md); [docs/call-replacement-flow.md](../docs/call-replacement-flow.md).

**Investigation:** recorded (user-approved bounded implementation); contributor: redacted (agent-assisted); note: [INV-054 — readable fixed arrays for the FVP](INV-054-fvp-fixed-arrays.md) — existing literal/index/type forms and action traversal implemented for nonempty homogeneous arrays of scalars/flat tuples. Strict checking and 93 interpreter test groups pass. No new helper APIs; empty construction, mutation/growth, union/nested inference, views, general protocols and native layout remain unimplemented.

<a id="inv-055"></a>

## INV-055 — Runtime-sized arrays and lists

**Scope:** Ownership, length, capacity, growth, and copying.

**Starter question:** What does a dynamic sequence own, how do growth and copies behave, and when are existing accesses invalidated?

**Start with:** [docs/lists.md](../docs/lists.md); [docs/sequence-types.md](../docs/sequence-types.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-055).

**Investigation:** recorded (bounded FVP implementation; broader contracts open); contributor: redacted (agent-assisted); note: [INV-055 — FVP runtime-owner boundary](INV-055-fvp-owner-boundary.md) — copy-first FVP focus clarified by the user: ordinary sequence copies now, behavior-preserving compiler/post-compilation optimization, explicit noncopying modes later. The subsequent explicitly approved list slice supplies bounded runtime construction/end operations and temporary faults. General generics, capacity and permanent allocation behavior remain open; no optimizer added.

**Follow-up:** [INV-055 — list end-operation names](INV-055-fvp-list-operations.md) — records the user-selected canonical push_front/push_back/pop_front/pop_back names. No generic grammar, constructor, helper implementation or allocation policy selected.

**Follow-up:** [INV-055 — approved bounded FVP list slice](INV-055-fvp-list-slice.md) — explicitly approved builtin List<T>/mut construction, four end operations, ordinary sequence copies and temporary terminal diagnostics implemented. Strict checking and 120 interpreter groups pass; all 9 editor groups pass. Broader generics, capacity, aliasing, views and recovery remain outside scope.

<a id="inv-056"></a>

## INV-056 — Slices and views

**Scope:** Borrowing, bounds, stride, mutation, and invalidation.

**Starter question:** What does a view retain or borrow, and how do bounds, permissions, source mutation, and lifetime constrain its use?

**Start with:** [docs/slices.md](../docs/slices.md); [docs/sequence-types.md](../docs/sequence-types.md); [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-056).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-057"></a>

## INV-057 — Collection protocols

**Scope:** Traversal, indexing, ordering, capabilities, and custom containers.

**Starter question:** Which operations imply which guarantees, and how can custom containers satisfy consumers without unnecessary representation constraints?

**Start with:** [docs/collection-capabilities.md](../docs/collection-capabilities.md); [docs/collection-operation-contracts.md](../docs/collection-operation-contracts.md); [docs/collection-function-signatures.md](../docs/collection-function-signatures.md).

**Investigation:** recorded (fourteen-system survey and lattice proposal; no contract selected); contributor: redacted (agent-assisted); note: [INV-057 — collection capability lattice and concept boundaries](INV-057-capability-lattice.md) — records the orthogonal axes, the combinations representation forces, a seven-test split/merge procedure, a six-primitive lattice with derived operations and named bundles, conformance options, and the mapping from twelve storage families. Open: the `[T]` bundle definition, contiguity as a refinement, cost-class spelling, and user conformance syntax.

<a id="inv-058"></a>

## INV-058 — Maps, sets, and standard structures

**Scope:** Hashing, equality, ordering, and storage choices.

**Starter question:** What contracts do standard associative structures require, and how do keys, order, mutation, and representation affect behavior?

**Start with:** [docs/collection-order-and-traversal.md](../docs/collection-order-and-traversal.md); [docs/set-patterns.md](../docs/set-patterns.md); [docs/collections-and-iterators.md](../docs/collections-and-iterators.md).

**Investigation:** recorded (storage-family survey, equality/hash/order contracts, shipping recommendation); contributor: redacted (agent-assisted); note: [INV-058 — storage families, equality, hashing, and ordering](INV-058-storage-families-and-equality.md) — records twelve storage families with honest guarantees, the equivalence/hash-consistency/total-order contracts associative containers need, the numeric-key edge cases, an insertion-ordered default for reproducibility, text as a named-unit family, and a proposed shipping table that excludes a linked list and flags the missing inline fixed-capacity cell.

<a id="inv-059"></a>

## INV-059 — Collection algorithms

**Scope:** Sorting, searching, transformations, and intermediate allocation.

**Starter question:** What do algorithms require and guarantee, and when can provider-specific implementations or lazy results avoid extra work?

**Start with:** [docs/collection-algorithms.md](../docs/collection-algorithms.md); [docs/collection-function-signatures.md](../docs/collection-function-signatures.md); [docs/generic-collection-performance.md](../docs/generic-collection-performance.md).

**Investigation:** in progress (operator-surface and intermediate-allocation portion recorded); contributor: redacted (agent-assisted); note: [INV-060 — sequence execution and operator-surface models](INV-060-sequence-execution-and-surface-models.md) — records the composition-surface options, the lazy return-type dependency, and the per-stage-versus-per-element cost split across thirteen reference systems. Sorting and search algorithm selection remain not started.

<a id="inv-060"></a>

## INV-060 — Iterator behavior

**Scope:** Laziness, retention, mutation during traversal, and completion.

**Starter question:** What can traversal consume or retain, can it repeat, and what happens when the source changes or iteration stops early?

**Start with:** [docs/collection-source-contracts.md](../docs/collection-source-contracts.md); [docs/collection-order-and-traversal.md](../docs/collection-order-and-traversal.md); [docs/collections-and-iterators.md](../docs/collections-and-iterators.md).

**Investigation:** recorded (reference survey and option analysis; no contract selected); contributor: redacted (agent-assisted); note: [INV-060 — sequence execution and operator-surface models](INV-060-sequence-execution-and-surface-models.md) — the user identifies general sequence operators as a required capability covering cold, warm, lazy, and generator sources. Records thirteen reference systems, the surface options, the execution-model options, the two generator shapes, the per-element failure options, and the per-stage-versus-per-element cost split. No new container type is recommended; the open blockers are receiver declaration (INV-030) and the lazy return-type decision.

<a id="inv-061"></a>

## INV-061 — Compiler structure

**Scope:** Parsing, checking, intermediate representations, lowering, and code generation.

**Starter question:** Which responsibilities belong to each compiler boundary, and what information must survive until safe lowering and diagnostics?

**Start with:** [docs/grammar-sketch.md](../docs/grammar-sketch.md); [docs/types-and-inference.md](../docs/types-and-inference.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [6 bounded questions](SUBTOPICS.md#inv-061).

**Focus:** [Lightweight native execution questions and evidence](lightweight-native-execution.md).

**Investigation:** recorded; contributor: redacted (agent-assisted); note: [INV-061 — FVP implementation language](INV-061-fvp-implementation-language.md) — strict TypeScript/Node replaces Python as the minimal igniter; the first checkpoint is implemented and tested, with early transition to a Lite-written compiler still selected; retire active host-language development while preserving the source-bootstrap path. INV-061.06 now reviews a bounded first-output proposal; retirement thresholds, rebuild chain and full compiler architecture remain open.

**Follow-up:** [INV-061 — arithmetic front-end exercise in Lite](INV-061-lite-arithmetic-front-end.md) — application-only recursive parser/evaluator uses approved token lists and value/position pairs; runs on the preserved alpha.15 interpreter without host changes. Strict checking and 125 interpreter groups plus 9 editor groups pass. No compiler output, AST/IR/backend selection or self-hosted stage; first execution/output/rebuild contracts remain open.

**Follow-up:** [INV-061.06 — bootstrap and maintained targets](INV-061-first-compiler-output.md) — user selects TS first for early self-hosting and maintained web output, a permanent readable TS bootstrap with byte-output equivalence, overlapping igniter/self-hosted development, and C as first native/maintained project-library export and migration target. Possible AS/early Wasm remains an investigation; no FFI/API/layout implied.

**Follow-up:** [INV-061 — first TS emission and parity](INV-061-ts-emission-and-parity.md) — Lite-written compiler for a single signed-integer report emits readable TS with separate Node adapter. Nine admitted cases have raw stdout/stderr/status parity, strict Node-free core checks and TS-to-JS checks. All 130 interpreter groups pass. Existing quoted-delimiter parser bug fixed; no self-rebuild/browser/AS proof.

**Follow-up:** [INV-061 — first restricted C emission and parity](INV-061-c-emission-and-parity.md) — Lite-written compiler emits standalone C for the same report-literal source class. Nine native/TS/igniter programs have equal output bytes/status after actual local C compilation. Strict checking and 132 interpreter groups plus 9 editor groups pass. General native/library/runtime lowering and self-rebuild remain open.

**Follow-up:** [INV-061 — whole-source compiler input](INV-061-whole-source-emission.md) — existing restricted TS/C emitters adopt approved inputAll, multi-line whitespace and complete-input validation. Twelve native/TS/JS/igniter parity cases pass; strict checking and 139 interpreter groups plus 9 editor groups pass. No new syntax/helper, full parser or self-rebuild claim.

**Follow-up:** [INV-061 — compiler source context](INV-061-compiler-source-context.md) — the TS/C applications accept an optional logical source name via approved inputArgs for exact rejection prefixes. Valid artifacts remain unchanged; extra arguments fail before reads. Strict checking and 147 interpreter groups plus 9 editor groups pass. Generated runtime fault locations/ABI remain separate.

**Follow-up:** [INV-061 — statement sequencing in compiler applications](INV-061-statement-sequencing.md) — the TS/C applications sequence arbitrary report(integer) statements over whole source input using existing List/loops without language additions. Emitted TS and native C preserve exact byte/status parity across 15 admitted programs. Strict checking and 148 interpreter groups plus 9 editor groups pass. Control flow and runtime fault generation remain open.

**Follow-up:** [INV-061 — arithmetic expressions and immutable locals](INV-061-arithmetic-and-locals-emission.md) — the TS/C applications now parse `+ - * /`, parentheses, unary signs and immutable `x := <expression>;` locals. Expressions are checked in signed 64-bit and lowered to TS BigInt or C `int64_t`; 28 admitted programs have raw byte/status/signal parity across TS, translated JS, native C and the igniter. Strict checking and 153 interpreter groups plus 9 editor groups pass. Full parsing, runtime panic parity and self-rebuild remain open.

**Follow-up:** [INV-061 — String values, multi-value reports and verification fixtures](INV-061-string-and-multi-value-reports.md) — the TS/C applications now admit String literals/escapes, immutable String locals, String `+` concatenation and multi-value `report` calls over Int/String values. String expressions are closed constants and concatenation is folded at compile time; emitted literals are escaped for TS and C. The compiler corpus moved to 43 program and 34 rejection cases under `igniter/tests/compiler/`, each pairing a sibling `.lts` entry source with a JSON model containing the source path, optional `stdin`, required `stdout`/`stderr` streams, and `exitCode` (each stream uses inline `text`, inline `bytes` or a sibling `file`). Filenames follow `NNN-MMM-title-subtitle.json` (category 001 program, 002 rejection). All program cases pass four-way parity and all rejection cases pass exact diagnostics through both compilers. Strict checking and 173 interpreter groups plus 9 editor groups pass. Text operations/indexing, adjacent literals, NUL handling, runtime input and self-rebuild remain open.

**Follow-up:** [INV-061 — compiler extraction and temporary flat imports](INV-061-compiler-extraction.md) — the TS/C emitters moved from `examples/017`/`018` to `compiler/`; a shared `frontend.lts` now carries the parser, checked evaluation, value model and report stream, while the backends carry only literal encoding and emission. Every compiler type/function is documented with `/** ... */`, and a test enforces presence for compiler declarations. `importFlatAll "frontend.lts";` is a temporary loader workaround in `igniter/loader.ts`, not language syntax; it rejects cycles/absolute paths, includes a declaration-only file once, and shifts diagnostics. `./ltc`/`./litec`/`./lite compile` expose the compiler; `./lite check`, `./lite docs` and `./lite help` expose the current checker/docs/help commands. All 43 program and 34 rejection cases retain their expected behavior; 173 interpreter groups plus 9 editor groups pass. No duplicated parser remains; permanent modules/imports, runtime input and self-rebuild remain open.

<a id="inv-062"></a>

## INV-062 — Compile-time computation

**Scope:** Compile-time evaluation, computed constants and types, reflection, metaprogramming, compile-time execution engines, templating, preprocessing alternatives, and macro expansion.

**Starter question:** Which computation or inspection should be possible during compilation, and what limits preserve predictable semantics and build costs?

**Start with:** [docs/types-and-inference.md](../docs/types-and-inference.md); [docs/generic-notation.md](../docs/generic-notation.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [7 later questions in two groups](SUBTOPICS.md#inv-062), added 2026-10-30: evaluation/constants/types and execution models; templating/preprocessing/macros. Rust-style op!() and Jai's compile-time execution approach are comparison candidates, not selected syntax or mechanisms. All seven are not started.

**Related boundaries:** [Module initializer effects](SUBTOPICS.md#inv-003-05), [generics](SUBTOPICS.md#inv-027), [lean code generation](SUBTOPICS.md#inv-063-05), and [replaceable standard modules](SUBTOPICS.md#inv-071). A module being declaration-oriented does not settle compile-time effect permissions.

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-063"></a>

## INV-063 — Optimization contracts

**Scope:** Copy elimination, inlining, specialization, vectorization, and observable behavior.

**Starter question:** Which transformations preserve selected semantics, and which costs or effects cannot be removed without a proof?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/parameter-values-and-slots.md](../docs/parameter-values-and-slots.md); [docs/evaluation-order.md](../docs/evaluation-order.md).

**Starter subtopics:** [5 bounded questions](SUBTOPICS.md#inv-063).

**Focus:** [Lightweight native execution questions and evidence](lightweight-native-execution.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-064"></a>

## INV-064 — Runtime responsibilities

**Scope:** Support services, metadata, initialization, and linking.

**Starter question:** Which facilities need shared runtime support, which can be generated locally, and what must a minimal program carry?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/versioning-and-naming.md](../docs/versioning-and-naming.md); [docs/panics.md](../docs/panics.md).

**Starter subtopics:** [5 bounded questions](SUBTOPICS.md#inv-064).

**Focus:** [Lightweight native execution questions and evidence](lightweight-native-execution.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-065"></a>

## INV-065 — Calling conventions and ABI

**Scope:** Argument passing, returns, closures, errors, and compatibility.

**Starter question:** How are public contracts represented across compiled boundaries, and which compatibility promises are independent of storage layout?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/versioning-and-naming.md](../docs/versioning-and-naming.md); [docs/callable-value-variance.md](../docs/callable-value-variance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-065).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-066"></a>

## INV-066 — Foreign interfaces

**Scope:** C interoperability, external memory, callbacks, and foreign resources.

**Starter question:** How do foreign calls translate types, ownership, failures, callbacks, and lifetimes without bypassing ordinary safety contracts?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md).

**Starter subtopics:** [5 bounded questions](SUBTOPICS.md#inv-066).

**Investigation:** direction recorded; export/ABI implementation not started; contributor: redacted (agent-assisted); note: [maintained C export and migration goal](INV-061-first-compiler-output.md#maintained-c-export-and-migration-goal) — user requests shippable/shareable libraries/projects and a migration path outside Lite. Exact C interfaces, support dependencies, ABI and export layout remain open.

<a id="inv-067"></a>

## INV-067 — Host interaction

**Scope:** Console I/O, arguments, environment, files, processes, clocks, and randomness.

**Starter question:** Which host operations are needed for exercises, and what are their effect, failure, resource, encoding, and determinism contracts?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/tooling-and-learning.md](../docs/tooling-and-learning.md); [samples/list.md](../samples/list.md).

**Investigation:** recorded (bounded helper/CLI implementation); contributor: redacted (agent-assisted); note: [INV-067 — script arguments for source context](INV-067-fvp-script-arguments.md) — explicitly approved inputArgs(): List<String> and -- separated runner suffix implemented with ordered copied argument Strings, no stream effects and silent check-only behavior. Strict checking and 145 interpreter groups plus 9 editor groups pass; source-context application and other host interaction remain separate.

<a id="inv-068"></a>

## INV-068 — Concurrency and parallelism

**Scope:** Threads, tasks, asynchronous execution, cancellation, and synchronization.

**Starter question:** How would concurrent work transfer or share data and resources, and how would cancellation interact with cleanup and failures?

**Start with:** [docs/principles.md](../docs/principles.md); [docs/deferred-cleanup-and-resources.md](../docs/deferred-cleanup-and-resources.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-068).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-069"></a>

## INV-069 — Memory ordering

**Scope:** Atomics, visibility, data races, and shared-state rules.

**Starter question:** Which cross-thread observations are permitted, what constitutes a race, and which synchronization guarantees would be required?

**Start with:** [docs/mutability.md](../docs/mutability.md); [docs/parameter-permissions.md](../docs/parameter-permissions.md); [docs/memory-and-performance.md](../docs/memory-and-performance.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-069).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-070"></a>

## INV-070 — Platform targets

**Scope:** Operating systems, architectures, cross-compilation, WebAssembly, and embedded use.

**Starter question:** Which language guarantees are portable, and which host, representation, or runtime assumptions vary by target?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/versioning-and-naming.md](../docs/versioning-and-naming.md).

**Investigation:** target direction recorded; full platform investigation open; contributor: redacted (agent-assisted); note: [TS/web, C/native and possible AS/Wasm direction](INV-061-first-compiler-output.md) — TS is a maintained web/bootstrap target; C is first native and a maintained export target; possible AS/early Wasm needs separate compatibility/host/runtime checks. No platform matrix, ABI or Wasm execution claim.

**Follow-up:** [INV-070 — isolated AssemblyScript report-core probe](INV-070-assemblyscript-report-probe.md) — unchanged emitted TS compiles/runs with AS 0.28.20 in a temporary environment for 12 report-literal cases, matching raw output/status/signal. Incremental runtime and host bindings are explicit; no project dependency, general AS support, browser claim or memory policy selected.

<a id="inv-071"></a>

## INV-071 — Standard-library boundaries

**Scope:** Compiler primitives, script conveniences, replaceable standard modules, interface/implementation definition locations, optional libraries, and dependency costs.

**Starter question:** Which facilities belong in the language, prelude, or libraries, and how are optional facilities and their costs exposed?

**Start with:** [docs/modules-and-packages.md](../docs/modules-and-packages.md); [docs/collection-abstractions.md](../docs/collection-abstractions.md); [docs/tooling-and-learning.md](../docs/tooling-and-learning.md).

**Starter subtopics:** [3 later questions](SUBTOPICS.md#inv-071), added 2026-10-30; mechanisms not started.

**Focus:** [Library replacement and lean generated code](lightweight-native-execution.md#later-library-and-code-size-questions-2026-10-30). The replaceable-standard goal is recorded in [INV-003.03](INV-003-03-script-environment.md#source-kind-and-standard-module-selection-2026-10-30); this does not resolve the provider mechanism or start these subtopics.

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-072"></a>

## INV-072 — Tooling and diagnostics

**Scope:** CLI, formatter, editor support, debugging, profiling, and error messages.

**Starter question:** What feedback and tools let beginners and developers understand programs, costs, and failures without conflating formatting with checking?

**Start with:** [docs/tooling-and-learning.md](../docs/tooling-and-learning.md); [docs/unused-name-intent.md](../docs/unused-name-intent.md); [docs/comments.md](../docs/comments.md).

**Starter subtopics:** [5 bounded questions](SUBTOPICS.md#inv-072).

**Focus:** [Multilingual source and learning questions](multilingual-source-and-learning.md).

**Teaching proposal, 2026-10-30:** [INV-072.05](SUBTOPICS.md#inv-072-05) inventories a final-binding run flag and marked inspection points. Detailed investigation not started; no flag/mark syntax or debugger implementation is selected, and this is not an FVP gate.

**Investigation:** recorded (editor-highlighter scope only); contributor: redacted (agent-assisted); note: [INV-072 — small VS Code highlighter](INV-072-vscode-highlighter.md) — user-requested local .lt/.lts highlighting using existing syntax; no new language feature, semantic checker, formatter, runner or debugger. Other tooling/diagnostic questions remain open.

<a id="inv-073"></a>

## INV-073 — Testing and verification

**Scope:** Assertions, exercise runners, conformance tests, and invalid-program tests.

**Starter question:** What evidence distinguishes expected examples, admitted and rejected programs, runtime results, and complete exercise solutions?

**Start with:** [samples/NOTES.md](../samples/NOTES.md); [challenges/README.md](../challenges/README.md); [challenges/benchmark/README.md](../challenges/benchmark/README.md).

**Starter subtopics:** [4 bounded questions](SUBTOPICS.md#inv-073).

**Focus:** [Multilingual source and learning questions](multilingual-source-and-learning.md).

**Investigation:** recorded (first verification-registry slice); contributor: redacted (agent-assisted); note: [INV-073 — feature and artifact verification registry](INV-073-verification-registry.md) — feature verifications are the semantic contract and examples/samples are verified consumers. The 17-feature registry and 25-scenario runner pass; 5 examples and 3 samples have manifests; `./lite verify` supports `--update`, `--coverage` and `--filter`. Coverage is informational; compiler targets, showcases, CI, full manifest coverage and blocking gates remain open.

<a id="inv-074"></a>

## INV-074 — Performance evaluation

**Scope:** Startup, execution time, compilation time, binary size, allocations, and memory use.

**Starter question:** How are separate cost goals measured reproducibly on representative workloads without generalizing beyond the evidence?

**Start with:** [docs/memory-and-performance.md](../docs/memory-and-performance.md); [docs/generic-collection-performance.md](../docs/generic-collection-performance.md); [challenges/benchmark/README.md](../challenges/benchmark/README.md).

**Starter subtopics:** [6 bounded questions](SUBTOPICS.md#inv-074).

**Focus:** [Lightweight native execution questions and evidence](lightweight-native-execution.md).

**Investigation:** not started; contributor: unassigned; note: none.

<a id="inv-075"></a>

## INV-075 — Language evolution

**Scope:** Specifications, proposals, compatibility, editions, and versioning.

**Starter question:** How do explicit decisions become authoritative contracts, and how are supersession and source or ABI compatibility recorded?

**Start with:** [docs/versioning-and-naming.md](../docs/versioning-and-naming.md); [docs/proposals/README.md](../docs/proposals/README.md); [docs/normative-pages.md](../docs/normative-pages.md).

**Investigation:** not started; contributor: unassigned; note: none.
