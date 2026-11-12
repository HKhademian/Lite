# Lite

**Lite is light.**

**Lite** is the project, **LiteLang** is the language, and a **LiteScript** is one of its programs. Lite is designed for low runtime weight, explicit consequential behavior, and code that is easy to read, reason about, and maintain.

## Try it

The public showcase site and interactive sample playground are built from [site/build.ts](site/build.ts) and published through GitHub Pages. Preview locally:

```sh
./site/build.ts
./site/serve.ts
```

To run Lite scripts locally, use the Node version in [igniter/.node-version](igniter/.node-version):

```sh
git clone <repository-url>
cd LiteScript
./bin/lite run language/examples/001-double-sum.lts
```

Enter `7` and `5` to print `24`. You can also compile to TypeScript or check without executing:

```sh
./bin/lite compile language/examples/001-double-sum.lts > /tmp/lite-example.ts
node compiler/entry.ts /tmp/lite-example.ts
./bin/lite check language/examples/001-double-sum.lts
```

## What you get

- A Lite-written compiler generating a **T13** TypeScript igniter (with a C backend slot scheduled next).
- A command-line router (`./bin/lite`) to `run`, `compile`, `check`, `test`, `verify`, `doctor`, and `docs`.
- A static showcase site and sample playground (`./site/build.ts`, `./site/serve.ts`).
- A self-rebuilding bootstrap seed ([bootstrap guide](compiler/bootstrap/README.md)).
- A VS Code syntax highlighter ([VS Code support](editors/vscode/README.md)).

Lite is alpha software: the generated compiler currently supports a growing subset of the language design, while C output, native self-hosting, `lite fmt`, and `lite link` remain planned. See [compiler status](compiler/README.md) and [the transition plan](compiler/transition-plan.md) for current coverage.

## Learn more

- [Start here](docs/start-here.md): run your first program and install dev dependencies.
- [Language tour](docs/tour.md): short example-led overview of LiteLang.
- [Examples](language/examples/README.md): runnable `.lts` programs.
- [Documentation index](docs/README.md): language design, spec, and proposals.
- [White paper](docs/white-paper.md): philosophy and design criteria.
- [Compiler reference](compiler/README.md): compiler stages, targets, and parity.
- [Evolving Lite](docs/evolving-language.md): how language increments and seeds advance.
- [Releases](docs/release-automation.md): component tags, verification gates, and packaging.
- [Changelog](CHANGELOG.md): notable project milestones.

For repository development, see [contributing](CONTRIBUTING.md). Lite is licensed under [Apache-2.0](LICENSE).
