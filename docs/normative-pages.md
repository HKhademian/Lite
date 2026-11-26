# Normative pages

Status: **navigation map selected 2026-10-25**. This page names the pages that state current rules; it does not replace them.

A **normative page** states a selected or established rule. A **supporting page** provides examples, comparisons, rationale, or a narrower part of the contract. A **historical page** records rejected alternatives and must not be read as current behavior.

The owning page states the current rule. When supporting text conflicts,
report the discrepancy and reconcile it against the owning rule and the
recorded decision.

The [specification index](lite://spec) gives each area a stable LS ID and
links to its owners. The [decision ledger](lite://doc/decisions-and-open-questions)
and [Lite Proposal register](lite://doc/proposals/README) retain the decision
history. For compiler behavior, follow the owning page's evidence and the
[verification cases](lite://repo/language/verifications/README.md).

The [memory and performance priorities](lite://doc/memory-and-performance#lightweight-native-execution-priority), selected 2026-10-28, own the lightweight native execution goals and their measurement boundaries. Compiler and memory-management candidates in that page remain proposals.

The [multilingual source and learning page](lite://doc/multilingual-source-and-learning) owns the recorded motivation and proposal boundaries; localized grammar and translation mechanisms remain unselected. The [reference register](lite://doc/references#project-reference-languages) records Salam’s addition.

## Map

| Area | Start with | Related rule pages and draft references |
|---|---|---|
| Design method | [Continuity and analogical coherence](lite://doc/continuity-and-analogy) | [Principles](lite://doc/principles) |
| Syntax and tokens | [Grammar sketch](lite://doc/grammar-sketch) | [Lexical structure](lite://doc/lexical-structure) |
| Types, inference, and flow | [Types and inference](lite://doc/types-and-inference) | [type tests and narrowing](lite://doc/type-tests-and-narrowing) |
| Unions | [Plain union normalization](lite://doc/union-normalization) | [Membership](lite://doc/union-membership), [widening](lite://doc/union-widening), [values and access](lite://doc/union-values-and-access), [field reads](lite://doc/union-field-reads), [field writes](lite://doc/union-field-writes), [initialization](lite://doc/union-initialization-policy), [zero](lite://doc/union-zero), [patterns](lite://doc/union-patterns) |
| Initialization | [First initialization](lite://doc/first-initialization) | [Zero initialization](lite://doc/zero-initialization), [reserved storage](lite://doc/reserved-storage), [record initialization](lite://doc/record-initialization) |
| Conditionals | [Conditionals](lite://doc/conditionals) | [Branch-result inference](lite://doc/branch-result-inference), [condition chains](lite://doc/condition-chains) |
| Record construction | [Record initialization](lite://doc/record-initialization) | [Record identity](lite://doc/record-type-identity), [contextual literal draft](lite://doc/record-initialization#contextual-record-literals) |
| Loops | [Loops](lite://doc/loops) | [Loop value](lite://doc/loop-value), [loop type inference](lite://doc/loop-type-inference), [loop completion](lite://doc/loop-completion), [last item](lite://doc/loop-last-item) |
| Recovery and errors | [Result and errors](lite://doc/result-and-errors) | [Expression recovery](lite://doc/expression-recovery), [failure capture and unwrapping](lite://doc/failure-capture-and-unwrapping), [manual failures and inference](lite://doc/manual-failures-and-inference), [recovery and fallbacks](lite://doc/recovery-and-fallbacks), [checked fault policy](lite://doc/checked-fault-policy), [panics](lite://doc/panics), [finally](lite://doc/finally) |
| Collections and sequences | [Collections and iterators](lite://doc/collections-and-iterators) | [Collection abstractions](lite://doc/collection-abstractions), [operation contracts](lite://doc/collection-operation-contracts), [sequence types](lite://doc/sequence-types), [indexed sequence contract](lite://doc/indexed-sequence-contract) |
| Functions and calls | [Functions](lite://doc/functions) | [Type-attached operations](lite://doc/type-operations), [Named arguments and tuples](lite://doc/named-arguments-and-tuples), [callable input packs](lite://doc/callable-input-packs), [safe callable compatibility and var invariance](lite://doc/callable-value-variance), [union parameter defaults](lite://doc/union-parameter-defaults), [caller grants](lite://doc/caller-mutation-grants), [generic parameter declarations](lite://doc/generic-notation#explicit-generic-names-and-inferred-parameter-declarations) |
| Modules and packages | [Modules and packages](lite://doc/modules-and-packages) | [Import and re-export visibility](lite://doc/modules-and-packages#import-expansion-and-re-exports), [package preload](lite://doc/modules-and-packages#package-preload) |
| Naming and versions | [Naming and versioning](lite://doc/versioning-and-naming) | — |
| Tooling and formatter | [Tooling and learning](lite://doc/tooling-and-learning) | [Lexical structure](lite://doc/lexical-structure) |
| Process and history | [Decision ledger](lite://doc/decisions-and-open-questions) | [Review handoff](lite://doc/language-design-review-handoff), [historical backlog](lite://repo/TASKS.md) |
| Project workflow and documentation | [Development workflow](lite://doc/development-workflow) | [Documentation maintenance](lite://doc/documentation), [component releases](lite://doc/release-automation) |

## Reducing duplication

- Each rule has one owning normative page. Other pages link to it instead of restating the full rule.
- A supporting page may summarize a rule only when it also links to the owning page and does not add a conflicting condition.
- When a selection changes, update its owning page, record the dated decision, and refresh affected examples and links.
- Historical pages keep the old rule but say which current page supersedes it.

## Historical and supporting pages

The entries below identify the earlier rules preserved in these pages.

- [Conditional union fallback](lite://doc/conditional-union-fallback) — earlier zero-default rule.
- [Conditional recovery](lite://doc/conditional-recovery) — superseded external-handler placement.
- [Loop accumulator](lite://doc/loop-accumulator) — retired optional-accumulator model.
- [Loop receivers](lite://doc/loop-receivers) — includes retired receiver-list and header-destructuring forms.
- [Loop recovery](lite://doc/loop-recovery) — historical grouped-loop recovery.
- [Loop pattern alternatives](lite://doc/loop-pattern-alternatives) — historical receiver-pattern alternatives.
- [Qualified access summaries](lite://doc/access-union-qualifiers) — historical access notation.

This list is illustrative, not a complete archive.
