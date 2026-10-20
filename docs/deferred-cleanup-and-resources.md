# Deferred review: body sections, cleanup, and resources

Status: **explicitly deferred by the user, 2026-10-19**. The body-wide special-section concept is supported as a direction. Its syntax and semantics will be investigated together with future defer and scoped resource management. No defer/using keyword, body-section grammar, or execution policy is selected here.

## Existing boundaries

- Recovery for a construct belongs inside its body; external error-catching tails on whole if/loop/match constructs remain retired.
- Operation-level `operation() else { fallback() }` and `operation() else(failure) { ... }` remain available.
- Returned Results still require explicit handling or propagation. Postfix ! retains its function/closure target; panics propagate implicitly.
- Cleanup-only `finally` has no receiver, recovery behavior, or transformation; when applicable cleanup completes normally, it preserves the pending outcome. For construct-level loop/conditional hooks, `then` precedes `finally` on normal completion. During language-managed typed-panic propagation, applicable `finally` blocks run inner-to-outer before an outer matching handler. Construct-level cleanup failure preserves any already pending failure as primary and retains cleanup failures as secondary; otherwise the first cleanup failure becomes primary and cancels normal completion. Body-wide attachment, whether this precedence applies to other cleanup mechanisms, and hard-abort behavior remain deferred. Declaration-ordered member-wise handling is selected for aggregated failures; the aggregate carrier and duplicate-member rules remain open.
- Ordinary branch selection, loop completion hooks, and exhaustive match arms keep their existing roles.

## Questions to revisit together

- Body-wide recovery/finally sections: attachment, delimiters, activation scope, and values. Retain the [body-section examples](body-recovery.md#concrete-body-section-proposal) as candidates only, including their unselected semicolon rule.
- Deferred actions: registration order, when captured expressions are evaluated, and which exits execute them.
- Scoped resources: acquisition, ownership, disposal, partial initialization, and invalidation after cleanup. Async disposal belongs to a future async design; it is not introduced here.
- Interaction with function returns, tagged returns, break/continue, propagated errors, and panics.
- Cleanup ordering across nested bodies/resources, and whether the selected construct-level failure precedence also governs proposed body-wide cleanup, defer, and resource-disposal mechanisms.
- Definite initialization, accessible bindings, and implementation costs consistent with the language's small-runtime goal.

Review these as one lifecycle design before selecting syntax. Do not independently finalize the body-wide semicolon proposal or infer automatic collection of inner Results from these examples.

## Reference for the future review

[TypeScript 5.2: using declarations and explicit resource management](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) provides a reference for using/await using and scoped disposal. This is comparison material, not adopted LiteScript syntax.

Related: [body-owned recovery](body-recovery.md), [finally](finally.md), [operation recovery](expression-recovery.md), and [decisions](decisions-and-open-questions.md).
