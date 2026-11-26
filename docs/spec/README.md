# LiteLang current design specification

This index groups LiteLang rules under stable area IDs. The linked
[owning pages](lite://doc/normative-pages) state the current rules and
identify working proposals. The [decision ledger](lite://doc/decisions-and-open-questions)
and [proposal register](lite://doc/proposals/README) retain the history.

Use the [Shipped Handbook](lite://handbook/overview-and-setup) for runnable
guidance and the [verification cases](lite://repo/language/verifications/README.md)
for tested compiler behavior. A selected design may still await implementation.

## Using the IDs

Cite LS-001 through LS-011 for an area and the owning section for the precise
rule. IDs stay stable as wording and organization change. A superseded ID
remains reserved.

## LS-001 — Source, syntax, and evaluation

See [unambiguous meaning](lite://doc/unambiguous-meaning) for the language-wide resolution principle.
Start with [lexical structure](lite://doc/lexical-structure), the
[grammar sketch](lite://doc/grammar-sketch), and [operators](lite://doc/operators).
[Evaluation order](lite://doc/evaluation-order) owns sequencing. See
[blocks and results](lite://doc/blocks-and-results) for executable scope and
[compile-time evaluation](lite://doc/compile-time-evaluation) for its separate
phase and effect rules.

## LS-002 — Bindings, permissions, and assignment

[Declarations and assignment](lite://doc/declarations-and-assignment) owns
binding syntax and assignment. [Mutability](lite://doc/mutability) covers
local permissions, while [caller grants](lite://doc/caller-mutation-grants)
owns temporary access conveyed by a call. See
[mutation grants for field receivers](lite://doc/type-operations#mutation-grants-for-field-receivers)
for the first-call boundary.

## LS-003 — Types, unions, and zero

[Types and inference](lite://doc/types-and-inference) links the rules for
literal typing, compatibility, and inference. See [aliases and distinct
types](lite://doc/type-aliases), [records](lite://doc/records),
[enums](lite://doc/enums-and-variants), and
[union normalization](lite://doc/union-normalization) for identity.
[Zero initialization](lite://doc/zero-initialization) and
[union zero](lite://doc/union-zero) own the corresponding value contracts.

## LS-004 — Initialization and defaults

[First initialization](lite://doc/first-initialization) owns definite
initialization, including [conditional reservation](lite://doc/first-initialization#conditional-reservation).
[Zero initialization](lite://doc/zero-initialization) covers bare typed
declarations. [Record initialization](lite://doc/record-initialization) covers
field defaults. [Callable default contracts](lite://doc/callable-default-contracts)
covers omitted arguments.

## LS-005 — Functions and calls

[Functions](lite://doc/functions) owns callable declarations and lookup.
[Named input routing](lite://doc/named-input-routing) owns positional and named
inputs. [Type-attached operations](lite://doc/type-operations) owns static and
instance calls. [Generic parameter declarations](lite://doc/generic-notation#explicit-generic-names-and-inferred-parameter-declarations)
records the agreed inference direction. See [closures](lite://doc/closures)
for deferred capture and lifetime design.

## LS-006 — Conditionals

[Conditionals](lite://doc/conditionals) owns conditional forms, including
[partial initializers](lite://doc/conditionals#no-final-else-guarded-update)
and [pattern guards](lite://doc/conditionals#pattern-binding-followed-by-guards).
[Condition chains](lite://doc/condition-chains) covers sequencing and binding
visibility. [Branch-result inference](lite://doc/branch-result-inference)
covers result types shared with [match](lite://doc/match).

## LS-007 — Loops

[Loops](lite://doc/loops) owns source forms and iteration.
[Loop results and completion](lite://doc/loop-completion) owns result typing,
contributions, metadata, and `then`.

## LS-008 — Errors, recovery, and cleanup

[Result and errors](lite://doc/result-and-errors) introduces the failure
channels. [Expression recovery](lite://doc/expression-recovery) and
[recovery boundaries](lite://doc/recovery-boundaries) govern handling scope.
See [capture and unwrapping](lite://doc/failure-capture-and-unwrapping),
[panics](lite://doc/panics), and [finally](lite://doc/finally) for their
separate contracts and open questions.

## LS-009 — Collections and sequences

Start with [collections and iterators](lite://doc/collections-and-iterators)
and the [indexed sequence contract](lite://doc/indexed-sequence-contract).
See [arrays](lite://doc/arrays), [lists](lite://doc/lists),
[maps](lite://doc/maps), [sets](lite://doc/sets), and [slices](lite://doc/slices)
for each family.

## LS-010 — Modules, tooling, and project stage

[Modules and packages](lite://doc/modules-and-packages) owns source kinds,
[import and re-export visibility](lite://doc/modules-and-packages#import-expansion-and-re-exports),
and [package preload](lite://doc/packages-and-preload#package-preload).
[Module import stages](lite://doc/compiler/module-import-stages) tracks the
current compiler gap. See [tooling and learning](lite://doc/tooling-and-learning)
for the source and editor experience.

## LS-011 — Naming and versioning

[Naming and versioning](lite://doc/versioning-and-naming) owns project,
language, component, and proposal names. See [release automation](lite://doc/release-automation)
and the [version registry](lite://repo/config/versions.json) for release
mechanics and current component assignments.

## Open contracts at a glance

The owning pages record open questions in context. The
[proposal register](lite://doc/proposals/README) links active drafts and prior
revisions. The [normative map](lite://doc/normative-pages) leads to current
rules, and the [decision ledger](lite://doc/decisions-and-open-questions)
preserves earlier decisions and their dates.
