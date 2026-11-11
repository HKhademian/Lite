# Contributing to Lite

Read [AGENTS.md](AGENTS.md) and the [development workflow](docs/development-workflow.md).
Use Node from [igniter/.node-version](igniter/.node-version) and install locked
development dependencies with `npm --prefix igniter ci` and
`npm --prefix editors/vscode ci`.

Compiler implementation belongs in `compiler/src/` and `lib/core/`. Generated
seeds are rebuilt, never edited. Supporting tools use direct Node TypeScript
until a verified LiteLang replacement is ready. Preserve the generated-only path.

Use focused checks during development, then `./bin/lite test --full`, strict TS
checks, `./bin/lite verify --coverage`, applicable verification cases and editor
grammar checks. Existing TS migration gaps are recorded in
[the transition](compiler/transition-plan.md); report them without changing their status.

Keep each change atomic: implementation, cases and affected documentation together.
Keep independent refactors and release preparation separate. Verified commits and
annotated release tags are published to the existing remote by default; never
rewrite published history. See [release instructions](docs/release-automation.md).

Documentation changes follow the [documentation guide](docs/documentation.md).
