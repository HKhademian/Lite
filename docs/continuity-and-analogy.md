# Continuity, gradient, and analogical coherence

Status: **design-method principle selected 2026-10-25**. This page guides syntax and rule decisions; it is not a runtime semantic and not a mathematical differentiability claim.

## The principle

LiteLang should be a **connected design**, not a collection of unrelated local rules.

- A small change in source should produce a small, predictable change in meaning.
- Similar-looking constructs should share as much grammar, typing, evaluation, and diagnostic shape as their concepts allow.
- A semantic jump should be justified by a **visible change in the input**: a keyword, punctuation mark, type, target, channel, or explicit phase boundary.
- A reader who understands one pattern should be able to transfer a semi-similar understanding to another location with a similar look, without relearning the whole model.
- The result should be easier to learn, read, reason about, and diagnose.

We call this the **design gradient**: local predictability across nearby syntax and rules. It is qualitative. There is no numeric derivative, scoring formula, or promise that every edit has proportional runtime cost.

## What “smooth” means

Smoothness is about the source-to-meaning mapping, not about data or control flow.

A transition is smooth when:

- one visible edit changes one local rule;
- nearby forms keep the same shape and evaluation order;
- the same marker means the same kind of thing wherever it appears;
- an error names the boundary that was crossed;
- a learner can predict the new form from an already-known form.

A transition is a jump when:

- the same-looking syntax changes rule by context with no visible marker;
- a small edit silently changes evaluation order, ownership, or failure behavior;
- a special case applies only in one nesting level or phase without a local cue;
- the reader must know an unstated implementation detail to choose the meaning.

## Visible discontinuities are allowed

A real language needs boundaries. A jump is acceptable when the input visibly marks it:

- `?` marks reservation or a no-value path, rather than silently inventing a value.
- `!` adds a returned-error channel; it is not hidden failure handling.
- `@tag` makes a target explicit; it is not an invisible nearest-target guess.
- `else` introduces a fallback path; it is visible at the decision point.
- `:` introduces a type; `:=` introduces an inferred binding.
- `==` is equality while `=` is assignment; the extra character is the boundary.
- `then` and `finally` are distinct named phases, not context-dependent spellings.

The rule is: **a semantic jump requires an input jump**. If the source looks the same, the rule should be the same. If the rule must differ, the source must show why.

A runtime input can also change which branch or value is selected. That is not a language-rule jump; the branch rules remain uniform even when the data changes abruptly.

## Connected harmony

Harmony does not mean every construct is identical. It means differences are motivated and local.

Prefer shared shapes for:

- declarations, assignments, and initialization markers;
- block bodies and tail-value completion;
- `then` as result processing for loops and complete conditionals;
- explicit `@tag` targets across loop, conditional, and return exits;
- `else` fallback/recovery at the point where the fallback is visible;
- patterns that bind names only on a successful match;
- failure channels that remain separate but use the same `else`/filter surface where possible.

Do not force an analogy when the concepts differ. Name the difference and mark it in source.

## Analogical transfer

The practical test is whether understanding transfers.

A reader who knows:

```text
value: T = expression
```

should recognize:

```text
value: T = ?
```

as the same declaration shape with a visible reservation marker, not as a different declaration system.

A reader who knows a declaration initializer:

```text
x: Int = if ready { 7 }
```

should recognize:

```text
x: Int = if ready { 7 } else { ? }
```

as the same conditional with an explicit no-value branch, not as an unrelated rule.

A reader who knows a complete conditional `then`:

```text
total: Int = @sum if ready { 7 } else { 0 } then { @sum.value * 2 }
```

should recognize the loop `then` shape as the same result-processing phase, with the loop context supplying `.value`.

A reader who knows `@tag.value` inside a conditional `then` should not expect an untagged leading dot to work there. The tag requirement is the visible boundary, and the same tag vocabulary appears across constructs.

## Decision checklist

Use this checklist for every syntax or rule decision.

1. **Minimal pair.** Write the smallest visible edit and compare the two meanings. Does one token change one local rule?
2. **Marker.** If the meaning jumps, what visible input marks the jump? If there is no marker, redesign or record an explicit exception.
3. **Analogy.** Is there a similar construct elsewhere? Does it use the same shape for the same concept? If not, why not?
4. **Transfer.** Can a reader who knows the existing pattern predict the new one? What must they relearn?
5. **Locality.** Is the exception confined to the construct that needs it, or does it leak into unrelated contexts?
6. **Diagnostics.** Does an error identify the boundary and the expected form, rather than silently switching modes?
7. **Composition.** Does the rule remain predictable when nested with blocks, patterns, targets, and recovery?
8. **Cost.** If a discontinuity is justified by safety, performance, or ambiguity, is that reason documented and visible to the user?

If the answer to 2, 3, or 4 is weak, prefer redesign over a special case.

## Anti-patterns

- Same punctuation, unrelated meanings, no marker.
- Meaning that depends on nesting depth, phase, or an invisible “current mode.”
- A small edit that silently changes evaluation order or failure channel.
- A special case that only applies in one construct and is not reflected in its grammar.
- Similar-looking forms where one is a value and the other is a control marker without a visible distinction.
- Requiring a reader to know compiler internals to predict source behavior.
- Adding a new exception when an existing pattern could be extended locally.

## Limits and tensions

- Strong typing, safety, and performance sometimes require an explicit barrier. The barrier should be visible in source, not hidden in context.
- Different concepts may deserve different rules. Harmony is coherence, not forced uniformity.
- Continuity is not backward compatibility. A language version may change a rule; the change should still be explainable as a visible, local transition.
- Continuity is not a promise that all edits are equally cheap at runtime. It is a promise about source-level predictability.

## Relationship to other principles

This principle supports the existing goals of low ceremony, explicit consequential behavior, one conditional syntax, one loop keyword, and consistent leading separators. It is a method for choosing among otherwise plausible designs, not a replacement for type safety, ownership, or performance constraints.

See [principles](principles.md), [optional leading separators](leading-separators.md), and the [decision ledger](decisions-and-open-questions.md).
