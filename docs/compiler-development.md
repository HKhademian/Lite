# Compiler development guidelines

Owner direction, **2026-11-02**: develop and support LiteLang in Lite. Language
features, syntax support, semantic checks, bug fixes, edge cases and target
lowering belong in the Lite compiler source. Every change needs multiple
focused test cases and coverage of combined feature usage.

This is the ongoing development policy. The [bootstrap plan](bootstrap-plan.md)
records the initial bootstrap constraints and gates; the
[transition plan](../compiler/transition-plan.md) tracks the remaining ports.
This policy does not itself select new language syntax or mark pending support
complete.

## Atomic commits for all project changes

All project work must follow atomic commits, including compiler implementation,
language specifications, investigations, tests, tooling, documentation,
configuration and generated assets. Each commit has one coherent purpose and
includes its required tests, documentation and artifact updates. Separate
independent fixes, refactors, decisions and release/version work.

Review the diff and run the checks appropriate to that scope before committing.
Stage only the intended files or hunks; preserve unrelated or concurrent changes.
Create the commit before reporting the unit complete or starting independent
work, and report its ID and verification. If committing is blocked, state the
blocker and uncommitted scope explicitly. Keep feature support and subsequent
compiler-source adoption separately reviewable, with a working bootstrap at
each step. The repository-wide [agent instructions](../AGENTS.md) keep this
requirement visible to future contributors using the agent.

## Lite source and generated igniters

Maintain the compiler implementation in `compiler/src/` and shared Lite support
in `lib/core/`. Generate the readable TypeScript igniter/bootstrap from those
sources, with C as the later native bootstrap target. Do not hand-edit generated
seeds or flattened emitter bundles to implement language behavior. TypeScript
host adapters, test harnesses and platform glue may remain TypeScript under the
[source-file policy](tooling-source-policy.md); they must not become a parallel
language implementation.

The current generated TS compiler can rebuild its own supported source subset.
Both compile targets use Lite-generated, TS-hosted compilers. Native C
self-hosting, full T00 feature parity and migration of `lite run`/`lite check`
remain pending. T00 is the handwritten historical interpreter/reference; it is
distinct from the generated TS igniter. New compiler work does not require a
new handwritten T00 implementation as a prerequisite. Keep existing consumers
working until their tested replacements are ready.

Distinguish the language the compiler **accepts** from the language used to
**write** it. A feature can be implemented in Lite using already supported
constructs before the compiler source itself uses that feature.

## Define the contract and coverage first

For every feature, syntax change, bug fix or semantic change:

1. Identify the owning specification, selected decision or bounded investigation.
   State the behavior being added or corrected and the targets affected. For a
   specification-only change, include concrete source/input/expected-result
   cases even while executable support is pending; do not count them as passes.
2. List the aspects to verify and link each to named cases. Separate accepted
   forms, rejected forms, runtime behavior, diagnostics and feature interactions.
   Mark unresolved behavior explicitly rather than inheriting a host default.
3. Add multiple focused cases. For a bug, retain the smallest reproducer and
   add nearby boundaries and variants that could fail for the same reason.
   Establish the pre-fix failure when practical.
4. Implement the behavior in Lite, then run the same contract against each
   supported generated target. Record an unsupported target as a gap and verify
   its explicit rejection where applicable.
5. Update the owning docs and affected consumers, record verification evidence,
   and keep the implementation, tests and documentation in one atomic change.

One demonstration program or one successful input is insufficient. Case count
alone is not coverage: use distinct cases for distinct rules and failure modes.

## Focused test cases

Choose the relevant dimensions for the topic and record why any material
dimension is inapplicable:

- Valid syntax variants, precedence, associativity, grouping, nesting and
  relevant whitespace/separator forms; incomplete or malformed counterparts.
- Type inference and explicit annotations, compatible and incompatible types,
  name lookup, scope, shadowing, initialization and mutation permissions.
- Ordinary values and boundaries: zero, signs, empty/single/multiple elements,
  numeric limits, Unicode and end-of-input where relevant.
- Multiple input/output scenarios for input-sensitive behavior, including
  arguments, empty input, malformed input and boundary inputs where applicable.
  Use separate source fixtures when changing input cannot exercise the rule.
- Constant and runtime expressions, evaluation order, side effects,
  short-circuiting, untaken branches and unreachable paths where relevant.
- Rejections and runtime faults, including source positions, diagnostic text,
  exit status and output produced before a fault. Rejected source must not
  produce a partial executable artifact or execute program effects.

Expectations come from the intended contract, not merely from whatever the
current implementation prints. Review generated expectation changes against
that contract; a reference interpreter can contain the same bug or lack the
new feature. Keep valid and invalid cases independently observable so an early
failure cannot hide the remaining assertions.

## Combined feature coverage

Alongside isolated cases, add multiple combinations with existing features.
Choose combinations that share compiler machinery or have semantic boundaries:
for example, a value flowing through an alias, local binding, function argument
and return; nested loops and conditionals; or indexing inside a call whose
arguments have visible effects.

Cover both valid combinations and invalid or failing combinations. Include
ordering, scope, mutation and fault interactions when relevant. Grow these
combinations as features are added; use an aspect-to-case list to keep the
matrix reviewable rather than requiring every possible combination. Existing
examples and samples provide additional integration evidence, but do not replace
the focused feature tests. A self-build likewise proves only the paths exercised
by the compiler source.

## Where tests and evidence belong

Use the existing harnesses and schemas:

- [Feature verifications](../verifications/README.md) carry semantic contracts,
  feature IDs and named input/output scenarios. Extend `cases` for multiple
  inputs to the same source, and add focused sources for different forms.
- [Compiler fixtures](../igniter/tests/README.md) cover admitted programs and
  compile-time rejections with exact expected streams/status.
- `compiler/tests/lexer/`, `parser/` and `checker/` hold focused phase fixtures.
  Targeted harness tests can cover CLI options, raw bytes, artifact structure or
  other behavior the manifest schemas cannot represent.
- Generated-target execution and shared corpus comparisons check behavior
  across supported backends; host tests check source/seed integrity and rebuilds.

Do not leave new language coverage only in T00 interpreter tests. Register or
wire cases into the maintained runner so the generated compiler actually runs
them. Existing manifests default to the igniter unless targets are supplied;
explicitly select supported generated targets. A test present on disk, a coverage
registry entry or a skipped backend is not evidence of generated support.

During implementation run the focused cases and `./lite test --fast`. Before
declaring an implementation complete, run `./lite test --full`,
`./lite verify --coverage` and `./lite verify --all`, plus the repository's strict
TS checks and affected editor grammar checks. When changing compiler source or
seeds, also verify generated rebuilds, determinism, the relevant fixed-point
ladder and corpus parity. Record commands, case names, results, skips and target
gaps; the [bootstrap seed guide](../compiler/bootstrap/README.md) describes the
current build and historical audit paths. Documentation-only edits need link and
consistency review rather than a compiler rebuild.

## Syntax investigations and feature flags

Syntax or semantic alternatives may be investigated with explicitly flagged
support in the **Lite compiler**, within the stated investigation scope. Keep
the candidate contract, alternatives and open questions in an
[investigation](../investigations/README.md) or proposal. A bounded experiment
does not make its syntax part of the selected language; normal design acceptance
still follows the project's explicit-consent process.

Experimental support must be opt-in and off by default. Test the flag enabled
and disabled: enabled cases cover the candidate's valid forms, invalid forms,
input variations and feature combinations; disabled cases preserve the selected
language and reject experimental-only forms. Record affected targets and test
interacting flags if an experiment supports their combination. Isolate the
experimental path so revising or removing it does not change default behavior.

These are requirements for future experiments, not a claim that a feature-flag
CLI or configuration mechanism already exists. Define and review that mechanism
when an experiment needs it; do not document invented switches as usable commands.
Never require an experimental flag to build the normal compiler or regenerate
the accepted igniter.

## Accept support before using it in compiler source

Using an accepted new feature in the compiler source is encouraged when it
improves clarity or maintenance. It is optional, and follows support acceptance:

1. Accept the language contract and verify the implementation with focused,
   boundary, rejection and combined-feature cases on the intended bootstrap
   target. Resolve or explicitly scope remaining gaps; passing one self-build
   does not establish full feature support.
2. Using the previous accepted seed and previously supported source constructs,
   generate and verify an igniter that supports the feature. Preserve the exact
   source/builder identities and hashes and establish reproducible rebuilds and
   the applicable fixed point before selecting it.
3. Only then migrate compiler source to use the feature. Update the documented
   compiler-source subset L, manifests and minimum seed requirements as needed.
   Rebuild and rerun the gates from the selected seed in a clean checkout so the
   bootstrap does not require the very feature it is still trying to acquire.

Keep the support increment and source-adoption increment separately reviewable.
TS-first adoption need not wait for all C support, but it must preserve the
documented bootstrap routes and explicitly track C gaps. Native C seed adoption
requires its own compilation, execution, corpus and fixed-point evidence; a
TS-hosted C emitter is not that evidence.
