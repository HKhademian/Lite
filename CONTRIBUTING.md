# Contributing to Lite

Lite is licensed under the Apache License, Version 2.0. See [LICENSE](lite://repo/LICENSE).
Contributions intentionally submitted for inclusion are licensed under Apache
2.0 as described in sections 5 and 6 of that license. No separate contributor
agreement is required.

Use the [first-program guide](lite://doc/start-here#prepare-the-checkout) to
prepare the checkout and make sure you can run a script. Then read
[AGENTS.md](lite://repo/AGENTS.md) and the [development workflow](lite://doc/development-workflow).
Install the locked development dependencies from the repository root.

```sh
npm --prefix igniter ci
npm --prefix editors/vscode ci
```

The first command installs compiler and test tooling. The second installs
the packages for grammar checks and VS Code extension packaging.

Compiler implementation belongs in `compiler/src/` and `lib/core/`. Generated
seeds are rebuilt, never edited. Supporting tools use direct Node TypeScript
until a verified LiteLang replacement is ready. Preserve the generated-only path.

Use focused checks during development, then `./bin/lite test --full`, strict TS
checks, `./bin/lite verify --coverage`, applicable verification cases and editor
grammar checks. Existing TS migration gaps are recorded in
[the transition](lite://doc/compiler/transition-plan); report them without changing their status.

Keep each change atomic: implementation, cases and affected documentation together.
Keep independent refactors and release preparation separate. Verified commits and
annotated release tags are published to the existing remote by default; never
rewrite published history. See [release instructions](lite://doc/release-automation).

Documentation changes follow the [documentation guide](lite://doc/documentation).
