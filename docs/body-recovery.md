# Recovery owned by a construct body

Status: **body-local ownership selected; body-wide special sections explicitly deferred by the user, 2026-10-19**. Treat fn/if/loop/match bodies as owners of their recovery. Do not attach an error-catching else(failure) at the outer level of an if/loop/match construct. Operation-level recovery remains available inside bodies. The body-wide examples below are retained as candidate illustrations, not selected grammar.

## Deferred review

The user supports the body-wide concept but asks to leave its design for later, together with future defer syntax and scoped resource management such as TypeScript's using/await using. See [deferred cleanup and resource review](deferred-cleanup-and-resources.md).

The semicolon delimiter, internal else/finally sections, activation scope, and execution rules below are frozen proposals for that review. They introduce no current grammar or new meaning for separators. Operation-level recovery remains usable independently of this deferred feature.

## One operation inside the body

```text
if condition {
    first();
    second() else(failure) {
        recover(failure)
    }
}
```

This existing recovery form belongs to second(). A panic in first() happens before that handler is active and propagates outward. It is not caught merely because the handler is textually inside the same body.

## One handler owned by the body

```text
/* Illustrative body-wide section; its delimiter is not selected. */
if condition {
    first();
    second();

    else(failure) {
        recover(failure)
    }
}
```

The intended difference is that supported panics from first() or second() could reach the same body-owned handler. The handler is inside the body's braces rather than a second outer else competing with normal branch selection. This is the interpretation suggested by the function analogy, but the user has not yet chosen the exact body-wide form or its full scope.

The delimiter must distinguish a body-wide recovery section from a handler attached to the final operation. A newline cannot do that. The explicit-semicolon candidate below is one proposed discriminator; whether to adopt it or use another form remains a grammar decision. This document does not select a new meaning for existing separators or claim a complete parser.

## Concrete body-section proposal

The user asks for a less vague illustration. One concrete candidate divides a body into work, optional recovery, and optional cleanup, all inside the same braces:

```text
inspect_file := fn(path: String) {
    prepare();

    text := read_text(path) else {
        "Unavailable"
    }

    inspect(text);

    else(failure) {
        report_body_failure(failure)
    }

    finally {
        finish_inspection()
    }
}
```

Assume read_text returns String ! ReadError and all other shown helpers return Unit. Prepare/inspect can raise typed panics. The read's own returned error is handled explicitly by its local receiverless else. This is proposed body-section grammar, not currently selected source syntax; body-wide `finally` placement remains under review. For construct-level loop/conditional hooks, the selected normal order is `then` followed by cleanup `finally`. During language-managed panic propagation, applicable `finally` blocks run for exited scopes before an outer matching handler.

### How it executes

1. On entry to the body, establish its handler for the work region; it is not activated only after reaching its written position.
2. Run prepare, the explicitly handled read, and inspect in order.
3. If work completes normally, skip the body recovery section.
4. If a supported typed panic escapes an operation-local handler while the work region is active, stop remaining work and enter the body recovery section once.
5. After work or recovery finishes, run the proposed body-owned finally. Structured early exits run applicable cleanup without being intercepted as failures.
6. A new panic in recovery/finally goes outward; these sections do not catch themselves. Applicable `finally` blocks in exited scopes run before an outer matching handler. Construct-level `finally` has a selected primary/secondary failure precedence; whether proposed body-owned sections use the same rule remains open with their scope and activation semantics.

If prepare panics, the read and inspect do not execute. If the read returns .err, its local fallback supplies "Unavailable" and inspect still runs. If inspect panics, the body handler runs after applicable inner-scope cleanup. No retry or rollback occurs.

### The same body layout in an if branch

```text
if enabled {
    first();
    second();

    else(failure) {
        recover_branch(failure)
    }

    finally {
        finish_branch()
    }
} else {
    show_disabled()
}
```

The internal else handles the selected true body; the external else remains ordinary false selection. A false condition enters only the false body, so the true body's handler/cleanup is not active. A panic while evaluating the condition occurs before entering either branch body and needs an enclosing body handler or operation-local recovery. This is the concrete literal-body scope being proposed, not an extension of an inner handler to its header.

### Proposed explicit separator rule

The first body-owned hook requires an explicit semicolon ending the work section. A handler with no such boundary remains attached to its operation:

```text
second() else(failure) { recover_operation(failure) }
second(); else(failure) { recover_body(failure) }
```

These snippets illustrate the proposed distinction within their containing body. Semicolon ends the operation in the second form, so the following else belongs to the body. Newlines and indentation make no difference. After a final work item ending in a complete block, the same explicit separator would still be required to introduce a body hook; repeated separators would retain their existing ignored-extra behavior. A body with cleanup only would likewise separate work from its finally section explicitly.

This delimiter proposal needs review before adoption. It does not make semicolon a value-discard operator. Body hooks would be attached clauses rather than ordinary final work items; the existing final-expression rule would apply to the completed work region, with recovery/value and cleanup transformations specified separately. The Unit examples avoid assuming a new normal-return type rule.

That proposed semicolon serves as an explicit hook delimiter, not an ordinary trailing separator after a completed block. It is not selected grammar and must not be generalized into a block-ending requirement. Ordinary examples follow the [omit-when-unnecessary rule](lexical-structure.md#semicolon-style-after-closing-braces).

Receiver omission could remain supported for a body-owned else because its explicit separator/brace owner already distinguishes it from a call handler or external false branch. That would need to be stated in the final grammar rather than inferred from this illustration.

Recovery/cleanup may use their receiver and outer bindings such as path. Work-local names must not become magically initialized if failure occurred before their declaration. Definite-initialization and lifetime rules must govern any such access; the examples do not use text from recovery or cleanup.

## What the ownership correction settles

- Ordinary if else remains branch selection.
- Loop then/empty else remain completion hooks under their existing contracts.
- Match arms remain ordinary exhaustive pattern selection.
- Calls such as operation() else { fallback() } and operation() else(failure) { ... } retain their selected recovery forms.
- External recovery tails proposed on whole if/loop/match constructs are retired, including grouping workarounds whose purpose was to attach such a handler.
- A Result produced by a construct can still be stored, passed as Result data, or explicitly inspected later. Body-local ownership is not a ban on ordinary use of result values.

No function allocation, implicit closure, new plain-return target, or change to postfix ! follows merely from treating bodies similarly for recovery ownership. Returned Result arguments still need explicit handling/extraction before ordinary payload use. A returned .err remains data until explicitly handled or forwarded; a body handler does not silently collect every inner Result. A handler's own failure does not re-enter that handler.

## Scope questions still pending

For a literal body-only region, the condition/header/source/subject is evaluated before entering its body: an if condition, loop source acquisition/advancement, or match subject/arm guard is not automatically inside a selected branch/iteration/arm body. A surrounding body-owned handler could cover that evaluation, and operation-local handling can be attached to its producing call. A rule extending an inner body handler to its construct's header would need an explicit decision; it is not adopted by placement alone.

A loop body-owned handler naturally raises a per-iteration versus whole-loop question. An iteration failure must not silently continue, break, discard accumulator state, or retry; the handler's normal completion/explicit exit needs a defined contribution rule. Whole-function recovery would be active once per invocation rather than once per loop entry. These scopes and active-handler entry points still require confirmation.

The user correction names recovery placement. It does not independently move or retire `finally` hooks. Cleanup-only `finally` has no receiver, recovery behavior, or transformation; language-managed panic propagation runs applicable exited-scope `finally` blocks before outer recovery. Construct-level `then`-before-`finally` order and primary/secondary cleanup-failure precedence are selected. Body-wide placement, whether that precedence applies to body-wide sections, and Result-forwarding interactions remain separate decisions.

Related: [operation recovery](expression-recovery.md), [boundary comparison](recovery-boundaries.md), [Result handling](result-and-errors.md), [conditionals](conditionals.md), [loops](loops.md), [match](match.md), and [finally](finally.md).
