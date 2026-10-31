# INV-022 — Named fields for fixed tuples

Status: waiting for input (bounded implementation scope proposed)
Contributor: redacted (agent-assisted)
Last updated: 2026-10-31
Catalog brief: [INV-022](TOPICS.md#inv-022)
Covered scope: readable named fields on the existing flat fixed-tuple subset.

## Question and consent boundary

The current [006 example](../examples/006-fixed-tuples.lts) carries a token as
two String positions. Would implementing the already selected named-field forms
make these values easier to read and maintain? token.kind and token.text expose
the meaning currently carried by token.0 and token.1.

Baseline: `36b301f`, tagged igniter-v0.1.0-alpha.7. "Ok continue" authorizes
continuing the review, not an unspecified feature addition. This note proposes
the next implementation scope for explicit approval under the
[consent rule](README.md#explicit-consent-for-language-changes). No implementation,
new syntax, builtin or accepted design change is made here.

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

## Proposed first implementation scope

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

## Concrete proposed example (not executable yet)

```text
kind := "number";
text := "12";
token := (= kind, = text);
report(token.kind);
report(token.text);
```

Expected output is number and 12 on separate lines. A compatible explicit
function tuple type is (kind: String, text: String). A prospective
examples/007-named-tuples.lts should demonstrate these forms after approval.

Acceptance checks should cover named/numeric access agreement, singletons,
source-once evaluation and copying, positional binding order, function inputs/
results, duplicate/unknown labels, and the boundary between an incompatible
stored transfer and an unimplemented fresh-constructor routing case.
These checks are proposed; no new Lite runtime result is claimed.

## Handoff

Approve or revise this scope before code changes. Keep the existing unnamed
tuple behavior and alpha.7 source/tag intact. Experimental text-helper consent,
file I/O, runtime collections, native layout and self-hosting remain separate.
