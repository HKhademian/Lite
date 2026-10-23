---
name: litescript-language-design-review
status: in_progress
created: 2026-10-19
todos:
  - id: tagged-return
    content: Record selected target completion and target-only then execution; keep failure transfer separate
    status: completed
  - id: loop-inference
    content: Formalize loop body type T, result type R, and zero-initialized .value inference
    status: completed
  - id: conditional-context
    content: Review conditional then behavior on abrupt exits; keep condition metadata hidden
    status: completed
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

> **For the next agent.** Continue the documentation-led design review from the selected tagged-return rule and remaining error/panic and multi-branch metadata questions; preserve user-selected rules, label proposals clearly, and do not implement a compiler.

## Mission

Continue LiteScript's type-safe scripting-language design in `docs/`. Resolve or explicitly preserve open contracts by comparing concrete examples and documenting their type/control-flow consequences. Keep the beginner-facing syntax simple, make typing strong by default, avoid null-like values, and treat small runtime/native performance as goals rather than measured results.

## Done

- Read the referenced design discussion and current repository state. The prior checkout was clean at `b1ca30d` before this review.
- After comparing same-target and outer-target cases, the user selected that a tagged return supplies T to its named target and runs that target's then; inner constructs exited on the way skip their own then. The examples and type consequences are recorded in control-flow.md.
- The no-then search case demonstrates that the payload supplies T and, without a then, T is also the loop result; the non-match path uses the conditional zero fallback.
- The user selected the loop no-contributor policy: T defaults to `Unit`, and an expected type can override it. A `then` result independent of `.value` determines R but leaves T at its default.
- Loop inference now distinguishes no-contributor paths from a circular `.value`-only contribution. With no `then`, the expected loop type constrains T; with `then`, the expected final type R reaches T only through a `.value` dependency. An independent `then` result determines R while a no-contributor T defaults to `Unit`. Full operator, generic, and targeted-result-only inference details remain open in [`loop-type-inference.md`](loop-type-inference.md).
- Every conditional has a typed result initialized to zero; without a final `else`, no match returns zero(T). The search example therefore has no trailing `continue`; its unmatched `if` contributes `Option<User>.None` to the loop. The user selected a post-selection `then` that receives the branch/zero result T and produces final R; read-only `@tag.value` is available only inside that `then`. Untagged conditionals do not participate in leading-dot lookup, and ambiguous leading-dot metadata reads are rejected instead of falling through to an outer context.
- The user selected the conditional no-contributor default: when no normally completing arm constrains T, it defaults to `Unit`, and an expected type can override it.
- The conditional review records a key interaction: a branch result flows to its parent expression. If the if ends a loop body, the loop commits that result. This fallback is a real branch value, not loop skip behavior; a false if can replace an earlier accumulator with zero. Conditional then and its @tag.value read phase are selected, and condition metadata is hidden. Normal completion and a return targeting the conditional supply T and run its then; a return to an outer target skips it. Propagated errors and unhandled panics provide no conditional result and skip result processing. Language-managed panic propagation runs applicable exited-scope `finally` blocks before an outer matching handler; attachment and failure details remain in the lifecycle review.
- Tagged return to a conditional supplies its T and runs its then, producing R; a return to an outer target skips the conditional's then. The nested loop example records this target-only rule in [control-flow.md](control-flow.md).
- Failure paths are compared separately: a local handler that completes a branch with `T` feeds conditional `then`; `!` forwarding and an unhandled panic provide no conditional result. Language-managed panic unwinding runs exited-scope `finally` blocks before an outer matching handler; hard aborts remain open.
- The user selected cleanup-only `finally`, with no receiver, recovery, or transformation. When a loop/conditional has both hooks on normal completion, `then` finishes before `finally` cleanup, which preserves the pending result. On exits that skip `then`, applicable cleanup still runs as the scope is left. A matching typed-panic handler recovers before its own scope's `finally`; during propagation toward an outer matching handler, exited inner scopes run `finally` inner-to-outer first. Cleanup failure preserves any already pending failure as primary and retains cleanup failures as secondary; otherwise the first cleanup failure cancels normal completion. Typed recovery filters consume matching aggregate members in declaration order; if all are consumed and handlers complete normally, the last matching handler's value is the recovered result. Exact attachment scope, no-handler policy, hard-abort behavior, aggregate representation, and duplicate-member handling remain open.
- The user selected the uniform loop-item interface: active-body `.item` is `Unit` for Boolean and unconditional loops. If no body ran, `then` exposes typed zero placeholders for `.item` and `.index == 0`, with `.count == 0` distinguishing them. Source/condition evaluation still cannot read an item before a body entry.
- Since `Unit` has one inhabitant, the selected all-zero-valid rule makes `zero(Unit) = Unit`. The user selected zero-sized physical representation on 2026-10-22; Unit alignment and foreign ABI lowering remain open.
- Result zero is selected: `zero(T ! E) = .ok(zero(T))`. It applies to stored outcomes and conditional/loop zero values, preserving nested Result layers. A zero-initialized callable also has selected behavior: no user-body work and a zero result, with ordinary argument evaluation and required cleanup preserved. It makes no updates through `mut`/`var` grants. Callable grammar, ownership/cleanup details, representation, and ABI remain open.
- Steps 4 and 5 reconciled the loop metadata choices with current examples, grammar, decision ledger, and historical receiver pages. A local-link scan found no missing targets across the README and documentation pages.
- Updated the historical loop-recovery note to reflect selected target-only then execution while keeping cleanup rules deferred in [loop-recovery.md](loop-recovery.md).
- The typed-filter recovery contract was reconciled and committed atomically as `eb41ba5`; the current checkout was clean before the loop-inference follow-up.

- Recovery chains are nested expressions: each later `else` can catch a matching failure raised by an earlier handler, which is outside its own recovery boundary. The staged assignments show Result type changes; actual separate statements cannot catch a panic from an earlier statement. Chained outer recovery is active during inner evaluation. A new handler failure preserves and joins an existing remainder: consuming A from A+B and failing with C leaves B+C. A later B recovery leaves C outward despite producing a recovery value. The aggregate carrier and duplicate-member policy remain open, and explicit Result handling / function-targeted `!` are unchanged.

- Explicit function-type syntax and literal reassignment are selected: `var myfn: fn(a: Int): Int!;` starts as the zero callable and `myfn = fn(a: Int): Int! { a + 1 };` replaces it. The result annotation belongs to the callable, so this example returns `Int ! Error`. Broader callable compatibility, captures, and complete grammar remain open. See [functions](functions.md#function-types-literals-and-reassignment).

- Superseded argument rule: automatic zero when no parameter default is written is no longer selected. All argument omission now requires an applicable explicitly declared default; without one, even myfn() for a: Int is rejected. Examples use myfn(0). Default grammar, timing/scope, signature/implementation placement, and caller-access permissions remain open. See [functions](functions.md#omitted-value-arguments).

- The user requested modern reference-language solutions. [Functions](functions.md#compact-implementations-under-review) records official Rust, V, Odin, and Zig sources checked on 2026-10-20, then compares arrows, contextual `fn`, parameter-list blocks, signature-inherited names, and pipes. The intermediate contextual `fn` was subsequently retired as redundant with lambdas. V's documented pipe lambdas are callback-only, unlike Rust's assignment-capable form. Keep this choice separate from omitted-argument default initialization.

- The current [two function forms](functions.md#two-scenarios-full-definition-and-contextual-implementation) are independently typed full `fn` definitions and contextual `(parameters) { body }` lambdas. Retire the redundant `fn(a) { ... }` shorthand. Both retained forms permit optional trailing item semicolons. A separate signature-only declaration is optional; full initializers can establish the expected contract. Local lambda result inference is selected below; unknown-input and recursive result inference remain open.

- Complete the grammar for the current [arrow-free lambda direction](functions.md#c-arrow-free-lambda-parameter-list-followed-by-a-block-current-direction): expression-position reservation, explicit header/body boundaries for `if`/`loop` and other owning constructs, and no competing `(T) { ... }` grouped-type record construction. Direct lambda-body assignments permit optional trailing semicolons; callback bodies do not terminate enclosing calls. Callable/environment context design is postponed; complete ordinary lambda grammar remains open.

- Selected [empty contextual lambda headers](functions.md#named-underscore-and-empty-headers): `x = () { "replacement" }` retains `x`'s full expected signature, including any inputs, but binds no inputs locally. `(a)` and `(_)` bind the expected input as ordinary readable local names, with `_` permitting nonuse. Preserve normal call input evaluation, permissions, and cleanup. Empty local bindings do not mean a zero-parameter signature; nonempty positional prefixes are also selected; unknown-input and recursive result inference remain open.

- Selected [optional lambda signatures](functions.md#optional-lambda-signatures): `(n: Int): Int { ... }` and independently optional annotations under context, with fully annotated named inputs/results providing an independent signature. Retain contextual empty-header semantics; independent empty headers declare zero inputs; unknown-input and recursive result inference remain open. Typed lambdas overlap with full `fn` syntax; no removal of that form is selected.

- **Context design postponed at the user's request, 2026-10-21.** Preserve [the pinned ideas](deferred-contexts.md): environment context such as allocators, explicit captures, context in signatures, caller-supplied context versus private stored state, and lifetime alternatives. Earlier capture choices are deferred design history, not current language requirements. The previous caller-context clarification is parked too. Keep existing fn/lambda syntax and optional annotations; resume context design on explicit request.

- Subsequent conceptual clarification separates [public context requirements from implementation captures](deferred-contexts.md#public-signature-and-private-implementation). Callers supply declared dependencies; a closure's captured names/state can remain private and already bound. Supersede the earlier claim that every capture field belongs in the public callable signature. Concrete closure types, representations, and safety constraints still need future design. This clarification does not resume feature implementation.

- Selected [independent empty-header lambdas](functions.md#empty-headers-without-an-expected-callable): zero inputs for `(): Int { 42 }` without an expected callable; preserve all expected inputs when a signature exists. Requiring an expected callable every time was not chosen. Keep local result inference, callable conversions, and deferred context topics separate.

- Selected [partially named lambda inputs](functions.md#partially-named-input-headers): bind a positional prefix of expected inputs and omit trailing names. Use underscore bindings for earlier positions when naming a later input. Reject more header positions than expected inputs; preserve the complete expected signature and argument evaluation/permission/passing/cleanup contracts. Keep stored-callable conversion and deferred context work separate.

- Selected [independent lambda result inference](functions.md#independent-lambda-result-inference): infer an unambiguous nonrecursive local result from the body when input types are already known. `(n: Int) { n * 2 }`, `() { 42 }`, and `() {}` infer Int/Int/Unit. Require an annotation for ambiguous results. Keep explicit error contracts, recursive/public signature policy, unknown-input inference, and deferred context work separate.

- Selected [mixed local result types](functions.md#mixed-local-result-types): infer the normalized plain union of completion payloads for nonrecursive local lambdas with known inputs and no explicit/expected result contract. An Int return plus a String tail infers Int | String. Explicit/expected result contracts remain enforced; escaping errors are never silently added. Conditional/match joins are now separately selected. Keep recursive inference and deferred context work separate.

- Selected [conditional and match result inference](branch-result-inference.md): infer normalized unions of normally completing results without an expected contract, matching selected local-lambda completion inference. Keep explicit result/error contracts, missing-else zero semantics, real Unit alternatives, then T/R separation, and exhaustiveness. Multi-member union zero needs a separate contract; do not use branch/member order to choose it.

- Selected [plain-union zero membership](union-zero.md#selected-membership-of-union-zero): zero(A | B) must be zero of exactly one listed member. The user rejects none-of-the-members as invalid. Zero metadata therefore identifies A or B; exact selection remains open. Do not claim A, B, first-written-member, or a hidden nil state without a member-selection rule. Keep universal zero, exhaustive matching, order-independent identity, and Option/Result mappings intact.

- Latest clarification resolves storage: [metadata plus overlapping payload](union-zero.md#current-storage-model). Max-member size is payload capacity, with metadata and alignment/padding in the full value. Type tests retain member identity; no need to revisit that guarantee. Zero initialization clears metadata too, so the remaining semantic question is which listed member zero metadata denotes. Exact encoding/ABI and optimizations remain open.

- The user requested modern references for this model. [Union storage comparison](union-storage-reference-comparison.md) records official Rust/Zig/Odin/V/C++ contracts checked 2026-10-21. Rust repr(C) payload enums explicitly use a tag-plus-payload-union struct. Distinguish logical tagged semantics from stable layout, and default construction from bytewise zero. V concrete sum-type layout/default-zero encoding was not established by the inspected public docs; no measurements or layout tests were run.

- The user requested [zero-member possibilities](union-zero.md#member-selection-possibilities-open-review): first-written member, canonical normalized-type order, or explicit designation. The user selected exploring canonical order to retain current order independence and inferred unions without annotations. The next review should compare concrete ordering rules; no primitive priority, Unit preference, stable nominal-type key, or complete algorithm is selected. Explain identity/fallback costs of the other choices and that value-preserving widening need not preserve an all-zero encoding. No new syntax or public zeroOf API is selected.

- Next concrete review: [Unit priority](union-zero.md#unit-priority-open-review). Recommend zero(Int | Unit) and reordered equivalents select Unit, only when Unit is an explicitly listed normalized member. No choice selected. This does not add Unit, unwrap Option/Result, pick zero(Int | String), or alter value-preserving widening. C++ monostate and Rust unit-variant defaults are comparisons with different selection/initialization contracts.

- The user answered Unit priority with "Keep open; compare more cases." The [case expansion](union-zero.md#more-unit-priority-cases-requested-by-the-user) compares Unit-first against indicated payload-first orders. Key observable difference: a typed union declaration initialized by contextual 0 can become Unit, while an existing Int-zero value admitted into that union stays Int. Compare missing-else fallbacks, Option/Result alternatives, newly added Unit, and nominal empty records. No new priority is selected; do not repeatedly ask the same binary choice before addressing these tradeoffs.

- Latest user proposal reopens the foundation: [tag-zero empty unions](union-empty-zero-proposal.md), with neither A nor B tests matching zero. Treat as an exploratory alternative, not accepted migration. It is coherent if empty is a valid initialized union state, but changes exhaustive matching, negative narrowing, direct operations, cleanup, explicit Unit/Option/Result distinctions, and singleton normalization. Successful narrowing observes an existing member; it does not choose one. Compare this proposal before continuing canonical zero-member ranking.

- Latest proposals are [union construction and omitted initialization](union-initialization-policy.md): choose source-leftmost on creation, require explicit initializer or = ?, or default union locals to uninitialized storage. Treat as alternatives under review. Correct the earlier overstatement: source-directed construction can create different members of the same order-independent type, but may write nonzero metadata instead of producing a whole all-zero value. Parameter admission preserves a supplied member; omitted arguments are fresh construction. An uninitialized type test is a compile error, not false. After definite initialization, member-only A/B coverage is exhaustive. Keep bare-declaration policy separate from zero(A | B), recursive zero, and implicit-zero result sites.

- Latest selected change: [reject x: A | B = 0](union-initialization-policy.md#selected-rejection-and-explicit-member-choice) as ambiguous for a normalized multi-member union, including aliases and unions listing Int. The user proposes = ?, = expr, A{0}/B{0}, and A{}/B{}. Reservation and initialized expression admission already fit existing rules; A{} applies declared defaults for a valid record member. Treat A{0} as proposed whole-member-zero grammar, not a selected positional field list or automatic whole-wrapper memzero. Bare multi-member union locals now require an initializer or explicit = ?; implicit/recursive union-zero sites remain unresolved; no silent canonical/leftmost selection or empty-state adoption.

- Selected [bare local union declaration policy](union-initialization-policy.md#bare-local-declarations): reject x: A | B without an initializer, requiring an initialized compatible expression or existing = ?. Default-uninitialized omission was not chosen. Apply after alias resolution/normalization; explicitly reserved values obey definite-initialization rules. Keep parameters/fields/globals, constructor grammar, and implicit zero-result sites separate.

- Selected [missing conditional else with union T](conditional-union-fallback.md): require an explicit fallback for normally reachable unmatched multi-member union completion; preserve single-type zero. Exhaustive conditional chains construct the chosen member without a prerequisite undirected union-zero value, since their metadata is hidden until then. Conditional then receives valid T and cannot repair an absent T after the fact. A wider destination alone is not the criterion: check resolved T. Loop state, arguments, callable zero, and aggregate fields remain separate pending sites.

- Selected broader answer to the [argument-omission review](union-parameter-defaults.md): omission is always rejected unless an applicable default is explicitly declared, for every parameter type. Remove the earlier Int/Unit automatic-zero fallback; unused/unnamed lambda inputs and zero callables still require supplied/defaulted valid arguments. A zero-input signature still accepts (). Keep default syntax/timing/placement, caller-access permissions, record-field defaults, local initialization, loops, and zero-callable results separate.

## Plan links

| Relation | Plan / file |
|----------|-------------|
| Source of truth | [`decisions-and-open-questions.md`](decisions-and-open-questions.md) |
| Loop contract | [`loop-value.md`](loop-value.md), [`loop-type-inference.md`](loop-type-inference.md), [`loop-completion.md`](loop-completion.md), [`control-flow.md`](control-flow.md) |
| Examples and deferred scope | [`loop-examples.md`](loop-examples.md), [`loop-recovery.md`](loop-recovery.md), [`deferred-cleanup-and-resources.md`](deferred-cleanup-and-resources.md) |

## Read first

- [`white-paper.md`](white-paper.md) — foundational philosophy: readable source, little ceremony, useful defaults, explicit consequential behavior, and efficient implementation goals for people and programming agents.
- [`README.md`](README.md) — document status and reading order.
- [`decisions-and-open-questions.md`](decisions-and-open-questions.md) — current selected rules and priority open contracts.
- [control-flow.md](control-flow.md) — selected tagged-return completion and loop exits.
- [`conditionals.md`](conditionals.md) and [`tags-and-contexts.md`](tags-and-contexts.md) — selected conditional result/zero rules, hidden condition metadata, `then` behavior, cleanup-only `finally` ordering, and cleanup-failure precedence; exact cleanup attachment scope and aggregate handling remain open.
- [`loop-value.md`](loop-value.md) and [`loop-type-inference.md`](loop-type-inference.md) — T/R inference questions.
- [`zero-initialization.md`](zero-initialization.md) — selected all-zero-valid-value direction and unresolved mappings.
- [`deferred-cleanup-and-resources.md`](deferred-cleanup-and-resources.md) — lifecycle topics explicitly deferred for a joint review.

---

## Implementation order

### Step 1 — tagged-return (selected)

**Depends on:** none

**Files:** review [`control-flow.md`](control-flow.md), [`loop-completion.md`](loop-completion.md), [`loop-type-inference.md`](loop-type-inference.md), [`loop-examples.md`](loop-examples.md), and [`decisions-and-open-questions.md`](decisions-and-open-questions.md)

**Actions:**

- Apply the selected contract: a tagged-return payload has type T, reaches the named target's pre-then value, and runs that target's then to produce R when present.
- A return to an outer target skips then blocks on inner constructs it exits; a target without then returns T directly.
- Keep explicit loop targeting for break and continue; either operation without a tag targets the nearest loop. Both accept an optional T contribution, committed to the selected loop before stopping or advancing.
- Keep operation support sparse: break/continue target loops; tagged return can target loops, ifs, general result blocks, or functions; plain return targets the nearest function/closure. Reject unsupported operation–target pairs.
- Keep `then` as ordinary result processing. For loop/conditional hooks, `finally` follows `then` and handles cleanup only. Cleanup failures preserve any already pending failure as primary, retaining cleanup failures as secondary; otherwise the first cleanup failure cancels normal completion. Exact attachment scope and aggregate handling remain under review. Body-wide cleanup sections, `defer`, and scoped resource behavior stay in their deferred review.
- Keep propagated-error, panic-unwinding, and cleanup behavior separate; `then` is result processing and `finally` does not recover failures.

**Acceptance:**

- The selected payload type, target then behavior, and skipped intermediate then behavior are recorded in the concept pages and decision ledger.
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
- Apply the selected target-completion rule to conditional targets. Keep propagated errors and panics separate, do not assert implementation behavior, and reserve finally for cleanup. Preserve the choice to hide condition metadata; do not reevaluate conditions in then.

**Acceptance:**

- The normal result, unmatched path, expected type, explicit `else`, and context field availability have one coherent contract.
- The selected `then` transforms the branch/zero result T to R, and conditional `@tag.value` is inaccessible outside that block.
- No condition metadata is exposed for simple conditions or `else if` chains.
- Tagged-return documentation consistently states that the payload supplies T, the named target's then produces R when present, and exited inner then blocks are skipped.
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

- Search for retired receiver lists, `.acc`, automatic `Option` accumulation, old `then(receiver)` forms, stale tagged-return bypass claims, and cleanup guarantees accidentally attached to `then`.
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
| Unit | One inhabitant and `zero(Unit) = Unit` follow the selected rules; zero-sized physical storage was selected 2026-10-22. ABI lowering remains open. |
| Loop completion | A single receiverless `then` is the selected direction; `.count` and `.value` come from the owning loop context. |
| Loop value | Typed, zero-initialized `.value`; no-contributor T defaults to Unit unless an expected type overrides it; automatic Option accumulator and `.acc`/previous receivers are retired. |
| Conditional value | Every `if` has a result context; absent final `else` returns zero(T) on no-match; unconstrained T defaults to Unit unless an expected type overrides it. A shared conditional `then` transforms T to final R, and tagged `.value` is readable only there. Condition metadata is hidden. Normal completion and return to the conditional run `then`; outer-target returns and propagated errors/panics skip it. Applicable cleanup-only `finally` runs during scope exit, after `then` on normal completion; cleanup-failure precedence is selected, while attachment scope and aggregate handling remain open. |
| Exits | Plain `continue`, `continue value`, `continue @tag [value]`, `break`, `break value`, and `break @tag [value]` target the nearest or explicitly named loop. Contributions commit to that loop before advancing/stopping. Tagged return also targets ifs, general result blocks, or functions; plain return targets the nearest function. Tagged returns run only the named target's `then`, and exited inner constructs skip theirs. |
| Initialization | All-zero storage is selected as a valid value for every type; exact mappings remain open. |
| Lifecycle | Construct cleanup precedence is selected; aggregate representation/inspection, body-wide recovery, `defer`, resource scopes, and their ordering remain open or deferred. |

## Constraints

Current scalar boundary reaffirmed, 2026-10-22: (T) remains grouped/scalar T; (T,) remains a one-component tuple in the user's schematic discussion notation. Actual values such as (42) and (42,) stay distinct. Treating the scalar as a tuple, identifying the types, or automatically using the singleton as T is deferred for future discussion. Keep the selected equal storage layouts without inferring scalar .0 access or implicit wrapping/unwrapping. See [current boundary](tuple-entries-and-access.md#current-scalar-boundary-and-deferred-equivalence).

Collection layout clarification, 2026-10-22: the [T] indexed-sequence type is a promise/API, not a concrete backing class. Its abstract contract has no single memory layout, which is different from a zero-sized concrete type. Determine layout from the actual provider or a separately selected erased representation. Do not impose a standard growable-list descriptor on every [T] input or confuse a type contract with an empty [] value. See [contract versus storage](indexed-sequence-contract.md#contract-versus-storage-layout).

Selected storage-layout contract, 2026-10-22: [empty and singleton tuples](memory-and-performance.md#empty-and-singleton-tuple-layout). Unit/() has zero payload bytes. A singleton, named or unnamed, has exactly the same size/alignment as its component, at offset zero, without wrapper metadata. Scalar and singleton static identities remain distinct. With identical erased payloads and no retained type information, runtime code cannot distinguish them; actual union alternatives still need the existing union discriminator. Layout equality does not automatically select ABI equality, aliasing, arbitrary reinterpretation, or implicit scalar/tuple conversion. No implementation measurement is claimed.

Tuple label rationale clarified, 2026-10-23: [labels describe positions](memory-and-performance.md#tuple-labels-describe-positions-without-changing-storage) without changing storage. Every slot has an implicit positional accessor; a label gives that same slot a semantic role. Identical ordered concrete storable component types retain the same size, alignment, and corresponding offsets regardless of labels, with no per-value strings, dictionary, tag, wrapper, or indirection for labels. Label-sensitive structural identity and compatibility remain selected. Int payloads named studentId and teacherId have distinct roles without a different physical payload layout. The dots in ...T1.T2.T3... are merely writing separators, not stored bytes or a packed-layout claim. There is no memory-layout rationale for requiring names at the end; interleaving is selected. Exact ABI, fixed-schema replacement compatibility, and ownership remain separate.

Selected call input shape unification, 2026-10-23: [call input shape](named-input-routing.md#call-input-shape-shorthand-and-spread-selected). A signature fixes typed declared slots. =name expands to name = name; explicit ...tuple processes tuple components in stored order, labeled ones by public parameter name and unnamed ones by the next unfilled declared slot. Positional/named inputs may interleave, explicitly confirmed by op(c = 3, 1, 2) filling c, a, b for fn(a, b, c). Repeated named inputs replace an earlier supplied value in the same declared slot. Every contribution fits that slot's type/access and evaluates once in written order; callee evaluates first and invocation waits for successful input preparation. Unknown/ambiguous labels, excess positions, and missing required inputs fail; remaining inputs require applicable declared defaults. op(tuple) stays one input; only op(...tuple) expands. No intermediate tuple allocation, runtime name dictionary, ABI change, implicit unwrap, or new mut/var permission is selected. Prefix/suffix ordering and duplicate-supplied-input rejection are superseded. Duplicate public labels remain invalid for named routing. Superseded-value cleanup/ownership, callable compatibility, collection call spread, and full parsing remain open. Historical finite-model counts describe the former algorithm and must not be reported as verification of this extension; no tests were run for it.

Selected tuple construction spread and insertion, 2026-10-23: [spread contract](tuple-spread-and-rest.md#tuple-construction-spread-selected) and [append-or-replace](tuple-spread-and-rest.md#append-or-replace-by-label-selected). Tuple-to-tuple spread requires statically known tuple operands, evaluates operands once in written order, and flattens only explicit spreads. (...empty) gives Unit/(), (...one) remains a singleton, (...pair) preserves both components. Other collection spread is a separate problem, not globally banned; no implicit scalar conversion or Option/Result unwrap is selected. For inferred construction, unnamed components and new labels append at the next free slot. A label collision involving spread replaces the slot where it first appeared, keeping that position and label; it does not add a slot or keep a hidden duplicate. The later user clarification requires unique explicit labels within each constructor, including =name shorthand, with nested operands validated independently. The final surviving contribution determines the inferred field type: (a = "3", ...(a = 1,)) yields (a = 1) with type (a: Int). Both (a = "3", a = 1) and (a = 3, a = 1) are errors. The user's (1, =c, ...(=a, 9, =b), a = new, 6) yields (1, =c, a = new, 9, =b, 6), with a at position 2. Named/unnamed components may interleave in values and corresponding stored type layouts; the earlier tuple prefix/suffix restriction is superseded, while duplicate explicit labels remain errors. All expressions still evaluate, including replaced contributors. Function calls now select fixed-signature input construction with next-unfilled positional routing, named replacement, shorthand, and explicit tuple spread; pattern duplicate-source checks remain unchanged. Expected-schema routing for newly allowed cases, fixed-schema replacement compatibility, and superseded-value cleanup/ownership remain separate. Whether the explicit-duplicate restriction also applies to calls is pending confirmation.

Selected tuple pattern shorthand, 2026-10-23: [= identifier](named-input-routing.md#same-name-tuple-pattern-shorthand-selected) expands to identifier = identifier. The user's (=fruit, =tea, =cake) := meal is entirely named selection, equivalent to the explicit clauses in that order; it binds fruit=30, tea=20, cake=10 for meal=(cake=10,tea=20,fruit=30). Source evaluates once, with no lexical-value or positional guessing. Allow explicit/shorthand named clauses together, a final rest, and a named singleton. Reject unknown/duplicate source selectors after expansion; require full coverage without rest. Shorthand requires one identifier. Ambiguous mappings must be rejected; existing ordered destination shadowing remains deterministic. The preceding positional-prefix/named-suffix pattern proposal remains open and was not adopted by this example.

Selected named selectors with rest, 2026-10-23: [named selector rest](tuple-spread-and-rest.md#named-selectors-with-rest-selected) removes chosen fields and captures all unselected components in source order, preserving labels and component types. Numeric positions restart at zero within rest. Selector order controls binding order, not remainder order. Evaluate the source once. Allow one final ...rest; reject unknown/duplicate source selectors. Without rest require complete field coverage. Mixed source tuples can retain unnamed components in rest; mixed positional/named selectors in one pattern remain separate. Existing zero/singleton remainder identity, declaration/conditional/match behavior, and ownership boundaries remain applicable.

Selected positional tuple rest, 2026-10-22: [one trailing ...rest](tuple-spread-and-rest.md#positional-tuple-rest-selected) preserves remaining component types and stored order as a tuple. Zero remaining components give Unit/(); one remains a singleton rather than a scalar. At most one capture, placed last. No rest means exact arity; rest never fills missing required components. Evaluate the source once and retain existing declaration/conditional/match mismatch rules. Remainder label preservation selected 2026-10-23: named/mixed source tuples keep remaining labels, types, and stored order; numeric positions restart at zero within rest. A named singleton keeps its label, and unnamed entries remain unnamed. Prefix binding names do not relabel the remainder. See [remainder labels](tuple-spread-and-rest.md#remainder-labels-selected). Named selector rest is now selected as described above. Rest-only tuple patterns are now selected: (...all) and (...all,) require tuple shape and capture the whole tuple, preserving component types, labels, and order. Unit/() qualifies; other scalars are rejected rather than implicitly wrapped. Evaluate the source once and preserve existing declaration/conditional/match rules. See [rest-only tuple patterns](tuple-spread-and-rest.md#rest-only-tuple-pattern-selected). Mixed positional/named selector patterns, list rest, copy/move/borrow, and simultaneous ownership remain separate. Basic construction spread is now selected separately; earlier-slot replacement and interleaved tuple value layouts are now selected.

Selected empty tuple pattern, 2026-10-22: [() matches only Unit](tuple-entries-and-access.md#empty-tuple-pattern-selected) and binds no names. Ordinary declarations require an irrefutable match; conditional/match contexts retain their mismatch rules. Evaluate the source once with effects, failures, and cleanup intact. A singleton containing Unit has a different shape despite equal zero-sized storage. No wildcard/discard meaning or new call/lambda header interpretation is introduced; positional tuple rest shape/placement/arity are now selected separately.

Selected singleton binding patterns, 2026-10-22: [grouping and extraction](tuple-entries-and-access.md#singleton-binding-patterns-selected). (pattern) groups and preserves the whole source; (pattern,) extracts one positional component; (local = label) extracts by name, with an optional trailing comma. In particular, (local) := one binds the whole tuple and (local,) := one extracts its component. Evaluate the source once and preserve existing coverage-without-rest and mismatch rules. Expected types do not select the parse. The empty tuple pattern () is now selected; complete recursive parsing and new loop/lambda header patterns remain separate. The [earlier proposals](tuple-entries-and-access.md#follow-up-proposals-and-scalar-versus-tuple-examples) retain the unresolved (label=) missing-value form for review; no-comma positional extraction was not selected. Singleton type syntax is now selected below.

Latest review requested, 2026-10-22: [empty/singleton tuples across contexts](tuple-entries-and-access.md#empty-and-singleton-review-across-contexts). The selected singleton value forms remain unchanged; Unit/empty identity and () as another value/type spelling are now selected. Singleton types and grouped/singleton binding patterns are now selected. The review covers types, patterns, calls, contextual lambdas, stored shape and ABI, zero/default/reserved initialization, union/Option/Result boundaries, generic spread/rest, diagnostics, and all twelve reference languages plus C#. Selected singleton types: (T) groups, (:T,) is an unnamed singleton, (label: T) is a named singleton with an optional trailing comma, and (label,) infers the named component type from static evidence. Reject (:T), even though the colon could identify tuple shape: the unnamed singleton comma is required consistently across values, types, and patterns. Do not let expected types or name lookup choose the parse. See the [selected type boundary](tuple-entries-and-access.md#2-singleton-type-boundary-selected). Preserve explicit call arity and defaults even for Unit arguments.

Selected tuple value shorthand and access, 2026-10-21: (= cake, = tea) expands to (cake = cake, tea = tea). Bare (cake, tea) remains an unnamed value tuple without an expected named destination. Both named and unnamed tuples support fixed zero-based .0/.1 access in stored order; invalid positions are compile-time errors. Known named destinations still accept positional initializers. Tuple pattern shorthand was selected separately on 2026-10-23; same-name call shorthand is now selected separately; record shorthand remains separate. Later selection, 2026-10-22: runtime variable tuple indexing is rejected, even for homogeneous tuples. Identifier dot access denotes the literal field name, not variable substitution. Mixed tuples with an unnamed prefix and named suffix are selected, including standalone inference and the corresponding type components: (42, = tea) infers (:Int, tea: String) when tea is String. Numeric access covers both positions; .tea selects only the labeled component. Singleton values are selected: (value) groups, (value,) constructs an unnamed singleton, and named (= value) or (label = expression) entries construct a singleton with an optional trailing comma. Expected types do not change those parses. The empty tuple is now Unit, also spelled (). Complete recursive type/pattern integration, expected-schema routing for newly interleaved/repeated-label constructors, exact numeric-suffix scanning (notably pair.0.1 versus decimal tokens), computed compile-time position syntax, numeric writes, and intact stored named/unnamed conversions remain open. See [tuple entries and access](tuple-entries-and-access.md).

Latest review, 2026-10-21: [named arguments and named tuples](named-arguments-and-tuples.md). The user selected op(1,2,3), op(a=1,b=2,c=3), and op(1,2,c=3) for the same simple-parameter signature; no extra named-parameter marker is required. All omissions still require declared defaults. Fresh named initializer reordering and explicit reconstruction for differently ordered stored tuples are now selected, with source-order execution preserved. Named suffix permutations, positional-prefix routing, static invalid-input checks, all four contextual two-field tuple construction forms, and named tuple patterns are now selected. The clarified typed binding is (left, right): (l: Int, r: Int) = expr; := infers the source contract. Named tuple patterns use destination = sourceField with complete coverage when rest is absent and no unknown/duplicate source selectors. Named selector rest captures every unselected component in source order, preserving labels and types. The user also selected label-sensitive stored tuple compatibility: different labels require explicit reconstruction even when positional types agree, for assignment and tuple-valued inputs. Positional destructuring remains valid. Structural tuple identity is now selected: the same ordered labels and resolved component types describe the same tuple type wherever written; separate record declarations remain nominal. Public callable labels versus local lambda bindings, callable compatibility, complete recursive grammar, stored named/unnamed conversions, and superseded-value cleanup remain open; explicit tuple call spread is selected. The [concrete routing catalogue](named-input-routing.md) records selected rules and explicitly marked remaining proposals with valid/rejected cases. Preserve existing nominal records and selected positional lambda-header bindings. The expanded reference comparison covers all twelve established reference languages plus supplemental C#.

Selected tuple component spelling, 2026-10-21: name: Type for named explicit types, bare name for named inferred types, and :Type for unnamed explicit types. In tuple type context, (l, r) means labels with inferred types; (:Int, :Int) is the unnamed typed pair. Bare (Int, Int) is retired as a positional type spelling, and dangling name: entries are removed. Parenthesized value expressions and binding patterns retain their context-specific meanings. See [component grammar](named-input-routing.md#selected-tuple-type-component-grammar).

- Preserve simple, explicit syntax and strong static contracts; do not use null/undefined as an implicit absence model.
- Do not promote a suggestion to a selected rule without user confirmation.
- Keep any performance statement as a goal until measured.
- Avoid broad rewrites of unrelated design pages.
