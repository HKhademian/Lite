# INV-022 — Named fields for fixed tuples

Status: recorded (bounded implementation of selected named-field rules)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)
Covered scope: readable named fields on the existing flat fixed-tuple subset.

Subsequent status, **2026-10-31**: the user explicitly approves the temporary
textLength/textAt/textSlice helpers after the focused review. Earlier pending
consent statements in this dated increment describe its original baseline, not
the current status. See [INV-016 approval](INV-016-igniter-text-operations.md#focused-consent-review-2026-10-31).

## Question and consent boundary

The current [006 example](../examples/006-fixed-tuples.lts) carries a token as
two String positions. Would implementing the already selected named-field forms
make these values easier to read and maintain? token.kind and token.text expose
the meaning currently carried by token.0 and token.1.

The concrete scope was proposed in `d3169ac`, against the alpha.7 baseline.
The user deferred it with "before that" to request prompt/report improvements,
then requested fixes to the earlier example prompts. After those were complete
at `d77e9f1`, the user asked "ok contnue", resuming the deferred scope presented
here. This implements existing selected named-field rules under the
[consent rule](README.md#explicit-consent-for-language-changes); it does not
invent new syntax, helpers or a language-wide semantic choice.

## Existing selected rules

- [Named tuple entries](../docs/tuple-entries-and-access.md#selected-value-entry-forms)
  use label = expression, or =name shorthand for name = name. Ordinary bare
  expressions remain unnamed; explicit labels must be unique.
- [Member access](../docs/tuple-entries-and-access.md#selected-positional-access)
  uses the literal field name; numeric positions remain available in stored order.
- [Ordinary transfers](../docs/tuple-label-conversions.md#ordinary-transfers-check-labels)
  check labels as well as shape/types. Inferred copies retain labels. Explicit
  receiving-declaration label conversion is a separate selected contract.
- Constructor expressions evaluate once in written order. Existing copy,
  positional destructuring, singleton and Unit contracts still apply.

## Implemented first scope

1. Flat fully named scalar tuple values, including =name shorthand.
2. Named member reads alongside existing numeric reads and positional binding.
3. Explicit named tuple function input/result annotations, with copies and
   compatible whole-value replacement preserving ordered labels and types.
4. Before-effects diagnostics for duplicate labels, unknown members and
   incompatible stored tuple transfers; no added tuple printing convention.

Keep nested/mixed tuples, named destructuring, spread/rest, access grants,
member mutation and explicit declaration-site relabeling outside this increment.
Contextual positional-to-named construction and constructor reordering also remain
unsupported for this first implementation. Their selected broader behavior is
unchanged: diagnose those cases as unsupported rather than inventing a permanent
order restriction or silently relabeling stored values.

## Concrete example

```text
kind := "number";
text := "12";
token := (= kind, = text);
report(token.kind);
report(token.text);
```

Expected output is number and 12 on separate lines. A compatible explicit
function tuple type is (kind: String, text: String). The runnable
[008-named-tuples.lts](../examples/008-named-tuples.lts) demonstrates these forms;
the user's intervening prompt/report request uses example 007 first.

Strict TypeScript no-emit checking and all 79 interpreter test groups pass on
Node 26.13.0/TypeScript 7.0.2. New checks cover named/numeric access agreement,
Unicode/case-sensitive names, explicit-label versus shorthand reads, singletons
and Unit fields, source-once evaluation, copying and whole-value replacement,
positional binding order, named function inputs/results and recursion,
duplicate/unknown labels and rejection before effects. They distinguish
incompatible stored transfers from valid but unimplemented contextual constructors.

The real root launcher runs 008 and reports number 12, number: 12, number 12,
and 42 on separate lines; check-only mode emits nothing. No new runtime tuple
representation is needed: field reads resolve statically to stored positions.
No native layout/ABI, ownership, reflection or performance result is claimed.
Keyword/self field names remain outside the current igniter profile; the full
reserved-name policy is not settled by this implementation.

## Handoff

Preserve this source as igniter-v0.1.0-alpha.9 with all earlier tags intact.
The unnamed tuple subset and I/O helpers keep their existing behavior. New
features and semantic choices still require explicit consent. Mixed/nested
tuples, named patterns, spread/rest, declaration-site relabeling, constructor
routing, file I/O, runtime collections and self-hosting are not implemented here.
Experimental text-helper consent remains unchanged.
