# LiteScript documentation review — open task list

**Snapshot:** `5a4cf3c` (2026-10-20). **Corpus:** 135 Markdown files, ~158.5k words.
**Scope:** gaps, contradictions, stale statuses, wrong examples, and grammar/index/ledger defects found across the documentation reviews through 2026-10-20. This is an internal backlog, not language documentation.
**Topic view:** [ISSUES-BY-TOPIC.md](ISSUES-BY-TOPIC.md) groups these items by topic and adds review-level findings. This snapshot is stale; re-triage before relying on any item's status.

**Priority legend**

- **P0** — wrong selected semantics, an unusable surface, or a contradiction that changes what a handler/exit does.
- **P1** — selected-vs-open contradiction, wrong or unreachable example, migration residue, or a structural ledger/grammar/index defect.
- **P2** — localized stale text, undefined term, metadata drift, or a missing clarification.
- **P3** — polish, duplication, navigation, or process.

File links identify the containing document; the quoted text identifies the passage. Line anchors are intentionally omitted because the corpus is edited frequently. All items are open unless marked otherwise.

## Summary

| Priority | Items | Meaning |
|---|---:|---|
| P0 | 7 | Wrong selected semantics or an unusable surface |
| P1 | 21 | Selected-vs-open conflicts, wrong examples, migration residue, structural ledger/grammar |
| P2 | 24 | Localized stale text, undefined terms, metadata drift |
| P3 | 7 | Navigation, duplication, process |

Suggested first pass: T-001 (filter spelling), T-002 (failure aggregate), T-003 (function target), T-004 (exit ambiguity), then the propagation sweep T-008–T-018.

---

## P0 — load-bearing

### T-001 — Type-only recovery filters use the binding spelling
**Area:** recovery, patterns
**Evidence:** [recovery-receiver-types.md](docs/recovery-receiver-types.md) presents `target else (BoundPanic) { … }` as the “type-only” spelling; [expression-recovery.md](docs/expression-recovery.md) and [grammar-sketch.md](docs/grammar-sketch.md) repeat it. But [pattern-bindings-and-tests.md](docs/pattern-bindings-and-tests.md) selects that an unmarked bare identifier is a binding, and [same document](docs/pattern-bindings-and-tests.md) says bare `User` is not a type test.
**Problem:** `else (BoundPanic)` binds a name and matches every failure instead of filtering for `BoundPanic`, silently broadening handler coverage. The same issue affects `else (A)` in the munching examples.
**Fix:** spell type-only filters `else (: BoundPanic)` / `else (: Panic)`, or select and document an explicit recovery-only exception to bare-name binding.

### T-002 — Failure “munching” is specified over an undefined aggregate and its trace uses a union
**Area:** recovery, failure aggregation
**Evidence:** [expression-recovery.md](docs/expression-recovery.md) and [finally.md](docs/finally.md) specify member-wise handling for `A & B`; [expression-recovery.md](docs/expression-recovery.md) writes `x1 := op(); // T ! (A | B)`, then [same document](docs/expression-recovery.md) says “if the pending failure contains both A and B” and that `R2` is final. `&` has no type production, and a `|` outcome has one active alternative.
**Problem:** the selected munching rule has no defined aggregate type, and the worked example cannot contain two simultaneous failures; its type progression and `R2` result are invalid. [decisions](docs/decisions-and-open-questions.md) repeats the `A & B` rule while saying the carrier is unselected.
**Fix:** define failure-aggregate notation/carrier once (or mark munching as future-only), move the two-member trace to it, and state that `A | B` runs at most one filter.

### T-003 — Tagged return to a function has no tag syntax
**Area:** control flow, functions, tags
**Evidence:** [control-flow.md](docs/control-flow.md), [decisions](docs/decisions-and-open-questions.md), and [grammar-sketch.md](docs/grammar-sketch.md) list functions as tagged-return targets. [functions.md](docs/functions.md) says “whether function definitions themselves can carry tags … is not yet specified”; the function production has no tag ([grammar](docs/grammar-sketch.md)), and tag templates cover only loops, conditionals, and blocks ([tags-and-contexts.md](docs/tags-and-contexts.md)).
**Problem:** the target matrix includes a construct that cannot be named; the matrix cannot be implemented or taught.
**Fix:** add `[tag]` to the function production and define function-target T/R, or remove functions from the tagged-return matrix until designed.

### T-004 — `@tag.value` exit operands are grammatically ambiguous
**Area:** grammar, exits
**Evidence:** [grammar-sketch.md](docs/grammar-sketch.md) defines `@tag.field` as an expression; [grammar](docs/grammar-sketch.md) allow an optional tag plus an expression. [loop-examples.md](docs/loop-examples.md) uses `continue @scan.value`, which parses either as tagged continue with payload `.value` or as untagged continue with payload `@scan.value`. `break @tag.value` and `return @tag.value` are equally ambiguous.
**Problem:** in nested loops the two parses target different loops, and the corpus claims whitespace never chooses semantics.
**Fix:** state that after an exit keyword `@identifier` is always the target and a following `.` starts the payload, or require parentheses for a `@tag.value` payload; update the example.

### T-005 — Cleanup on returned-error propagation is asserted while the ledger calls it open
**Area:** recovery, cleanup
**Evidence:** [finally.md](docs/finally.md) says “A propagated error or typed panic likewise runs applicable cleanup” (also [same document](docs/finally.md)); [panics.md](docs/panics.md) says returned errors follow structured-exit cleanup; [result-and-errors.md](docs/result-and-errors.md) says applicable cleanup follows exit rules. [decisions](docs/decisions-and-open-questions.md) says “recoverable-error cleanup coverage remains open”; [body-recovery.md](docs/body-recovery.md) leaves Result-forwarding interactions separate; [loop-recovery.md](docs/loop-recovery.md) defers it.
**Problem:** readers cannot tell whether `!` propagation unwinds `finally` blocks. This changes observable behavior.
**Fix:** either select returned-error cleanup in the ledger and remove the open caveat, or mark the `finally`/`panics` traces provisional.

### T-006 — `break @loop` is incompletely integrated
**Area:** loops, exits
**Evidence:** [control-flow.md](docs/control-flow.md) calls `break @loop [value]` “the same stop-and-complete operation” but never says whether a payloadless named break preserves `.value`; [loop-value.md](docs/loop-value.md) lists only bare break and break value. [loop-completion.md](docs/loop-completion.md) and [unified-loop-completion.md](docs/unified-loop-completion.md) list `then` triggers as exhaustion, false condition, bare break, break value, and tagged return — omitting `break @loop`.
**Problem:** the value effect and completion trigger for a selected exit form are unspecified, and the trigger lists read exhaustive.
**Fix:** state that payloadless `break @loop` preserves `.value`, add it to `loop-value`, and add `break @loop [value]` to both `then` trigger lists.

### T-007 — Conditional leading-dot rule contradicts itself
**Area:** conditionals, tags
**Evidence:** [conditionals.md](docs/conditionals.md): “an untagged `if` does not shadow the enclosing loop, and leading-dot access does not fall through to that loop.” [tags-and-contexts.md](docs/tags-and-contexts.md) says conditional contexts do not participate in leading-dot lookup; [same document](docs/tags-and-contexts.md) says use the loop’s explicit tag.
**Problem:** “does not shadow” implies the enclosing loop remains the leading-dot target, while “does not fall through” says the opposite.
**Fix:** state one rule: inside a conditional, leading-dot metadata has no target; use `@loop.field` for the loop and `@tag.value` only in the conditional’s `then`.

---

## P1 — selected-vs-open and structural

### T-008 — Ledger’s “Working proposals” section mixes selected decisions and open questions
**Area:** ledger
**Evidence:** [decisions-and-open-questions.md](docs/decisions-and-open-questions.md) is headed “Working proposals requiring confirmation or formalization” but contains selected decisions at [same document](docs/decisions-and-open-questions.md) (tagged return), [same document](docs/decisions-and-open-questions.md) (last-item retention), and [same document](docs/decisions-and-open-questions.md) (typed filters). §9 still asks the next pattern review to settle already-selected primitives ([same document](docs/decisions-and-open-questions.md)) and says completion/recovery receiver policies remain to confirm ([same document](docs/decisions-and-open-questions.md)) although receivers are retired or selected.
**Problem:** the ledger is the declared source of truth, but its categories no longer predict status.
**Fix:** split into Established / Selected-with-open-details / Open / Superseded, one line per decision, and delete the stale §9 sentences.

### T-009 — Ledger contradicts itself on cleanup-failure precedence
**Area:** ledger, cleanup
**Evidence:** [decisions](docs/decisions-and-open-questions.md) says “whether construct-level cleanup-failure precedence applies await the joint review”; [same document](docs/decisions-and-open-questions.md) and [same document](docs/decisions-and-open-questions.md) say cleanup-failure precedence is selected.
**Problem:** one bullet reopens a selected rule. If the intent is only “does it extend to body-wide cleanup”, the wording does not say so.
**Fix:** replace with “construct-level precedence selected; whether it extends to body-wide/deferred cleanup is open.”

### T-010 — Typed-filter status contradictions
**Area:** recovery
**Evidence:** [receiver-clauses.md](docs/receiver-clauses.md) still calls hook receivers “requested” and [same document](docs/receiver-clauses.md) says “selective typed patterns remain proposals”; [expression-recovery.md](docs/expression-recovery.md) lists “receiver-pattern syntax … remain proposals”; [conditional-recovery.md](docs/conditional-recovery.md) says “any filter semantics also remain open”. Yet [recovery-receiver-types.md](docs/recovery-receiver-types.md) and [expression-recovery.md](docs/expression-recovery.md) select typed filtering.
**Problem:** implementation-facing pages disagree on whether the filter syntax exists.
**Fix:** align all three to “typed filtering selected; broad mixed-channel receiver type and origin representation open.”

### T-011 — Loop-completion statuses and example status lag the selected exits
**Area:** loops, status
**Evidence:** [loop-completion.md](docs/loop-completion.md) says “complete exit/type contracts open”; [unified-loop-completion.md](docs/unified-loop-completion.md) says “full typing/exit contracts open”, although tagged return, labeled break/continue, and `then` execution are selected. [loop-examples.md](docs/loop-examples.md) omits labeled continue from its selected list while using `continue @scan.value` at [same document](docs/loop-examples.md).
**Problem:** page summaries still describe selected exit rules as open.
**Fix:** narrow the open list to inference/cleanup/nonzero initialization and add explicit targeted break/continue to the examples status.

### T-012 — `finally` calls its superseded example a “complete” structure
**Area:** cleanup, examples
**Evidence:** [finally.md](docs/finally.md) says to keep the example as “cleanup-order history rather than current complete syntax”; [same document](docs/finally.md) calls the same code “a complete recovery/cleanup structure under the proposed syntax.” The example attaches `else(failure)` to a grouped block and a whole `if` ([same document](docs/finally.md), [same document](docs/finally.md)), which [body-recovery.md](docs/body-recovery.md) forbids.
**Problem:** the canonical example demonstrates the retired external-handler placement and is simultaneously presented as history and as complete.
**Fix:** move the example/traces under an explicit Historical heading and add a current example using body-local handlers.

### T-013 — `option.md` teaches an unannotated implicit-`None` search
**Area:** loops, Option
**Evidence:** [option.md](docs/option.md) shows `found := @search loop …` without an annotation; [same document](docs/option.md) says exhaustion “supplies `None`”, and [same document](docs/option.md) calls it a “specific implicit optional-completion rule.” [loop-type-inference.md](docs/loop-type-inference.md) uses the annotated form and says unannotated tagged-result inference remains formalization work; [option.md](docs/option.md) says loops no longer insert an Option accumulator.
**Problem:** the example presents an open inference as settled and uses the retired implicit-completion framing.
**Fix:** annotate `found: Option<User>` and state that the destination, not implicit completion, establishes the type.

### T-014 — `result-and-errors.md` cites the retired loop action-only receiver rule
**Area:** Result, loops
**Evidence:** [result-and-errors.md](docs/result-and-errors.md) says “the separate loop-completion hook’s rule that a missing receiver denotes action-only behavior does not apply to Result recovery.” Loop completion is receiverless and the action-result distinction is retired ([loop-completion.md](docs/loop-completion.md), [receiver-clauses.md](docs/receiver-clauses.md)).
**Problem:** the comparison references behavior that no longer exists, confusing the distinction between Result recovery and loop completion.
**Fix:** delete the sentence or replace it with the current distinction (`then` is result processing; recovery has an optional failure receiver).

### T-015 — Grammar cannot parse chained `else` or `else … finally`
**Area:** grammar, recovery
**Evidence:** [grammar-sketch.md](docs/grammar-sketch.md) defines one `else` clause and no `finally` on a recovery expression. [expression-recovery.md](docs/expression-recovery.md) selects `op() else (A) { R1 } else (B) { R2 }`; [finally.md](docs/finally.md) publishes `operation() else (p: BoundPanic) { … } finally { … }`.
**Problem:** selected chained recovery and cleanup templates have no grammar path, and `finally` is reachable only from loop/conditional productions.
**Fix:** add `{else_clause}` repetition and an optional `finally_clause` on recovery expressions, marked attachment-scope pending.

### T-016 — Two `then` examples cannot parse as written
**Area:** examples, grammar
**Evidence:** [control-flow.md](docs/control-flow.md) has `record_choice(@choose.value)` followed by `@choose.value.length`; [same document](docs/control-flow.md) has `log_phone_count(.count)` followed by `.value`. [grammar](docs/grammar-sketch.md) requires a separator after a simple item, and [decisions](docs/decisions-and-open-questions.md) says there is no automatic insertion.
**Problem:** the first call is not the final item, so the claimed tail result is unreachable.
**Fix:** append semicolons after both calls.

### T-017 — Grammar still lacks the selected type layer
**Area:** grammar, types
**Evidence:** `item` admits only binding declarations ([grammar](docs/grammar-sketch.md), [same document](docs/grammar-sketch.md)); `record_type` ([same document](docs/grammar-sketch.md)), `enum_definition` ([same document](docs/grammar-sketch.md)), and `type_alias` ([same document](docs/grammar-sketch.md)) are standalone and unreachable. Plain union `A | B` has no production, only prose; `A & B` has none either.
**Problem:** selected declarations and type forms cannot be derived from the grammar, so it cannot serve as an implementation reference.
**Fix:** add `type_item := identifier ":=" (record_type | enum_definition | "type" type_expression)` to `item`, plus `union_type` and (when selected) `failure_aggregate` placeholders.

### T-018 — Index descriptions lag the changed pages
**Area:** index
**Evidence:** [README.md](docs/README.md) still says Conditionals is “one syntax for actions and values”; [same document](docs/README.md) omits the exit target matrix; [same document](docs/README.md) omits the conditional `.value` restriction; [same document](docs/README.md) still advertises Receiver clauses as live hooks; [same document](docs/README.md) does not mark the arithmetic/bounds page as policy history; [same document](docs/README.md) still advertises fallible-default indexing.
**Problem:** the only navigation layer misdescribes selected vs historical status.
**Fix:** regenerate the affected blurbs from the current status lines and label history/superseded pages.

### T-019 — `mutability.md` states a false general rule
**Area:** mutability
**Evidence:** [mutability.md](docs/mutability.md): “A reassignable binding may provide only read access”, contradicted by the same table’s `var mut x := …; /* reassignable binding; writable access */` at [same document](docs/mutability.md) and by `var user: mut User`.
**Problem:** the summary misstates the selected four-form model; a reader could reject valid `var mut` declarations.
**Fix:** “A reassignable binding with `var` alone provides read-only access; adding `mut` provides writable access.”

### T-020 — Ledger overgeneralizes whole-binding assignment
**Area:** ledger, initialization
**Evidence:** [decisions](docs/decisions-and-open-questions.md): “Whole-binding `=` and compound updates require `var`; field/element updates require `mut` …” The first clause ignores the selected `x: T = ?` first-write exception at [same document](docs/decisions-and-open-questions.md); the second contradicts field compound updates such as `user.age += 1`, which need `mut`, not `var`.
**Problem:** the ledger’s most-quoted assignment rule is wrong in two ways.
**Fix:** “After initialization, whole-binding `=` requires `var`; compound updates follow their target (`var` for the binding, `mut` for held data). A first write to `= ?` is the exception.”

### T-021 — `slot` residue survives in current prose and statuses
**Area:** access, index
**Evidence:** [mut-qualifier-placement.md](docs/mut-qualifier-placement.md) says “slot semantics are unchanged”, [same document](docs/mut-qualifier-placement.md) “the existing type-position slot marker”, and [same document](docs/mut-qualifier-placement.md) `A | slot B`; [caller-location-keywords.md](docs/caller-location-keywords.md) “the current sketch uses target: slot” (also other current-tense passages); [README.md](docs/README.md) still titles a page “Ordinary parameters and slots”; [README.md](docs/README.md) headline `slot` and `A | mut B | C`; [union-values-and-access.md](docs/union-values-and-access.md) says access spelling is still a proposal; [access-union-qualifiers.md](docs/access-union-qualifiers.md) asks for the meaning of a type-position `mut` qualifier. [var-access-qualifier.md](docs/var-access-qualifier.md) says slot is retired and `var` is canonical.
**Problem:** the retired keyword and superseded marker are still presented as current in implementation-facing pages and the index.
**Fix:** replace current-tense `slot`/`A | slot B` with `var`/“former slot”, mark the union summary entries historical, and update both status lines to “var marker selected; contract grammar open.”

### T-022 — Collection `[T]` selected/proposed drift
**Area:** collections
**Evidence:** [collection-order-and-traversal.md](docs/collection-order-and-traversal.md) supports `[Icon]` as a minimal traversal contract a set can satisfy; [collection-inference.md](docs/collection-inference.md) says the `[T]` meaning “remains open”; [collection-signature-ergonomics.md](docs/collection-signature-ergonomics.md) says “No bracket meaning … is selected”, while [same document](docs/collection-signature-ergonomics.md) records acceptance of the indexed direction (also [decisions](docs/decisions-and-open-questions.md)).
**Problem:** three pages still teach the superseded traversal-only interpretation of a bracket form now accepted as indexed.
**Fix:** update the statuses and examples to the indexed meaning; use `Iterable<Icon>` for the traversal-only case.

### T-023 — Indexed-sequence count guarantee has no operation
**Area:** collections, contracts
**Evidence:** [indexed-sequence-contract.md](docs/indexed-sequence-contract.md) and [same document](docs/indexed-sequence-contract.md) include finite cheap exact count in the accepted bundle, but the hooks at [same document](docs/indexed-sequence-contract.md) are only `get_index`, `set_index`, and `iterable`; [same document](docs/indexed-sequence-contract.md) says “The exact count still needs its own query contract.”
**Problem:** the guaranteed capability has no query hook, so a generic body cannot request it and the bundle is circular.
**Fix:** name a count/size hook in the hook set and capability contract, and delete the disclaimer.

### T-024 — Slice indexing status and failure-channel claim are stale
**Area:** sequences
**Evidence:** [slices.md](docs/slices.md) says “this is not yet a selected indexing contract” and mentions postfix `!` for indexing errors; [decisions](docs/decisions-and-open-questions.md) selects direct positional operations with typed faults and attached `else`, and [collection-operation-contracts.md](docs/collection-operation-contracts.md) says `!` does not capture faults.
**Problem:** the slice page describes the wrong failure channel and an undecided status for an already-selected direct-access direction.
**Fix:** state the direct typed-fault default (only fault type/scope open) and remove the `!` claim.

### T-025 — Zero-eligibility wording survives in sequence docs
**Area:** initialization, sequences
**Evidence:** [sequence-types.md](docs/sequence-types.md) says a candidate zero “recursively initializes every element when eligible”; [arrays.md](docs/arrays.md) says “Zero/default element eligibility must not be bypassed.” [zero-initialization.md](docs/zero-initialization.md) retires the zeroability restriction and [same document](docs/zero-initialization.md) says there is no generic zeroability constraint.
**Problem:** “eligible” reintroduces the retired restriction precisely where arrays make it most visible.
**Fix:** delete “when eligible”/“eligibility”; state that recursive zero applies because every element type has a zero.

### T-026 — `Indexed<T>` and `Indexable` name two different contracts without definition
**Area:** collections, terminology
**Evidence:** [collection-capabilities.md](docs/collection-capabilities.md) names positional access `Indexed<T>`; [indexed-sequence-contract.md](docs/indexed-sequence-contract.md) says “General Indexable can use nonpositional keys”; [collection-operation-contracts.md](docs/collection-operation-contracts.md) uses “Indexable” for positional bracket reads.
**Problem:** near-identical names denote keyed lookup versus the `[T]` positional refinement; readers cannot tell what a bracket requires.
**Fix:** define `Indexable` = general keyed lookup and `Indexed<T>` = positional refinement, then use them consistently.

### T-027 — Checked-collection status still treats fallible-default indexing as live
**Area:** collections, recovery
**Evidence:** [checked-collection-operations.md](docs/checked-collection-operations.md) says “neither indexing fallibility nor that extension is selected grammar yet”; [same document](docs/checked-collection-operations.md) says the later direction selects direct access. [decisions](docs/decisions-and-open-questions.md) still says “propose typed fallible dynamic indexing.”
**Problem:** a rejected model is described as merely not-yet-selected, so readers may implement the wrong failure channel.
**Fix:** mark fallible-default indexing superseded; keep only the flat checked-binding extension as the open proposal.

### T-028 — `_ {}` is still framed as ignoring/discarding
**Area:** patterns, index
**Evidence:** [match-coverage.md](docs/match-coverage.md) says “empty-block ignore handlers”; [same document](docs/match-coverage.md) is headed “Explicit ignore”; [match-patterns.md](docs/match-patterns.md) and [enums-and-variants.md](docs/enums-and-variants.md) say `_ {}` “ignores remaining values/inputs”; [README.md](docs/README.md) says “ignores remaining cases.” But `_` is a readable binding ([match-coverage.md](docs/match-coverage.md), [option.md](docs/option.md)); [wildcards-and-skips.md](docs/wildcards-and-skips.md) still titles the page “skipped pattern fields”.
**Problem:** the status/heading vocabulary preserves the superseded nonbinding-wildcard framing even though the body explains the binding.
**Fix:** say “handles remaining inputs with an empty Unit body; `_` binds the subject and may be read,” and retitle the page/section.

---

## P2 — localized stale text, undefined terms, metadata

### T-029 — `mutability.md` omits the first-initialization exception
**Area:** mutability, initialization
**Evidence:** [mutability.md](docs/mutability.md): “Assigning the whole binding through `x = replacement` requires `var`”, while [same document](docs/mutability.md) and [first-initialization.md](docs/first-initialization.md) allow a first write to `= ?` without `var`.
**Problem:** The exception is stated elsewhere; this summary alone would reject valid first writes.
**Fix:** say “after initialization”; note the first-write exception.

### T-030 — Typed-parameter rule is stated too broadly
**Area:** declarations, parameters
**Evidence:** [declarations-and-assignment.md](docs/declarations-and-assignment.md) says “Typed function parameters follow the same rule, as in `fn(user: mut User)`” after the rule “only var remains before the name.” The selected caller-location form is `fn(target: var T)`; `fn(var target: T)` is retired.
**Problem:** The antecedent rule is wrong for parameters and omits the selected type-side var form.
**Fix:** state that typed parameters place qualifiers after the colon, with both `fn(user: mut User)` and `fn(target: var T)`.

### T-031 — `option.md` omits its universal-zero mapping and uses “implicit zero” ambiguously
**Area:** Option, initialization
**Evidence:** [option.md](docs/option.md) says “There is no implicit numeric zero for every empty optional” without stating that `zero(Option<T>)` is `.None`; [zero-initialization.md](docs/zero-initialization.md) selects `.None` as Option’s zero.
**Problem:** the page predates the universal-zero decision; the sentence can be read as denying the selected mapping.
**Fix:** add “`zero(Option<T>)` is `.None`; extraction still has no implicit numeric fallback.”

### T-032 — Descending-range example claim is wrong for the unstepped line
**Area:** numbers
**Evidence:** [numbers.md](docs/numbers.md) shows `loop 10..=1` and `(10..=1).step(3)`, then says “The intended descending example visits `10, 7, 4, 1`.” Only the stepped line does.
**Problem:** The sentence attaches the stepped sequence to the unstepped example, teaching a false trace.
**Fix:** name `(10..=1).step(3)` explicitly.

### T-033 — “A semicolon separates expressions”
**Area:** strings, lexical
**Evidence:** [strings.md](docs/strings.md) says “A semicolon separates expressions”; the selected rule is that semicolons separate items ([lexical-structure.md](docs/lexical-structure.md), [decisions](docs/decisions-and-open-questions.md)).
**Problem:** It misnames the separator’s role and conflicts with the selected lexical rule.
**Fix:** say “expression items” or “items”.

### T-034 — References call targeted return a proposal
**Area:** references
**Evidence:** [references.md](docs/references.md) says “LiteScript’s accumulator and generalized targeted return are separate proposals”; targeted return is established ([control-flow.md](docs/control-flow.md), [decisions](docs/decisions-and-open-questions.md)).
**Problem:** It understates a selected rule and conflates it with the retired accumulator.
**Fix:** say “selected”; the accumulator is retired, not a parallel proposal.

### T-035 — Formatter status/body disagree and the ledger lacks the requirement
**Area:** tooling, ledger
**Evidence:** [tooling-and-learning.md](docs/tooling-and-learning.md) says “requested”, while [same document](docs/tooling-and-learning.md) says “established requirement”; there is no formatter entry in the ledger.
**Problem:** Two statuses for one requirement, and the ledger cannot be used to track it.
**Fix:** pick one status and add the formatter requirement to the ledger.

### T-036 — “Type-only alias syntax” is not an alias
**Area:** patterns
**Evidence:** [pattern-type-review.md](docs/pattern-type-review.md) calls `: Type = sourceField` “Type-only alias syntax”; it introduces no local name, and the docs elsewhere call it type-only testing.
**Problem:** The label implies a binding or alias exists where the form introduces none.
**Fix:** “type-only test”; reserve “alias” for destination bindings.

### T-037 — Stale “does not mark proposals as selected” disclaimer
**Area:** patterns
**Evidence:** [pattern-syntax-comparison.md](docs/pattern-syntax-comparison.md) says the section does not mark proposals as selected, then marks several as selected at [same document](docs/pattern-syntax-comparison.md), [same document](docs/pattern-syntax-comparison.md), [same document](docs/pattern-syntax-comparison.md).
**Problem:** The stale disclaimer contradicts the section’s own selected outcomes.
**Fix:** replace with “records selected outcomes and remaining proposals.”

### T-038 — Alias punctuation and receiver wording remain stale
**Area:** patterns, unused names
**Evidence:** [unused-name-intent.md](docs/unused-name-intent.md) says “Alias punctuation itself remains a proposal”, but `destination = sourceField` is selected ([pattern-aliases.md](docs/pattern-aliases.md)); [same document](docs/unused-name-intent.md) says “loop or hook receivers”, though loop receivers are retired.
**Problem:** Both statements tell readers that selected syntax is still undecided.
**Fix:** link to the selected alias rule and say “hook/recovery receivers”.

### T-039 — `records.md` says alias syntax is unchosen
**Area:** records, aliases
**Evidence:** [records.md](docs/records.md) says the record declaration “does not choose the use of type for aliases or other type definitions”; [type-aliases.md](docs/type-aliases.md) selects `Alias := type TypeExpression`.
**Problem:** The sentence predates the selected alias form and implies no alias syntax exists.
**Fix:** delete the clause or link to the selected alias form.

### T-040 — Foundation type list omits plain unions
**Area:** types
**Evidence:** [types-and-inference.md](docs/types-and-inference.md) lists “Records, tuples, and tagged unions” but not plain unions, although [same document](docs/types-and-inference.md) describes selected plain-union normalization.
**Problem:** The foundation list omits a selected type family, so readers may not learn unions exist.
**Fix:** add “unions of existing types”.

### T-041 — `?=`/`!=` wording still refers to “update meaning”
**Area:** operators
**Evidence:** [operators.md](docs/operators.md): “`?=` and `!=` have no currently assigned update meaning either.” `!=` is not an update form; the sentence obscures that neither has a selected meaning.
**Problem:** The wording implies `!=` has a non-update assignment meaning and obscures that neither is selected.
**Fix:** “neither has a selected meaning; compound forms require a defined underlying operation.”

### T-042 — Historical accumulator omits `break value`
**Area:** loops, historical
**Evidence:** [loop-accumulator.md](docs/loop-accumulator.md): “Plain continue and break preserve it; a body tail value or continue value replaces it.” `break value` also replaces `.value` ([loop-value.md](docs/loop-value.md)).
**Problem:** The historical summary omits a selected commit path, so it misstates `.value` updates.
**Fix:** add “break value” to the replacing list.

### T-043 — Loop-alternatives page uses retired “else”/“accumulator” terms
**Area:** loops, historical
**Evidence:** [loop-pattern-alternatives.md](docs/loop-pattern-alternatives.md): “The current loop else is a completion clause”; [same document](docs/loop-pattern-alternatives.md): “preserve the accumulator?” Current completion is `then`, and the accumulator is `.value`.
**Problem:** The page uses retired `else`/accumulator terms as if current, contradicting the loop contract.
**Fix:** use `then` and `.value`, or mark the page historical.

### T-044 — §9 still asks to confirm retired completion receivers
**Area:** patterns, ledger
**Evidence:** [decisions](docs/decisions-and-open-questions.md) says “Parameter, recovery, and completion receiver policies remain to confirm”; loop completion is receiverless ([loop-completion.md](docs/loop-completion.md), [same document](docs/loop-completion.md)).
**Problem:** The sentence keeps retired completion receivers apparently open.
**Fix:** scope the sentence to non-loop hooks and parameters.

### T-045 — Grammar still says receiver declarations follow the source
**Area:** grammar
**Evidence:** [grammar-sketch.md](docs/grammar-sketch.md): “even when receiver declarations follow the source textually.” No loop receiver declarations exist.
**Problem:** The grammar sentence refers to declarations that no longer exist.
**Fix:** delete the clause; count/value metadata is implicit.

### T-046 — “Receiver list” survives in pattern/shadowing rules
**Area:** patterns, loops
**Evidence:** [local-shadowing-and-copies.md](docs/local-shadowing-and-copies.md) and [wildcards-and-skips.md](docs/wildcards-and-skips.md) refer to “one pattern or receiver list”; loop receiver lists are retired.
**Problem:** The rules refer to a retired list form and can mislead about where duplicates are allowed.
**Fix:** replace with “pattern or hook/parameter list” where intended.

### T-047 — Historical conditional-recovery page says filter semantics are open
**Area:** recovery, historical
**Evidence:** [conditional-recovery.md](docs/conditional-recovery.md) says “any filter semantics also remain open”; typed filters are selected ([recovery-receiver-types.md](docs/recovery-receiver-types.md)).
**Problem:** A historical page still asserts that current filter semantics are open.
**Fix:** label the page historical and remove the current-tense claim.

### T-048 — Case conventions are undocumented and inconsistent
**Area:** naming
**Evidence:** Option uses `.Some`/`.None`; Result uses lowercase `.ok`/`.err` ([decisions](docs/decisions-and-open-questions.md)); enum examples mix `.Ready` and `.started` ([enums-and-variants.md](docs/enums-and-variants.md), [same document](docs/enums-and-variants.md)); no doc states whether case is conventional or free.
**Problem:** readers infer a naming rule that the docs deny (capitalization never chooses meaning) but never state.
**Fix:** add a short naming-convention note and reconcile the prelude examples.

### T-049 — Untagged conditional `then` cannot read its `T`; this is not stated
**Area:** conditionals
**Evidence:** [conditionals.md](docs/conditionals.md) says `@tag.value` requires an explicit tag; an untagged conditional still has `T` and an attached `then`, but there is no way to read `T` in that block. [tags-and-contexts.md](docs/tags-and-contexts.md) confirms untagged contexts do not participate in leading-dot lookup.
**Problem:** users may write an untagged `then` expecting to transform the result and discover the result is unreachable.
**Fix:** state explicitly that an untagged `then` can ignore `T` but must add `@tag` to read it, or allow a local name.

### T-050 — Universal zero is selected before its mappings exist
**Area:** initialization
**Evidence:** [zero-initialization.md](docs/zero-initialization.md) selects all-zero validity for every type; [same document](docs/zero-initialization.md) lists enums, unions, references, resources, and functions as mappings still to design. Loop `.value`, conditional fallback, and omitted initializers all depend on the rule.
**Problem:** several selected contracts rest on an unfinished mapping; “every type has a zero” cannot yet be implemented or checked.
**Fix:** either mark the dependent contracts as conditional on the mapping, or complete the zero mappings before relying on them further.

### T-051 — Conditional zero fallback remains a beginner-facing footgun
**Area:** conditionals, loops
**Evidence:** [conditionals.md](docs/conditionals.md) shows an unmatched `if` returning `zero(Int)` and overwriting the loop accumulator; [same document](docs/conditionals.md) recommends adding an explicit `else` or `continue`.
**Problem:** the default silently replaces accumulated state; the safe path is more verbose. This is a design risk for the stated beginner goal, not just a wording issue.
**Fix:** confirm the rule is intentional, or consider requiring an explicit `else`/`continue` for value-position conditionals in loops.

### T-052 — “As is selected” reads as prose, not a keyword
**Area:** README
**Evidence:** [README.md](docs/README.md) begins “As is selected for a loop’s one optional item name …” at top level, outside the loop section.
**Problem:** “As” reads as an English word and the sentence is misplaced outside the loop section.
**Fix:** write “`as` is selected…” and move the sentence to the loops section.

---

## P3 — navigation, duplication, process

### T-053 — Index/navigation does not scale to 135 docs
**Area:** index
**Evidence:** [README.md](docs/README.md) now has a useful “Start here” block, but the detailed reading order is still three sentences and skips types, patterns, collections, and errors; the “Types and values” section has 81 entries.
**Problem:** The only reading path bypasses most of the corpus, so newcomers never reach the selected type system.
**Fix:** add reading paths for types/unions/patterns/errors and collections/sequences, or split the index into spec/notes/reference.

### T-054 — Index duplicates five links
**Area:** index
**Evidence:** `generic-notation.md` appears twice ([README](docs/README.md), [same document](docs/README.md)); `loop-receivers.md` appears twice ([same document](docs/README.md), [same document](docs/README.md)).
**Problem:** Duplicate entries make the index look like it lists two different documents.
**Fix:** keep one canonical entry per doc.

### T-055 — Handoff file is orphaned and overstates completion
**Area:** process
**Evidence:** [language-design-review-handoff.md](docs/language-design-review-handoff.md) is the only unindexed/inbound-free doc; its front matter says `status: in_progress` while all six todos are `completed`, and it duplicates ledger facts.
**Problem:** The handoff contradicts its own todo state and is invisible to the index, so readers cannot trust it.
**Fix:** move it out of `docs/` (or index it), set the overall status, and link rather than restate selected rules.

### T-056 — No complete current-language specification or decision IDs
**Area:** structure
**Evidence:** the new [white paper](docs/white-paper.md) supplies a foundational philosophy, but 135 docs / ~158.5k words still mix selected rules, proposals, and history; the ledger is a 350-line changelog; there is no complete current-language spec, glossary, or stable decision ID scheme.
**Problem:** the white paper states the philosophy, but a reader still cannot reconstruct the current language contract without synthesizing many pages; docs cite prose, not decisions.
**Fix:** add `spec/` (or one generated current-design page) with stable IDs, keeping the white paper as the philosophy and investigation docs under `notes/`.

### T-057 — Loop/recovery/collection contracts are spread across many pages
**Area:** duplication
**Evidence:** loop completion is restated in [loops.md](docs/loops.md), [loop-completion.md](docs/loop-completion.md), [unified-loop-completion.md](docs/unified-loop-completion.md), [loop-value.md](docs/loop-value.md), and [loop-type-inference.md](docs/loop-type-inference.md); collections span 14 docs; recovery spans a dozen.
**Problem:** every selection must be edited in several places; the current backlog is largely the result of that.
**Fix:** designate one normative page per area and reduce the others to examples/links.

### T-058 — Status vocabulary is still not the four labels
**Area:** metadata
**Evidence:** [README.md](docs/README.md) defines Established / Working proposal / Open / Superseded, but status lines predominantly say “selected” (75), “open” (54), “established” (22), with only a handful using the defined labels.
**Problem:** The documented legend does not match the status lines, so it cannot be used as a filter.
**Fix:** either adopt the four labels as the status prefix or redefine the legend to match actual practice.

### T-059 — `finally`/cleanup terms are used at three scopes
**Area:** cleanup, terminology
**Evidence:** construct-level `finally` is selected ([finally.md](docs/finally.md)), body-wide `finally`/cleanup sections are deferred ([deferred-cleanup-and-resources.md](docs/deferred-cleanup-and-resources.md)), and `finally` is also discussed on operation expressions ([finally.md](docs/finally.md)). The attachment scope is repeatedly called open.
**Problem:** “finally” can mean three different placements; examples do not always say which.
**Fix:** define the three scopes once and tag each example with its scope.

---

## Verified non-issues (do not re-open)

- The formerly broken `finally` → `loop-completion#finally` anchor is fixed; all internal links/anchors resolve at the snapshot.
- Tagged-return bypass language is gone from current pages; it is a selected target-completion rule.
- `continue @scan.value` is a selected labeled-continue form, not the old unselected spelling (but see T-004 for its parse ambiguity).
- Record `= 0` status is fixed; `= 0` is selected.
- All 238 unique external URLs were live at the last check.
