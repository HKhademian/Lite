# Development workflow

Status: selected project process, 2026-11-03. This page selects no new language syntax.

Start with the [contributor guide](../CONTRIBUTING.md). Follow the
[atomic commit rules](../.agents/rules/atomic-commits.md) and
[compiler development rules](../.agents/rules/compiler-development.md).

## Complete one increment

1. Define the intended contract and multiple focused cases before implementation.
   Include meaningful feature combinations; each case should exercise a distinct rule.
2. Obtain approval for new syntax or semantics. Approval of a proposal does not
   establish compiler support. Implement the approved increment before accumulating
   further proposals on top of it.
3. Implement compiler behavior in LiteLang. Supporting tools may use direct Node
   TypeScript or move to LiteLang after their required capabilities are supported.
4. Update affected reference pages, samples, examples, verification cases, editor
   grammar and editor version in the same coherent feature change. Simplify consumers
   when the feature replaces an earlier workaround.
5. Run focused checks and the applicable project gates. Record failures, pending
   cases and deferred targets separately; registration and self-builds are not coverage.
6. Commit the coherent increment. Prepare independent component versions in a
   separate release commit, tag the verified revision, and publish commits and tags
   to the configured remote by default under the owner's 2026-11-03 authorization.
   Verify hosted release outcomes separately; never move published tags.

## Source adoption and migration

Support new features using the existing compiler-source subset first. Accept and
verify the generated seed before rewriting compiler source to use them. Keep
support and source adoption separately reviewable and self-hosted.

A breaking syntax migration may use a temporary compiler written in old syntax
that accepts only new syntax. It need not compile its own old-syntax source.
Keep the previous accepted source/seed pair active until the rewritten source and
generated replacement reach the same-source fixed point and pass the corpus.
Bridge creation, source conversion and promotion form one completed migration.
Never revive T00 or hand-edit generated seeds to bypass the migration.

## Tool and case boundaries

Commands belong in `bin/`, shared tool implementations in `tools/`, configuration
in `config/`, and declarative cases in `cases/`. Compiler-specific source remains
under `compiler/`; libraries remain under `lib/`. Preserve existing public aliases.
Use extensionless Node entries and direct `.ts` imports. CI task implementation
also belongs in TypeScript. npm installs dependencies; it is not the tool interface.

Use one stream model: exactly one of `text`, `bytes` or `file`, with optional
SHA-256. Keep source and substantial stream payloads in separate files. Tool
cases invoke real commands through a shared runner, without per-case executables.
Distinguish acceptance, exact artifact emission, execution and rejection. Isolate
file fixtures and verify that rejection produces no artifact or program effects.

Proposed cases may be explicitly pending with a reason; validate them immediately
and never count them as passes. Existing accepted-language migration failures
remain failures. Do not mark them pending to make a gate green.

## Open investigations

Centralized token/value/stage constants and derived types need further investigation.
The [bounded investigation](../research/investigations/INV-061-internal-kinds.md) records
current source owners, local probes and remaining evidence.
Node's default TypeScript execution requires erasable syntax; `const enum` is not
an adopted solution. Preserve discriminated-union checks and the compiler-source
subset while evaluating alternatives.

Move additional tools to LiteLang incrementally when the generated compiler can
support their actual workload. Identify file I/O, arguments, filesystem traversal,
JSON, subprocess and hashing needs first. Small host primitives may remain TS;
they must not become a parallel compiler implementation. See
[tool hosting](tool-hosting.md).

Continue with [documentation maintenance](documentation.md) and
[versioning](versioning-and-naming.md).
