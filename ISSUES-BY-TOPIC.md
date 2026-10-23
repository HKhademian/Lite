# LiteScript remediation backlog — by topic

**Snapshot:** `d314a9b` (2026-10-23). **Corpus:** 148 Markdown files, ~214k words, 20 `.lite` samples.
**Scope:** consolidates the 59 items in [TASKS.md](TASKS.md) and adds 15 project-level findings from the 2026-10-23 review.

This is the topic-oriented view. [TASKS.md](TASKS.md) remains the detailed evidence log. T-item statuses are inherited as “reported open”; they have **not** been re-verified against this HEAD. Triage them before treating any row as confirmed.

**Totals:** 74 issues: 59 inherited (T-001–T-059) + 15 new (R-001–R-015). 8 are P0. The current state is a design corpus, not an implementation.

**Severity**

- **P0** — wrong selected semantics, unusable surface, or a contradiction that changes behavior.
- **P1** — selected-vs-open conflict, structural defect, missing foundation, or process failure that blocks reliable progress.
- **P2** — localized stale text, undefined term, metadata drift, or missing validation.
- **P3** — polish, navigation, licensing, or process.

## Topic scorecard

Scores describe current health, not effort: 10 means no remediation is needed.

| # | Topic | Score | Issues | Main risk |
|---:|---|---:|---:|---|
| 1 | Vision and principles | 8/10 | 1 | No defined ladder from super-simple entry use to advanced scenarios |
| 2 | Foundations and scope | 3/10 | 4 | Surface syntax is running ahead of memory, generics, and modules |
| 3 | Documentation architecture, metadata, and navigation | 4/10 | 10 | No current normative spec; stale dates and statuses |
| 4 | Grammar and syntax | 4/10 | 6 | Grammar cannot derive selected declarations or recovery chains |
| 5 | Types and inference | 5/10 | 1 | Foundation list and inference rules are incomplete |
| 6 | Initialization, mutability, and access | 5/10 | 7 | Universal zero is selected before its mappings exist |
| 7 | Functions, lambdas, and calls | 6/10 | 2 | Tagged return to a function has no syntax |
| 8 | Conditionals and tags | 5/10 | 3 | Zero fallback silently overwrites accumulated state |
| 9 | Loops and completion | 4/10 | 6 | Exit and completion contracts disagree across pages |
| 10 | Pattern matching | 5/10 | 6 | Wildcard and alias vocabulary still implies retired semantics |
| 11 | Recovery, errors, panics, and cleanup | 4/10 | 8 | Failure aggregate and typed-filter semantics are inconsistent |
| 12 | Collections and sequences | 5/10 | 5 | `[T]` contract, failure channel, and terminology drift |
| 13 | Records, tuples, and named arguments | 5/10 | 2 | Context-sensitive tuple syntax is accumulating complexity |
| 14 | Operators, numbers, and lexical structure | 6/10 | 3 | A few stale rules; mostly localized |
| 15 | References and comparisons | 7/10 | 1 | One stale status claim |
| 16 | Naming and terminology | 5/10 | 1 | Case conventions are undocumented and inconsistent |
| 17 | Tooling, implementation, and validation | 2/10 | 4 | No executable feedback loop |
| 18 | Process and repository hygiene | 3/10 | 4 | Stale backlog, unpushed work, no automation |

---

## 1. Vision and principles — 8/10

The white paper and [principles](docs/principles.md) are coherent and usable.

- **R-015 · P1 — No progressive-disclosure contract.** The project says beginners should start simply, but it does not define how the same program grows into progressively more advanced use without rewrites or a separate dialect. **Fix:** define a small feature ladder (values and inference → mutation → failures → collections → explicit contracts), require one evolving example per level, and test that each step compiles without rewriting earlier code.

**Core requirement:** entry-level programs must be *super simple*, and the same source must be easy to carry into advanced scenarios. Simplicity is not a separate beginner dialect; it is the first rung of one ladder.

**Guardrail:** every selected feature needs a simple default form and an explicit advanced form. Check decisions against R-008 and R-015; otherwise the 59 inherited defects become the normal state rather than an exception.

## 2. Foundations and scope — 3/10

- **R-002 · P1 — Foundation sequencing risk.** Memory/ownership, generics, modules, numeric representation, tooling, effects, concurrency, and FFI remain open ([principles](docs/principles.md)), while deep surface details are already selected. **Fix:** freeze new surface decisions; run a foundation review; mark dependent decisions provisional until their foundation is settled.
- **R-007 · P2 — Sample scope mismatch.** There are 20 samples and a plan for 021–520 ([notes](samples/NOTES.md)), but no toolchain to verify any of them. **Fix:** cap sample expansion until the samples can be parsed and executed; gate new lessons behind a verified-toolchain milestone.
- **R-008 · P2 — No complexity budget.** 148 docs, ~214k words, 274 ledger bullets, and many context-sensitive surface rules. **Fix:** define a per-feature complexity budget, require a reference-language check and a beginner example, and consolidate rules that fail it.
- **R-011 · P2 — No beginner usability validation.** The principles say simplicity must be evaluated with actual beginner tasks ([principles](docs/principles.md)), but no such evaluation exists. **Fix:** run small task-based studies and record results with the decisions they affect.

## 3. Documentation architecture, metadata, and navigation — 4/10

- **T-008 · P1 — Ledger’s “Working proposals” section mixes selected decisions and open questions.** **Fix:** split into Established / Selected-with-open-details / Open / Superseded; one line per decision; delete the stale §9 sentences.
- **T-018 · P1 — Index descriptions lag the changed pages.** Conditionals, exits, receiver hooks, arithmetic history, and fallible indexing blurbs are stale. **Fix:** regenerate affected blurbs from current status lines and label history pages.
- **T-052 · P2 — “As is selected” reads as prose, not a keyword.** **Fix:** write “`as` is selected…” and move the sentence into the loops section.
- **T-053 · P3 — Index/navigation does not scale to 135+ docs.** The only reading path skips types, patterns, collections, and errors. **Fix:** add reading paths or split the index into spec, notes, and reference.
- **T-054 · P3 — Index duplicates links.** `generic-notation.md` and `loop-receivers.md` appear twice. **Fix:** keep one canonical entry per document.
- **T-056 · P3 — No complete current-language specification or decision IDs.** Selected rules, proposals, and history are mixed across 135+ docs. **Fix:** add `spec/` or one generated current-design page with stable IDs; keep investigation notes separate.
- **T-057 · P3 — Loop/recovery/collection contracts are spread across many pages.** Every selection must be edited in several places. **Fix:** designate one normative page per area; reduce the others to examples and links.
- **T-058 · P3 — Status vocabulary is not the four documented labels.** Status lines predominantly say “selected/open/established.” **Fix:** adopt the four labels as status prefixes or redefine the legend to match practice.
- **R-004 · P1 — Date and metadata drift.** [README](README.md) and [docs index](docs/README.md) say 2026-10-20, while 24 docs contain 2026-10-21/22 selections. **Fix:** use one metadata source, remove hand-written snapshot dates, and add a CI check.
- **R-006 · P2 — No automated documentation checks.** Links, anchors, duplicate index entries, status vocabulary, and stale dates are checked manually. **Fix:** add a documentation check script and run it in CI.

## 4. Grammar and syntax — 4/10

- **T-004 · P0 — `@tag.value` exit operands are grammatically ambiguous.** After `break`/`continue`/`return`, `@scan.value` can parse as a target or a payload. **Fix:** after an exit keyword, make `@identifier` always the target and a following `.` start the payload; update the example.
- **T-015 · P1 — Grammar cannot parse chained `else` or `else … finally`.** **Fix:** add `{else_clause}` repetition and an optional `finally_clause` to recovery expressions, marked attachment-scope pending.
- **T-016 · P2 — Two `then` examples cannot parse as written.** Calls are not the final item and lack semicolons. **Fix:** append semicolons after both calls.
- **T-017 · P2 — Grammar still lacks the selected type layer.** Record, enum, alias, union, and `A & B` forms are unreachable or absent. **Fix:** add a `type_item` production plus union and failure-aggregate placeholders.
- **T-045 · P2 — Grammar still says receiver declarations follow the source.** No loop receiver declarations exist. **Fix:** delete the clause; count/value metadata is implicit.
- **R-010 · P2 — Documented code examples are unverified.** T-016 proves at least two examples do not parse. **Fix:** extract fenced examples, parse them, and mark expected-error examples explicitly.

## 5. Types and inference — 5/10

- **T-040 · P2 — Foundation type list omits plain unions.** The list names records, tuples, and tagged unions but not plain unions. **Fix:** add “unions of existing types” and link the selected normalization rules.

**Cross-cutting:** R-002 affects this topic directly; generics, numeric widths, ownership, and variance remain unimplemented foundations.

## 6. Initialization, mutability, and access — 5/10

- **T-019 · P2 — `mutability.md` states a false general rule.** “A reassignable binding may provide only read access” contradicts `var mut`. **Fix:** “`var` alone provides read-only access; adding `mut` provides writable access.”
- **T-020 · P2 — Ledger overgeneralizes whole-binding assignment.** It ignores the first-write `= ?` exception and misstates compound updates. **Fix:** “After initialization, whole-binding `=` requires `var`; compound updates follow their target; a first write to `= ?` is the exception.”
- **T-021 · P1 — `slot` residue survives in current prose and statuses.** **Fix:** replace current-tense `slot`/`A | slot B` with `var` or “former slot”; mark union summaries historical.
- **T-025 · P2 — Zero-eligibility wording survives in sequence docs.** **Fix:** delete “when eligible”; state that recursive zero applies because every element type has a zero.
- **T-029 · P2 — `mutability.md` omits the first-initialization exception.** **Fix:** say “after initialization” and note the `= ?` first-write exception.
- **T-031 · P2 — `option.md` omits its universal-zero mapping.** **Fix:** add “`zero(Option<T>)` is `.None`; extraction still has no implicit numeric fallback.”
- **T-050 · P2 — Universal zero is selected before its mappings exist.** Enums, unions, references, resources, and functions still need mappings. **Fix:** mark dependent contracts conditional, or complete the mappings before relying on them further.

## 7. Functions, lambdas, and calls — 6/10

- **T-003 · P0 — Tagged return to a function has no tag syntax.** The target matrix includes a construct that cannot be named. **Fix:** add `[tag]` to the function production and define target T/R, or remove functions from the matrix until designed.
- **T-030 · P2 — Typed-parameter rule is stated too broadly.** It omits `fn(target: var T)` and misstates the placement rule. **Fix:** state that typed parameters place qualifiers after the colon, including both `fn(user: mut User)` and `fn(target: var T)`.

## 8. Conditionals and tags — 5/10

- **T-007 · P0 — Conditional leading-dot rule contradicts itself.** “Does not shadow” and “does not fall through” imply opposite targets. **Fix:** inside a conditional, leading-dot metadata has no target; use `@loop.field` and `@tag.value` only in `then`.
- **T-049 · P2 — Untagged conditional `then` cannot read its `T`; this is not stated.** **Fix:** state that an untagged `then` can ignore `T` but needs `@tag` to read it, or allow a local name.
- **T-051 · P2 — Conditional zero fallback remains a beginner-facing footgun.** An unmatched `if` can overwrite accumulated state. **Fix:** confirm the rule is intentional, or require an explicit `else`/`continue` for value-position conditionals in loops.

## 9. Loops and completion — 4/10

- **T-006 · P0 — `break @loop` is incompletely integrated.** Payloadless named break’s value effect is unspecified and missing from the trigger lists. **Fix:** state that it preserves `.value`; add `break @loop [value]` to `loop-value` and both `then` trigger lists.
- **T-011 · P1 — Loop-completion statuses lag the selected exits.** Page summaries still call selected exit rules open. **Fix:** narrow the open list to inference/cleanup/nonzero initialization; add targeted break/continue to the examples status.
- **T-013 · P2 — `option.md` teaches an unannotated implicit-`None` search.** **Fix:** annotate `found: Option<User>` and state that the destination establishes the type.
- **T-014 · P2 — `result-and-errors.md` cites the retired loop action-only receiver rule.** **Fix:** delete the sentence or replace it with the current `then` versus recovery distinction.
- **T-042 · P2 — Historical accumulator omits `break value`.** **Fix:** add `break value` to the replacing list.
- **T-043 · P2 — Loop-alternatives page uses retired `else`/“accumulator” terms.** **Fix:** use `then` and `.value`, or mark the page historical.

## 10. Pattern matching — 5/10

- **T-028 · P2 — `_ {}` is still framed as ignoring/discarding.** `_` is a readable binding. **Fix:** say “handles remaining inputs with an empty Unit body; `_` binds the subject and may be read.”
- **T-036 · P2 — “Type-only alias syntax” is not an alias.** **Fix:** call it a type-only test; reserve “alias” for destination bindings.
- **T-037 · P2 — Stale “does not mark proposals as selected” disclaimer.** **Fix:** replace with “records selected outcomes and remaining proposals.”
- **T-038 · P2 — Alias punctuation and receiver wording remain stale.** **Fix:** link to the selected alias rule and say “hook/recovery receivers.”
- **T-044 · P2 — Ledger §9 still asks to confirm retired completion receivers.** **Fix:** scope the sentence to non-loop hooks and parameters.
- **T-046 · P2 — “Receiver list” survives in pattern/shadowing rules.** **Fix:** replace with “pattern or hook/parameter list” where intended.

**Cross-cutting:** R-008 (`_` and alias vocabulary) and R-014 (tuple patterns) affect this topic.

## 11. Recovery, errors, panics, and cleanup — 4/10

- **T-001 · P0 — Type-only recovery filters use the binding spelling.** `else (BoundPanic)` binds a name and matches every failure. **Fix:** spell type-only filters `else (: BoundPanic)` / `else (: Panic)`, or select a recovery-only exception.
- **T-002 · P0 — Failure “munching” is specified over an undefined aggregate and its trace uses a union.** **Fix:** define the failure-aggregate carrier once (or mark munching future-only), move the two-member trace, and state that `A | B` runs at most one filter.
- **T-005 · P0 — Cleanup on returned-error propagation is asserted while the ledger calls it open.** **Fix:** either select returned-error cleanup and remove the caveat, or mark the `finally`/`panics` traces provisional.
- **T-009 · P1 — Ledger contradicts itself on cleanup-failure precedence.** **Fix:** “construct-level precedence selected; whether it extends to body-wide/deferred cleanup is open.”
- **T-010 · P1 — Typed-filter status contradictions.** Three pages disagree on whether filter syntax exists. **Fix:** align to “typed filtering selected; broad mixed-channel receiver type and origin representation open.”
- **T-012 · P1 — `finally` calls its superseded example a “complete” structure.** **Fix:** move the example under an explicit Historical heading and add a current body-local handler example.
- **T-047 · P2 — Historical conditional-recovery page says filter semantics are open.** **Fix:** label the page historical and remove the current-tense claim.
- **T-059 · P3 — `finally`/cleanup terms are used at three scopes.** **Fix:** define construct, body-wide, and operation scopes once; tag each example with its scope.

## 12. Collections and sequences — 5/10

- **T-022 · P1 — Collection `[T]` selected/proposed drift.** Three pages teach the superseded traversal-only interpretation. **Fix:** update statuses/examples to the indexed meaning; use `Iterable<Icon>` for traversal-only cases.
- **T-023 · P1 — Indexed-sequence count guarantee has no operation.** The bundle promises exact count without a query hook. **Fix:** name a count/size hook and delete the disclaimer.
- **T-024 · P1 — Slice indexing status and failure-channel claim are stale.** **Fix:** state the direct typed-fault default and remove the postfix `!` claim.
- **T-026 · P1 — `Indexed<T>` and `Indexable` name two different contracts without definition.** **Fix:** define `Indexable` as general keyed lookup and `Indexed<T>` as the positional refinement.
- **T-027 · P1 — Checked-collection status still treats fallible-default indexing as live.** **Fix:** mark fallible-default indexing superseded; keep only the flat checked-binding extension open.

## 13. Records, tuples, and named arguments — 5/10

- **T-039 · P2 — `records.md` says alias syntax is unchosen.** **Fix:** delete the clause or link to the selected `Alias := type TypeExpression` form.
- **R-014 · P2 — Context-sensitive tuple syntax is accumulating complexity.** `(T)`, `(T,)`, `(:T,)`, `(label: T)`, `(= x)`, and `(x = y)` are distinguished by punctuation and context, while expected types must not choose the parse. **Fix:** prototype the parser, audit the forms for ambiguity and teaching cost, and remove or merge forms that fail.

## 14. Operators, numbers, and lexical structure — 6/10

- **T-032 · P2 — Descending-range example claim is wrong for the unstepped line.** **Fix:** name `(10..=1).step(3)` explicitly.
- **T-033 · P2 — “A semicolon separates expressions.”** **Fix:** say “expression items” or “items.”
- **T-041 · P2 — `?=`/`!=` wording still refers to “update meaning.”** **Fix:** “neither has a selected meaning; compound forms require a defined underlying operation.”

## 15. References and comparisons — 7/10

- **T-034 · P2 — References call targeted return a proposal.** **Fix:** say “selected”; the accumulator is retired, not a parallel proposal.

## 16. Naming and terminology — 5/10

- **T-048 · P2 — Case conventions are undocumented and inconsistent.** Option uses `.Some`/`.None`, Result uses `.ok`/`.err`, and enums mix `.Ready` and `.started`. **Fix:** add a short naming-convention note and reconcile the prelude examples.

**Cross-cutting:** T-026, T-036, T-038, T-043, and T-059 are terminology defects counted under their primary topics.

## 17. Tooling, implementation, and validation — 2/10

- **T-035 · P2 — Formatter status/body disagree and the ledger lacks the requirement.** **Fix:** pick one status and add the formatter requirement to the ledger.
- **R-001 · P0 — No executable validation loop.** There is no lexer, parser, type checker, interpreter, runtime, or test suite; all 20 samples are unverified ([notes](samples/NOTES.md)). **Fix:** implement a minimal toolchain that parses, checks, and runs the 20 samples; add CI; make implementation the next milestone.
- **R-009 · P2 — No per-decision acceptance cases.** Selected rules have no positive/negative conformance cases. **Fix:** require at least one accepting and one rejecting case per selected rule.
- **R-013 · P2 — No roadmap or definition of done.** The repo is planning-only but has no milestone plan beyond the handoff. **Fix:** add a roadmap with exit criteria for spec, toolchain, and samples.

## 18. Process and repository hygiene — 3/10

- **T-055 · P3 — Handoff file is orphaned and overstates completion.** It says `status: in_progress` while all six todos are completed. **Fix:** move or index it, set the overall status, and link rather than restate selected rules.
- **R-003 · P1 — Backlog is stale.** [TASKS.md](TASKS.md) is 99 commits behind, says 135 docs / 158.5k words, and marks no item fixed. **Fix:** re-triage all 59 items, add status/owner/commit, update counts and date, and regenerate on each release.
- **R-005 · P1 — 132 commits are unpushed.** The branch is ahead of `origin/main` with no backup. **Fix:** push, add a remote backup, and run CI on the remote.
- **R-012 · P3 — No license or contribution metadata.** There is no `LICENSE` or `CONTRIBUTING` file. **Fix:** add a license and a short contribution note, or state that the repository is not accepting contributions.

---

## Suggested execution order

### Phase 0 — stabilize the record (1–2 days)

1. Push the 113 unpushed commits (R-005).
2. Re-triage T-001–T-059 and update [TASKS.md](TASKS.md) (R-003).
3. Fix the metadata drift and add a date/link check (R-004, R-006).
4. Resolve the remaining P0 semantics: T-001, T-002, T-003, T-004, T-005, T-006, T-007.
5. Add the missing roadmap/definition of done (R-013).

### Phase 1 — make the core executable (2–4 weeks)

1. Build a minimal lexer, parser, and type checker for the 20 samples (R-001).
2. Add conformance cases for each selected rule (R-009).
3. Parse all documented examples and fix the failures (R-010).
4. Fill the grammar’s missing type layer and recovery chains (T-015, T-017).
5. Publish a single normative core spec with stable decision IDs (T-056, T-057).
6. Define the feature ladder and write one program that grows from entry-level to advanced without a rewrite (R-015).

### Phase 2 — settle foundations (4–8 weeks)

1. Decide memory/ownership, generics, modules, numeric representation, and tooling (R-002).
2. Revisit every dependent selected rule: zero initialization, loops, conditionals, unions, tuples.
3. Consolidate or retire rules that exceed the complexity budget (R-008).
4. Run beginner task studies and record results (R-011).

### Phase 3 — polish and scale

1. Refresh the index, status vocabulary, and per-topic reading paths (T-018, T-053, T-054, T-058).
2. Fix the remaining localized P1/P2/P3 items.
3. Resume sample expansion only after the toolchain verifies the first 20 (R-007).
4. Add licensing and contribution metadata (R-012).

## Definition of done for a topic

A topic is closed only when:

- every T/R item in it is fixed or explicitly deferred with a reason;
- the normative page states one current rule and links the history;
- the feature has a super-simple entry form and a documented path to advanced use;
- at least one accepting and one rejecting case exists;
- examples parse and run, or are marked as expected-error examples;
- the index, status line, and ledger agree;
- no stale date, link, or duplicate entry remains.

## Coverage check

- **T-001–T-059:** all 59 appear exactly once in the primary sections above.
- **R-001–R-015:** all 15 new findings appear.
- **Not re-verified:** all inherited T-statuses. Do not treat this file as proof that an item is still open; confirm each against HEAD during Phase 0.
- **Not re-opened:** the TASKS “Verified non-issues” list remains valid at its snapshot: internal links/anchors, tagged-return wording, `continue @scan.value` as a selected form (except T-004), record `= 0`, and external URLs. Re-check after edits.
