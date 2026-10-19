# Recovery attached to a conditional

Status: **user-requested extension, 2026-10-19; proposed syntax and semantics**. The user approves the named recovery form on calls and asks whether if condition { ... } else(failure) { ... } can catch failure. This document proposes a disambiguation rule; it does not silently select the remaining general panic-boundary or receiver-type designs.

## Keep false selection distinct from failure

```text
if condition {
    action()
} else(failure) {
    recover(failure)
}
```

Proposed meaning:

- If condition evaluates to true, execute the true body.
- If it evaluates to false, skip the true body. There is no ordinary false body here.
- If protected evaluation raises a supported typed panic, execute the recovery clause.
- False and pattern mismatch are ordinary selection outcomes, not failures. They do not create a failure receiver or invoke recovery.

Assume action/recover have Unit behavior in this action example. The recovery clause does not create a normal false branch or change the existing requirement that a conditional lacking such a branch have Unit behavior.

## Both false behavior and recovery

```text
if condition {
    true_action()
} else {
    false_action()
} else(failure) {
    recover(failure)
}
```

The receiver distinguishes the two clauses syntactically. The bare else belongs to Boolean/pattern selection; the final receiving else is attached recovery for the complete conditional. Recommend allowing at most one unfiltered recovery clause, after the ordinary else-if/else chain. Selective multi-handler chains remain a separate proposal.

Under the recommended whole-construct recovery interpretation, supported panics from the executed condition, selected branch, or synchronous callees can reach the final handler. Unselected branches are never evaluated. A panic inside the handler itself propagates outward and does not re-enter that handler. Earlier effects are not rolled back. This scope recommendation still needs confirmation alongside the broader expression-boundary design.

```text
if first_condition {
    first_action()
} else if second_condition {
    second_action()
} else {
    last_action()
} else(failure) {
    recover(failure)
}
```

If first_condition panics, this is failure recovery, not a reason to test second_condition. If the first condition is false, evaluate the second condition normally. Every executed condition is evaluated once in the selected evaluation order.

## Ignoring the failure receiver

On a conditional, bare else { ... } must retain its established false-branch meaning. It cannot simultaneously mean receiverless recovery in the same position. Use the existing unused-allowed identifier when the payload is unnecessary:

```text
if condition {
    action()
} else(_) {
    recover_without_inspection()
}
```

The name _ is still an ordinary readable receiver with permission to be unused, not a special wildcard. No new identifier rule is introduced. Generic operation recovery such as read_text(path) else { fallback() } keeps its receiverless form; the conditional context reserves bare else for false selection.

This introduces a small context-specific restriction on receiver omission. It avoids another keyword and distinguishes the roles with explicit punctuation. The cost is a potentially repeated else when both false behavior and recovery are present. Parenthesizing a completed conditional before attaching generic receiverless recovery is another possible disambiguation, but is not required or selected by this proposal.

## Recovery inside every branch

Being inside a conditional does not change ordinary operation recovery. The receiver remains optional for an operation in the true body, any else-if body, or the normal false body:

```text
if first_condition {
    first_action() else {
        recover_first()
    }
} else if second_condition {
    second_action() else(failure) {
        recover_second(failure)
    }
} else {
    false_action() else {
        recover_false()
    }
}
```

Assume each selected operation and its successful fallback fit the branch's required Unit behavior. Each local handler belongs to that operation. The closing body brace keeps it inside the selected branch; no indentation rule is involved. A receiver may be present or absent independently in each handler. The proposed receiver requirement at a conditional boundary is not a ban on receiverless recovery inside a conditional.

Only one normal branch executes. A handler in the true body does not handle a failure from an else-if condition or the false body, since that handler is not active there. Handler receiver names are branch-local and may reuse the same spelling without sharing storage or leaking into other branches.

## Local versus whole-conditional ownership

Under the proposed final recovery clause, the following handler belongs to the whole conditional. In this example the actions return plain Unit and may raise typed panics; they do not leave returned Result errors unhandled:

```text
if first_condition {
    first_action()
} else if second_condition {
    second_action()
} else {
    false_action()
} else(failure) {
    recover_remaining(failure)
}
```

Under the recommended whole-construct panic scope, this covers failures during executed conditions and the selected body, including supported synchronous callees. These local operations must already satisfy normal Result handling: the final clause does not collect arbitrary inner returned errors.

Local operation recovery and whole-conditional recovery can be combined. A local handler that completes successfully prevents that event from reaching an outer handler. If its fallback itself panics, a surrounding conditional recovery boundary could catch that new panic; the failed local handler does not re-enter itself. A panic in the final conditional handler propagates to an enclosing eligible boundary rather than returning to that same handler.

The visual location alone must not select a different ownership rule. In particular, a receiving else immediately after the true body is not silently branch-local when no other branch follows and whole-conditional when a later else-if is added. The proposed conditional recovery clause is always final and belongs to the complete conditional. To protect a smaller region, put its recovery expression inside the branch.

### A whole branch body as one recovery region

Several operations in a branch may need one shared panic boundary. Recovering only the final call does not cover earlier operations. A distinct inner block expression could identify that smaller region; this is an additional surface proposal:

```text
if condition {
    ({
        prepare();
        perform();
    }) else(failure) {
        recover_branch(failure)
    }
} else {
    false_action()
}
```

The grouping identifies the nested block expression as the recovery subject and avoids assigning its handler to the surrounding if. Exact general block-recovery grammar is not selected by this example. It must integrate with the existing block-value grouping and item-boundary rules. Prepare/perform are assumed to produce Unit in this illustration; returned Results still need explicit handling before plain-payload use, and ! still returns from the enclosing function.

A similar nested region could appear in an else-if or false body. An ordinary call-level handler remains simpler when only one operation needs recovery. The language must not silently reinterpret a branch body brace as a separately handled inner block.

### Recovery bodies and future finally clauses

A recovery body can contain ordinary operation-level recovery too. If its own operation failure is handled locally, it can continue; otherwise a panic travels farther outward. It never restarts the same recovery body automatically.

Finally remains an explored cleanup hook rather than a selected complete policy. A failure during cleanup needs its own rules, especially when another failure is already pending. This review does not assume the conditional's final handler also protects its own handler or a future finally body.

## Result errors remain explicit

A recovery clause is not an implicit collector of all .err values produced inside a branch. If an operation returns T ! E where its next use requires T, it still needs its own recovery, inspection, or ! extraction. An outer conditional recovery clause does not make that use type-correct.

Likewise, a condition requiring Bool cannot receive Bool ! E merely because the if has a recovery clause. The condition's Result must be explicitly handled/extracted. A pattern condition may deliberately inspect a Result as data; matching .err in such a condition is ordinary pattern selection, not an automatically raised failure.

The existing postfix ! still returns a declared Result error from the nearest enclosing function/closure. A conditional's else(failure) is not a new ! propagation target. Normal return, tagged return, break, and continue are not panic events for this clause to catch.

There is one ordinary composition case: the complete conditional can itself produce a Result. Its final Result outcome can be handled by the attached recovery clause, just like any other explicitly recovered Result expression:

```text
/* Both readers return the same String ! LoadError contract. */
text := if use_cache {
    read_cache()
} else {
    read_remote()
} else(failure) {
    fallback_text()
}
```

The selected branch supplies a Result as its own value, and the outer recovery consumes that one Result. It does not recursively inspect nested or intermediate outcomes. The source distinction is the same as passing/storing a Result as data versus requiring its plain success payload.

## Value types

First type-check the normal conditional using its established branch rules. A recovery clause does not make false disappear, invent None, or authorize incompatible normal branch types. Then apply the recovery rule: normal success T and normally completing fallback D yield T | D, collapsing equal alternatives. For a Result-valued conditional, T is its successful payload after one outcome layer is handled.

An explicit nonlocal exit from the handler contributes no local fallback value. A handler merely logging and returning Unit adds Unit when the normal successful value is non-Unit; it must not silently fabricate a normal value.

## Proposed grammar distinction

```text
conditional_with_recovery := conditional_core [conditional_recovery]
conditional_core := "if" condition block
                    { "else" "if" condition block }
                    [ "else" block ]
conditional_recovery := "else" "(" receiver_pattern ")" block
```

This is a proposal fragment, not a replacement for the selected incomplete grammar. Existing tag placement and the exploratory finally clause need integration. Complete receiver-pattern policy, precedence with condition-local recovery, handler typing, cleanup, and any filter semantics remain open.

No newline, indentation, capitalization, or type-checking guess chooses between a false branch and a recovery clause. Parse else if, else followed by a body, and else followed by a receiver header as distinct forms. Existing mandatory braces retain unambiguous nesting.

Related: [conditionals](conditionals.md), [shared expression recovery](expression-recovery.md), [receiver types](recovery-receiver-types.md), [boundary comparison](recovery-boundaries.md), [Result arguments](result-and-errors.md#results-passed-as-arguments), and [blocks](blocks-and-results.md).
