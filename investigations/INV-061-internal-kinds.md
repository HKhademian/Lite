# INV-061 — Internal kind representations

Status: investigated in part; project-wide representation remains unselected.
Last updated: 2026-11-03. Scope: maintained TS tooling and Lite compiler-source
representations. This is not approval of new LiteLang enum syntax.

## Question and current source

Should token, value, stage and case kinds have centralized named values and
derived types? Preserve readability, discriminated-union narrowing, exhaustiveness,
serialized spellings, direct Node execution and generated bootstrap continuity.

- [Semantic verification](../igniter/verify.ts) has literal unions for kinds/targets.
- [Compiler fixtures](../igniter/test-fixtures.ts) use typed program/rejected categories.
- [New declarative cases](../tools/cases.ts) have local named as-const values;
  that local use does not decide a project-wide refactor.
- [The Lite lexer](../compiler/src/lexer.lts) stores String kinds and uses
  zero-argument canonical accessors because its source subset lacks enums and
  function capture of top-level constants.
- T00 is an explicit historical reference. Rewriting its internal kinds is not
  useful evidence of generated support. Never hand-edit generated TS seeds.

## Options

Keep literal discriminants for small local unions; introduce shared constants
where multiple owners currently repeat the same spellings. As-const objects
with a type derived from their values can preserve literal narrowing while
providing names such as TokenKind.Identifier. They still produce runtime objects.

Native const enums require a transformation and do not fit the current
erasableSyntaxOnly/direct-Node contract. A compiler build step would be an
explicit tooling change, with artifact/distribution costs to evaluate. Numeric
tags or branded values would need separate serialization/debugging evidence.

For Lite-written source, any stronger representation must first have accepted
language support and a promoted supporting seed. Do not translate the TS pattern
into unavailable Lite features or weaken the current compiler-source subset.

## Local probes

Executed with Node **26.12.1** and repository TypeScript **7.0.2**; the repository
pins Node 26.13.0, so these probes do not substitute for that runtime's CI check.

- Default direct Node execution of const enum rejects with
  ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX in strip-only mode.
- The older --experimental-transform-types flag is rejected as a bad option.
- An as-const object with derived value type runs directly and prints its value.
- A discriminated token union using those named values passes strict no-emit,
  erasable-syntax checking, including a never exhaustiveness branch.
- Assigning an undeclared kind to that derived type fails with TS2322.

Temporary probe files were outside the repository. No compiler-source or seed
representation was changed by this investigation.

## Remaining evidence before adoption

Choose the first maintained TS owner, verify invalid kinds and missing switch
arms, preserve exact serialized output and test source archives without T00.
Measure runtime/allocation impact only where kind handling is significant.
Keep support, compiler-source adoption and generated artifact changes separately
reviewable. This work does not require a global enum abstraction.

See [compiler structure](TOPICS.md#inv-061--compiler-structure),
[the workflow](../docs/development-workflow.md) and [tool hosting](../docs/tool-hosting.md).
