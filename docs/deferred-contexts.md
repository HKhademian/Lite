# Deferred callable and environment contexts

Status: **pinned for later; postponed at the user's request on 2026-10-21**.

## Scope

Function/lambda context, capture ownership, and escaping lifetimes are too much design complexity for the language's current stage. Preserve the ideas for a later review rather than extending the current callable contract now.

Environment context, such as allocators, is a separate useful idea to retain. Its design is also postponed. No implicit context passing, environment type, allocator policy, capture syntax, or lifetime mechanism is committed by this note.

## Ideas to retain

- **Environment context:** facilities such as allocation and logging supplied to execution. Supply time, explicit versus implicit passing, scope, permissions, and defaults remain undecided.
- **Explicit capture headers:** the earlier favored `[offset](n) { ... }` value capture and `[var offset](n) { ... }` original-storage access. Keep the distinction as design history, not an active language feature commitment.
- **Context in signatures:** captured permissions, ownership, and lifetime requirements should be reviewable if the feature returns. Its exact type grammar was not completed.
- **Two context roles:** caller-supplied context versus private state stored alongside a callable. The clarification about whether caller context means ordinary arguments, per-invocation environment, or creation-time binding is postponed too.
- **Lifetime choices:** checked access to existing storage, explicitly owned/shared state, and automatic retention were compared; no escape policy was selected.
- **Representation:** private state might live inline or elsewhere, but no layout, heap allocation, sharing, cleanup, or zero-mapping mechanism was chosen.

## Resuming the topic

Resume when explicitly requested, with the memory/resource model and callable representation as context. Start by distinguishing environment services from lexical capture and persistent private state. The existing function/lambda surface syntax, optional type annotations, and unnamed-input rule have their own decisions; this deferral does not reopen them.

The detailed examples and reference-language comparisons remain in [closures](closures.md) as deferred review history. Current syntax is described in [functions](functions.md).
