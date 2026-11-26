# Lite

**Lite is light.**

**Lite** is a small, explicit programming language and self-hosted compiler built for clarity, low runtime weight, and predictable behavior. Everything consequential—output, mutation, imports, and control flow—is visible right in the source.

## Why Lite

- **Low ceremony:** Clean, readable syntax that stays out of your way.
- **Explicit behavior:** No hidden globals, implicit echoes, or surprise runtime magic.
- **Lightweight execution:** Compiles cleanly to strict TypeScript **and** standalone native C11 (`-std=c11 -Wall -Wextra -Werror`) with `-O0`..`-O3`/`-Os` optimization levels and 3-generation self-hosting on both backends.
- **Self-hosted foundation:** The compiler and library modules are written in LiteLang. The library covers collections, math, text processing, and graphics.

## Quickstart

Open [Hello Lite](https://hkhademian.github.io/Lite/learn/getting-started/hello-lite.html) and click **Run** to see a Lite program execute in your browser. The lesson supplies two inputs and lets you edit the program.

To run locally, use the Node.js version in [igniter/.node-version](igniter/.node-version). Run these commands in a shell.

```sh
git clone https://github.com/HKhademian/Lite.git
cd Lite
./bin/lite run language/examples/foundations/io/double-sum.lts
```

Enter `7` and `5` on separate lines to get `24`. The [first-program guide](https://hkhademian.github.io/Lite/docs/design/start-here.html) walks through the code, shows how to run a script of your own, and explains the tools you need for checking and building.

## Learn & Explore

- [Handbook](https://hkhademian.github.io/Lite/docs/handbook/overview-and-setup.html) — read about supported syntax and everyday programming in Lite.
- [Learn](https://hkhademian.github.io/Lite/learn/) — work through interactive lessons and projects.
- [Gym](https://hkhademian.github.io/Lite/gym/) — practice with drills and katas that check your answers.
- [Language tour](https://hkhademian.github.io/Lite/docs/design/tour.html) — skim the syntax through short runnable examples.
- [Modules](https://hkhademian.github.io/Lite/modules/) and [CLI tools](https://hkhademian.github.io/Lite/tools/) — look up imports, library functions, and commands.
- [Examples](language/examples/README.md) — runnable `.lts` programs.
- [White paper](docs/white-paper.md) — philosophy and design criteria.
- [Implementation status](docs/implementation-status.md) and [design index](docs/README.md) — see what the compiler supports and where the language design is headed.
- [VS Code support](editors/vscode/README.md) — syntax highlighting for `.lt` and `.lts`.

## Internals & Contributing

Lite is alpha software; the compiler currently supports a growing subset of the language design.

- [Compiler reference](compiler/README.md) — compiler architecture, targets, and current coverage.
- [Bootstrap guide](compiler/bootstrap/README.md) — self-rebuilding seed and verification.
- [Transition plan](compiler/transition-plan.md) — ongoing compiler work and roadmap.
- [Build and preview the docs site](docs/site-architecture.md#build-and-preview-locally) — local workflow for documentation contributors.
- [Releases](docs/release-automation.md) & [Changelog](CHANGELOG.md) — versioning, gates, and milestones.
- [Contributing](CONTRIBUTING.md) — development workflow and tests.

Licensed under [Apache-2.0](LICENSE).
