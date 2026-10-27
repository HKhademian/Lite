# Normative pages

Status: **navigation map selected 2026-10-25**. This page names the pages that state current rules; it does not replace them.

A **normative page** states a selected or established rule. A **supporting page** provides examples, comparisons, rationale, or a narrower part of the contract. A **historical page** records rejected alternatives and must not be read as current behavior.

If two pages conflict, the normative page for that area and the [decision ledger](decisions-and-open-questions.md) win. Report the conflict rather than synthesizing a third rule.

The [LiteLang current design specification](spec/README.md) provides stable area IDs and a condensed summary. It is subordinate to these normative pages and the ledger.

The [Lite Proposal register](proposals/README.md) links accepted decision records with their LP IDs, revisions, statuses, and release targets. It records proposal/version history; the owning normative page and decision ledger remain the current-rule reference. Acceptance does not itself create a release or bump a component version.

## Map

| Area | Start with | Also normative for narrower contracts |
|---|---|---|
| Design method | [Continuity and analogical coherence](continuity-and-analogy.md) | [Principles](principles.md), [decision ledger](decisions-and-open-questions.md) |
| Syntax and tokens | [Grammar sketch](grammar-sketch.md) | [Lexical structure](lexical-structure.md) |
| Types, inference, and flow | [Types and inference](types-and-inference.md) | [Type categories](type-categories.md), [type tests and narrowing](type-tests-and-narrowing.md) |
| Unions | [Plain union normalization](union-normalization.md) | [Membership](union-membership.md), [widening](union-widening.md), [values and access](union-values-and-access.md), [field reads](union-field-reads.md), [field writes](union-field-writes.md), [initialization](union-initialization-policy.md), [zero](union-zero.md), [patterns](union-patterns.md) |
| Initialization | [First initialization](first-initialization.md) | [Zero initialization](zero-initialization.md), [reserved storage](reserved-storage.md), [record initialization](record-initialization.md) |
| Conditionals | [Conditionals](conditionals.md) | [Branch-result inference](branch-result-inference.md), [conditional union fallback](conditional-union-fallback.md), [condition chains](condition-chains.md) |
| Loops | [Loops](loops.md) | [Loop value](loop-value.md), [loop type inference](loop-type-inference.md), [loop completion](loop-completion.md), [last item](loop-last-item.md) |
| Recovery and errors | [Result and errors](result-and-errors.md) | [Expression recovery](expression-recovery.md), [failure capture and unwrapping](failure-capture-and-unwrapping.md), [manual failures and inference](manual-failures-and-inference.md), [recovery and fallbacks](recovery-and-fallbacks.md), [checked fault policy](checked-fault-policy.md), [finally](finally.md) |
| Collections and sequences | [Collections and iterators](collections-and-iterators.md) | [Collection abstractions](collection-abstractions.md), [operation contracts](collection-operation-contracts.md), [sequence types](sequence-types.md), [indexed sequence contract](indexed-sequence-contract.md) |
| Functions and calls | [Functions](functions.md) | [Named arguments and tuples](named-arguments-and-tuples.md), [callable input packs](callable-input-packs.md), [safe callable compatibility and var invariance](callable-value-variance.md), [union parameter defaults](union-parameter-defaults.md) |
| Modules and packages | [Modules and packages](modules-and-packages.md) | — |
| Naming and versions | [Naming and versioning](versioning-and-naming.md) | — |
| Tooling and formatter | [Tooling and learning](tooling-and-learning.md) | [Lexical structure](lexical-structure.md) |
| Process and history | [Decision ledger](decisions-and-open-questions.md) | [Review handoff](language-design-review-handoff.md), [historical backlog](../TASKS.md) |

## Reducing duplication

- Each rule has one owning normative page. Other pages link to it instead of restating the full rule.
- A supporting page may summarize a rule only when it also links to the owning page and does not add a conflicting condition.
- When a selection changes, edit the owning page and the decision ledger first, then update examples and comparisons.
- Historical pages keep the old rule but say which current page supersedes it.

## Historical and supporting pages

These pages are useful context but are not the current rule for their area:

- [Conditional recovery](conditional-recovery.md) — superseded external-handler placement.
- [Loop accumulator](loop-accumulator.md) — retired optional-accumulator model.
- [Loop receivers](loop-receivers.md) — retired receiver-list and header-destructuring model.
- [Loop recovery](loop-recovery.md) — historical grouped-loop recovery.
- [Loop pattern alternatives](loop-pattern-alternatives.md) — historical receiver-pattern alternatives.
- [Qualified access summaries](access-union-qualifiers.md) — historical access notation.

This list is illustrative, not a complete archive.
