---
name: litescript-language-design-review
status: in_progress
created: 2026-10-19
todos:
  - id: tagged-return
    content: Compare more tagged-return cases; keep completion semantics open until the user selects a rule
    status: completed
  - id: loop-inference
    content: Formalize loop body type T, result type R, and zero-initialized .value inference
    status: completed
  - id: conditional-context
    content: Review conditional then behavior on abrupt exits and define multi-branch condition metadata
    status: in_progress
  - id: uniform-loop-context
    content: Review .item and .index behavior for Boolean and unconditional loops
    status: completed
  - id: docs-consistency
    content: Reconcile current loop docs, examples, grammar, and decision ledger
    status: completed
  - id: next-foundation
    content: Review arithmetic fault boundaries: typed panic channel and typed else filters selected; exact triggers and target boundary remain open
    status: completed
plans:
  requires: []
  blocks: []
  parallel: []
---

# Agent Handoff: LiteScript language-design review

> **For the next agent.** Continue the documentation-led design review from the conditional zero-result context and unresolved tagged-return interaction; preserve user-selected rules, label proposals clearly, and do not implement a compiler.

## Mission

Continue LiteScript's type-safe scripting-language design in `docs/`. Resolve or explicitly preserve open contracts by comparing concrete examples and documenting their type/control-flow consequences. Keep the beginner-facing syntax simple, make typing strong by default, avoid null-like values, and treat small runtime/native performance as goals rather than measured results.

## Done

- Read the referenced design discussion and current repository state. The prior checkout was clean at `b1ca30d` before this review.
- The user asked to keep `return @tag value` completion semantics open and compare more cases. The comparison now covers no `then`, same-type `then` with effects, T-to-R transformation, a transfer to an outer loop, and a non-loop target in [`control-flow.md`](control-flow.md).
- The no-`then` search case shows that tagged-return candidates agree when `T = R`; its non-match path now uses the conditional's zero fallback.
- The user selected the loop no-contributor policy: T defaults to `Unit`, and an expected type can override it. A `then` result independent of `.value` determines R but leaves T at its default.
- Loop inference now distinguishes no-contributor paths from a circular `.value`-only contribution. With no `then`, the expected loop type constrains T; with `then`, the expected final type R reaches T only through a `.value` dependency. An independent `then` result determines R while a no-contributor T defaults to `Unit`. Full operator, generic, and targeted-result-only inference details remain open in [`loop-type-inference.md`](loop-type-inference.md).
- Every conditional has a typed result initialized to zero; without a final `else`, no match returns zero(T). The search example therefore has no trailing `continue`; its unmatched `if` contributes `Option<User>.None` to the loop. The user selected a post-selection `then` that receives the branch/zero result T and produces final R; read-only `@tag.value` is available only inside that `then`. Untagged conditionals do not participate in leading-dot lookup, and ambiguous leading-dot metadata reads are rejected instead of falling through to an outer context.
- The user selected the conditional no-contributor default: when no normally completing arm constrains T, it defaults to `Unit`, and an expected type can override it.
- The conditional review records a key interaction: a branch result flows to its parent expression. If the `if` ends a loop body, the loop commits that result. This fallback is a real branch value, not loop skip behavior; a false `if` can replace an earlier accumulator with zero. Conditional `then` and its `@tag.value` read phase are selected; whether tagged returns, propagated errors, or panics enter or bypass it remains open. `finally` still means lifecycle cleanup in the separate deferred review.
- The tagged-return comparison now includes conditional targets: with `T = R`, direct result and T-input completion can return the same value but differ in `then` effects; with `T != R`, the payload must satisfy either final `R` or pre-then `T`. Both remain candidates in [`control-flow.md`](control-flow.md); no return behavior is selected.
- The user selected the uniform loop-item interface: active-body `.item` is `Unit` for Boolean and unconditional loops. If no body ran, `then` exposes typed zero placeholders for `.item` and `.index == 0`, with `.count == 0` distinguishing them. Source/condition evaluation still cannot read an item before a body entry.
- Since `Unit` has one inhabitant, the selected all-zero-valid rule makes `zero(Unit) = Unit`. The user proposes zero-sized physical representation; physical layout and foreign ABI lowering remain separate open details.
- Steps 4 and 5 reconciled the loop metadata choices with current examples, grammar, decision ledger, and historical receiver pages. A local-link scan found no missing targets across the README and documentation pages.
- Corrected the historical loop-recovery note so it no longer presents tagged-return bypass or all-exit cleanup as selected in [`loop-recovery.md`](loop-recovery.md).
- The typed-filter recovery contract was reconciled and committed atomically as `eb41ba5`; the current checkout was clean before the loop-inference follow-up.

## Plan links

| Relation | Plan / file |
|----------|-------------|
| Source of truth | [`decisions-and-open-questions.md`](decisions-and-open-questions.md) |
| Loop contract | [`loop-value.md`](loop-value.md), [`loop-type-inference.md`](loop-type-inference.md), [`loop-completion.md`](loop-completion.md), [`control-flow.md`](control-flow.md) |
| Examples and deferred scope | [`loop-examples.md`](loop-examples.md), [`loop-recovery.md`](loop-recovery.md), [`deferred-cleanup-and-resources.md`](deferred-cleanup-and-resources.md) |

## Read first

- [`README.md`](README.md) — document status and reading order.
- [`decisions-and-open-questions.md`](decisions-and-open-questions.md) — current selected rules and priority open contracts.
- [`control-flow.md`](control-flow.md) — tagged-return comparison and selected break distinctions.
- [`conditionals.md`](conditionals.md) and [`tags-and-contexts.md`](tags-and-contexts.md) — selected conditional result/zero rules and `then` read phase, with abrupt exits and multi-branch `.condition` metadata still open.
- [`loop-value.md`](loop-value.md) and [`loop-type-inference.md`](loop-type-inference.md) — T/R inference questions.
- [`zero-initialization.md`](zero-initialization.md) — selected all-zero-valid-value direction and unresolved mappings.
- [`deferred-cleanup-and-resources.md`](deferred-cleanup-and-resources.md) — lifecycle topics explicitly deferred for a joint review.

---

## Implementation order

### Step 1 — tagged-return

**Depends on:** none

**Files:** review [`control-flow.md`](control-flow.md), [`loop-completion.md`](loop-completion.md), [`loop-type-inference.md`](loop-type-inference.md), [`loop-examples.md`](loop-examples.md), and [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Keep the behavior unresolved while comparing realistic searches, observable `then` effects, `then` transformations from body type T to result type R, nested transfers to an outer loop, and targets that are not loops.
- Distinguish direct-result semantics (payload has R and skips `then`) from completion-directed semantics (payload has T, commits `.value`, and lets `then` produce R).
- Compare whether a third spelling, such as a labeled contribution-bearing break, would make the distinction clearer; do not add it without an explicit selection.
- Keep `then` as ordinary completion, not an all-exit cleanup guarantee. Leave cleanup, `defer`, and scoped resource behavior in their deferred review.
- Ask the user only when the cases expose a genuine design choice; do not silently select a model.

**Acceptance:**

- The selected behavior, if any, is recorded with its payload type and `then` behavior; otherwise the uncertainty and missing decision are explicit in both the relevant concept page and the ledger.
- Examples do not claim incompatible loop result types or cleanup guarantees.

### Step 2 — loop-inference

**Depends on:** step 1

**Files:** [`loop-value.md`](loop-value.md), [`loop-type-inference.md`](loop-type-inference.md), [`loop-completion.md`](loop-completion.md), [`loop-examples.md`](loop-examples.md), [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Define body contribution type T independently from final loop result R.
- Work examples for source exhaustion, zero entries, all-skipped entries, `Unit` action bodies, `.value`-only bodies, and targeted-result-only searches.
- Distinguish noncontributing `continue`/bare `break` paths from normally completing `Unit` tails and zero-valued conditional fallbacks.
- Explain how expected destination types constrain `.value` and T/R without circular inference or accidental nested optional types.
- Apply the selected no-contributor rule: T defaults to `Unit` when no path contributes and no expression constrains `.value`; an expected type can override it. Keep `then`'s independent R from pretending to infer T.
- Preserve the selected zero-initialized `.value` direction and avoid restoring the retired automatic `Option` accumulator or `value_or` requirement.

**Acceptance:**

- The inference rules cover empty and non-empty paths consistently, including the interaction with `then` and the tagged-return rule from Step 1.
- Any unresolved cases remain named rather than hidden in examples.

### Step 3 — conditional-context

**Depends on:** loop-inference

**Files:** [`conditionals.md`](conditionals.md), [`tags-and-contexts.md`](tags-and-contexts.md), [`pattern-contexts.md`](pattern-contexts.md), [`control-flow.md`](control-flow.md), [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Preserve the selected rule: every conditional has a result context, optionally named by `@tag`, with a typed zero-initialized result. Its attached `then` transforms T to final R, and read-only `@tag.value` is available only inside that block.
- Compare simple false conditions, pattern mismatch, guarded `else if` chains, explicit final `else`, `Option<T>` zero, Unit action bodies, and branches that exit abruptly.
- Keep the no-match zero result distinct from `continue`; show that a final unmatched conditional in a loop body can overwrite its accumulator.
- Preserve the selected `.value` type default: if no normally completing arm constrains T, it defaults to `Unit`, overridable by an expected type. Keep the expected-type and missing-`else` fallback rules coherent.
- Preserve the selected explicit-tag lookup rule: conditional `.value` requires `@tag.value` and is readable only inside the attached `then`; untagged conditional contexts do not participate in leading-dot lookup, and ambiguous leading-dot metadata reads are rejected without outward fallback. Use an explicit outer-loop tag inside a conditional.
- Keep conditional tagged-return candidates open: compare the `T = R` effect case and the `T != R` payload-type case, and retain the open question about a loop exited on the way to an outer conditional. Do not assert implementation behavior; no parser or interpreter is present in this checkout. Treat propagated errors and panics as separate transfer cases. Reserve `finally` for cleanup. Define how `.condition` represents an `else if` chain without claiming that unevaluated conditions were false.

**Acceptance:**

- The normal result, unmatched path, expected type, explicit `else`, and context field availability have one coherent contract.
- The selected `then` transforms the branch/zero result T to R, and conditional `@tag.value` is inaccessible outside that block.
- Tagged-return documentation distinguishes T-input completion from direct R results through observable effects and payload types, while preserving the unresolved status.
- Examples distinguish conditional zero fallback from skipped loop contributions and do not imply automatic `Option` wrapping.

### Step 4 — uniform-loop-context

**Depends on:** step 2

**Files:** [`loops.md`](loops.md), [`loop-receivers.md`](loop-receivers.md), [`loop-examples.md`](loop-examples.md), [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Review the supported uniform `.item`/`.index` interface for iterable, Boolean, and unconditional loops.
- Honor the user's interest in a uniform interface for generalization and code mobility; compare how that works when a Boolean or unconditional source has no natural item.
- Preserve the selected `Unit` item in Boolean/unconditional active bodies; do not reopen the omitted-item or Boolean-guard alternatives without new evidence.
- Preserve zero placeholders in `then` after zero entries: `.item` is zero of the loop's item type (`Unit` in source-less modes), `.index` is 0, and `.count == 0` distinguishes them. These placeholders do not invent an actual iteration or source element.
- State the zero-based iteration-position meaning of `.index`, its availability by phase, and how it relates to `.count`.
- Keep the zero placeholder distinct from an actual item or iteration: `.count == 0` is authoritative after empty completion.

**Acceptance:**

- All loop modes have clear field availability and empty-loop behavior, with examples matching the decision ledger.

### Step 5 — docs-consistency

**Depends on:** steps 1–4
**Files:** loop-related pages under [`docs/`](.) and [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Search for retired receiver lists, `.acc`, automatic `Option` accumulation, old `then(receiver)` forms, tagged-return bypass claims, and cleanup guarantees accidentally attached to `then`.
- Keep historical examples labeled as historical and link them to the current contract.
- Check local Markdown links and ensure the README reading order points to the current source-of-truth pages.

**Acceptance:**

- No current-facing page contradicts a selected rule or presents an unresolved proposal as settled.
- Local Markdown links resolve, and no test/build run is needed for this documentation-only handoff.

### Step 6 — arithmetic-fault-boundaries

**Depends on:** step 5
**Files:** [`decisions-and-open-questions.md`](decisions-and-open-questions.md) and the chosen foundation pages

**Actions:**

- Review the user's selected policy that basic arithmetic faults use typed panics, not returned `Result` errors, and matching panic types can be recovered with target-level typed `else` filters.
- Define the scope of “basic arithmetic fault” against fixed-width overflow, integer division, remainder, and floating-point edge cases. Keep normal non-finite floating-point values distinct from faults until their contract is selected.
- Define target behavior when a typed filter matches or misses: unmatched panics propagate implicitly, while remaining returned errors require explicit handling or postfix `!`. Preserve explicit `Result` handling for declared function errors and the existing concise arithmetic goal.
- Save selected policy and remaining questions in the ledger and a focused concept page; do not start compiler implementation from a planning discussion.

**Acceptance:**

- The review keeps exact arithmetic fault cases and target boundaries open while preserving the selected typed panic channel, typed filter behavior, and channel-specific default for unmatched failures.

## Do not change

| Area | Reason |
|------|--------|
| Compiler/runtime implementation | The language remains in planning; this handoff is documentation and design review only. |
| [`deferred-cleanup-and-resources.md`](deferred-cleanup-and-resources.md) scope | Body-wide sections, `defer`, `using`-like resource management, and exit cleanup are explicitly deferred to one joint lifecycle review. |

## Acceptance criteria (overall)

- Every user-selected rule remains labeled selected and every proposal/open question remains visibly provisional.
- Loop body type T, final result R, `.value`, completion, and abrupt exits form one coherent contract.
- The next agent can continue from the linked docs without reconstructing the referenced chat.

## Key project facts

| Item | Value |
|------|-------|
| Project stage | Design documents only; no compiler implementation is implied. |
| Loop header | One optional item name (`as item`); receiver lists and header destructuring are retired. |
| Loop context | `.item`, `.index`, `.count`, `.value`; source-less active `.item` is `Unit`; zero-entry `then` has typed zero `.item`, `.index == 0`, and `.count == 0`. |
| Unit | One inhabitant and `zero(Unit) = Unit` follow the selected rules; the user proposes zero-sized physical storage. ABI lowering remains open. |
| Loop completion | A single receiverless `then` is the selected direction; `.count` and `.value` come from the owning loop context. |
| Loop value | Typed, zero-initialized `.value`; no-contributor T defaults to Unit unless an expected type overrides it; automatic Option accumulator and `.acc`/previous receivers are retired. |
| Conditional value | Every `if` has a result context; absent final `else` returns zero(T) on no-match; unconstrained T defaults to Unit unless an expected type overrides it. A shared conditional `then` transforms T to final R, and tagged `.value` is readable only there. Abrupt-exit behavior and multi-branch `.condition` metadata remain open. |
| Exits | Plain `continue`, `continue value`, `break`, and `break value` have distinct recorded rules; tagged-return interaction with `then` remains open. |
| Initialization | All-zero storage is selected as a valid value for every type; exact mappings remain open. |
| Lifecycle | Body-wide recovery, `defer`, resource scopes, and cleanup ordering are deferred. |

## Constraints

- Preserve simple, explicit syntax and strong static contracts; do not use null/undefined as an implicit absence model.
- Do not promote a suggestion to a selected rule without user confirmation.
- Keep any performance statement as a goal until measured.
- Avoid broad rewrites of unrelated design pages.
