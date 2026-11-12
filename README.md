# Lite

**Lite is light.**

**Lite** is a small, explicit programming language and self-hosted compiler built for clarity, low runtime weight, and predictable behavior. Everything consequential—output, mutation, imports, and control flow—is visible right in the source.

## Why Lite

- **Low ceremony:** Clean, readable syntax that stays out of your way.
- **Explicit behavior:** No hidden globals, implicit echoes, or surprise runtime magic.
- **Lightweight execution:** Compiles cleanly with minimal runtime support today, with a native C path ahead.
- **Self-hosted foundation:** Written in LiteLang, easy to inspect, learn, and extend.

## Quickstart

Explore the **Showcase & Playground** published via GitHub Pages, or build and preview it locally:

```sh
./site/build.ts
./site/serve.ts
```

Run a script locally (using the Node version in [igniter/.node-version](igniter/.node-version)):

```sh
git clone https://github.com/HKhademian/Lite.git
cd Lite
./bin/lite run language/examples/021-type-aliases.lts
```

Check or compile a script with `./bin/lite`:

```sh
./bin/lite check language/examples/001-double-sum.lts
./bin/lite compile language/examples/001-double-sum.lts
```

## Learn & Explore

- [Start here](docs/start-here.md) — run your first program and set up local tools.
- [Language tour](docs/tour.md) — example-led introduction to LiteLang.
- [Examples](language/examples/README.md) — runnable `.lts` programs.
- [White paper](docs/white-paper.md) — philosophy and design criteria.
- [Documentation index](docs/README.md) — full language design, spec, and proposals.
- [VS Code support](editors/vscode/README.md) — syntax highlighting for `.lt` and `.lts`.

## Internals & Contributing

Lite is alpha software; the compiler currently supports a growing subset of the language design.

- [Compiler reference](compiler/README.md) — compiler architecture, targets, and current coverage.
- [Bootstrap guide](compiler/bootstrap/README.md) — self-rebuilding seed and verification.
- [Transition plan](compiler/transition-plan.md) — ongoing compiler work and roadmap.
- [Releases](docs/release-automation.md) & [Changelog](CHANGELOG.md) — versioning, gates, and milestones.
- [Contributing](CONTRIBUTING.md) — development workflow and tests.

Licensed under [Apache-2.0](LICENSE).
